# Demo Recording Script (~2.5–3 min)

A spoken, first-person script to read while screen-recording the **local** app.
Each beat has **SHOW** (what to do on screen) and **SAY** (what to speak). Keep a
natural pace — the SAY lines total ~2.5 minutes at a normal speaking speed.

> Before you hit record: `npm run seed && npm run dev`, open
> **http://localhost:5173**, and have an employee's detail page ready in a second
> tab so the "record raise" beat is instant.

---

## 0 · Intro (~15s)

**SHOW:** Dashboard landing page ("How ACME pays").

**SAY:**
> "Hi — this is salary management for ACME, a 10,000-employee org across ten
> countries. The problem was that HR ran all of this in spreadsheets. So I built
> a web app where an HR manager can manage salaries *and* actually answer
> questions about how the company pays people. Let me walk through it."

---

## 1 · Dashboard — the questions HR actually asks (~40s)

**SHOW:** Point at the KPI row, then the department and country charts.

**SAY:**
> "This is the money question up top — active headcount, total annual payroll,
> and the median with the 25th and 75th percentiles. The key decision here:
> people are paid in ten different currencies, so everything is **normalized to
> USD in SQL** before it's aggregated. An India salary and a US salary are
> genuinely comparable on these charts. I also compare *total target cash* —
> base plus bonus target — not just base, because that's how HR thinks about
> cost."

**SHOW:** Scroll to the pay-equity table; change the department slicer.

**SAY:**
> "This is a pay-equity view — median comp by gender with the gap to the top
> group, and I can slice it by department. One honest note: this is an
> *unadjusted* gap. A rigorous version controls for role and level mix — I
> deliberately show the caveat in the UI rather than a misleading clean number."

---

## 2 · Employees — 10k rows, all server-side (~35s)

**SHOW:** Type in Search, then set Country = India, Department = Engineering.

**SAY:**
> "The directory is ten thousand rows, so search, filtering, sorting, and
> pagination all happen **server-side** — the browser never pulls the whole
> table. Search is debounced, and the page size is capped so no request can pull
> everything at once."

**SHOW:** Click the "Total comp (USD)" column header to sort descending.

**SAY:**
> "Sorting by total comp here — and under the hood, an employee's *current*
> salary is resolved with one window-function query that's shared by this list,
> the detail page, and every dashboard number. So the directory and the
> dashboard can never disagree — there's a single source of truth."

---

## 3 · Employee detail — salary is temporal (~35s)

**SHOW:** Open an employee. Point at current comp (local + USD) and the history.

**SAY:**
> "On the detail page you get the profile, current comp in both local currency
> and USD, and the full **salary history**. That was a core design decision:
> salary is *temporal* — it's a history table, not one column I overwrite. A
> raise is a new record."

**SHOW:** Click "Record raise", enter a higher base, save.

**SAY:**
> "So when I record a raise... the current comp and the history update
> immediately, and the dashboard's numbers stay in sync because the app
> invalidates the right caches. And if I terminate someone, it's a soft delete —
> they drop out of active payroll but the record is kept, so it stays auditable."

---

## 4 · Engineering wrap (~30s)

**SHOW:** Back to Dashboard (numbers reflect the raise). Optional: flash the
terminal with `npm test` passing, or the repo's `docs/` folder.

**SAY:**
> "Architecture-wise it's cleanly layered — routes, services, repositories, and
> pure domain logic — so database errors map to honest HTTP codes instead of
> leaking 500s. The money and statistics math lives in pure functions with
> hand-computed tests, and there are 92 tests total, all fast and deterministic.
> It ships as a single container, and CI even asserts the seed is exactly ten
> thousand employees. I intentionally left out auth, payroll runs, and a
> Postgres move — they're documented as next steps with the reasoning. That's the
> app. Thanks for watching."

---

### Timing cheat-sheet

| Beat | Target |
|---|---|
| Intro | 0:00–0:15 |
| Dashboard | 0:15–0:55 |
| Employees | 0:55–1:30 |
| Detail + raise | 1:30–2:05 |
| Engineering wrap | 2:05–2:35 |

**Delivery tips:** talk slightly slower than feels natural; pause for a beat
after each click so the screen catches up; it's fine to paraphrase — the point is
to sound like you, not to read verbatim.
