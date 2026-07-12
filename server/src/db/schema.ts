/**
 * SQLite schema. Kept as a single idempotent DDL string so it can be applied on
 * startup and in tests without a migration runner (scope-appropriate — see ADR).
 * Indexes are chosen to keep the employee list and analytics fast at 10k rows.
 */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exchange_rates (
  currency     TEXT PRIMARY KEY,
  rate_to_usd  REAL NOT NULL CHECK (rate_to_usd > 0),
  as_of        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code   TEXT NOT NULL UNIQUE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  country         TEXT NOT NULL,
  department      TEXT NOT NULL,
  job_title       TEXT NOT NULL,
  level           TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  gender          TEXT NOT NULL,
  manager_id      INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  hire_date       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_country     ON employees(country);
CREATE INDEX IF NOT EXISTS idx_employees_department  ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_level       ON employees(level);
CREATE INDEX IF NOT EXISTS idx_employees_status      ON employees(status);

CREATE TABLE IF NOT EXISTS salaries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_amount      REAL NOT NULL CHECK (base_amount >= 0),
  currency         TEXT NOT NULL,
  bonus_target_pct REAL NOT NULL DEFAULT 0 CHECK (bonus_target_pct >= 0),
  effective_date   TEXT NOT NULL,
  note             TEXT
);

-- The "current" salary is the row with the greatest effective_date per employee;
-- this composite index makes that lookup and history ordering cheap.
CREATE INDEX IF NOT EXISTS idx_salaries_emp_effective
  ON salaries(employee_id, effective_date DESC);
`;
