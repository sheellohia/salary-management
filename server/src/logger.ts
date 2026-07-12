import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  // Silence logs during tests to keep output clean and deterministic.
  enabled: config.nodeEnv !== 'test',
});
