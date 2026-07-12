import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useAddSalary, useReference } from '../api/hooks';
import { ApiError } from '../api/client';
import type { EmployeeDetail } from '../api/types';

interface Props {
  opened: boolean;
  onClose: () => void;
  employee: EmployeeDetail;
}

const today = new Date().toISOString().slice(0, 10);

/** Records a compensation change (raise/promotion) into the employee's history. */
export function SalaryFormModal({ opened, onClose, employee }: Props) {
  const reference = useReference();
  const addSalary = useAddSalary(employee.id);
  const current = employee.currentSalary;

  const form = useForm({
    initialValues: {
      baseAmount: current?.baseAmount ?? 0,
      currency: current?.currency ?? 'USD',
      bonusTargetPct: current?.bonusTargetPct ?? 0,
      effectiveDate: today,
      note: 'Merit increase',
    },
    validate: { baseAmount: (v) => (v > 0 ? null : 'Must be positive') },
  });

  // Re-seed from the latest current salary whenever the modal opens, so a second
  // raise starts from the up-to-date figures rather than stale initial values.
  useEffect(() => {
    if (opened) {
      form.setValues({
        baseAmount: current?.baseAmount ?? 0,
        currency: current?.currency ?? 'USD',
        bonusTargetPct: current?.bonusTargetPct ?? 0,
        effectiveDate: today,
        note: 'Merit increase',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, current?.id, current?.baseAmount]);

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      await addSalary.mutateAsync(values);
      notifications.show({ color: 'teal', message: 'Compensation updated' });
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong';
      notifications.show({ color: 'red', title: 'Could not save', message });
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Record compensation change">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Group grow>
            <NumberInput label="New annual base" withAsterisk min={0} thousandSeparator="," {...form.getInputProps('baseAmount')} />
            <Select label="Currency" data={reference.data?.exchangeRates.map((r) => r.currency) ?? []} {...form.getInputProps('currency')} />
          </Group>
          <Group grow>
            <NumberInput label="Target bonus %" min={0} max={200} {...form.getInputProps('bonusTargetPct')} />
            <TextInput label="Effective date" type="date" {...form.getInputProps('effectiveDate')} />
          </Group>
          <TextInput label="Note" {...form.getInputProps('note')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={addSalary.isPending}>
              Save change
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
