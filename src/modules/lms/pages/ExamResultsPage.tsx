import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Trophy, Medal, Users, BarChart3, Target, Clock,
  Download, Search, ChevronUp, ChevronDown, BookOpen,
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
      try { return await apiClient.getRaw(`/courses/exams/${examId}/leaderboard`); } catch { return null; }
    },
  });

  const rankings: StudentResult[] = (examData as any)?.rankings ?? [];
  const examMeta = (examData as any)?.exam;
  const myResult: StudentResult | null = (examData as any)?.myResult ?? null;

  const examName = examMeta?.title ?? 'Exam Results';
  const examDate = examMeta?.date
    ? new Date(examMeta.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const totalStudents = rankings.length;
  const avgScore = totalStudents > 0 ? Math.round(rankings.reduce((s, r) => s + r.percentage, 0) / totalStudents) : 0;
  const passCount = rankings.filter(r => r.status === 'Pass').length;
  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
  const highestScore = totalStudents > 0 ? Math.max(...rankings.map(r => r.percentage)) : 0;

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0–20', count: 0 }, { range: '21–40', count: 0 },
      { range: '41–60', count: 0 }, { range: '61–80', count: 0 },
      { range: '81–100', count: 0 },
    ];
    rankings.forEach(r => {
      if (r.percentage <= 20) buckets[0].count++;
      else if (r.percentage <= 40) buckets[1].count++;
      else if (r.percentage <= 60) buckets[2].count++;
      else if (r.percentage <= 80) buckets[3].count++;
      else buckets[4].count++;
    });
    return buckets;
  }, [rankings]);

  const passFail = useMemo(() => [
    { name: 'Pass', value: passCount },
    { name: 'Fail', value: totalStudents - passCount },
  ], [passCount, totalStudents]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredSorted = useMemo(() => {
    let list = rankings.filter(r =>
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
  }, [rankings, search, sortKey, sortDir]);

  const exportCSV = () => {
    const header = 'Rank,Name,Score,Percentage,Status,Time Taken\n';
    const rows = rankings.map(r =>
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
        <StatCard label="Highest Score" value={`${highestScore}%`} sub={rankings[0]?.name ?? ''} color="bg-purple-600" />
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
              {rankings.length >= 3
                ? [rankings[1], rankings[0], rankings[2]].map((s, i) => {
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
              })
                : <p className="text-sm text-gray-400 py-4">No results yet</p>}
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
                          myResult && r.id === myResult.id ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''
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
                            <span className={cn('text-sm font-medium', myResult && r.id === myResult.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100')}>
                              {r.name} {myResult && r.id === myResult.id && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full ml-1">You</span>}
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
                  <BarChart data={scoreDistribution} margin={{ left: -10 }}>
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
                      <Pie data={passFail} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name">
                        {passFail.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {passFail.map((d, i) => (
                      <div key={d.name}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.name}</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 dark:text-white ml-5">{d.value}</p>
                        <p className="text-xs text-gray-400 ml-5">{totalStudents > 0 ? Math.round((d.value / totalStudents) * 100) : 0}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ── MY RESULT ── */}
        {tab === 'my-result' && (
          <motion.div key="my-result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            {!myResult ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Target className="w-16 h-16 mb-4" />
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No result found</p>
                <p className="text-sm mt-1">You may not have taken this exam yet</p>
              </div>
            ) : (
              <>
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

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm flex flex-col items-center justify-center gap-2 text-gray-400">
                  <BookOpen className="w-8 h-8 text-indigo-300" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Question-by-question review is not available for this exam</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
