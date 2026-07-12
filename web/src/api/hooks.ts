import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http, toQuery } from './client';
import type {
  CreateEmployeeInput,
  DistributionBucket,
  Employee,
  EmployeeDetail,
  EmployeeListQuery,
  GroupStat,
  Overview,
  Paginated,
  PayEquityRow,
  ReferenceData,
  SalaryInput,
} from './types';

export function useReference() {
  return useQuery({
    queryKey: ['reference'],
    queryFn: () => http.get<ReferenceData>('/reference'),
    staleTime: Infinity,
  });
}

export function useEmployees(query: EmployeeListQuery) {
  return useQuery({
    queryKey: ['employees', query],
    queryFn: () => http.get<Paginated<Employee>>(`/employees${toQuery(query as Record<string, unknown>)}`),
    placeholderData: (prev) => prev, // keep previous page visible while fetching
  });
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => http.get<EmployeeDetail>(`/employees/${id}`),
    enabled: id !== undefined,
  });
}

/** Invalidate the collections that change when any employee/salary mutates. */
function useInvalidateEmployees() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['employees'] });
    qc.invalidateQueries({ queryKey: ['employee'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  };
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => http.post<EmployeeDetail>('/employees', input),
    onSuccess: invalidate,
  });
}

export function useUpdateEmployee(id: number) {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (patch: Partial<CreateEmployeeInput>) =>
      http.patch<EmployeeDetail>(`/employees/${id}`, patch),
    onSuccess: invalidate,
  });
}

export function useAddSalary(id: number) {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (salary: SalaryInput) =>
      http.post<EmployeeDetail>(`/employees/${id}/salaries`, salary),
    onSuccess: invalidate,
  });
}

export function useTerminateEmployee() {
  const invalidate = useInvalidateEmployees();
  return useMutation({
    mutationFn: (id: number) => http.delete<EmployeeDetail>(`/employees/${id}`),
    onSuccess: invalidate,
  });
}

export function useOverview() {
  return useQuery({ queryKey: ['analytics', 'overview'], queryFn: () => http.get<Overview>('/analytics/overview') });
}
export function useByCountry() {
  return useQuery({ queryKey: ['analytics', 'by-country'], queryFn: () => http.get<GroupStat[]>('/analytics/by-country') });
}
export function useByDepartment() {
  return useQuery({ queryKey: ['analytics', 'by-department'], queryFn: () => http.get<GroupStat[]>('/analytics/by-department') });
}
export function useByLevel() {
  return useQuery({ queryKey: ['analytics', 'by-level'], queryFn: () => http.get<GroupStat[]>('/analytics/by-level') });
}
export function useDistribution() {
  return useQuery({ queryKey: ['analytics', 'distribution'], queryFn: () => http.get<DistributionBucket[]>('/analytics/distribution') });
}
export function usePayEquity(filter: { department?: string; level?: string } = {}) {
  return useQuery({
    queryKey: ['analytics', 'pay-equity', filter],
    queryFn: () => http.get<PayEquityRow[]>(`/analytics/pay-equity${toQuery(filter)}`),
  });
}
