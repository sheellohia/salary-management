# Requirements — ACME Salary Management

**Author:** Sheel Lohia · **Date:** 2026-07-12 · **Status:** v1 (assessment scope)

## 1. Goal

Give the **HR Manager** of ACME (10,000 employees, multiple countries) a web application
that replaces the current spreadsheet-based process, so they can (a) **manage** employee
and salary records reliably and (b) **answer questions about how the org pays people** —
across countries, departments, levels, and currencies.

## 2. Users & the questions they need answered

Primary (and only) persona for v1: **HR Manager**.

Representative questions the product must answer:

- What is our **total payroll cost**, normalized to a single currency (USD)?
- **How does pay vary** by country, department, and level (avg / median / spread)?
- Where does **headcount** sit across countries and departments?
- What does the **salary distribution** look like (are there outliers / band overlaps)?
- Is there a **pay gap** across gender within comparable roles/levels?
- What is a specific employee's **compensation and its history** (raises over time)?

## 3. Scope & Features (v1)

**Employee & salary management**
- List employees: server-side **search, filter** (country / department / level / status),
  **sort**, and **pagination** (must stay fast at 10k rows).
- View an employee: profile + **salary history** (compensation is temporal).
- Create / edit an employee; record a **compensation change** (raise), which appends to history.
- Terminate (soft-delete) an employee.

**Analytics — "how we pay"**
- Org overview KPIs: headcount, total annualized payroll (USD), average & **median** comp.
- Breakdowns by **country**, **department**, and **level** (headcount, total, avg, median).
- Salary **distribution** histogram.
- **Pay-equity** view: median comp by gender, sliceable by department/level.

**Cross-cutting**
- **Multi-currency**: salaries stored in local currency; all cross-employee analytics are
  normalized to **USD** via an exchange-rate table (annualized base compensation is the
  comparison metric).
- Input **validation**, consistent error handling, structured logging.
- **Seed** of 10,000 realistic employees for demo and load characteristics.

## 4. Explicitly out of scope (and why)

| Left out | Why |
|---|---|
| **AuthN / RBAC / multi-tenant** | One trusted persona in v1. Auth is well-understood plumbing that would add surface area without demonstrating new judgment. Designed so it can be added at the API middleware layer later. |
| **Live FX feed** | Rates are seeded into a table with an `as_of` date. Swapping in a live provider is a repository change; determinism matters more for a demo/tests. |
| **Payroll runs / payslips / tax / benefits** | This is a *salary management & insight* tool, not a payroll engine. Tax and statutory deductions are country-specific and enormous in scope. |
| **Approval workflows & audit trail** | Real HR needs maker/checker + immutable audit. Noted as the top v2 item; the temporal salary model is the foundation for it. |
| **Bulk import/export (Excel)** | The stated pain is *leaving* Excel; import is a valuable migration aid but not core to proving the product. Straightforward to add on top of the create API. |
| **Real-time collaboration / notifications** | Not needed for a single HR manager. |

## 5. Non-functional requirements

- **Performance**: employee list p95 < 150ms at 10k rows; all analytics served by indexed
  SQL aggregations (no in-app row scans).
- **Correctness**: median, currency normalization, and "current salary" resolution are unit-tested.
- **Determinism**: tests run against in-memory SQLite; seed is reproducible (fixed faker seed).
- **Maintainability**: layered backend (routes → service → repository), typed end-to-end.

## 6. Success criteria

- HR manager can find any employee and see their comp in < 3 clicks.
- Every question in §2 is answerable from the UI.
- `npm test` is green, fast, and deterministic; seed produces exactly 10,000 employees.
- App runs locally with two commands and ships with a container image + deploy config.
