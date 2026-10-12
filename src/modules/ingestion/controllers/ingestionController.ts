import { unlink } from "node:fs/promises";
import path from "node:path";
import { rm } from "node:fs/promises";
import type { RequestHandler } from "express";
import { ResumeParserService } from "../services/ResumeParserService";
import { AlgorithmResumeParser } from "../services/AlgorithmResumeParser";
import {
  LLMParserNotConfiguredError,
  LLMResumeParser,
  validateParsedResume
} from "../services/LLMResumeParser";
import { cleanText } from "../utils/textCleaner";
import { detectSkills } from "../../../config/skills";
import { env } from "../../../config/env";
import {
  EmbeddingError,
  EmbeddingService,
  type ResumeEmbeddingInput
} from "../services/EmbeddingService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import type { ParsedResume } from "../types/ingestion.types";
import { ResumeIngestionService } from "../services/ResumeIngestionService";
import { sendError } from "../../../middleware/errorResponse";

const resumeParserService = new ResumeParserService();
const algorithmResumeParser = new AlgorithmResumeParser();
const llmResumeParser = new LLMResumeParser();
const embeddingService = new EmbeddingService();
const resumeIngestionRepository = new ResumeIngestionRepository();
const resumeIngestionService = new ResumeIngestionService();

const removeUploadedFile = async (file: Express.Multer.File): Promise<void> => {
  await Promise.all([
    rm(file.path, { force: true }),
    rm(path.resolve(process.cwd(), "uploads", file.filename), { force: true })
  ]);
};

export const getIngestionHealth: RequestHandler = (_req, res) => {
  res.status(200).json({
    status: "ok",
    module: "resume-ingestion"
  });
};

export const uploadResume: RequestHandler = (req, res) => {
  if (!req.file) {
    sendError(req, res, 400, "FILE_REQUIRED", "Resume PDF is required");
    return;
  }

  res.status(200).json({
    success: true,
    message: "Resume uploaded successfully",
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    }
  });
};

export const extractResume: RequestHandler = async (req, res) => {
  if (!req.file) {
    sendError(req, res, 400, "FILE_REQUIRED", "Resume PDF is required");
    return;
  }

  try {
    const rawText = await resumeParserService.extractTextFromPdf(req.file.path);

    if (!rawText.trim()) {
      sendError(req, res, 422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
      return;
    }

    res.status(200).json({
      success: true,
      rawText,
      characters: rawText.length
    });
  } catch (_error) {
    sendError(req, res, 422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
  } finally {
    await removeUploadedFile(req.file).catch(() => undefined);
  }
};

export const cleanResumeText: RequestHandler = (req, res) => {
  if (typeof req.body?.rawText !== "string") {
    sendError(req, res, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  res.status(200).json({
    success: true,
    cleanText: cleanText(req.body.rawText)
  });
};

export const detectResumeSkills: RequestHandler = (req, res) => {
  if (typeof req.body?.rawText !== "string") {
    sendError(req, res, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  res.status(200).json({
    success: true,
    skills: detectSkills(req.body.rawText)
  });
};

export const parseResume: RequestHandler = (req, res) => {
  if (typeof req.body?.rawText !== "string") {
    sendError(req, res, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  res.status(200).json({
    success: true,
    resume: algorithmResumeParser.parseResume(req.body.rawText)
  });
};

export const parseResumeWithLlm: RequestHandler = async (req, res) => {
  if (typeof req.body?.rawText !== "string") {
    sendError(req, res, 400, "RAW_TEXT_REQUIRED", "rawText must be a string");
    return;
  }

  if (!env.useLlmParser) {
    sendError(req, res, 503, "LLM_PARSER_DISABLED", "LLM resume parser is disabled");
    return;
  }

  try {
    const resume = await llmResumeParser.parseResume(req.body.rawText);

    if (!validateParsedResume(resume)) {
      sendError(req, res, 422, "LLM_PARSE_FAILED", "LLM resume parsing failed");
      return;
    }

    res.status(200).json({ success: true, resume });
  } catch (error) {
    if (error instanceof LLMParserNotConfiguredError) {
      sendError(req, res, 501, error.code, error.message);
      return;
    }

    sendError(req, res, 422, "LLM_PARSE_FAILED", "LLM resume parsing failed");
  }
};

export const embedResume: RequestHandler = async (req, res) => {
  const body = req.body as Partial<ResumeEmbeddingInput> | undefined;

  if (typeof body?.rawText !== "string" || !Array.isArray(body.skills)) {
    sendError(req, res, 400, "EMBEDDING_INPUT_REQUIRED", "rawText and skills are required");
    return;
  }

  if (!body.skills.every((skill) => typeof skill === "string")) {
    sendError(req, res, 400, "EMBEDDING_INPUT_INVALID", "skills must be an array of strings");
    return;
  }

  try {
    const embedding = await embeddingService.generateResumeEmbedding({
      name: body.name,
      role: body.role,
      skills: body.skills,
      company: body.company,
      experienceSummary: body.experienceSummary,
      rawText: body.rawText
    });

    res.status(200).json({
      success: true,
      model: env.mistralEmbedModel,
      dimension: embedding.length,
      embedding
    });
  } catch (error) {
    if (error instanceof EmbeddingError) {
      sendError(req, res, 502, error.code, error.message);
      return;
    }

    sendError(req, res, 502, "EMBEDDING_FAILED", "Mistral embedding failed");
  }
};

export const storeResume: RequestHandler = async (req, res) => {
  const body = req.body as {
    fileName?: unknown;
    resume?: unknown;
    rawText?: unknown;
    embedding?: unknown;
  } | undefined;
  const resume = body?.resume as Partial<ParsedResume> | undefined;

  if (
    typeof body?.fileName !== "string" ||
    typeof body.rawText !== "string" ||
    !body.rawText.trim() ||
    !resume ||
    !Array.isArray(resume.skills) ||
    !Array.isArray(body.embedding)
  ) {
    sendError(
      req,
      res,
      400,
      "STORAGE_INPUT_REQUIRED",
      "fileName, resume, rawText, and embedding are required"
    );
    return;
  }

  if (
    !resume.skills.every((skill) => typeof skill === "string") ||
    !body.embedding.every((value) => typeof value === "number" && Number.isFinite(value)) ||
    body.embedding.length !== env.embeddingDimension
  ) {
    sendError(
      req,
      res,
      400,
      "INVALID_EMBEDDING",
      `embedding must contain ${env.embeddingDimension} numeric values`
    );
    return;
  }

  try {
    const resumeId = await resumeIngestionRepository.insertResume({
      fileName: body.fileName,
      resume: resume as ParsedResume,
      rawText: body.rawText,
      embedding: body.embedding
    });

    res.status(201).json({
      success: true,
      message: "Resume stored successfully",
      resumeId
    });
  } catch (_error) {
    sendError(req, res, 503, "INGESTION_FAILED", "Resume ingestion failed");
  }
};

export const ingestResume: RequestHandler = async (req, res) => {
  if (!req.file) {
    sendError(req, res, 400, "FILE_REQUIRED", "Resume PDF is required");
    return;
  }

  try {
    const result = await resumeIngestionService.ingestResume(req.file);

    res.locals.ingestion = {
      fileName: req.file.originalname,
      ...result.timings
    };

    res.status(201).json({
      success: true,
      message: "Resume ingestion completed",
      resumeId: result.resumeId,
      data: {
        name: result.resume.name,
        role: result.resume.role,
        company: result.resume.company,
        totalExperience: result.resume.totalExperience,
        skillsCount: result.resume.skills.length,
        embeddingModel: env.mistralEmbedModel,
        embeddingDimension: env.embeddingDimension
      },
      timings: result.timings
    });
  } catch (error) {
    if (error instanceof EmbeddingError) {
      sendError(req, res, 502, "EMBEDDING_FAILED", "Mistral embedding failed");
    } else if (error instanceof Error && error.message === "Resume extraction failed") {
      sendError(req, res, 422, "RESUME_EXTRACTION_FAILED", "Resume extraction failed");
    } else {
      sendError(req, res, 503, "INGESTION_FAILED", "Resume ingestion failed");
    }
  } finally {
    await unlink(req.file.path).catch(() => undefined);
  }
};