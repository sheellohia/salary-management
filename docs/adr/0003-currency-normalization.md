# ADR 0003 — Normalize compensation to USD via an exchange-rate table

**Status:** Accepted

## Context

Salaries are paid in local currency across 10 countries (USD, EUR, INR, JPY, …).
A raw sum or average across currencies is meaningless. The HR manager's core
questions ("total payroll", "how does pay compare across countries") require a
single comparable unit.

## Decision

Store each salary in its **local currency**, keep an **`exchange_rates`** table
(`currency → rate_to_usd`, dated), and normalize to **USD** for every
cross-employee metric. The comparison quantity is **annual total target cash =
base × (1 + bonus%)** converted to USD, computed in SQL via the rate join.

## Rationale

- Preserves source-of-truth (local pay) while enabling apples-to-apples analytics.
- Doing the conversion in SQL keeps aggregation on the DB side (fast, correct),
  and the same rate table drives the per-employee USD figures shown in the UI.
- A dated rate table is deterministic — analytics and tests don't depend on a
  live network call.

## Consequences

- Rates are static/seeded here. In production this table is refreshed from an FX
  provider on a schedule; because conversion reads the table, that's a data
  change, not a code change. Historical accuracy (rate as-of the effective date)
  is a documented future enhancement.
- An unknown currency raises rather than silently producing a wrong number
  (`toUsd` throws; validation restricts input to known currencies).
