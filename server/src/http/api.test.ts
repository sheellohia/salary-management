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

afterEach(() => db.close());

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
