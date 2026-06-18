/**
 * Dashboard API Services
 * Fetch dashboard data from backend
 */

import { apiClient } from './apiClient';

export interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  attendanceRate: number;
  activeProjects: number;
  pendingApprovals?: number;
  averageAttendance?: number;
}

export interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  target: number;
}

export interface PayrollData {
  category: string;
  amount: number;
}

export interface DepartmentData {
  name: string;
  count: number;
  average_salary?: number;
}

export interface ProjectData {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'on_hold' | 'delayed';
  progress: number;
  team_members: number;
}

export interface LeaveApprovalData {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  request_date: string;
}

export interface StaffData {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: 'active' | 'on_leave' | 'inactive';
  joining_date: string;
  manager?: string;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
}

export interface CRMMetrics {
  totalLeads: number;
  totalOpportunities: number;
  convertedDeals: number;
  lostDeals: number;
  conversionRate: number;
}

export interface StudentAnalytics {
  totalEnrolled: number;
  activeStudents: number;
  completedCourses: number;
  droppedStudents: number;
}

export interface ApprovalsQueue {
  weeklyReports: { count: number; items: any[] };
  leaveRequests: { count: number; items: any[] };
  promotions: { count: number; items: any[] };
  jobPostings: { count: number; items: any[] };
}

/**
 * Super Admin Dashboard Services
 */
export const superAdminDashboardService = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    return apiClient.get('/dashboards/super-admin/stats');
  },

  // Get attendance data for chart
  getAttendanceData: async (days: number = 7): Promise<AttendanceData[]> => {
    return apiClient.get(`/dashboards/super-admin/attendance?days=${days}`);
  },

  // Get revenue analytics
  getRevenueAnalytics: async (months: number = 6): Promise<RevenueData[]> => {
    return apiClient.get(`/dashboards/super-admin/revenue?months=${months}`);
  },

  // Get payroll summary
  getPayrollSummary: async (year?: number, month?: number): Promise<PayrollData[]> => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    return apiClient.get(`/dashboards/super-admin/payroll?${params.toString()}`);
  },

  // Get department distribution
  getDepartmentDistribution: async (): Promise<DepartmentData[]> => {
    return apiClient.get('/dashboards/super-admin/departments');
  },

  // Get student analytics
  getStudentAnalytics: async (): Promise<StudentAnalytics> => {
    return apiClient.get('/dashboards/super-admin/students');
  },

  // Get project status overview
  getProjectStatus: async (): Promise<ProjectData[]> => {
    return apiClient.get('/dashboards/super-admin/projects');
  },

  // Get CRM overview
  getCRMMetrics: async (): Promise<CRMMetrics> => {
    return apiClient.get('/dashboards/super-admin/crm');
  },

  // Get notifications
  getNotifications: async (limit: number = 5): Promise<NotificationData[]> => {
    return apiClient.get(`/dashboards/super-admin/notifications?limit=${limit}`);
  },

  // Get the consolidated pending-approvals queue (weekly reports, leave, promotions, job postings)
  getApprovalsQueue: async (): Promise<ApprovalsQueue> => {
    return apiClient.get('/dashboards/super-admin/approvals-queue');
  },

  // Get calendar events
  getCalendarEvents: async (startDate?: string, endDate?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiClient.get(`/dashboards/super-admin/events?${params.toString()}`);
  },
};

/**
 * Head of Admin Dashboard Services
 */
export const headOfAdminDashboardService = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    return apiClient.get('/dashboards/head-of-admin/stats');
  },

  // Get staff list
  getStaffList: async (page: number = 1, limit: number = 10): Promise<any> => {
    return apiClient.get(`/dashboards/head-of-admin/staff?page=${page}&limit=${limit}`);
  },

  // Get pending leave approvals
  getPendingLeaveApprovals: async (): Promise<LeaveApprovalData[]> => {
    return apiClient.get('/dashboards/head-of-admin/leave-approvals/pending');
  },

  // Get all leave approvals with filters
  getLeaveApprovals: async (status?: string, month?: number): Promise<LeaveApprovalData[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (month) params.append('month', month.toString());
    return apiClient.get(`/dashboards/head-of-admin/leave-approvals?${params.toString()}`);
  },

  // Approve leave request
  approveLeave: async (leaveId: string, remarks?: string): Promise<any> => {
    return apiClient.post(`/dashboards/head-of-admin/leave-approvals/${leaveId}/approve`, { remarks });
  },

  // Reject leave request
  rejectLeave: async (leaveId: string, reason: string): Promise<any> => {
    return apiClient.post(`/dashboards/head-of-admin/leave-approvals/${leaveId}/reject`, { reason });
  },

  // Get attendance reports
  getAttendanceReports: async (departmentId?: string, dateRange?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (departmentId) params.append('department_id', departmentId);
    if (dateRange) params.append('date_range', dateRange);
    return apiClient.get(`/dashboards/head-of-admin/attendance-reports?${params.toString()}`);
  },

  // Get department KPIs
  getDepartmentKPIs: async (): Promise<any[]> => {
    return apiClient.get('/dashboards/head-of-admin/department-kpis');
  },

  // Get project status for department
  getProjectStatus: async (departmentId?: string): Promise<ProjectData[]> => {
    const params = departmentId ? `?department_id=${departmentId}` : '';
    return apiClient.get(`/dashboards/head-of-admin/projects${params}`);
  },

  // Get internal communications
  getInternalCommunications: async (limit: number = 10): Promise<any[]> => {
    return apiClient.get(`/dashboards/head-of-admin/communications?limit=${limit}`);
  },

  // Get leave summary
  getLeaveSummary: async (month?: number): Promise<any> => {
    const params = month ? `?month=${month}` : '';
    return apiClient.get(`/dashboards/head-of-admin/leave-summary${params}`);
  },
};

/**
 * Common Dashboard Utilities
 */
export const dashboardService = {
  // Export dashboard as PDF
  exportDashboard: async (dashboardType: 'super-admin' | 'head-of-admin', format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> => {
    return apiClient.getRaw(`/dashboards/${dashboardType}/export?format=${format}`);
  },

  // Get dashboard widgets configuration
  getWidgetsConfig: async (dashboardType: string): Promise<any[]> => {
    return apiClient.get(`/dashboards/${dashboardType}/widgets-config`);
  },

  // Save widget preferences (order, visibility)
  saveWidgetPreferences: async (dashboardType: string, preferences: any): Promise<any> => {
    return apiClient.post(`/dashboards/${dashboardType}/widgets-config`, preferences);
  },

  // Get dashboard comparison data
  getComparison: async (period1: string, period2: string): Promise<any> => {
    return apiClient.get(`/dashboards/comparison?period1=${period1}&period2=${period2}`);
  },
};

export default {
  superAdminDashboardService,
  headOfAdminDashboardService,
  dashboardService,
};
