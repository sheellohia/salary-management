import { Card, Group, Skeleton, Text, ThemeIcon } from '@mantine/core';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  loading?: boolean;
}

export function StatCard({ label, value, hint, icon, loading }: StatCardProps) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          {loading ? (
            <Skeleton height={28} width={110} mt={8} />
          ) : (
            <Text fw={700} fz={28} lh={1.2} mt={4}>
              {value}
            </Text>
          )}
          {hint && (
            <Text size="xs" c="dimmed" mt={4}>
              {hint}
            </Text>
          )}
        </div>
        {icon && (
          <ThemeIcon variant="light" size="xl" radius="md">
            {icon}
          </ThemeIcon>
        )}
      </Group>
    </Card>
  );
}
