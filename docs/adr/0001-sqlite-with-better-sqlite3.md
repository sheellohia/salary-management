# ADR 0001 — SQLite via better-sqlite3 (no ORM)

**Status:** Accepted

## Context

We need a relational database for ≤10k employees and their salary history, with
fast filtered lists and aggregate analytics. The assessment explicitly allows
SQLite.

## Decision

Use **SQLite** through **better-sqlite3** with a thin, hand-written repository
layer of parameterized SQL — no ORM.

## Rationale

- **Zero-ops & reproducible.** A single file (or `:memory:`) means the whole app
  runs with two commands and tests get an isolated, deterministic DB per run.
- **Fast enough by a wide margin.** 10k employees is tiny; indexed queries are
  sub-millisecond. better-sqlite3 is synchronous, which removes async overhead
  and makes transactions trivial.
- **SQL is the point.** "How does the org pay people" is fundamentally an
  aggregation problem. Writing the joins/CTEs directly demonstrates the skill and
  keeps the analytics honest and inspectable, rather than hidden behind ORM
  query-builder magic.
- **Type safety without codegen.** Repositories map rows to typed domain objects
  at one boundary, so the rest of the code is fully typed without a generate step.

## Consequences

- Not a multi-writer, networked database. For real production scale/concurrency
  we'd migrate to **Postgres** — the repository layer is the single seam where
  that swap happens; services/HTTP/domain are unaffected.
- No migration runner; the schema is one idempotent DDL string applied on
  startup. Acceptable at this scope (see ADR 0005 for the future path).
