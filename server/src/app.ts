import express, { type Express } from 'express';
import cors from 'cors';
import type { DB } from './db/connection.js';
import { employeesRouter } from './http/employees.routes.js';
import { analyticsRouter } from './http/analytics.routes.js';
import { referenceRouter } from './http/reference.routes.js';
import { errorHandler, notFoundHandler } from './http/middleware.js';

/**
 * Build the Express app around a given database connection. Taking the DB as an
 * argument (rather than importing a singleton) lets tests spin up an isolated
 * in-memory database per suite.
 */
export function createApp(db: DB): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/employees', employeesRouter(db));
  app.use('/api/analytics', analyticsRouter(db));
  app.use('/api/reference', referenceRouter(db));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
