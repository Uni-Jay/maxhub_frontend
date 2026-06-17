import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart2, Plus, ChevronDown, ChevronUp, X, Check,
  Star, TrendingUp, Award, AlertTriangle, BookOpen, Target,
} from 'lucide-react';
import { hrService, type Appraisal } from '@services/hrService';

// ─── Score Categories ──────────────────────────────────────
const SCORECARD_CATEGORIES = [
  { key: 'punctuality',       label: 'Punctuality',              weight: 10 },
  { key: 'attendance',        label: 'Attendance',               weight: 10 },
  { key: 'dressing',          label: 'Dressing / Appearance',    weight: 8  },
  { key: 'performance',       label: 'Performance',              weight: 15 },
  { key: 'communication',     label: 'Communication',            weight: 10 },
  { key: 'teamwork',          label: 'Teamwork',                 weight: 10 },
  { key: 'leadership',        label: 'Leadership',               weight: 10 },
  { key: 'intelligence',      label: 'Intelligence / Problem Solving', weight: 12 },
  { key: 'initiative',        label: 'Initiative',               weight: 10 },
  { key: 'conduct',           label: 'Professional Conduct',     weight: 5  },
] as const;

type ScoreKey = typeof SCORECARD_CATEGORIES[number]['key'];
type Scores = Record<ScoreKey, number>;

const EMPTY_SCORES: Scores = Object.fromEntries(
  SCORECARD_CATEGORIES.map(c => [c.key, 5])
) as Scores;

// ─── Recommendation Engine ─────────────────────────────────
interface Recommendation {
  label: string;
  color: string;
  bgColor: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}

function getRecommendation(pct: number): Recommendation {
  if (pct >= 90) return {
    label: 'Outstanding Employee',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: Award,
    description: 'Exceptional performance across all metrics. Consider fast-track promotion or recognition award.',
  };
  if (pct >= 75) return {
    label: 'Promotion Recommended',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: TrendingUp,
    description: 'Consistently exceeds expectations. Ready for additional responsibilities and career advancement.',
  };
  if (pct >= 55) return {
    label: 'Training Required',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: BookOpen,
    description: 'Average performer showing potential. Targeted training and mentoring will improve results.',
  };
  return {
    label: 'Performance Improvement Plan',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: AlertTriangle,
    description: 'Below minimum expectations. A structured PIP with regular reviews is required.',
  };
}

function calcWeightedScore(scores: Scores): { total: number; pct: number } {
  const totalWeight = SCORECARD_CATEGORIES.reduce((s, c) => s + c.weight, 0);
  const weighted = SCORECARD_CATEGORIES.reduce((s, c) => s + scores[c.key] * c.weight, 0);
  const maxPossible = totalWeight * 10;
  return { total: weighted, pct: Math.round((weighted / maxPossible) * 100) };
}

// ─── Status helpers ────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  InProgress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_NEXT: Record<string, string> = {
  Draft: 'InProgress',
  InProgress: 'Completed',
  Completed: 'Approved',
};

const today = () => new Date().toISOString().split('T')[0];

const INPUT_CLS = 'w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const INIT_FORM = {
  staffId: '',
  appraisalPeriod: '',
  appraisalDate: today(),
  reviewerUserId: '',
  scores: EMPTY_SCORES,
  managerComments: '',
  hrComments: '',
};

// ─── Score Slider ──────────────────────────────────────────
function ScoreSlider({ label, weight, value, onChange }: {
  label: string; weight: number; value: number; onChange: (v: number) => void;
}) {
  const color = value >= 8 ? 'bg-green-500' : value >= 6 ? 'bg-blue-500' : value >= 4 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="grid grid-cols-[1fr_80px_40px] gap-3 items-center py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <span className="ml-2 text-xs text-gray-400">({weight}% weight)</span>
      </div>
      <input
        type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function AppraisalList() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT_FORM);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['appraisals', { statusFilter, search, page }],
    queryFn: () => hrService.getAppraisals({ page, limit: 12, status: statusFilter || undefined, search: search || undefined }),
  });

  const { data: statsRaw } = useQuery({
    queryKey: ['appraisal-stats'],
    queryFn: () => hrService.getAppraisalStats(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => {
      const { total, pct } = calcWeightedScore(payload.scores);
      return hrService.createAppraisal({
        staffId: Number(payload.staffId),
        appraisalPeriod: payload.appraisalPeriod,
        appraisalDate: payload.appraisalDate,
        reviewerUserId: Number(payload.reviewerUserId),
        overallRating: Math.round(pct / 20), // map 0-100 → 1-5
        performanceNotes: `Weighted Score: ${total} / ${SCORECARD_CATEGORIES.reduce((s,c)=>s+c.weight,0)*10} (${pct}%). Recommendation: ${getRecommendation(pct).label}. ${payload.managerComments}`,
        strengths: payload.hrComments || undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appraisals'] }); setShowModal(false); setForm(INIT_FORM); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => hrService.updateAppraisalStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appraisals'] }); qc.invalidateQueries({ queryKey: ['appraisal-stats'] }); },
  });

  const appraisals: Appraisal[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;
  const stats = (statsRaw as any)?.data;

  const setScore = (key: ScoreKey, val: number) =>
    setForm(f => ({ ...f, scores: { ...f.scores, [key]: val } }));

  const { total: previewTotal, pct: previewPct } = calcWeightedScore(form.scores);
  const previewRec = getRecommendation(previewPct);
  const PreviewIcon = previewRec.icon;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Appraisals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scorecard-based employee reviews and ratings</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          <Plus className="h-4 w-4" /> New Appraisal
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-gray-500 to-slate-600' },
            { label: 'Pending', value: stats.pending, color: 'from-blue-500 to-indigo-600' },
            { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-600' },
            { label: 'Avg Rating', value: stats.avgRating ? `${Number(stats.avgRating).toFixed(1)}/5` : '—', color: 'from-yellow-500 to-amber-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
              <p className="text-white/70 text-xs">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
          <input
            type="text"
            placeholder="Search staff name or period..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Statuses</option>
          {['Draft','InProgress','Completed','Approved','Rejected'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* List */}
      {appraisals.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No appraisals found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appraisals.map((a, i) => {
            // Parse scorecard from performanceNotes if available
            const pctMatch = a.performanceNotes?.match(/\((\d+)%\)/);
            const pct = pctMatch ? Number(pctMatch[1]) : (a.overallRating / 5) * 100;
            const rec = getRecommendation(pct);
            const RecIcon = rec.icon;

            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rec.bgColor} border`}>
                      <RecIcon className={`h-5 w-5 ${rec.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-mono dark:text-gray-500">{a.appraisalCode}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {a.staff ? `${a.staff.user.firstName} ${a.staff.user.lastName}` : `Staff #${a.staffId}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{a.appraisalPeriod}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 ml-2">
                      <div className="flex">
                        {Array.from({length:5}).map((_,j) => (
                          <Star key={j} className={`h-3.5 w-3.5 ${j < a.overallRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-600 fill-gray-200 dark:fill-gray-600'}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rec.bgColor} ${rec.color}`}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    {STATUS_NEXT[a.status] && (
                      <button
                        onClick={e => { e.stopPropagation(); statusMutation.mutate({ id: a.id, status: STATUS_NEXT[a.status] }); }}
                        className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
                        → {STATUS_NEXT[a.status]}
                      </button>
                    )}
                    {expanded === a.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expanded === a.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                      <div className="p-4 space-y-4">
                        {/* Recommendation badge */}
                        <div className={`flex items-start gap-3 p-3 rounded-xl border ${rec.bgColor}`}>
                          <RecIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${rec.color}`} />
                          <div>
                            <p className={`font-bold text-sm ${rec.color}`}>{rec.label}</p>
                            <p className={`text-xs mt-0.5 ${rec.color} opacity-80`}>{rec.description}</p>
                          </div>
                          <span className={`ml-auto text-lg font-black ${rec.color}`}>{Math.round(pct)}%</span>
                        </div>
                        {/* Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {a.performanceNotes && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Manager Comments</p>
                              <p className="text-gray-700 dark:text-gray-300">{a.performanceNotes}</p>
                            </div>
                          )}
                          {a.strengths && (
                            <div>
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-1">HR Comments</p>
                              <p className="text-gray-700 dark:text-gray-300">{a.strengths}</p>
                            </div>
                          )}
                        </div>
                        {a.approvedBy && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Approved by Staff #{a.approvedBy}{a.approvedDate ? ` on ${new Date(a.approvedDate).toLocaleDateString()}` : ''}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Prev</button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Next</button>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

              {/* Modal header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
                    <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Appraisal Scorecard</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Score each category 1–10</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Staff ID *</label>
                    <input type="number" value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Reviewer ID *</label>
                    <input type="number" value={form.reviewerUserId} onChange={e => setForm(f => ({ ...f, reviewerUserId: e.target.value }))}
                      className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Appraisal Period *</label>
                    <input value={form.appraisalPeriod} onChange={e => setForm(f => ({ ...f, appraisalPeriod: e.target.value }))}
                      placeholder="e.g. Q2 2026" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Appraisal Date</label>
                    <input type="date" value={form.appraisalDate} onChange={e => setForm(f => ({ ...f, appraisalDate: e.target.value }))}
                      className={INPUT_CLS} />
                  </div>
                </div>

                {/* Scorecard */}
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-indigo-600" /> Performance Scorecard
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4">
                    {SCORECARD_CATEGORIES.map(c => (
                      <ScoreSlider
                        key={c.key}
                        label={c.label}
                        weight={c.weight}
                        value={form.scores[c.key]}
                        onChange={v => setScore(c.key, v)}
                      />
                    ))}
                  </div>
                </div>

                {/* Live Score Preview */}
                <div className={`rounded-xl p-4 border ${previewRec.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PreviewIcon className={`h-5 w-5 ${previewRec.color}`} />
                      <span className={`font-bold text-sm ${previewRec.color}`}>{previewRec.label}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${previewRec.color}`}>{previewPct}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Weighted Score: {previewTotal}</p>
                    </div>
                  </div>
                  <p className={`text-xs ${previewRec.color} opacity-80`}>{previewRec.description}</p>
                  {/* Mini progress bar */}
                  <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-current transition-all duration-300 rounded-full opacity-60"
                      style={{ width: `${previewPct}%` }} />
                  </div>
                </div>

                {/* Comments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Manager Comments</label>
                    <textarea rows={3} value={form.managerComments}
                      onChange={e => setForm(f => ({ ...f, managerComments: e.target.value }))}
                      placeholder="Overall assessment and observations..."
                      className={INPUT_CLS + ' resize-none'} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">HR Comments</label>
                    <textarea rows={3} value={form.hrComments}
                      onChange={e => setForm(f => ({ ...f, hrComments: e.target.value }))}
                      placeholder="HR notes and action items..."
                      className={INPUT_CLS + ' resize-none'} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending || !form.staffId || !form.appraisalPeriod || !form.reviewerUserId}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 font-medium">
                  {createMutation.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="h-4 w-4" />}
                  Submit Appraisal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
