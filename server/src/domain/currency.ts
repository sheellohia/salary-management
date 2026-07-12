/**
 * Pure currency + statistics helpers. Kept free of I/O so they are trivially
 * and deterministically unit-testable — this is where correctness matters most
 * for "how the org pays people".
 */

export type RateMap = Readonly<Record<string, number>>;

/**
 * Convert an amount in `currency` to USD using a rate map (1 unit = rate USD).
 * Throws on an unknown currency rather than silently producing wrong analytics.
 */
export function toUsd(amount: number, currency: string, rates: RateMap): number {
  const rate = rates[currency];
  if (rate === undefined) {
    throw new Error(`No exchange rate for currency "${currency}"`);
  }
  return amount * rate;
}

/** Round to whole cents to avoid floating-point noise in stored/returned money. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Total target cash = base + (base * bonusTargetPct%). This is the metric the
 * org compares on ("how we pay"), not just base.
 */
export function totalTargetCash(baseAmount: number, bonusTargetPct: number): number {
  return baseAmount * (1 + bonusTargetPct / 100);
}

/** Arithmetic mean. Returns 0 for an empty list. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Median via linear interpolation is unnecessary here; we use the standard
 * "average of the two middle values for even counts" definition. Returns 0 for
 * an empty list. Does not mutate the input.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * The p-th percentile (0–100) using the nearest-rank method on a copy of the
 * input. Useful for distribution spreads (e.g. p25/p75/p90).
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[index]!;
}
