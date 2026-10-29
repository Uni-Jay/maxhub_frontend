import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, ClipboardCheck, Loader2, Plus, Trash2, UserPlus, AlertTriangle, Sparkles } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

const OWNER_TONE: Record<string, string> = {
  HR: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  Manager: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  Staff: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  IT: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  Accounts: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
};

export default function OnboardingPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const overview = useQuery({ queryKey: ['onboarding'], queryFn: () => apiClient.get<any>('/erp/onboarding') });
  const selected = params.get('staff') ? Number(params.get('staff')) : params.get('mine') ? overview.data?.myStaffId : null;

  useEffect(() => {
    if (!selected && overview.data?.checklists?.length && !params.get('mine')) setParams({ staff: String(overview.data.checklists[0].staffId) }, { replace: true });
  }, [overview.data, selected, params, setParams]);

  const start = useMutation({
    mutationFn: (staffId: number) => apiClient.post(`/erp/onboarding/${staffId}/start`, {}),
    onSuccess: (_d, staffId) => { toast.success('Checklist started'); qc.invalidateQueries({ queryKey: ['onboarding'] }); setParams({ staff: String(staffId) }); },
    onError: (e: any) => toast.fromError(e),
  });

  const d = overview.data;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Onboarding</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Every new person gets a checklist for their first month. Steps MaxHub can see (account, pay, first tasks, first weekly report) tick themselves.</p>
      </div>
      {overview.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
          <aside className="space-y-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">Checklists</p>
              {!d?.checklists?.length && <p className="px-4 py-6 text-sm text-gray-400 text-center">No checklists yet</p>}
              {d?.checklists?.map((c: any) => {
                const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
                return (
                  <button key={c.staffId} onClick={() => setParams({ staff: String(c.staffId) })}
                    className={cn('w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50', Number(selected) === Number(c.staffId) && 'bg-indigo-50/60 dark:bg-indigo-500/10')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.firstName} {c.lastName}{Number(c.staffId) === Number(d.myStaffId) ? ' (you)' : ''}</p>
                      <span className="text-xs font-semibold text-gray-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden"><div className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: `${pct}%` }} /></div>
                    <p className="text-[11px] text-gray-500 mt-1">{c.position || c.department || ''}{c.overdue ? <span className="text-red-600"> · {c.overdue} overdue</span> : ''}</p>
                  </button>
                );
              })}
            </div>
            {d?.withoutChecklist?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">Staff without a checklist</p>
                <div className="max-h-72 overflow-y-auto">
                  {d.withoutChecklist.map((s: any) => (
                    <div key={s.staffId} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="truncate text-gray-700 dark:text-gray-300">{s.firstName} {s.lastName}</span>
                      <button onClick={() => start.mutate(Number(s.staffId))} className="text-xs text-indigo-600 font-medium flex items-center gap-1 whitespace-nowrap"><UserPlus className="h-3.5 w-3.5" />Start</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
          {selected ? <Checklist staffId={Number(selected)} myStaffId={d?.myStaffId} /> : (
            <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center text-sm text-gray-500">
              <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />Choose a person to see their checklist.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Checklist({ staffId, myStaffId }: { staffId: number; myStaffId?: number }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['onboarding', staffId], queryFn: () => apiClient.get<any>(`/erp/onboarding/${staffId}`) });
  const [adding, setAdding] = useState<{ title: string; owner: string; section: string } | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); };
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => apiClient.patch(`/erp/onboarding/items/${id}`, { done }),
    onSuccess: refresh, onError: (e: any) => toast.fromError(e),
  });
  const add = useMutation({
    mutationFn: () => apiClient.post(`/erp/onboarding/${staffId}/items`, adding),
    onSuccess: () => { setAdding(null); refresh(); }, onError: (e: any) => toast.fromError(e),
  });
  const del = useMutation({ mutationFn: (id: number) => apiClient.delete(`/erp/onboarding/items/${id}`), onSuccess: refresh });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" />;
  if (error || !data) return <p className="text-sm text-red-600">{(error as any)?.message || 'Could not load the checklist'}</p>;
  const items: any[] = data.items;
  if (!items.length) return <p className="text-sm text-gray-500 bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-800">{Number(staffId) === Number(myStaffId) ? 'You have no onboarding checklist.' : 'No checklist yet.'}</p>;
  const done = items.filter((i) => i.doneAt).length;
  const sections = [...new Set(items.map((i) => i.section))];
  const today = new Date().toISOString().slice(0, 10);
  const isMe = Number(staffId) === Number(myStaffId);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <h2 className="font-semibold text-gray-900 dark:text-white">{data.staff?.firstName} {data.staff?.lastName}{isMe ? ' — your first month' : ''}</h2>
          <p className="text-xs text-gray-500">{[data.staff?.position, data.staff?.department, data.staff?.joiningDate && `started ${new Date(data.staff.joiningDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{done}/{items.length}</p>
          <p className="text-xs text-gray-500">steps done</p>
        </div>
      </div>
      {sections.map((sec) => (
        <div key={sec} className="px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{sec}</p>
          <ul>
            {items.filter((i) => i.section === sec).map((i) => {
              const canTick = data.canManage || (isMe && i.owner === 'Staff');
              const overdue = !i.doneAt && i.dueDate && i.dueDate < today;
              return (
                <li key={i.id} className="flex items-start gap-3 py-2 group">
                  <button disabled={!canTick || toggle.isPending} onClick={() => toggle.mutate({ id: i.id, done: !i.doneAt })} className="mt-0.5 disabled:cursor-default" aria-label={i.doneAt ? 'Mark as not done' : 'Mark as done'}>
                    {i.doneAt ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className={cn('h-5 w-5', canTick ? 'text-gray-300 hover:text-indigo-500' : 'text-gray-200')} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', i.doneAt ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white')}>{i.title}</p>
                    <p className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2">
                      <span className={cn('px-1.5 py-0.5 rounded font-medium', OWNER_TONE[i.owner] || OWNER_TONE.HR)}>{i.owner === 'Staff' ? (isMe ? 'You' : 'New staff') : i.owner}</span>
                      {i.doneAt ? <span className="flex items-center gap-1">{i.doneByName?.includes('automatic') && <Sparkles className="h-3 w-3 text-indigo-400" />}Done by {i.doneByName} · {new Date(i.doneAt).toLocaleDateString('en-GB')}</span>
                        : i.dueDate && <span className={cn(overdue && 'text-red-600 font-medium flex items-center gap-1')}>{overdue && <AlertTriangle className="h-3 w-3" />}Due {new Date(i.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </p>
                  </div>
                  {data.canManage && <button onClick={() => confirm('Remove this step?') && del.mutate(i.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {data.canManage && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          {adding ? (
            <div className="flex flex-wrap gap-2">
              <input autoFocus value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="New step" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm" />
              <select value={adding.owner} onChange={(e) => setAdding({ ...adding, owner: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm">{Object.keys(OWNER_TONE).map((o) => <option key={o}>{o}</option>)}</select>
              <select value={adding.section} onChange={(e) => setAdding({ ...adding, section: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm">{[...sections, 'Extra steps'].filter((v, i, a) => a.indexOf(v) === i).map((o) => <option key={o}>{o}</option>)}</select>
              <button onClick={() => add.mutate()} disabled={!adding.title.trim()} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">Add</button>
              <button onClick={() => setAdding(null)} className="px-3 py-2 text-sm text-gray-500">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAdding({ title: '', owner: 'HR', section: 'Extra steps' })} className="text-sm text-indigo-600 font-medium flex items-center gap-1"><Plus className="h-4 w-4" />Add a step</button>
          )}
        </div>
      )}
    </div>
  );
}
