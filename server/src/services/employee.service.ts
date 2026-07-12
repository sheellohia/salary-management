import type { DB } from '../db/connection.js';
import {
  EmployeeRepository,
  type EmployeeListParams,
  type EmployeeUpdate,
  type NewEmployee,
} from '../repositories/employee.repository.js';
import { SalaryRepository, type NewSalary } from '../repositories/salary.repository.js';
import type { EmployeeWithComp, SalaryRecord } from '../domain/types.js';
import { Conflict, NotFound } from '../http/errors.js';

export interface CreateEmployeeInput extends Omit<NewEmployee, 'status'> {
  /** Initial compensation, recorded as the first entry in salary history. */
  salary: Omit<NewSalary, 'employeeId'>;
}

export interface EmployeeDetail extends EmployeeWithComp {
  salaryHistory: SalaryRecord[];
}

/** Maps SQLite UNIQUE violations to a friendly 409 rather than a 500. */
function rethrowUnique(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('UNIQUE') && message.includes('email')) {
    throw Conflict('An employee with this email already exists');
  }
  if (message.includes('UNIQUE') && message.includes('employee_code')) {
    throw Conflict('An employee with this employee code already exists');
  }
  throw err;
}

export class EmployeeService {
  private readonly employees: EmployeeRepository;
  private readonly salaries: SalaryRepository;

  constructor(private readonly db: DB) {
    this.employees = new EmployeeRepository(db);
    this.salaries = new SalaryRepository(db);
  }

  list(params: EmployeeListParams) {
    return this.employees.list(params);
  }

  get(id: number): EmployeeDetail {
    const employee = this.employees.findById(id);
    if (!employee) throw NotFound(`Employee ${id} not found`);
    return { ...employee, salaryHistory: this.salaries.historyFor(id) };
  }

  /** Create an employee and their opening salary atomically. */
  create(input: CreateEmployeeInput): EmployeeDetail {
    const { salary, ...employee } = input;
    const txn = this.db.transaction(() => {
      const id = this.employees.create(employee);
      this.salaries.add({ ...salary, employeeId: id });
      return id;
    });
    let id: number;
    try {
      id = txn();
    } catch (err) {
      rethrowUnique(err);
    }
    return this.get(id);
  }

  update(id: number, patch: EmployeeUpdate): EmployeeDetail {
    const existing = this.employees.findById(id);
    if (!existing) throw NotFound(`Employee ${id} not found`);
    try {
      this.employees.update(id, patch);
    } catch (err) {
      rethrowUnique(err);
    }
    return this.get(id);
  }

  /** Record a compensation change (e.g. a raise), appended to salary history. */
  addSalary(id: number, salary: Omit<NewSalary, 'employeeId'>): EmployeeDetail {
    const existing = this.employees.findById(id);
    if (!existing) throw NotFound(`Employee ${id} not found`);
    this.salaries.add({ ...salary, employeeId: id });
    return this.get(id);
  }

  terminate(id: number): EmployeeDetail {
    const ok = this.employees.terminate(id);
    if (!ok) throw NotFound(`Employee ${id} not found`);
    return this.get(id);
  }
}
