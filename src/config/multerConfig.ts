import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "./env";

export class InvalidFileTypeError extends Error {
  readonly code = "INVALID_FILE_TYPE";
  readonly statusCode = 415;

  constructor() {
    super("Only PDF files are allowed");
  }
}

const uploadDirectory = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, _file, callback) => {
    callback(null, `${randomUUID()}.pdf`);
  }
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension !== ".pdf" || file.mimetype !== "application/pdf") {
    callback(new InvalidFileTypeError());
    return;
  }

  callback(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeBytes },
  fileFilter
});