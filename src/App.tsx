import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '@layouts/AuthLayout';
import DashboardLayout from '@layouts/DashboardLayout';
import StudentPortalLayout from '@layouts/StudentPortalLayout';
import { PrivateRoute, StudentRoute, PublicRoute, SuperAdminRoute } from '@routes/PrivateRoute';
import { Toaster } from '@components/ui/toaster';

// ─── Auth Pages ───
const LoginPage = React.lazy(() => import('@modules/auth/pages/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('@modules/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@modules/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('@modules/auth/pages/VerifyEmailPage'));
const Setup2FAPage = React.lazy(() => import('@modules/auth/pages/Setup2FAPage'));

// ─── Dashboard (smart redirect) ───
const Dashboard = React.lazy(() => import('@pages/Dashboard'));

// ─── Role-specific dashboards (5 roles only) ───
const SuperAdminDashboard  = React.lazy(() => import('@pages/dashboards/SuperAdminDashboard'));
const AdminDashboard       = React.lazy(() => import('@pages/dashboards/HeadOfAdminDashboard'));
const HRDashboard          = React.lazy(() => import('@pages/dashboards/HRDashboard'));
const HODDashboard         = React.lazy(() => import('@pages/dashboards/HODDashboard'));
const StaffDashboard       = React.lazy(() => import('@pages/dashboards/StaffDashboard'));
// ─── Position-specific staff dashboards (not RBAC roles — gated on Staff.position) ───
const AccountantDashboard   = React.lazy(() => import('@pages/dashboards/AccountantDashboard'));
const ReceptionistDashboard = React.lazy(() => import('@pages/dashboards/ReceptionistDashboard'));

// ─── Staff ───
const StaffList = React.lazy(() => import('@modules/staff/pages/StaffList'));
const StaffForm = React.lazy(() => import('@modules/staff/pages/StaffForm'));
const StaffDetail = React.lazy(() => import('@modules/staff/pages/StaffDetail'));

// ─── Organization ───
const BranchList = React.lazy(() => import('@modules/organization/pages/BranchList'));
const UnitList = React.lazy(() => import('@modules/organization/pages/UnitList'));
const DepartmentList = React.lazy(() => import('@modules/organization/pages/DepartmentList'));
const DesignationList = React.lazy(() => import('@modules/organization/pages/DesignationList'));

// ─── Attendance ───
const AttendanceList = React.lazy(() => import('@modules/attendance/pages/AttendanceList'));
const CheckIn = React.lazy(() => import('@modules/attendance/pages/CheckIn'));
const ManualAttendance = React.lazy(() => import('@modules/attendance/pages/ManualAttendance'));

// ─── Projects ───
const ProjectList = React.lazy(() => import('@modules/projects/pages/ProjectList'));
const ProjectForm = React.lazy(() => import('@modules/projects/pages/ProjectForm'));
const ProjectDetail = React.lazy(() => import('@modules/projects/pages/ProjectDetail'));

// ─── Tasks ───
const TaskList = React.lazy(() => import('@modules/tasks/pages/TaskList'));
const TaskForm = React.lazy(() => import('@modules/tasks/pages/TaskForm'));
const TaskDetail = React.lazy(() => import('@modules/tasks/pages/TaskDetail'));

// ─── Leave ───
const LeaveForm = React.lazy(() => import('@modules/leave/pages/LeaveForm'));
const LeaveRequests = React.lazy(() => import('@modules/leave/pages/LeaveRequests'));
const LeaveBalance = React.lazy(() => import('@modules/leave/pages/LeaveBalance'));

// ─── Queries ───
const QueryList = React.lazy(() => import('@modules/queries/pages/QueryList'));
const QueryForm = React.lazy(() => import('@modules/queries/pages/QueryForm'));
const QueryDetail = React.lazy(() => import('@modules/queries/pages/QueryDetail'));

// ─── Clients ───
const ClientList = React.lazy(() => import('@modules/clients/pages/ClientList'));
const ClientForm = React.lazy(() => import('@modules/clients/pages/ClientForm'));
const ClientProfile = React.lazy(() => import('@modules/clients/pages/ClientProfile'));

// ─── Communication ───
const SendMessage = React.lazy(() => import('@modules/communication/pages/SendMessage'));
const MessageTemplates = React.lazy(() => import('@modules/communication/pages/MessageTemplates'));
const BroadcastList = React.lazy(() => import('@modules/communication/pages/BroadcastList'));
const CommunicationHistory = React.lazy(() => import('@modules/communication/pages/CommunicationHistory'));

// ─── LMS ───
const CourseList = React.lazy(() => import('@modules/lms/pages/CourseList'));
const CourseDetail = React.lazy(() => import('@modules/lms/pages/CourseDetail'));
const MyEnrollments = React.lazy(() => import('@modules/lms/pages/MyEnrollments'));
const ExamList = React.lazy(() => import('@modules/lms/pages/ExamList'));
const CertificateList = React.lazy(() => import('@modules/lms/pages/CertificateList'));

// ─── Settings ───
const ProfileSettings = React.lazy(() => import('@pages/Settings/ProfileSettings'));
const SecuritySettings = React.lazy(() => import('@pages/Settings/SecuritySettings'));
const NotificationSettings = React.lazy(() => import('@pages/Settings/NotificationSettings'));

// ─── Student Portal ───
const StudentDashboardPage    = React.lazy(() => import('@modules/student/pages/StudentDashboardPage'));
const StudentCoursesPage      = React.lazy(() => import('@modules/student/pages/StudentCoursesPage'));
const StudentAssignmentsPage  = React.lazy(() => import('@modules/student/pages/StudentAssignmentsPage'));
const StudentExamsPage        = React.lazy(() => import('@modules/student/pages/StudentExamsPage'));
const StudentResultsPage      = React.lazy(() => import('@modules/student/pages/StudentResultsPage'));
const StudentAttendancePage   = React.lazy(() => import('@modules/student/pages/StudentAttendancePage'));
const StudentSchedulePage     = React.lazy(() => import('@modules/student/pages/StudentSchedulePage'));
const StudentCertificatesPage = React.lazy(() => import('@modules/student/pages/StudentCertificatesPage'));
const StudentMessagesPage     = React.lazy(() => import('@modules/student/pages/StudentMessagesPage'));
const StudentProfilePage      = React.lazy(() => import('@modules/student/pages/StudentProfilePage'));

// ─── Payroll ───
const PayrollDashboard = React.lazy(() => import('@modules/payroll/pages/PayrollDashboard'));
const PayrollPeriods = React.lazy(() => import('@modules/payroll/pages/PayrollPeriods'));
const PayrollSlips = React.lazy(() => import('@modules/payroll/pages/PayrollSlips'));
const SalaryStructures = React.lazy(() => import('@modules/payroll/pages/SalaryStructures'));
const MyPayslips = React.lazy(() => import('@modules/payroll/pages/MyPayslips'));

// ─── CRM ───
const ContactList = React.lazy(() => import('@modules/crm/pages/ContactList'));
const OpportunityPipeline = React.lazy(() => import('@modules/crm/pages/OpportunityPipeline'));
const SalesForecasting = React.lazy(() => import('@modules/crm/pages/SalesForecasting'));

// ─── Inventory ───
const ItemList = React.lazy(() => import('@modules/inventory/pages/ItemList'));
const WarehouseList = React.lazy(() => import('@modules/inventory/pages/WarehouseList'));

// ─── HR ───
const JobPostingsList = React.lazy(() => import('@modules/hr/pages/JobPostingsList'));
const JobSyncDashboard = React.lazy(() => import('@modules/hr/pages/JobSyncDashboard'));
const AppraisalList = React.lazy(() => import('@modules/hr/pages/AppraisalList'));
const PromotionsList = React.lazy(() => import('@modules/hr/pages/PromotionsList'));
const TrainingList = React.lazy(() => import('@modules/hr/pages/TrainingList'));

// ─── Messaging ───
const MessagingPage = React.lazy(() => import('@modules/messaging/pages/MessagingPage'));

// ─── Video Calls ───
const VideoCallHub = React.lazy(() => import('@modules/videocall/pages/VideoCallHub'));

// ─── Calendar ───
const CalendarPage = React.lazy(() => import('@modules/calendar/pages/CalendarPage'));

// ─── Notifications ───
const NotificationsPage = React.lazy(() => import('@modules/notifications/pages/NotificationsPage'));

// ─── File Manager ───
const FileManagerPage = React.lazy(() => import('@modules/files/pages/FileManagerPage'));

// ─── Analytics ───
const AnalyticsDashboard = React.lazy(() => import('@modules/analytics/pages/AnalyticsDashboard'));

// ─── Audit Logs ───
const AuditLogsPage = React.lazy(() => import('@modules/audit/pages/AuditLogsPage'));

// ─── Sales / Invoices ───
const InvoiceList = React.lazy(() => import('@modules/sales/pages/InvoiceList'));

// ─── LMS Exam Taking ───
const ExamTaking = React.lazy(() => import('@modules/lms/pages/ExamTaking'));

// ─── System Settings ───
const SystemSettings = React.lazy(() => import('@pages/Settings/SystemSettings'));

// ─── AI Assistant ───
const AIAssistantPage = React.lazy(() => import('@modules/ai/pages/AIAssistantPage'));

// ─── CRM Hub (multi-business) ───
const CRMHub = React.lazy(() => import('@modules/crm/pages/CRMHub'));

// ─── Bead Max Sales ───
const BeadMaxSales = React.lazy(() => import('@modules/sales/pages/BeadMaxSales'));

// ─── Inventory Dashboard ───
const InventoryDashboard = React.lazy(() => import('@modules/inventory/pages/InventoryDashboard'));

// ─── Exam Results ───
const ExamResultsPage = React.lazy(() => import('@modules/lms/pages/ExamResultsPage'));

// ─── Reports ───
const AttendanceReport = React.lazy(() => import('@pages/reports/AttendanceReport'));
const ProjectsReport = React.lazy(() => import('@pages/reports/ProjectsReport'));

// ─── Roles & Permissions ───
const RolesPermissions = React.lazy(() => import('@pages/Settings/RolesPermissions'));

// ─── Login History ───
const LoginHistory = React.lazy(() => import('@pages/LoginHistory'));

// ─── Weekly Report ───
const WeeklyReportPage = React.lazy(() => import('@modules/hr/pages/WeeklyReportPage'));

// ─── VisaMax ───
const VisaMaxHub = React.lazy(() => import('@modules/visamax/pages/VisaMaxHub'));

// ─── Customer Reports ───
const CustomerReportList = React.lazy(() => import('@modules/customerreports/pages/CustomerReportList'));

// ─── Not Found ───
const NotFound = React.lazy(() => import('@pages/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route element={<AuthLayout />}>
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/setup-2fa" element={<Setup2FAPage />} />
            </Route>
          </Route>

          {/* Student portal — isolated layout, STUDENT role only */}
          <Route element={<StudentRoute />}>
            <Route element={<StudentPortalLayout />}>
              <Route path="/student/dashboard"    element={<StudentDashboardPage />} />
              <Route path="/student/courses"      element={<StudentCoursesPage />} />
              <Route path="/student/assignments"  element={<StudentAssignmentsPage />} />
              <Route path="/student/exams"        element={<StudentExamsPage />} />
              <Route path="/student/results"      element={<StudentResultsPage />} />
              <Route path="/student/attendance"   element={<StudentAttendancePage />} />
              <Route path="/student/schedule"     element={<StudentSchedulePage />} />
              <Route path="/student/certificates" element={<StudentCertificatesPage />} />
              <Route path="/student/messages"     element={<StudentMessagesPage />} />
              <Route path="/student/profile"      element={<StudentProfilePage />} />
              <Route path="/student"              element={<Navigate to="/student/dashboard" replace />} />
            </Route>
          </Route>

          {/* Staff / admin protected routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard — smart redirect to role-specific URL */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Role-specific dashboard pages (5 roles) */}
              <Route path="/dashboard/superadmin" element={<SuperAdminDashboard />} />
              <Route path="/dashboard/admin"      element={<AdminDashboard />} />
              <Route path="/dashboard/hr"         element={<HRDashboard />} />
              <Route path="/dashboard/hod"        element={<HODDashboard />} />
              <Route path="/dashboard/staff"      element={<StaffDashboard />} />
              {/* Position-specific staff dashboards (Staff.position, not an RBAC role) */}
              <Route path="/dashboard/accountant"   element={<AccountantDashboard />} />
              <Route path="/dashboard/receptionist" element={<ReceptionistDashboard />} />
              {/* Legacy URL redirects for old bookmarks */}
              <Route path="/dashboard/ceo"               element={<Navigate to="/dashboard/superadmin" replace />} />
              <Route path="/dashboard/head-of-admin"     element={<Navigate to="/dashboard/admin" replace />} />
              <Route path="/dashboard/instructor"        element={<Navigate to="/dashboard/staff" replace />} />
              <Route path="/dashboard/travel-consultant" element={<Navigate to="/dashboard/staff" replace />} />

              {/* Staff Management */}
              <Route path="/staff" element={<StaffList />} />
              <Route path="/staff/create" element={<StaffForm />} />
              <Route path="/staff/:id/edit" element={<StaffForm />} />
              <Route path="/staff/:id" element={<StaffDetail />} />

              {/* Organization */}
              <Route path="/organization/branches" element={<BranchList />} />
              <Route path="/organization/units" element={<UnitList />} />
              <Route path="/organization/departments" element={<DepartmentList />} />
              <Route path="/organization/designations" element={<DesignationList />} />

              {/* Attendance */}
              <Route path="/attendance" element={<AttendanceList />} />
              <Route path="/attendance/check-in" element={<CheckIn />} />
              <Route path="/attendance/manual-mark" element={<ManualAttendance />} />

              {/* Projects */}
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/create" element={<ProjectForm />} />
              <Route path="/projects/:id/edit" element={<ProjectForm />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />

              {/* Tasks */}
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/tasks/create" element={<TaskForm />} />
              <Route path="/tasks/:id/edit" element={<TaskForm />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />

              {/* Leave */}
              <Route path="/leave/apply" element={<LeaveForm />} />
              <Route path="/leave/requests" element={<LeaveRequests />} />
              <Route path="/leave/balance" element={<LeaveBalance />} />

              {/* Queries */}
              <Route path="/queries" element={<QueryList />} />
              <Route path="/queries/create" element={<QueryForm />} />
              <Route path="/queries/:id/edit" element={<QueryForm />} />
              <Route path="/queries/:id" element={<QueryDetail />} />

              {/* Clients */}
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/create" element={<ClientForm />} />
              <Route path="/clients/:id/edit" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientProfile />} />

              {/* Communication */}
              <Route path="/communication/send" element={<SendMessage />} />
              <Route path="/communication/templates" element={<MessageTemplates />} />
              <Route path="/communication/history" element={<CommunicationHistory />} />
              <Route path="/communication/broadcasts" element={<BroadcastList />} />

              {/* LMS */}
              <Route path="/lms/courses" element={<CourseList />} />
              <Route path="/lms/courses/:id" element={<CourseDetail />} />
              <Route path="/lms/my-enrollments" element={<MyEnrollments />} />
              <Route path="/lms/exams" element={<ExamList />} />
              <Route path="/lms/certificates" element={<CertificateList />} />

              {/* Payroll */}
              <Route path="/payroll" element={<PayrollDashboard />} />
              <Route path="/payroll/periods" element={<PayrollPeriods />} />
              <Route path="/payroll/slips" element={<PayrollSlips />} />
              <Route path="/payroll/structures" element={<SalaryStructures />} />
              <Route path="/payroll/my-slips" element={<MyPayslips />} />

              {/* CRM */}
              <Route path="/crm/contacts" element={<ContactList />} />
              <Route path="/crm/pipeline" element={<OpportunityPipeline />} />
              <Route path="/crm/forecast" element={<SalesForecasting />} />

              {/* Inventory */}
              <Route path="/inventory/items" element={<ItemList />} />
              <Route path="/inventory/warehouses" element={<WarehouseList />} />

              {/* HR */}
              <Route path="/hr/jobs" element={<JobPostingsList />} />
              <Route path="/hr/job-sync" element={<JobSyncDashboard />} />
              <Route path="/hr/appraisals" element={<AppraisalList />} />
              <Route path="/hr/promotions" element={<PromotionsList />} />
              <Route path="/hr/training" element={<TrainingList />} />

              {/* Messaging */}
              <Route path="/messages" element={<MessagingPage />} />

              {/* Video Calls */}
              <Route path="/calls" element={<VideoCallHub />} />

              {/* Calendar */}
              <Route path="/calendar" element={<CalendarPage />} />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* File Manager */}
              <Route path="/files" element={<FileManagerPage />} />

              {/* Analytics */}
              <Route path="/analytics" element={<AnalyticsDashboard />} />

              {/* Audit Logs */}
              <Route path="/audit-logs" element={<AuditLogsPage />} />

              {/* Sales / Invoices */}
              <Route path="/invoices" element={<InvoiceList />} />

              {/* LMS — exam taking (CBT) */}
              <Route path="/lms/exams/:examId/take" element={<ExamTaking />} />

              {/* AI Assistant */}
              <Route path="/ai-assistant" element={<AIAssistantPage />} />

              {/* CRM Hub */}
              <Route path="/crm/hub" element={<CRMHub />} />

              {/* Bead Max Sales */}
              <Route path="/bead-max/sales" element={<BeadMaxSales />} />

              {/* Inventory Dashboard */}
              <Route path="/inventory/dashboard" element={<InventoryDashboard />} />

              {/* Exam Results */}
              <Route path="/lms/exams/:examId/results" element={<ExamResultsPage />} />

              {/* Reports */}
              <Route path="/reports/attendance" element={<AttendanceReport />} />
              <Route path="/reports/projects" element={<ProjectsReport />} />

              {/* Roles & Permissions — superadmin only */}
              <Route element={<SuperAdminRoute />}>
                <Route path="/settings/roles" element={<RolesPermissions />} />
              </Route>

              {/* Login History */}
              <Route path="/login-history" element={<LoginHistory />} />

              {/* Weekly Report */}
              <Route path="/hr/weekly-report" element={<WeeklyReportPage />} />

              {/* VisaMax */}
              <Route path="/visamax" element={<VisaMaxHub />} />

              {/* Customer Reports */}
              <Route path="/customer-reports" element={<CustomerReportList />} />

              {/* Settings — profile/security/notifications open to all staff */}
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/security" element={<SecuritySettings />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />

              {/* System Settings — superadmin only */}
              <Route element={<SuperAdminRoute />}>
                <Route path="/settings/system" element={<SystemSettings />} />
              </Route>
            </Route>
          </Route>

          {/* Root redirect — handled per role in PrivateRoute/StudentRoute */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Not found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <Toaster />
    </>
  );
}

export default App;
