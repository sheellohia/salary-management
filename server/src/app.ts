import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { DB } from './db/connection.js';
import { logger } from './logger.js';
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
  // Baseline security headers (HSTS, nosniff, frameguard, etc.). CSP is left off:
  // configuring a correct policy for the bundled SPA is out of scope and a wrong
  // one silently breaks the UI — the other headers are the cheap, safe win.
  app.use(helmet({ contentSecurityPolicy: false }));
  // Structured request logging (method/path/status/latency). The shared logger is
  // disabled under NODE_ENV=test, so this is silent in the test suite. Health
  // checks are skipped to keep logs signal-rich.
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  // Echo the per-request id (set by pino-http) so a user-reported error can be
  // traced back to a specific log line.
  app.use((req, res, next) => {
    res.setHeader('X-Request-Id', String((req as { id?: unknown }).id ?? ''));
    next();
  });
  // CORS: same-origin in the single-container prod build, so this only matters for
  // the split dev setup. Restrict via CORS_ORIGIN (comma-separated) if desired.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(cors(corsOrigin ? { origin: corsOrigin.split(',').map((o) => o.trim()) } : {}));
  app.use(express.json({ limit: '1mb' }));

  // Readiness probe: actually touches the DB so an unreachable/broken database
  // reports unhealthy (503) instead of a misleading 200.
  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
    } catch {
      res.status(503).json({ status: 'degraded', reason: 'database unavailable' });
    }
  });
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
