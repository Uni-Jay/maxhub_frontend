import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ScrollText, CheckCircle2, Clock, Loader2, BellRing, Pencil, Archive, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Modal, Drawer, Field, Pill, UploadLink, Empty, Stat, inp, btnPrimary, btnGhost, btnDanger, card, fmtDate, fmtDateTime } from '@components/erp/Kit';

interface Policy {
  id: number; title: string; category: string; summary?: string | null; body?: string | null; fileUrl?: string | null; version: number; departmentId: number | null;
  status: string; publishedAt?: string | null; acceptBy?: string | null; brandName?: string | null; forMe: boolean; myAcceptedAt?: string | null;
  accepted: number; total: number; overdue: boolean; updatedAt: string;
}

export default function PoliciesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['policies'], queryFn: () => apiClient.get<{ policies: Policy[]; canManage: boolean }>('/erp/policies') });
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const policies = q.data?.policies || [];
  const canManage = !!q.data?.canManage;
  const openId = Number(params.get('open')) || null;
  const setOpen = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };
  const mine = policies.filter((p) => p.forMe && p.status === 'Published');
  const toAccept = mine.filter((p) => !p.myAcceptedAt);
  const shown = policies.filter((p) => showArchived || p.status !== 'Archived');
  const refresh = () => qc.invalidateQueries({ queryKey: ['policies'] });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Policies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Read each policy and confirm you accept it. {canManage ? 'You can see who has and has not.' : ''}</p>
        </div>
        {canManage && <button onClick={() => setEditing({ category: 'General' })} className={btnPrimary}><Plus className="h-4 w-4" />New policy</button>}
      </div>

      {toAccept.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1"><p className="font-semibold text-amber-900 dark:text-amber-200">{toAccept.length} polic{toAccept.length === 1 ? 'y is' : 'ies are'} waiting for you</p><p className="text-sm text-amber-800 dark:text-amber-300">Open each one, read it, then press “I have read and accept”.</p></div>
          <button onClick={() => setOpen(toAccept[0].id)} className={btnPrimary}>Start</button>
        </div>
      )}

      {canManage && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={ScrollText} label="Published policies" value={policies.filter((p) => p.status === 'Published').length} />
          <Stat icon={CheckCircle2} label="Fully accepted" value={policies.filter((p) => p.status === 'Published' && p.total > 0 && p.accepted >= p.total).length} tone="text-emerald-600" />
          <Stat icon={Clock} label="Acceptances outstanding" value={policies.filter((p) => p.status === 'Published').reduce((t, p) => t + Math.max(0, p.total - p.accepted), 0)} tone="text-amber-600" />
          <Stat icon={Pencil} label="Drafts" value={policies.filter((p) => p.status === 'Draft').length} />
        </div>
      )}

      <div className={card}>
        {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !shown.length ? (
          <Empty icon={ScrollText} title="No policies yet" text={canManage ? 'Add your staff handbook, code of conduct, leave policy or IT rules. Everyone is asked to read and accept them.' : 'Policies HR publishes will appear here.'} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {shown.map((p) => {
              const pct = p.total ? Math.round((p.accepted / p.total) * 100) : 0;
              return (
                <button key={p.id} onClick={() => setOpen(p.id)} className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <ScrollText className="h-5 w-5 text-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-gray-900 dark:text-white">{p.title} {p.version > 1 && <span className="text-xs text-gray-500">v{p.version}</span>}</p>
                    <p className="text-xs text-gray-500">{p.category} · {p.brandName || 'Everyone'}{p.acceptBy ? ` · accept by ${fmtDate(p.acceptBy)}` : ''}</p>
                  </div>
                  {canManage && p.status === 'Published' && (
                    <div className="w-36"><div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div><p className="text-[11px] text-gray-500 mt-1">{p.accepted} of {p.total} accepted</p></div>
                  )}
                  {p.status !== 'Published' ? <Pill tone={p.status === 'Draft' ? 'gray' : 'amber'}>{p.status}</Pill>
                    : p.forMe ? (p.myAcceptedAt ? <Pill tone="green">Accepted</Pill> : <Pill tone={p.overdue ? 'red' : 'amber'}>{p.overdue ? 'Overdue' : 'To accept'}</Pill>) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {canManage && policies.some((p) => p.status === 'Archived') && <button onClick={() => setShowArchived(!showArchived)} className="text-sm text-gray-500 hover:text-gray-800">{showArchived ? 'Hide' : 'Show'} archived policies</button>}

      {openId && <PolicyDrawer id={openId} canManage={canManage} onClose={() => setOpen(null)} onEdit={(p) => setEditing(p)} onChanged={refresh} />}
      {editing && <PolicyEditor p={editing} onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); refresh(); qc.invalidateQueries({ queryKey: ['policy', id] }); setOpen(id); }} />}
    </div>
  );
}

function PolicyDrawer({ id, canManage, onClose, onEdit, onChanged }: { id: number; canManage: boolean; onClose: () => void; onEdit: (p: any) => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['policy', id], queryFn: () => apiClient.get<any>(`/erp/policies/${id}`) });
  const [read, setRead] = useState(false);
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const p = q.data;
  const reload = () => { qc.invalidateQueries({ queryKey: ['policy', id] }); onChanged(); };
  const accept = useMutation({ mutationFn: () => apiClient.post(`/erp/policies/${id}/accept`, {}), onSuccess: () => { toast.success('Thank you', 'Your acceptance is recorded'); reload(); }, onError: (e: any) => toast.fromError(e) });
  const remind = useMutation({ mutationFn: () => apiClient.post<any>(`/erp/policies/${id}/remind`, {}), onSuccess: (d: any) => toast.success(d?.reminded ? `Reminder sent to ${d.reminded}` : 'Everyone has accepted'), onError: (e: any) => toast.fromError(e) });
  const publish = useMutation({ mutationFn: () => apiClient.put(`/erp/policies/${id}`, { publish: true }), onSuccess: () => { toast.success('Published', 'Everyone has been asked to accept it'); reload(); }, onError: (e: any) => toast.fromError(e) });
  const archive = useMutation({ mutationFn: () => apiClient.post(`/erp/policies/${id}/archive`, {}), onSuccess: () => { toast.success('Updated'); reload(); }, onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: () => apiClient.delete(`/erp/policies/${id}`), onSuccess: () => { toast.success('Policy deleted'); onChanged(); onClose(); }, onError: (e: any) => toast.fromError(e) });
  if (!p) return <Drawer title="Policy" onClose={onClose}><Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /></Drawer>;
  const people: any[] = p.people || [];
  const pending = people.filter((x) => !x.acceptedAt);
  const done = people.filter((x) => x.acceptedAt);
  return (
    <Drawer onClose={onClose}
      title={<div className="flex items-center gap-2 flex-wrap"><h2 className="font-semibold text-gray-900 dark:text-white">{p.title}</h2>{p.version > 1 && <Pill>Version {p.version}</Pill>}{p.status !== 'Published' && <Pill tone="amber">{p.status}</Pill>}</div>}
      sub={<>{p.category}{p.publishedAt ? ` · published ${fmtDate(p.publishedAt)}` : ''}{p.acceptBy ? ` · accept by ${fmtDate(p.acceptBy)}` : ''}</>}
      footer={canManage ? <>
        <button onClick={() => { if (confirm('Delete this policy and its acceptance records?')) del.mutate(); }} className={btnDanger}><Trash2 className="h-4 w-4" /></button>
        {p.status !== 'Draft' && <button onClick={() => archive.mutate()} className={btnGhost}><Archive className="h-4 w-4" />{p.status === 'Archived' ? 'Restore' : 'Archive'}</button>}
        <button onClick={() => onEdit(p)} className={btnGhost}><Pencil className="h-4 w-4" />Edit</button>
        {p.status === 'Draft' && <button onClick={() => publish.mutate()} className={btnPrimary}>Publish</button>}
        {p.status === 'Published' && pending.length > 0 && <button onClick={() => remind.mutate()} disabled={remind.isPending} className={btnPrimary}><BellRing className="h-4 w-4" />Remind {pending.length}</button>}
      </> : undefined}>
      {p.summary && <p className="text-sm text-gray-600 dark:text-gray-400 italic">{p.summary}</p>}
      {p.fileUrl && <a href={p.fileUrl} target="_blank" rel="noreferrer" className={btnGhost}><ExternalLink className="h-4 w-4" />Open the policy document</a>}
      {p.body && <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200 max-h-[50vh] overflow-y-auto">{p.body}</div>}

      {p.status === 'Published' && p.forMe && (
        p.myAcceptedAt ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />You accepted this on {fmtDateTime(p.myAcceptedAt)}.</div>
        ) : (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 p-4 space-y-3">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="mt-1" /><span>I have read and understood this policy{p.version > 1 ? ` (version ${p.version})` : ''} and I agree to follow it.</span></label>
            <button onClick={() => accept.mutate()} disabled={!read || accept.isPending} className={btnPrimary}>{accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />}I have read and accept</button>
          </div>
        )
      )}

      {canManage && p.status === 'Published' && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setTab('pending')} className={cn('text-sm px-2.5 py-1 rounded-lg', tab === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold' : 'text-gray-600')}>Not yet ({pending.length})</button>
            <button onClick={() => setTab('done')} className={cn('text-sm px-2.5 py-1 rounded-lg', tab === 'done' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 font-semibold' : 'text-gray-600')}>Accepted ({done.length})</button>
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
            {(tab === 'pending' ? pending : done).map((x) => (
              <div key={x.userId} className="flex items-center justify-between px-3 py-2 text-sm"><span>{x.name} <span className="text-xs text-gray-500">{x.departmentName || ''}</span></span><span className="text-xs text-gray-500">{x.acceptedAt ? fmtDateTime(x.acceptedAt) : ''}</span></div>
            ))}
            {!(tab === 'pending' ? pending : done).length && <p className="px-3 py-4 text-sm text-gray-500 text-center">{tab === 'pending' ? 'Everyone has accepted 🎉' : 'Nobody yet'}</p>}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function PolicyEditor({ p, onClose, onSaved }: { p: Partial<Policy>; onClose: () => void; onSaved: (id: number) => void }) {
  const meta = useQuery({ queryKey: ['policies-meta'], queryFn: () => apiClient.get<{ categories: string[] }>('/erp/policies/meta') });
  const brands = useQuery({ queryKey: ['purchases-meta'], queryFn: () => apiClient.get<any>('/erp/purchases/meta') });
  const [f, setF] = useState({ title: p.title || '', category: p.category || 'General', summary: p.summary || '', body: p.body || '', fileUrl: p.fileUrl || null as string | null, departmentId: p.departmentId ? String(p.departmentId) : '', acceptBy: p.acceptBy || '', newVersion: false });
  const isNew = !p.id;
  const save = useMutation({
    mutationFn: (publish: boolean) => isNew ? apiClient.post<any>('/erp/policies', { ...f, publish }) : apiClient.put<any>(`/erp/policies/${p.id}`, { ...f, publish }),
    onSuccess: (d: any, publish) => { toast.success(publish ? 'Published' : 'Saved'); onSaved(Number(d?.id ?? p.id)); },
    onError: (e: any) => toast.fromError(e),
  });
  return (
    <Modal wide title={isNew ? 'New policy' : `Edit “${p.title}”`} onClose={onClose}
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        {(isNew || p.status === 'Draft') && <button onClick={() => save.mutate(false)} disabled={save.isPending || !f.title} className={btnGhost}>Save draft</button>}
        <button onClick={() => save.mutate(isNew || p.status === 'Draft')} disabled={save.isPending || !f.title || (!f.body && !f.fileUrl)} className={btnPrimary}>{isNew || p.status === 'Draft' ? 'Publish & ask everyone to accept' : 'Save'}</button>
      </>}>
      <Field label="Title"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Staff Code of Conduct" /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Category"><select className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{(meta.data?.categories || ['General']).map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Who must accept"><select className={inp} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}><option value="">Everyone</option>{(brands.data?.brands || []).map((b: any) => <option key={b.id} value={b.id}>{b.name} staff</option>)}</select></Field>
        <Field label="Accept by"><input type="date" className={inp} value={f.acceptBy} onChange={(e) => setF({ ...f, acceptBy: e.target.value })} /></Field>
      </div>
      <Field label="One-line summary"><input className={inp} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="What this policy is about, in a sentence" /></Field>
      <Field label="Policy text" hint="Type or paste the policy. Or attach a document below — or both."><textarea rows={10} className={cn(inp, 'font-mono text-[13px]')} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      <Field label="Document (PDF or Word)"><UploadLink value={f.fileUrl} onChange={(u) => setF({ ...f, fileUrl: u })} label="Attach document" folder="maxhub-policies" accept=".pdf,.doc,.docx" /></Field>
      {!isNew && p.status === 'Published' && (
        <label className="flex items-start gap-2 text-sm rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3"><input type="checkbox" checked={f.newVersion} onChange={(e) => setF({ ...f, newVersion: e.target.checked })} className="mt-1" />
          <span><b>This is an important change</b> — save as version {(p.version || 1) + 1} and ask everyone to accept again. Leave unticked for small fixes such as typos.</span></label>
      )}
    </Modal>
  );
}
