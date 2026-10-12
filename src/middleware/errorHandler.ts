import type { ErrorRequestHandler } from "express";
import { sendError } from "./errorResponse";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  console.error(
    JSON.stringify({
      requestId: res.getHeader("x-request-id"),
      endpoint: req.originalUrl,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  );

  if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
    sendError(req, res, 413, "REQUEST_TOO_LARGE", "Request body exceeds the maximum allowed size");
    return;
  }

  sendError(req, res, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
};