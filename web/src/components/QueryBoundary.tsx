import { Alert, Center, Loader } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

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
    return (
      <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Could not load data">
        {(query.error as Error).message}. Is the API running?
      </Alert>
    );
  }
  return <>{children(query.data)}</>;
}
