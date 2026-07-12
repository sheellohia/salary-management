/** Domain types shared across repositories, services and the HTTP layer. */

export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_STATUSES = ['active', 'terminated'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const GENDERS = ['female', 'male', 'non_binary', 'undisclosed'] as const;
export type Gender = (typeof GENDERS)[number];

/** A compensation record. Salary is temporal: an employee has a history of these. */
export interface SalaryRecord {
  id: number;
  employeeId: number;
  /** Annual gross base compensation, in the employee's local `currency`. */
  baseAmount: number;
  currency: string;
  /** Percent of base paid as target bonus (0–100). */
  bonusTargetPct: number;
  effectiveDate: string; // ISO date (YYYY-MM-DD)
  note: string | null;
}

export interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string; // ISO 3166-1 alpha-2
  department: string;
  jobTitle: string;
  level: string;
  employmentType: EmploymentType;
  gender: Gender;
  managerId: number | null;
  hireDate: string; // ISO date
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

/** An employee joined with their current salary, normalized to the base currency. */
export interface EmployeeWithComp extends Employee {
  currentSalary: SalaryRecord | null;
  /** Annual base compensation converted to the org base currency (USD). */
  baseAmountUsd: number | null;
  /** Total target cash (base + target bonus) in USD — the payroll metric. */
  totalCompUsd: number | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
