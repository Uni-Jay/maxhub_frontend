import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { roleDashboardMap } from "../../data/modules";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { GlassCard } from "../../components/ui/GlassCard";

type DashboardData = {
  companyOverview: {
    company: string;
    staffCount: number;
    departments: number;
    revenue: number;
  };
  attendanceSummary: {
    present: number;
    absent: number;
    leave: number;
  };
  tasksOverview: {
    open: number;
    inProgress: number;
    done: number;
  };
  projectsOverview: {
    active: number;
    pending: number;
    archived: number;
  };
  crmStatistics: {
    leads: number;
    converted: number;
    followUps: number;
  };
  attendanceAnalytics: {
    recordsToday: number;
    lateToday: number;
    overtimeToday: number;
  };
  collaboration: {
    messagesToday: number;
    activeRooms: number;
    announcements: number;
  };
  recentActivities: Array<{ id: string; action: string; createdAt: string }>;
  notifications: Array<{ id: string; title?: string; description?: string; createdAt?: string }>;
  roleWidgets: string[];
  role: string;
  roleDashboards: {
    superAdmin: {
      staffCount: number;
      attendanceSummary: { present: number; absent: number; leave: number };
      revenueAnalytics: {
        totalRevenue: number;
        departmentRevenue: Array<{ department: string; revenue: number }>;
      };
      departmentPerformance: Array<{ name: string; kpi: number; revenue: number; staffCount: number }>;
      recentActivities: Array<{ id: string; action: string; createdAt: string }>;
      notifications: Array<{ id: string; title?: string; description?: string; createdAt?: string }>;
      tasksOverview: { open: number; inProgress: number; done: number };
      projectsOverview: { active: number; pending: number; archived: number };
      calendar: Array<{ id: string; title: string; createdAt?: string }>;
      salesCharts: Array<{ month: string; amount: number }>;
      studentAnalytics: { totalStudents: number; activeCourses: number; completionRate: number; monthlyAdmissions: number };
      crmStatistics: { leads: number; converted: number; followUps: number };
    };
    hr: {
      recruitmentAnalytics: { openRoles: number; candidatesInPipeline: number; interviewsThisWeek: number; offersSent: number };
      leaveRequests: { pending: number; approved: number; rejected: number };
      attendanceTracking: { present: number; absent: number; late: number };
      payrollOverview: { pendingPayrollBatches: number; processedPayrollBatches: number; payrollMonthTotal: number };
      employeeRecords: { totalEmployees: number; activeEmployees: number; inactiveEmployees: number };
      staffOnboarding: { inProgress: number; completedThisMonth: number; pendingDocumentation: number };
      performanceReports: Array<{ department: string; kpi: number }>;
    };
    hod: {
      teamProductivity: { completionRate: number; tasksCompletedThisWeek: number; blockers: number };
      teamAttendance: { present: number; late: number; overtime: number };
      assignedProjects: Array<{ id: string; title: string; status: string; dueDate: string }>;
      staffReports: Array<{ id: string; fullName: string; role: string; performanceScore: number }>;
      approvalRequests: { pending: number; approvedToday: number; rejectedToday: number };
    };
    staff: {
      personalTasks: Array<{ id: string; title: string; status: string }>;
      clockInOut: { clockedInToday: boolean; latestRecord: null | { clockIn: string; clockOut?: string } };
      payslips: { latestMonth: string; status: string; historyCount: number };
      messages: { sentToday: number; unreadEstimate: number };
      calendar: Array<{ id: string; title: string; createdAt?: string }>;
      leaveRequests: { pending: number; approved: number; rejected: number };
      notifications: Array<{ id: string; title?: string; description?: string }>;
    };
  };
};

function MetricGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <GlassCard key={item.label} className="p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
        </GlassCard>
      ))}
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get("/dashboard/summary");
      return response.data.data as DashboardData;
    },
  });

  const baseMetrics = data
    ? [
        { label: "Staff count", value: data.companyOverview.staffCount },
        { label: "Total revenue", value: `N${data.companyOverview.revenue.toLocaleString()}` },
        { label: "Present today", value: data.attendanceSummary.present },
        { label: "Open tasks", value: data.tasksOverview.open },
      ]
    : [];

  const baseChartData = data
    ? [
        { name: "Attendance", value: data.attendanceAnalytics.recordsToday },
        { name: "Messages", value: data.collaboration.messagesToday },
        { name: "Leads", value: data.crmStatistics.leads },
        { name: "Tasks", value: data.tasksOverview.open + data.tasksOverview.inProgress },
      ]
    : [];

  const role = user?.role || "Staff";

  return (
    <div className="space-y-6">
      <GlassCard>
        <h1 className="font-serif text-3xl text-white">{role} Dashboard</h1>
        <p className="mt-2 text-sm text-slate-200/80">{roleDashboardMap[role]}</p>
      </GlassCard>

      {isLoading ? (
        <GlassCard>
          <p className="text-slate-200">Loading dashboard...</p>
        </GlassCard>
      ) : (
        <>
          <MetricGrid items={baseMetrics} />

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Operational Snapshot</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={baseChartData}>
                    <XAxis dataKey="name" stroke="#b2d1ff" />
                    <YAxis stroke="#b2d1ff" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2c88d9" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Role Widgets</p>
              <div className="mt-3 space-y-2">
                {(data?.roleWidgets || []).map((widget) => (
                  <div key={widget} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
                    {widget}
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>

          {role === "Super Admin" ? (
            <section className="grid gap-4 xl:grid-cols-3">
              <GlassCard className="p-5 xl:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Department Performance</p>
                <div className="mt-3 grid gap-2">
                  {(data?.roleDashboards.superAdmin.departmentPerformance || []).map((department) => (
                    <div key={department.name} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
                      {department.name} - KPI {department.kpi}% - Revenue N{department.revenue.toLocaleString()} - Staff {department.staffCount}
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Recent Activities</p>
                <div className="mt-3 space-y-2">
                  {(data?.roleDashboards.superAdmin.recentActivities || []).slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-100">
                      <p>{item.action}</p>
                      <p className="text-slate-300">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Sales Charts</p>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.roleDashboards.superAdmin.salesCharts || []}>
                      <XAxis dataKey="month" stroke="#b2d1ff" />
                      <YAxis stroke="#b2d1ff" />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#2c88d9" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Student Analytics</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Total Students: {data?.roleDashboards.superAdmin.studentAnalytics.totalStudents}</p>
                  <p>Active Courses: {data?.roleDashboards.superAdmin.studentAnalytics.activeCourses}</p>
                  <p>Completion Rate: {data?.roleDashboards.superAdmin.studentAnalytics.completionRate}%</p>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">CRM Statistics</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Leads: {data?.roleDashboards.superAdmin.crmStatistics.leads}</p>
                  <p>Converted: {data?.roleDashboards.superAdmin.crmStatistics.converted}</p>
                  <p>Follow Ups: {data?.roleDashboards.superAdmin.crmStatistics.followUps}</p>
                </div>
              </GlassCard>

              <GlassCard className="p-5 xl:col-span-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Notifications, Tasks, Projects, Calendar</p>
                <div className="mt-3 grid gap-3 md:grid-cols-4 text-sm text-slate-100">
                  <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                    <p>Notifications</p>
                    <p className="mt-2 text-xl font-semibold">{data?.roleDashboards.superAdmin.notifications.length}</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                    <p>Tasks Open</p>
                    <p className="mt-2 text-xl font-semibold">{data?.roleDashboards.superAdmin.tasksOverview.open}</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                    <p>Projects Active</p>
                    <p className="mt-2 text-xl font-semibold">{data?.roleDashboards.superAdmin.projectsOverview.active}</p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                    <p>Calendar Items</p>
                    <p className="mt-2 text-xl font-semibold">{data?.roleDashboards.superAdmin.calendar.length}</p>
                  </div>
                </div>
              </GlassCard>
            </section>
          ) : null}

          {role === "HR" ? (
            <section className="grid gap-4 xl:grid-cols-3">
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Recruitment Analytics</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Open Roles: {data?.roleDashboards.hr.recruitmentAnalytics.openRoles}</p>
                  <p>Pipeline: {data?.roleDashboards.hr.recruitmentAnalytics.candidatesInPipeline}</p>
                  <p>Interviews This Week: {data?.roleDashboards.hr.recruitmentAnalytics.interviewsThisWeek}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Leave Requests</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Pending: {data?.roleDashboards.hr.leaveRequests.pending}</p>
                  <p>Approved: {data?.roleDashboards.hr.leaveRequests.approved}</p>
                  <p>Rejected: {data?.roleDashboards.hr.leaveRequests.rejected}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Attendance Tracking</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Present: {data?.roleDashboards.hr.attendanceTracking.present}</p>
                  <p>Absent: {data?.roleDashboards.hr.attendanceTracking.absent}</p>
                  <p>Late: {data?.roleDashboards.hr.attendanceTracking.late}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Payroll Overview</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Pending Batches: {data?.roleDashboards.hr.payrollOverview.pendingPayrollBatches}</p>
                  <p>Processed: {data?.roleDashboards.hr.payrollOverview.processedPayrollBatches}</p>
                  <p>Month Total: N{(data?.roleDashboards.hr.payrollOverview.payrollMonthTotal || 0).toLocaleString()}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Employee Records</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Total: {data?.roleDashboards.hr.employeeRecords.totalEmployees}</p>
                  <p>Active: {data?.roleDashboards.hr.employeeRecords.activeEmployees}</p>
                  <p>Inactive: {data?.roleDashboards.hr.employeeRecords.inactiveEmployees}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Onboarding and Performance</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Onboarding In Progress: {data?.roleDashboards.hr.staffOnboarding.inProgress}</p>
                  <p>Completed This Month: {data?.roleDashboards.hr.staffOnboarding.completedThisMonth}</p>
                  <p>Performance Reports: {data?.roleDashboards.hr.performanceReports.length}</p>
                </div>
              </GlassCard>
            </section>
          ) : null}

          {role === "HOD" ? (
            <section className="grid gap-4 xl:grid-cols-3">
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Team Productivity</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Completion Rate: {data?.roleDashboards.hod.teamProductivity.completionRate}%</p>
                  <p>Tasks Completed: {data?.roleDashboards.hod.teamProductivity.tasksCompletedThisWeek}</p>
                  <p>Blockers: {data?.roleDashboards.hod.teamProductivity.blockers}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Team Attendance</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Present: {data?.roleDashboards.hod.teamAttendance.present}</p>
                  <p>Late: {data?.roleDashboards.hod.teamAttendance.late}</p>
                  <p>Overtime: {data?.roleDashboards.hod.teamAttendance.overtime}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Approval Requests</p>
                <div className="mt-3 text-sm text-slate-100">
                  <p>Pending: {data?.roleDashboards.hod.approvalRequests.pending}</p>
                  <p>Approved Today: {data?.roleDashboards.hod.approvalRequests.approvedToday}</p>
                  <p>Rejected Today: {data?.roleDashboards.hod.approvalRequests.rejectedToday}</p>
                </div>
              </GlassCard>
              <GlassCard className="p-5 xl:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Assigned Projects</p>
                <div className="mt-3 space-y-2">
                  {(data?.roleDashboards.hod.assignedProjects || []).map((project) => (
                    <div key={project.id} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
                      {project.title} - {project.status} - Due {new Date(project.dueDate).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Staff Reports</p>
                <div className="mt-3 space-y-2">
                  {(data?.roleDashboards.hod.staffReports || []).slice(0, 8).map((report) => (
                    <div key={report.id} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-100">
                      {report.fullName} - {report.role} - Score {report.performanceScore}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>
          ) : null}

          {role === "Staff" ? (
            <section className="grid gap-4 xl:grid-cols-3">
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Personal Tasks</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data?.roleDashboards.staff.personalTasks.length}</p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Clock In/Out</p>
                <p className="mt-2 text-sm text-slate-100">
                  {data?.roleDashboards.staff.clockInOut.clockedInToday ? "Clocked in today" : "Not clocked in today"}
                </p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Payslips</p>
                <p className="mt-2 text-sm text-slate-100">
                  {data?.roleDashboards.staff.payslips.latestMonth} - {data?.roleDashboards.staff.payslips.status}
                </p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Messages</p>
                <p className="mt-2 text-sm text-slate-100">
                  Sent today: {data?.roleDashboards.staff.messages.sentToday} - Unread: {data?.roleDashboards.staff.messages.unreadEstimate}
                </p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Calendar</p>
                <p className="mt-2 text-sm text-slate-100">Items: {data?.roleDashboards.staff.calendar.length}</p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Leave Requests</p>
                <p className="mt-2 text-sm text-slate-100">
                  Pending {data?.roleDashboards.staff.leaveRequests.pending}, Approved {data?.roleDashboards.staff.leaveRequests.approved}
                </p>
              </GlassCard>
              <GlassCard className="p-5 xl:col-span-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Notifications</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {(data?.roleDashboards.staff.notifications || []).map((note) => (
                    <div key={note.id} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
                      {note.title || note.description || "Notification"}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
