// Mirror of the server's response shapes. Kept small and hand-written (rather
// than shared via a package) to keep the two apps independently deployable.

export interface SalaryRecord {
  id: number;
  employeeId: number;
  baseAmount: number;
  currency: string;
  bonusTargetPct: number;
  effectiveDate: string;
  note: string | null;
}

export interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  employmentType: 'full_time' | 'part_time' | 'contractor';
  gender: 'female' | 'male' | 'non_binary' | 'undisclosed';
  managerId: number | null;
  hireDate: string;
  status: 'active' | 'terminated';
  createdAt: string;
  updatedAt: string;
  currentSalary: SalaryRecord | null;
  baseAmountUsd: number | null;
  totalCompUsd: number | null;
}

export interface EmployeeDetail extends Employee {
  salaryHistory: SalaryRecord[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Overview {
  headcount: number;
  currencyCount: number;
  countryCount: number;
  totalPayrollUsd: number;
  avgCompUsd: number;
  medianCompUsd: number;
  p25CompUsd: number;
  p75CompUsd: number;
  p90CompUsd: number;
}

export interface GroupStat {
  key: string;
  headcount: number;
  totalCompUsd: number;
  avgCompUsd: number;
  medianCompUsd: number;
}

export interface DistributionBucket {
  from: number;
  to: number | null;
  count: number;
}

export interface PayEquityRow {
  gender: string;
  headcount: number;
  medianCompUsd: number;
  gapPct: number;
}

export interface ReferenceData {
  countries: { code: string; name: string; currency: string }[];
  departments: string[];
  levels: string[];
  employmentTypes: string[];
  genders: string[];
  exchangeRates: { currency: string; rateToUsd: number; asOf: string }[];
  baseCurrency: string;
}

export interface EmployeeListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'country' | 'department' | 'level' | 'hireDate' | 'totalCompUsd';
  sortDir?: 'asc' | 'desc';
  search?: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
}

export interface SalaryInput {
  baseAmount: number;
  currency: string;
  bonusTargetPct: number;
  effectiveDate: string;
  note?: string | null;
}

export interface CreateEmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  employmentType: Employee['employmentType'];
  gender: Employee['gender'];
  managerId: number | null;
  hireDate: string;
  salary: SalaryInput;
}
