import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Trophy, Medal, Users, BarChart3, Target, Clock,
  Download, Search, CheckCircle, XCircle, ChevronUp, ChevronDown,
  BookOpen, TrendingUp,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

type Tab = 'rankings' | 'analytics' | 'my-result';
type SortKey = 'rank' | 'name' | 'score' | 'percentage' | 'timeTaken';
type SortDir = 'asc' | 'desc';

interface StudentResult {
  id: number;
  rank: number;
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: 'Pass' | 'Fail';
  timeTaken: string;
  timeTakenSecs: number;
}

interface QuestionReview {
  id: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

const STUDENT_RESULTS: StudentResult[] = [
  { id: 1,  rank: 1,  name: 'Adaeze Okonkwo',     score: 96, maxScore: 100, percentage: 96, status: 'Pass', timeTaken: '42:18', timeTakenSecs: 2538 },
  { id: 2,  rank: 2,  name: 'Chukwuemeka Eze',     score: 94, maxScore: 100, percentage: 94, status: 'Pass', timeTaken: '38:45', timeTakenSecs: 2325 },
  { id: 3,  rank: 3,  name: 'Ngozi Obi',           score: 91, maxScore: 100, percentage: 91, status: 'Pass', timeTaken: '45:02', timeTakenSecs: 2702 },
  { id: 4,  rank: 4,  name: 'Tunde Adebayo',       score: 88, maxScore: 100, percentage: 88, status: 'Pass', timeTaken: '40:33', timeTakenSecs: 2433 },
  { id: 5,  rank: 5,  name: 'Fatima Usman',        score: 85, maxScore: 100, percentage: 85, status: 'Pass', timeTaken: '43:17', timeTakenSecs: 2597 },
  { id: 6,  rank: 6,  name: 'Oluwaseun Balogun',   score: 82, maxScore: 100, percentage: 82, status: 'Pass', timeTaken: '41:09', timeTakenSecs: 2469 },
  { id: 7,  rank: 7,  name: 'Amina Ibrahim',       score: 79, maxScore: 100, percentage: 79, status: 'Pass', timeTaken: '44:51', timeTakenSecs: 2691 },
  { id: 8,  rank: 8,  name: 'Emeka Nwachukwu',     score: 77, maxScore: 100, percentage: 77, status: 'Pass', timeTaken: '47:22', timeTakenSecs: 2842 },
  { id: 9,  rank: 9,  name: 'Chidinma Okafor',     score: 74, maxScore: 100, percentage: 74, status: 'Pass', timeTaken: '48:05', timeTakenSecs: 2885 },
  { id: 10, rank: 10, name: 'Yusuf Musa',          score: 71, maxScore: 100, percentage: 71, status: 'Pass', timeTaken: '50:44', timeTakenSecs: 3044 },
  { id: 11, rank: 11, name: 'Blessing Ogundele',   score: 68, maxScore: 100, percentage: 68, status: 'Pass', timeTaken: '52:11', timeTakenSecs: 3131 },
  { id: 12, rank: 12, name: 'Kemi Adeyemi',        score: 65, maxScore: 100, percentage: 65, status: 'Pass', timeTaken: '53:37', timeTakenSecs: 3217 },
  { id: 13, rank: 13, name: 'Sule Garba',          score: 62, maxScore: 100, percentage: 62, status: 'Pass', timeTaken: '55:00', timeTakenSecs: 3300 },
  { id: 14, rank: 14, name: 'Ifeoma Ugwu',         score: 58, maxScore: 100, percentage: 58, status: 'Pass', timeTaken: '56:22', timeTakenSecs: 3382 },
  { id: 15, rank: 15, name: 'Taiwo Salami',        score: 55, maxScore: 100, percentage: 55, status: 'Pass', timeTaken: '57:14', timeTakenSecs: 3434 },
  { id: 16, rank: 16, name: 'Olamide Fashola',     score: 48, maxScore: 100, percentage: 48, status: 'Fail', timeTaken: '58:00', timeTakenSecs: 3480 },
  { id: 17, rank: 17, name: 'Musa Abdullahi',      score: 44, maxScore: 100, percentage: 44, status: 'Fail', timeTaken: '59:10', timeTakenSecs: 3550 },
  { id: 18, rank: 18, name: 'Chibundo Eze',        score: 38, maxScore: 100, percentage: 38, status: 'Fail', timeTaken: '60:00', timeTakenSecs: 3600 },
  { id: 19, rank: 19, name: 'Remi Adekunle',       score: 32, maxScore: 100, percentage: 32, status: 'Fail', timeTaken: '60:00', timeTakenSecs: 3600 },
  { id: 20, rank: 20, name: 'Zainab Aliyu',        score: 25, maxScore: 100, percentage: 25, status: 'Fail', timeTaken: '60:00', timeTakenSecs: 3600 },
];

const MY_QUESTION_REVIEW: QuestionReview[] = [
  { id: 1,  question: 'Which fabric is most commonly used in traditional Nigerian fashion?',    userAnswer: 'Ankara',       correctAnswer: 'Ankara',          isCorrect: true },
  { id: 2,  question: 'What does "haute couture" mean?',                                        userAnswer: 'High fashion', correctAnswer: 'High fashion',    isCorrect: true },
  { id: 3,  question: 'Primary colors in color theory are red, blue, and yellow.',              userAnswer: 'True',         correctAnswer: 'True',            isCorrect: true },
  { id: 4,  question: 'Which tool is used for measuring fabric before cutting?',                userAnswer: 'Scissors',     correctAnswer: 'Tape measure',    isCorrect: false },
  { id: 5,  question: 'A dart in garment construction is used to create shape.',                userAnswer: 'True',         correctAnswer: 'True',            isCorrect: true },
  { id: 6,  question: 'Which technique permanently joins two pieces of fabric?',                userAnswer: 'Seaming',      correctAnswer: 'Seaming',         isCorrect: true },
  { id: 7,  question: 'What is the standard seam allowance?',                                   userAnswer: '1 inch',       correctAnswer: '5/8 inch',        isCorrect: false },
  { id: 8,  question: 'Aso-Oke is a hand-woven cloth from Yoruba culture.',                    userAnswer: 'True',         correctAnswer: 'True',            isCorrect: true },
  { id: 9,  question: 'Which design element refers to the outline or silhouette of a garment?', userAnswer: 'Line',         correctAnswer: 'Line',            isCorrect: true },
  { id: 10, question: 'A zipper is not considered a type of fastener.',                         userAnswer: 'True',         correctAnswer: 'False',           isCorrect: false },
];

const SCORE_DISTRIBUTION = [
  { range: '0–20',   count: 1 },
  { range: '21–40',  count: 2 },
  { range: '41–60',  count: 4 },
  { range: '61–80',  count: 8 },
  { range: '81–100', count: 5 },
];

const PASS_FAIL_DATA = [
  { name: 'Pass', value: 15 },
  { name: 'Fail', value: 5 },
];

const TREND_DATA = [
  { exam: 'Exam 1', avg: 64 },
  { exam: 'Exam 2', avg: 68 },
  { exam: 'Exam 3', avg: 71 },
  { exam: 'Exam 4', avg: 74 },
  { exam: 'Exam 5', avg: 73 },
];

const QUESTION_PERFORMANCE = [
  { question: 'Q7 — Seam allowance',   wrong: 14 },
  { question: 'Q10 — Fastener types',  wrong: 11 },
  { question: 'Q4 — Measuring tools',  wrong: 9 },
  { question: 'Q2 — Haute couture',    wrong: 7 },
  { question: 'Q6 — Join technique',   wrong: 5 },
  { question: 'Q9 — Design elements',  wrong: 4 },
];

const PIE_COLORS = ['#10b981', '#ef4444'];
const BAR_COLOR = '#6366f1';

const MEDAL_CONFIG = [
  { rank: 1, icon: Trophy, bg: 'from-yellow-400 to-amber-500', ring: 'ring-yellow-300', label: '1st Place', size: 'w-20 h-20', textSize: 'text-2xl' },
  { rank: 2, icon: Medal,  bg: 'from-gray-400 to-slate-500',   ring: 'ring-gray-300',   label: '2nd Place', size: 'w-16 h-16', textSize: 'text-xl' },
  { rank: 3, icon: Medal,  bg: 'from-orange-400 to-amber-600', ring: 'ring-orange-300', label: '3rd Place', size: 'w-16 h-16', textSize: 'text-xl' },
];

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={cn('rounded-2xl px-5 py-4 text-white', color)}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-75 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const user = useAuthStore(s => s.user);
  const userRole = (user as any)?.role;

  const [tab, setTab] = useState<Tab>(userRole === 'STUDENT' ? 'my-result' : 'rankings');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: examData } = useQuery({
    queryKey: ['exam-results', examId],
    queryFn: async () => {
      try { return await apiClient.get(`/exams/${examId}/results`); } catch { return null; }
    },
  });

  const examName = (examData as any)?.title || 'Fashion Design Fundamentals — Module 2 Assessment';
  const examDate = (examData as any)?.date || 'June 12, 2026';

  const totalStudents = STUDENT_RESULTS.length;
  const avgScore = Math.round(STUDENT_RESULTS.reduce((s, r) => s + r.percentage, 0) / totalStudents);
  const passCount = STUDENT_RESULTS.filter(r => r.status === 'Pass').length;
  const passRate = Math.round((passCount / totalStudents) * 100);
  const highestScore = Math.max(...STUDENT_RESULTS.map(r => r.percentage));

  const myResult = STUDENT_RESULTS.find(r => r.id === 5) ?? STUDENT_RESULTS[4];
  const myCorrect = MY_QUESTION_REVIEW.filter(q => q.isCorrect).length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredSorted = useMemo(() => {
    let list = STUDENT_RESULTS.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (sortKey === 'timeTaken') { av = a.timeTakenSecs; bv = b.timeTakenSecs; }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [search, sortKey, sortDir]);

  const exportCSV = () => {
    const header = 'Rank,Name,Score,Percentage,Status,Time Taken\n';
    const rows = STUDENT_RESULTS.map(r =>
      `${r.rank},${r.name},${r.score}/${r.maxScore},${r.percentage}%,${r.status},${r.timeTaken}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `exam_results_${examId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp className="h-3 w-3 text-gray-300 dark:text-gray-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-indigo-500" />
      : <ChevronDown className="h-3 w-3 text-indigo-500" />;
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'rankings', label: 'Rankings', icon: Trophy },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(userRole === 'STUDENT' ? [{ key: 'my-result' as Tab, label: 'My Result', icon: Target }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Exam Results
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 font-medium">{examName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {examDate}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Students" value={totalStudents} sub="Participated" color="bg-indigo-600" />
        <StatCard label="Average Score" value={`${avgScore}%`} sub="Class average" color="bg-emerald-600" />
        <StatCard label="Pass Rate" value={`${passRate}%`} sub={`${passCount} of ${totalStudents} passed`} color="bg-amber-500" />
        <StatCard label="Highest Score" value={`${highestScore}%`} sub={STUDENT_RESULTS[0].name} color="bg-purple-600" />
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.key
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ── RANKINGS ── */}
        {tab === 'rankings' && (
          <motion.div key="rankings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <div className="flex items-end justify-center gap-4 py-6 bg-gradient-to-b from-indigo-50 to-transparent dark:from-indigo-950/20 dark:to-transparent rounded-2xl border border-gray-100 dark:border-gray-700">
              {[STUDENT_RESULTS[1], STUDENT_RESULTS[0], STUDENT_RESULTS[2]].map((s, i) => {
                const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
                const cfg = MEDAL_CONFIG.find(m => m.rank === realRank)!;
                const Icon = cfg.icon;
                const isFirst = realRank === 1;
                return (
                  <div key={s.id} className={cn('flex flex-col items-center gap-2 transition-all', isFirst ? '-mt-4' : '')}>
                    <div className={cn(
                      'rounded-full bg-gradient-to-br flex items-center justify-center ring-4 shadow-lg text-white',
                      cfg.bg, cfg.ring, cfg.size
                    )}>
                      <Icon className={cn('opacity-90', isFirst ? 'h-9 w-9' : 'h-7 w-7')} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{s.name.split(' ')[0]}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.name.split(' ').slice(1).join(' ')}</p>
                      <p className={cn('font-black mt-1', cfg.textSize,
                        realRank === 1 ? 'text-amber-500' : realRank === 2 ? 'text-slate-500' : 'text-orange-500')}>
                        {s.percentage}%
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{cfg.label}</p>
                    </div>
                    {isFirst && (
                      <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="h-3.5 w-3.5" /> {filteredSorted.length} students
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {([
                        { key: 'rank',       label: 'Rank' },
                        { key: 'name',       label: 'Student Name' },
                        { key: 'score',      label: 'Score' },
                        { key: 'percentage', label: 'Percentage' },
                        { key: 'status',     label: 'Status' },
                        { key: 'timeTaken',  label: 'Time Taken' },
                      ] as { key: SortKey; label: string }[]).map(col => (
                        <th key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-5 py-3 text-left cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none">
                          <div className="flex items-center gap-1">
                            {col.label}
                            <SortIcon k={col.key} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {filteredSorted.map((r, i) => (
                      <motion.tr key={r.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className={cn(
                          'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors',
                          r.id === myResult.id ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''
                        )}>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'w-7 h-7 rounded-full inline-flex items-center justify-center font-bold text-xs',
                            r.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            r.rank === 2 ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                            r.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                            'text-gray-500 dark:text-gray-400'
                          )}>
                            {r.rank}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                {r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <span className={cn('text-sm font-medium', r.id === myResult.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100')}>
                              {r.name} {r.id === myResult.id && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full ml-1">You</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {r.score}/{r.maxScore}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', r.percentage >= 70 ? 'bg-emerald-500' : r.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                                style={{ width: `${r.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{r.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                            r.status === 'Pass'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {r.timeTaken}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Score Distribution
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={SCORE_DISTRIBUTION} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v) => [`${v} students`, 'Count']}
                    />
                    <Bar dataKey="count" fill={BAR_COLOR} name="Students" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-emerald-500" />
                  Pass / Fail Ratio
                </h3>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie data={PASS_FAIL_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name">
                        {PASS_FAIL_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {PASS_FAIL_DATA.map((d, i) => (
                      <div key={d.name}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.name}</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 dark:text-white ml-5">{d.value}</p>
                        <p className="text-xs text-gray-400 ml-5">{Math.round((d.value / totalStudents) * 100)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Average Score Trend (Last 5 Exams)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={TREND_DATA} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[50, 100]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, 'Avg Score']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} name="Average Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-red-500" />
                  Most Commonly Wrong Questions
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={QUESTION_PERFORMANCE} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="question" type="category" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} students`, 'Got Wrong']} />
                    <Bar dataKey="wrong" fill="#ef4444" name="Got Wrong" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── MY RESULT ── */}
        {tab === 'my-result' && (
          <motion.div key="my-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <div className={cn(
              'rounded-2xl p-6 text-white text-center',
              myResult.status === 'Pass' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
            )}>
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 text-3xl font-black">
                {myResult.percentage}%
              </div>
              <h2 className="text-xl font-bold">{myResult.status === 'Pass' ? 'Congratulations! You Passed' : 'Exam Not Passed'}</h2>
              <p className="text-sm opacity-90 mt-1">{examName}</p>
              <div className="grid grid-cols-3 gap-4 mt-5">
                {[
                  { label: 'Score', value: `${myResult.score}/${myResult.maxScore}` },
                  { label: 'Rank', value: `#${myResult.rank} of ${totalStudents}` },
                  { label: 'Time', value: myResult.timeTaken },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl py-3 px-2">
                    <p className="text-xs opacity-80">{s.label}</p>
                    <p className="text-lg font-bold mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  Question-by-Question Review
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> {myCorrect} Correct
                  </span>
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                    <XCircle className="h-3.5 w-3.5" /> {MY_QUESTION_REVIEW.length - myCorrect} Wrong
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {MY_QUESTION_REVIEW.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className={cn('px-5 py-4 flex items-start gap-4 transition-colors',
                      q.isCorrect ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10' : 'hover:bg-red-50/40 dark:hover:bg-red-900/10')}>
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs',
                      q.isCorrect
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">{q.question}</p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full font-medium',
                          q.isCorrect
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                          {q.isCorrect ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Your answer: {q.userAnswer}
                        </span>
                        {!q.isCorrect && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle className="h-3 w-3" />
                            Correct: {q.correctAnswer}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {q.isCorrect
                        ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                        : <XCircle className="h-5 w-5 text-red-500" />}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
