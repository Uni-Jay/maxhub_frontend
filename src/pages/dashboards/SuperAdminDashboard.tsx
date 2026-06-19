/**
 * Super Admin Dashboard
 * Complete organization overview with real API data via react-query
 */

import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  Calendar,
  Briefcase,
  GraduationCap,
  DollarSign,
  Clock,
  Target,
  Bell,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Link,
  ChevronRight,
  AlertCircle,
  ArrowUpCircle,
  CalendarCheck,
  CheckSquare,
  HelpCircle,
  Boxes,
  ShoppingBag,
  Megaphone,
  FileText,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApprovalCenter } from '@components/dashboard/ApprovalCenter';
import DashboardClock from '@components/ui/DashboardClock';
import {
  StatCard,
  SimpleAreaChart,
  MultiBarChart,
  SimplePieChart,
} from '@components/charts/ChartComponents';
import {
  superAdminDashboardService,
  type AttendanceData,
  type RevenueData,
  type PayrollData,
  type DepartmentData,
  type ProjectData,
  type NotificationData,
} from '@services/dashboardService';
import { useApiQuery } from '../../hooks/useApiQuery';
import { cn } from '@utils/cn';

// ─── Animation variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} />
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg p-6 bg-muted/30 space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function ChartSkeleton({ height = 250 }: { height?: number }) {
  return <div className="animate-pulse rounded-lg bg-muted/60 w-full" style={{ height }} />;
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Add Staff', path: '/staff/create', icon: Users, color: 'text-blue-600' },
  { label: 'Job Postings', path: '/hr/jobs', icon: Briefcase, color: 'text-cyan-600' },
  { label: 'Promotions', path: '/hr/promotions', icon: ArrowUpCircle, color: 'text-emerald-600' },
  { label: 'Weekly Reports', path: '/hr/weekly-report', icon: TrendingUp, color: 'text-purple-600' },
  { label: 'Mark Attendance', path: '/attendance/manual-mark', icon: CalendarCheck, color: 'text-teal-600' },
  { label: 'Leave Requests', path: '/leave/requests', icon: Calendar, color: 'text-amber-600' },
  { label: 'Generate Payroll', path: '/payroll/periods', icon: DollarSign, color: 'text-emerald-600' },
  { label: 'Projects', path: '/projects', icon: Briefcase, color: 'text-indigo-600' },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare, color: 'text-violet-600' },
  { label: 'Staff Queries', path: '/queries', icon: HelpCircle, color: 'text-pink-600' },
  { label: 'CRM Hub', path: '/crm/hub', icon: Target, color: 'text-fuchsia-600' },
  { label: 'Clients', path: '/clients', icon: UserCheck, color: 'text-lime-600' },
  { label: 'Inventory', path: '/inventory/dashboard', icon: Boxes, color: 'text-orange-600' },
  { label: 'BeadMax Sales', path: '/bead-max/sales', icon: ShoppingBag, color: 'text-red-600' },
  { label: 'Broadcast', path: '/communication/broadcasts', icon: Megaphone, color: 'text-rose-600' },
  { label: 'Customer Reports', path: '/customer-reports', icon: FileText, color: 'text-orange-600' },
  { label: 'VisaMax Hub', path: '/visamax', icon: Link, color: 'text-sky-600' },
  { label: 'Departments', path: '/staff', icon: Building2, color: 'text-yellow-600' },
  { label: 'Analytics', path: '/analytics', icon: BarChart2, color: 'text-indigo-600' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();

  // ── Queries ──────────────────────────────────────────────────────────────

  const statsQuery = useApiQuery(
    ['super-admin', 'stats'],
    () => superAdminDashboardService.getStats(),
  );

  const attendanceQuery = useApiQuery(
    ['super-admin', 'attendance', 7],
    () => superAdminDashboardService.getAttendanceData(7),
  );

  const revenueQuery = useApiQuery(
    ['super-admin', 'revenue', 6],
    () => superAdminDashboardService.getRevenueAnalytics(6),
  );

  const payrollQuery = useApiQuery(
    ['super-admin', 'payroll'],
    () => superAdminDashboardService.getPayrollSummary(),
  );

  const departmentQuery = useApiQuery(
    ['super-admin', 'departments'],
    () => superAdminDashboardService.getDepartmentDistribution(),
  );

  const studentQuery = useApiQuery(
    ['super-admin', 'students'],
    () => superAdminDashboardService.getStudentAnalytics(),
  );

  const projectQuery = useApiQuery(
    ['super-admin', 'projects'],
    () => superAdminDashboardService.getProjectStatus(),
  );

  const crmQuery = useApiQuery(
    ['super-admin', 'crm'],
    () => superAdminDashboardService.getCRMMetrics(),
  );

  const notifQuery = useApiQuery(
    ['super-admin', 'notifications', 5],
    () => superAdminDashboardService.getNotifications(5),
  );

  // ── Refresh all ──────────────────────────────────────────────────────────

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin'] });
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const stats = statsQuery.data;
  const crm = crmQuery.data;
  const students = studentQuery.data;

  // Map service response shapes to chart-friendly { name, value } arrays
  const attendanceChartData = (attendanceQuery.data ?? []).map(
    (d: AttendanceData) => ({
      name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      present: d.present,
      absent: d.absent,
      late: d.late,
    }),
  );

  const revenueChartData = (revenueQuery.data ?? []).map((d: RevenueData) => ({
    name: d.month,
    value: d.revenue,
    target: d.target,
  }));

  const payrollChartData = (payrollQuery.data ?? []).map((d: PayrollData) => ({
    name: d.category,
    value: d.amount,
  }));

  const departmentChartData = (departmentQuery.data ?? []).map(
    (d: DepartmentData) => ({ name: d.name, value: d.count }),
  );

  const projectChartData = (() => {
    const raw = projectQuery.data ?? [];
    const counts: Record<string, number> = {};
    for (const p of raw as ProjectData[]) {
      const label =
        p.status === 'active'
          ? 'Active'
          : p.status === 'completed'
          ? 'Completed'
          : p.status === 'on_hold'
          ? 'On Hold'
          : 'Delayed';
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const isGlobalLoading =
    statsQuery.isLoading ||
    attendanceQuery.isLoading ||
    revenueQuery.isLoading;

  const hasError = false; // widgets show '—' gracefully on error; suppress global banner

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 p-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, Admin
          </h1>
          <p className="text-muted-foreground mt-1">{formatDate(today)}</p>
        </div>
        <div className="flex items-center gap-3">
          <DashboardClock />
          <motion.button
            onClick={handleRefresh}
            disabled={isGlobalLoading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity',
            )}
          >
            <RefreshCw
              className={cn('w-4 h-4', isGlobalLoading && 'animate-spin')}
            />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* ── Global error banner ── */}
      {hasError && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          Some data failed to load. Please refresh to try again.
        </motion.div>
      )}

      {/* ── 8 KPI Stat Cards ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {statsQuery.isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Employees"
              value={stats?.totalEmployees ?? '—'}
              icon={<Users className="w-7 h-7" />}
              color="blue"
            />
            <StatCard
              label="Total Departments"
              value={stats?.totalDepartments ?? '—'}
              icon={<Building2 className="w-7 h-7" />}
              color="purple"
            />
            <StatCard
              label="Attendance Rate"
              value={
                stats?.attendanceRate != null
                  ? `${stats.attendanceRate.toFixed(1)}%`
                  : '—'
              }
              icon={<Calendar className="w-7 h-7" />}
              color="green"
            />
            <StatCard
              label="Active Projects"
              value={stats?.activeProjects ?? '—'}
              icon={<Briefcase className="w-7 h-7" />}
              color="yellow"
            />
            {/* Row 2 — extra stats sourced from student / CRM / notifications queries */}
            <div
              className={cn(
                'rounded-lg p-6 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold mt-2">
                    {studentQuery.isLoading
                      ? '…'
                      : (students?.totalEnrolled ?? '—')}
                  </p>
                </div>
                <GraduationCap className="w-7 h-7 opacity-50" />
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg p-6 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold mt-2">
                    {revenueQuery.isLoading
                      ? '…'
                      : revenueQuery.data && revenueQuery.data.length > 0
                      ? formatCurrency(
                          revenueQuery.data.reduce(
                            (sum: number, d: RevenueData) => sum + d.revenue,
                            0,
                          ),
                        )
                      : '—'}
                  </p>
                </div>
                <DollarSign className="w-7 h-7 opacity-50" />
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg p-6 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">
                    Pending Approvals
                  </p>
                  <p className="text-2xl font-bold mt-2">
                    {statsQuery.isLoading ? '…' : (stats?.pendingApprovals ?? '—')}
                  </p>
                </div>
                <Clock className="w-7 h-7 opacity-50" />
              </div>
            </div>
            <div
              className={cn(
                'rounded-lg p-6 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">
                    CRM Conversion
                  </p>
                  <p className="text-2xl font-bold mt-2">
                    {crmQuery.isLoading
                      ? '…'
                      : crm?.conversionRate != null
                      ? `${crm.conversionRate.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
                <Target className="w-7 h-7 opacity-50" />
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ── Approval Center ── */}
      <motion.div variants={itemVariants}>
        <ApprovalCenter endpoint="/dashboards/super-admin/approvals-queue" />
      </motion.div>

      {/* ── Charts Row 1: Attendance + Revenue ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Attendance — last 7 days */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">
            Attendance — Last 7 Days
          </h2>
          {attendanceQuery.isLoading ? (
            <ChartSkeleton />
          ) : attendanceChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              No attendance data available.
            </p>
          ) : (
            <MultiBarChart
              data={attendanceChartData}
              dataKeys={['present', 'absent', 'late']}
              height={250}
              colors={['#10b981', '#ef4444', '#f59e0b']}
            />
          )}
        </div>

        {/* Revenue vs Target */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">
            Revenue vs Target
          </h2>
          {revenueQuery.isLoading ? (
            <ChartSkeleton />
          ) : revenueChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              No revenue data available.
            </p>
          ) : (
            <SimpleAreaChart
              data={revenueChartData}
              dataKey="value"
              height={250}
              color="#3b82f6"
            />
          )}
        </div>
      </motion.div>

      {/* ── Charts Row 2: 3 Pie Charts ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Department distribution */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">
            Staff by Department
          </h2>
          {departmentQuery.isLoading ? (
            <ChartSkeleton height={200} />
          ) : departmentChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No data.
            </p>
          ) : (
            <SimplePieChart
              data={departmentChartData}
              dataKey="value"
              height={200}
            />
          )}
        </div>

        {/* Payroll breakdown */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">Payroll Breakdown</h2>
          {payrollQuery.isLoading ? (
            <ChartSkeleton height={200} />
          ) : payrollChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No data.
            </p>
          ) : (
            <SimplePieChart
              data={payrollChartData}
              dataKey="value"
              height={200}
            />
          )}
        </div>

        {/* Project status */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">Project Status</h2>
          {projectQuery.isLoading ? (
            <ChartSkeleton height={200} />
          ) : projectChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No data.
            </p>
          ) : (
            <SimplePieChart
              data={projectChartData}
              dataKey="value"
              height={200}
            />
          )}
        </div>
      </motion.div>

      {/* ── Bottom section: CRM + Students + Notifications ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* CRM metrics */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-5">CRM Overview</h2>
          {crmQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !crm ? (
            <p className="text-sm text-muted-foreground">No CRM data.</p>
          ) : (
            <div className="space-y-4">
              {(
                [
                  { label: 'Total Leads', value: crm.totalLeads, color: 'text-blue-600' },
                  { label: 'Opportunities', value: crm.totalOpportunities, color: 'text-purple-600' },
                  { label: 'Converted Deals', value: crm.convertedDeals, color: 'text-emerald-600' },
                  { label: 'Lost Deals', value: crm.lostDeals, color: 'text-red-600' },
                ] as const
              ).map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={cn('text-xl font-bold', color)}>
                    {value ?? '—'}
                  </span>
                </div>
              ))}
              <div className="mt-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-950">
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                  {crm.conversionRate?.toFixed(1) ?? '—'}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Student analytics */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-5">Student Analytics</h2>
          {studentQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !students ? (
            <p className="text-sm text-muted-foreground">No student data.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  {
                    label: 'Enrolled',
                    value: students.totalEnrolled,
                    bg: 'bg-blue-50 dark:bg-blue-950',
                    text: 'text-blue-600 dark:text-blue-400',
                  },
                  {
                    label: 'Active',
                    value: students.activeStudents,
                    bg: 'bg-green-50 dark:bg-green-950',
                    text: 'text-green-600 dark:text-green-400',
                  },
                  {
                    label: 'Completed',
                    value: students.completedCourses,
                    bg: 'bg-purple-50 dark:bg-purple-950',
                    text: 'text-purple-600 dark:text-purple-400',
                  },
                  {
                    label: 'Dropped',
                    value: students.droppedStudents,
                    bg: 'bg-red-50 dark:bg-red-950',
                    text: 'text-red-600 dark:text-red-400',
                  },
                ] as const
              ).map(({ label, value, bg, text }) => (
                <div
                  key={label}
                  className={cn(
                    'rounded-lg p-4 text-center',
                    bg,
                  )}
                >
                  <p className={cn('text-2xl font-bold', text)}>
                    {value?.toLocaleString() ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            Recent Notifications
          </h2>
          {notifQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !notifQuery.data || notifQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications.</p>
          ) : (
            <div className="space-y-3">
              {(notifQuery.data as NotificationData[]).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-3 rounded-lg border border-border/50',
                    n.read
                      ? 'bg-muted/40'
                      : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Quick Actions panel ── */}
      <motion.div
        variants={itemVariants}
        className="bg-card rounded-xl p-6 border border-border shadow-sm"
      >
        <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map(({ label, path, icon: Icon, color }) => (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60',
                'bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer',
              )}
            >
              <Icon className={cn('w-6 h-6', color)} />
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SuperAdminDashboard;
