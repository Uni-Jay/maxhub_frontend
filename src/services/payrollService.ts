import { apiClient } from './apiClient';

export interface PayrollPeriod {
  id: number; uuid: string; periodCode: string; periodName: string;
  month: number; year: number; startDate: string; endDate: string;
  status: 'Draft' | 'Processing' | 'Processed' | 'Paid' | 'Cancelled';
  processedAt?: string; salaryCount?: number; totalNetPayout?: number;
  createdAt: string;
}

export interface EmployeeSalary {
  id: number; uuid: string; salaryCode: string; periodId: number; staffId: number;
  baseSalary: number; bonus: number; grossSalary: number;
  incomeTax: number; providentFund: number; healthInsurance: number;
  otherDeductions: number; totalDeductions: number; netSalary: number;
  status: 'Draft' | 'Approved' | 'Processed' | 'Paid';
  paidAt?: string; notes?: string;
  staff?: { user: { firstName: string; lastName: string; avatar?: string } };
  period?: PayrollPeriod;
}

export interface SalaryStructure {
  id: number; uuid: string; structureName: string;
  baseSalary: number; bonus: number; incomeTax: number;
  providentFund: number; healthInsurance: number; isDefault: boolean;
  departmentId?: number; designationId?: number;
  department?: { name: string }; designation?: { title: string };
}

export interface PayrollOverview {
  activePeriod?: PayrollPeriod;
  totalStaff: number; processedSalaries: number;
  totalNetPayout: number; pendingApprovals: number;
}

export interface PeriodListParams {
  page?: number; limit?: number; status?: string; year?: number;
}

export interface SalaryListParams {
  page?: number; limit?: number; periodId?: number; staffId?: number; status?: string;
}

export const payrollService = {
  getOverview: () => apiClient.get<PayrollOverview>('/payroll/overview'),

  getPeriods: (params: PeriodListParams = {}) =>
    apiClient.getRaw('/payroll/periods', params) as Promise<{
      data: PayrollPeriod[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getPeriodById: (id: number | string) => apiClient.get<PayrollPeriod>(`/payroll/periods/${id}`),

  createPeriod: (payload: { periodName: string; month: number; year: number; startDate: string; endDate: string }) =>
    apiClient.post<PayrollPeriod>('/payroll/periods', payload),

  updatePeriodStatus: (id: number | string, status: string) =>
    apiClient.patch<PayrollPeriod>(`/payroll/periods/${id}/status`, { status }),

  processPeriod: (id: number | string) =>
    apiClient.post<{ processed: number }>(`/payroll/periods/${id}/process`, {}),

  getSalaries: (params: SalaryListParams = {}) =>
    apiClient.getRaw('/payroll/salaries', params) as Promise<{
      data: EmployeeSalary[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getSalaryById: (id: number | string) => apiClient.get<EmployeeSalary>(`/payroll/salaries/${id}`),

  createSalary: (payload: Partial<EmployeeSalary> & { periodId: number; staffId: number; baseSalary: number }) =>
    apiClient.post<EmployeeSalary>('/payroll/salaries', payload),

  updateSalaryStatus: (id: number | string, status: string) =>
    apiClient.patch<EmployeeSalary>(`/payroll/salaries/${id}/status`, { status }),

  getStructures: () => apiClient.get<SalaryStructure[]>('/payroll/structures'),

  createStructure: (payload: Partial<SalaryStructure> & { structureName: string; baseSalary: number }) =>
    apiClient.post<SalaryStructure>('/payroll/structures', payload),

  updateStructure: (id: number | string, payload: Partial<SalaryStructure>) =>
    apiClient.put<SalaryStructure>(`/payroll/structures/${id}`, payload),

  deleteStructure: (id: number | string) => apiClient.delete<null>(`/payroll/structures/${id}`),
};
