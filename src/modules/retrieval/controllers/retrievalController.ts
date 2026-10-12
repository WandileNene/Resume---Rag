import type { RequestHandler } from "express";
import { env } from "../../../config/env";
import { sendError } from "../../../middleware/errorResponse";
import {
  EmbeddingError,
  EmbeddingService
} from "../../ingestion/services/EmbeddingService";
import { LLMService } from "../services/LLMService";
import { RetrievalValidationService } from "../services/RetrievalValidationService";
import { SearchService, SearchUnavailableError } from "../services/SearchService";
import { ResumeRepository } from "../repositories/ResumeRepository";

const retrievalValidationService = new RetrievalValidationService();
const embeddingService = new EmbeddingService();
const llmService = new LLMService();
const searchService = new SearchService();
const resumeRepository = new ResumeRepository();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidSearchQuery = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= env.maxSearchQueryLength;

export const getCandidate: RequestHandler = async (req, res) => {
  const candidateId = typeof req.params.id === "string" ? req.params.id : "";
  const candidate = await resumeRepository.findProfileById(candidateId);

  if (!candidate) {
    sendError(req, res, 404, "CANDIDATE_NOT_FOUND", "Candidate profile not found");
    return;
  }

  res.status(200).json(candidate);
};

export const getRetrievalReadiness: RequestHandler = async (req, res) => {
  try {
    const readiness = await retrievalValidationService.checkReadiness();
    res.status(200).json(readiness);
  } catch (_error) {
    sendError(req, res, 503, "RETRIEVAL_READINESS_FAILED", "Retrieval readiness check failed");
  }
};

export const createQueryEmbedding: RequestHandler = async (req, res) => {
  const { model, input } = req.body as {
    model?: unknown;
    input?: unknown;
  };

  if (model !== env.mistralEmbedModel || typeof input !== "string" || !input.trim()) {
    sendError(
      req,
      res,
      400,
      "INVALID_EMBEDDING_REQUEST",
      `model must be ${env.mistralEmbedModel} and input must be a non-empty string`
    );
    return;
  }

  try {
    const embedding = await embeddingService.generateResumeEmbedding({
      rawText: input,
      skills: []
    });

    res.status(200).json({
      embedding,
      model: env.mistralEmbedModel,
      dimension: embedding.length
    });
  } catch (error) {
    if (error instanceof EmbeddingError) {
      sendError(req, res, 502, error.code, error.message);
      return;
    }

    sendError(req, res, 502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }
};

export const searchBm25: RequestHandler = async (req, res) => {
  const body = req.body as {
    query?: unknown;
    topK?: unknown;
    filters?: { minYearsExperience?: unknown };
  };
  const topK = body.topK === undefined ? 20 : body.topK;
  const minYearsExperience = body.filters?.minYearsExperience;

  if (
    typeof body.query !== "string" ||
    !body.query.trim() ||
    typeof topK !== "number" ||
    !Number.isInteger(topK) ||
    topK < 1 ||
    topK > 100 ||
    (minYearsExperience !== undefined &&
      (typeof minYearsExperience !== "number" || minYearsExperience < 0))
  ) {
    sendError(
      req,
      res,
      400,
      "INVALID_BM25_REQUEST",
      "query must be non-empty, topK must be an integer from 1 to 100, and minYearsExperience must be non-negative"
    );
    return;
  }

  try {
    const result = await searchService.searchBm25(body.query, topK, {
      minYearsExperience
    });
    res.status(200).json(result);
  } catch (_error) {
    sendError(req, res, 503, "BM25_SEARCH_FAILED", "BM25 search failed");
  }
};

export const searchVector: RequestHandler = async (req, res) => {
  const body = req.body as {
    query?: unknown;
    topK?: unknown;
    filters?: { minYearsExperience?: unknown };
  };
  const topK = body.topK === undefined ? 20 : body.topK;
  const minYearsExperience = body.filters?.minYearsExperience;

  if (
    typeof body.query !== "string" ||
    !body.query.trim() ||
    typeof topK !== "number" ||
    !Number.isInteger(topK) ||
    topK < 1 ||
    topK > 100 ||
    (minYearsExperience !== undefined &&
      (typeof minYearsExperience !== "number" || minYearsExperience < 0))
  ) {
    sendError(
      req,
      res,
      400,
      "INVALID_VECTOR_REQUEST",
      "query must be non-empty, topK must be an integer from 1 to 100, and minYearsExperience must be non-negative"
    );
    return;
  }

  try {
    const queryEmbedding = await embeddingService.generateResumeEmbedding({
      rawText: body.query,
      skills: []
    });
    const result = await searchService.searchVector(
      body.query,
      queryEmbedding,
      topK,
      { minYearsExperience }
    );
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof EmbeddingError) {
      sendError(req, res, 502, error.code, error.message);
      return;
    }

    sendError(req, res, 503, "VECTOR_SEARCH_FAILED", "Vector search failed");
  }
};

export const searchHybrid: RequestHandler = async (req, res) => {
  const body = req.body as {
    query?: unknown;
    topK?: unknown;
    filters?: { minYearsExperience?: unknown };
  };
  const topK = body.topK === undefined ? 20 : body.topK;
  const minYearsExperience = body.filters?.minYearsExperience;

  if (
    typeof body.query !== "string" ||
    !body.query.trim() ||
    typeof topK !== "number" ||
    !Number.isInteger(topK) ||
    topK < 1 ||
    topK > 100 ||
    (minYearsExperience !== undefined &&
      (typeof minYearsExperience !== "number" || minYearsExperience < 0))
  ) {
    sendError(req, res, 400, "INVALID_HYBRID_REQUEST", "Invalid hybrid search request");
    return;
  }

  try {
    const result = await searchService.hybridSearch(body.query, topK, {
      minYearsExperience
    });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof EmbeddingError) {
      sendError(req, res, 502, error.code, error.message);
      return;
    }

    sendError(req, res, 503, "HYBRID_SEARCH_FAILED", "Hybrid search failed");
  }
};

export const rerankCandidates: RequestHandler = async (req, res) => {
  const body = req.body as {
    query?: unknown;
    candidates?: unknown;
    topK?: unknown;
  };

  if (
    !isValidSearchQuery(body.query) ||
    !Array.isArray(body.candidates) ||
    body.candidates.length === 0 ||
    typeof body.topK !== "number" ||
    !Number.isInteger(body.topK) ||
    body.topK < 1 ||
    body.topK > 20
  ) {
    sendError(req, res, 400, "INVALID_RERANK_REQUEST", "query must be non-empty, candidates must be a non-empty array, and topK must be an integer from 1 to 20");
    return;
  }

  const candidates = body.candidates;
  const invalidCandidate = candidates.some(
    (candidate) =>
      !candidate ||
      typeof candidate !== "object" ||
      typeof (candidate as { resumeId?: unknown }).resumeId !== "string" ||
      !(candidate as { resumeId: string }).resumeId.trim()
  );

  if (invalidCandidate) {
    sendError(req, res, 400, "INVALID_RERANK_REQUEST", "Each candidate must include a non-empty resumeId");
    return;
  }

  try {
    const result = await llmService.rerankCandidates(
      body.query,
      candidates.map((candidate) => ({
        resumeId: (candidate as { resumeId: string }).resumeId,
        snippet: typeof (candidate as { snippet?: unknown }).snippet === "string" ? (candidate as { snippet: string }).snippet : "",
        skills: Array.isArray((candidate as { skills?: unknown }).skills)
          ? ((candidate as { skills: unknown[] }).skills.filter((skill): skill is string => typeof skill === "string"))
          : [],
        sources: Array.isArray((candidate as { sources?: unknown }).sources)
          ? ((candidate as { sources: unknown[] }).sources.filter((source): source is string => typeof source === "string"))
          : []
      })),
      body.topK
    );

    res.status(200).json(result);
  } catch (error) {
    sendError(
      req,
      res,
      502,
      "RERANK_FAILED",
      error instanceof Error ? error.message : "LLM rerank failed"
    );
  }
};

export const summarizeCandidate: RequestHandler = async (req, res) => {
  const body = req.body as {
    query?: unknown;
    candidate?: unknown;
    style?: unknown;
    maxTokens?: unknown;
  };

  const style = body.style ?? "short";
  const maxTokens = body.maxTokens ?? 150;

  if (
    !isValidSearchQuery(body.query) ||
    !body.candidate ||
    typeof body.candidate !== "object" ||
    typeof (body.candidate as { resumeId?: unknown }).resumeId !== "string" ||
    !(body.candidate as { resumeId: string }).resumeId.trim() ||
    typeof style !== "string" ||
    (style !== "short" && style !== "detailed") ||
    typeof maxTokens !== "number" ||
    !Number.isInteger(maxTokens) ||
    maxTokens < 50 ||
    maxTokens > 400
  ) {
    sendError(req, res, 400, "INVALID_SUMMARY_REQUEST", "query must be non-empty, candidate.resumeId must be valid, style must be short or detailed, and maxTokens must be an integer from 50 to 400");
    return;
  }

  try {
    const candidate = body.candidate as {
      resumeId: string;
      snippet?: unknown;
      skills?: unknown;
      sources?: unknown;
    };

    const summary = await llmService.summarizeCandidateFit(body.query, {
      resumeId: candidate.resumeId,
      snippet: typeof candidate.snippet === "string" ? candidate.snippet : "",
      skills: Array.isArray(candidate.skills)
        ? candidate.skills.filter((skill): skill is string => typeof skill === "string")
        : [],
      sources: Array.isArray(candidate.sources)
        ? candidate.sources.filter(
            (source): source is "bm25" | "vector" => source === "bm25" || source === "vector"
          )
        : []
    }, {
      style,
      maxTokens
    });

    res.status(200).json({
      resumeId: candidate.resumeId,
      summary
    });
  } catch (error) {
    sendError(
      req,
      res,
      502,
      "SUMMARY_FAILED",
      error instanceof Error ? error.message : "Candidate summary failed"
    );
  }
};

export const search: RequestHandler = async (req, res) => {
  const body = req.body as {
    query?: unknown;
    filters?: { minYearsExperience?: unknown };
    options?: {
      bm25TopK?: unknown;
      vectorTopK?: unknown;
      rerankTopN?: unknown;
      finalTopK?: unknown;
      summarize?: unknown;
      summaryStyle?: unknown;
      summaryMaxTokens?: unknown;
    };
  };
  const options = body.options ?? {};
  const bm25TopK = options.bm25TopK ?? env.retrievalDefaultTopK;
  const vectorTopK = options.vectorTopK ?? env.retrievalDefaultTopK;
  const rerankTopN = options.rerankTopN ?? env.rerankDefaultTopN;
  const finalTopK = options.finalTopK ?? 5;
  const summaryMaxTokens = options.summaryMaxTokens;
  const minYearsExperience = body.filters?.minYearsExperience;

  const validBoundedInteger = (value: unknown, min: number, max: number): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

  if (
    !isValidSearchQuery(body.query) ||
    (typeof body.query === "string" && body.query.trim().length === 0) ||
    (typeof body.query === "string" && body.query.length > env.maxSearchQueryLength) ||
    (body.filters !== undefined && !isRecord(body.filters)) ||
    (body.options !== undefined && !isRecord(body.options)) ||
    (minYearsExperience !== undefined &&
      (typeof minYearsExperience !== "number" || !Number.isFinite(minYearsExperience) || minYearsExperience < 0)) ||
    !validBoundedInteger(bm25TopK, 1, 100) ||
    !validBoundedInteger(vectorTopK, 1, 100) ||
    !validBoundedInteger(rerankTopN, 1, 20) ||
    !validBoundedInteger(finalTopK, 1, 100) ||
    (options.summarize !== undefined && typeof options.summarize !== "boolean") ||
    (options.summaryStyle !== undefined &&
      options.summaryStyle !== "short" &&
      options.summaryStyle !== "detailed") ||
    (summaryMaxTokens !== undefined && !validBoundedInteger(summaryMaxTokens, 50, 400))
  ) {
    sendError(
      req,
      res,
      400,
      !isValidSearchQuery(body.query) ? "INVALID_SEARCH_QUERY" : "INVALID_SEARCH_REQUEST",
      !isValidSearchQuery(body.query)
        ? "Search query is required and must not exceed the maximum length"
        : "search limits, filters, and summary options must be valid"
    );
    return;
  }

  try {
    const result = await searchService.endToEndSearch(
      body.query,
      { minYearsExperience },
      {
        bm25TopK,
        vectorTopK,
        rerankTopN,
        finalTopK,
        summarize: options.summarize === true,
        summaryStyle: options.summaryStyle as "short" | "detailed" | undefined,
        summaryMaxTokens
      }
    );

    res.locals.retrieval = {
      durationMs: result.timings.totalMs,
      componentTimings: {
        embeddingMs: result.timings.embeddingMs,
        bm25Ms: result.timings.bm25Ms,
        vectorMs: result.timings.vectorMs,
        rerankMs: result.timings.rerankMs,
        summarizeMs: result.timings.summarizeMs
      },
      warnings: result.warnings
    };

    res.status(200).json({
      query: result.query,
      results: result.results,
      model: result.model,
      degraded: result.degraded,
      warnings: result.warnings,
      ...(result.vectorFallback ? { vectorFallback: true } : {}),
      ...(result.bm25Fallback ? { bm25Fallback: true } : {}),
      timings: result.timings
    });
  } catch (error) {
    if (error instanceof SearchUnavailableError) {
      res.locals.retrieval = {
        componentTimings: {
          embeddingMs: 0,
          bm25Ms: 0,
          vectorMs: 0,
          rerankMs: 0,
          summarizeMs: 0
        },
        warnings: [error.code]
      };
      sendError(req, res, 503, error.code, error.message);
      return;
    }

    if (error instanceof EmbeddingError) {
      sendError(req, res, 502, error.code, error.message);
      return;
    }

    sendError(
      req,
      res,
      503,
      "SEARCH_FAILED",
      error instanceof Error ? error.message : "Search failed"
    );
  }
};