import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.js';
import { logger } from '../logger.js';

/** Wrap async route handlers so thrown/rejected errors reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

/** Central error handler: normalizes Zod, AppError, and unexpected errors. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  // body-parser / http-errors set a numeric status and `expose` for client faults
  // (malformed JSON -> 400, oversized body -> 413). Surface those honestly instead
  // of masking them as a 500.
  const status = extractClientErrorStatus(err);
  if (status) {
    const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST';
    const message = err instanceof Error ? err.message : 'Bad request';
    res.status(status).json({ error: { code, message } });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
}

/** Returns a client-error status (4xx) for exposed body-parser/http-errors, else null. */
function extractClientErrorStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as { status?: unknown; statusCode?: unknown; expose?: unknown };
  const status = typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : null;
  if (status && e.expose === true && status >= 400 && status < 500) return status;
  return null;
}
