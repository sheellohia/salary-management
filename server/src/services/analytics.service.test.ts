import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DB } from '../db/connection.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { EmployeeService } from './employee.service.js';
import { makeTestDb, employeeInput } from '../test/fixtures.js';

/**
 * Fixed 4-employee org with hand-computable USD totals:
 *   US female  base 100k USD, bonus 10%  -> 110,000 USD
 *   US male    base 200k USD, bonus  0%  -> 200,000 USD
 *   IN female  base   2M INR, bonus  0%  ->  24,000 USD  (2,000,000 * 0.012)
 *   DE male    base 100k EUR, bonus 20%  -> 129,600 USD  (120,000 * 1.08)
 */
let db: DB;
let analytics: AnalyticsService;

beforeEach(() => {
  db = makeTestDb();
  const employees = new EmployeeService(db);
  employees.create(employeeInput({ country: 'US', department: 'Engineering', gender: 'female', salary: { baseAmount: 100_000, currency: 'USD', bonusTargetPct: 10, effectiveDate: '2022-01-01' } }));
  employees.create(employeeInput({ country: 'US', department: 'Engineering', gender: 'male', salary: { baseAmount: 200_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2022-01-01' } }));
  employees.create(employeeInput({ country: 'IN', department: 'Product', gender: 'female', salary: { baseAmount: 2_000_000, currency: 'INR', bonusTargetPct: 0, effectiveDate: '2022-01-01' } }));
  employees.create(employeeInput({ country: 'DE', department: 'Sales', gender: 'male', salary: { baseAmount: 100_000, currency: 'EUR', bonusTargetPct: 20, effectiveDate: '2022-01-01' } }));
  analytics = new AnalyticsService(new AnalyticsRepository(db));
});

afterEach(() => db.close());

describe('AnalyticsService.overview', () => {
  it('sums payroll and computes central tendency in USD', () => {
    const o = analytics.overview();
    expect(o.headcount).toBe(4);
    expect(o.countryCount).toBe(3);
    expect(o.currencyCount).toBe(3);
    expect(o.totalPayrollUsd).toBe(463_600); // 110k + 200k + 24k + 129.6k
    expect(o.avgCompUsd).toBe(115_900);
    expect(o.medianCompUsd).toBe(119_800); // avg of 110k and 129.6k
  });
});

describe('AnalyticsService.byCountry', () => {
  it('groups totals by country and sorts by spend descending', () => {
    const rows = analytics.byCountry();
    expect(rows.map((r) => r.key)).toEqual(['US', 'DE', 'IN']);
    const us = rows.find((r) => r.key === 'US')!;
    expect(us.headcount).toBe(2);
    expect(us.totalCompUsd).toBe(310_000);
    expect(us.medianCompUsd).toBe(155_000); // avg of 110k and 200k
  });
});

describe('AnalyticsService.payEquity', () => {
  it('reports median comp per gender and the gap to the top group', () => {
    const rows = analytics.payEquity();
    const male = rows.find((r) => r.gender === 'male')!;
    const female = rows.find((r) => r.gender === 'female')!;
    expect(male.medianCompUsd).toBe(164_800); // avg of 200k, 129.6k
    expect(female.medianCompUsd).toBe(67_000); // avg of 110k, 24k
    expect(male.gapPct).toBe(0); // top-paid group
    expect(female.gapPct).toBeCloseTo(59.34, 1);
  });
});

describe('AnalyticsService.distribution', () => {
  it('buckets total comp into $25k bands', () => {
    const buckets = analytics.distribution();
    expect(buckets[0]!.count).toBe(1); // 24,000 -> [0, 25k)
    expect(buckets[4]!.count).toBe(1); // 110,000 -> [100k, 125k)
    expect(buckets[5]!.count).toBe(1); // 129,600 -> [125k, 150k)
    expect(buckets[8]!.count).toBe(1); // 200,000 -> [200k, 225k)
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(4);
  });
});

describe('analytics exclude terminated employees', () => {
  it('drops terminated staff from payroll math', () => {
    const employees = new EmployeeService(db);
    const created = employees.create(employeeInput({ salary: { baseAmount: 500_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2023-01-01' } }));
    expect(analytics.overview().headcount).toBe(5);
    employees.terminate(created.id);
    expect(analytics.overview().headcount).toBe(4);
    expect(analytics.overview().totalPayrollUsd).toBe(463_600);
  });
});
