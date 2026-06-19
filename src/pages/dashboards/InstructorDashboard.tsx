import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Award, ClipboardCheck, TrendingUp,
  ArrowUpRight, GraduationCap, Calendar, Star,
} from 'lucide-react';
import { useAuthStore } from '@store/authStore';
import { useApiQuery } from '@/hooks/useApiQuery';
import { lmsService } from '@/services/lmsService';
import { Loader } from '@components/ui/loader';
import DashboardClock from '@components/ui/DashboardClock';

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

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

  const { data: statsData, isLoading: statsLoading } = useApiQuery(
    ['lms-instructor-stats'],
    () => lmsService.getStats()
  );
  const { data: coursesData, isLoading: coursesLoading } = useApiQuery(
    ['lms-instructor-courses'],
    () => lmsService.getAll({ limit: 4, status: 'Published' })
  );
  const { data: enrollmentsData } = useApiQuery(
    ['lms-instructor-enrollments'],
    () => lmsService.getEnrollments({ limit: 4 })
  );

  if (statsLoading && coursesLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const stats = statsData;
  const courses = coursesData?.data ?? [];
  const enrollments = enrollmentsData?.data ?? [];

  const statCards = [
    { label: 'Active Courses', value: stats ? (stats.ongoing + stats.published).toString() : '—', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20', href: '/lms/courses' },
    { label: 'Total Students', value: stats ? stats.totalEnrollments.toString() : '—', icon: Users, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', href: '/lms/courses' },
    { label: 'Courses Published', value: stats ? stats.published.toString() : '—', icon: ClipboardCheck, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20', href: '/lms/exams' },
    { label: 'Completed Courses', value: stats ? stats.completed.toString() : '—', icon: Award, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20', href: '/lms/certificates' },
  ];

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
        <div className="flex items-center gap-3">
          <DashboardClock />
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
            <GraduationCap className="h-4 w-4" /> Teaching
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
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
        {/* My Courses */}
        <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" /> My Courses
            </h2>
            <Link to="/lms/courses" className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              All courses <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {courses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No courses found</p>
          ) : (
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {c.status} · Starts {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <Users className="h-3.5 w-3.5" /> {c.totalEnrollments ?? 0} students
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Enrollments */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
            <Star className="h-5 w-5 text-amber-500" /> Recent Students
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No enrollments yet</p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.course?.title ?? `Course #${e.courseId}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{e.status} · {e.enrollmentDate?.slice(0, 10)}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{e.progressPercentage}%</span>
                </div>
              ))}
            </div>
          )}
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
