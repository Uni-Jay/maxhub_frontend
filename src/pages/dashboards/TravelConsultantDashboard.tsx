import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plane, Globe, Users, FileText, ArrowUpRight,
  CheckCircle2, Clock, AlertCircle, Map,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import DashboardClock from '@components/ui/DashboardClock';

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const STATS = [
  { label: 'Active Applications', value: '18', icon: FileText, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/visamax' },
  { label: 'Clients', value: '64', icon: Users, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/clients' },
  { label: 'Visas Processed', value: '12', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', href: '/visamax' },
  { label: 'Pending Review', value: '5', icon: Clock, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20', href: '/visamax' },
];

const RECENT_APPS = [
  { name: 'Tunde Adewale', service: 'UK Study Visa', status: 'Processing', date: '2026-06-10' },
  { name: 'Mrs Ngozi Obi', service: 'Canada Tourist', status: 'Approved', date: '2026-06-08' },
  { name: 'Emeka Chukwu', service: 'Flight Booking', status: 'Completed', date: '2026-06-07' },
  { name: 'Sola Fashola', service: 'Work Visa - UK', status: 'Pending Docs', date: '2026-06-05' },
  { name: 'Amaka Eze', service: 'Holiday Package', status: 'Booked', date: '2026-06-03' },
];

const STATUS_STYLE: Record<string, string> = {
  Processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Pending Docs': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Booked: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const QUICK_LINKS = [
  { label: 'VisaMax Hub', href: '/visamax', icon: Globe, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
  { label: 'Clients', href: '/clients', icon: Users, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  { label: 'Invoices', href: '/invoices', icon: FileText, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  { label: 'Messages', href: '/messages', icon: Map, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
];

export default function TravelConsultantDashboard() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{user?.firstName ?? 'Consultant'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DashboardClock />
          <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
            <Plane className="h-4 w-4" /> Travel Desk
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} to={href}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
            </div>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Plane className="h-5 w-5 text-indigo-500" /> Recent Applications
            </h2>
            <Link to="/visamax" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {RECENT_APPS.map((app, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{app.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{app.service} · {app.date}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links + Alerts */}
        <motion.div variants={item} className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-cyan-500" /> Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
                <Link key={href} to={href}
                  className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">5 applications need attention</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Documents pending from clients. Follow up required.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
