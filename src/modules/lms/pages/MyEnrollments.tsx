import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Play, CheckCircle2, ArrowUpRight, Award, Loader2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';

const GRADIENT_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-cyan-600',
  'from-purple-500 to-fuchsia-600',
];

interface Enrollment {
  id: number;
  courseId: number;
  title: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  doneLessons: number;
  enrolledDate: string;
  completedDate: string | null;
  status: string;
  thumbnail: string | null;
}

export function MyEnrollments() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      try { return await apiClient.get<Enrollment[]>('/courses/student/enrollments') as any; }
      catch { return []; }
    },
  });

  const all: Enrollment[] = Array.isArray(data) ? data : [];
  const active = all.filter(e => e.status !== 'Completed' && e.status !== 'Failed' && e.status !== 'Dropped');
  const completed = all.filter(e => e.status === 'Completed');

  const avgProgress = active.length
    ? Math.round(active.reduce((s, e) => s + e.progress, 0) / active.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Enrollments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your enrolled courses and progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Courses', value: active.length.toString(), color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Completed', value: completed.length.toString(), color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Enrolled', value: all.length.toString(), color: 'bg-amber-50 text-amber-600' },
          { label: 'Avg Progress', value: `${avgProgress}%`, color: 'bg-violet-50 text-violet-600' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active */}
      {active.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">In Progress</h2>
          <div className="space-y-4">
            {active.map((e, i) => {
              const color = GRADIENT_COLORS[i % GRADIENT_COLORS.length];
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{e.title}</h3>
                            <p className="text-xs text-gray-500">{e.instructor}</p>
                          </div>
                          <Link to={`/lms/courses/${e.courseId}`}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 flex-shrink-0">
                            Open <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{e.progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-2 rounded-full bg-gradient-to-r ${color}`} style={{ width: `${e.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        Enrolled {new Date(e.enrolledDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <Link to={`/lms/courses/${e.courseId}`}>
                        <button className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r ${color} hover:opacity-90 transition`}>
                          <Play className="w-3 h-3" /> Continue
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Completed</h2>
          <div className="space-y-4">
            {completed.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} flex items-center justify-center flex-shrink-0`}>
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{e.title}</h3>
                          <p className="text-xs text-gray-500">{e.instructor}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex-shrink-0">
                          Completed
                        </span>
                      </div>
                      {e.completedDate && (
                        <p className="text-xs text-gray-500 mt-2">
                          Completed on {new Date(e.completedDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Certificate of Completion</span>
                    </div>
                    <Link to="/lms/certificates"
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                      View <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BookOpen className="w-16 h-16 mb-4" />
          <p className="text-lg font-semibold">No enrollments yet</p>
          <p className="text-sm mt-1">Browse courses to get started</p>
        </div>
      )}

      {/* Browse more */}
      <div className="text-center py-4">
        <Link to="/lms/courses"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
          <BookOpen className="w-4 h-4" /> Browse More Courses
        </Link>
      </div>
    </div>
  );
}

export default MyEnrollments;
