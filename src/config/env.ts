import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5);
const embeddingDimension = Number(process.env.EMBEDDING_DIMENSION ?? 1024);
const retrievalDefaultTopK = Number(process.env.RETRIEVAL_DEFAULT_TOP_K ?? 20);
const rerankDefaultTopN = Number(process.env.RERANK_DEFAULT_TOP_N ?? 10);
const searchP95TargetMs = Number(process.env.SEARCH_P95_TARGET_MS ?? 5000);
const maxSearchQueryLength = Number(process.env.MAX_SEARCH_QUERY_LENGTH ?? 2000);
const maxJsonBodySizeMb = Number(process.env.MAX_JSON_BODY_SIZE_MB ?? 1);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port number");
}

if (!Number.isFinite(maxUploadSizeMb) || maxUploadSizeMb <= 0) {
  throw new Error("MAX_UPLOAD_SIZE_MB must be a positive number");
}

if (!Number.isInteger(embeddingDimension) || embeddingDimension <= 0) {
  throw new Error("EMBEDDING_DIMENSION must be a positive integer");
}

if (!Number.isInteger(maxSearchQueryLength) || maxSearchQueryLength <= 0) {
  throw new Error("MAX_SEARCH_QUERY_LENGTH must be a positive integer");
}

if (!Number.isFinite(maxJsonBodySizeMb) || maxJsonBodySizeMb <= 0) {
  throw new Error("MAX_JSON_BODY_SIZE_MB must be a positive number");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  maxUploadSizeBytes: Math.floor(maxUploadSizeMb * 1024 * 1024),
  mistralApiKey: process.env.MISTRAL_API_KEY,
  mistralEmbedModel: process.env.MISTRAL_EMBED_MODEL ?? "mistral-embed",
  embeddingDimension,
  collectionName: process.env.COLLECTION_NAME ?? "resumes",
  bm25IndexName: process.env.BM25_INDEX_NAME ?? "bm25_search_index",
  vectorIndexName: process.env.VECTOR_INDEX_NAME ?? "vector_index_search",
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  retrievalDefaultTopK,
  rerankDefaultTopN,
  searchP95TargetMs,
  maxSearchQueryLength,
  maxJsonBodySizeBytes: Math.floor(maxJsonBodySizeMb * 1024 * 1024),
  useLlmParser: process.env.USE_LLM_PARSER === "true",
  appName: "resume-rag-backend",
  appVersion: "1.0.0"
} as const;