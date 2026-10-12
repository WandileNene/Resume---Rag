import { EmbeddingService } from "./EmbeddingService";
import { AlgorithmResumeParser } from "./AlgorithmResumeParser";
import { LLMResumeParser } from "./LLMResumeParser";
import { ResumeParserService } from "./ResumeParserService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { cleanText } from "../utils/textCleaner";
import { env } from "../../../config/env";
import type { ParsedResume } from "../types/ingestion.types";

export interface ResumeIngestionResult {
	resumeId: string;
	resume: ParsedResume;
	timings: {
		extractMs: number;
		cleanMs: number;
		parseMs: number;
		embeddingMs: number;
		mongoInsertMs: number;
		totalMs: number;
	};
}

export class ResumeIngestionService {
	constructor(
		private readonly resumeParserService = new ResumeParserService(),
		private readonly algorithmResumeParser = new AlgorithmResumeParser(),
		private readonly llmResumeParser = new LLMResumeParser(),
		private readonly embeddingService = new EmbeddingService(),
		private readonly resumeRepository = new ResumeIngestionRepository()
	) {}

	async ingestResume(file: Express.Multer.File): Promise<ResumeIngestionResult> {
		const totalStartedAt = Date.now();

		const extractStartedAt = Date.now();
		const rawText = await this.resumeParserService.extractTextFromPdf(file.path);
		const extractMs = Date.now() - extractStartedAt;

		const cleanStartedAt = Date.now();
		const cleanedText = cleanText(rawText);
		const cleanMs = Date.now() - cleanStartedAt;

		if (!cleanedText) {
			throw new Error("Resume extraction failed");
		}

		const parseStartedAt = Date.now();
		const resume = env.useLlmParser
			? await this.llmResumeParser.parseResume(cleanedText)
			: this.algorithmResumeParser.parseResume(cleanedText);
		const parseMs = Date.now() - parseStartedAt;

		const embeddingStartedAt = Date.now();
		const embedding = await this.embeddingService.generateResumeEmbedding({
			name: resume.name,
			role: resume.role,
			skills: resume.skills,
			company: resume.company,
			experienceSummary: resume.experienceSummary,
			rawText: cleanedText
		});
		const embeddingMs = Date.now() - embeddingStartedAt;

		const mongoStartedAt = Date.now();
		const resumeId = await this.resumeRepository.insertResume({
			fileName: file.originalname,
			resume,
			rawText: cleanedText,
			embedding
		});
		const mongoInsertMs = Date.now() - mongoStartedAt;

		return {
			resumeId,
			resume,
			timings: {
				extractMs,
				cleanMs,
				parseMs,
				embeddingMs,
				mongoInsertMs,
				totalMs: Date.now() - totalStartedAt
			}
		};
	}
}