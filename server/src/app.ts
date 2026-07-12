import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import type { DB } from './db/connection.js';
import { employeesRouter } from './http/employees.routes.js';
import { analyticsRouter } from './http/analytics.routes.js';
import { referenceRouter } from './http/reference.routes.js';
import { errorHandler, notFoundHandler } from './http/middleware.js';

export interface AppOptions {
  /** If set, serve the built web SPA from this directory (single-container deploy). */
  webDistPath?: string;
}

/**
 * Build the Express app around a given database connection. Taking the DB as an
 * argument (rather than importing a singleton) lets tests spin up an isolated
 * in-memory database per suite.
 */
export function createApp(db: DB, options: AppOptions = {}): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/employees', employeesRouter(db));
  app.use('/api/analytics', analyticsRouter(db));
  app.use('/api/reference', referenceRouter(db));

  // Unknown /api/* routes get a JSON 404; everything else may fall through to the SPA.
  app.use('/api', notFoundHandler);

  if (options.webDistPath) {
    app.use(express.static(options.webDistPath));
    // SPA fallback: serve index.html for client-side routes (non-API GETs).
    app.get('*', (_req, res) => {
      res.sendFile(path.join(options.webDistPath!, 'index.html'));
    });
  } else {
    app.use(notFoundHandler);
  }

  app.use(errorHandler);
  return app;
}
