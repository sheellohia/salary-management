import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Center,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconChevronUp, IconPlus, IconSearch, IconSelector } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useReference } from '../api/hooks';
import type { EmployeeListQuery } from '../api/types';
import { QueryBoundary } from '../components/QueryBoundary';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { formatUsd, fullName, humanize } from '../lib/format';

const PAGE_SIZE = 25;
type SortKey = NonNullable<EmployeeListQuery['sortBy']>;

function SortHeader({
  label,
  column,
  active,
  dir,
  onSort,
  numeric,
}: {
  label: string;
  column: SortKey;
  active: boolean;
  dir: 'asc' | 'desc';
  onSort: (c: SortKey) => void;
  numeric?: boolean;
}) {
  const Icon = active ? (dir === 'asc' ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th ta={numeric ? 'right' : undefined} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <UnstyledButton
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        <Text fw={600} size="sm">
          {label}
        </Text>
        <Icon size={14} />
      </UnstyledButton>
    </Table.Th>
  );
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const reference = useReference();
  const [opened, { open, close }] = useDisclosure(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [country, setCountry] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>('active');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const query: EmployeeListQuery = {
    page,
    pageSize: PAGE_SIZE,
    sortBy,
    sortDir,
    search: debouncedSearch || undefined,
    country: country || undefined,
    department: department || undefined,
    level: level || undefined,
    status: status || undefined,
  };
  const employees = useEmployees(query);

  const handleSort = (column: SortKey) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'totalCompUsd' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const ref = reference.data;
  const resetPage = () => setPage(1);

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Employees</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          Add employee
        </Button>
      </Group>

      <Card withBorder radius="md" mb="md">
        <Group align="flex-end" gap="sm" wrap="wrap">
          <TextInput
            label="Search"
            placeholder="Name, email or code"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
            w={240}
          />
          <Select
            label="Country"
            placeholder="All"
            clearable
            data={ref?.countries.map((c) => ({ value: c.code, label: c.name })) ?? []}
            value={country}
            onChange={(v) => {
              setCountry(v);
              resetPage();
            }}
            w={170}
          />
          <Select
            label="Department"
            placeholder="All"
            clearable
            data={ref?.departments ?? []}
            value={department}
            onChange={(v) => {
              setDepartment(v);
              resetPage();
            }}
            w={170}
          />
          <Select
            label="Level"
            placeholder="All"
            clearable
            data={ref?.levels ?? []}
            value={level}
            onChange={(v) => {
              setLevel(v);
              resetPage();
            }}
            w={120}
          />
          <Select
            label="Status"
            clearable
            data={[
              { value: 'active', label: 'Active' },
              { value: 'terminated', label: 'Terminated' },
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              resetPage();
            }}
            w={150}
          />
        </Group>
      </Card>

      <Card withBorder radius="md" p={0}>
        <QueryBoundary query={employees} height={400}>
          {(data) => (
            <>
              <Table.ScrollContainer minWidth={800}>
                <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <SortHeader label="Name" column="name" active={sortBy === 'name'} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Country" column="country" active={sortBy === 'country'} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Department" column="department" active={sortBy === 'department'} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Level" column="level" active={sortBy === 'level'} dir={sortDir} onSort={handleSort} />
                      <Table.Th>Title</Table.Th>
                      <SortHeader label="Total comp (USD)" column="totalCompUsd" active={sortBy === 'totalCompUsd'} dir={sortDir} onSort={handleSort} numeric />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.items.map((e) => (
                      <Table.Tr
                        key={e.id}
                        style={{ cursor: 'pointer' }}
                        role="link"
                        tabIndex={0}
                        aria-label={`Open ${fullName(e)}`}
                        onClick={() => navigate(`/employees/${e.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/employees/${e.id}`);
                          }
                        }}
                      >
                        <Table.Td>
                          <Text fw={500}>{fullName(e)}</Text>
                          <Text size="xs" c="dimmed">
                            {e.employeeCode}
                          </Text>
                        </Table.Td>
                        <Table.Td>{e.country}</Table.Td>
                        <Table.Td>{e.department}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="gray">
                            {e.level}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{e.jobTitle}</Table.Td>
                        <Table.Td ta="right" fw={600}>
                          {formatUsd(e.totalCompUsd)}
                          {e.status === 'terminated' && (
                            <Badge ml="xs" color="red" variant="light" size="xs">
                              {humanize(e.status)}
                            </Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {data.items.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Center py="xl">
                            <Text c="dimmed">No employees match these filters.</Text>
                          </Center>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              <Group justify="space-between" p="md">
                <Text size="sm" c="dimmed">
                  {data.total.toLocaleString()} employees
                </Text>
                <Pagination
                  total={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
                  value={page}
                  onChange={setPage}
                  siblings={1}
                />
              </Group>
            </>
          )}
        </QueryBoundary>
      </Card>

      <EmployeeFormModal opened={opened} onClose={close} />
    </>
  );
}
