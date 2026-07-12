import { describe, expect, it } from 'vitest';
import { toQuery } from './client';

describe('toQuery', () => {
  it('serializes non-empty params', () => {
    expect(toQuery({ page: 2, search: 'ada' })).toBe('?page=2&search=ada');
  });

  it('skips undefined, null and empty-string values', () => {
    expect(toQuery({ page: 1, country: undefined, level: null, search: '' })).toBe('?page=1');
  });

  it('returns an empty string when nothing is set', () => {
    expect(toQuery({ a: undefined, b: null })).toBe('');
  });
});
