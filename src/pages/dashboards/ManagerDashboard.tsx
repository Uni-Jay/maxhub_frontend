import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle2, AlertCircle, TrendingUp, Calendar,
  ArrowUpRight, Clock, RefreshCw, UserCheck, BarChart3,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';

const pendingLeaves = [
  { id: 1, name: 'Priya Sharma', type: 'Annual Leave', days: 5, date: '2026-06-20', avatar: 'PS' },
  { id: 2, name: 'Raj Kumar', type: 'Sick Leave', days: 2, date: '2026-06-18', avatar: 'RK' },
  { id: 3, name: 'Aisha Bello', type: 'Maternity Leave', days: 90, date: '2026-07-01', avatar: 'AB' },
];

const teamMembers = [
  { name: 'Daniel Okonkwo', role: 'Senior Dev', status: 'Present', task: 'API Integration' },
  { name: 'Fatima Yusuf', role: 'Designer', status: 'Present', task: 'Dashboard UI' },
  { name: 'James Eze', role: 'QA Engineer', status: 'Late', task: 'Test Suite' },
  { name: 'Chioma Adeyemi', role: 'PM', status: 'OnLeave', task: 'Sprint Planning' },
  { name: 'Emeka Nwachukwu', role: 'Backend Dev', status: 'Present', task: 'DB Migration' },
];

const weeklyTasks = [
  { label: 'Completed', value: 24, color: 'bg-emerald-500' },
  { label: 'In Progress', value: 12, color: 'bg-indigo-500' },
  { label: 'Blocked', value: 3, color: 'bg-red-500' },
  { label: 'Todo', value: 8, color: 'bg-amber-500' },
];

const STATUS_STYLES: Record<string, string> = {
  Present: 'bg-emerald-100 text-emerald-700',
  Late: 'bg-amber-100 text-amber-700',
  OnLeave: 'bg-blue-100 text-blue-700',
  Absent: 'bg-red-100 text-red-700',
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
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState(pendingLeaves.map((l) => ({ ...l, status: 'pending' as 'pending' | 'approved' | 'rejected' })));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const total = weeklyTasks.reduce((s, t) => s + t.value, 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team oversight and daily operations</p>
        </div>
        <motion.button
          onClick={async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </motion.button>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Size', value: '24', icon: Users, color: 'text-indigo-600 bg-indigo-50', href: '/staff' },
          { label: 'Present Today', value: '21', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50', href: '/attendance' },
          { label: 'Pending Leaves', value: pendingCount.toString(), icon: AlertCircle, color: 'text-amber-600 bg-amber-50', href: '/leave/requests' },
          { label: 'Active Tasks', value: '12', icon: CheckCircle2, color: 'text-violet-600 bg-violet-50', href: '/tasks' },
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
            {leaves.map((l, i) => (
              <div key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                l.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                l.status === 'rejected' ? 'bg-red-50 border-red-100' :
                'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {l.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{l.name}</p>
                  <p className="text-xs text-gray-500">{l.type} • {l.days}d • {l.date}</p>
                </div>
                {l.status === 'pending' ? (
                  <div className="flex gap-1.5">
                    <button onClick={() => setLeaves(p => p.map(x => x.id === l.id ? { ...x, status: 'approved' } : x))}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">✓</button>
                    <button onClick={() => setLeaves(p => p.map(x => x.id === l.id ? { ...x, status: 'rejected' } : x))}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600">✕</button>
                  </div>
                ) : (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {l.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Task breakdown */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Weekly Tasks
            </h2>
            <Link to="/tasks" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
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
                    animate={{ width: `${(t.value / total) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-2 rounded-full ${t.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
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
            Team Status Today
          </h2>
          <Link to="/staff" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            All staff <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teamMembers.map((m, i) => (
            <div key={m.name} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.name}</p>
                <p className="text-xs text-gray-500 truncate">{m.task}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
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
