import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { InvalidFileTypeError, upload } from "../../../config/multerConfig";
import { sendError } from "../../../middleware/errorResponse";
import {
	cleanResumeText,
	detectResumeSkills,
	extractResume,
	getIngestionHealth,
	ingestResume,
	embedResume,
	parseResume,
	parseResumeWithLlm,
	storeResume,
	uploadResume
} from "../controllers/ingestionController";

export const ingestionRoutes = Router();

ingestionRoutes.get("/resume/health", getIngestionHealth);
ingestionRoutes.post("/resume/clean", cleanResumeText);
ingestionRoutes.post("/resume/skills", detectResumeSkills);
ingestionRoutes.post("/resume/parse", parseResume);
ingestionRoutes.post("/resume/llm-parse", parseResumeWithLlm);
ingestionRoutes.post("/resume/embed", embedResume);
ingestionRoutes.post("/resume/store", storeResume);

const handleUploadError = (error: unknown, req: Request, res: Response, next: NextFunction) => {
	if (error instanceof InvalidFileTypeError) {
		sendError(req, res, error.statusCode, error.code, error.message);
		return;
	}

	if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
		sendError(req, res, 413, "FILE_TOO_LARGE", "Resume exceeds maximum upload size");
		return;
	}

	next(error);
};

ingestionRoutes.post(
	"/resume/upload",
	upload.single("file"),
	handleUploadError,
	uploadResume
);

ingestionRoutes.post(
	"/resume/extract",
	upload.single("file"),
	handleUploadError,
	extractResume
);

ingestionRoutes.post(
	"/resume/ingest",
	upload.single("file"),
	handleUploadError,
	ingestResume
);