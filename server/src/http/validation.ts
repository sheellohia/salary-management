import { z } from 'zod';
import { EMPLOYMENT_TYPES, GENDERS } from '../domain/types.js';
import { COUNTRIES, DEPARTMENTS, EXCHANGE_RATES, LEVELS } from '../db/reference.js';

const currencies = EXCHANGE_RATES.map((r) => r.currency) as [string, ...string[]];
const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const departments = DEPARTMENTS as unknown as [string, ...string[]];
const levels = LEVELS as unknown as [string, ...string[]];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)')
  // Reject syntactically-valid but non-existent calendar dates (e.g. 2026-13-45),
  // which would otherwise sort lexicographically ABOVE real dates and wrongly
  // become an employee's "current" salary.
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Not a valid calendar date');

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum(['name', 'country', 'department', 'level', 'hireDate', 'totalCompUsd'])
    .default('name'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().trim().min(1).max(100).optional(),
  country: z.enum(countryCodes).optional(),
  department: z.enum(departments).optional(),
  level: z.enum(levels).optional(),
  status: z.enum(['active', 'terminated']).optional(),
});

const salaryInput = z.object({
  baseAmount: z.number().nonnegative().max(1_000_000_000),
  currency: z.enum(currencies),
  bonusTargetPct: z.number().min(0).max(200).default(0),
  effectiveDate: isoDate,
  note: z.string().max(500).nullish(),
});

export const createEmployeeSchema = z.object({
  employeeCode: z.string().trim().min(1).max(32),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  country: z.enum(countryCodes),
  department: z.enum(departments),
  jobTitle: z.string().trim().min(1).max(120),
  level: z.enum(levels),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  gender: z.enum(GENDERS),
  managerId: z.number().int().positive().nullable().default(null),
  hireDate: isoDate,
  salary: salaryInput,
});

export const updateEmployeeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(160),
    country: z.enum(countryCodes),
    department: z.enum(departments),
    jobTitle: z.string().trim().min(1).max(120),
    level: z.enum(levels),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    gender: z.enum(GENDERS),
    managerId: z.number().int().positive().nullable(),
    hireDate: isoDate,
    status: z.enum(['active', 'terminated']),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

export const addSalarySchema = salaryInput;

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeSchema>;
export type AddSalaryBody = z.infer<typeof addSalarySchema>;
