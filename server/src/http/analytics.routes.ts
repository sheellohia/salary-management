import { Router } from 'express';
import type { DB } from '../db/connection.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { asyncHandler } from './middleware.js';

export function analyticsRouter(db: DB): Router {
  const service = new AnalyticsService(new AnalyticsRepository(db));
  const router = Router();

  router.get('/overview', asyncHandler((_req, res) => res.json(service.overview())));
  router.get('/by-country', asyncHandler((_req, res) => res.json(service.byCountry())));
  router.get('/by-department', asyncHandler((_req, res) => res.json(service.byDepartment())));
  router.get('/by-level', asyncHandler((_req, res) => res.json(service.byLevel())));
  router.get('/distribution', asyncHandler((_req, res) => res.json(service.distribution())));
  router.get('/pay-equity', asyncHandler((_req, res) => res.json(service.payEquity())));

  return router;
}
