import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconArrowLeft, IconEdit, IconPlus, IconUserOff } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { useEmployee, useTerminateEmployee } from '../api/hooks';
import { QueryBoundary } from '../components/QueryBoundary';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { SalaryFormModal } from '../components/SalaryFormModal';
import { formatMoney, formatUsd, fullName, humanize } from '../lib/format';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text>{value}</Text>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams();
  const parsed = Number(id);
  const employeeId = id && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  const query = useEmployee(employeeId);
  const terminate = useTerminateEmployee();
  const [editOpened, edit] = useDisclosure(false);
  const [salaryOpened, salary] = useDisclosure(false);

  const handleTerminate = async () => {
    if (!employeeId) return;
    if (!window.confirm('Terminate this employee? They will be marked inactive and excluded from payroll analytics.')) return;
    try {
      await terminate.mutateAsync(employeeId);
      notifications.show({ color: 'orange', message: 'Employee terminated' });
    } catch {
      notifications.show({ color: 'red', message: 'Could not terminate employee' });
    }
  };

  return (
    <Stack gap="lg">
      <Anchor
        component={Link}
        to="/employees"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        <IconArrowLeft size={16} /> Back to employees
      </Anchor>

      {!employeeId ? (
        <Alert color="gray" icon={<IconAlertTriangle size={18} />} title="Employee not found">
          “{id}” is not a valid employee id.
        </Alert>
      ) : (
      <QueryBoundary query={query} height={400}>
        {(e) => (
          <>
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap="sm">
                  <Title order={2}>{fullName(e)}</Title>
                  <Badge variant="light" color="gray">
                    {e.level}
                  </Badge>
                  {e.status === 'terminated' && (
                    <Badge color="red" variant="light">
                      Terminated
                    </Badge>
                  )}
                </Group>
                <Text c="dimmed">
                  {e.jobTitle} · {e.department} · {e.employeeCode}
                </Text>
              </div>
              <Group>
                <Button variant="default" leftSection={<IconEdit size={16} />} onClick={edit.open}>
                  Edit
                </Button>
                <Button leftSection={<IconPlus size={16} />} onClick={salary.open}>
                  Record raise
                </Button>
                {e.status === 'active' && (
                  <Button color="red" variant="light" leftSection={<IconUserOff size={16} />} onClick={handleTerminate} loading={terminate.isPending}>
                    Terminate
                  </Button>
                )}
              </Group>
            </Group>

            <Grid>
              <Grid.Col span={{ base: 12, md: 7 }}>
                <Card withBorder radius="md" padding="lg" h="100%">
                  <Text fw={600} mb="md">
                    Profile
                  </Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <Field label="Email" value={e.email} />
                    <Field label="Country" value={e.country} />
                    <Field label="Employment type" value={humanize(e.employmentType)} />
                    <Field label="Gender" value={humanize(e.gender)} />
                    <Field label="Hire date" value={e.hireDate} />
                    <Field label="Manager ID" value={e.managerId ?? '—'} />
                  </SimpleGrid>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 5 }}>
                <Card withBorder radius="md" padding="lg" h="100%">
                  <Text fw={600} mb="md">
                    Current compensation
                  </Text>
                  {e.currentSalary ? (
                    <Stack gap="xs">
                      <Field
                        label="Annual base (local)"
                        value={formatMoney(e.currentSalary.baseAmount, e.currentSalary.currency)}
                      />
                      <Field label="Target bonus" value={`${e.currentSalary.bonusTargetPct}%`} />
                      <Field label="Base (USD)" value={formatUsd(e.baseAmountUsd)} />
                      <Field
                        label="Total target comp (USD)"
                        value={<Text fw={700}>{formatUsd(e.totalCompUsd)}</Text>}
                      />
                    </Stack>
                  ) : (
                    <Text c="dimmed">No salary on record.</Text>
                  )}
                </Card>
              </Grid.Col>
            </Grid>

            <Card withBorder radius="md" padding="lg">
              <Text fw={600} mb="md">
                Salary history
              </Text>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Effective date</Table.Th>
                    <Table.Th>Base (local)</Table.Th>
                    <Table.Th>Bonus %</Table.Th>
                    <Table.Th>Note</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {e.salaryHistory.map((s, i) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        {s.effectiveDate}
                        {i === 0 && (
                          <Badge ml="xs" size="xs" variant="light" color="indigo">
                            Current
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>{formatMoney(s.baseAmount, s.currency)}</Table.Td>
                      <Table.Td>{s.bonusTargetPct}%</Table.Td>
                      <Table.Td>
                        <Text c="dimmed">{s.note ?? '—'}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            <EmployeeFormModal opened={editOpened} onClose={edit.close} employee={e} />
            <SalaryFormModal opened={salaryOpened} onClose={salary.close} employee={e} />
          </>
        )}
      </QueryBoundary>
      )}
    </Stack>
  );
}
