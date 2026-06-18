import { apiClient } from './apiClient';

export type BusinessUnitCode = 'KS' | 'VM' | 'BM';
export const BUSINESS_UNIT_LABELS: Record<BusinessUnitCode, string> = {
  KS: 'Kurios SAT', VM: 'VisaMax Travels', BM: 'BeadMax',
};

export interface JobPosting {
  id: number; uuid: string; jobCode: string; title: string; description?: string;
  departmentId: number; designationId?: number; noOfPositions: number;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship';
  salaryMin?: number; salaryMax?: number; currency?: string; location?: string;
  requiredExperience?: string; qualifications?: string; skills?: string; benefits?: string;
  postedDate: string; closingDate: string;
  status: 'Draft' | 'Open' | 'Closed' | 'OnHold' | 'Filled';
  applicationCount?: number;
  department?: { name: string }; designation?: { name: string };
  businessUnit?: BusinessUnitCode;
  syncStatus?: 'Pending' | 'Synced' | 'Failed';
  externalJobId?: string;
  syncAttempts?: number;
  lastSyncedAt?: string;
  lastSyncError?: string;
  createdAt: string;
}

export interface JobSyncLog {
  id: number; uuid: string; jobPostingId: number; businessUnit: string;
  action: 'Create' | 'Update' | 'Delete'; status: 'Success' | 'Failed';
  httpStatusCode?: number; errorMessage?: string; attemptNumber: number;
  createdAt: string;
}

export interface JobApplication {
  id: number; uuid: string; jobPostingId: number; contactId?: number;
  applicantName: string; applicantEmail: string; applicantPhone: string;
  resumeUrl?: string; coverLetterUrl?: string; applicationDate: string;
  status: 'Applied' | 'Shortlisted' | 'Rejected' | 'Interviewed' | 'Offered' | 'Withdrawn';
  source?: string; notes?: string;
  jobPosting?: JobPosting;
  createdAt: string;
}

export interface Appraisal {
  id: number; uuid: string; appraisalCode: string; staffId: number;
  appraisalPeriod: string; appraisalDate: string; reviewerUserId: number;
  overallRating: number; performanceNotes?: string; strengths?: string; improvements?: string;
  status: 'Draft' | 'InProgress' | 'Completed' | 'Approved' | 'Rejected';
  completedDate?: string; approvedBy?: number; approvedDate?: string;
  staff?: { user: { firstName: string; lastName: string; avatar?: string } };
  createdAt: string;
}

export interface TrainingProgram {
  id: number; uuid: string; trainingCode: string; trainingName: string;
  description?: string;
  trainingType: 'Mandatory' | 'Optional' | 'InductionProgram' | 'SkillDevelopment' | 'Leadership';
  duration: number; durationUnit: 'Days' | 'Weeks' | 'Months' | 'Hours';
  provider?: string; location?: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Cancelled';
  startDate: string; endDate: string; budget?: number;
  approvedAt?: string; approvedById?: number;
  createdAt: string;
}

export interface EmployeePromotion {
  id: number; uuid: string; staffId: number;
  fromDesignationId: number; toDesignationId: number;
  fromDepartmentId?: number; toDepartmentId?: number;
  promotionDate: string; effectiveDate: string; reason?: string;
  promotedBy: number; salaryIncreasePercentage?: number; newSalary?: number;
  status: 'Proposed' | 'Approved' | 'Rejected' | 'Effective' | 'Completed';
  approvalDate?: string; approvalRemarks?: string; rejectionReason?: string;
  staff?: { firstName: string; lastName: string; employeeId?: string };
  fromDesignation?: { id: number; name: string };
  toDesignation?: { id: number; name: string };
  createdAt: string;
}

export interface TrainingAttendance {
  id: number; trainingProgramId: number; staffId: number;
  attendanceDate: string; status: 'Present' | 'Absent' | 'Late'; notes?: string;
  staff?: { user: { firstName: string; lastName: string } };
}

export interface JobPostingListParams { page?: number; limit?: number; status?: string; departmentId?: number; jobType?: string; search?: string; }
export interface AppraisalListParams { page?: number; limit?: number; status?: string; staffId?: number; appraisalPeriod?: string; search?: string; }
export interface TrainingListParams { page?: number; limit?: number; status?: string; trainingType?: string; search?: string; }

export const hrService = {
  // Job Postings
  getJobPostings: (params: JobPostingListParams = {}) =>
    apiClient.getRaw('/job-postings', params) as Promise<{ data: JobPosting[]; pagination: any }>,

  getJobPostingStats: () => apiClient.get<{ total: number; open: number; closed: number; filled: number; onHold: number; totalApplications: number }>('/job-postings/stats/overview'),

  getJobPostingById: (id: number | string) => apiClient.get<JobPosting>(`/job-postings/${id}`),

  createJobPosting: (payload: Partial<JobPosting> & { title: string; departmentId: number; noOfPositions: number; jobType: string; postedDate: string; closingDate: string; businessUnit: BusinessUnitCode }) =>
    apiClient.post<JobPosting>('/job-postings', payload),

  updateJobPosting: (id: number | string, payload: Partial<JobPosting>) =>
    apiClient.put<JobPosting>(`/job-postings/${id}`, payload),

  updateJobPostingStatus: (id: number | string, status: string) =>
    apiClient.patch<JobPosting>(`/job-postings/${id}/status`, { status }),

  deleteJobPosting: (id: number | string) => apiClient.delete<null>(`/job-postings/${id}`),

  // Job Applications
  getApplications: (params: { page?: number; limit?: number; status?: string; jobPostingId?: number; search?: string } = {}) =>
    apiClient.getRaw('/job-applications', params) as Promise<{ data: JobApplication[]; pagination: any }>,

  getApplicationById: (id: number | string) => apiClient.get<JobApplication>(`/job-applications/${id}`),

  createApplication: (payload: { jobPostingId: number; applicantName: string; applicantEmail: string; applicantPhone: string; source?: string }) =>
    apiClient.post<JobApplication>('/job-applications', payload),

  updateApplicationStatus: (id: number | string, status: string, notes?: string) =>
    apiClient.patch<JobApplication>(`/job-applications/${id}/status`, { status, notes }),

  // Appraisals
  getAppraisals: (params: AppraisalListParams = {}) =>
    apiClient.getRaw('/appraisals', params) as Promise<{ data: Appraisal[]; pagination: any }>,

  getAppraisalStats: () => apiClient.get<{ total: number; pending: number; completed: number; avgRating: number }>('/appraisals/stats/overview'),

  getAppraisalById: (id: number | string) => apiClient.get<Appraisal>(`/appraisals/${id}`),

  createAppraisal: (payload: Partial<Appraisal> & { staffId: number; appraisalPeriod: string; appraisalDate: string; reviewerUserId: number; overallRating: number }) =>
    apiClient.post<Appraisal>('/appraisals', payload),

  updateAppraisal: (id: number | string, payload: Partial<Appraisal>) =>
    apiClient.put<Appraisal>(`/appraisals/${id}`, payload),

  updateAppraisalStatus: (id: number | string, status: string) =>
    apiClient.patch<Appraisal>(`/appraisals/${id}/status`, { status }),

  // Training
  getTrainingPrograms: (params: TrainingListParams = {}) =>
    apiClient.getRaw('/training', params) as Promise<{ data: TrainingProgram[]; pagination: any }>,

  getTrainingStats: () => apiClient.get<{ total: number; active: number; completed: number; totalBudget: number }>('/training/stats/overview'),

  getTrainingById: (id: number | string) => apiClient.get<TrainingProgram>(`/training/${id}`),

  createTrainingProgram: (payload: Partial<TrainingProgram> & { trainingName: string; trainingType: string; duration: number; durationUnit: string; startDate: string; endDate: string }) =>
    apiClient.post<TrainingProgram>('/training', payload),

  updateTraining: (id: number | string, payload: Partial<TrainingProgram>) =>
    apiClient.put<TrainingProgram>(`/training/${id}`, payload),

  updateTrainingStatus: (id: number | string, status: string) =>
    apiClient.patch<TrainingProgram>(`/training/${id}/status`, { status }),

  deleteTrainingProgram: (id: number | string) => apiClient.delete<null>(`/training/${id}`),

  getAttendance: (trainingId: number | string) =>
    apiClient.get<TrainingAttendance[]>(`/training/${trainingId}/attendance`),

  recordAttendance: (trainingId: number | string, payload: { staffId: number; attendanceDate: string; status: string; notes?: string }) =>
    apiClient.post<TrainingAttendance>(`/training/${trainingId}/attendance`, payload),

  // Job Sync Dashboard
  getJobSyncStats: () => apiClient.get<{ total: number; synced: number; pending: number; failed: number }>('/job-sync/stats'),

  getJobSyncList: (params: { page?: number; limit?: number; syncStatus?: string; businessUnit?: string } = {}) =>
    apiClient.getRaw('/job-sync', params) as Promise<{ data: JobPosting[]; pagination: any }>,

  retryJobSync: (id: number | string) => apiClient.patch<JobPosting>(`/job-sync/${id}/retry`, {}),

  getJobSyncLogs: (id: number | string) => apiClient.get<JobSyncLog[]>(`/job-sync/${id}/logs`),

  // Promotions
  getPromotions: (status?: string) =>
    apiClient.get<EmployeePromotion[]>('/promotions', status ? { status } : undefined),

  createPromotion: (payload: { staffId: number; toDesignationId: number; toDepartmentId?: number; effectiveDate: string; reason?: string; salaryIncreasePercentage?: number; newSalary?: number }) =>
    apiClient.post<EmployeePromotion>('/promotions', payload),

  approvePromotion: (id: number | string, approvalRemarks?: string) =>
    apiClient.patch<EmployeePromotion>(`/promotions/${id}/approve`, { approvalRemarks }),

  rejectPromotion: (id: number | string, rejectionReason?: string) =>
    apiClient.patch<EmployeePromotion>(`/promotions/${id}/reject`, { rejectionReason }),

  deletePromotion: (id: number | string) => apiClient.delete<null>(`/promotions/${id}`),
};
