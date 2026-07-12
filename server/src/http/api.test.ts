import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { DB } from '../db/connection.js';
import { createApp } from '../app.js';
import { makeTestDb } from '../test/fixtures.js';

let db: DB;
let app: Express;

const validEmployee = {
  employeeCode: 'ACME-TEST-1',
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace.hopper@acme.com',
  country: 'US',
  department: 'Engineering',
  jobTitle: 'Staff Engineer',
  level: 'L5',
  employmentType: 'full_time',
  gender: 'female',
  managerId: null,
  hireDate: '2020-05-01',
  salary: { baseAmount: 200_000, currency: 'USD', bonusTargetPct: 15, effectiveDate: '2020-05-01' },
};

beforeEach(() => {
  db = makeTestDb();
  app = createApp(db);
});

afterEach(() => {
  // One test closes the db mid-run to exercise the 500 path; closing twice throws.
  try {
    db.close();
  } catch {
    /* already closed */
  }
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/employees', () => {
  it('creates an employee with an opening salary and returns USD-normalized comp', async () => {
    const res = await request(app).post('/api/employees').send(validEmployee);
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('grace.hopper@acme.com');
    expect(res.body.currentSalary.baseAmount).toBe(200_000);
    expect(res.body.baseAmountUsd).toBe(200_000);
    expect(res.body.totalCompUsd).toBe(230_000); // +15% bonus
    expect(res.body.salaryHistory).toHaveLength(1);
  });

  it('rejects invalid payloads with 400 and field details', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validEmployee, email: 'not-an-email', level: 'L99' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fieldErrors).toHaveProperty('email');
  });

  it('returns 409 on a duplicate email', async () => {
    await request(app).post('/api/employees').send(validEmployee);
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validEmployee, employeeCode: 'ACME-TEST-2' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('GET /api/employees', () => {
  beforeEach(async () => {
    await request(app).post('/api/employees').send(validEmployee);
    await request(app)
      .post('/api/employees')
      .send({ ...validEmployee, employeeCode: 'ACME-TEST-2', email: 'a@acme.com', country: 'DE', department: 'Sales', salary: { ...validEmployee.salary, currency: 'EUR' } });
  });

  it('lists with pagination metadata', async () => {
    const res = await request(app).get('/api/employees?pageSize=1&page=1');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(1);
  });

  it('filters by country', async () => {
    const res = await request(app).get('/api/employees?country=DE');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].country).toBe('DE');
  });

  it('rejects an out-of-range pageSize', async () => {
    const res = await request(app).get('/api/employees?pageSize=9999');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown employee', async () => {
    const res = await request(app).get('/api/employees/999999');
    expect(res.status).toBe(404);
  });
});

describe('salary changes and lifecycle', () => {
  let id: number;
  beforeEach(async () => {
    const res = await request(app).post('/api/employees').send(validEmployee);
    id = res.body.id;
  });

  it('records a raise and reflects it as the current salary', async () => {
    const res = await request(app)
      .post(`/api/employees/${id}/salaries`)
      .send({ baseAmount: 240_000, currency: 'USD', bonusTargetPct: 15, effectiveDate: '2023-01-01', note: 'Promotion' });
    expect(res.status).toBe(201);
    expect(res.body.currentSalary.baseAmount).toBe(240_000);
    expect(res.body.salaryHistory).toHaveLength(2);
  });

  it('updates employee fields', async () => {
    const res = await request(app).patch(`/api/employees/${id}`).send({ jobTitle: 'Principal Engineer' });
    expect(res.status).toBe(200);
    expect(res.body.jobTitle).toBe('Principal Engineer');
  });

  it('soft-deletes (terminates) an employee', async () => {
    const res = await request(app).delete(`/api/employees/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('terminated');
  });
});

describe('input validation and error mapping', () => {
  it('rejects a non-existent managerId with 400 (not 500)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validEmployee, managerId: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/manager/i);
  });

  it('rejects a non-calendar date with 400', async () => {
    const res = await request(app)
      .post('/api/employees')
      .send({ ...validEmployee, hireDate: '2026-13-45' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps malformed JSON to 400 BAD_REQUEST (not 500)', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send('{ "firstName": '); // truncated JSON
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('maps an oversized body to 413 PAYLOAD_TOO_LARGE', async () => {
    const huge = { ...validEmployee, jobTitle: 'x'.repeat(1_100_000) };
    const res = await request(app).post('/api/employees').send(huge);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns a JSON 404 for an unknown /api route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Route not found' });
  });

  it('surfaces an unexpected repository failure as 500 INTERNAL', async () => {
    db.close(); // any query now throws a generic (non-AppError) error
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
  });
});

describe('analytics + reference endpoints', () => {
  beforeEach(async () => {
    await request(app).post('/api/employees').send(validEmployee);
  });

  it('serves the org overview', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(200);
    expect(res.body.headcount).toBe(1);
    expect(res.body.totalPayrollUsd).toBe(230_000);
  });

  it('serves reference data for filters and forms', async () => {
    const res = await request(app).get('/api/reference');
    expect(res.status).toBe(200);
    expect(res.body.countries.length).toBeGreaterThan(0);
    expect(res.body.exchangeRates.length).toBeGreaterThan(0);
    expect(res.body.baseCurrency).toBe('USD');
  });
});
