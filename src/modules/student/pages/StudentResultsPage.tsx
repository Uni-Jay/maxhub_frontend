import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, StudentResult, StudentAnalytics } from '@/services/studentService';
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const GradeBadge: React.FC<{ grade: string; passed: boolean }> = ({ grade, passed }) => (
  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${
    passed
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }`}>
    {grade}
  </span>
);

const ResultRow: React.FC<{ result: StudentResult; delay: number }> = ({ result, delay }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <GradeBadge grade={result.grade} passed={result.passed} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{result.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {result.type} · {new Date(result.gradedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-900 dark:text-white">
            {result.score}/{result.maxScore}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{result.percentage}%</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && result.feedback && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Instructor Feedback</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{result.feedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const StudentResultsPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: resultsData, isLoading } = useQuery({
    queryKey: ['student-portal-results'],
    queryFn: () => studentPortalApi.getResults().then((r: any) => r.data?.data as StudentResult[]),
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['student-portal-analytics'],
    queryFn: () => studentPortalApi.getAnalytics().then((r: any) => r.data?.data as StudentAnalytics),
  });

  const results = resultsData || [];
  const analytics = analyticsData;

  const filtered = typeFilter === 'all' ? results : results.filter((r) => r.type === typeFilter);

  const chartData = results
    .slice(0, 8)
    .map((r) => ({ name: r.title.slice(0, 15) + '...', score: r.percentage }));

  const TYPES = ['all', 'Exam', 'Assignment', 'Quiz', 'Project', 'Practical'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Results & Grades</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          All your academic results in one place
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-2xl font-bold text-violet-600">{analytics?.avgScore ?? 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Average Score</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-2xl font-bold text-emerald-600">{analytics?.passRate ?? 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Pass Rate</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-2xl font-bold text-amber-600">{results.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Assessments</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Score History</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={_ .score >= 50 ? '#8b5cf6' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === t
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {t === 'all' ? 'All Types' : t}
          </button>
        ))}
      </div>

      {/* Results list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <BarChart2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No results yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((result, i) => (
            <ResultRow key={result.id} result={result} delay={i * 0.04} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentResultsPage;
