import { Alert, Center, Loader } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../api/client';

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  height?: number;
}

/** Renders loading / error states for a query, or hands `data` to `children`. */
export function QueryBoundary<T>({ query, children, height = 200 }: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return (
      <Center h={height}>
        <Loader />
      </Center>
    );
  }
  if (query.isError) {
    const err = query.error;
    const isApi = err instanceof ApiError;
    const notFound = isApi && err.status === 404;
    return (
      <Alert
        color={notFound ? 'gray' : 'red'}
        icon={<IconAlertTriangle size={18} />}
        title={notFound ? 'Not found' : 'Could not load data'}
      >
        {notFound
          ? (err as ApiError).message
          : isApi
            ? (err as ApiError).message
            : `${(err as Error).message}. Is the API running?`}
      </Alert>
    );
  }
  return <>{children(query.data)}</>;
}
