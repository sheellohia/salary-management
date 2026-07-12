const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

/** An API error that carries the server's structured error code and message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<never> {
  let code = 'ERROR';
  let message = res.statusText;
  let details: unknown;
  try {
    const body = await res.json();
    code = body?.error?.code ?? code;
    message = body?.error?.message ?? message;
    details = body?.error?.details;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, code, message, details);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export const http = {
  get: <T>(path: string) => requestJson<T>(path),
  post: <T>(path: string, body: unknown) =>
    requestJson<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    requestJson<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => requestJson<T>(path, { method: 'DELETE' }),
};

/** Serialize a query object into a URL search string, skipping empty values. */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}
