import { apiClient } from './apiClient';

export interface PayrollPeriod {
  id: number; uuid: string; periodCode: string; periodName: string;
  month: number; year: number; startDate: string; endDate: string;
  salaryProcessDate: string; bankTransferDate?: string;
  status: 'Draft' | 'Processing' | 'Processed' | 'Approved' | 'Transferred' | 'Closed';
  remarks?: string; createdAt: string;
}

export interface EmployeeSalary {
  id: number; uuid: string; salaryCode: string;
  payrollPeriodId: number; staffId: number;
  baseSalary: number; bonus: number; grossSalary: number;
  incomeTax: number; providentFund: number; healthInsurance: number;
  otherDeductions: number; advanceAmount: number; totalDeductions: number;
  totalEarnings: number; netSalary: number;
  status: 'Draft' | 'Approved' | 'Processed' | 'Paid' | 'OnHold';
  bankAccountNumber?: string; remarks?: string;
  paidOn?: string; processedOn?: string;
  staff?: { id: number; employeeId?: string; firstName: string; lastName: string; email: string };
  payrollPeriod?: { id: number; periodCode: string; periodName: string; month: number; year: number; status: string };
}

export interface SalaryStructure {
  id: number; uuid: string; code: string; name: string; description?: string;
  baseSalary: number; status: 'Active' | 'Inactive';
  applicableFromDate: string; applicableToDate?: string;
  departmentId?: number; designationId?: number;
  department?: { id: number; name: string }; designation?: { id: number; name: string };
}

export interface PayrollOverview {
  currentPeriod: { id: number; periodCode: string; status: string } | null;
  currentMonth: { headcount: number; totalGross: number; totalNet: number; totalDeductions: number; avgNet: number };
  activeHeadcount: number;
  yearToDate: { ytdNet: number; ytdGross: number };
  statusSummary: Record<string, number>;
}

export interface PeriodListParams {
  page?: number; limit?: number; status?: string; year?: number;
}

export interface SalaryListParams {
  page?: number; limit?: number; periodId?: number; staffId?: number; status?: string; search?: string;
}

export interface UploadSummary {
  periodCode: string;
  summary: { created: number; updated: number; skipped: number; errors: Array<{ row: number; reason: string }> };
}

export const payrollService = {
  getOverview: () => apiClient.get<PayrollOverview>('/payroll/stats/overview'),

  getPeriods: (params: PeriodListParams = {}) =>
    apiClient.getRaw('/payroll/periods', params) as Promise<{
      data: PayrollPeriod[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getPeriodById: (id: number | string) => apiClient.get<PayrollPeriod & { salaryStats?: Record<string, any> }>(`/payroll/periods/${id}`),

  createPeriod: (payload: { month: number; year: number; startDate: string; endDate: string; salaryProcessDate?: string; bankTransferDate?: string; remarks?: string }) =>
    apiClient.post<PayrollPeriod>('/payroll/periods', payload),

  updatePeriodStatus: (id: number | string, status: string) =>
    apiClient.patch<PayrollPeriod>(`/payroll/periods/${id}/status`, { status }),

  processPeriod: (id: number | string) =>
    apiClient.post<{ periodCode: string; status: string; summary: any }>(`/payroll/periods/${id}/process`, {}),

  /** Bulk salary upload for a pay period — admin/hr only. `file` must be a .csv Blob/File. */
  uploadSalaries: (id: number | string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<UploadSummary>(`/payroll/periods/${id}/upload`, form);
  },

  getSalaries: (params: SalaryListParams = {}) =>
    apiClient.getRaw('/payroll/salaries', params) as Promise<{
      data: EmployeeSalary[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getSalaryById: (id: number | string) => apiClient.get<EmployeeSalary>(`/payroll/salaries/${id}`),

  updateSalary: (id: number | string, payload: Partial<EmployeeSalary>) =>
    apiClient.patch<EmployeeSalary>(`/payroll/salaries/${id}`, payload),

  updateSalaryStatus: (id: number | string, status: string) =>
    apiClient.patch<EmployeeSalary>(`/payroll/salaries/${id}/status`, { status }),

  getStructures: (params: { status?: string; departmentId?: number; designationId?: number } = {}) =>
    apiClient.get<SalaryStructure[]>('/payroll/structures', params),

  createStructure: (payload: {
    code: string; name: string; description?: string; baseSalary: number;
    status?: 'Active' | 'Inactive'; applicableFromDate: string; applicableToDate?: string;
    departmentId?: number; designationId?: number;
  }) => apiClient.post<SalaryStructure>('/payroll/structures', payload),

  updateStructure: (id: number | string, payload: Partial<SalaryStructure>) =>
    apiClient.put<SalaryStructure>(`/payroll/structures/${id}`, payload),

  deleteStructure: (id: number | string) => apiClient.delete<null>(`/payroll/structures/${id}`),
};
