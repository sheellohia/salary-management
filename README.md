# ACME Salary Management

Web-based salary management for a 10,000-employee, multi-country organization.
It replaces spreadsheets for the **HR Manager**: manage employee & salary
records, and answer *how the org pays people* — across countries, departments,
levels, and currencies (all normalized to USD).

> Built for a product-framing engineering assessment. The emphasis is sound
> judgment: clean layering, meaningful fast tests, honest scope. See
> [`docs/`](./docs) for the requirements, architecture, ADRs, trade-offs and
> AI-usage notes.

---

## Features

- **Analytics dashboard** — active headcount, total annual payroll (USD), median
  comp with P25/P75, and charts: total comp by department & country, median by
  level, comp distribution, and a pay-equity view.
- **Employee directory** — server-side search, filter (country / department /
  level / status), sortable columns, and pagination that stays fast at 10k rows.
- **Employee detail** — profile, current compensation (local + USD), full salary
  history, plus edit, **record a raise**, and terminate (soft delete).
- **Multi-currency** — salaries stored in local currency; every cross-employee
  metric is normalized to USD via a dated exchange-rate table.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node + TypeScript, Express, better-sqlite3 (SQLite), Zod, pino |
| Frontend | React + Vite + TypeScript, Mantine + @mantine/charts, TanStack Query |
| Tests | Vitest + Supertest (backend), Vitest + Testing Library (frontend) |
| Ops | Multi-stage Docker (single container), docker-compose, Render, GitHub Actions |

## Quick start

Requires **Node 20+**.

```bash
npm install            # install all workspaces
npm run seed           # generate 10,000 employees into server/data/salary.db
npm run dev            # API on :4000, web on :5173 (Vite proxies /api → :4000)
```

Open **http://localhost:5173**.

### Run with Docker (one command, production-like)

```bash
docker compose up --build      # seeds on first boot, serves everything on :4000
```

Open **http://localhost:4000**.

## Tests

```bash
npm test                        # backend suite (66 tests, deterministic, sub-second)
npm run test --workspace web    # frontend suite (23 tests)
npm run lint                    # eslint, server + web
npm run typecheck               # server + web
```

Backend tests run against **in-memory SQLite** with fixed fixtures — fast and
repeatable. Expected values (payroll totals, medians, percentiles) are
hand-computed so a green suite means *correct*, not just *self-consistent*.

## API

Base URL `/api`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/employees` | List — `page`, `pageSize`, `sortBy`, `sortDir`, `search`, `country`, `department`, `level`, `status` |
| POST | `/employees` | Create employee + opening salary |
| GET | `/employees/:id` | Detail incl. salary history |
| PATCH | `/employees/:id` | Update employee fields |
| DELETE | `/employees/:id` | Terminate (soft delete) |
| POST | `/employees/:id/salaries` | Record a compensation change (raise) |
| GET | `/analytics/overview` | Headcount, total payroll, median, percentiles (USD) |
| GET | `/analytics/by-country` \| `by-department` \| `by-level` | Grouped headcount/total/avg/median |
| GET | `/analytics/distribution` | Comp histogram |
| GET | `/analytics/pay-equity` | Median comp by gender + gap — optional `department`, `level` slice |
| GET | `/reference` | Countries, departments, levels, enums, FX rates |

Example:

```bash
curl "http://localhost:4000/api/employees?country=IN&sortBy=totalCompUsd&sortDir=desc&pageSize=5"
curl "http://localhost:4000/api/analytics/overview"
```

## Project structure

```
├── server/                 # Express + SQLite API (TypeScript)
│   └── src/
│       ├── domain/         # pure currency + statistics helpers (unit-tested)
│       ├── db/             # schema, connection, reference data, seed
│       ├── repositories/   # parameterized SQL (employee, salary, analytics)
│       ├── services/       # business logic (employee, analytics)
│       └── http/           # routes, Zod validation, error middleware
├── web/                    # React + Mantine SPA (TypeScript)
│   └── src/{api,components,pages,lib}
├── docs/                   # requirements, architecture, ADRs, trade-offs, AI usage
├── Dockerfile · docker-compose.yml · render.yaml
└── .github/workflows/ci.yml
```

## Deployment

Ships as a **single container** (API serves the built SPA; SQLite on a volume,
seeded on first boot). The image has been built and run end-to-end: it boots,
seeds 10,000 employees, serves the API and the SPA, and passes `/api/health`.

- **Docker**: `docker compose up --build` → http://localhost:4000
- **Render**: the included [`render.yaml`](./render.yaml) provisions a Docker web
  service with a persistent disk and `/api/health` health check.

> **Live URL:** `<add your deployed URL here>` — deploy with either command above
> (Render is one click from this repo). No live instance is committed to the repo
> by default so there are no credentials or hosting costs baked in.

## Documentation

- [Requirements](./docs/REQUIREMENTS.md) — goal, scope, explicit non-goals
- [Architecture](./docs/ARCHITECTURE.md) — layering, data model, diagram
- [ADRs](./docs/adr) — the notable decisions and their reasoning
- [Trade-offs & performance](./docs/TRADEOFFS.md)
- [AI usage](./docs/AI_USAGE.md)

## Demo

[`docs/DEMO.md`](./docs/DEMO.md) has a ready-to-record walkthrough script and a
30-second local run. The flow: dashboard → filter employees → open an employee →
record a raise → watch the analytics update. Add a recorded video link at the top
of `docs/DEMO.md` when you record it.

## License

[MIT](./LICENSE)
