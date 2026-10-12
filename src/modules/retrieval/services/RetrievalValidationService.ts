import { getDatabase } from "../../../config/database";
import { env } from "../../../config/env";

export interface RetrievalReadiness {
  ready: boolean;
  collection: string;
  resumeCount: number;
  resumesWithEmbedding: number;
  embeddingModel?: string;
  embeddingDimension?: number;
  reason?: string;
}

export class RetrievalValidationService {
  async checkReadiness(): Promise<RetrievalReadiness> {
    const database = await getDatabase();
    const resumes = database.collection(env.collectionName);
    const resumeCount = await resumes.countDocuments();
    const resumesWithEmbedding = await resumes.countDocuments({
      embedding: { $type: "array", $size: env.embeddingDimension }
    });

    if (resumesWithEmbedding === 0) {
      return {
        ready: false,
        reason: "No ingested resume embeddings are available",
        collection: env.collectionName,
        resumeCount,
        resumesWithEmbedding
      };
    }

    return {
      ready: true,
      collection: env.collectionName,
      resumeCount,
      resumesWithEmbedding,
      embeddingModel: env.mistralEmbedModel,
      embeddingDimension: env.embeddingDimension
    };
  }
}