/**
 * Head of Admin Dashboard
 * Staff oversight, leave approvals, attendance, KPIs, projects, and leave summary
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  Calendar,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  StatCard,
  MultiBarChart,
} from '@components/charts/ChartComponents';
import { ApprovalCenter } from '@components/dashboard/ApprovalCenter';
import DashboardClock from '@components/ui/DashboardClock';
import {
  headOfAdminDashboardService,
  type LeaveApprovalData,
  type ProjectData,
} from '@services/dashboardService';
import { useApiQuery } from '../../hooks/useApiQuery';
import { cn } from '@utils/cn';

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} />
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: 'pending' | 'approved' | 'rejected';
}) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span
      className={cn(
        'px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize',
        map[status],
      )}
    >
      {status}
    </span>
  );
}

// ─── Variance indicator ───────────────────────────────────────────────────────

function VarianceCell({ variance }: { variance: number }) {
  if (variance > 0)
    return (
      <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
        <TrendingUp className="w-3.5 h-3.5" />+{variance}
      </span>
    );
  if (variance < 0)
    return (
      <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
        <TrendingDown className="w-3.5 h-3.5" />
        {variance}
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-muted-foreground font-semibold text-sm">
      <Minus className="w-3.5 h-3.5" />0
    </span>
  );
}

// ─── Leave approval row ───────────────────────────────────────────────────────

interface LeaveRowProps {
  leave: LeaveApprovalData;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: boolean;
  rejecting: boolean;
}

function LeaveRow({
  leave,
  onApprove,
  onReject,
  approving,
  rejecting,
}: LeaveRowProps) {
  const isPending = leave.status === 'pending';
  const isBusy = approving || rejecting;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b border-border/50 last:border-0"
    >
      <td className="py-3 pr-4">
        <p className="text-sm font-medium">{leave.employee_name}</p>
        <p className="text-xs text-muted-foreground">
          {leave.start_date} · {leave.number_of_days}d
        </p>
      </td>
      <td className="py-3 pr-4">
        <span className="text-sm text-muted-foreground">{leave.leave_type}</span>
      </td>
      <td className="py-3 pr-4">
        <StatusBadge status={leave.status} />
      </td>
      <td className="py-3">
        {isPending ? (
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isBusy}
              onClick={() => onApprove(leave.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold',
                'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors',
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {approving ? 'Approving…' : 'Approve'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isBusy}
              onClick={() => onReject(leave.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold',
                'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors',
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              {rejecting ? 'Rejecting…' : 'Reject'}
            </motion.button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </motion.tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HeadOfAdminDashboard() {
  const queryClient = useQueryClient();
  const today = new Date();

  // Local UI state
  const [showAllLeaves, setShowAllLeaves] = useState(false);
  const [actioningLeave, setActioningLeave] = useState<{
    id: string;
    action: 'approve' | 'reject';
  } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const statsQuery = useApiQuery(
    ['head-admin', 'stats'],
    () => headOfAdminDashboardService.getStats(),
  );

  const leaveApprovalsQuery = useApiQuery(
    ['head-admin', 'leave-approvals'],
    () => headOfAdminDashboardService.getPendingLeaveApprovals(),
  );

  const attendanceQuery = useApiQuery(
    ['head-admin', 'attendance'],
    () => headOfAdminDashboardService.getAttendanceReports(),
  );

  const kpiQuery = useApiQuery(
    ['head-admin', 'kpis'],
    () => headOfAdminDashboardService.getDepartmentKPIs(),
  );

  const projectQuery = useApiQuery(
    ['head-admin', 'projects'],
    () => headOfAdminDashboardService.getProjectStatus(),
  );

  const leaveSummaryQuery = useApiQuery(
    ['head-admin', 'leave-summary'],
    () => headOfAdminDashboardService.getLeaveSummary(),
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      headOfAdminDashboardService.approveLeave(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['head-admin', 'leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['head-admin', 'leave-summary'] });
      queryClient.invalidateQueries({ queryKey: ['head-admin', 'stats'] });
      setActioningLeave(null);
    },
    onError: () => setActioningLeave(null),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      headOfAdminDashboardService.rejectLeave(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['head-admin', 'leave-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['head-admin', 'leave-summary'] });
      queryClient.invalidateQueries({ queryKey: ['head-admin', 'stats'] });
      setActioningLeave(null);
    },
    onError: () => setActioningLeave(null),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleApprove = (id: string) => {
    setActioningLeave({ id, action: 'approve' });
    approveMutation.mutate({ id, remarks: 'Approved via dashboard' });
  };

  const handleReject = (id: string) => {
    setActioningLeave({ id, action: 'reject' });
    rejectMutation.mutate({ id, reason: 'Rejected via dashboard' });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['head-admin'] });
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const stats = statsQuery.data;

  const attendanceChartData = (() => {
    const raw = attendanceQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw.map((d: { department: string; present: number; absent: number; late: number }) => ({
      name: d.department,
      present: d.present,
      absent: d.absent,
      late: d.late,
    }));
  })();

  const kpiRows = (() => {
    const raw = kpiQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw as Array<{
      department: string;
      target: number;
      actual: number;
      variance: number;
    }>;
  })();

  const projects = (() => {
    const raw = projectQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw as ProjectData[];
  })();

  const leaveSummary = leaveSummaryQuery.data as
    | {
        pending: number;
        approved: number;
        rejected: number;
        monthlyQuota: number;
        utilized: number;
      }
    | undefined;

  const pendingLeaves = (leaveApprovalsQuery.data ?? []) as LeaveApprovalData[];
  const visibleLeaves = showAllLeaves ? pendingLeaves : pendingLeaves.slice(0, 5);

  const isLoading = statsQuery.isLoading;

  // ── Progress colour ───────────────────────────────────────────────────────

  function progressColor(pct: number): string {
    if (pct >= 90) return 'from-green-500 to-emerald-400';
    if (pct >= 70) return 'from-yellow-500 to-amber-400';
    return 'from-red-500 to-rose-400';
  }

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
            disabled={isLoading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* ── KPI Stat Cards ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5"
      >
        {statsQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg p-6 bg-muted/30 space-y-3 animate-pulse"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total Staff"
              value={stats?.totalEmployees ?? '—'}
              icon={<Users className="w-7 h-7" />}
              color="blue"
            />
            <StatCard
              label="Pending Approvals"
              value={stats?.pendingApprovals ?? pendingLeaves.filter((l) => l.status === 'pending').length}
              icon={<Clock className="w-7 h-7" />}
              color="red"
            />
            <StatCard
              label="Avg Attendance"
              value={
                stats?.averageAttendance != null
                  ? `${(stats.averageAttendance as number).toFixed(1)}%`
                  : '—'
              }
              icon={<Calendar className="w-7 h-7" />}
              color="green"
            />
            <StatCard
              label="Active Projects"
              value={stats?.activeProjects ?? '—'}
              icon={<Briefcase className="w-7 h-7" />}
              color="purple"
            />
            <StatCard
              label="Overtime Requests"
              value={stats?.pendingOvertime ?? '—'}
              icon={<Clock className="w-7 h-7" />}
              color="yellow"
            />
            <StatCard
              label="Pending Weekly Reports"
              value={stats?.pendingWeeklyReports ?? '—'}
              icon={<TrendingUp className="w-7 h-7" />}
              color="blue"
            />
          </>
        )}
      </motion.div>

      {/* ── Approval Center ── */}
      <motion.div variants={itemVariants}>
        <ApprovalCenter endpoint="/dashboards/head-of-admin/approvals-queue" />
      </motion.div>

      {/* ── Leave Approval Panel ── */}
      <motion.div
        variants={itemVariants}
        className="bg-card rounded-xl p-6 border border-border shadow-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Leave Approvals
            {!leaveApprovalsQuery.isLoading && pendingLeaves.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                {pendingLeaves.filter((l) => l.status === 'pending').length} pending
              </span>
            )}
          </h2>
        </div>

        {leaveApprovalsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : pendingLeaves.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No pending leave requests.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">Employee</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {visibleLeaves.map((leave) => (
                      <LeaveRow
                        key={leave.id}
                        leave={leave}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        approving={
                          actioningLeave?.id === leave.id &&
                          actioningLeave.action === 'approve' &&
                          approveMutation.isPending
                        }
                        rejecting={
                          actioningLeave?.id === leave.id &&
                          actioningLeave.action === 'reject' &&
                          rejectMutation.isPending
                        }
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {pendingLeaves.length > 5 && (
              <button
                onClick={() => setShowAllLeaves((v) => !v)}
                className="mt-4 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {showAllLeaves ? (
                  <>
                    Show less <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Show all {pendingLeaves.length} requests{' '}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </>
        )}

        {(approveMutation.isError || rejectMutation.isError) && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Action failed. Please try again.
          </p>
        )}
      </motion.div>

      {/* ── Attendance chart + Department KPIs ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Attendance by Department */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">
            Attendance by Department
          </h2>
          {attendanceQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : attendanceChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              No attendance data.
            </p>
          ) : (
            <MultiBarChart
              data={attendanceChartData}
              dataKeys={['present', 'absent', 'late']}
              height={260}
              colors={['#10b981', '#ef4444', '#f59e0b']}
            />
          )}
        </div>

        {/* Department KPIs table */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-4">Department KPIs</h2>
          {kpiQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : kpiRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              No KPI data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2 pr-4 font-medium">Department</th>
                    <th className="pb-2 pr-4 font-medium">Target</th>
                    <th className="pb-2 pr-4 font-medium">Actual</th>
                    <th className="pb-2 font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-sm">
                        {row.department}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-sm">
                        {row.target}
                      </td>
                      <td className="py-3 pr-4 text-sm">{row.actual}</td>
                      <td className="py-3">
                        <VarianceCell variance={row.variance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Projects + Leave Summary ── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Projects overview with progress bars */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-5">Projects Overview</h2>
          {projectQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No projects found.
            </p>
          ) : (
            <div className="space-y-5">
              {projects.map((project, i) => {
                const pct = project.progress ?? 0;
                const statusColors: Record<string, string> = {
                  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                  completed:
                    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                  on_hold:
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                  delayed:
                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                };
                return (
                  <div key={project.id ?? i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {project.name}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                            statusColors[project.status] ??
                              'bg-muted text-muted-foreground',
                          )}
                        >
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary ml-2">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * i }}
                        className={cn(
                          'h-full rounded-full bg-gradient-to-r',
                          progressColor(pct),
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leave Summary — donut-style display */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-base font-semibold mb-5">Leave Summary</h2>
          {leaveSummaryQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !leaveSummary ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No summary data.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Three big counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mb-1" />
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {leaveSummary.pending ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Pending
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mb-1" />
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {leaveSummary.approved ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Approved
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-50 dark:bg-red-950">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mb-1" />
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {leaveSummary.rejected ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    Rejected
                  </span>
                </div>
              </div>

              {/* Monthly quota utilisation */}
              {leaveSummary.monthlyQuota != null && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Monthly Quota
                    </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      {leaveSummary.utilized ?? 0} / {leaveSummary.monthlyQuota}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          100,
                          ((leaveSummary.utilized ?? 0) /
                            leaveSummary.monthlyQuota) *
                            100,
                        )}%`,
                      }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full bg-blue-500"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {(
                      ((leaveSummary.utilized ?? 0) /
                        leaveSummary.monthlyQuota) *
                      100
                    ).toFixed(0)}
                    % utilised this month
                  </p>
                </div>
              )}

              {/* Total at a glance */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Total requests
                </span>
                <span className="text-sm font-semibold">
                  {(leaveSummary.pending ?? 0) +
                    (leaveSummary.approved ?? 0) +
                    (leaveSummary.rejected ?? 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default HeadOfAdminDashboard;
