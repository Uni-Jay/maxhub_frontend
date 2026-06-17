/**
 * HOD Dashboard — for Head of Department role
 * Department Control: team size, attendance, projects, tasks, approvals.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCheck, Percent, Bell, ArrowUpRight,
  FolderKanban, ListTodo, Calendar, MessageSquare,
  RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import { StatCard } from '@components/charts/ChartComponents';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';

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
interface HODStats {
  teamSize: number;
  presentToday: number;
  attendancePct: number;
  pendingApprovals: number;
}

interface TeamMember {
  _id: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  attendanceStatus?: string;
}

interface Project {
  _id: string;
  name?: string;
  progress?: number;
  deadline?: string;
  status?: string;
}

interface Task {
  _id: string;
  title?: string;
  assignee?: { firstName?: string; lastName?: string };
  dueDate?: string;
  priority?: string;
  status?: string;
}

interface LeaveRequest {
  _id: string;
  employee?: { firstName?: string; lastName?: string };
  leaveType?: string;
  startDate?: string;
  numberOfDays?: number;
  status?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FALLBACK_STATS: HODStats = {
  teamSize: 0,
  presentToday: 0,
  attendancePct: 0,
  pendingApprovals: 0,
};

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-sky-500',
];

const ATTENDANCE_STYLE: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700',
  Absent: 'bg-red-100 text-red-700',
  'On Leave': 'bg-blue-100 text-blue-700',
  Late: 'bg-amber-100 text-amber-700',
};

const PRIORITY_STYLE: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-gray-100 text-gray-600',
};

const STATUS_DOT: Record<string, string> = {
  'In Progress': 'bg-indigo-500',
  Completed: 'bg-emerald-500',
  'On Hold': 'bg-amber-500',
  Pending: 'bg-gray-400',
};

function initials(m?: { firstName?: string; lastName?: string }): string {
  return `${m?.firstName?.[0] ?? ''}${m?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function fullName(m?: { firstName?: string; lastName?: string }): string {
  return [m?.firstName, m?.lastName].filter(Boolean).join(' ') || 'Unknown';
}

function extractList<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.data)) return r.data as T[];
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HODDashboard() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [leaveStatuses, setLeaveStatuses] = useState<Record<string, 'approved' | 'rejected'>>({});

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const departmentName = (user as { department?: string })?.department ?? null;

  // HOD Stats
  const { data: stats, isLoading: statsLoading } = useQuery<HODStats>({
    queryKey: ['hod-stats', refreshKey],
    queryFn: async () => {
      try {
        return await apiClient.get<HODStats>('/dashboards/hod/stats');
      } catch {
        return FALLBACK_STATS;
      }
    },
    staleTime: 60_000,
  });

  // Team members
  const { data: teamRaw } = useQuery({
    queryKey: ['hod-team', refreshKey],
    queryFn: async () => {
      try { return await apiClient.getRaw('/staff', { limit: 20 }); }
      catch { return { data: [] }; }
    },
    staleTime: 60_000,
  });
  const teamMembers = extractList<TeamMember>(teamRaw);

  // Projects
  const { data: projectsRaw } = useQuery({
    queryKey: ['hod-projects', refreshKey],
    queryFn: async () => {
      try { return await apiClient.getRaw('/projects', { limit: 6 }); }
      catch { return { data: [] }; }
    },
    staleTime: 120_000,
  });
  const projects = extractList<Project>(projectsRaw);

  // Tasks
  const { data: tasksRaw } = useQuery({
    queryKey: ['hod-tasks', refreshKey],
    queryFn: async () => {
      try { return await apiClient.getRaw('/tasks', { limit: 10 }); }
      catch { return { data: [] }; }
    },
    staleTime: 60_000,
  });
  const tasks = extractList<Task>(tasksRaw);

  // Leave requests from team
  const { data: leaveRaw } = useQuery({
    queryKey: ['hod-leave', refreshKey],
    queryFn: async () => {
      try { return await apiClient.getRaw('/leave/requests', { status: 'Pending', limit: 5 }); }
      catch { return { data: [] }; }
    },
    staleTime: 30_000,
  });
  const leaveRequests = extractList<LeaveRequest>(leaveRaw);

  const s = stats ?? FALLBACK_STATS;

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
          <p className="text-sm text-gray-500">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            Department Control
          </h1>
          {departmentName && (
            <p className="text-sm font-medium text-indigo-600 mt-1">{departmentName} Department</p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </motion.button>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Team Size" value={s.teamSize} icon={<Users className="w-7 h-7" />} color="blue" />
        <StatCard label="Present Today" value={s.presentToday} icon={<UserCheck className="w-7 h-7" />} color="green" />
        <StatCard label="Attendance %" value={`${s.attendancePct}%`} icon={<Percent className="w-7 h-7" />} color="purple" />
        <StatCard label="Pending Approvals" value={s.pendingApprovals} icon={<Bell className="w-7 h-7" />} color="yellow" />
      </motion.div>

      {/* ── My Team + Approval Requests ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Team Table */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              My Team
            </h2>
            <Link to="/staff" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {teamMembers.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No team data available</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {teamMembers.map((m, i) => (
                <div key={m._id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(m)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{fullName(m)}</p>
                    <p className="text-xs text-gray-500 truncate">{m.position ?? '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ATTENDANCE_STYLE[m.attendanceStatus ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                    {m.attendanceStatus ?? 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Leave / Approval Requests */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Approval Requests
              {leaveRequests.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  {leaveRequests.length}
                </span>
              )}
            </h2>
          </div>
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No pending approval requests</p>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((req, i) => {
                const localStatus = leaveStatuses[req._id];
                const isPending = !localStatus;
                return (
                  <div
                    key={req._id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      localStatus === 'approved'
                        ? 'bg-emerald-50 border-emerald-100'
                        : localStatus === 'rejected'
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
                        {req.leaveType ?? 'Leave'} &bull; {req.numberOfDays ?? '?'}d
                        {req.startDate ? ` · from ${new Date(req.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      </p>
                    </div>
                    {isPending ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setLeaveStatuses((p) => ({ ...p, [req._id]: 'approved' }))}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setLeaveStatuses((p) => ({ ...p, [req._id]: 'rejected' }))}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        localStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {localStatus === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Assigned Projects ── */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-violet-500" />
            Assigned Projects
          </h2>
          <Link to="/projects" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No projects assigned</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const progress = proj.progress ?? 0;
              return (
                <div key={proj._id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{proj.name ?? 'Unnamed Project'}</p>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[proj.status ?? ''] ?? 'bg-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{proj.status ?? 'Unknown'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      />
                    </div>
                  </div>
                  {proj.deadline && (
                    <p className="text-xs text-gray-400">
                      Due {new Date(proj.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Team Tasks Overview ── */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-emerald-500" />
            Team Tasks
          </h2>
          <Link to="/tasks" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No tasks found</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title ?? 'Untitled Task'}</p>
                  <p className="text-xs text-gray-500">
                    {fullName(t.assignee)}
                    {t.dueDate ? ` · Due ${new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.priority && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[t.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.priority}
                    </span>
                  )}
                  {t.status && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                      {t.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Quick Links ── */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tasks', href: '/tasks', icon: ListTodo, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Projects', href: '/projects', icon: FolderKanban, color: 'text-violet-600 bg-violet-50' },
          { label: 'Attendance', href: '/attendance', icon: UserCheck, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Messages', href: '/messages', icon: MessageSquare, color: 'text-amber-600 bg-amber-50' },
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

export default HODDashboard;
