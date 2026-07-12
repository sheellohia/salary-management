import { createApp } from './app.js';
import { getDatabase } from './db/connection.js';
import { config } from './config.js';
import { logger } from './logger.js';

const db = getDatabase();
// In production the built SPA is served by the same process (single container).
const app = createApp(db, { webDistPath: process.env.WEB_DIST_PATH });

const server = app.listen(config.port, () => {
  logger.info(`Salary Management API listening on http://localhost:${config.port}`);
});

// Graceful shutdown so the SQLite handle is released cleanly.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
