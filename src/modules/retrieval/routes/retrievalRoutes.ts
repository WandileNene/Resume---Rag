import { Router } from "express";
import {
	createQueryEmbedding,
	getRetrievalReadiness,
	rerankCandidates,
	search,
	summarizeCandidate,
	searchBm25,
	searchHybrid,
	searchVector
} from "../controllers/retrievalController";
import { getCandidate } from "../controllers/retrievalController";

export const retrievalRoutes = Router();

retrievalRoutes.get("/search/readiness", getRetrievalReadiness);
retrievalRoutes.get("/candidate/:id", getCandidate);
retrievalRoutes.post("/embeddings", createQueryEmbedding);
retrievalRoutes.post("/search/bm25", searchBm25);
retrievalRoutes.post("/search/vector", searchVector);
retrievalRoutes.post("/search/hybrid", searchHybrid);
retrievalRoutes.post("/search/rerank", rerankCandidates);
retrievalRoutes.post("/search/summarize", summarizeCandidate);
retrievalRoutes.post("/search", search);