/**
 * Shared SQL fragments used across repositories.
 *
 * The "current salary" is an employee's newest compensation record (ties broken
 * by insertion order / id). Both the employee list/detail queries and the
 * analytics query rank salaries the same way, so the CTE lives here as a single
 * source of truth rather than being duplicated per repository.
 */
export const CURRENT_SALARY_CTE = `
  WITH ranked AS (
    SELECT s.*, ROW_NUMBER() OVER (
      PARTITION BY employee_id ORDER BY effective_date DESC, id DESC
    ) AS rn
    FROM salaries s
  ),
  current_sal AS (SELECT * FROM ranked WHERE rn = 1)
`;
