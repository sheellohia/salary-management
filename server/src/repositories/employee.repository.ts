import type { DB } from '../db/connection.js';
import type {
  Employee,
  EmployeeWithComp,
  EmploymentType,
  Gender,
  Paginated,
  SalaryRecord,
} from '../domain/types.js';

export interface EmployeeFilters {
  search?: string;
  country?: string;
  department?: string;
  level?: string;
  status?: string;
}

export interface EmployeeListParams extends EmployeeFilters {
  page: number;
  pageSize: number;
  sortBy: SortableColumn;
  sortDir: 'asc' | 'desc';
}

export type SortableColumn =
  | 'name'
  | 'country'
  | 'department'
  | 'level'
  | 'hireDate'
  | 'totalCompUsd';

// Whitelist of sort columns → SQL expressions (prevents SQL injection via sort).
const SORT_EXPR: Record<SortableColumn, string> = {
  name: 'e.last_name',
  country: 'e.country',
  department: 'e.department',
  level: 'e.level',
  hireDate: 'e.hire_date',
  totalCompUsd: 'total_comp_usd',
};

/**
 * The current salary per employee is the row with the newest effective_date
 * (ties broken by id). Reused by list and detail queries.
 */
const CURRENT_SALARY_CTE = `
  WITH ranked AS (
    SELECT s.*, ROW_NUMBER() OVER (
      PARTITION BY employee_id ORDER BY effective_date DESC, id DESC
    ) AS rn
    FROM salaries s
  ),
  current_sal AS (SELECT * FROM ranked WHERE rn = 1)
`;

// Selects an employee joined with current salary and USD-normalized comp.
const EMPLOYEE_SELECT = `
  SELECT
    e.*,
    cs.id               AS sal_id,
    cs.base_amount      AS sal_base_amount,
    cs.currency         AS sal_currency,
    cs.bonus_target_pct AS sal_bonus_target_pct,
    cs.effective_date   AS sal_effective_date,
    cs.note             AS sal_note,
    CASE WHEN cs.id IS NULL THEN NULL
         ELSE ROUND(cs.base_amount * r.rate_to_usd, 2) END AS base_amount_usd,
    CASE WHEN cs.id IS NULL THEN NULL
         ELSE ROUND(cs.base_amount * (1 + cs.bonus_target_pct / 100.0) * r.rate_to_usd, 2)
    END AS total_comp_usd
  FROM employees e
  LEFT JOIN current_sal cs ON cs.employee_id = e.id
  LEFT JOIN exchange_rates r ON r.currency = cs.currency
`;

interface EmployeeRow {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  country: string;
  department: string;
  job_title: string;
  level: string;
  employment_type: EmploymentType;
  gender: Gender;
  manager_id: number | null;
  hire_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  sal_id: number | null;
  sal_base_amount: number | null;
  sal_currency: string | null;
  sal_bonus_target_pct: number | null;
  sal_effective_date: string | null;
  sal_note: string | null;
  base_amount_usd: number | null;
  total_comp_usd: number | null;
}

function mapRow(row: EmployeeRow): EmployeeWithComp {
  const currentSalary: SalaryRecord | null =
    row.sal_id === null
      ? null
      : {
          id: row.sal_id,
          employeeId: row.id,
          baseAmount: row.sal_base_amount!,
          currency: row.sal_currency!,
          bonusTargetPct: row.sal_bonus_target_pct!,
          effectiveDate: row.sal_effective_date!,
          note: row.sal_note,
        };
  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    country: row.country,
    department: row.department,
    jobTitle: row.job_title,
    level: row.level,
    employmentType: row.employment_type,
    gender: row.gender,
    managerId: row.manager_id,
    hireDate: row.hire_date,
    status: row.status as Employee['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentSalary,
    baseAmountUsd: row.base_amount_usd,
    totalCompUsd: row.total_comp_usd,
  };
}

export interface NewEmployee {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  employmentType: EmploymentType;
  gender: Gender;
  managerId: number | null;
  hireDate: string;
  status?: Employee['status'];
}

export type EmployeeUpdate = Partial<Omit<NewEmployee, 'employeeCode'>>;

export class EmployeeRepository {
  constructor(private readonly db: DB) {}

  /** Build the WHERE clause + bound params shared by list() and count(). */
  private buildWhere(filters: EmployeeFilters): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.search) {
      clauses.push(
        '(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)',
      );
      const like = `%${filters.search}%`;
      params.push(like, like, like, like);
    }
    if (filters.country) {
      clauses.push('e.country = ?');
      params.push(filters.country);
    }
    if (filters.department) {
      clauses.push('e.department = ?');
      params.push(filters.department);
    }
    if (filters.level) {
      clauses.push('e.level = ?');
      params.push(filters.level);
    }
    if (filters.status) {
      clauses.push('e.status = ?');
      params.push(filters.status);
    }
    const sql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return { sql, params };
  }

  list(params: EmployeeListParams): Paginated<EmployeeWithComp> {
    const { sql: where, params: whereParams } = this.buildWhere(params);
    const sortExpr = SORT_EXPR[params.sortBy];
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const offset = (params.page - 1) * params.pageSize;

    const rows = this.db
      .prepare(
        `${CURRENT_SALARY_CTE}
         ${EMPLOYEE_SELECT}
         ${where}
         ORDER BY ${sortExpr} ${sortDir} NULLS LAST, e.id ASC
         LIMIT ? OFFSET ?`,
      )
      .all(...whereParams, params.pageSize, offset) as EmployeeRow[];

    const countRow = this.db
      .prepare(`SELECT COUNT(*) AS n FROM employees e ${where}`)
      .get(...whereParams) as { n: number };

    return {
      items: rows.map(mapRow),
      total: countRow.n,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  findById(id: number): EmployeeWithComp | null {
    const row = this.db
      .prepare(`${CURRENT_SALARY_CTE} ${EMPLOYEE_SELECT} WHERE e.id = ?`)
      .get(id) as EmployeeRow | undefined;
    return row ? mapRow(row) : null;
  }

  findByEmail(email: string): EmployeeWithComp | null {
    const row = this.db
      .prepare(`${CURRENT_SALARY_CTE} ${EMPLOYEE_SELECT} WHERE e.email = ?`)
      .get(email) as EmployeeRow | undefined;
    return row ? mapRow(row) : null;
  }

  create(input: NewEmployee): number {
    const info = this.db
      .prepare(
        `INSERT INTO employees
          (employee_code, first_name, last_name, email, country, department,
           job_title, level, employment_type, gender, manager_id, hire_date, status)
         VALUES (@employeeCode, @firstName, @lastName, @email, @country, @department,
           @jobTitle, @level, @employmentType, @gender, @managerId, @hireDate, @status)`,
      )
      .run({ status: 'active', ...input });
    return Number(info.lastInsertRowid);
  }

  update(id: number, patch: EmployeeUpdate): boolean {
    const columns: Record<keyof EmployeeUpdate, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      country: 'country',
      department: 'department',
      jobTitle: 'job_title',
      level: 'level',
      employmentType: 'employment_type',
      gender: 'gender',
      managerId: 'manager_id',
      hireDate: 'hire_date',
      status: 'status',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(columns) as [keyof EmployeeUpdate, string][]) {
      if (patch[key] !== undefined) {
        sets.push(`${column} = ?`);
        values.push(patch[key]);
      }
    }
    if (sets.length === 0) return this.findById(id) !== null;
    sets.push(`updated_at = datetime('now')`);
    const info = this.db
      .prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?`)
      .run(...values, id);
    return info.changes > 0;
  }

  /** Soft delete: employees are terminated, never physically removed. */
  terminate(id: number): boolean {
    const info = this.db
      .prepare(`UPDATE employees SET status = 'terminated', updated_at = datetime('now') WHERE id = ?`)
      .run(id);
    return info.changes > 0;
  }
}
