import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Award, ClipboardCheck, TrendingUp,
  ArrowUpRight, GraduationCap, Calendar, Star,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const STATS = [
  { label: 'Active Courses', value: '4', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/lms/courses' },
  { label: 'Total Students', value: '87', icon: Users, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/lms/courses' },
  { label: 'Exams Scheduled', value: '3', icon: ClipboardCheck, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20', href: '/lms/exams' },
  { label: 'Certificates Issued', value: '42', icon: Award, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', href: '/lms/certificates' },
];

const UPCOMING_SESSIONS = [
  { course: 'Web Design Fundamentals', date: '2026-06-17', time: '09:00', students: 22 },
  { course: 'Digital Marketing', date: '2026-06-17', time: '11:30', students: 18 },
  { course: 'Graphic Design', date: '2026-06-18', time: '09:00', students: 25 },
  { course: 'Business Management', date: '2026-06-19', time: '10:00', students: 22 },
];

const TOP_STUDENTS = [
  { name: 'Amaka Eze', course: 'Web Design', score: 96 },
  { name: 'Tolu Adeyemi', course: 'Digital Marketing', score: 92 },
  { name: 'Chike Obi', course: 'Graphic Design', score: 89 },
  { name: 'Fatima Bello', course: 'Web Design', score: 88 },
];

const QUICK_LINKS = [
  { label: 'My Courses', href: '/lms/courses', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
  { label: 'Exams', href: '/lms/exams', icon: ClipboardCheck, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
  { label: 'Certificates', href: '/lms/certificates', icon: Award, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  { label: 'Attendance', href: '/attendance', icon: Calendar, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  { label: 'Training', href: '/hr/training', icon: GraduationCap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  { label: 'Analytics', href: '/analytics', icon: TrendingUp, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
];

export default function InstructorDashboard() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            {user?.firstName ? `Instructor ${user.firstName}` : 'Instructor'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
          <GraduationCap className="h-4 w-4" /> Teaching
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" /> Upcoming Sessions
            </h2>
            <Link to="/lms/courses" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              All courses <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {UPCOMING_SESSIONS.map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.course}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.date} at {s.time}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <Users className="h-3.5 w-3.5" /> {s.students} students
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Students */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
            <Star className="h-5 w-5 text-amber-500" /> Top Students
          </h2>
          <div className="space-y-3">
            {TOP_STUDENTS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.course}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{s.score}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div variants={item} className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
          <Link key={href} to={href}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</span>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
