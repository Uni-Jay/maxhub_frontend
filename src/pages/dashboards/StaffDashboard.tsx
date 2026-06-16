import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, CheckSquare, ArrowUpRight,
  MapPin, CheckCircle2, TrendingUp, Send, FileText,
  DollarSign, MessageSquare, Bell, Star, ChevronRight,
  Building2,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import { useAuthStore } from '@store/authStore';

const myTasks = [
  { id: 1, title: 'Prepare monthly report', project: 'Admin', due: '2026-06-18', status: 'InProgress' },
  { id: 2, title: 'Review client proposals', project: 'Sales', due: '2026-06-20', status: 'Todo' },
  { id: 3, title: 'Update staff database', project: 'HR', due: '2026-06-22', status: 'InProgress' },
  { id: 4, title: 'Team coordination call', project: 'Operations', due: '2026-06-17', status: 'Done' },
];

const leaveBalance = [
  { type: 'Annual Leave', total: 20, used: 8, color: 'bg-indigo-500' },
  { type: 'Sick Leave', total: 10, used: 2, color: 'bg-emerald-500' },
  { type: 'Emergency Leave', total: 3, used: 0, color: 'bg-amber-500' },
];

const myWeeklyReports = [
  { week: 'June 9–13, 2026', status: 'Approved', score: 92 },
  { week: 'June 2–6, 2026', status: 'Approved', score: 88 },
  { week: 'May 26–30, 2026', status: 'Submitted', score: null },
];

const myPayslips = [
  { period: 'May 2026', amount: '₦185,000', status: 'Paid' },
  { period: 'April 2026', amount: '₦185,000', status: 'Paid' },
  { period: 'March 2026', amount: '₦185,000', status: 'Paid' },
];

const announcements = [
  { title: 'Public Holiday — June 12', body: 'Democracy Day. Office closed. No attendance required.', date: '2026-06-10', type: 'info' },
  { title: 'New Leave Policy', body: 'Updated leave application process effective July 1, 2026.', date: '2026-06-08', type: 'policy' },
  { title: 'Company Outing — June 28', body: 'Team bonding event. Details shared via email.', date: '2026-06-05', type: 'event' },
];

const TASK_STATUS: Record<string, string> = {
  Todo: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  InProgress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const REPORT_STATUS: Record<string, string> = {
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Submitted: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  'Revision Requested': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const ANNC_TYPE: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  policy: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
  event: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
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
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const pendingTasks = myTasks.filter((t) => t.status !== 'Done').length;

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
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
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
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
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
              Main Office, Lagos
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
          { label: 'My Tasks', value: myTasks.length.toString(), icon: CheckSquare, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/tasks' },
          { label: 'Pending Tasks', value: pendingTasks.toString(), icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/tasks' },
          { label: 'Leave Balance', value: '12d', icon: Calendar, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', href: '/leave/balance' },
          { label: 'Performance', value: '94%', icon: TrendingUp, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20', href: '/hr/appraisals' },
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
          <div className="space-y-3">
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.project} · Due {t.due}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
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
          <div className="space-y-4">
            {leaveBalance.map((l) => {
              const remaining = l.total - l.used;
              const pct = Math.round((remaining / l.total) * 100);
              return (
                <div key={l.type}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 dark:text-gray-400">{l.type}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{remaining}/{l.total} days</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                      className={`h-2 rounded-full ${l.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/leave/balance" className="mt-5 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
            Full balance details <ArrowUpRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>

      {/* Weekly Reports */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> My Weekly Reports
          </h2>
          <Link to="/hr/weekly-report"
            className="text-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-1.5 rounded-lg hover:from-indigo-700 hover:to-violet-700 transition flex items-center gap-1">
            <Send className="w-3 h-3" /> Submit Report
          </Link>
        </div>
        {myWeeklyReports.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No reports submitted yet</p>
        ) : (
          <div className="space-y-3">
            {myWeeklyReports.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{r.week}</p>
                  {r.score !== null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" /> Score: {r.score}/100
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${REPORT_STATUS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {r.status}
                </span>
                <Link to="/hr/weekly-report">
                  <ChevronRight className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </motion.div>

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
          <div className="space-y-3">
            {myPayslips.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.period}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.amount}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Announcements */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Announcements
            </h2>
            <Link to="/notifications" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-700">
              All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.map((a, i) => (
              <div key={i} className={`border rounded-xl p-3.5 ${ANNC_TYPE[a.type]}`}>
                <p className="text-sm font-semibold leading-tight">{a.title}</p>
                <p className="text-xs mt-1 opacity-80">{a.body}</p>
                <p className="text-xs mt-1.5 opacity-60">{a.date}</p>
              </div>
            ))}
          </div>
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
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">3</p>
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
