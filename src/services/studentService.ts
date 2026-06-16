import { apiClient } from './apiClient';

const BASE = '/students';

export interface StudentProfile {
  id: string;
  uuid: string;
  userId: string;
  studentNumber: string;
  programId?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  state?: string;
  guardianName?: string;
  guardianPhone?: string;
  enrollmentDate?: string;
  status: string;
  program?: { id: string; name: string; code: string; level: string };
  user?: { id: string; firstName: string; lastName: string; email: string; phone?: string; avatar?: string };
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  progressPercentage: number;
  grade?: string;
  enrolledAt: string;
  isCertificateIssued: boolean;
  course?: { id: string; title: string; description: string; thumbnail?: string };
}

export interface StudentResult {
  id: string;
  studentId: string;
  type: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  passed: boolean;
  gradedAt: string;
  feedback?: string;
  status?: 'Pending' | 'Graded' | 'Published' | 'Appealed';
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  checkInTime?: string;
  minutesLate?: number;
  excuseReason?: string;
}

export interface StudentAnalytics {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  avgScore: number;
  passedExams: number;
  totalExams: number;
  passRate: number;
  attendancePct: number;
  certificatesEarned: number;
}

// Admin endpoints
export const studentApi = {
  register: (data: Record<string, unknown>) => apiClient.post(BASE, data),
  list: (params?: Record<string, unknown>) => apiClient.get(BASE, { params }),
  getById: (id: string) => apiClient.get(`${BASE}/${id}`),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`${BASE}/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`${BASE}/${id}/status`, { status, notes }),
  enroll: (id: string, courseId: string) => apiClient.post(`${BASE}/${id}/enroll`, { courseId }),
  getEnrollments: (id: string) => apiClient.get(`${BASE}/${id}/enrollments`),
  markAttendance: (data: Record<string, unknown>) => apiClient.post(`${BASE}/attendance/mark`, data),
  getAttendance: (id: string, params?: Record<string, unknown>) =>
    apiClient.get(`${BASE}/${id}/attendance`, { params }),
  recordResult: (id: string, data: Record<string, unknown>) =>
    apiClient.post(`${BASE}/${id}/results`, data),
  getResults: (id: string, params?: Record<string, unknown>) =>
    apiClient.get(`${BASE}/${id}/results`, { params }),
  getAnalytics: (id: string) => apiClient.get(`${BASE}/${id}/analytics`),
};

// Student portal (self-service) endpoints
export const studentPortalApi = {
  getProfile: () => apiClient.get(`${BASE}/portal/me`),
  updateProfile: (data: Record<string, unknown>) => apiClient.patch(`${BASE}/portal/me`, data),
  getEnrollments: () => apiClient.get(`${BASE}/portal/enrollments`),
  getAttendance: (params?: Record<string, unknown>) =>
    apiClient.get(`${BASE}/portal/attendance`, { params }),
  getResults: (params?: Record<string, unknown>) =>
    apiClient.get(`${BASE}/portal/results`, { params }),
  getAnalytics: () => apiClient.get(`${BASE}/portal/analytics`),
  getSchedule: () => apiClient.get(`${BASE}/portal/schedule`),
};
