import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, AlertTriangle, BadgeCheck, Clock, Wallet, Pencil, Trash2, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { CURRENCIES } from '@components/erp/RecordBoard';
import { Modal, Field, Pill, UploadLink, Empty, Stat, inp, btnPrimary, btnGhost, card, money, fmtDate } from '@components/erp/Kit';

interface Rec {
  id: number; staffId: number; staffName: string; position?: string; departmentName?: string; title: string; kind: string; provider?: string | null;
  startDate?: string | null; completedOn?: string | null; expiresOn?: string | null; status: string; certificateUrl?: string | null; cost: number | null; currency: string;
  paidByCompany: boolean; verified: boolean; verifiedByName?: string | null; notes?: string | null; expiry: string | null; canEdit: boolean;
}
interface Data { records: Rec[]; people: Array<{ id: number; name: string; position?: string; departmentName?: string }>; summary: { total: number; expired: number; expiringSoon: number; toVerify: number; spend: number }; myStaffId: number | null; canManage: boolean; kinds: string[] }

const EXP_TONE: Record<string, 'red' | 'amber' | 'green'> = { Expired: 'red', 'Expiring soon': 'amber', Valid: 'green' };

export default function TrainingRecordsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const staffFilter = params.get('staff') ? Number(params.get('staff')) : null;
  const mineOnly = params.get('mine') === '1';
  const q = useQuery({ queryKey: ['training-records', staffFilter, mineOnly], queryFn: () => apiClient.get<Data>('/erp/training-records', { ...(staffFilter ? { staffId: staffFilter } : {}), ...(mineOnly ? { mine: 1 } : {}) }) });
  const [view, setView] = useState<'all' | 'expiring' | 'verify'>('all');
  const [editing, setEditing] = useState<Partial<Rec> | null>(null);
  const d = q.data;
  const canManage = !!d?.canManage && !mineOnly;
  let rows = d?.records || [];
  if (view === 'expiring') rows = rows.filter((r) => r.expiry === 'Expired' || r.expiry === 'Expiring soon');
  if (view === 'verify') rows = rows.filter((r) => !r.verified);
  const refresh = () => qc.invalidateQueries({ queryKey: ['training-records'] });
  const verify = useMutation({ mutationFn: (id: number) => apiClient.post(`/erp/training-records/${id}/verify`, {}), onSuccess: () => { toast.success('Verified'); refresh(); }, onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: (id: number) => apiClient.delete(`/erp/training-records/${id}`), onSuccess: () => { toast.success('Deleted'); refresh(); }, onError: (e: any) => toast.fromError(e) });
  const person = staffFilter ? d?.people.find((p) => p.id === staffFilter) : null;
  const setStaff = (id: string) => { const p = new URLSearchParams(params); if (id) p.set('staff', id); else p.delete('staff'); p.delete('mine'); setParams(p, { replace: true }); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{mineOnly ? 'My Training & Certificates' : 'Training Records'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Courses, certificates and licences{canManage ? ' for each staff member' : ''}. You get a reminder 30 days before anything expires.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/hr/training" className={btnGhost}><GraduationCap className="h-4 w-4" />Training programmes</Link>
          <button onClick={() => setEditing({ staffId: staffFilter || d?.myStaffId || undefined, kind: 'Course', status: 'Completed', currency: 'NGN' })} className={btnPrimary}><Plus className="h-4 w-4" />Add record</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={GraduationCap} label="Records" value={d?.summary.total ?? 0} />
        <Stat icon={AlertTriangle} label="Expired" value={d?.summary.expired ?? 0} tone={d?.summary.expired ? 'text-red-600' : undefined} />
        <Stat icon={Clock} label="Expiring within 30 days" value={d?.summary.expiringSoon ?? 0} tone={d?.summary.expiringSoon ? 'text-amber-600' : undefined} />
        {canManage ? <Stat icon={Wallet} label="Paid by the company (₦)" value={money(d?.summary.spend ?? 0)} /> : <Stat icon={BadgeCheck} label="Waiting for HR to verify" value={d?.summary.toVerify ?? 0} />}
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
          {([['all', 'All'], ['expiring', `Expired or expiring (${(d?.summary.expired || 0) + (d?.summary.expiringSoon || 0)})`], ['verify', `To verify (${d?.summary.toVerify || 0})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={cn('px-3 py-1.5 rounded-lg text-sm', view === k ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>{l}</button>
          ))}
          {canManage && (
            <select className={cn(inp, 'w-auto ml-auto')} value={staffFilter ? String(staffFilter) : ''} onChange={(e) => setStaff(e.target.value)}>
              <option value="">Everyone</option>{d?.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        {person && <p className="px-4 pt-3 text-sm text-gray-600 dark:text-gray-400">Showing <b>{person.name}</b>{person.position ? ` · ${person.position}` : ''}</p>}
        {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !rows.length ? (
          <Empty icon={GraduationCap} title="No training records" text="Add courses, professional certificates (e.g. IATA, CompTIA, food safety), licences and workshops — with the certificate and expiry date." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-gray-500">
                <tr>{canManage && !staffFilter && <th className="text-left px-4 py-2.5">Staff</th>}<th className="text-left px-4 py-2.5">Training</th><th className="text-left px-4 py-2.5">Completed</th><th className="text-left px-4 py-2.5">Expires</th><th className="text-left px-4 py-2.5">Status</th><th className="px-4 py-2.5" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    {canManage && !staffFilter && <td className="px-4 py-3"><button onClick={() => setStaff(String(r.staffId))} className="font-medium hover:text-indigo-600 text-left">{r.staffName}</button><p className="text-xs text-gray-500">{r.departmentName || ''}</p></td>}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.kind}{r.provider ? ` · ${r.provider}` : ''}{r.paidByCompany && r.cost ? ` · ${money(r.cost, r.currency)} paid by company` : ''}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.status === 'Completed' ? fmtDate(r.completedOn) : <Pill tone="blue">{r.status}</Pill>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.expiresOn ? <>{fmtDate(r.expiresOn)} {r.expiry && <Pill tone={EXP_TONE[r.expiry]}>{r.expiry}</Pill>}</> : <span className="text-gray-400">Does not expire</span>}</td>
                    <td className="px-4 py-3">{r.verified ? <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs" title={r.verifiedByName ? `Verified by ${r.verifiedByName}` : ''}><ShieldCheck className="h-4 w-4" />Verified</span> : <Pill tone="amber">Not verified</Pill>}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.certificateUrl && <a href={r.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg" title="Certificate"><ExternalLink className="h-4 w-4" /></a>}
                      {canManage && !r.verified && <button onClick={() => verify.mutate(r.id)} className="text-xs font-medium text-emerald-700 hover:underline px-2">Verify</button>}
                      {r.canEdit && <button onClick={() => setEditing(r)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg"><Pencil className="h-4 w-4" /></button>}
                      {r.canEdit && <button onClick={() => { if (confirm(`Delete “${r.title}”?`)) del.mutate(r.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && d && <RecordEditor r={editing} data={d} canManage={canManage} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function RecordEditor({ r, data, canManage, onClose, onSaved }: { r: Partial<Rec>; data: Data; canManage: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    staffId: r.staffId ? String(r.staffId) : data.myStaffId ? String(data.myStaffId) : '', title: r.title || '', kind: r.kind || 'Course', provider: r.provider || '',
    startDate: r.startDate || '', completedOn: r.completedOn || '', expiresOn: r.expiresOn || '', status: r.status || 'Completed', certificateUrl: r.certificateUrl || null as string | null,
    cost: r.cost != null ? String(r.cost) : '', currency: r.currency || 'NGN', paidByCompany: !!r.paidByCompany, notes: r.notes || '',
  });
  const save = useMutation({
    mutationFn: () => r.id ? apiClient.put(`/erp/training-records/${r.id}`, f) : apiClient.post('/erp/training-records', f),
    onSuccess: () => { toast.success('Training record saved'); onSaved(); },
    onError: (e: any) => toast.fromError(e),
  });
  return (
    <Modal title={r.id ? 'Edit training record' : 'Add training record'} onClose={onClose}
      footer={<>{r.id && <span className="flex-1" />}<button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.title || !f.staffId} className={btnPrimary}>Save</button></>}>
      {canManage && !r.id && (
        <Field label="Staff member"><select className={inp} value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value })}><option value="">Choose…</option>{data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      )}
      <Field label="Course, certificate or licence"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. IATA Foundation in Travel & Tourism" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><select className={inp} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{data.kinds.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Provider"><input className={inp} value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="e.g. IATA, Cisco, NAFDAC" /></Field>
        <Field label="Status"><select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['Planned', 'In progress', 'Completed'].map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Started"><input type="date" className={inp} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Completed"><input type="date" className={inp} value={f.completedOn} onChange={(e) => setF({ ...f, completedOn: e.target.value })} /></Field>
        <Field label="Expires" hint="Leave empty if it never expires"><input type="date" className={inp} value={f.expiresOn} onChange={(e) => setF({ ...f, expiresOn: e.target.value })} /></Field>
      </div>
      <Field label="Certificate"><UploadLink value={f.certificateUrl} onChange={(u) => setF({ ...f, certificateUrl: u })} label="Attach certificate" folder="maxhub-certificates" /></Field>
      <div className="grid grid-cols-3 gap-3 items-end">
        <Field label="Cost" className="col-span-2"><input className={cn(inp, 'text-right')} inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        <Field label="Currency"><select className={inp} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.paidByCompany} onChange={(e) => setF({ ...f, paidByCompany: e.target.checked })} />The company paid for this</label>
      <Field label="Notes"><textarea rows={2} className={inp} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {!canManage && <p className="text-xs text-gray-500">HR will check the certificate and mark it verified.</p>}
    </Modal>
  );
}

