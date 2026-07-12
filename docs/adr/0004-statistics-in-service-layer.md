# ADR 0004 — Compute medians/percentiles in the service layer

**Status:** Accepted

## Context

Analytics need headcount, totals, averages, **medians**, and percentiles —
grouped by country/department/level/gender. SQLite has no native
`median`/`percentile_cont`, and emulating them in SQL (self-joins / window
tricks) is verbose and easy to get subtly wrong per group.

## Decision

Let **SQL do the heavy join + USD normalization + filtering**, returning ~10k
flat comp rows; compute grouping, medians and percentiles in the
**`AnalyticsService`** using small **pure functions** (`median`, `percentile`,
`mean`) that are exhaustively unit-tested.

## Rationale

- The correctness-critical math lives in tiny, deterministic, unit-tested
  functions with hand-computable expectations — far more trustworthy than
  hand-rolled SQL percentile emulation.
- At 10k employees, materializing one column of numbers and reducing in JS is
  trivially fast (single indexed scan, sub-100ms end to end).
- Keeps the SQL simple and readable.

## Consequences

- This pattern pulls rows into app memory; it does **not** scale to millions of
  rows. The documented path there is pre-aggregated rollups or pushing
  percentiles into a database that supports them (e.g. Postgres
  `percentile_cont`). Called out explicitly so the boundary isn't mistaken for
  "covered at any scale".
