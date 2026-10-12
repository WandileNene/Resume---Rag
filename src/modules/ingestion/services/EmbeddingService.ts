import { env } from "../../../config/env";

interface MistralEmbeddingResponse {
	data?: Array<{ embedding?: unknown }>;
}

export interface ResumeEmbeddingInput {
	name?: string;
	role?: string;
	skills: string[];
	company?: string;
	experienceSummary?: string;
	rawText: string;
}

export class EmbeddingError extends Error {
	readonly code = "EMBEDDING_FAILED";

	constructor() {
		super("Mistral embedding failed");
	}
}

export class EmbeddingService {
	buildEmbeddingText(input: ResumeEmbeddingInput): string {
		return `
${input.name ?? ""}
${input.role ?? ""}
${input.skills.join(", ")}
${input.company ?? ""}
${input.experienceSummary ?? ""}
${input.rawText}
`.trim();
	}

	async generateResumeEmbedding(input: ResumeEmbeddingInput): Promise<number[]> {
		if (!env.mistralApiKey) {
			throw new EmbeddingError();
		}

		const response = await fetch("https://api.mistral.ai/v1/embeddings", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.mistralApiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: env.mistralEmbedModel,
				input: this.buildEmbeddingText(input)
			})
		});

		if (!response.ok) {
			throw new EmbeddingError();
		}

		const payload = (await response.json()) as MistralEmbeddingResponse;
		const embedding = payload.data?.[0]?.embedding;

		if (
			!Array.isArray(embedding) ||
			embedding.length !== env.embeddingDimension ||
			!embedding.every((value): value is number => typeof value === "number" && Number.isFinite(value))
		) {
			throw new EmbeddingError();
		}

		return embedding;
	}
}