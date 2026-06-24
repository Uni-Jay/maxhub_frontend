import { apiClient } from './apiClient';

export interface Course {
  id: number; uuid: string; title: string; courseCode: string;
  description?: string; instructorId?: number; instructorName: string; departmentId?: number;
  duration: number; fee?: number; startDate: string; endDate?: string;
  status: 'Draft' | 'Published' | 'Ongoing' | 'Completed' | 'Cancelled';
  passingScore?: number; maxParticipants?: number; totalEnrollments?: number;
  instructor?: { user: { firstName: string; lastName: string; email: string; avatar?: string } };
  department?: { id: number; name: string };
  modules?: CourseModule[];
  exams?: Exam[];
  createdAt: string; updatedAt: string;
}

export interface CourseModule {
  id: number; uuid: string; courseId: number; title: string;
  description?: string; sequence: number; duration: number; status: string;
  contents?: CourseContent[];
}

export interface CourseContent {
  id: number; title: string; contentType: string; url?: string; sequence: number;
}

export interface Exam {
  id: number; uuid: string; courseId: number; examCode: string; examName: string;
  description?: string; totalQuestions: number; passingScore: number;
  duration: number; attempts: number; status: string;
  questions?: Question[];
}

export interface Question {
  id: number; uuid: string; examId: number; questionType: string;
  questionText: string; points: number; sequence: number;
  options?: any; difficulty: string;
}

export interface Enrollment {
  id: number; uuid: string; courseId: number; staffId: number;
  enrollmentDate: string;
  status: 'Enrolled' | 'InProgress' | 'Completed' | 'Failed' | 'Dropped' | 'OnHold';
  progressPercentage: number; completionDate?: string; notes?: string;
  course?: Course;
}

export interface ExamSession {
  result: { id: number; uuid: string; status: string; attemptNumber: number; startedAt: string };
  questions: Question[];
  duration: number;
}

export interface LmsStats {
  total: number; published: number; ongoing: number; completed: number; totalEnrollments: number;
}

export interface CourseListParams {
  page?: number; limit?: number; search?: string;
  status?: string; departmentId?: number; instructorId?: number;
}

export const lmsService = {
  getAll: (params: CourseListParams = {}) =>
    apiClient.getRaw('/courses', params) as Promise<{
      data: Course[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getStats: () => apiClient.get<LmsStats>('/courses/stats/overview'),

  getById: (id: number | string) => apiClient.get<Course>(`/courses/${id}`),

  create: (payload: Partial<Course> & { title: string; courseCode: string; instructorName: string; duration: number; startDate: string }) =>
    apiClient.post<Course>('/courses', payload),

  update: (id: number | string, payload: Partial<Course>) =>
    apiClient.put<Course>(`/courses/${id}`, payload),

  remove: (id: number | string) => apiClient.delete<null>(`/courses/${id}`),

  getModules: (courseId: number | string) =>
    apiClient.get<CourseModule[]>(`/courses/${courseId}/modules`),

  createModule: (courseId: number | string, payload: Partial<CourseModule>) =>
    apiClient.post<CourseModule>(`/courses/${courseId}/modules`, payload),

  getExams: (courseId: number | string) =>
    apiClient.get<Exam[]>(`/courses/${courseId}/exams`),

  createExam: (courseId: number | string, payload: Partial<Exam>) =>
    apiClient.post<Exam>(`/courses/${courseId}/exams`, payload),

  getExamQuestions: (courseId: number | string, examId: number | string) =>
    apiClient.get<Question[]>(`/courses/${courseId}/exams/${examId}/questions`),

  addQuestion: (courseId: number | string, examId: number | string, payload: Partial<Question> & { correctAnswer: string }) =>
    apiClient.post<Question>(`/courses/${courseId}/exams/${examId}/questions`, payload),

  getCourseEnrollments: (courseId: number | string) =>
    apiClient.get<Enrollment[]>(`/courses/${courseId}/enrollments`),

  getEnrollments: (params: { page?: number; limit?: number; status?: string; courseId?: number } = {}) =>
    apiClient.getRaw('/enrollments', params) as Promise<{
      data: Enrollment[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getMyEnrollments: () => apiClient.get<Enrollment[]>('/enrollments/my'),

  createEnrollment: (courseId: number, staffId: number, notes?: string) =>
    apiClient.post<Enrollment>('/enrollments', { courseId, staffId, notes }),

  updateProgress: (enrollmentId: number | string, progressPercentage: number) =>
    apiClient.patch<Enrollment>(`/enrollments/${enrollmentId}/progress`, { progressPercentage }),

  updateEnrollmentStatus: (enrollmentId: number | string, status: string, notes?: string) =>
    apiClient.patch<Enrollment>(`/enrollments/${enrollmentId}/status`, { status, notes }),

  startExam: (enrollmentId: number | string, examId: number | string) =>
    apiClient.post<ExamSession>(`/enrollments/${enrollmentId}/exams/${examId}/start`, {}),

  submitExam: (enrollmentId: number | string, examId: number | string, answers: Record<string, string>) =>
    apiClient.post<{ score: number; correctAnswers: number; totalQuestions: number; passed: boolean }>
      (`/enrollments/${enrollmentId}/exams/${examId}/submit`, { answers }),
};
