import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, CheckSquare, ArrowUpRight,
  MapPin, CheckCircle2, TrendingUp, Send,
  DollarSign, MessageSquare, Bell, Star,
  Building2,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import { useAuthStore } from '@store/authStore';
import { useApiQuery } from '@/hooks/useApiQuery';
import { taskService } from '@/services/taskService';
import { leaveService } from '@/services/leaveService';
import { payrollService } from '@/services/payrollService';
import { notificationService } from '@/services/notificationService';
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

export function StaffDashboard() {
  const { user } = useAuthStore();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

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

  const isLoading = tasksLoading && leaveLoading && payslipsLoading && notifLoading;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const tasks = tasksData?.data ?? [];
  const pendingTasks = tasks.filter((t) => t.status !== 'Done').length;
  const leaveTypes = leaveBalance?.leaveTypes ?? [];
  const totalLeaveAvailable = leaveBalance?.available ?? 0;
  const payslips = payslipsData?.data ?? [];
  const notifications = notificationsData?.data ?? [];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            {user?.firstName ?? 'Team member'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            {user?.businessUnit && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full ml-2">
                <Building2 className="w-3 h-3" /> {user.businessUnit}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Today</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </motion.div>

      {/* Attendance check-in card */}
      <motion.div variants={item}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white"
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-4 top-8 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-200">Attendance</p>
            <p className="text-2xl font-bold mt-1">
              {checkedIn ? (checkInTime ? `Checked in at ${checkInTime}` : 'Checked In') : 'Not yet checked in'}
            </p>
            <div className="flex items-center gap-2 mt-2 text-sm text-indigo-200">
              <MapPin className="w-3.5 h-3.5" />
              Main Office
            </div>
          </div>
          <Link to="/attendance/check-in">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!checkedIn) {
                  setCheckedIn(true);
                  setCheckInTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                }
              }}
              className={`px-5 py-3 rounded-xl font-semibold text-sm transition ${
                checkedIn ? 'bg-white/20 text-white cursor-default' : 'bg-white text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              {checkedIn ? <CheckCircle2 className="w-5 h-5" /> : 'Check In'}
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Tasks', value: tasks.length.toString(), icon: CheckSquare, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/tasks' },
          { label: 'Pending Tasks', value: pendingTasks.toString(), icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/tasks' },
          { label: 'Leave Available', value: totalLeaveAvailable > 0 ? `${totalLeaveAvailable}d` : '—', icon: Calendar, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', href: '/leave/balance' },
          { label: 'Notifications', value: notifications.filter(n => !n.isRead).length.toString(), icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20', href: '/notifications' },
        ].map((s) => (
          <Link key={s.label} to={s.href}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-500" /> My Tasks
            </h2>
            <Link to="/tasks" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No tasks assigned</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
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
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" /> Leave Balance
            </h2>
            <Link to="/leave/apply" className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
              Apply
            </Link>
          </div>
          {leaveTypes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Leave balance unavailable</p>
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
          <Link to="/leave/balance" className="mt-5 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
            Full balance details <ArrowUpRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Payslips */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> My Payslips
            </h2>
            <Link to="/payroll/my-slips" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {payslips.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No payslips available</p>
          ) : (
            <div className="space-y-3">
              {payslips.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
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
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Notifications
            </h2>
            <Link to="/notifications" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700">
              All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
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
        <motion.div variants={item} className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-indigo-500" /> Chat Activity
          </h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {notifications.filter(n => n.notificationType === 'Message' && !n.isRead).length}
            </p>
            <p className="text-xs">Unread messages</p>
          </div>
          <Link to="/messages"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
            <MessageSquare className="w-4 h-4" /> Open Messages
          </Link>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item} className="lg:col-span-2 grid grid-cols-3 sm:grid-cols-4 gap-3 content-start">
          {[
            { label: 'Check In', href: '/attendance/check-in', icon: Clock, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Apply Leave', href: '/leave/apply', icon: Calendar, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
            { label: 'My Tasks', href: '/tasks', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Weekly Report', href: '/hr/weekly-report', icon: Send, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'My Payslips', href: '/payroll/my-slips', icon: DollarSign, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
            { label: 'Appraisals', href: '/hr/appraisals', icon: Star, color: 'text-sky-600 bg-sky-50 dark:bg-sky-900/20' },
            { label: 'Messages', href: '/messages', icon: MessageSquare, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
            { label: 'Notifications', href: '/notifications', icon: Bell, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
          ].map((q) => (
            <Link key={q.href} to={q.href} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.color}`}>
                <q.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{q.label}</span>
            </Link>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default StaffDashboard;
