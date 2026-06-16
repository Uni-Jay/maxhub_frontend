import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, StudentResult } from '@/services/studentService';
import { ClipboardList, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

type AssignmentFilter = 'all' | 'Pending' | 'Graded' | 'Published';

const statusMap: Record<string, { label: string; bg: string; icon: React.ElementType }> = {
  Pending:   { label: 'Pending',   bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',     icon: Clock         },
  Graded:    { label: 'Graded',    bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  Published: { label: 'Returned',  bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         icon: CheckCircle2  },
  Appealed:  { label: 'Appealed',  bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             icon: AlertCircle   },
};

export const StudentAssignmentsPage: React.FC = () => {
  const [filter, setFilter] = useState<AssignmentFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['student-portal-assignments'],
    queryFn: () =>
      studentPortalApi
        .getResults({ type: 'Assignment' })
        .then((r: any) => r.data?.data as (StudentResult & { status?: string })[]),
  });

  const assignments = data || [];
  const pendingCount = assignments.filter((a) => !a.status || a.status === 'Pending').length;

  const filtered =
    filter === 'all'
      ? assignments
      : assignments.filter((a) => (a.status || 'Pending') === filter);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assignments</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {assignments.length} total · {pendingCount} pending submission
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'Pending', 'Graded', 'Published'] as AssignmentFilter[]).map((f) => (
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

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{assignments.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-lg font-bold text-emerald-600">
            {assignments.filter((a) => a.passed).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Passed</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-center">
          <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending</p>
        </div>
      </div>

      {/* Assignment list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((assignment, i) => {
            const status = assignment.status || 'Pending';
            const cfg = statusMap[status] || statusMap['Pending'];
            const Icon = cfg.icon;
            const isGraded = status === 'Graded' || status === 'Published';

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isGraded
                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                    : 'bg-violet-100 dark:bg-violet-900/30'
                }`}>
                  {isGraded
                    ? <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    : <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {assignment.title}
                  </p>
                  {assignment.gradedAt && isGraded && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Graded on {new Date(assignment.gradedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {assignment.feedback && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate italic">"{assignment.feedback}"</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                  {isGraded && (
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {assignment.score}/{assignment.maxScore} · {assignment.grade}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsPage;
