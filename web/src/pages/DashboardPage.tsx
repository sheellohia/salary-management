import { BarChart } from '@mantine/charts';
import { Badge, Card, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { IconBuildingBank, IconChartHistogram, IconUsers, IconWorld } from '@tabler/icons-react';
import {
  useByCountry,
  useByDepartment,
  useByLevel,
  useDistribution,
  useOverview,
  usePayEquity,
} from '../api/hooks';
import { StatCard } from '../components/StatCard';
import { QueryBoundary } from '../components/QueryBoundary';
import { formatUsd, formatUsdCompact, humanize } from '../lib/format';

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Text fw={600}>{title}</Text>
      {subtitle && (
        <Text size="xs" c="dimmed" mb="md">
          {subtitle}
        </Text>
      )}
      {children}
    </Card>
  );
}

function bucketLabel(from: number, to: number | null): string {
  if (to === null) return `$${from / 1000}K+`;
  return `$${from / 1000}–${to / 1000}K`;
}

export function DashboardPage() {
  const overview = useOverview();
  const byCountry = useByCountry();
  const byDepartment = useByDepartment();
  const byLevel = useByLevel();
  const distribution = useDistribution();
  const payEquity = usePayEquity();

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>How ACME pays</Title>
        <Text c="dimmed">
          Active workforce, with all compensation normalized to USD (annual base + target bonus).
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          label="Active headcount"
          loading={overview.isPending}
          value={overview.data?.headcount.toLocaleString()}
          icon={<IconUsers size={22} />}
        />
        <StatCard
          label="Total annual payroll"
          loading={overview.isPending}
          value={formatUsdCompact(overview.data?.totalPayrollUsd)}
          hint="Base + target bonus, USD"
          icon={<IconBuildingBank size={22} />}
        />
        <StatCard
          label="Median compensation"
          loading={overview.isPending}
          value={formatUsd(overview.data?.medianCompUsd)}
          hint={
            overview.data
              ? `P25 ${formatUsdCompact(overview.data.p25CompUsd)} · P75 ${formatUsdCompact(overview.data.p75CompUsd)}`
              : undefined
          }
          icon={<IconChartHistogram size={22} />}
        />
        <StatCard
          label="Countries / currencies"
          loading={overview.isPending}
          value={overview.data ? `${overview.data.countryCount} / ${overview.data.currencyCount}` : undefined}
          icon={<IconWorld size={22} />}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <ChartCard title="Total compensation by department" subtitle="Where the payroll spend goes (USD)">
          <QueryBoundary query={byDepartment} height={300}>
            {(data) => (
              <BarChart
                h={300}
                data={data}
                dataKey="key"
                series={[{ name: 'totalCompUsd', label: 'Total comp', color: 'indigo.6' }]}
                valueFormatter={(v) => formatUsdCompact(v)}
                tickLine="y"
              />
            )}
          </QueryBoundary>
        </ChartCard>

        <ChartCard title="Total compensation by country" subtitle="USD, top spend first">
          <QueryBoundary query={byCountry} height={300}>
            {(data) => (
              <BarChart
                h={300}
                data={data}
                dataKey="key"
                series={[{ name: 'totalCompUsd', label: 'Total comp', color: 'teal.6' }]}
                valueFormatter={(v) => formatUsdCompact(v)}
                tickLine="y"
              />
            )}
          </QueryBoundary>
        </ChartCard>

        <ChartCard title="Median compensation by level" subtitle="USD, junior to senior">
          <QueryBoundary query={byLevel} height={300}>
            {(data) => (
              <BarChart
                h={300}
                data={data}
                dataKey="key"
                series={[{ name: 'medianCompUsd', label: 'Median comp', color: 'grape.6' }]}
                valueFormatter={(v) => formatUsdCompact(v)}
                tickLine="y"
              />
            )}
          </QueryBoundary>
        </ChartCard>

        <ChartCard title="Compensation distribution" subtitle="Headcount by total-comp band (USD)">
          <QueryBoundary query={distribution} height={300}>
            {(data) => (
              <BarChart
                h={300}
                data={data.map((b) => ({ band: bucketLabel(b.from, b.to), count: b.count }))}
                dataKey="band"
                series={[{ name: 'count', label: 'Employees', color: 'orange.6' }]}
                tickLine="y"
              />
            )}
          </QueryBoundary>
        </ChartCard>
      </SimpleGrid>

      <ChartCard
        title="Pay equity — median compensation by gender"
        subtitle="First-cut view. Gap = % below the highest-paid group's median. A production version controls for role/level mix."
      >
        <QueryBoundary query={payEquity} height={160}>
          {(rows) => (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Gender</Table.Th>
                  <Table.Th>Headcount</Table.Th>
                  <Table.Th>Median comp (USD)</Table.Th>
                  <Table.Th>Gap vs top</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => (
                  <Table.Tr key={r.gender}>
                    <Table.Td>{humanize(r.gender)}</Table.Td>
                    <Table.Td>{r.headcount.toLocaleString()}</Table.Td>
                    <Table.Td>{formatUsd(r.medianCompUsd)}</Table.Td>
                    <Table.Td>
                      <Badge color={r.gapPct === 0 ? 'teal' : r.gapPct > 10 ? 'red' : 'yellow'} variant="light">
                        {r.gapPct === 0 ? 'Highest' : `-${r.gapPct}%`}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </QueryBoundary>
      </ChartCard>
    </Stack>
  );
}
