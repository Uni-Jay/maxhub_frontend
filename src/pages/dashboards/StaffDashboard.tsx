import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, CheckSquare, ArrowUpRight, ArrowUpCircle,
  MapPin, CheckCircle2, TrendingUp, Send,
  DollarSign, MessageSquare, Bell, Star,
  Building2, Sparkles, ChevronRight, Video, FolderOpen, Bot,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import DashboardClock from '@components/ui/DashboardClock';
import { useAuthStore } from '@store/authStore';
import { useApiQuery } from '@/hooks/useApiQuery';
import { taskService } from '@/services/taskService';
import { leaveService } from '@/services/leaveService';
import { payrollService } from '@/services/payrollService';
import { notificationService } from '@/services/notificationService';
import { projectService } from '@/services/projectService';
import { videoCallService } from '@/services/videoCallService';
import { staffDashboardService } from '@/services/dashboardService';
import { apiClient } from '@services/apiClient';
import type { AttendanceRecord } from '@/types';
import { formatNgTime, ngHour } from '@/utils/ngTime';
import { useState, useEffect } from 'react';

const TASK_STATUS: Record<string, string> = {
  Todo: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  InProgress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ANNC_TYPE: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  Leave: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
  System: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
  Alert: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function SectionTitle({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2.5">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      {children}
    </h2>
  );
}

export function StaffDashboard() {
  const { user } = useAuthStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayAttendance } = useApiQuery<AttendanceRecord | null>(
    ['attendance', 'today'],
    () => apiClient.get<AttendanceRecord>('/attendance/today').catch(() => null)
  );
  const checkedIn = !!todayAttendance?.checkInTime;

  const { data: tasksData, isLoading: tasksLoading } = useApiQuery(
    ['staff-tasks'],
    () => taskService.getAll({ limit: 4 })
  );
  const { data: leaveBalance, isLoading: leaveLoading } = useApiQuery(
    ['staff-leave-balance'],
    () => leaveService.getBalance()
  );
  const { data: payslipsData, isLoading: payslipsLoading } = useApiQuery(
    ['staff-payslips'],
    () => payrollService.getSalaries({ limit: 3 })
  );
  const { data: notificationsData, isLoading: notifLoading } = useApiQuery(
    ['staff-notifications'],
    () => notificationService.getAll({ limit: 5 })
  );
  const { data: projectsData } = useApiQuery(
    ['staff-projects'],
    () => projectService.getAll({ limit: 1 })
  );
  const { data: meetingsData } = useApiQuery(
    ['staff-upcoming-meetings'],
    () => videoCallService.getMeetings({ status: 'Scheduled', limit: 5 })
  );
  const { data: staffStats } = useApiQuery(
    ['staff-dashboard-stats'],
    () => staffDashboardService.getStats()
  );

  const isLoading = tasksLoading && leaveLoading && payslipsLoading && notifLoading;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const hour = ngHour(now);
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const tasks = tasksData?.data ?? [];
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;
  const leaveTypes = leaveBalance?.leaveTypes ?? [];
  const totalLeaveAvailable = leaveBalance?.available ?? 0;
  const payslips = payslipsData?.data ?? [];
  const notifications = notificationsData?.data ?? [];
  const myProjectsCount = projectsData?.pagination?.total ?? 0;
  const upcomingMeetings = meetingsData?.data ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const myDepartments = staffStats?.departments ?? [];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 shadow-sm"
      >
        <div className="absolute -right-10 -top-16 w-56 h-56 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-full blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {greeting},
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 leading-tight">
                {user?.firstName ?? 'Team member'} {user?.lastName ?? ''}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {now.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                {user?.businessUnit && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                    <Building2 className="w-3 h-3" /> {user.businessUnit}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <DashboardClock />
          </div>
        </div>
      </motion.div>

      {/* My Departments — only worth showing once she's assigned to more than one */}
      {myDepartments.length > 1 && (
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">My Departments</h2>
            <span className="text-xs text-gray-400">({myDepartments.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {myDepartments.map((d) => (
              <div key={d.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3.5 bg-gray-50 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{d.name}</p>
                  {d.isPrimary && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex-shrink-0">Primary</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{d.teamSize} team member{d.teamSize !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Attendance check-in card */}
      <motion.div variants={item}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-lg shadow-indigo-200/50 dark:shadow-none"
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute left-1/3 -bottom-12 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Attendance
            </p>
            <p className="text-2xl font-bold mt-1">
              {checkedIn ? `Checked in at ${formatNgTime(todayAttendance?.checkInTime)}` : 'Not yet checked in'}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-indigo-200">
              <MapPin className="w-3.5 h-3.5" />
              Main Office
            </div>
          </div>
          <Link to="/attendance/check-in">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition shadow-md ${
                checkedIn ? 'bg-white/20 text-white cursor-default' : 'bg-white text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              {checkedIn ? <CheckCircle2 className="w-5 h-5" /> : 'Check In'}
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'My Tasks', value: tasks.length.toString(), icon: CheckSquare, gradient: 'from-indigo-500 to-blue-600', href: '/tasks' },
          { label: 'Pending Tasks', value: pendingTasks.toString(), icon: Clock, gradient: 'from-amber-500 to-orange-600', href: '/tasks' },
          { label: 'Leave Available', value: totalLeaveAvailable > 0 ? `${totalLeaveAvailable}d` : '—', icon: Calendar, gradient: 'from-emerald-500 to-green-600', href: '/leave/balance' },
          { label: 'Notifications', value: unreadCount.toString(), icon: TrendingUp, gradient: 'from-violet-500 to-purple-600', href: '/notifications' },
          { label: 'My Projects', value: myProjectsCount.toString(), icon: Building2, gradient: 'from-cyan-500 to-sky-600', href: '/projects' },
          { label: 'Upcoming Meetings', value: upcomingMeetings.length.toString(), icon: Video, gradient: 'from-rose-500 to-pink-600', href: '/calls' },
        ].map((s) => (
          <motion.div key={s.label} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Link to={s.href}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow shadow-sm h-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={CheckSquare} color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">My Tasks</SectionTitle>
            <Link to="/tasks" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700 font-medium">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No tasks assigned</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.project?.name ?? 'General'} · Due {t.dueDate ?? '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS[t.status ?? 'Todo'] ?? 'bg-gray-100 text-gray-600'}`}>
                    {t.status ?? 'Todo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Leave Balance */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={Calendar} color="bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">Leave Balance</SectionTitle>
            <Link to="/leave/apply" className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium">
              Apply
            </Link>
          </div>
          {leaveTypes.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Leave balance unavailable</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveTypes.slice(0, 3).map((l) => {
                const remaining = l.remainingDays ?? 0;
                const total = l.totalDays || 1;
                const pct = Math.round((remaining / total) * 100);
                const COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500'];
                const idx = leaveTypes.indexOf(l);
                return (
                  <div key={l.leaveTypeId}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 dark:text-gray-400">{l.leaveType?.name ?? `Type #${l.leaveTypeId}`}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{remaining}/{total} days</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                        className={`h-2 rounded-full ${COLORS[idx % COLORS.length]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link to="/leave/balance" className="mt-5 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
            Full balance details <ArrowUpRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Payslips */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={DollarSign} color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">My Payslips</SectionTitle>
            <Link to="/payroll/my-slips" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700 font-medium">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {payslips.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payslips available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payslips.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.period?.periodName ?? `${p.period?.month}/${p.period?.year}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">₦{p.netSalary?.toLocaleString() ?? '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Notifications / Announcements */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={Bell} color="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Notifications</SectionTitle>
            <Link to="/notifications" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700 font-medium">
              All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className={`border rounded-xl p-3.5 ${ANNC_TYPE[n.notificationType] ?? ANNC_TYPE.info}`}>
                  <p className="text-sm font-semibold leading-tight">{n.title}</p>
                  <p className="text-xs mt-1 opacity-80 line-clamp-2">{n.message}</p>
                  <p className="text-xs mt-1.5 opacity-60">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Chat Activity + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <motion.div variants={item} className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200/50 dark:shadow-none">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full" />
          <h2 className="font-semibold flex items-center gap-2 mb-4 relative">
            <MessageSquare className="w-5 h-5" /> Chat Activity
          </h2>
          <div className="space-y-1 relative">
            <p className="text-3xl font-bold">{unreadCount}</p>
            <p className="text-xs text-indigo-200">Unread messages</p>
          </div>
          <Link to="/messages"
            className="mt-5 w-full flex items-center justify-center gap-2 bg-white text-indigo-600 hover:bg-indigo-50 py-2.5 rounded-xl text-sm font-semibold transition relative">
            <MessageSquare className="w-4 h-4" /> Open Messages
          </Link>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Quick Actions</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {[
              { label: 'Check In', href: '/attendance/check-in', icon: Clock, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
              { label: 'Apply Leave', href: '/leave/apply', icon: Calendar, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
              { label: 'My Tasks', href: '/tasks', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Weekly Report', href: '/hr/weekly-report', icon: Send, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'My Payslips', href: '/payroll/my-slips', icon: DollarSign, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
              { label: 'Appraisals', href: '/hr/appraisals', icon: Star, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' },
              { label: 'Promotions', href: '/hr/promotions', icon: ArrowUpCircle, color: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20' },
              { label: 'Meetings', href: '/calls', icon: Video, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
              { label: 'Calendar', href: '/calendar', icon: Calendar, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Files', href: '/files', icon: FolderOpen, color: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20' },
              { label: 'AI Assistant', href: '/ai-assistant', icon: Bot, color: 'text-violet-700 bg-violet-50 dark:bg-violet-900/20' },
              { label: 'Notifications', href: '/notifications', icon: Bell, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
            ].map((q) => (
              <motion.div key={q.href} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link to={q.href} className="group flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition text-center relative">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.color}`}>
                    <q.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{q.label}</span>
                  <ChevronRight className="absolute top-2 right-2 w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default StaffDashboard;
