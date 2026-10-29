import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, Trash2, Pencil, X, Loader2, TrendingUp } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { useCurrentRoles } from '@utils/role';
import { cn } from '@utils/cn';

export interface TargetRow {
  id: number; title: string; brand: string | null; metric: string; metricLabel: string; money: boolean; period: 'month' | 'quarter' | 'year';
  year: number; month: number | null; quarter: number | null; targetValue: number; manualValue: number | null; notes?: string | null;
  periodLabel: string; current: number; percent: number; elapsedPercent: number; status: string; active: boolean;
}

const BRANDS: Record<string, { name: string; color: string; logo: string }> = {
  VM: { name: 'VisaMax', color: '#1d3a8f', logo: '/brands/visamax.jpeg' },
  KS: { name: 'Kurios SAT', color: '#4c9a2a', logo: '/brands/kuriossat.jpeg' },
  BM: { name: 'BeadMax', color: '#7a1f33', logo: '/brands/beadmax.jpeg' },
  MF: { name: 'Maxfood Farm', color: '#1b5e20', logo: '/brands/maxfood.jpeg' },
};
const STATUS_TONE: Record<string, string> = {
  Achieved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  'On track': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  'Just started': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'Slightly behind': 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  Behind: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  Missed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};
export const fmtValue = (t: Pick<TargetRow, 'money'>, v: number) => (t.money ? `₦${Math.round(v).toLocaleString('en-NG')}` : Math.round(v).toLocaleString('en-NG'));

/** One target with its progress bar and the "where we should be by now" marker. */
export function TargetBar({ t, compact = false }: { t: TargetRow; compact?: boolean }) {
  const pct = Math.max(0, Math.min(100, t.percent));
  const color = t.brand ? BRANDS[t.brand]?.color : '#4f46e5';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn('font-medium text-gray-900 dark:text-white truncate', compact ? 'text-sm' : '')}>{t.title}</p>
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', STATUS_TONE[t.status] || STATUS_TONE['Just started'])}>{t.status}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        {t.active && t.elapsedPercent > 0 && t.elapsedPercent < 100 && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-900/40 dark:bg-white/50" style={{ left: `${t.elapsedPercent}%` }} title={`${t.elapsedPercent}% of the period has passed`} />
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1.5">
        <b className="text-gray-800 dark:text-gray-200">{fmtValue(t, t.current)}</b> of {fmtValue(t, t.targetValue)} · {t.percent}% · {t.periodLabel}
      </p>
    </div>
  );
}

/** Dashboard card: targets running now. */
export function TargetsCard() {
  const { data = [], isLoading } = useQuery({ queryKey: ['targets', 'active'], queryFn: () => apiClient.get<TargetRow[]>('/erp/targets', { active: 1 }), staleTime: 5 * 60_000 });
  if (isLoading || !data.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Target className="h-4 w-4 text-indigo-500" />Targets</h3>
        <a href="/targets" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">All targets</a>
      </div>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
        {data.slice(0, 6).map((t) => <TargetBar key={t.id} t={t} compact />)}
      </div>
    </div>
  );
}

const EMPTY = { id: 0, title: '', brand: '', metric: 'revenue', period: 'month', year: new Date().getFullYear(), month: new Date().getMonth() + 1, quarter: Math.floor(new Date().getMonth() / 3) + 1, targetValue: '', manualValue: '', notes: '' };

export default function TargetsPage() {
  const qc = useQueryClient();
  const { roles } = useCurrentRoles();
  const canManage = roles.has('superadmin') || roles.has('admin');
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState<any>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ['targets', year], queryFn: () => apiClient.get<TargetRow[]>('/erp/targets', { year }) });
  const { data: metrics = {} } = useQuery({ queryKey: ['targets-meta'], queryFn: () => apiClient.get<Record<string, { label: string; brands?: string[] }>>('/erp/targets/meta') });

  const groups = useMemo(() => {
    const g: Record<string, TargetRow[]> = { company: [], VM: [], KS: [], BM: [], MF: [] };
    for (const t of data) (g[t.brand || 'company'] ||= []).push(t);
    return g;
  }, [data]);
  const active = data.filter((t) => t.active);
  const achieved = active.filter((t) => t.status === 'Achieved' || t.status === 'On track').length;

  const save = useMutation({
    mutationFn: (f: any) => {
      const body = { ...f, brand: f.brand || null, targetValue: Number(f.targetValue), manualValue: f.manualValue === '' ? null : Number(f.manualValue) };
      return f.id ? apiClient.put(`/erp/targets/${f.id}`, body) : apiClient.post('/erp/targets', body);
    },
    onSuccess: () => { toast.success('Target saved'); setForm(null); qc.invalidateQueries({ queryKey: ['targets'] }); },
    onError: (e: any) => toast.fromError(e, 'Could not save the target'),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/erp/targets/${id}`),
    onSuccess: () => { toast.success('Target deleted'); qc.invalidateQueries({ queryKey: ['targets'] }); },
  });

  const availableMetrics = Object.entries(metrics).filter(([, m]) => !form?.brand || !m.brands || m.brands.includes(form.brand));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Targets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Goals for the whole company and each brand, with progress from the real figures. The thin line shows where we should be by today.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inp}>{[year - 1, year, year + 1].map((y) => <option key={y}>{y}</option>)}</select>
          {canManage && <button onClick={() => setForm({ ...EMPTY, year })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"><Plus className="h-4 w-4" />New target</button>}
        </div>
      </div>

      {active.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-5 flex flex-wrap items-center gap-6">
          <TrendingUp className="h-8 w-8 opacity-80" />
          <div><p className="text-3xl font-bold">{achieved}/{active.length}</p><p className="text-sm text-white/80">targets running now are achieved or on track</p></div>
        </div>
      )}

      {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : error ? (
        <p className="text-center text-sm text-red-600 py-10">{(error as any)?.message || 'Could not load targets'}</p>
      ) : !data.length ? (
        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center">
          <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No targets for {year} yet</p>
          <p className="text-sm text-gray-500 mt-1">e.g. “₦5,000,000 money in for VisaMax this month” or “30 new students at Kurios SAT this quarter”.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {Object.entries(groups).filter(([, list]) => list.length).map(([key, list]) => (
            <div key={key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800" style={key !== 'company' ? { borderTop: `3px solid ${BRANDS[key].color}` } : undefined}>
                {key !== 'company' ? <img src={BRANDS[key].logo} alt="" className="h-7 w-7 rounded object-contain bg-white ring-1 ring-gray-200" /> : <Target className="h-5 w-5 text-indigo-500" />}
                <h2 className="font-semibold text-gray-900 dark:text-white">{key === 'company' ? 'Whole company' : BRANDS[key].name}</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {list.map((t) => (
                  <div key={t.id} className={cn('px-5 py-4 group', !t.active && 'opacity-70')}>
                    <TargetBar t={t} />
                    {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
                    {canManage && (
                      <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setForm({ ...t, brand: t.brand || '', targetValue: String(t.targetValue), manualValue: t.manualValue ?? '' })} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</button>
                        <button onClick={() => confirm(`Delete “${t.title}”?`) && remove.mutate(t.id)} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"><Trash2 className="h-3 w-3" />Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="font-semibold text-gray-900 dark:text-white">{form.id ? 'Edit target' : 'New target'}</h2>
              <button onClick={() => setForm(null)}><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <L label="For"><select className={inp} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                <option value="">Whole company</option>{Object.entries(BRANDS).map(([k, b]) => <option key={k} value={k}>{b.name}</option>)}
              </select></L>
              <L label="Measure"><select className={inp} value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                {availableMetrics.map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select></L>
              <div className="grid grid-cols-3 gap-2">
                <L label="Period"><select className={inp} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}><option value="month">Month</option><option value="quarter">Quarter</option><option value="year">Year</option></select></L>
                {form.period === 'month' && <L label="Month"><select className={inp} value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleString('en-GB', { month: 'short' })}</option>)}</select></L>}
                {form.period === 'quarter' && <L label="Quarter"><select className={inp} value={form.quarter} onChange={(e) => setForm({ ...form, quarter: Number(e.target.value) })}>{[1, 2, 3, 4].map((x) => <option key={x} value={x}>Q{x}</option>)}</select></L>}
                <L label="Year"><input type="number" className={inp} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></L>
              </div>
              <L label={['revenue', 'profit'].includes(form.metric) ? 'Target (₦)' : 'Target'}><input inputMode="decimal" className={inp} value={form.targetValue} onChange={(e) => setForm({ ...form, targetValue: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 5000000" /></L>
              {form.metric === 'manual' && <>
                <L label="Name of the target"><input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Instagram followers" /></L>
                <L label="Progress so far"><input inputMode="decimal" className={inp} value={form.manualValue} onChange={(e) => setForm({ ...form, manualValue: e.target.value.replace(/[^\d.]/g, '') })} /></L>
              </>}
              {form.metric !== 'manual' && <L label="Name (optional)"><input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Leave blank to name it automatically" /></L>}
              <L label="Notes (optional)"><textarea rows={2} className={inp} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></L>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={() => save.mutate(form)} disabled={save.isPending || !(Number(form.targetValue) > 0)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save target</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white';
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 space-y-1"><span>{label}</span>{children}</label>;
}
