import { getDatabase } from "../../../config/database";
import { env } from "../../../config/env";
import type { ParsedResume } from "../types/ingestion.types";

export interface ResumeStorageInput {
	fileName: string;
	resume: ParsedResume;
	rawText: string;
	embedding: number[];
}

export class ResumeIngestionRepository {
	async insertResume(input: ResumeStorageInput): Promise<string> {
		const database = await getDatabase();
		const now = new Date();
		const result = await database.collection(env.collectionName).insertOne({
			fileName: input.fileName,
			rawText: input.rawText,
			...input.resume,
			embedding: input.embedding,
			embeddingModel: env.mistralEmbedModel,
			embeddingDimension: input.embedding.length,
			createdAt: now,
			updatedAt: now
		});

		return result.insertedId.toHexString();
	}
}