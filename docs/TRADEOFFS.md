# Trade-offs & Performance Considerations

A record of the conscious engineering trade-offs — what was optimized for, what
was deferred, and why. The guiding principle was the assessment's own: *good
engineering judgment over maximal complexity.*

## What this design optimizes for

- **Correctness of the money math.** Currency conversion, medians/percentiles,
  and current-salary resolution are the things that are embarrassing to get
  wrong. They live in small pure/DI'd units with hand-computable tests.
- **Fast, deterministic tests.** In-memory SQLite + fixed seeds → the whole
  backend suite (68 tests) runs in well under a second with no flakiness.
- **Readability & a clean seam for growth.** Strict layering means each future
  change (Postgres, auth, audit) has one obvious place to land.

## Performance

| Concern | Approach |
|---|---|
| Employee list at 10k rows | Server-side pagination + indexed filters (`country`, `department`, `level`, `status`); sort columns whitelisted. One `COUNT(*)` + one page query. |
| Current-salary lookup | Composite index `salaries(employee_id, effective_date DESC)`; resolved with a single window-function CTE, reused by list and detail. |
| Analytics | One indexed scan returns comp rows already normalized to USD in SQL; grouping/medians reduced in-memory (see ADR 0004). Sub-100ms at this scale. |
| Currency conversion | Done in SQL via the `exchange_rates` join, not per-row in app code. |
| Frontend fetching | TanStack Query caches by query key, keeps the previous page visible during refetch, and invalidates precisely after mutations. Search input is debounced (300ms). |
| Seed | Single transaction + prepared statements → ~28k rows (10k employees + ~18k salary records) in ~0.2s. |

**Where it stops scaling (and the fix):** the in-memory median approach and
single-writer SQLite are fine to ~10^5 rows. Beyond that: move to Postgres
(`percentile_cont`, connection pool) and/or pre-aggregated rollups. The
repository layer is the only code that changes.

## Deliberately deferred (and why)

- **Auth / RBAC** — one trusted persona in v1; it's middleware-shaped and adds
  no new judgment to demonstrate. First thing to add for real use.
- **Audit trail & maker/checker approvals** — the #1 real-world HR need; the
  temporal salary model is deliberately the foundation for it.
- **Live FX feed** & **historical (as-of) rates** — determinism matters more for
  a demo; conversion reads a table, so this is a data/job change.
- **Bulk Excel import/export** — valuable migration aid, but the point of the
  product is *leaving* spreadsheets; builds cleanly on the create API.
- **Org-chart / manager rollups in the UI** — `manager_id` is modelled and
  seeded; surfacing reporting lines is a UI addition.
- **Bundle code-splitting** — the SPA is one ~260KB-gzip chunk; fine for an
  internal tool, trivially split later if needed.

## Known limitations

- Rates are static and current-dated, so historical salaries are valued at
  today's rate (documented in ADR 0003).
- Pay-equity is a first-cut median-by-gender with a gap %; a rigorous version
  controls for role/level/geography mix. The UI says so explicitly rather than
  implying more rigor than exists.
