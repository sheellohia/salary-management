# How AI was used

The assessment asks for AI to be used intentionally while keeping correctness and
quality. This documents *how*, honestly.

## Tooling

- Built with an agentic coding assistant (Claude Code) driving the terminal:
  scaffolding, writing files, running `typecheck`/`test`/`build`, reading errors,
  and iterating.
- I stayed the engineer-in-the-loop: I made the architectural calls
  (see [ADRs](./adr/)), decided the data model and the analytics approach, and
  reviewed every file. AI accelerated the typing, not the judgement.

## Workflow

1. **Requirements first.** Wrote [`REQUIREMENTS.md`](./REQUIREMENTS.md) before any
   code — goal, scope, explicit non-goals — so the build had a spine.
2. **Backend outside-in.** Domain (pure money/stats) → schema → repositories →
   services → HTTP. Committed in logical, incremental slices.
3. **Tests as the correctness contract.** Every non-trivial rule (currency,
   median, current-salary, pagination, API status codes) got a test with a
   *hand-computed* expected value — so a green suite actually means "correct",
   not "the code agrees with itself".
4. **Verified end-to-end.** Ran the seed (10,000 employees), booted the built
   server, and curled the real endpoints to confirm the numbers (e.g. US avg
   ~$190k vs India ~$38k after USD normalization) before calling it done.
5. **Frontend against the real API.** Typed client + query hooks mirroring the
   server contract, then screens; verified `typecheck`, tests, and a production
   `vite build`.

## Guardrails applied to AI output

- **No unverified claims.** Where a number is stated (test expectations, seed
  counts), it was executed and checked, not assumed.
- **Tight scope.** Resisted feature sprawl; deferred items are written down in
  [TRADEOFFS.md](./TRADEOFFS.md) with reasons rather than half-built.
- **Consistency review.** Naming, layering, and error handling kept uniform
  across the codebase; comments explain *why*, not *what*.

## Representative prompts / instructions used

- "Design an employee salary management app for a 10k-employee, multi-country
  org for an HR manager; requirements doc first, then a layered TS backend with
  SQLite, a React+Mantine UI, meaningful fast tests, and incremental commits."
- "Model salary as temporal history; resolve current salary as newest effective
  date with a deterministic tie-break; test it."
- "Normalize all cross-employee analytics to USD via an exchange-rate table;
  keep median/percentile logic in pure, unit-tested functions."
- "Add server-side search/filter/sort/pagination that stays fast at 10k rows."
- "Package as a single container that serves the API and the built SPA; add CI
  that also asserts the seed produces exactly 10,000 employees."
