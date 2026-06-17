import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle2, AlertCircle, TrendingUp, Calendar,
  ArrowUpRight, Clock, RefreshCw, UserCheck, BarChart3,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useApiMutation } from '@/hooks/useApiMutation';
import { leaveService } from '@/services/leaveService';
import { taskService } from '@/services/taskService';
import { staffService } from '@/services/staffService';

const STATUS_STYLES: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700',
  Late: 'bg-amber-100 text-amber-700',
  OnLeave: 'bg-blue-100 text-blue-700',
  Absent: 'bg-red-100 text-red-700',
  Active: 'bg-emerald-100 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-600',
};

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
];


const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function ManagerDashboard() {
  const { data: leavesData, isLoading: leavesLoading, refetch: refetchLeaves } = useApiQuery(
    ['manager-leave-requests'],
    () => leaveService.getRequests({ status: 'Pending', limit: 5 })
  );
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useApiQuery(
    ['manager-tasks'],
    () => taskService.getAll({ limit: 200 })
  );
  const { data: teamData } = useApiQuery(
    ['manager-team'],
    () => staffService.getAll({ limit: 6 })
  );
  const { data: staffCountData } = useApiQuery(
    ['manager-staff-count'],
    () => staffService.getAll({ limit: 1 })
  );

  const approveMutation = useApiMutation(
    ({ id, comments }: { id: string | number; comments?: string }) => leaveService.approve(id, comments),
    { invalidateKeys: [['manager-leave-requests']] }
  );
  const rejectMutation = useApiMutation(
    ({ id, comments }: { id: string | number; comments?: string }) => leaveService.reject(id, comments),
    { invalidateKeys: [['manager-leave-requests']] }
  );

  const isLoading = leavesLoading && tasksLoading;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const leaves = leavesData?.data ?? [];
  const pendingCount = leaves.length;
  const tasks = tasksData?.data ?? [];
  const teamSize = staffCountData?.pagination?.total ?? 0;
  const teamMembers = teamData?.data ?? [];

  const taskGroups = tasks.reduce<Record<string, number>>((acc, t) => {
    const key = t.status ?? 'Todo';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const weeklyTasks = [
    { label: 'Completed', value: (taskGroups['Done'] ?? 0) + (taskGroups['Completed'] ?? 0), color: 'bg-emerald-500' },
    { label: 'In Progress', value: (taskGroups['InProgress'] ?? 0) + (taskGroups['In_Progress'] ?? 0), color: 'bg-indigo-500' },
    { label: 'Blocked', value: taskGroups['Blocked'] ?? 0, color: 'bg-red-500' },
    { label: 'Todo', value: taskGroups['Todo'] ?? 0, color: 'bg-amber-500' },
  ];
  const total = weeklyTasks.reduce((s, t) => s + t.value, 0);
  const activeTasks = weeklyTasks[1].value + weeklyTasks[3].value;

  const handleRefresh = async () => {
    await Promise.all([refetchLeaves(), refetchTasks()]);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team oversight and daily operations</p>
        </div>
        <motion.button
          onClick={handleRefresh}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </motion.button>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Size', value: teamSize > 0 ? teamSize.toString() : '—', icon: Users, color: 'text-indigo-600 bg-indigo-50', href: '/staff' },
          { label: 'Active Tasks', value: activeTasks > 0 ? activeTasks.toString() : '—', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50', href: '/tasks' },
          { label: 'Pending Leaves', value: pendingCount.toString(), icon: AlertCircle, color: 'text-amber-600 bg-amber-50', href: '/leave/requests' },
          { label: 'Total Tasks', value: total > 0 ? total.toString() : '—', icon: CheckCircle2, color: 'text-violet-600 bg-violet-50', href: '/tasks' },
        ].map((s) => (
          <Link key={s.label} to={s.href}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leave Approvals */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Leave Approvals
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">{pendingCount}</span>
              )}
            </h2>
            <Link to="/leave/requests" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {leaves.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No pending leave requests</p>
            ) : leaves.map((l, i) => {
              const name = `${l.staff?.firstName ?? ''} ${l.staff?.lastName ?? ''}`.trim() || `Staff #${l.staffId}`;
              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                    <p className="text-xs text-gray-500">{l.leaveType?.name ?? l.leaveTypeId} • {l.numberofDays}d • {l.startDate}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => approveMutation.mutate({ id: l.id })}
                      disabled={approveMutation.isPending}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >✓</button>
                    <button
                      onClick={() => rejectMutation.mutate({ id: l.id })}
                      disabled={rejectMutation.isPending}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Task breakdown */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Task Overview
            </h2>
            <Link to="/tasks" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No tasks found</p>
          ) : (
            <div className="space-y-3">
              {weeklyTasks.map((t) => (
                <div key={t.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{t.label}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{t.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${total > 0 ? (t.value / total) * 100 : 0}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-2 rounded-full ${t.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-sm">
            <span className="text-gray-500">Total tasks</span>
            <span className="font-bold text-gray-900 dark:text-white">{total}</span>
          </div>
        </motion.div>
      </div>

      {/* Team Status */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" />
            Team Members
          </h2>
          <Link to="/staff" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            All staff <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No team members found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMembers.map((m, i) => {
              const name = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.employeeId;
              const status = m.status ?? 'Active';
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.designation?.title ?? m.position ?? 'Staff'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Leave Requests', href: '/leave/requests', icon: Calendar, color: 'text-amber-600 bg-amber-50' },
          { label: 'All Tasks', href: '/tasks', icon: CheckCircle2, color: 'text-violet-600 bg-violet-50' },
          { label: 'Attendance', href: '/attendance', icon: Clock, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Reports', href: '/reports/attendance', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
        ].map((q) => (
          <Link key={q.href} to={q.href} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
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

export default ManagerDashboard;
