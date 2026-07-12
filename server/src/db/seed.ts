/**
 * Seed script: generates a deterministic, realistic 10,000-employee org.
 *
 * Design choices that matter:
 *  - `faker.seed(...)` fixes randomness so the dataset (and any demo/screenshot)
 *    is reproducible across machines and CI.
 *  - Compensation is country- and level-appropriate (a US L5 earns very
 *    different local numbers than an India L2), which makes the currency
 *    normalization in analytics actually meaningful.
 *  - Each employee gets a small salary history (initial + occasional raises),
 *    exercising the temporal salary model.
 *  - Inserts run inside a single transaction with prepared statements — ~40k
 *    rows land in well under a second.
 */
import { faker } from '@faker-js/faker';
import { openDatabase, type DB } from './connection.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import {
  COUNTRIES,
  DEPARTMENTS,
  EXCHANGE_RATES,
  LEVELS,
  LEVEL_MULTIPLIER,
  TITLES_BY_DEPARTMENT,
} from './reference.js';
import { EMPLOYMENT_TYPES, GENDERS, type Gender } from '../domain/types.js';

const TOTAL_EMPLOYEES = 10_000;
const SEED = 42;

/** Weighted picker: `weights[i]` is the relative chance of `items[i]`. */
function weighted<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = faker.number.float({ min: 0, max: total });
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// Distributions tuned to look like a real org (junior-heavy pyramid, US/India-weighted).
const COUNTRY_WEIGHTS = [30, 8, 7, 28, 6, 5, 4, 4, 5, 3]; // aligns with COUNTRIES order
const LEVEL_WEIGHTS = [18, 24, 22, 15, 11, 7, 3];
const GENDER_WEIGHTS: Record<Gender, number> = {
  female: 44,
  male: 44,
  non_binary: 3,
  undisclosed: 9,
};
const EMPLOYMENT_WEIGHTS = [88, 7, 5]; // full_time, part_time, contractor

const BONUS_BY_LEVEL: Record<string, number> = {
  L1: 5, L2: 8, L3: 10, L4: 15, L5: 20, L6: 30, L7: 40,
};

interface SeedEmployee {
  id: number;
  department: string;
  level: string;
  country: string;
  levelIndex: number;
}

function pickTitle(department: string, levelIndex: number): string {
  const titles = TITLES_BY_DEPARTMENT[department] ?? ['Employee'];
  // Map 7 levels onto the (usually 4) titles, clamping to the senior-most.
  const idx = Math.min(Math.floor((levelIndex / LEVELS.length) * titles.length), titles.length - 1);
  return titles[idx]!;
}

export function seed(db: DB): void {
  const wipe = db.transaction(() => {
    db.exec('DELETE FROM salaries; DELETE FROM employees; DELETE FROM exchange_rates;');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('employees','salaries');");
  });
  wipe();

  const insertRate = db.prepare(
    'INSERT INTO exchange_rates (currency, rate_to_usd, as_of) VALUES (?, ?, ?)',
  );
  const insertEmployee = db.prepare(
    `INSERT INTO employees
       (employee_code, first_name, last_name, email, country, department, job_title,
        level, employment_type, gender, manager_id, hire_date, status)
     VALUES (@employeeCode, @firstName, @lastName, @email, @country, @department, @jobTitle,
        @level, @employmentType, @gender, NULL, @hireDate, 'active')`,
  );
  const insertSalary = db.prepare(
    `INSERT INTO salaries (employee_id, base_amount, currency, bonus_target_pct, effective_date, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const setManager = db.prepare('UPDATE employees SET manager_id = ? WHERE id = ?');

  const run = db.transaction(() => {
    for (const rate of EXCHANGE_RATES) {
      insertRate.run(rate.currency, rate.rateToUsd, rate.asOf);
    }

    const created: SeedEmployee[] = [];

    for (let i = 0; i < TOTAL_EMPLOYEES; i++) {
      const country = weighted(COUNTRIES, COUNTRY_WEIGHTS);
      const level = weighted(LEVELS, LEVEL_WEIGHTS);
      const levelIndex = LEVELS.indexOf(level);
      const department = faker.helpers.arrayElement(DEPARTMENTS);
      const gender = weighted(GENDERS, GENDERS.map((g) => GENDER_WEIGHTS[g]));
      const employmentType = weighted(EMPLOYMENT_TYPES, EMPLOYMENT_WEIGHTS);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const hireDate = faker.date
        .between({ from: '2015-01-01', to: '2026-06-30' })
        .toISOString()
        .slice(0, 10);

      const employeeCode = `ACME-${String(i + 1).padStart(5, '0')}`;
      const email = faker.internet
        .email({ firstName, lastName, provider: `acme-${employeeCode.toLowerCase()}.com` })
        .toLowerCase();

      const id = Number(
        insertEmployee.run({
          employeeCode,
          firstName,
          lastName,
          email,
          country: country.code,
          department,
          jobTitle: pickTitle(department, levelIndex),
          level,
          employmentType,
          gender,
          hireDate,
        }).lastInsertRowid,
      );

      // Compensation: country midpoint × level multiplier × ±15% individual jitter.
      const jitter = faker.number.float({ min: 0.85, max: 1.15 });
      let base = Math.round((country.midBase * LEVEL_MULTIPLIER[level as keyof typeof LEVEL_MULTIPLIER] * jitter) / 1000) * 1000;
      const bonusPct = BONUS_BY_LEVEL[level]! + (department === 'Sales' ? 10 : 0);

      // Initial salary at hire, then 0–2 raises spaced ~12–20 months apart.
      const raiseCount = faker.number.int({ min: 0, max: 2 });
      let effective = new Date(hireDate);
      insertSalary.run(id, base, country.currency, bonusPct, hireDate, 'Initial offer');
      for (let r = 0; r < raiseCount; r++) {
        effective = new Date(effective);
        effective.setMonth(effective.getMonth() + faker.number.int({ min: 12, max: 20 }));
        if (effective > new Date('2026-06-30')) break;
        base = Math.round((base * faker.number.float({ min: 1.04, max: 1.14 })) / 1000) * 1000;
        insertSalary.run(id, base, country.currency, bonusPct, effective.toISOString().slice(0, 10), 'Merit increase');
      }

      created.push({ id, department, level, country: country.code, levelIndex });
    }

    // Second pass: assign managers. Managers are senior folks (L5+); everyone
    // below reports to a random senior peer, preferably in the same country.
    const managers = created.filter((e) => e.levelIndex >= 4);
    const byCountry = new Map<string, SeedEmployee[]>();
    for (const m of managers) {
      const list = byCountry.get(m.country) ?? [];
      list.push(m);
      byCountry.set(m.country, list);
    }
    for (const emp of created) {
      if (emp.levelIndex >= 5) continue; // top execs have no manager
      const pool = byCountry.get(emp.country) ?? managers;
      const candidates = pool.filter((m) => m.levelIndex > emp.levelIndex && m.id !== emp.id);
      const chosen = (candidates.length ? candidates : managers).at(
        faker.number.int({ min: 0, max: Math.max(0, (candidates.length || managers.length) - 1) }),
      );
      if (chosen) setManager.run(chosen.id, emp.id);
    }
  });

  faker.seed(SEED);
  run();
}

// Allow running directly: `tsx src/db/seed.ts`.
const isDirectRun = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isDirectRun) {
  const db = openDatabase(config.databasePath);
  const start = Date.now();
  seed(db);
  const count = (db.prepare('SELECT COUNT(*) AS n FROM employees').get() as { n: number }).n;
  const salaries = (db.prepare('SELECT COUNT(*) AS n FROM salaries').get() as { n: number }).n;
  db.close();
  logger.info(
    `Seeded ${count} employees and ${salaries} salary records in ${Date.now() - start}ms → ${config.databasePath}`,
  );
  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${count} employees (${salaries} salary records) → ${config.databasePath}`);
}
