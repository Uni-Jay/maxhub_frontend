import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Loader2, Plus, RefreshCw, Star, X, Trash2, Printer } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

const STATUS_TONE: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'Self review': 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'Manager review': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};

function lastMonth() {
  const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); const e = new Date(d.getFullYear(), d.getMonth(), 0);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10), label: s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
}
function lastQuarter() {
  const d = new Date(); const q = Math.floor(d.getMonth() / 3); const y = q === 0 ? d.getFullYear() - 1 : d.getFullYear(); const qq = q === 0 ? 4 : q;
  const s = new Date(y, (qq - 1) * 3, 1); const e = new Date(y, qq * 3, 0);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10), label: `Q${qq} ${y}` };
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const openId = params.get('open') ? Number(params.get('open')) : null;
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['reviews'], queryFn: () => apiClient.get<any>('/erp/reviews') });
  const reviews: any[] = data?.reviews || [];
  const mine = reviews.filter((r) => Number(r.staffId) === Number(data?.myStaffId));
  const others = reviews.filter((r) => Number(r.staffId) !== Number(data?.myStaffId));

  const Row = (r: any) => (
    <button key={r.id} onClick={() => setParams({ open: String(r.id) })} className="w-full text-left flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40">
      <div className="flex-1 min-w-[180px]">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.firstName} {r.lastName}</p>
        <p className="text-xs text-gray-500">{[r.position, r.department].filter(Boolean).join(' · ')}</p>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 w-32">{r.periodLabel}</p>
      <p className="text-sm w-44">{r.rating ? <><b className="text-gray-900 dark:text-white">{Number(r.overallScore).toFixed(1)}</b><span className="text-gray-500"> · {r.rating}</span></> : <span className="text-gray-400">—</span>}</p>
      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', STATUS_TONE[r.status])}>{r.status}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Reviews</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Each review starts from the person's real work record — tasks, weekly reports, attendance, leave and brand jobs — then a self review and a manager review.</p>
        </div>
        {data?.canCreate && <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"><Plus className="h-4 w-4" />Start reviews</button>}
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : (
        <>
          {mine.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">Your reviews</p>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">{mine.map(Row)}</div>
            </div>
          )}
          {data?.canCreate && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">Your team</p>
              {others.length ? <div className="divide-y divide-gray-100 dark:divide-gray-800">{others.map(Row)}</div> : <p className="px-5 py-10 text-center text-sm text-gray-400">No reviews yet. Click “Start reviews” to begin.</p>}
            </div>
          )}
          {!mine.length && !data?.canCreate && <p className="text-center text-sm text-gray-400 py-12">You have no reviews yet.</p>}
        </>
      )}
      {creating && <StartReviews onClose={() => setCreating(false)} onDone={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['reviews'] }); }} myStaffId={data?.myStaffId} />}
      {openId && <ReviewDrawer id={openId} onClose={() => setParams({})} />}
    </div>
  );
}

function StartReviews({ onClose, onDone, myStaffId }: { onClose: () => void; onDone: () => void; myStaffId?: number }) {
  const [preset, setPreset] = useState<'month' | 'quarter' | 'custom'>('month');
  const [range, setRange] = useState(lastMonth());
  const [picked, setPicked] = useState<number[]>([]);
  const [send, setSend] = useState(true);
  const { data: staff = [] } = useQuery({ queryKey: ['review-people'], queryFn: () => apiClient.get<any[]>('/erp/reviews/people') });
  const people = (staff as any[]).filter((s) => Number(s.id) !== Number(myStaffId));
  useEffect(() => { if (preset === 'month') setRange(lastMonth()); if (preset === 'quarter') setRange(lastQuarter()); }, [preset]);
  const create = useMutation({
    mutationFn: () => apiClient.post('/erp/reviews', { staffIds: picked, periodStart: range.start, periodEnd: range.end, periodLabel: range.label, sendForSelfReview: send }),
    onSuccess: (r: any) => { toast.success(`${Array.isArray(r) ? r.length : 1} review(s) started`); onDone(); },
    onError: (e: any) => toast.fromError(e),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900"><h2 className="font-semibold text-gray-900 dark:text-white">Start performance reviews</h2><button onClick={onClose}><X className="h-4 w-4 text-gray-500" /></button></div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">{(['month', 'quarter', 'custom'] as const).map((p) => <button key={p} onClick={() => setPreset(p)} className={cn('flex-1 py-2 rounded-xl border text-sm font-medium', preset === p ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>{p === 'month' ? 'Last month' : p === 'quarter' ? 'Last quarter' : 'Custom'}</button>)}</div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 col-span-1">Name<input className={inp} value={range.label} onChange={(e) => setRange({ ...range, label: e.target.value })} /></label>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">From<input type="date" className={inp} value={range.start} onChange={(e) => { setPreset('custom'); setRange({ ...range, start: e.target.value }); }} /></label>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">To<input type="date" className={inp} value={range.end} onChange={(e) => { setPreset('custom'); setRange({ ...range, end: e.target.value }); }} /></label>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1"><p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Who to review</p>
              <button onClick={() => setPicked(picked.length === people.length ? [] : people.map((p) => Number(p.id)))} className="text-xs text-indigo-600">{picked.length === people.length ? 'Clear' : 'Select everyone'}</button></div>
            <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
              {people.map((p) => (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <input type="checkbox" checked={picked.includes(Number(p.id))} onChange={() => setPicked(picked.includes(Number(p.id)) ? picked.filter((x) => x !== Number(p.id)) : [...picked, Number(p.id)])} className="rounded text-indigo-600" />
                  <span className="flex-1 text-gray-900 dark:text-white">{p.firstName} {p.lastName}</span><span className="text-xs text-gray-500">{p.position || p.department || ''}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="rounded text-indigo-600" />Ask each person to score themselves first</label>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={() => create.mutate()} disabled={!picked.length || create.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Start {picked.length || ''} review{picked.length === 1 ? '' : 's'}</button>
        </div>
      </div>
    </div>
  );
}

function Stars({ value, onChange, disabled }: { value?: number; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onClick={() => onChange?.(n)} aria-label={`${n} of 5`} className="disabled:cursor-default">
          <Star className={cn('h-5 w-5', (value || 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600')} />
        </button>
      ))}
    </div>
  );
}

function ReviewDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: r, isLoading, error } = useQuery({ queryKey: ['review', id], queryFn: () => apiClient.get<any>(`/erp/reviews/${id}`) });
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (r) setF({ selfScores: r.selfScores || {}, selfComment: r.selfComment || '', managerScores: r.managerScores || {}, managerComment: r.managerComment || '', goals: r.goals?.length ? r.goals : [{ goal: '', due: '' }] }); }, [r]);
  const save = useMutation({
    mutationFn: (action: string) => apiClient.put(`/erp/reviews/${id}`, { ...f, goals: (f.goals || []).filter((g: any) => g.goal?.trim()), action }),
    onSuccess: (_d, action) => { toast.success(action === 'complete' ? 'Review completed' : action === 'submit' ? 'Sent to your manager' : action === 'sendToStaff' ? 'Sent for self review' : 'Saved'); qc.invalidateQueries({ queryKey: ['review', id] }); qc.invalidateQueries({ queryKey: ['reviews'] }); },
    onError: (e: any) => toast.fromError(e),
  });
  const refresh = useMutation({ mutationFn: () => apiClient.post(`/erp/reviews/${id}/refresh`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['review', id] }) });
  const del = useMutation({ mutationFn: () => apiClient.delete(`/erp/reviews/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews'] }); onClose(); } });

  const e = r?.evidence || {};
  const selfOpen = r?.isMe && r?.status === 'Self review';
  const mgrOpen = r?.canManage && r?.status !== 'Completed';
  const showSelf = r?.isMe || r?.status !== 'Draft';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col" onClick={(ev) => ev.stopPropagation()}>
        {isLoading || !r || !f ? <div className="p-10">{error ? <p className="text-red-600 text-sm">{(error as any).message}</p> : <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />}</div> : (
          <>
            <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <Award className="h-6 w-6 text-indigo-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white">{r.firstName} {r.lastName} — {r.periodLabel}</h2>
                <p className="text-xs text-gray-500">{[r.position, r.department, r.reviewerName && `Reviewer: ${r.reviewerName}`].filter(Boolean).join(' · ')}</p>
              </div>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', STATUS_TONE[r.status])}>{r.status}</span>
              <button onClick={() => window.print()} className="p-1.5 text-gray-400 hover:text-gray-700" title="Print"><Printer className="h-4 w-4" /></button>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {r.rating && (
                <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 flex items-center gap-5">
                  <p className="text-4xl font-bold">{Number(r.overallScore).toFixed(1)}</p>
                  <div><p className="font-semibold text-lg">{r.rating}</p><p className="text-sm text-white/80">Average of the manager's scores out of 5</p></div>
                </div>
              )}
              <section>
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Work record</h3>
                  {r.canManage && r.status !== 'Completed' && <button onClick={() => refresh.mutate()} className="text-xs text-indigo-600 flex items-center gap-1"><RefreshCw className={cn('h-3 w-3', refresh.isPending && 'animate-spin')} />Refresh</button>}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Fact label="Tasks done" value={`${e.tasks?.done ?? 0} / ${e.tasks?.total ?? 0}`} sub={e.tasks?.done ? `${e.tasks.onTime} on time` : undefined} />
                  <Fact label="Overdue tasks" value={e.tasks?.overdue ?? 0} warn={(e.tasks?.overdue ?? 0) > 0} />
                  <Fact label="Weekly reports" value={`${e.weeklyReports?.submitted ?? 0} / ${e.weeklyReports?.expected ?? 0}`} sub={`${e.weeklyReports?.approved ?? 0} approved`} />
                  <Fact label="Attendance" value={`${e.attendance?.present ?? 0} days`} sub={`${e.attendance?.late ?? 0} late · ${e.attendance?.absent ?? 0} absent`} />
                  <Fact label="Leave taken" value={`${e.leaveDays ?? 0} days`} />
                  <Fact label="Receipts issued" value={e.receiptsIssued ?? 0} />
                  <Fact label="Customer reports" value={e.customerReports ?? 0} />
                  {Object.entries(e.brandJobs || {}).map(([k, v]: any) => <Fact key={k} label={k} value={`${v.completed} / ${v.handled}`} sub="completed / handled" />)}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Scores</h3>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  <div className="grid grid-cols-[1fr_120px_120px] gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-gray-400"><span>Area</span><span>{showSelf ? 'Self' : ''}</span><span>Manager</span></div>
                  {r.criteria.map((c: any) => (
                    <div key={c.key} className="grid grid-cols-[1fr_120px_120px] gap-2 px-4 py-2.5 items-center">
                      <div><p className="text-sm text-gray-900 dark:text-white">{c.label}</p><p className="text-[11px] text-gray-500">{c.hint}</p></div>
                      <div>{showSelf && <Stars value={f.selfScores[c.key]} disabled={!selfOpen} onChange={(v) => setF({ ...f, selfScores: { ...f.selfScores, [c.key]: v } })} />}</div>
                      <div>{(r.canManage || r.status === 'Completed') && <Stars value={f.managerScores[c.key]} disabled={!mgrOpen} onChange={(v) => setF({ ...f, managerScores: { ...f.managerScores, [c.key]: v } })} />}</div>
                    </div>
                  ))}
                </div>
              </section>

              {showSelf && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{r.isMe ? 'Your comments' : 'Their comments'}</h3>
                  <textarea rows={4} disabled={!selfOpen} value={f.selfComment} onChange={(ev) => setF({ ...f, selfComment: ev.target.value })} placeholder="What went well, what was hard, what support you need…" className={cn(inp, 'disabled:bg-gray-50 dark:disabled:bg-gray-800/50')} />
                </section>
              )}
              {(r.canManage || r.status === 'Completed') && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Manager's feedback</h3>
                  <textarea rows={4} disabled={!mgrOpen} value={f.managerComment} onChange={(ev) => setF({ ...f, managerComment: ev.target.value })} placeholder="Strengths, areas to improve, examples…" className={cn(inp, 'disabled:bg-gray-50 dark:disabled:bg-gray-800/50')} />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-4 mb-2">Goals for the next period</h3>
                  <div className="space-y-2">
                    {f.goals.map((g: any, i: number) => (
                      <div key={i} className="flex gap-2">
                        <input disabled={!mgrOpen} value={g.goal} onChange={(ev) => setF({ ...f, goals: f.goals.map((x: any, j: number) => (j === i ? { ...x, goal: ev.target.value } : x)) })} placeholder="e.g. Close 10 visa applications" className={cn(inp, 'flex-1')} />
                        <input disabled={!mgrOpen} type="date" value={g.due || ''} onChange={(ev) => setF({ ...f, goals: f.goals.map((x: any, j: number) => (j === i ? { ...x, due: ev.target.value } : x)) })} className={cn(inp, 'w-40')} />
                      </div>
                    ))}
                    {mgrOpen && <button onClick={() => setF({ ...f, goals: [...f.goals, { goal: '', due: '' }] })} className="text-xs text-indigo-600 font-medium">+ Add goal</button>}
                  </div>
                </section>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              {r.canManage && <button onClick={() => confirm('Delete this review?') && del.mutate()} className="mr-auto text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
              {selfOpen && <><button onClick={() => save.mutate('save')} className={ghost}>Save</button><button onClick={() => save.mutate('submit')} className={primary}>Send to my manager</button></>}
              {mgrOpen && <>
                <button onClick={() => save.mutate('save')} className={ghost}>Save</button>
                {r.status === 'Draft' && <button onClick={() => save.mutate('sendToStaff')} className={ghost}>Ask them to self-review</button>}
                <button onClick={() => save.mutate('complete')} className={primary}>Complete review</button>
              </>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value, sub, warn }: { label: string; value: any; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
      <p className="text-[11px] text-gray-500 truncate">{label}</p>
      <p className={cn('text-lg font-bold', warn ? 'text-red-600' : 'text-gray-900 dark:text-white')}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

const inp = 'w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white';
const ghost = 'px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800';
const primary = 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold';
