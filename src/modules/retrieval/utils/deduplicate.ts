import type { MergedCandidate, SearchCandidate } from "../types/retrieval.types";

type Bm25Candidate = SearchCandidate & { matchedSkills: string[] };

/**
 * Merge BM25 and vector result arrays into one de-duplicated candidate pool.
 *
 * Rules (per spec):
 *  - Deduplication key: resumeId
 *  - Insertion order: BM25 candidates first, then any vector candidates not
 *    already present (preserves the spec example A,B,C + B,D,A → A,B,C,D)
 *  - A candidate present in both lists gets sources: ["bm25","vector"]
 *  - Both bm25Score and vectorScore are retained — never merged into one number
 *  - snippet is left as an empty string here; candidateMapper fills it later
 *    once the repository fetches the full document
 */
export function mergeCandidates(
	bm25Results: Bm25Candidate[],
	vectorResults: SearchCandidate[]
): MergedCandidate[] {
	// Map keyed by resumeId so we can merge without duplicates in O(n)
	const pool = new Map<string, MergedCandidate>();

	// Pass 1 — seed pool with all BM25 candidates
	for (const c of bm25Results) {
		pool.set(c.resumeId, {
			resumeId: c.resumeId,
			name: c.name,
			role: c.role,
			company: c.company,
			skills: c.skills ?? [],
			bm25Score: c.bm25Score,
			vectorScore: undefined,
			sources: ["bm25"],
			snippet: ""
		});
	}

	// Pass 2 — merge vector candidates into the pool
	for (const c of vectorResults) {
		const existing = pool.get(c.resumeId);

		if (existing) {
			// Candidate already in pool from BM25 — just add vector score and source
			existing.vectorScore = c.vectorScore;
			if (!existing.sources.includes("vector")) {
				existing.sources.push("vector");
			}
		} else {
			// New candidate only found by vector search
			pool.set(c.resumeId, {
				resumeId: c.resumeId,
				name: c.name,
				role: c.role,
				company: c.company,
				skills: c.skills ?? [],
				bm25Score: undefined,
				vectorScore: c.vectorScore,
				sources: ["vector"],
				snippet: ""
			});
		}
	}

	return Array.from(pool.values());
}
