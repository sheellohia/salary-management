import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Central runtime configuration, sourced from the environment with sane defaults. */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** Absolute path to the SQLite file. `:memory:` is used by the test harness. */
  databasePath:
    process.env.DATABASE_PATH ?? path.resolve(__dirname, '../data/salary.db'),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  /** The single currency all cross-employee analytics are normalized to. */
  baseCurrency: 'USD' as const,
} as const;

export type Config = typeof config;
