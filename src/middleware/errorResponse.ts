import type { Request, Response } from "express";

export const sendError = (
  req: Request,
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string
): void => {
  res.status(statusCode).json({
    success: false,
    requestId: res.getHeader("x-request-id") ?? req.header("x-request-id"),
    errorCode,
    message
  });
};