/**
 * HR Dashboard — for users with HR role
 * HR Command Center: staff KPIs, recruitment analytics,
 * leave approvals, onboarding, attendance chart, appraisals.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Calendar, Briefcase, UserCheck, ArrowUpRight,
  CheckCircle2, XCircle, ClipboardList, Star, BarChart3,
  UserPlus, RefreshCw,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import { MultiBarChart, StatCard } from '@components/charts/ChartComponents';
import { ApprovalCenter } from '@components/dashboard/ApprovalCenter';
import DashboardClock from '@components/ui/DashboardClock';
import { apiClient } from '@services/apiClient';

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface HRStats {
  totalStaff: number;
  pendingLeaveRequests: number;
  activeJobPostings: number;
  todayAttendance: number;
}

interface RecruitmentStats {
  openPositions: number;
  totalApplications: number;
  shortlisted: number;
  interviewsScheduled: number;
}

interface LeaveRequest {
  _id: string;
  employee?: { firstName?: string; lastName?: string };
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  status?: string;
}

interface StaffMember {
  _id: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  joinDate?: string;
  position?: string;
}

interface Appraisal {
  _id: string;
  employee?: { firstName?: string; lastName?: string };
  dueDate?: string;
  type?: string;
}

interface AttendanceRecord {
  date?: string;
  present?: number;
  absent?: number;
  late?: number;
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────
const FALLBACK_STATS: HRStats = {
  totalStaff: 0,
  pendingLeaveRequests: 0,
  activeJobPostings: 0,
  todayAttendance: 0,
};

const FALLBACK_RECRUITMENT: RecruitmentStats = {
  openPositions: 0,
  totalApplications: 0,
  shortlisted: 0,
  interviewsScheduled: 0,
};

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-sky-500',
];

function initials(member: StaffMember | LeaveRequest['employee']): string {
  const f = (member as StaffMember)?.firstName ?? '';
  const l = (member as StaffMember)?.lastName ?? '';
  return `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase() || '?';
}

function fullName(member?: { firstName?: string; lastName?: string }): string {
  return [member?.firstName, member?.lastName].filter(Boolean).join(' ') || 'Unknown';
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HRDashboard() {
  const qc = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // KPI stats
  const { data: stats, isLoading: statsLoading } = useQuery<HRStats>({
    queryKey: ['hr-stats', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.get<HRStats>('/dashboards/hr/stats');
      } catch {
        return FALLBACK_STATS;
      }
    },
    staleTime: 60_000,
  });

  // Recruitment stats
  const { data: recruitment } = useQuery<RecruitmentStats>({
    queryKey: ['hr-recruitment', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.get<RecruitmentStats>('/dashboards/hr/recruitment');
      } catch {
        return FALLBACK_RECRUITMENT;
      }
    },
    staleTime: 60_000,
  });

  // Pending leave requests
  const { data: leaveRaw } = useQuery({
    queryKey: ['hr-leave-pending', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.getRaw('/leave/requests', { status: 'Pending', limit: 10 });
      } catch {
        return { data: [] };
      }
    },
    staleTime: 30_000,
  });
  const leaveRequests: LeaveRequest[] = Array.isArray(leaveRaw?.data)
    ? leaveRaw.data
    : Array.isArray(leaveRaw)
    ? leaveRaw
    : [];

  // New joiners
  const { data: staffRaw } = useQuery({
    queryKey: ['hr-new-joiners', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.getRaw('/staff', { limit: 5, sortBy: 'joinDate', sortOrder: 'desc' });
      } catch {
        return { data: [] };
      }
    },
    staleTime: 120_000,
  });
  const newJoiners: StaffMember[] = Array.isArray(staffRaw?.data)
    ? staffRaw.data
    : Array.isArray(staffRaw)
    ? staffRaw
    : [];

  // Attendance for chart
  const { data: attendanceRaw } = useQuery({
    queryKey: ['hr-attendance-week', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.getRaw('/attendance', { period: 'week' });
      } catch {
        return { data: [] };
      }
    },
    staleTime: 120_000,
  });
  const attendanceData: AttendanceRecord[] = Array.isArray(attendanceRaw?.data)
    ? attendanceRaw.data
    : Array.isArray(attendanceRaw)
    ? attendanceRaw
    : [];

  // Upcoming appraisals
  const { data: appraisalsRaw } = useQuery({
    queryKey: ['hr-appraisals', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.getRaw('/appraisals', { limit: 5 });
      } catch {
        return { data: [] };
      }
    },
    staleTime: 120_000,
  });
  const appraisals: Appraisal[] = Array.isArray(appraisalsRaw?.data)
    ? appraisalsRaw.data
    : Array.isArray(appraisalsRaw)
    ? appraisalsRaw
    : [];

  // Leave approve / reject mutations
  const [leaveStatuses, setLeaveStatuses] = useState<Partial<Record<string, 'approved' | 'rejected'>>>({});

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/leave/${id}/approve`, {}),
    onSuccess: (_data, id) => {
      setLeaveStatuses((prev) => ({ ...prev, [id]: 'approved' }));
      qc.invalidateQueries({ queryKey: ['hr-leave-pending'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/leave/${id}/reject`, {}),
    onSuccess: (_data, id) => {
      setLeaveStatuses((prev) => ({ ...prev, [id]: 'rejected' }));
      qc.invalidateQueries({ queryKey: ['hr-leave-pending'] });
    },
  });

  const s = stats ?? FALLBACK_STATS;
  const r = recruitment ?? FALLBACK_RECRUITMENT;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-6">

      {/* ── Header ── */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR Command Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <DashboardClock />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* ── KPI cards ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Staff" value={s.totalStaff} icon={<Users className="w-7 h-7" />} color="blue" />
        <StatCard label="Pending Leaves" value={s.pendingLeaveRequests} icon={<Calendar className="w-7 h-7" />} color="yellow" />
        <StatCard label="Active Job Postings" value={s.activeJobPostings} icon={<Briefcase className="w-7 h-7" />} color="purple" />
        <StatCard label="Today's Attendance" value={s.todayAttendance} icon={<UserCheck className="w-7 h-7" />} color="green" />
      </motion.div>

      {/* ── Approval Center ── */}
      <motion.div variants={item}>
        <ApprovalCenter endpoint="/dashboards/hr/approvals-queue" />
      </motion.div>

      {/* ── Recruitment Analytics ── */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
          <Briefcase className="w-5 h-5 text-violet-500" />
          Recruitment Analytics
          <Link to="/hr/jobs" className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Manage Jobs <ArrowUpRight className="w-3 h-3" />
          </Link>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Open Positions', value: r.openPositions, color: 'text-violet-600 bg-violet-50' },
            { label: 'Total Applications', value: r.totalApplications, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Shortlisted', value: r.shortlisted, color: 'text-amber-600 bg-amber-50' },
            { label: 'Interviews Scheduled', value: r.interviewsScheduled, color: 'text-emerald-600 bg-emerald-50' },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl p-4 ${kpi.color.split(' ')[1]}`}>
              <p className={`text-2xl font-bold ${kpi.color.split(' ')[0]}`}>{kpi.value}</p>
              <p className="text-xs text-gray-600 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Pending Leave Requests Table ── */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Pending Leave Requests
              {leaveRequests.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  {leaveRequests.length}
                </span>
              )}
            </h2>
          </div>

          {leaveRequests.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No pending leave requests</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {leaveRequests.map((req, i) => {
                const localStatus = leaveStatuses[req._id];
                const resolved = localStatus ?? (req.status?.toLowerCase() as 'approved' | 'rejected' | 'pending' | undefined);
                const isPending = !resolved || resolved === 'pending';
                return (
                  <div
                    key={req._id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      resolved === 'approved'
                        ? 'bg-emerald-50 border-emerald-100'
                        : resolved === 'rejected'
                        ? 'bg-red-50 border-red-100'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(req.employee)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {fullName(req.employee)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {req.leaveType ?? 'Leave'} &bull; {req.startDate ?? '—'} – {req.endDate ?? '—'} &bull; {req.numberOfDays ?? '?'}d
                      </p>
                    </div>
                    {isPending ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => approveMutation.mutate(req._id)}
                          disabled={approveMutation.isPending}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(req._id)}
                          disabled={rejectMutation.isPending}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        resolved === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {resolved === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Staff Onboarding Panel ── */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Recent New Joiners
            </h2>
            <Link to="/staff" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {newJoiners.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No recent joiners</p>
          ) : (
            <div className="space-y-3">
              {newJoiners.map((member, i) => (
                <div key={member._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(member)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fullName(member)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.position ?? member.department ?? '—'}
                      {member.joinDate ? ` · Joined ${new Date(member.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex-shrink-0">
                    New
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Attendance Overview Chart ── */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          Weekly Attendance Overview
        </h2>
        {attendanceData.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Attendance data unavailable</p>
        ) : (
          <MultiBarChart
            data={attendanceData.map(r => ({ name: r.date ?? '', ...r }))}
            dataKeys={['present', 'absent', 'late']}
            height={250}
            colors={['#10b981', '#ef4444', '#f59e0b']}
          />
        )}
      </motion.div>

      {/* ── Performance / Upcoming Appraisals ── */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Upcoming Appraisals
          </h2>
          <Link to="/hr/appraisals" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {appraisals.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No upcoming appraisals</p>
        ) : (
          <div className="space-y-3">
            {appraisals.map((a, i) => (
              <div key={a._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {initials(a.employee)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {fullName(a.employee)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.type ?? 'Performance Review'}
                    {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">
                  Upcoming
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Quick Links ── */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'New Job Posting', href: '/hr/jobs', icon: Briefcase, color: 'text-violet-600 bg-violet-50' },
          { label: 'View Appraisals', href: '/hr/appraisals', icon: Star, color: 'text-amber-600 bg-amber-50' },
          { label: 'Training', href: '/hr/training', icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Staff List', href: '/staff', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
        ].map((q) => (
          <Link
            key={q.href}
            to={q.href}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.color}`}>
              <q.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">{q.label}</span>
          </Link>
        ))}
      </motion.div>

    </motion.div>
  );
}

export default HRDashboard;
