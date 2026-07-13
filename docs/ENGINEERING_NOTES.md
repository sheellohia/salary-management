# Engineering Notes — tools, trade-offs & scaling

This is the "why" companion to the [Architecture](./ARCHITECTURE.md), the
[ADRs](./adr), and [Trade-offs & Performance](./TRADEOFFS.md). It consolidates
three things a reviewer usually has to reverse-engineer: **which tools were chosen
and why** (with the alternatives considered), the **key trade-offs**, and **how
this scales** from a 10k-employee demo to a real production system.

---

## 1. Tools & libraries — what and why

The north star was the assessment's own: *good engineering judgment over
complexity*. Every dependency below earns its place; nothing is there "because
it's what people use."

| Area | Choice | Why this | Alternatives considered |
|---|---|---|---|
| **Language** | TypeScript (server + web) | One language across the stack; end-to-end types catch whole classes of bugs at compile time. | Plain JS (weaker guarantees); Python/FastAPI backend (loses shared types with a React UI). |
| **Backend framework** | Express | Minimal, ubiquitous, zero magic — the layering and error handling are *mine*, which is exactly what's being assessed. | NestJS (great, but its DI/decorator ceremony would obscure the design judgment here); Fastify (fine; Express is more universally legible for a reviewer). |
| **Database** | SQLite via `better-sqlite3` | Zero-ops, single file, blazing fast at this scale; `:memory:` makes tests deterministic and sub-second. Synchronous API keeps transactions trivial. | Postgres (the production target — overkill to *stand up* for a take-home; see §3); an ORM (below). |
| **DB access** | Hand-written parameterized SQL in a repository layer | The core task ("how the org pays people") is an aggregation problem — writing the joins/CTEs directly shows the skill and keeps analytics inspectable. | Prisma/Drizzle ORM: nice DX but hides the interesting SQL and adds a codegen step; the repository seam means we can still swap to one later. See [ADR 0001](./adr/0001-sqlite-with-better-sqlite3.md). |
| **Validation** | Zod | Single source of truth: one schema validates the request *and* infers the TS type. Structured errors map cleanly to HTTP 400s. | `class-validator` (needs classes/decorators); hand-rolled guards (error-prone, untyped). |
| **Logging** | pino + pino-http | Structured JSON logs, fast, trivially silenced in tests. Request logging gives method/path/status/latency for free. | `winston` (heavier); `console.log` (unstructured, not production-grade). |
| **Security headers** | helmet | One line of defense-in-depth for a PII/salary API (HSTS, nosniff, frameguard, …). CSP left off deliberately — a wrong policy silently breaks the bundled SPA. | Hand-set headers (error-prone); nothing (weak for PII). |
| **Backend tests** | Vitest + Supertest | One fast runner shared with the frontend; Supertest exercises the real Express app over an in-memory DB — true integration coverage without a live server. | Jest (slower ESM story); a running server + fetch (flaky, slow). |
| **Frontend** | React + Vite | The brief's requirement; Vite gives instant HMR and a tiny, fast build. | Next.js — great, but SSR/routing/server-components are unnecessary weight for an internal SPA behind auth; a plain SPA is the honest fit. |
| **Component library** | Mantine (+ @mantine/charts) | Batteries-included: accessible components, forms, notifications, **and** charts (Recharts under the hood) in one coherent system — fast path to a polished, consistent UI. | MUI (heavier, more opinionated theming); shadcn/ui (more assembly); Chakra (no first-party charts). |
| **Server state** | TanStack Query | Purpose-built for server cache: dedup, background refetch, precise invalidation after mutations, "keep previous page" during pagination. Removes hand-rolled loading/error/caching state. | Redux/RTK (too much ceremony for read-mostly server data); raw `useEffect` + `fetch` (reinvents caching, badly). |
| **Charts** | @mantine/charts (Recharts) | Declarative, theme-aware, same design language as the rest of the UI. | Raw D3 (powerful but slow to build and style consistently); Chart.js (imperative, off-theme). |
| **Build/deploy** | Multi-stage Docker, single container | API serves the built SPA on one port → one image, one command, trivial to deploy/demo. | Separate web/API images + reverse proxy (correct at scale, overkill here — and the API already runs standalone when `WEB_DIST_PATH` is unset). See [ADR 0005](./adr/0005-single-container-deploy.md). |
| **Seed data** | `@faker-js/faker` with a fixed seed | Realistic, country-appropriate compensation; a fixed seed makes the 10k dataset reproducible across machines and CI. | Static fixtures (not 10k-scale); random-without-seed (non-reproducible demos). |

---

## 2. Key trade-offs (summary)

Full detail with the reasoning lives in [TRADEOFFS.md](./TRADEOFFS.md) and the
[ADRs](./adr); the headline calls:

- **SQLite over Postgres** — right for a 10k demo (zero-ops, deterministic tests);
  the repository layer is the single seam to swap to Postgres. ([ADR 0001](./adr/0001-sqlite-with-better-sqlite3.md))
- **Temporal salary model** (history, not a column) — matches reality (raises) and
  is the foundation for a future audit trail. ([ADR 0002](./adr/0002-temporal-salary-model.md))
- **USD normalization via a dated rate table** — makes cross-country pay comparable;
  deterministic for tests; swapping in a live FX feed is a data change, not a code
  change. ([ADR 0003](./adr/0003-currency-normalization.md))
- **Medians/percentiles reduced in-memory** over one indexed SQL scan, not emulated
  in SQL — the correctness-critical math lives in tiny, unit-tested pure functions.
  This is the main thing that would change first at large scale. ([ADR 0004](./adr/0004-statistics-in-service-layer.md))
- **Deliberately out of scope for v1**: auth/RBAC, audit trail/approvals, live FX,
  bulk Excel import/export — each with a documented reason and a clear place to land.

---

## 3. Scaling roadmap — 10k → 100k → millions

The current design is honest about where it stops. Here is the staged path, by
dimension, with the trigger for each move. Nothing below requires a rewrite — the
layering (routes → services → repositories → SQL, pure domain underneath) is
specifically shaped so each change lands in one place.

### 3.1 Data store
- **Now (≤~100k rows):** SQLite/`better-sqlite3`, WAL mode, indexed hot paths.
- **Trigger:** concurrent writers, HA, or dataset beyond a single node.
- **Move:** swap the repository implementations to **Postgres** (connection pool
  via `pg`/PgBouncer). SQL is already standard; the `repositories/` layer is the
  only code that changes. Services/HTTP/domain are untouched.
- **Then:** read replicas for analytics; partition `salaries` by `effective_date`
  if history grows large.

### 3.2 Analytics ("how we pay")
- **Now:** one indexed scan returns ~10k comp rows; grouping + medians/percentiles
  reduced in-memory (fast, and keeps the math in tested pure functions).
- **Trigger:** hundreds of thousands+ of active employees, or dashboards feeling slow.
- **Move (in order):**
  1. Push aggregates into SQL: `GROUP BY` for count/sum/avg; Postgres
     `percentile_cont`/`percentile_disc` for medians/percentiles — no more row pull.
  2. **Materialized rollups**: a nightly (or on-write) job maintains per
     country/department/level/gender aggregates; dashboards read the rollup table.
  3. Cache overview/breakdowns in **Redis** with short TTL + invalidation on
     compensation changes.
  4. At true analytical scale, ETL into a columnar warehouse (BigQuery/ClickHouse)
     and serve the dashboard from there.

### 3.3 API layer
- **Now:** stateless Express; validation, structured errors, request logging.
- **Now:** baseline **security headers** via `helmet`, configurable CORS origin,
  DB-backed readiness at `/api/health`, and an `X-Request-Id` echoed on every
  response (and in error envelopes) for log correlation.
- **Move:** horizontal scale behind a load balancer (it's already stateless — state
  is in the DB). Add **rate limiting**, response compression, and
  ETag/`Cache-Control` on read-heavy analytics endpoints. Publish an **OpenAPI**
  spec and generate a typed client for the frontend to kill the hand-mirrored types.

### 3.4 Frontend
- **Now:** single Vite SPA bundle (~260KB gzip) — fine for an internal tool.
- **Move:** route-based **code splitting** (`React.lazy`), virtualized tables
  (`@tanstack/react-virtual`) if a view ever renders thousands of rows at once,
  and serve static assets from a **CDN** (the API already runs standalone).

### 3.5 Security & tenancy (the first thing for real use)
- **AuthN/Z:** SSO (OIDC) + **RBAC** — HR admin vs. manager (own-org only) vs.
  read-only finance. Enforced as Express middleware; the persona boundary is
  already conceptually there.
- **PII:** salary is sensitive — field-level access controls, encryption at rest,
  audit of *who viewed/changed what*. The temporal salary model already captures
  the "what changed"; add actor + reason + approval (maker/checker).
- **Multi-tenant / multi-entity:** scope every query by `org_id`; row-level security
  in Postgres.

### 3.6 Compensation domain depth
- Historical **as-of FX** (value a 2022 salary at the 2022 rate) — the rate table is
  already dated; add effective-dated lookups.
- Live FX provider feeding the `exchange_rates` table on a schedule.
- Total-rewards beyond base+bonus: equity, benefits, allowances, employer costs.
- Compensation **bands/ranges** and comp-ratio; promotion/merit-cycle workflows.

### 3.7 Delivery & operations
- **Observability:** metrics (Prometheus/OpenTelemetry), request tracing, error
  tracking (Sentry) — the logger and error middleware are the hook points.
- **CI/CD:** the current GitHub Actions pipeline (lint → typecheck → test → build →
  seed-count) extends to Docker build/publish + deploy on green; add DB **migrations**
  (a runner replacing the single idempotent DDL) with forward/rollback.
- **Data:** real migration tooling, backups/PITR, and seed replaced by an import path
  (the deferred Excel import) for real onboarding.

The theme: **v1 is small on purpose and layered so that scale is a series of
localized, low-risk swaps rather than a rewrite.**
