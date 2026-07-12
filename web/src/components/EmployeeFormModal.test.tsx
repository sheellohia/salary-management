import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';

// vi.mock is hoisted, so shared state must be created via vi.hoisted.
const { referenceData, post } = vi.hoisted(() => ({
  referenceData: {
    countries: [
      { code: 'US', name: 'United States', currency: 'USD' },
      { code: 'DE', name: 'Germany', currency: 'EUR' },
    ],
    departments: ['Engineering', 'Sales'],
    levels: ['L1', 'L2', 'L3'],
    employmentTypes: ['full_time', 'part_time'],
    genders: ['female', 'male', 'undisclosed'],
    exchangeRates: [
      { currency: 'USD', rateToUsd: 1, asOf: '2026-07-01' },
      { currency: 'EUR', rateToUsd: 1.08, asOf: '2026-07-01' },
    ],
    baseCurrency: 'USD',
  },
  post: vi.fn(),
}));

vi.mock('../api/client', () => ({
  http: {
    get: vi.fn().mockResolvedValue(referenceData),
    post: (...args: unknown[]) => post(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  toQuery: () => '',
  ApiError: class ApiError extends Error {},
}));

import { EmployeeFormModal } from './EmployeeFormModal';

describe('EmployeeFormModal (create)', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ id: 1, firstName: 'Grace', lastName: 'Hopper' });
  });

  it('blocks submit and shows validation errors when required fields are empty', async () => {
    renderWithProviders(<EmployeeFormModal opened onClose={() => {}} />);
    await screen.findByLabelText(/first name/i);

    await userEvent.click(screen.getByRole('button', { name: /create employee/i }));

    const errors = await screen.findAllByText('Required');
    expect(errors.length).toBeGreaterThan(0);
    expect(post).not.toHaveBeenCalled();
  });

  it('submits a create request once required fields are filled', async () => {
    renderWithProviders(<EmployeeFormModal opened onClose={() => {}} />);
    await screen.findByLabelText(/first name/i);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Grace');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Hopper');
    await userEvent.type(screen.getByLabelText(/email/i), 'grace@acme.com');
    await userEvent.type(screen.getByLabelText(/employee code/i), 'ACME-9');
    await userEvent.type(screen.getByLabelText(/job title/i), 'Staff Engineer');

    await userEvent.click(screen.getByRole('button', { name: /create employee/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [path, body] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe('/employees');
    expect(body).toMatchObject({ firstName: 'Grace', lastName: 'Hopper', email: 'grace@acme.com' });
    expect(body.salary).toBeDefined();
  });
});
