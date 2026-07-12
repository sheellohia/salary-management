import type { AnalyticsRepository, CompRow } from '../repositories/analytics.repository.js';
import { mean, median, percentile, roundMoney } from '../domain/currency.js';

export interface GroupStat {
  key: string;
  headcount: number;
  totalCompUsd: number;
  avgCompUsd: number;
  medianCompUsd: number;
}

export interface Overview {
  headcount: number;
  currencyCount: number;
  countryCount: number;
  totalPayrollUsd: number;
  avgCompUsd: number;
  medianCompUsd: number;
  p25CompUsd: number;
  p75CompUsd: number;
  p90CompUsd: number;
}

export interface DistributionBucket {
  /** Inclusive lower bound of the bucket in USD. */
  from: number;
  /** Exclusive upper bound in USD, or null for the final open-ended bucket. */
  to: number | null;
  count: number;
}

export interface PayEquityRow {
  gender: string;
  headcount: number;
  medianCompUsd: number;
  /** Percentage below the highest-paid gender group's median (0 for the top). */
  gapPct: number;
}

/** Group comp rows by a key selector and compute headcount / total / avg / median. */
function groupStats(rows: CompRow[], keyFn: (r: CompRow) => string): GroupStat[] {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = buckets.get(key);
    if (list) list.push(row.totalCompUsd);
    else buckets.set(key, [row.totalCompUsd]);
  }
  return [...buckets.entries()]
    .map(([key, values]) => ({
      key,
      headcount: values.length,
      totalCompUsd: roundMoney(values.reduce((s, v) => s + v, 0)),
      avgCompUsd: roundMoney(mean(values)),
      medianCompUsd: roundMoney(median(values)),
    }))
    .sort((a, b) => b.totalCompUsd - a.totalCompUsd);
}

export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  overview(): Overview {
    const rows = this.repo.compRows();
    const totals = rows.map((r) => r.totalCompUsd);
    return {
      headcount: rows.length,
      currencyCount: new Set(rows.map((r) => r.currency)).size,
      countryCount: new Set(rows.map((r) => r.country)).size,
      totalPayrollUsd: roundMoney(totals.reduce((s, v) => s + v, 0)),
      avgCompUsd: roundMoney(mean(totals)),
      medianCompUsd: roundMoney(median(totals)),
      p25CompUsd: roundMoney(percentile(totals, 25)),
      p75CompUsd: roundMoney(percentile(totals, 75)),
      p90CompUsd: roundMoney(percentile(totals, 90)),
    };
  }

  byCountry(): GroupStat[] {
    return groupStats(this.repo.compRows(), (r) => r.country);
  }

  byDepartment(): GroupStat[] {
    return groupStats(this.repo.compRows(), (r) => r.department);
  }

  byLevel(): GroupStat[] {
    // Levels sort naturally (L1..L7), overriding the total-desc order.
    return groupStats(this.repo.compRows(), (r) => r.level).sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  }

  /**
   * Fixed-width histogram of total comp. `bucketSize` defaults to $25k; the last
   * bucket is open-ended so extreme executive comp doesn't create empty buckets.
   */
  distribution(bucketSize = 25000, maxBuckets = 10): DistributionBucket[] {
    const rows = this.repo.compRows();
    const buckets: DistributionBucket[] = [];
    for (let i = 0; i < maxBuckets; i++) {
      buckets.push({
        from: i * bucketSize,
        to: i === maxBuckets - 1 ? null : (i + 1) * bucketSize,
        count: 0,
      });
    }
    for (const row of rows) {
      const idx = Math.min(Math.floor(row.totalCompUsd / bucketSize), maxBuckets - 1);
      buckets[idx]!.count += 1;
    }
    return buckets;
  }

  /**
   * Median total comp by gender, with each group's gap below the top-paid group.
   * A simple, honest first cut at pay equity; a production version would compare
   * within like-for-like role/level cohorts to control for role mix.
   */
  payEquity(): PayEquityRow[] {
    const stats = groupStats(this.repo.compRows(), (r) => r.gender);
    const topMedian = Math.max(0, ...stats.map((s) => s.medianCompUsd));
    return stats
      .map((s) => ({
        gender: s.key,
        headcount: s.headcount,
        medianCompUsd: s.medianCompUsd,
        gapPct:
          topMedian === 0
            ? 0
            : roundMoney(((topMedian - s.medianCompUsd) / topMedian) * 100),
      }))
      .sort((a, b) => b.medianCompUsd - a.medianCompUsd);
  }
}
