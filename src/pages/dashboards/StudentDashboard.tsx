import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Award, CheckSquare, TrendingUp, ArrowUpRight,
  Clock, Play, Star, Target,
} from 'lucide-react';
import { Loader } from '@components/ui/loader';
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
];

export function StudentDashboard() {
  const { data: enrollments, isLoading } = useApiQuery(
    ['student-my-enrollments'],
    () => lmsService.getMyEnrollments()
  );
  const { data: allCoursesData } = useApiQuery(
    ['student-all-courses'],
    () => lmsService.getAll({ limit: 3 })
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader size="lg" />
    </div>
  );

  const myEnrollments = enrollments ?? [];
  const completedCount = myEnrollments.filter(e => e.status === 'Completed').length;
  const avgProgress = myEnrollments.length > 0
    ? Math.round(myEnrollments.reduce((s, e) => s + e.progressPercentage, 0) / myEnrollments.length)
    : 0;

  const availableCourses = allCoursesData?.data ?? [];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Learning Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track your progress and prepare for success</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Courses', value: myEnrollments.length.toString(), icon: BookOpen, color: 'text-indigo-600 bg-indigo-50', href: '/lms/my-enrollments' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50', href: '/lms/my-enrollments' },
          { label: 'Completed', value: completedCount.toString(), icon: Star, color: 'text-amber-600 bg-amber-50', href: '/lms/my-enrollments' },
          { label: 'Certificates', value: completedCount.toString(), icon: Award, color: 'text-emerald-600 bg-emerald-50', href: '/lms/certificates' },
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

      {/* My Enrollments */}
      <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            My Courses
          </h2>
          <Link to="/lms/my-enrollments" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {myEnrollments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">You are not enrolled in any courses yet</p>
        ) : (
          <div className="space-y-4">
            {myEnrollments.slice(0, 3).map((e, idx) => (
              <Link key={e.id} to={`/lms/courses/${e.courseId}`}>
                <div className="group flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${COURSE_COLORS[idx % COURSE_COLORS.length]} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 transition text-sm truncate">
                      {e.course?.title ?? `Course #${e.courseId}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{e.status} · {e.course?.instructor?.user?.firstName} {e.course?.instructor?.user?.lastName}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-medium text-gray-600 dark:text-gray-300">{e.progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full bg-gradient-to-r ${COURSE_COLORS[idx % COURSE_COLORS.length]}`}
                          style={{ width: `${e.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button className="flex-shrink-0 p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition">
                    <Play className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Courses */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-rose-500" />
              Available Courses
            </h2>
            <Link to="/lms/courses" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {availableCourses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No courses available</p>
          ) : (
            <div className="space-y-3">
              {availableCourses.map((c) => (
                <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{c.department?.name ?? 'General'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-medium text-indigo-600">{c.status}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />{c.duration}h
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* My Progress Summary */}
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              My Progress
            </h2>
          </div>
          {myEnrollments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Enroll in a course to track progress</p>
          ) : (
            <div className="space-y-3">
              {myEnrollments.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {e.course?.title ?? `Course #${e.courseId}`}
                    </p>
                    <p className="text-xs text-gray-500">{e.status}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    e.progressPercentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                    e.progressPercentage >= 70 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {e.progressPercentage}%
                  </div>
                </div>
              ))}
            </div>
          )}
          {myEnrollments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Overall Average</span>
                <span className={`text-lg font-bold ${avgProgress >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{avgProgress}%</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Continue Learning', href: '/lms/my-enrollments', icon: Play, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Take Exam', href: '/lms/exams', icon: CheckSquare, color: 'text-violet-600 bg-violet-50' },
          { label: 'My Certificates', href: '/lms/certificates', icon: Award, color: 'text-amber-600 bg-amber-50' },
          { label: 'Browse Courses', href: '/lms/courses', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
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

export default StudentDashboard;
