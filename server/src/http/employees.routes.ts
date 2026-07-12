import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db/connection.js';
import { EmployeeService } from '../services/employee.service.js';
import { asyncHandler } from './middleware.js';
import { BadRequest } from './errors.js';
import {
  addSalarySchema,
  createEmployeeSchema,
  listQuerySchema,
  updateEmployeeSchema,
} from './validation.js';

const idParam = z.coerce.number().int().positive();

function parseId(raw: string | undefined): number {
  const result = idParam.safeParse(raw);
  if (!result.success) throw BadRequest('Invalid employee id');
  return result.data;
}

export function employeesRouter(db: DB): Router {
  const service = new EmployeeService(db);
  const router = Router();

  router.get(
    '/',
    asyncHandler((req, res) => {
      const query = listQuerySchema.parse(req.query);
      res.json(service.list(query));
    }),
  );

  router.get(
    '/:id',
    asyncHandler((req, res) => {
      res.json(service.get(parseId(req.params.id)));
    }),
  );

  router.post(
    '/',
    asyncHandler((req, res) => {
      const body = createEmployeeSchema.parse(req.body);
      res.status(201).json(service.create(body));
    }),
  );

  router.patch(
    '/:id',
    asyncHandler((req, res) => {
      const body = updateEmployeeSchema.parse(req.body);
      res.json(service.update(parseId(req.params.id), body));
    }),
  );

  router.post(
    '/:id/salaries',
    asyncHandler((req, res) => {
      const body = addSalarySchema.parse(req.body);
      res.status(201).json(service.addSalary(parseId(req.params.id), body));
    }),
  );

  router.delete(
    '/:id',
    asyncHandler((req, res) => {
      res.json(service.terminate(parseId(req.params.id)));
    }),
  );

  return router;
}
