import { Button, Divider, Group, Modal, NumberInput, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useCreateEmployee, useReference, useUpdateEmployee } from '../api/hooks';
import { ApiError } from '../api/client';
import type { CreateEmployeeInput, EmployeeDetail } from '../api/types';
import { humanize } from '../lib/format';

interface Props {
  opened: boolean;
  onClose: () => void;
  /** When provided, the modal edits this employee; otherwise it creates one. */
  employee?: EmployeeDetail;
  onSaved?: (e: EmployeeDetail) => void;
}

type FormValues = Omit<CreateEmployeeInput, 'salary' | 'managerId'> & {
  baseAmount: number;
  currency: string;
  bonusTargetPct: number;
  effectiveDate: string;
};

const today = new Date().toISOString().slice(0, 10);

export function EmployeeFormModal({ opened, onClose, employee, onSaved }: Props) {
  const isEdit = Boolean(employee);
  const reference = useReference();
  const create = useCreateEmployee();
  const update = useUpdateEmployee(employee?.id ?? 0);

  const form = useForm<FormValues>({
    initialValues: {
      employeeCode: '',
      firstName: '',
      lastName: '',
      email: '',
      country: 'US',
      department: 'Engineering',
      jobTitle: '',
      level: 'L3',
      employmentType: 'full_time',
      gender: 'undisclosed',
      hireDate: today,
      baseAmount: 100000,
      currency: 'USD',
      bonusTargetPct: 10,
      effectiveDate: today,
    },
    validate: {
      firstName: (v) => (v.trim() ? null : 'Required'),
      lastName: (v) => (v.trim() ? null : 'Required'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Valid email required'),
      employeeCode: (v) => (isEdit || v.trim() ? null : 'Required'),
      jobTitle: (v) => (v.trim() ? null : 'Required'),
      baseAmount: (v) => (isEdit || v > 0 ? null : 'Must be positive'),
    },
  });

  // Populate the form when opening in edit mode.
  useEffect(() => {
    if (employee && opened) {
      form.setValues({
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        country: employee.country,
        department: employee.department,
        jobTitle: employee.jobTitle,
        level: employee.level,
        employmentType: employee.employmentType,
        gender: employee.gender,
        hireDate: employee.hireDate,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id, opened]);

  if (!reference.data) return null;
  const ref = reference.data;

  // Reset transient form state (values + validation errors) when dismissing, so
  // reopening never shows stale input from a previous session.
  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      if (isEdit && employee) {
        const saved = await update.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          country: values.country,
          department: values.department,
          jobTitle: values.jobTitle,
          level: values.level,
          employmentType: values.employmentType,
          gender: values.gender,
          hireDate: values.hireDate,
        });
        notifications.show({ color: 'teal', message: 'Employee updated' });
        onSaved?.(saved);
      } else {
        const saved = await create.mutateAsync({
          employeeCode: values.employeeCode,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          country: values.country,
          department: values.department,
          jobTitle: values.jobTitle,
          level: values.level,
          employmentType: values.employmentType,
          gender: values.gender,
          managerId: null,
          hireDate: values.hireDate,
          salary: {
            baseAmount: values.baseAmount,
            currency: values.currency,
            bonusTargetPct: values.bonusTargetPct,
            effectiveDate: values.effectiveDate,
          },
        });
        notifications.show({ color: 'teal', message: `Created ${saved.firstName} ${saved.lastName}` });
        form.reset();
        onSaved?.(saved);
      }
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong';
      notifications.show({ color: 'red', title: 'Could not save', message });
    }
  });

  return (
    <Modal opened={opened} onClose={handleClose} title={isEdit ? 'Edit employee' : 'Add employee'} size="lg">
      <form onSubmit={handleSubmit}>
        <Stack>
          <SimpleGrid cols={2}>
            <TextInput label="First name" withAsterisk {...form.getInputProps('firstName')} />
            <TextInput label="Last name" withAsterisk {...form.getInputProps('lastName')} />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <TextInput label="Email" withAsterisk {...form.getInputProps('email')} />
            <TextInput
              label="Employee code"
              withAsterisk
              disabled={isEdit}
              {...form.getInputProps('employeeCode')}
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <Select
              label="Country"
              data={ref.countries.map((c) => ({ value: c.code, label: c.name }))}
              onChange={(v) => {
                if (!v) return;
                form.setFieldValue('country', v);
                const cur = ref.countries.find((c) => c.code === v)?.currency;
                if (cur && !isEdit) form.setFieldValue('currency', cur);
              }}
              value={form.values.country}
            />
            <Select
              label="Department"
              data={ref.departments}
              {...form.getInputProps('department')}
            />
          </SimpleGrid>
          <SimpleGrid cols={3}>
            <TextInput label="Job title" withAsterisk {...form.getInputProps('jobTitle')} />
            <Select label="Level" data={ref.levels} {...form.getInputProps('level')} />
            <TextInput label="Hire date" type="date" {...form.getInputProps('hireDate')} />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <Select
              label="Employment type"
              data={ref.employmentTypes.map((t) => ({ value: t, label: humanize(t) }))}
              {...form.getInputProps('employmentType')}
            />
            <Select
              label="Gender"
              data={ref.genders.map((g) => ({ value: g, label: humanize(g) }))}
              {...form.getInputProps('gender')}
            />
          </SimpleGrid>

          {!isEdit && (
            <>
              <Divider label="Opening compensation" labelPosition="left" />
              <SimpleGrid cols={2}>
                <NumberInput
                  label="Annual base"
                  withAsterisk
                  min={0}
                  thousandSeparator=","
                  {...form.getInputProps('baseAmount')}
                />
                <Select
                  label="Currency"
                  data={ref.exchangeRates.map((r) => r.currency)}
                  {...form.getInputProps('currency')}
                />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Target bonus %" min={0} max={200} {...form.getInputProps('bonusTargetPct')} />
                <TextInput label="Effective date" type="date" {...form.getInputProps('effectiveDate')} />
              </SimpleGrid>
            </>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {isEdit ? 'Save changes' : 'Create employee'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
