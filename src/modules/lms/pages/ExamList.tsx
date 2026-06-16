import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Clock, CheckCircle2, AlertCircle, Play,
  Star, Filter, Calendar, BarChart3,
} from 'lucide-react';

type ExamStatus = 'available' | 'completed' | 'upcoming' | 'missed';

interface Exam {
  id: number;
  title: string;
  course: string;
  duration: string;
  questions: number;
  date: string;
  status: ExamStatus;
  score?: number;
  maxScore: number;
  attempts: number;
  maxAttempts: number;
  color: string;
}

const EXAMS: Exam[] = [
  {
    id: 1, title: 'SAT Math Practice Test 3', course: 'SAT Mathematics Prep',
    duration: '45 min', questions: 30, date: '2026-06-18',
    status: 'available', maxScore: 100, attempts: 0, maxAttempts: 3, color: 'from-indigo-500 to-violet-600',
  },
  {
    id: 2, title: 'SAT English Mock Exam', course: 'SAT English & Writing',
    duration: '60 min', questions: 44, date: '2026-06-22',
    status: 'upcoming', maxScore: 100, attempts: 0, maxAttempts: 2, color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 3, title: 'Algebra Quiz — Module 1', course: 'SAT Mathematics Prep',
    duration: '20 min', questions: 15, date: '2026-06-01',
    status: 'completed', score: 85, maxScore: 100, attempts: 1, maxAttempts: 3, color: 'from-amber-500 to-orange-600',
  },
  {
    id: 4, title: 'Critical Reading Test 1', course: 'SAT Critical Reading',
    duration: '35 min', questions: 25, date: '2026-06-05',
    status: 'completed', score: 92, maxScore: 100, attempts: 2, maxAttempts: 3, color: 'from-rose-500 to-pink-600',
  },
  {
    id: 5, title: 'Full SAT Simulation', course: 'All Subjects',
    duration: '180 min', questions: 154, date: '2026-06-28',
    status: 'upcoming', maxScore: 1600, attempts: 0, maxAttempts: 1, color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 6, title: 'Writing Practice Test 1', course: 'SAT English & Writing',
    duration: '30 min', questions: 20, date: '2026-05-15',
    status: 'missed', maxScore: 100, attempts: 0, maxAttempts: 2, color: 'from-gray-400 to-gray-500',
  },
];

const STATUS_CONFIG: Record<ExamStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  available: { label: 'Available', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Play },
  completed: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
  upcoming: { label: 'Upcoming', bg: 'bg-amber-100', text: 'text-amber-700', icon: Calendar },
  missed: { label: 'Missed', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
};

const FILTER_OPTIONS: { label: string; value: ExamStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: 'available' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Missed', value: 'missed' },
];

export function ExamList() {
  const [filter, setFilter] = useState<ExamStatus | 'all'>('all');

  const filtered = filter === 'all' ? EXAMS : EXAMS.filter((e) => e.status === filter);
  const completed = EXAMS.filter((e) => e.status === 'completed');
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, e) => s + (e.score ?? 0), 0) / completed.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams & Quizzes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Practice tests and assessments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Available', value: EXAMS.filter(e => e.status === 'available').length.toString(), color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Completed', value: completed.length.toString(), color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Avg Score', value: avgScore ? `${avgScore}%` : '—', color: 'text-amber-600 bg-amber-50' },
          { label: 'Upcoming', value: EXAMS.filter(e => e.status === 'upcoming').length.toString(), color: 'text-violet-600 bg-violet-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition ${
              filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Exam cards */}
      <div className="space-y-4">
        {filtered.map((exam, i) => {
          const cfg = STATUS_CONFIG[exam.status];
          const StatusIcon = cfg.icon;
          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exam.color} flex items-center justify-center flex-shrink-0`}>
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{exam.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{exam.course}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
                        <StatusIcon className="w-3 h-3" />{cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.duration}</span>
                      <span className="flex items-center gap-1"><Filter className="w-3.5 h-3.5" />{exam.questions} questions</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{exam.date}</span>
                      <span className="text-gray-400">Attempts: {exam.attempts}/{exam.maxAttempts}</span>
                    </div>

                    {exam.status === 'completed' && exam.score !== undefined && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                          exam.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                          exam.score >= 70 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          <Star className="w-3.5 h-3.5" />
                          Score: {exam.score}/{exam.maxScore}
                        </div>
                        {exam.attempts < exam.maxAttempts && (
                          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                            Retry ({exam.maxAttempts - exam.attempts} left)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {exam.status === 'available' && (
                    <Link to={`/lms/exams/${exam.id}/take`} className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${exam.color} hover:opacity-90 transition`}>
                      <Play className="w-3.5 h-3.5" /> Start
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 className="w-12 h-12 mb-3" />
          <p className="font-medium">No exams in this category</p>
        </div>
      )}
    </div>
  );
}

export default ExamList;
