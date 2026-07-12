import { describe, expect, it } from 'vitest';
import { formatMoney, formatUsd, formatUsdCompact, fullName, humanize } from './format';

describe('formatUsdCompact', () => {
  it('formats large numbers compactly', () => {
    expect(formatUsdCompact(1_250_000)).toBe('$1.3M');
    expect(formatUsdCompact(84_000)).toBe('$84K');
  });
  it('renders a dash for null/undefined', () => {
    expect(formatUsdCompact(null)).toBe('—');
    expect(formatUsdCompact(undefined)).toBe('—');
  });
});

describe('formatUsd', () => {
  it('formats whole-dollar USD', () => {
    expect(formatUsd(84_000)).toBe('$84,000');
  });
  it('renders a dash for missing values', () => {
    expect(formatUsd(null)).toBe('—');
  });
});

describe('formatMoney', () => {
  it('formats an arbitrary currency', () => {
    expect(formatMoney(2_200_000, 'INR')).toContain('2,200,000');
  });
});

describe('humanize', () => {
  it('converts snake_case enums into labels', () => {
    expect(humanize('full_time')).toBe('Full time');
    expect(humanize('non_binary')).toBe('Non binary');
  });
});

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
  });
});
