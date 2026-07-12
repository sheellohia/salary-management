# ADR 0002 — Temporal salary model (history, not a single column)

**Status:** Accepted

## Context

The naive model is a `salary` column on `employees`. But salary changes over
time (raises, promotions, market adjustments), and HR frequently needs to see
*how* someone's pay evolved — and, eventually, an auditable record of who
changed what.

## Decision

Model compensation as its own table, **one row per compensation record**
(`salaries`: `employee_id`, `base_amount`, `currency`, `bonus_target_pct`,
`effective_date`, `note`). The **current** salary is the row with the newest
`effective_date` (ties broken by insertion order / id).

## Rationale

- Matches reality: comp is a timeline, not a scalar.
- Enables the employee-detail **salary history** view and "record a raise" with
  no schema change.
- Lays the groundwork for a proper **audit trail / approval workflow** (the top
  deferred item) without a future migration of the core shape.

## Consequences

- "Current salary" requires a small window/CTE (`ROW_NUMBER() … PARTITION BY
  employee_id`). Encapsulated once and reused; covered by tests including the
  tie-break case.
- Slightly more rows (~1.8 per employee in the seed). Negligible at this scale
  and indexed for cheap lookup.
