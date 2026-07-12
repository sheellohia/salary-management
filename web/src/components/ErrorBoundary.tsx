import { Component, type ReactNode } from 'react';
import { Button, Center, Stack, Text, Title } from '@mantine/core';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level error boundary: a render-time throw anywhere below renders a
 * recoverable fallback instead of white-screening the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // In production this would report to an error tracker (Sentry, etc.).
    console.error('Unhandled UI error:', error);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <Center h="100vh" p="lg">
          <Stack align="center" maw={480}>
            <Title order={3}>Something went wrong</Title>
            <Text c="dimmed" ta="center">
              The page hit an unexpected error. Reloading usually fixes it.
            </Text>
            <Text size="xs" c="dimmed" ta="center" style={{ fontFamily: 'monospace' }}>
              {this.state.error.message}
            </Text>
            <Button onClick={() => window.location.assign('/')}>Reload app</Button>
          </Stack>
        </Center>
      );
    }
    return this.props.children;
  }
}
