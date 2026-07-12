import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DB } from '../db/connection.js';
import { EmployeeRepository } from './employee.repository.js';
import { EmployeeService } from '../services/employee.service.js';
import { makeTestDb, employeeInput } from '../test/fixtures.js';

let db: DB;
let repo: EmployeeRepository;
let service: EmployeeService;

beforeEach(() => {
  db = makeTestDb();
  repo = new EmployeeRepository(db);
  service = new EmployeeService(db);
});

afterEach(() => db.close());

describe('current salary resolution', () => {
  it('treats the newest effective_date as the current salary', () => {
    const created = service.create(
      employeeInput({ salary: { baseAmount: 100_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2022-01-01' } }),
    );
    service.addSalary(created.id, { baseAmount: 120_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2023-01-01' });
    service.addSalary(created.id, { baseAmount: 150_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2024-01-01' });

    const employee = repo.findById(created.id)!;
    expect(employee.currentSalary?.baseAmount).toBe(150_000);
    expect(employee.baseAmountUsd).toBe(150_000);
    expect(employee.totalCompUsd).toBe(150_000);
  });

  it('breaks effective_date ties by the most recently inserted record', () => {
    const created = service.create(
      employeeInput({ salary: { baseAmount: 100_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2024-01-01' } }),
    );
    service.addSalary(created.id, { baseAmount: 130_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2024-01-01' });
    expect(repo.findById(created.id)!.currentSalary?.baseAmount).toBe(130_000);
  });
});

describe('list: filtering, search, sorting and pagination', () => {
  beforeEach(() => {
    service.create(employeeInput({ firstName: 'Alice', lastName: 'Anders', email: 'alice@acme.com', employeeCode: 'A1', country: 'US', department: 'Engineering', salary: { baseAmount: 100_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2022-01-01' } }));
    service.create(employeeInput({ firstName: 'Bob', lastName: 'Brown', email: 'bob@acme.com', employeeCode: 'B1', country: 'DE', department: 'Sales', salary: { baseAmount: 100_000, currency: 'EUR', bonusTargetPct: 0, effectiveDate: '2022-01-01' } }));
    service.create(employeeInput({ firstName: 'Carol', lastName: 'Clark', email: 'carol@acme.com', employeeCode: 'C1', country: 'US', department: 'Sales', salary: { baseAmount: 300_000, currency: 'USD', bonusTargetPct: 0, effectiveDate: '2022-01-01' } }));
  });

  const base = { page: 1, pageSize: 25, sortBy: 'name', sortDir: 'asc' } as const;

  it('filters by country', () => {
    const result = repo.list({ ...base, country: 'US' });
    expect(result.total).toBe(2);
    expect(result.items.every((e) => e.country === 'US')).toBe(true);
  });

  it('filters by department', () => {
    expect(repo.list({ ...base, department: 'Sales' }).total).toBe(2);
  });

  it('searches across name, email and code', () => {
    expect(repo.list({ ...base, search: 'carol' }).total).toBe(1);
    expect(repo.list({ ...base, search: 'B1' }).total).toBe(1);
  });

  it('sorts by USD total comp descending', () => {
    const result = repo.list({ ...base, sortBy: 'totalCompUsd', sortDir: 'desc' });
    expect(result.items[0]!.totalCompUsd).toBe(300_000); // Carol, USD
    expect(result.items[1]!.totalCompUsd).toBe(108_000); // Bob, 100k EUR -> USD
  });

  it('paginates and reports the unfiltered total', () => {
    const page1 = repo.list({ ...base, pageSize: 2, page: 1 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(3);
    const page2 = repo.list({ ...base, pageSize: 2, page: 2 });
    expect(page2.items).toHaveLength(1);
  });
});
