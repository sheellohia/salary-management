import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, http, toQuery } from './client';

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

describe('http client error handling', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
  }

  it('returns parsed JSON on success', async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ id: 1 }) });
    await expect(http.get('/employees/1')).resolves.toEqual({ id: 1 });
  });

  it('maps a structured error body to ApiError with code/message/details', async () => {
    stubFetch({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: () => Promise.resolve({ error: { code: 'CONFLICT', message: 'dup email', details: { field: 'email' } } }),
    });
    const err = (await http.post('/employees', {}).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('dup email');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('falls back gracefully when the error body is not JSON', async () => {
    stubFetch({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });
    const err = (await http.get('/employees').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe('Internal Server Error');
  });
});
