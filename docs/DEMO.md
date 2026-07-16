# Demo

A ~3–4 minute walkthrough you can record locally. It shows the HR-manager
workflow end to end **and** narrates the engineering underneath each screen.

> **Video:** https://www.loom.com/share/0be06258d50b4600983e8def0bcc913e
>
> A live instance is also deployed (see the README), but this script is written
> for a **local** run so nothing depends on a free-tier host waking up mid-demo.

---

## 1. Run it locally

```bash
npm install && npm run seed && npm run dev
# API on http://localhost:4000, UI on http://localhost:5173
```

`npm run seed` builds a deterministic 10,000-employee dataset (`faker.seed(42)`,
so every run is identical) across 10 countries and 10 currencies, plus ~18k
salary rows (each employee gets an opening offer and 0–2 raises). Open
**http://localhost:5173**.

Prefer the production shape (single container, API serves the built SPA on one
port)?

```bash
docker compose up --build      # everything on http://localhost:4000
```

---

## 2. Walkthrough (do these clicks on camera)

### Dashboard — "How ACME pays"

- **Read the KPI row aloud**: active headcount (~10k), total annual payroll in
  USD, median comp with P25/P75, and the count of countries/currencies.
  - *Technical:* every number here is computed **server-side in SQL** against
    the current salary of each **active** employee — terminated staff are
    excluded (`WHERE e.status = 'active'`). Medians and percentiles use a pure,
    unit-tested nearest-rank function, not a DB extension (ADR 0004).
- **Point at *Total comp by department* and *by country*.** Call out that these
  are **USD-normalized** — an India (INR) salary and a US (USD) salary are
  directly comparable because the SQL joins each row to an FX rate and converts.
  The comparison metric is *total target cash* = `base × (1 + bonus_target%)`,
  not just base (ADR 0003).
- **Median comp by level** climbs L1 → L7; the **distribution** chart shows the
  overall shape of pay (bucketed histogram, last bucket open-ended).
- **Pay equity table** — median comp by gender with the gap to the top group.
  - *Interactive:* change the **department**/**level** slicer and watch the gap
    recompute for that slice.
  - *Say the honest caveat out loud:* this is an unadjusted median gap; a
    rigorous version controls for role/level/tenure mix. That caveat is in the
    UI and the docs on purpose — product honesty over a vanity number.

### Employees — the directory (server-side everything)

- **Type in Search** (e.g. a name) — it's **debounced (300ms)** and filters
  server-side; the result count updates.
- **Stack filters**: Country = **India**, Department = **Engineering**. The list
  and the total count both reflect the combined `WHERE` clause — filtering is
  *not* client-side over a fetched page.
- **Click the "Total comp (USD)" column header** to sort descending — the
  highest-paid surface first. Note NULLS-LAST ordering so employees mid-edit
  never jump to the top.
- **Page through** to show pagination stays snappy at 10k rows (indexed columns +
  `LIMIT/OFFSET`, `pageSize` capped at 100 so no request can pull the whole table).
- *Technical aside:* "current salary" is resolved with a **window-function CTE**
  (`ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY effective_date DESC, id DESC)`)
  that's shared by the list, the detail page, and every analytics query — one
  source of truth, so the directory and the dashboard can never disagree.

### Employee detail — temporal salary in action

- **Open any row.** Show the profile, **current compensation in both local
  currency and USD**, and the **salary-history timeline**.
- **Click "Record raise"**, enter a higher base, save.
  - The current comp and the history update **immediately** — the raise is a new
    row appended to `salaries` (history is never overwritten), and TanStack
    Query invalidates the employee + analytics caches so the UI refetches.
- **Optional: "Edit"** a field to show partial `PATCH` update.
- **Optional: "Terminate"** (soft delete → `status = 'terminated'`). Point out
  they immediately **drop out of the active-payroll analytics** — nothing is
  hard-deleted, so the record is auditable.

### Back to Dashboard — closing the loop

- Return to the dashboard: the KPIs and charts reflect the raise/termination you
  just made. That's the cache-invalidation wiring paying off — no manual refresh.

---

## 3. (Optional) 30-second API tour on camera

Great for showing the backend is real and typed, not just a UI. With the app
running:

```bash
# Org-wide KPIs (what the dashboard renders)
curl -s localhost:4000/api/analytics/overview | jq

# Readiness probe — actually runs SELECT 1 against SQLite (503 if the DB is down)
curl -s localhost:4000/api/health | jq

# Server-side filter + sort + paginate, all in the query string
curl -s "localhost:4000/api/employees?country=IN&department=Engineering&sortBy=totalCompUsd&sortDir=desc&pageSize=3" | jq

# Validation is honest: bad input → 400 with a Zod error, not a 500
curl -s -o /dev/null -w "%{http_code}\n" "localhost:4000/api/employees?pageSize=999"
```

---

## 4. Engineering talking points (30-second wrap)

- **Layered, testable backend**: routes → services → repositories → pure domain.
  SQLite constraint violations are mapped to honest HTTP codes (409 on duplicate
  email/code, 400 on a bad manager reference) instead of leaking 500s.
- **Salary is temporal** — a history table, not a single mutable column (ADR
  0002). Raises append; nothing is lost.
- **Currency is normalized in SQL**; the money/statistics math lives in pure,
  hand-verified functions the tests pin against the SQL results so they can't
  drift (ADRs 0003, 0004).
- **92 tests** — 68 backend + 24 frontend — deterministic, running against
  in-memory SQLite and jsdom; the backend suite finishes in well under a second.
- **Ships as a single container**; CI lints, type-checks, tests, builds the
  image, and **asserts the seed is exactly 10,000 employees** on every push.
- **Deliberately out of scope** (and documented): auth/RBAC, payroll runs, and a
  Postgres move — see `docs/REQUIREMENTS.md` and the ADRs for the reasoning.
