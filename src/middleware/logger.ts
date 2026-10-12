import type { RequestHandler } from "express";

export const logger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const ingestion = res.locals.ingestion as
      | {
          fileName?: string;
          extractMs?: number;
          cleanMs?: number;
          parseMs?: number;
          embeddingMs?: number;
          mongoInsertMs?: number;
          totalMs?: number;
        }
      | undefined;
    const retrieval = res.locals.retrieval as
      | {
          componentTimings?: {
            embeddingMs?: number;
            bm25Ms?: number;
            vectorMs?: number;
            rerankMs?: number;
            summarizeMs?: number;
          };
          durationMs?: number;
          warnings?: string[];
        }
      | undefined;

    console.log(
      JSON.stringify({
        requestId: res.getHeader("x-request-id"),
        endpoint: req.originalUrl,
        method: req.method,
        ...(ingestion?.fileName || req.file?.originalname
          ? { fileName: ingestion?.fileName ?? req.file?.originalname }
          : {}),
        statusCode: res.statusCode,
        ...(retrieval
          ? {
              durationMs: retrieval.durationMs ?? Date.now() - startedAt,
              componentTimings: retrieval.componentTimings,
              ...(retrieval.warnings && retrieval.warnings.length > 0
                ? { warnings: retrieval.warnings }
                : {})
            }
          : ingestion
          ? {
              extractMs: ingestion.extractMs,
              cleanMs: ingestion.cleanMs,
              parseMs: ingestion.parseMs,
              embeddingMs: ingestion.embeddingMs,
              mongoInsertMs: ingestion.mongoInsertMs,
              totalMs: ingestion.totalMs
            }
            : { durationMs: Date.now() - startedAt, totalMs: Date.now() - startedAt })
      })
    );
  });

  next();
};