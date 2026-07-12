import { AppShell, Group, NavLink, Text, ThemeIcon, Title } from '@mantine/core';
import { IconChartBar, IconUsers, IconCoin } from '@tabler/icons-react';
import { NavLink as RouterNavLink, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconChartBar, end: true },
  { to: '/employees', label: 'Employees', icon: IconUsers, end: false },
];

export function App() {
  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 240, breakpoint: 'sm' }} padding="lg">
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm">
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconCoin size={20} />
          </ThemeIcon>
          <Title order={4}>ACME Salary Management</Title>
          <Text c="dimmed" size="sm" ml="xs">
            HR console
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            component={RouterNavLink}
            to={item.to}
            end={item.end}
            label={item.label}
            leftSection={<item.icon size={18} />}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
