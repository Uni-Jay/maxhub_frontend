import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, StudentResult } from '@/services/studentService';
import { FileText, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

type ExamFilter = 'all' | 'Pending' | 'Graded' | 'Published';


export const StudentExamsPage: React.FC = () => {
  const [filter, setFilter] = useState<ExamFilter>('all');

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['student-portal-exams'],
    queryFn: () =>
      studentPortalApi
        .getResults({ type: 'Exam' })
        .then((r: any) => r.data?.data as (StudentResult & { status?: string })[]),
  });

  const { data: quizzesData } = useQuery({
    queryKey: ['student-portal-quizzes'],
    queryFn: () =>
      studentPortalApi
        .getResults({ type: 'Quiz' })
        .then((r: any) => r.data?.data as (StudentResult & { status?: string })[]),
  });

  const exams = examsData || [];
  const quizzes = quizzesData || [];
  const allAssessments = [...exams, ...quizzes];

  const filtered =
    filter === 'all'
      ? allAssessments
      : allAssessments.filter((e) => (e.status || 'Pending') === filter);

  const passedCount = exams.filter((e) => e.passed).length;
  const avgScore =
    exams.length > 0
      ? Math.round(exams.reduce((sum, e) => sum + e.percentage, 0) / exams.length)
      : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams & Quizzes</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {exams.length} exams · {quizzes.length} quizzes
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center"
        >
          <p className="text-2xl font-bold text-violet-600">{exams.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Exams</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center"
        >
          <p className="text-2xl font-bold text-emerald-600">{passedCount}</p>
          <p className="text-xs text-gray-500 mt-1">Passed</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center"
        >
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600">{avgScore}%</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Avg Score</p>
        </motion.div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'Pending', 'Graded', 'Published'] as ExamFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-violet-300'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Results */}
      {examsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No exams found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exam, i) => {
            const isGraded = exam.status === 'Graded' || exam.status === 'Published';
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                    !isGraded
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      : exam.passed
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {isGraded ? exam.grade : <Clock className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {exam.title}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium shrink-0 ${
                        exam.type === 'Quiz'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {exam.type}
                      </span>
                    </div>

                    {isGraded ? (
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${exam.passed ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${exam.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">
                          {exam.score}/{exam.maxScore} ({exam.percentage}%)
                        </span>
                        {exam.passed
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        }
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Awaiting results
                      </p>
                    )}

                    {exam.feedback && (
                      <p className="text-xs text-gray-400 mt-1 italic truncate">"{exam.feedback}"</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentExamsPage;
