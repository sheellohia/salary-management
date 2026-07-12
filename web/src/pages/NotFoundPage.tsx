import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Center h="60vh">
      <Stack align="center">
        <Title order={2}>Page not found</Title>
        <Text c="dimmed">The page you’re looking for doesn’t exist.</Text>
        <Button component={Link} to="/">
          Go to dashboard
        </Button>
      </Stack>
    </Center>
  );
}
