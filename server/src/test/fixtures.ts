import { openDatabase, type DB } from '../db/connection.js';
import { EXCHANGE_RATES } from '../db/reference.js';
import { EmployeeService, type CreateEmployeeInput } from '../services/employee.service.js';

/** A fresh in-memory database with exchange rates loaded, isolated per test. */
export function makeTestDb(): DB {
  const db = openDatabase(':memory:');
  const insert = db.prepare(
    'INSERT INTO exchange_rates (currency, rate_to_usd, as_of) VALUES (?, ?, ?)',
  );
  for (const r of EXCHANGE_RATES) insert.run(r.currency, r.rateToUsd, r.asOf);
  return db;
}

/** Sensible defaults so tests only specify the fields they care about. */
export function employeeInput(
  overrides: Partial<CreateEmployeeInput> & { salary?: Partial<CreateEmployeeInput['salary']> } = {},
): CreateEmployeeInput {
  const { salary: salaryOverrides, ...rest } = overrides;
  return {
    employeeCode: overrides.employeeCode ?? `ACME-${Math.floor(Math.random() * 1e9)}`,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: overrides.email ?? `ada.${Math.floor(Math.random() * 1e9)}@acme.com`,
    country: 'US',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    level: 'L3',
    employmentType: 'full_time',
    gender: 'female',
    managerId: null,
    hireDate: '2022-01-01',
    ...rest,
    salary: {
      baseAmount: 100_000,
      currency: 'USD',
      bonusTargetPct: 10,
      effectiveDate: '2022-01-01',
      note: 'Initial offer',
      ...salaryOverrides,
    },
  };
}

/** Create an employee through the real service (exercises the transaction path). */
export function seedEmployee(db: DB, overrides: Parameters<typeof employeeInput>[0] = {}) {
  return new EmployeeService(db).create(employeeInput(overrides));
}
