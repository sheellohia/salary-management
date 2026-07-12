import { describe, expect, it } from 'vitest';
import { mean, median, percentile, roundMoney, toUsd, totalTargetCash } from './currency.js';

const RATES = { USD: 1, EUR: 1.08, INR: 0.012 };

describe('toUsd', () => {
  it('converts local currency to USD using the rate', () => {
    expect(toUsd(100, 'EUR', RATES)).toBeCloseTo(108);
    expect(toUsd(1_000_000, 'INR', RATES)).toBeCloseTo(12_000);
  });

  it('is identity for USD', () => {
    expect(toUsd(2500, 'USD', RATES)).toBe(2500);
  });

  it('throws on an unknown currency rather than returning a wrong number', () => {
    expect(() => toUsd(100, 'GBP', RATES)).toThrow(/no exchange rate/i);
  });
});

describe('totalTargetCash', () => {
  it('adds the target bonus percentage to base', () => {
    expect(totalTargetCash(100_000, 20)).toBe(120_000);
    expect(totalTargetCash(100_000, 0)).toBe(100_000);
  });
});

describe('roundMoney', () => {
  it('rounds to two decimal places', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });
});

describe('mean', () => {
  it('averages values and returns 0 for an empty list', () => {
    expect(mean([10, 20, 30])).toBe(20);
    expect(mean([])).toBe(0);
  });
});

describe('median', () => {
  it('returns the middle value for odd counts', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle values for even counts', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('does not mutate the input array', () => {
    const input = [5, 1, 3];
    median(input);
    expect(input).toEqual([5, 1, 3]);
  });

  it('returns 0 for an empty list', () => {
    expect(median([])).toBe(0);
  });
});

describe('percentile', () => {
  const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  it('computes nearest-rank percentiles', () => {
    expect(percentile(data, 25)).toBe(30);
    expect(percentile(data, 90)).toBe(90);
    expect(percentile(data, 100)).toBe(100);
  });
  it('returns 0 for an empty list', () => {
    expect(percentile([], 50)).toBe(0);
  });
});
