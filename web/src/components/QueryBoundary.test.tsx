import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import { QueryBoundary } from './QueryBoundary';
import { ApiError } from '../api/client';

function renderBoundary<T>(query: Partial<UseQueryResult<T>>, child: (d: T) => React.ReactNode) {
  return render(
    <MantineProvider>
      <QueryBoundary query={query as UseQueryResult<T>}>{child}</QueryBoundary>
    </MantineProvider>,
  );
}

describe('QueryBoundary', () => {
  it('renders a loader while pending', () => {
    const { container } = renderBoundary({ isPending: true }, () => <div>data</div>);
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('renders the data when the query succeeds', () => {
    renderBoundary({ isPending: false, isError: false, data: 'hello' }, (d) => <div>{d}</div>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows a "Not found" message for a 404 ApiError', () => {
    renderBoundary(
      { isPending: false, isError: true, error: new ApiError(404, 'NOT_FOUND', 'Employee 5 not found') },
      () => <div>data</div>,
    );
    expect(screen.getByText('Not found')).toBeInTheDocument();
    expect(screen.getByText(/Employee 5 not found/)).toBeInTheDocument();
  });

  it('adds an "Is the API running?" hint for a non-API (network) error', () => {
    renderBoundary(
      { isPending: false, isError: true, error: new Error('Failed to fetch') },
      () => <div>data</div>,
    );
    expect(screen.getByText(/Is the API running\?/)).toBeInTheDocument();
  });
});
