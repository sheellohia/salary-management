import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/connection.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { asyncHandler } from './middleware.js';
import { DEPARTMENTS, LEVELS } from '../db/reference.js';

const payEquityQuery = z.object({
  department: z.enum(DEPARTMENTS as unknown as [string, ...string[]]).optional(),
  level: z.enum(LEVELS as unknown as [string, ...string[]]).optional(),
});

export function analyticsRouter(db: DB): Router {
  const service = new AnalyticsService(new AnalyticsRepository(db));
  const router = Router();

  router.get('/overview', asyncHandler((_req, res) => res.json(service.overview())));
  router.get('/by-country', asyncHandler((_req, res) => res.json(service.byCountry())));
  router.get('/by-department', asyncHandler((_req, res) => res.json(service.byDepartment())));
  router.get('/by-level', asyncHandler((_req, res) => res.json(service.byLevel())));
  router.get('/distribution', asyncHandler((_req, res) => res.json(service.distribution())));
  router.get(
    '/pay-equity',
    asyncHandler((req, res) => res.json(service.payEquity(payEquityQuery.parse(req.query)))),
  );

  return router;
}
