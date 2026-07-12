import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { DB } from '../db/connection.js';
import { createApp } from '../app.js';
import { makeTestDb } from '../test/fixtures.js';

/**
 * Exercises the single-container production path where the API also serves the
 * built SPA (WEB_DIST_PATH). Uses a scratch dir with a stub index.html so it
 * stays deterministic and independent of a real Vite build.
 */
describe('SPA serving (webDistPath)', () => {
  let db: DB;
  let app: Express;
  let webDist: string;
  const indexHtml = '<!doctype html><title>ACME</title><div id="root"></div>';

  beforeAll(() => {
    webDist = fs.mkdtempSync(path.join(os.tmpdir(), 'webdist-'));
    fs.writeFileSync(path.join(webDist, 'index.html'), indexHtml);
    db = makeTestDb();
    app = createApp(db, { webDistPath: webDist });
  });

  afterAll(() => {
    db.close();
    fs.rmSync(webDist, { recursive: true, force: true });
  });

  it('serves index.html for a client-side route', async () => {
    const res = await request(app).get('/employees/42');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<div id="root">');
  });

  it('still returns a JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('still serves real API routes', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
