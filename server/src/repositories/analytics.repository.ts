import type { DB } from '../db/connection.js';
import type { Gender } from '../domain/types.js';
import { CURRENT_SALARY_CTE } from './sql.js';

/** A flat, analytics-ready row: one active employee with USD-normalized comp. */
export interface CompRow {
  country: string;
  department: string;
  level: string;
  gender: Gender;
  currency: string;
  baseAmountUsd: number;
  totalCompUsd: number;
}

/**
 * All of an org's compensation math flows from this one query: it resolves each
 * employee's current salary, joins the exchange rate, and normalizes to USD in
 * SQL. Grouping and percentile statistics are then computed in the service from
 * these rows (see AnalyticsService) — a deliberate split so the interesting
 * math lives in small, unit-tested pure functions while SQL does the heavy join.
 *
 * At 10k employees this is a single indexed scan returning ~10k small rows.
 */
export class AnalyticsRepository {
  constructor(private readonly db: DB) {}

  compRows(status: string = 'active'): CompRow[] {
    return this.db
      .prepare(
        `${CURRENT_SALARY_CTE}
         SELECT
           e.country,
           e.department,
           e.level,
           e.gender,
           cs.currency AS currency,
           ROUND(cs.base_amount * r.rate_to_usd, 2) AS baseAmountUsd,
           ROUND(cs.base_amount * (1 + cs.bonus_target_pct / 100.0) * r.rate_to_usd, 2) AS totalCompUsd
         FROM employees e
         JOIN current_sal cs ON cs.employee_id = e.id
         JOIN exchange_rates r ON r.currency = cs.currency
         WHERE e.status = ?`,
      )
      .all(status) as CompRow[];
  }
}
