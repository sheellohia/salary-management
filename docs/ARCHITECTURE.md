# Architecture

## Overview

A small monorepo with two independently-runnable apps and a shared design intent.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (HR Manager)                      │
│   React + Mantine SPA — Dashboard · Employees · Employee detail   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │  JSON over HTTP  (/api/*)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express API (TypeScript)                      │
│                                                                   │
│   http/  routes + Zod validation + error middleware               │
│     │                                                             │
│   services/  employee.service · analytics.service   (business)    │
│     │                                                             │
│   repositories/  employee · salary · analytics   (parameterized   │
│     │                                              SQL)           │
│   domain/  currency + statistics  (pure, unit-tested)             │
└───────────────────────────────┬───────────────────────────────────┘
                                 │  better-sqlite3 (synchronous)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│   SQLite:  employees · salaries (temporal) · exchange_rates       │
└─────────────────────────────────────────────────────────────────┘
```

## Layering (backend)

Requests flow **routes → services → repositories → SQLite**, with a **domain**
layer of pure functions underneath.

- **http/** — Express routers. Only concern: parse & validate input (Zod),
  call a service, shape the HTTP response. A single error middleware converts
  `ZodError` / `AppError` / unknown errors into a consistent JSON envelope.
- **services/** — business rules and orchestration. `EmployeeService` owns the
  transactional "create employee + opening salary" flow and maps DB uniqueness
  violations to `409`s. `AnalyticsService` turns raw comp rows into the org's
  answers (medians, breakdowns, distribution, pay equity).
- **repositories/** — the only place that touches SQL. All queries are
  parameterized. The employee list and analytics use a shared "current salary"
  CTE (newest `effective_date` wins, ties broken by id).
- **domain/** — pure currency + statistics helpers (`toUsd`, `median`,
  `percentile`, …). No I/O, so they are exhaustively unit-tested and reused by
  both the seed and the services.

Why this shape: the interesting, get-it-wrong-and-it-matters logic (money math,
medians, current-salary resolution) is isolated into small pure/DI'd units that
test in milliseconds, while SQL does the heavy lifting it's good at (joins,
filters, aggregation) close to the data.

## Data model

- **employees** — identity + org attributes (country, department, level, title,
  employment type, gender, manager, hire date, status). Soft-deleted via
  `status = 'terminated'`.
- **salaries** — *temporal*: one row per compensation record
  (`base_amount`, `currency`, `bonus_target_pct`, `effective_date`). An
  employee's **current** salary is the newest effective row; the full set is
  their history. This models raises honestly and is the foundation for a future
  audit trail.
- **exchange_rates** — `currency → rate_to_usd` with an `as_of` date. All
  cross-employee analytics normalize to USD so a US and an India salary are
  comparable.

Indexes target the two hot paths: filtered employee listing
(`country`/`department`/`level`/`status`) and current-salary lookup
(`salaries(employee_id, effective_date DESC)`).

## Multi-currency, normalized to USD

The comparison metric is **annual total target cash = base × (1 + bonus%)**,
converted to USD in SQL via the `exchange_rates` join. Storing local currency
but reporting in a single base currency is the core product decision that makes
"how does the org pay people" answerable across 10 countries.

## Frontend

- **React + Vite + TypeScript**, **Mantine** component library, **@mantine/charts**.
- **TanStack Query** owns server state (caching, background refetch, invalidation
  after mutations). A thin typed `fetch` client surfaces the API's structured
  errors as `ApiError`.
- Three screens: analytics **Dashboard**, **Employees** table (server-side
  search/filter/sort/paginate), and **Employee detail** (profile, USD-normalized
  comp, salary history, edit / record-raise / terminate).

## Testing strategy

- **Backend** (Vitest + Supertest): pure-function unit tests for currency/stats;
  service tests over a hand-computable fixture org; repository tests for
  current-salary resolution and list filtering/sorting/paging; full API
  integration tests. All run against **in-memory SQLite** → fast & deterministic.
- **Frontend** (Vitest + Testing Library): formatting/query-string units and a
  component render test.

## Deployment

Builds into a **single container**: the Express process serves the API *and* the
built SPA on one port, with SQLite on a mounted volume (seeded on first boot).
`docker compose up --build` or the included `render.yaml` bring it up end-to-end.

See [ADRs](./adr/) for the reasoning behind the notable choices and
[TRADEOFFS.md](./TRADEOFFS.md) for what was consciously deferred.
