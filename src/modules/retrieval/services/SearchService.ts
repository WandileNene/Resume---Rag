import { ResumeRepository } from "../repositories/ResumeRepository";
import { EmbeddingService } from "../../ingestion/services/EmbeddingService";
import { env } from "../../../config/env";
import { LLMService } from "./LLMService";
import { mergeCandidates } from "../utils/deduplicate";
import { attachSnippet } from "../utils/candidateMapper";
import type { RerankResult } from "./LLMService";
import type {
	MergedCandidate,
	RetrievalFilters,
	SearchCandidate
} from "../types/retrieval.types";

export interface Bm25SearchResult {
	mode: "bm25";
	query: string;
	count: number;
	results: Array<SearchCandidate & { matchedSkills: string[] }>;
}

export interface VectorSearchResult {
	mode: "vector";
	query: string;
	count: number;
	results: SearchCandidate[];
}

export interface HybridSearchResult {
	mode: "hybrid-debug";
	bm25: Bm25SearchResult["results"];
	vector: VectorSearchResult["results"];
	timings: { bm25Ms: number; embeddingMs: number; vectorMs: number };
}

export interface EndToEndSearchOptions {
	bm25TopK?: number;
	vectorTopK?: number;
	rerankTopN?: number;
	finalTopK?: number;
	summarize?: boolean;
	summaryStyle?: "short" | "detailed";
	summaryMaxTokens?: number;
}

export interface EndToEndSearchResult {
	query: string;
	results: Array<{
		rank: number;
		resumeId: string;
		name?: string;
		role?: string;
		company?: string;
		skills: string[];
		sources: ("bm25" | "vector")[];
		relevanceScore: number;
		reason: string;
		summary?: string;
	}>;
	model: string;
	degraded: boolean;
	warnings: string[];
	vectorFallback?: boolean;
	bm25Fallback?: boolean;
	timings: {
		embeddingMs: number;
		bm25Ms: number;
		vectorMs: number;
		rerankMs: number;
		summarizeMs: number;
		totalMs: number;
	};
}

export class SearchUnavailableError extends Error {
	readonly code = "SEARCH_UNAVAILABLE";

	constructor() {
		super("No retrieval strategy is currently available");
	}
}

export class SearchService {
	constructor(
		private readonly resumeRepository = new ResumeRepository(),
		private readonly embeddingService = new EmbeddingService(),
		private readonly llmService = new LLMService()
	) {}

	async searchBm25(
		query: string,
		topK: number,
		filters?: RetrievalFilters
	): Promise<Bm25SearchResult> {
		const candidates = await this.resumeRepository.searchBm25(query, topK, filters);

		return {
			mode: "bm25",
			query,
			count: candidates.length,
			results: candidates.map((candidate) => ({
				resumeId: candidate.resumeId,
				name: candidate.name,
				role: candidate.role,
				company: candidate.company,
				skills: candidate.skills,
				bm25Score: candidate.score,
				sources: ["bm25"],
				matchedSkills: candidate.skills
			}))
		};
	}

	async searchVector(
		query: string,
		queryEmbedding: number[],
		topK: number,
		filters?: RetrievalFilters
	): Promise<VectorSearchResult> {
		const candidates = await this.resumeRepository.searchVector(queryEmbedding, topK, filters);

		return {
			mode: "vector",
			query,
			count: candidates.length,
			results: candidates.map((candidate): SearchCandidate => ({
				resumeId: candidate.resumeId,
				name: candidate.name,
				role: candidate.role,
				company: candidate.company,
				skills: candidate.skills,
				vectorScore: candidate.score,
				sources: ["vector"]
			}))
		};
	}

	async hybridSearch(
		query: string,
		topK: number,
		filters?: RetrievalFilters
	): Promise<HybridSearchResult> {
		// BM25 and embedding run in parallel; both are timed from the same start point
		// because they share the same thread slot — individual times would be meaningless.
		const parallelStartedAt = Date.now();
		const [bm25Candidates, queryEmbedding] = await Promise.all([
			this.resumeRepository.searchBm25(query, topK, filters),
			this.embeddingService.generateResumeEmbedding({ rawText: query, skills: [] })
		]);
		const parallelMs = Date.now() - parallelStartedAt;
		// bm25Ms and embeddingMs reflect the duration of the parallel block they ran in.
		const bm25Ms = parallelMs;
		const embeddingMs = parallelMs;
		const vectorStartedAt = Date.now();
		const vectorCandidates = await this.resumeRepository.searchVector(queryEmbedding, topK, filters);

		return {
			mode: "hybrid-debug",
			bm25: bm25Candidates.map((candidate) => ({
				resumeId: candidate.resumeId,
				name: candidate.name,
				role: candidate.role,
				company: candidate.company,
				skills: candidate.skills,
				bm25Score: candidate.score,
				sources: ["bm25"] as ["bm25"],
				matchedSkills: candidate.skills
			})),
			vector: vectorCandidates.map((candidate) => ({
				resumeId: candidate.resumeId,
				name: candidate.name,
				role: candidate.role,
				company: candidate.company,
				skills: candidate.skills,
				vectorScore: candidate.score,
				sources: ["vector"] as ["vector"]
			})),
			timings: { bm25Ms, embeddingMs, vectorMs: Date.now() - vectorStartedAt }
		};
	}

	/**
	 * Phase 9: merge BM25 + vector results into a single deduplicated pool,
	 * then attach size-controlled snippets to each candidate ready for LLM re-ranking.
	 *
	 * Flow:
	 *   BM25 ──────────────────────────────────┐
	 *   (parallel)                             ├─ mergeCandidates → attachSnippets
	 *   Embedding → Vector Search ─────────────┘
	 */
	async mergeAndDeduplicate(
		query: string,
		topK: number,
		filters?: RetrievalFilters
	): Promise<MergedCandidate[]> {
		// Reuse hybridSearch to get both result sets with the same parallel pattern
		const hybrid = await this.hybridSearch(query, topK, filters);

		// Merge by resumeId — BM25 seeds the pool, vector fills the gaps
		const merged = mergeCandidates(hybrid.bm25, hybrid.vector);

		// Fetch full documents for each unique candidate so we can build snippets.
		// These are parallel fetches; missing documents are skipped gracefully.
		const snippetResults = await Promise.all(
			merged.map((c) => this.resumeRepository.findById(c.resumeId))
		);

		// Attach snippet to each candidate; candidates whose document was not
		// found (deleted between search and fetch) are filtered out.
		const withSnippets: MergedCandidate[] = [];
		for (let i = 0; i < merged.length; i++) {
			const snippetSource = snippetResults[i];
			if (snippetSource !== null) {
				withSnippets.push(attachSnippet(merged[i], snippetSource));
			}
		}

		return withSnippets;
	}

	/**
	 * Phase 13: run retrieval, prepare the deduplicated candidate pool, rerank it,
	 * and optionally generate grounded candidate summaries.
	 */
	async endToEndSearch(
		query: string,
		filters?: RetrievalFilters,
		options: EndToEndSearchOptions = {}
	): Promise<EndToEndSearchResult> {
		const totalStartedAt = Date.now();
		const bm25TopK = options.bm25TopK ?? env.retrievalDefaultTopK;
		const vectorTopK = options.vectorTopK ?? env.retrievalDefaultTopK;
		const rerankTopN = options.rerankTopN ?? env.rerankDefaultTopN;
		const finalTopK = options.finalTopK ?? rerankTopN;
		const warnings: string[] = [];
		let degraded = false;
		let vectorFallback = false;
		let bm25Fallback = false;

		const retrievalStartedAt = Date.now();
		const [bm25Attempt, embeddingAttempt] = await Promise.allSettled([
			this.resumeRepository.searchBm25(query, bm25TopK, filters),
			this.embeddingService.generateResumeEmbedding({ rawText: query, skills: [] })
		]);
		const retrievalMs = Date.now() - retrievalStartedAt;
		const embeddingMs = retrievalMs;
		const bm25Ms = retrievalMs;
		const bm25Candidates = bm25Attempt.status === "fulfilled" ? bm25Attempt.value : [];
		if (bm25Attempt.status === "rejected") {
			degraded = true;
			bm25Fallback = true;
			warnings.push("BM25_SEARCH_FAILED");
		}

		let vectorCandidates = [] as Awaited<ReturnType<ResumeRepository["searchVector"]>>;
		let vectorAvailable = false;
		let vectorMs = 0;
		if (embeddingAttempt.status === "fulfilled") {
			const vectorStartedAt = Date.now();
			try {
				vectorCandidates = await this.resumeRepository.searchVector(
					embeddingAttempt.value,
					vectorTopK,
					filters
				);
				vectorAvailable = true;
				vectorMs = Date.now() - vectorStartedAt;
			} catch (_error) {
				degraded = true;
				vectorFallback = true;
				warnings.push("VECTOR_SEARCH_FAILED");
				vectorMs = Date.now() - vectorStartedAt;
			}
		} else {
			degraded = true;
			vectorFallback = true;
			warnings.push("VECTOR_SEARCH_FAILED");
		}

		if (bm25Attempt.status === "rejected" && !vectorAvailable) {
			throw new SearchUnavailableError();
		}

		const bm25Results = bm25Candidates.map((candidate) => ({
			resumeId: candidate.resumeId,
			name: candidate.name,
			role: candidate.role,
			company: candidate.company,
			skills: candidate.skills,
			bm25Score: candidate.score,
			sources: ["bm25"] as ["bm25"],
			matchedSkills: candidate.skills
		}));
		const vectorResults = vectorCandidates.map((candidate) => ({
			resumeId: candidate.resumeId,
			name: candidate.name,
			role: candidate.role,
			company: candidate.company,
			skills: candidate.skills,
			vectorScore: candidate.score,
			sources: ["vector"] as ["vector"]
		}));

		const merged = mergeCandidates(bm25Results, vectorResults);
		const snippetSources = await Promise.all(
			merged.map((candidate) => this.resumeRepository.findById(candidate.resumeId))
		);
		const candidatesWithSnippets = merged.flatMap((candidate, index) => {
			const source = snippetSources[index];
			return source ? [attachSnippet(candidate, source)] : [];
		});

		if (candidatesWithSnippets.length === 0) {
			return {
				query,
				results: [],
				model: env.groqModel,
				degraded,
				warnings,
				...(vectorFallback ? { vectorFallback: true } : {}),
				...(bm25Fallback ? { bm25Fallback: true } : {}),
				timings: {
					embeddingMs,
					bm25Ms,
					vectorMs,
					rerankMs: 0,
					summarizeMs: 0,
					totalMs: Date.now() - totalStartedAt
				}
			};
		}

		const rerankStartedAt = Date.now();
		let rerankedResults: RerankResult[];
		let rerankModel = env.groqModel;
		try {
			const reranked = await this.llmService.rerankCandidates(
				query,
				candidatesWithSnippets.slice(0, rerankTopN),
				rerankTopN
			);
			rerankedResults = reranked.results;
			rerankModel = reranked.model;
		} catch (_error) {
			degraded = true;
			warnings.push("LLM_RERANK_FAILED");
			rerankedResults = candidatesWithSnippets.slice(0, rerankTopN).map((candidate, index) => ({
				resumeId: candidate.resumeId,
				rank: index + 1,
				relevanceScore: 0,
				reason: "LLM rerank failed; ordered by BM25 priority, then vector priority."
			}));
		}
		const rerankMs = Date.now() - rerankStartedAt;
		const candidateById = new Map(
			candidatesWithSnippets.map((candidate) => [candidate.resumeId, candidate])
		);
		const finalResults = rerankedResults.slice(0, finalTopK).flatMap((ranked) => {
			const candidate = candidateById.get(ranked.resumeId);
			return candidate ? [{ ranked, candidate }] : [];
		});

		const summarizeStartedAt = Date.now();
		let summaryFailed = false;
		const results = await Promise.all(
			finalResults.map(async ({ ranked, candidate }, index) => {
				const result = {
					rank: index + 1,
					resumeId: candidate.resumeId,
					name: candidate.name,
					role: candidate.role,
					company: candidate.company,
					skills: candidate.skills,
					sources: candidate.sources,
					relevanceScore: ranked.relevanceScore,
					reason: ranked.reason
				};

				if (!options.summarize) {
					return result;
				}

				try {
					return {
						...result,
						summary: await this.llmService.summarizeCandidateFit(query, candidate, {
							style: options.summaryStyle ?? "short",
							maxTokens: options.summaryMaxTokens
						})
					};
				} catch (_error) {
					summaryFailed = true;
					return result;
				}
			})
		);
		const summarizeMs = options.summarize ? Date.now() - summarizeStartedAt : 0;
		if (summaryFailed) {
			degraded = true;
			warnings.push("SUMMARIZATION_FAILED");
		}

		return {
			query,
			results,
			model: rerankModel,
			degraded,
			warnings,
			...(vectorFallback ? { vectorFallback: true } : {}),
			...(bm25Fallback ? { bm25Fallback: true } : {}),
			timings: {
				embeddingMs,
				bm25Ms,
				vectorMs,
				rerankMs,
				summarizeMs,
				totalMs: Date.now() - totalStartedAt
			}
		};
	}
}