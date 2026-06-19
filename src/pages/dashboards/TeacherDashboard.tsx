import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, CheckSquare, Award, ArrowUpRight,
  Clock, Calendar, Star, Play, FileText,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
import DashboardClock from '@components/ui/DashboardClock';
import { useApiQuery } from '@/hooks/useApiQuery';
import { lmsService } from '@/services/lmsService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const COURSE_COLORS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

export function TeacherDashboard() {
  const { data: coursesData, isLoading: coursesLoading } = useApiQuery(
    ['teacher-courses'],
    () => lmsService.getAll({ limit: 4 })
  );
  const { data: statsData, isLoading: statsLoading } = useApiQuery(
    ['teacher-lms-stats'],
    () => lmsService.getStats()
  );
  const { data: enrollmentsData } = useApiQuery(
    ['teacher-enrollments'],
    () => lmsService.getEnrollments({ limit: 4 })
  );

  if (coursesLoading && statsLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const courses = coursesData?.data ?? [];
  const stats = statsData;
  const enrollments = enrollmentsData?.data ?? [];
  const totalStudents = stats?.totalEnrollments ?? courses.reduce((s, c) => s + (c.totalEnrollments ?? 0), 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your courses and students</p>
        </div>
        <DashboardClock />
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', value: courses.length.toString(), icon: BookOpen, color: 'text-indigo-600 bg-indigo-50', href: '/lms/courses' },
          { label: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'text-violet-600 bg-violet-50', href: '/lms/enrollments' },
          { label: 'Ongoing Courses', value: stats ? stats.ongoing.toString() : '—', icon: CheckSquare, color: 'text-amber-600 bg-amber-50', href: '/lms/exams' },
          { label: 'Completed Courses', value: stats ? stats.completed.toString() : '—', icon: Award, color: 'text-emerald-600 bg-emerald-50', href: '/lms/certificates' },
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

      {/* My Courses */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            My Courses
          </h2>
          <Link to="/lms/courses" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            All courses <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No courses found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((c, idx) => (
              <Link key={c.id} to={`/lms/courses/${c.id}`}>
                <div className="group relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                  <div className={`h-2 w-full bg-gradient-to-r ${COURSE_COLORS[idx % COURSE_COLORS.length]}`} />
                  <div className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 transition text-sm">{c.title}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalEnrollments ?? 0} students</span>
                      <span className="flex items-center gap-1"><Play className="w-3 h-3" />{c.status}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Courses */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-violet-500" />
            Course Schedule
          </h2>
          {courses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No scheduled courses</p>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs font-bold text-indigo-600">{c.status}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.duration}h · {c.totalEnrollments ?? 0} students</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Enrollments */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Recent Students
            </h2>
            <Link to="/lms/enrollments" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No enrollments yet</p>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {String(e.staffId).slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{e.course?.title ?? `Course #${e.courseId}`}</p>
                    <p className="text-xs text-gray-500">{e.status} · {e.enrollmentDate?.slice(0, 10)}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                    e.progressPercentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                    e.progressPercentage >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <Star className="w-3 h-3" />{e.progressPercentage}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', href: '/lms/courses', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Exams & Quizzes', href: '/lms/exams', icon: CheckSquare, color: 'text-violet-600 bg-violet-50' },
          { label: 'Certificates', href: '/lms/certificates', icon: Award, color: 'text-amber-600 bg-amber-50' },
          { label: 'Schedule', href: '/attendance', icon: Clock, color: 'text-emerald-600 bg-emerald-50' },
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

export default TeacherDashboard;
