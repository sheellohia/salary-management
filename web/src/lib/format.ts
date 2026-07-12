/** Formatting helpers shared across the UI. Pure and unit-tested. */

/** Compact USD, e.g. 1_250_000 -> "$1.3M", 84_000 -> "$84.0K". */
export function formatUsdCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Full USD with no decimals, e.g. "$84,000". */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Amount in an arbitrary currency, e.g. formatMoney(2200000, "INR"). */
export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Turn a snake_case enum value into a human label: "full_time" -> "Full time". */
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function fullName(e: { firstName: string; lastName: string }): string {
  return `${e.firstName} ${e.lastName}`;
}
