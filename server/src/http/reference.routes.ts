import { Router } from 'express';
import type { DB } from '../db/connection.js';
import { COUNTRIES, DEPARTMENTS, LEVELS } from '../db/reference.js';
import { EMPLOYMENT_TYPES, GENDERS } from '../domain/types.js';
import { asyncHandler } from './middleware.js';

/**
 * Serves the reference lists the UI needs to build filters and forms
 * (countries+currencies, departments, levels, enums) plus live FX rates.
 */
export function referenceRouter(db: DB): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler((_req, res) => {
      const rates = db
        .prepare('SELECT currency, rate_to_usd AS rateToUsd, as_of AS asOf FROM exchange_rates')
        .all();
      res.json({
        countries: COUNTRIES.map((c) => ({
          code: c.code,
          name: c.name,
          currency: c.currency,
        })),
        departments: DEPARTMENTS,
        levels: LEVELS,
        employmentTypes: EMPLOYMENT_TYPES,
        genders: GENDERS,
        exchangeRates: rates,
        baseCurrency: 'USD',
      });
    }),
  );

  return router;
}
