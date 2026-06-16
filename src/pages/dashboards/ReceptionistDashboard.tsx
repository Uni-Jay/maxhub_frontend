import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone, Users, Calendar, ClipboardList, MessageSquare,
  ArrowUpRight, Clock, CheckCircle2, Bell,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const STATS = [
  { label: 'Clients on File', value: '142', icon: Users, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/clients' },
  { label: "Today's Appointments", value: '8', icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/calendar' },
  { label: 'Messages', value: '5', icon: MessageSquare, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20', href: '/messages' },
  { label: 'Queries Open', value: '3', icon: ClipboardList, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20', href: '/queries' },
];

const APPOINTMENTS = [
  { time: '09:00', name: 'Ayo Okafor', purpose: 'Visa Consultation', status: 'confirmed' },
  { time: '10:30', name: 'Mrs Abimbola', purpose: 'Document Pickup', status: 'confirmed' },
  { time: '12:00', name: 'James Obi', purpose: 'Admission Enquiry', status: 'pending' },
  { time: '14:00', name: 'Ngozi Eze', purpose: 'Flight Booking', status: 'confirmed' },
  { time: '15:30', name: 'Emeka Nwachukwu', purpose: 'General Enquiry', status: 'pending' },
];

const QUICK_LINKS = [
  { label: 'Client List', href: '/clients', icon: Users, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
  { label: 'Calendar', href: '/calendar', icon: Calendar, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  { label: 'Messages', href: '/messages', icon: MessageSquare, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  { label: 'Queries', href: '/queries', icon: ClipboardList, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
];

export default function ReceptionistDashboard() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{user?.firstName ?? 'Reception'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
          <Phone className="h-4 w-4" /> Front Desk
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
        {/* Today's Appointments */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" /> Today's Schedule
            </h2>
            <Link to="/calendar" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              Calendar <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {APPOINTMENTS.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-12 flex-shrink-0">{a.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.purpose}</p>
                </div>
                <div className="flex items-center gap-1">
                  {a.status === 'confirmed'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <Bell className="h-4 w-4 text-amber-500" />}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-violet-500" /> Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
              <Link key={href} to={href}
                className="flex flex-col items-center justify-center gap-2.5 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
