import { describe, expect, it } from 'vitest';
import {
  addSalarySchema,
  createEmployeeSchema,
  listQuerySchema,
  updateEmployeeSchema,
} from './validation.js';

const validCreate = {
  employeeCode: 'ACME-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@acme.com',
  country: 'US',
  department: 'Engineering',
  jobTitle: 'Engineer',
  level: 'L3',
  employmentType: 'full_time',
  gender: 'female',
  hireDate: '2022-01-01',
  salary: { baseAmount: 100_000, currency: 'USD', bonusTargetPct: 10, effectiveDate: '2022-01-01' },
};

describe('listQuerySchema', () => {
  it('applies defaults for an empty query', () => {
    const q = listQuerySchema.parse({});
    expect(q).toMatchObject({ page: 1, pageSize: 25, sortBy: 'name', sortDir: 'asc' });
  });
  it('coerces numeric strings and rejects out-of-range pageSize', () => {
    expect(listQuerySchema.parse({ page: '3', pageSize: '50' }).page).toBe(3);
    expect(listQuerySchema.safeParse({ pageSize: '9999' }).success).toBe(false);
  });
  it('rejects an unknown sort column', () => {
    expect(listQuerySchema.safeParse({ sortBy: 'ssn' }).success).toBe(false);
  });
});

describe('createEmployeeSchema', () => {
  it('accepts a valid payload and defaults managerId to null', () => {
    const parsed = createEmployeeSchema.parse(validCreate);
    expect(parsed.managerId).toBeNull();
  });
  it('rejects an invalid email and unknown level', () => {
    expect(createEmployeeSchema.safeParse({ ...validCreate, email: 'nope' }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validCreate, level: 'L99' }).success).toBe(false);
  });
  it('rejects negative and over-max base amounts', () => {
    expect(createEmployeeSchema.safeParse({ ...validCreate, salary: { ...validCreate.salary, baseAmount: -1 } }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validCreate, salary: { ...validCreate.salary, baseAmount: 2_000_000_000 } }).success).toBe(false);
  });
  it('rejects a bonus percentage above the cap', () => {
    expect(createEmployeeSchema.safeParse({ ...validCreate, salary: { ...validCreate.salary, bonusTargetPct: 201 } }).success).toBe(false);
  });
  it('rejects non-calendar and malformed dates', () => {
    expect(createEmployeeSchema.safeParse({ ...validCreate, hireDate: '2020-13-40' }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ ...validCreate, hireDate: 'not-a-date' }).success).toBe(false);
  });
});

describe('addSalarySchema', () => {
  it('defaults bonusTargetPct to 0 when omitted', () => {
    const parsed = addSalarySchema.parse({ baseAmount: 120_000, currency: 'USD', effectiveDate: '2023-01-01' });
    expect(parsed.bonusTargetPct).toBe(0);
  });
  it('rejects an unknown currency', () => {
    expect(addSalarySchema.safeParse({ baseAmount: 1, currency: 'XYZ', effectiveDate: '2023-01-01' }).success).toBe(false);
  });
});

describe('updateEmployeeSchema', () => {
  it('rejects an empty patch', () => {
    const result = updateEmployeeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
  it('accepts a single-field patch', () => {
    expect(updateEmployeeSchema.safeParse({ jobTitle: 'Staff Engineer' }).success).toBe(true);
  });
});
