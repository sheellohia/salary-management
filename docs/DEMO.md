# Demo

> **Video:** _add link here_ (e.g. Loom / YouTube unlisted). Record the
> click-through below — it runs ~2–3 minutes.

## Run it locally in 30 seconds

```bash
npm install && npm run seed && npm run dev
# open http://localhost:5173
```

Or production-like in one command:

```bash
docker compose up --build      # open http://localhost:4000
```

## Suggested walkthrough script

1. **Dashboard** — land on "How ACME pays".
   - Call out the KPI row: active headcount (~10k), total annual payroll in USD,
     median comp with P25/P75, and countries/currencies.
   - Point at *Total comp by department* and *by country* — note these are USD
     **normalized** (an India salary and a US salary are comparable here).
   - *Median comp by level* rises L1 → L7; *distribution* shows the shape of pay.
   - *Pay equity* table: median by gender with the gap to the top group, and the
     honest caveat that a rigorous version controls for role/level mix.

2. **Employees** — go to the directory.
   - Type in **Search** (debounced), then filter by **Country = India** and
     **Department = Engineering** — the list and count update server-side.
   - Click the **Total comp (USD)** header to sort descending — highest-paid first.
   - Page through results to show pagination stays snappy at 10k rows.

3. **Employee detail** — open any row.
   - Show profile + current compensation (local currency **and** USD) + the
     **salary history** timeline (raises).
   - Click **Record raise**, enter a new base, save — the current comp and history
     update immediately.
   - Optionally **Edit** a field, or **Terminate** (soft delete) and note they drop
     out of the active-payroll analytics.

4. **Back to Dashboard** — the numbers reflect the changes you just made
   (React Query invalidation).

## Talking points (engineering)

- Salary is **temporal** — history, not a single column (ADR 0002).
- All analytics are **USD-normalized in SQL**; medians/percentiles are pure,
  unit-tested functions (ADRs 0003, 0004).
- 37 backend tests run in <400ms against in-memory SQLite.
- Ships as a **single container**; CI asserts the seed is exactly 10,000 employees.
