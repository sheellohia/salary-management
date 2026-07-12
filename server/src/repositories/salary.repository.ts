import type { DB } from '../db/connection.js';
import type { SalaryRecord } from '../domain/types.js';

interface SalaryRow {
  id: number;
  employee_id: number;
  base_amount: number;
  currency: string;
  bonus_target_pct: number;
  effective_date: string;
  note: string | null;
}

function mapRow(row: SalaryRow): SalaryRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    baseAmount: row.base_amount,
    currency: row.currency,
    bonusTargetPct: row.bonus_target_pct,
    effectiveDate: row.effective_date,
    note: row.note,
  };
}

export interface NewSalary {
  employeeId: number;
  baseAmount: number;
  currency: string;
  bonusTargetPct: number;
  effectiveDate: string;
  note?: string | null;
}

export class SalaryRepository {
  constructor(private readonly db: DB) {}

  /** Full compensation history for an employee, newest first. */
  historyFor(employeeId: number): SalaryRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM salaries WHERE employee_id = ?
         ORDER BY effective_date DESC, id DESC`,
      )
      .all(employeeId) as SalaryRow[];
    return rows.map(mapRow);
  }

  add(input: NewSalary): number {
    const info = this.db
      .prepare(
        `INSERT INTO salaries
          (employee_id, base_amount, currency, bonus_target_pct, effective_date, note)
         VALUES (@employeeId, @baseAmount, @currency, @bonusTargetPct, @effectiveDate, @note)`,
      )
      .run({ note: null, ...input });
    return Number(info.lastInsertRowid);
  }
}
