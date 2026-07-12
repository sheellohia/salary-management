/**
 * Reference data for the org. In production these would live in their own
 * tables/admin screens; for this scope they are code-defined and seeded.
 *
 * Each country carries its local currency and a typical salary band midpoint
 * (in local currency) so the seed can generate realistic, country-appropriate
 * compensation rather than uniform numbers.
 */

export interface CountryRef {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // ISO 4217
  /** Rough annual base-salary midpoint in local currency (seed realism only). */
  midBase: number;
}

export const COUNTRIES: CountryRef[] = [
  { code: 'US', name: 'United States', currency: 'USD', midBase: 130000 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', midBase: 75000 },
  { code: 'DE', name: 'Germany', currency: 'EUR', midBase: 78000 },
  { code: 'IN', name: 'India', currency: 'INR', midBase: 2200000 },
  { code: 'CA', name: 'Canada', currency: 'CAD', midBase: 110000 },
  { code: 'AU', name: 'Australia', currency: 'AUD', midBase: 120000 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', midBase: 115000 },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', midBase: 320000 },
  { code: 'BR', name: 'Brazil', currency: 'BRL', midBase: 180000 },
  { code: 'JP', name: 'Japan', currency: 'JPY', midBase: 8500000 },
];

/**
 * Exchange rates to USD, with an `asOf` date. A rate means: 1 unit of the
 * currency = `rateToUsd` USD. In production this table is refreshed from an FX
 * provider; here it is static and dated for deterministic analytics.
 */
export interface ExchangeRate {
  currency: string;
  rateToUsd: number;
  asOf: string;
}

export const EXCHANGE_RATES: ExchangeRate[] = [
  { currency: 'USD', rateToUsd: 1, asOf: '2026-07-01' },
  { currency: 'GBP', rateToUsd: 1.28, asOf: '2026-07-01' },
  { currency: 'EUR', rateToUsd: 1.08, asOf: '2026-07-01' },
  { currency: 'INR', rateToUsd: 0.012, asOf: '2026-07-01' },
  { currency: 'CAD', rateToUsd: 0.73, asOf: '2026-07-01' },
  { currency: 'AUD', rateToUsd: 0.66, asOf: '2026-07-01' },
  { currency: 'SGD', rateToUsd: 0.74, asOf: '2026-07-01' },
  { currency: 'AED', rateToUsd: 0.27, asOf: '2026-07-01' },
  { currency: 'BRL', rateToUsd: 0.18, asOf: '2026-07-01' },
  { currency: 'JPY', rateToUsd: 0.0063, asOf: '2026-07-01' },
];

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Sales',
  'Marketing',
  'Customer Success',
  'Finance',
  'People',
  'Legal',
  'Operations',
] as const;

/** Career levels, ordered from junior to executive. */
export const LEVELS = [
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
  'L7',
] as const;

/** Multiplier applied to a country's midpoint per level, for seed realism. */
export const LEVEL_MULTIPLIER: Record<(typeof LEVELS)[number], number> = {
  L1: 0.6,
  L2: 0.8,
  L3: 1.0,
  L4: 1.3,
  L5: 1.7,
  L6: 2.2,
  L7: 3.0,
};

export const TITLES_BY_DEPARTMENT: Record<string, string[]> = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager'],
  Product: ['Product Manager', 'Senior Product Manager', 'Group PM', 'Director of Product'],
  Design: ['Product Designer', 'Senior Designer', 'Design Lead', 'Head of Design'],
  Sales: ['Account Executive', 'Senior AE', 'Sales Manager', 'VP Sales'],
  Marketing: ['Marketing Manager', 'Content Lead', 'Growth Manager', 'CMO'],
  'Customer Success': ['CSM', 'Senior CSM', 'CS Team Lead', 'VP Customer Success'],
  Finance: ['Financial Analyst', 'Senior Analyst', 'Finance Manager', 'Controller'],
  People: ['People Partner', 'Recruiter', 'People Ops Manager', 'Head of People'],
  Legal: ['Legal Counsel', 'Senior Counsel', 'Compliance Manager', 'General Counsel'],
  Operations: ['Operations Analyst', 'Ops Manager', 'Program Manager', 'COO'],
};

export type CountryCode = string;
export type Department = (typeof DEPARTMENTS)[number];
export type Level = (typeof LEVELS)[number];
