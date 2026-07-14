# ADR 0005 — Single-container deployment (API serves the SPA)

**Status:** Accepted

## Context

The app has two build artifacts (Express API, static React bundle). We want a
"fully functional deployed software" story that is simple to run and cheap to
host, without standing up a separate CDN/reverse-proxy for an assessment.

## Decision

In production, the **Express process also serves the built SPA** (via
`WEB_DIST_PATH`) on one port, with SQLite seeded on first boot. Ship one
multi-stage `Dockerfile`; provide `docker-compose.yml` (persistent named volume)
and a `render.yaml` for one-click hosting. The `render.yaml` targets Render's
free plan — no disk, so SQLite is re-seeded (deterministically) on each cold
start; a one-line switch to the `starter` plan plus a disk gives persistent data
(documented inline). In development the two run separately with a Vite dev proxy
(`/api → :4000`).

## Rationale

- One image, one port, one command → trivial to deploy and demo.
- Same-origin in production removes CORS/config complexity for the browser.
- The dev proxy keeps fast HMR while preserving the same `/api` paths.

## Consequences

- API and web scale together and can't be cached/CDN'd independently. For real
  scale you'd split them (static → CDN, API → autoscaled service) — no code
  change needed, just a different deploy topology, since the API already runs
  standalone when `WEB_DIST_PATH` is unset.
- SQLite on a single volume means one writer; fine for this workload, revisited
  with the Postgres path in ADR 0001.
