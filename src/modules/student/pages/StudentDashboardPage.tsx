import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, StudentAnalytics, StudentEnrollment } from '@/services/studentService';
import { BookOpen, Award, BarChart2, Calendar, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay?: number;
}> = ({ icon: Icon, label, value, sub, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800"
  >
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
  </motion.div>
);

const CourseCard: React.FC<{ enrollment: StudentEnrollment; delay?: number }> = ({ enrollment, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.35, delay }}
    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
      <BookOpen className="h-6 w-6 text-violet-600 dark:text-violet-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
        {enrollment.course?.title || 'Course'}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${enrollment.progressPercentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {enrollment.progressPercentage}%
        </span>
      </div>
    </div>
    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
      enrollment.status === 'Active'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      {enrollment.status}
    </span>
  </motion.div>
);

export const StudentDashboardPage: React.FC = () => {
  const { data: analyticsData } = useQuery({
    queryKey: ['student-portal-analytics'],
    queryFn: () => studentPortalApi.getAnalytics().then((r: any) => r.data?.data as StudentAnalytics),
  });

  const { data: enrollmentsData } = useQuery({
    queryKey: ['student-portal-enrollments'],
    queryFn: () => studentPortalApi.getEnrollments().then((r: any) => r.data?.data as StudentEnrollment[]),
  });

  const analytics = analyticsData;
  const enrollments = enrollmentsData || [];
  const activeEnrollments = enrollments.filter((e) => e.status === 'Active').slice(0, 4);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg"
      >
        <p className="text-violet-200 text-sm">{today}</p>
        <h1 className="text-2xl font-bold mt-1">Welcome back! 👋</h1>
        <p className="text-violet-200 text-sm mt-1">
          You have {analytics?.activeCourses ?? 0} active courses and{' '}
          {analytics?.totalExams ? analytics.totalExams - analytics.passedExams : 0} pending exams.
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}     label="Active Courses"   value={analytics?.activeCourses ?? 0}   color="bg-violet-500" delay={0.05} />
        <StatCard icon={BarChart2}    label="Avg Score"        value={`${analytics?.avgScore ?? 0}%`}  color="bg-blue-500"   delay={0.10} />
        <StatCard icon={Calendar}     label="Attendance"       value={`${analytics?.attendancePct ?? 0}%`} color="bg-emerald-500" delay={0.15} />
        <StatCard icon={Award}        label="Certificates"     value={analytics?.certificatesEarned ?? 0} color="bg-amber-500"  delay={0.20} />
      </div>

      {/* Progress and Quick links */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active courses */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Active Courses</h2>
          <div className="space-y-3">
            {activeEnrollments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                No active enrollments yet
              </div>
            ) : (
              activeEnrollments.map((e, i) => (
                <CourseCard key={e.id} enrollment={e} delay={0.1 + i * 0.05} />
              ))
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Performance Overview</h2>

          {/* Pass rate */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exam Pass Rate</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.passRate ?? 0}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${(analytics?.passRate ?? 0) >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${analytics?.passRate ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-gray-500">
              <span>{analytics?.passedExams ?? 0} passed</span>
              <span>{analytics?.totalExams ?? 0} total</span>
            </div>
          </div>

          {/* Completed courses */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.completedCourses ?? 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Courses Completed</p>
            </div>
          </div>

          {/* Attendance alert */}
          {(analytics?.attendancePct ?? 0) < 75 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Low Attendance</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                  Your attendance is below 75%. Please attend classes regularly.
                </p>
              </div>
            </motion.div>
          )}

          {/* Study time tip */}
          <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
            <Clock className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Keep Going!</p>
              <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                Consistency is key. Visit your courses daily to maintain momentum.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardPage;
