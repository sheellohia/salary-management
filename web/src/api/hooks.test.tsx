import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock the low-level client so the hooks resolve without a network.
vi.mock('./client', () => ({
  http: {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({ id: 1 }),
    patch: vi.fn().mockResolvedValue({ id: 1 }),
    delete: vi.fn().mockResolvedValue({ id: 1 }),
  },
  toQuery: () => '',
  ApiError: class ApiError extends Error {},
}));

import { useCreateEmployee, useTerminateEmployee } from './hooks';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const spy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, spy };
}

describe('mutation hooks invalidate the right caches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useCreateEmployee invalidates employees, employee and analytics on success', async () => {
    const { wrapper, spy } = makeWrapper();
    const { result } = renderHook(() => useCreateEmployee(), { wrapper });
    await result.current.mutateAsync({} as never);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0]);
    expect(keys).toEqual(expect.arrayContaining(['employees', 'employee', 'analytics']));
  });

  it('useTerminateEmployee invalidates the same caches', async () => {
    const { wrapper, spy } = makeWrapper();
    const { result } = renderHook(() => useTerminateEmployee(), { wrapper });
    await result.current.mutateAsync(1);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));
  });
});
