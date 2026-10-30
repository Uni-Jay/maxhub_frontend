import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Trash2, CheckCircle2, XCircle, Loader2, AlertTriangle, Wallet, Clock, PiggyBank, Pencil, ExternalLink } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { CURRENCIES } from '@components/erp/RecordBoard';
import ScanReceipt from '@components/erp/ScanReceipt';
import { Modal, Drawer, Field, Pill, Stat, UploadLink, Empty, Tabs, inp, btnPrimary, btnGhost, btnDanger, card, money, fmtDate, fmtDateTime } from '@components/erp/Kit';

interface Item { name: string; qty: number | string; unitPrice: number | string }
interface PR {
  id: number; code: string; title: string; items: Item[]; category: string; vendor?: string | null; total: number; currency: string; amountNgn: number | null;
  reason?: string | null; neededBy?: string | null; urgency: string; quoteUrl?: string | null; status: string; requestedByName: string; departmentName?: string | null;
  brandName?: string | null; history: Array<{ at: string; by: string; action: string; note?: string | null }>; boughtAt?: string | null; actualAmount?: number | null;
  receiptUrl?: string | null; createdAt: string; mine: boolean; canApprove: boolean; canBuy: boolean; canCancel: boolean; canDelete: boolean;
}
interface Meta { categories: string[]; settings: { hodLimit: number }; brands: Array<{ id: number; code: string; name: string }>; myDepartmentId: number | null; canSeeAll: boolean; isManagement: boolean; headed: number[] }

const TONE: Record<string, 'amber' | 'blue' | 'green' | 'red' | 'gray' | 'indigo'> = {
  'Waiting for head of department': 'amber', 'Waiting for management': 'blue', Approved: 'indigo', Bought: 'green', Rejected: 'red', Cancelled: 'gray',
};
const SHORT: Record<string, string> = { 'Waiting for head of department': 'Waiting — head of dept', 'Waiting for management': 'Waiting — management', Approved: 'Approved — with Accounts', Bought: 'Paid out' };
const prMoney = (r: Pick<PR, 'currency'>, n: any) => money(n, r.currency);

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const metaQ = useQuery({ queryKey: ['purchases-meta'], queryFn: () => apiClient.get<Meta>('/erp/purchases/meta') });
  const listQ = useQuery({ queryKey: ['purchases'], queryFn: () => apiClient.get<PR[]>('/erp/purchases') });
  const meta = metaQ.data;
  const rows = listQ.data || [];
  const canBudgets = !!meta && (meta.canSeeAll || meta.headed.length > 0);
  const toApprove = rows.filter((r) => r.canApprove);
  const toBuy = rows.filter((r) => r.canBuy);
  const [tab, setTab] = useState<'requests' | 'budgets'>('requests');
  const [filter, setFilter] = useState<'action' | 'mine' | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const openId = Number(params.get('open')) || null;
  const open = rows.find((r) => Number(r.id) === openId) || null;
  const setOpen = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };

  useEffect(() => { if (toApprove.length || toBuy.length) setFilter('action'); }, [toApprove.length, toBuy.length]);

  const shown = rows.filter((r) => filter === 'all' ? true : filter === 'mine' ? r.mine : r.canApprove || r.canBuy);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['budgets'] }); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ask before buying. Your head of department approves, management approves bigger amounts, then it goes straight to Accounts to pay out — and into the month’s expenses.</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary}><Plus className="h-4 w-4" />New request</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Clock} label="Waiting for your approval" value={toApprove.length} tone={toApprove.length ? 'text-amber-600' : undefined} />
        <Stat icon={ShoppingCart} label={meta?.canSeeAll ? 'Approved, waiting to be paid out' : 'My open requests'} value={meta?.canSeeAll ? toBuy.length || rows.filter((r) => r.status === 'Approved').length : rows.filter((r) => r.mine && ['Waiting for head of department', 'Waiting for management', 'Approved'].includes(r.status)).length} />
        <Stat icon={CheckCircle2} label="Paid out this month" value={money(rows.filter((r) => r.status === 'Bought' && r.boughtAt && r.boughtAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((t, r) => t + Number(r.currency === 'NGN' ? r.actualAmount ?? r.total : (r.amountNgn ?? 0) * (r.actualAmount && r.total ? r.actualAmount / r.total : 1)), 0))} tone="text-emerald-600" />
        <Stat icon={Wallet} label="Head of department can approve up to" value={money(meta?.settings.hodLimit ?? 100000)} />
      </div>

      {canBudgets && <Tabs value={tab} onChange={setTab} tabs={[{ id: 'requests', label: 'Requests', count: toApprove.length + toBuy.length }, { id: 'budgets', label: 'Budgets' }]} />}

      {tab === 'budgets' && canBudgets ? <Budgets meta={meta!} /> : (
        <div className={card}>
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
            {([['action', `Needs my action (${toApprove.length + toBuy.length})`], ['mine', 'My requests'], ['all', 'All I can see']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn('px-3 py-1.5 rounded-lg text-sm', filter === k ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>{l}</button>
            ))}
          </div>
          {listQ.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !shown.length ? (
            <Empty icon={ShoppingCart} title={filter === 'action' ? 'Nothing waiting for you' : 'No purchase requests yet'} text="When you need to buy something for work — stock, equipment, adverts, repairs — send a request here first." />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {shown.map((r) => (
                <button key={r.id} onClick={() => setOpen(r.id)} className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-gray-900 dark:text-white">{r.title} {r.urgency === 'Urgent' && <Pill tone="red">Urgent</Pill>}</p>
                    <p className="text-xs text-gray-500">{r.code} · {r.requestedByName} · {r.brandName || r.departmentName || '—'} · {r.category} · {fmtDate(r.createdAt)}</p>
                  </div>
                  <p className="font-semibold tabular-nums text-gray-900 dark:text-white">{prMoney(r, r.total)}</p>
                  <Pill tone={TONE[r.status] || 'gray'}>{SHORT[r.status] || r.status}</Pill>
                  {(r.canApprove || r.canBuy) && <Pill tone="violet">{r.canApprove ? 'Your approval' : 'To pay out'}</Pill>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {creating && meta && <NewRequest meta={meta} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); refresh(); setOpen(id); }} />}
      {open && meta && <RequestDrawer r={open} meta={meta} onClose={() => setOpen(null)} onChanged={refresh} />}
    </div>
  );
}

function NewRequest({ meta, onClose, onSaved }: { meta: Meta; onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState({ title: '', category: 'Stock & materials', vendor: '', currency: 'NGN', reason: '', neededBy: '', urgency: 'Normal', quoteUrl: null as string | null, departmentId: meta.myDepartmentId ? String(meta.myDepartmentId) : '' });
  const [items, setItems] = useState<Item[]>([{ name: '', qty: 1, unitPrice: '' }]);
  const total = items.reduce((t, i) => t + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const clean = items.filter((i) => i.name.trim() && Number(i.qty) > 0);
  const payload = { ...f, items: clean.map((i) => ({ name: i.name, qty: Number(i.qty), unitPrice: Number(i.unitPrice) || 0 })) };
  const check = useQuery({
    queryKey: ['purchase-check', total, f.currency, f.category, f.departmentId],
    queryFn: () => apiClient.post<any>('/erp/purchases/check', payload),
    enabled: total > 0,
  });
  const b = check.data?.budget;
  const save = useMutation({
    mutationFn: () => apiClient.post<any>('/erp/purchases', payload),
    onSuccess: (d: any) => { toast.success('Request sent', 'You will be notified when it is approved'); onSaved(Number(d.id)); },
    onError: (e: any) => toast.fromError(e, 'Could not send the request'),
  });
  return (
    <Modal wide title="New purchase request" sub="What do you need, how much does it cost and why?" onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.title.trim() || !(total > 0)} className={btnPrimary}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Send for approval</button></>}>
      <Field label="What are you buying?"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Flyers for the November visa fair" /></Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Type of spending" className="sm:col-span-2"><select className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{meta.categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Currency"><select className={inp} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Items</p><button onClick={() => setItems([...items, { name: '', qty: 1, unitPrice: '' }])} className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add item</button></div>
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_70px_120px_110px_32px] gap-2 text-[11px] text-gray-500 px-1"><span>Item</span><span>Qty</span><span>Unit price</span><span className="text-right">Amount</span><span /></div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px] sm:grid-cols-[1fr_70px_120px_110px_32px] gap-2 items-center">
              <input className={inp} value={it.name} placeholder="Item" onChange={(e) => { const n = [...items]; n[i] = { ...it, name: e.target.value }; setItems(n); }} />
              <input className={cn(inp, 'text-right')} value={it.qty} inputMode="decimal" onChange={(e) => { const n = [...items]; n[i] = { ...it, qty: e.target.value.replace(/[^\d.]/g, '') }; setItems(n); }} />
              <input className={cn(inp, 'text-right')} value={it.unitPrice} placeholder="0" inputMode="decimal" onChange={(e) => { const n = [...items]; n[i] = { ...it, unitPrice: e.target.value.replace(/[^\d.]/g, '') }; setItems(n); }} />
              <p className="text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">{money((Number(it.qty) || 0) * (Number(it.unitPrice) || 0), f.currency)}</p>
              <button onClick={() => setItems(items.filter((_, j) => j !== i))} disabled={items.length === 1} className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2 text-sm"><span className="text-gray-500 mr-3">Total</span><span className="font-bold tabular-nums">{money(total, f.currency)}</span></div>
      </div>
      {total > 0 && b && b.hasBudget && (
        <div className={cn('rounded-xl p-3 text-sm flex gap-2', b.over ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200')}>
          {b.over ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> : <PiggyBank className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{b.over ? <>This goes over this month's budget ({money(b.left)} left{b.category ? `, ${money(b.category.budget - b.category.used)} left for ${f.category}` : ''}). Management will need to approve it.</> : <>Within budget — {money(b.leftAfter)} will be left this month{b.category ? ` (${money(b.category.leftAfter)} for ${f.category})` : ''}.</>}</span>
        </div>
      )}
      {total > 0 && check.data && Number(check.data.amountNgn ?? total) > meta.settings.hodLimit && !meta.isManagement && (
        <p className="text-xs text-gray-500">Above {money(meta.settings.hodLimit)}, so management approves after your head of department.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Supplier (if known)"><input className={inp} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} placeholder="e.g. PrintHub Lagos" /></Field>
        <Field label="Needed by"><input type="date" className={inp} value={f.neededBy} onChange={(e) => setF({ ...f, neededBy: e.target.value })} /></Field>
        {meta.canSeeAll && (
          <Field label="For which brand"><select className={inp} value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}><option value="">My department</option>{meta.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        )}
        <Field label="How urgent"><select className={inp} value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}><option>Normal</option><option>Urgent</option></select></Field>
      </div>
      <Field label="Why is it needed?"><textarea rows={2} className={inp} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Helps your approver decide quickly" /></Field>
      <Field label="Quote or invoice (optional)"><UploadLink value={f.quoteUrl} onChange={(u) => setF({ ...f, quoteUrl: u })} label="Attach quote" folder="maxhub-purchases" /></Field>
    </Modal>
  );
}

function RequestDrawer({ r, meta, onClose, onChanged }: { r: PR; meta: Meta; onClose: () => void; onChanged: () => void }) {
  const detail = useQuery({ queryKey: ['purchase', r.id, r.status], queryFn: () => apiClient.get<any>(`/erp/purchases/${r.id}`) });
  const [note, setNote] = useState('');
  const [buying, setBuying] = useState(false);
  const done = (msg?: string) => { if (msg) toast.success(msg); onChanged(); };
  const decide = useMutation({ mutationFn: (decision: 'approve' | 'reject') => apiClient.post<any>(`/erp/purchases/${r.id}/decide`, { decision, note }), onSuccess: (_d, v) => done(v === 'approve' ? 'Approved' : 'Turned down'), onError: (e: any) => toast.fromError(e) });
  const cancel = useMutation({ mutationFn: () => apiClient.post(`/erp/purchases/${r.id}/cancel`, {}), onSuccess: () => done('Request cancelled'), onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: () => apiClient.delete(`/erp/purchases/${r.id}`), onSuccess: () => { done('Request deleted'); onClose(); }, onError: (e: any) => toast.fromError(e) });
  const b = detail.data?.budget;
  return (
    <Drawer onClose={onClose} title={<div className="flex items-center gap-2 flex-wrap"><h2 className="font-semibold text-gray-900 dark:text-white">{r.title}</h2><Pill tone={TONE[r.status] || 'gray'}>{r.status}</Pill></div>}
      sub={<>{r.code} · requested by {r.requestedByName} on {fmtDate(r.createdAt)} · {r.brandName || r.departmentName}</>}
      footer={<>
        {r.canDelete && <button onClick={() => { if (confirm('Delete this request for good?')) del.mutate(); }} className={btnDanger}><Trash2 className="h-4 w-4" />Delete</button>}
        {r.canCancel && <button onClick={() => { if (confirm('Cancel this request?')) cancel.mutate(); }} className={btnGhost}>Cancel request</button>}
        {r.canBuy && <button onClick={() => setBuying(true)} className={btnPrimary}><ShoppingCart className="h-4 w-4" />Pay out & record</button>}
      </>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><p className="text-xs text-gray-500">Amount</p><p className="font-bold tabular-nums">{prMoney(r, r.total)}</p>{r.currency !== 'NGN' && r.amountNgn != null && <p className="text-xs text-gray-500">≈ {money(r.amountNgn)}</p>}</div>
        <div><p className="text-xs text-gray-500">Type</p><p>{r.category}</p></div>
        <div><p className="text-xs text-gray-500">Supplier</p><p>{r.vendor || '—'}</p></div>
        <div><p className="text-xs text-gray-500">Needed by</p><p>{fmtDate(r.neededBy)} {r.urgency === 'Urgent' && <Pill tone="red">Urgent</Pill>}</p></div>
      </div>
      {!!r.items?.length && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm"><tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {r.items.map((i, k) => <tr key={k}><td className="px-3 py-2">{i.name}</td><td className="px-3 py-2 text-right text-gray-500 tabular-nums">{Number(i.qty)} × {prMoney(r, i.unitPrice)}</td><td className="px-3 py-2 text-right tabular-nums font-medium">{prMoney(r, Number(i.qty) * Number(i.unitPrice))}</td></tr>)}
          </tbody></table>
        </div>
      )}
      {r.reason && <div><p className="text-xs font-semibold text-gray-500 mb-1">Why</p><p className="text-sm whitespace-pre-wrap">{r.reason}</p></div>}
      <div className="flex flex-wrap gap-3 text-sm">
        {r.quoteUrl && <a href={r.quoteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">Quote <ExternalLink className="h-3 w-3" /></a>}
        {r.receiptUrl && <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">Receipt <ExternalLink className="h-3 w-3" /></a>}
        {r.status === 'Approved' && <span className="text-amber-700 dark:text-amber-400">With Accounts for payment — already counted in this month’s expenses</span>}
        {r.status === 'Bought' && <span className="text-emerald-700 dark:text-emerald-400">Paid {prMoney(r, r.actualAmount)} on {fmtDate(r.boughtAt)} — in business expenses as Paid</span>}
      </div>
      {b?.hasBudget && ['Waiting for head of department', 'Waiting for management', 'Approved'].includes(r.status) && (
        <div className={cn('rounded-xl p-3 text-sm', b.over ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-gray-50 dark:bg-gray-800/60')}>
          <p className="font-semibold mb-0.5">{b.over ? 'Over budget' : 'Budget this month'}</p>
          <p>Budget {money(b.budget)} · used {money(b.used)} · {money(b.leftAfter)} left after this{b.category ? ` · ${r.category}: ${money(b.category.leftAfter)} left after this` : ''}</p>
        </div>
      )}
      {r.canApprove && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-900 p-4 space-y-3">
          <p className="font-semibold text-sm">Your decision</p>
          <textarea rows={2} className={inp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required if you turn it down)" />
          <div className="flex gap-2">
            <button onClick={() => decide.mutate('approve')} disabled={decide.isPending} className={cn(btnPrimary, 'bg-emerald-600 hover:bg-emerald-700')}><CheckCircle2 className="h-4 w-4" />Approve</button>
            <button onClick={() => decide.mutate('reject')} disabled={decide.isPending || !note.trim()} className={btnDanger}><XCircle className="h-4 w-4" />Turn down</button>
          </div>
          {r.status === 'Waiting for head of department' && !meta.isManagement && <p className="text-xs text-gray-500">If it is above {money(meta.settings.hodLimit)} or over budget, it goes on to management after you approve.</p>}
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">History</p>
        <ol className="space-y-2.5 border-l-2 border-gray-100 dark:border-gray-800 ml-1.5">
          {(r.history || []).map((h, i) => (
            <li key={i} className="pl-4 relative"><span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
              <p className="text-sm"><b>{h.action}</b> — {h.by}</p><p className="text-xs text-gray-500">{fmtDateTime(h.at)}</p>{h.note && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{h.note}</p>}
            </li>
          ))}
        </ol>
      </div>
      {buying && <BuyModal r={r} onClose={() => setBuying(false)} onDone={() => { setBuying(false); done(); }} />}
    </Drawer>
  );
}

function BuyModal({ r, onClose, onDone }: { r: PR; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ actualAmount: String(r.total), boughtAt: new Date().toISOString().slice(0, 10), method: 'Transfer', vendor: r.vendor || '', receiptUrl: null as string | null });
  const save = useMutation({
    mutationFn: () => apiClient.post(`/erp/purchases/${r.id}/bought`, f),
    onSuccess: () => { toast.success('Payment recorded', 'The expense is now marked Paid'); onDone(); },
    onError: (e: any) => toast.fromError(e, 'Could not record the purchase'),
  });
  return (
    <Modal title="Pay out this purchase" sub={`${r.code} · ${r.title}`} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !(Number(f.actualAmount) > 0)} className={btnPrimary}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></>}>
      <ScanReceipt onScanned={(x) => setF({ ...f, actualAmount: x.total ? String(x.total) : f.actualAmount, boughtAt: x.date || f.boughtAt, vendor: x.vendor || f.vendor,
        method: x.method && ['Transfer', 'Cash', 'POS', 'Cheque', 'Card'].includes(x.method) ? x.method : f.method, receiptUrl: x.receiptUrl || f.receiptUrl })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Amount paid (${r.currency})`}><input className={cn(inp, 'text-right')} inputMode="decimal" value={f.actualAmount} onChange={(e) => setF({ ...f, actualAmount: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        <Field label="Date paid"><input type="date" className={inp} value={f.boughtAt} onChange={(e) => setF({ ...f, boughtAt: e.target.value })} /></Field>
        <Field label="Paid by"><select className={inp} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{['Transfer', 'Cash', 'POS', 'Cheque', 'Card'].map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Supplier"><input className={inp} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
      </div>
      <Field label="Receipt"><UploadLink value={f.receiptUrl} onChange={(u) => setF({ ...f, receiptUrl: u })} label="Attach receipt" folder="maxhub-receipts" /></Field>
      <p className="text-xs text-gray-500">This request is already in this month’s business expenses as “Awaiting payment”. Saving marks it Paid with the amount you actually paid.</p>
    </Modal>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Budgets({ meta }: { meta: Meta }) {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const q = useQuery({ queryKey: ['budgets', ym], queryFn: () => apiClient.get<any>('/erp/budgets', ym) });
  const [editing, setEditing] = useState<any | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const data = q.data;
  const months = useMemo(() => Array.from({ length: 15 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() + 2 - i, 1); return { year: d.getFullYear(), month: d.getMonth() + 1 }; }), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={cn(inp, 'w-auto')} value={`${ym.year}-${ym.month}`} onChange={(e) => { const [y, m] = e.target.value.split('-').map(Number); setYm({ year: y, month: m }); }}>
          {months.map((m) => <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{MONTHS[m.month - 1]} {m.year}</option>)}
        </select>
        <p className="text-xs text-gray-500 flex-1">A budget carries on to the next months until you change it. Spent = business expenses; committed = approved requests not yet bought.</p>
        {meta.isManagement && <button onClick={() => setLimitOpen(true)} className={btnGhost}>Approval limit</button>}
      </div>
      {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.brands || []).map((b: any) => {
            const pct = b.percent ?? 0;
            const tone = b.budget == null ? 'bg-gray-300' : pct > 100 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500';
            const cats = Object.entries(b.byCategory || {}) as Array<[string, any]>;
            return (
              <div key={b.brandId} className={cn(card, 'p-4 space-y-3')}>
                <div className="flex items-center gap-3">
                  {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <div className="h-9 w-9 rounded-lg" style={{ background: b.color || '#6366f1' }} />}
                  <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 dark:text-white truncate">{b.name}</p><p className="text-xs text-gray-500">{b.budget == null ? 'No budget set' : `Budget ${money(b.budget)}${b.carried ? ` (from ${b.setFor})` : ''}`}</p></div>
                  {data?.canEdit && <button onClick={() => setEditing(b)} className={btnGhost}><Pencil className="h-3.5 w-3.5" />{b.budget == null ? 'Set' : 'Change'}</button>}
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
                  <div className={tone} style={{ width: `${Math.min(100, b.budget ? (b.spent / b.budget) * 100 : 0)}%` }} />
                  <div className={cn(tone, 'opacity-40')} style={{ width: `${Math.min(100, b.budget ? (b.committed / b.budget) * 100 : 0)}%` }} />
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <div><p className="text-xs text-gray-500">Spent</p><p className="font-semibold tabular-nums">{money(b.spent)}</p></div>
                  <div><p className="text-xs text-gray-500">Committed</p><p className="font-semibold tabular-nums">{money(b.committed)}</p></div>
                  <div><p className="text-xs text-gray-500">Left</p><p className={cn('font-semibold tabular-nums', b.left != null && b.left < 0 ? 'text-red-600' : 'text-emerald-600')}>{b.left == null ? '—' : money(b.left)}</p></div>
                </div>
                {b.pendingCount > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{b.pendingCount} request{b.pendingCount === 1 ? '' : 's'} waiting for approval ({money(b.pending)})</p>}
                {(cats.length > 0 || Object.keys(b.categories || {}).length > 0) && (
                  <div className="space-y-1.5 pt-1">
                    {[...new Set([...Object.keys(b.categories || {}), ...cats.map(([k]) => k)])].map((k) => {
                      const used = (b.byCategory?.[k]?.spent || 0) + (b.byCategory?.[k]?.committed || 0);
                      const cap = Number(b.categories?.[k] || 0);
                      return (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="w-40 truncate text-gray-600 dark:text-gray-400">{k}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={cap && used > cap ? 'bg-red-500 h-full' : 'bg-indigo-500 h-full'} style={{ width: `${cap ? Math.min(100, (used / cap) * 100) : 100}%`, opacity: cap ? 1 : 0.35 }} /></div>
                          <span className="tabular-nums w-36 text-right">{money(used)}{cap ? ` / ${money(cap)}` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {editing && <BudgetModal b={editing} ym={ym} meta={meta} onClose={() => setEditing(null)} />}
      {limitOpen && <LimitModal meta={meta} onClose={() => setLimitOpen(false)} />}
    </div>
  );
}

function BudgetModal({ b, ym, meta, onClose }: { b: any; ym: { year: number; month: number }; meta: Meta; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(b.budget != null ? String(b.budget) : '');
  const [cats, setCats] = useState<Array<{ k: string; v: string }>>(Object.entries(b.categories || {}).map(([k, v]) => ({ k, v: String(v) })));
  const [notes, setNotes] = useState(b.notes || '');
  const save = useMutation({
    mutationFn: () => apiClient.put(`/erp/budgets/${b.brandId}`, { ...ym, amount: Number(amount) || 0, categories: Object.fromEntries(cats.filter((c) => c.k && Number(c.v) > 0).map((c) => [c.k, Number(c.v)])), notes }),
    onSuccess: () => { toast.success('Budget saved'); qc.invalidateQueries({ queryKey: ['budgets'] }); onClose(); },
    onError: (e: any) => toast.fromError(e),
  });
  return (
    <Modal title={`${b.name} budget`} sub={`From ${MONTHS[ym.month - 1]} ${ym.year} onwards, until changed`} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending} className={btnPrimary}>Save budget</button></>}>
      <Field label="Monthly spending budget (₦)"><input className={cn(inp, 'text-right text-base')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" /></Field>
      <div>
        <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Limits by type of spending (optional)</p><button onClick={() => setCats([...cats, { k: meta.categories[0], v: '' }])} className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button></div>
        <div className="space-y-2">
          {cats.map((c, i) => (
            <div key={i} className="flex gap-2">
              <select className={cn(inp, 'flex-1')} value={c.k} onChange={(e) => { const n = [...cats]; n[i] = { ...c, k: e.target.value }; setCats(n); }}>{meta.categories.map((x) => <option key={x}>{x}</option>)}</select>
              <input className={cn(inp, 'w-36 text-right')} inputMode="decimal" value={c.v} placeholder="₦" onChange={(e) => { const n = [...cats]; n[i] = { ...c, v: e.target.value.replace(/[^\d.]/g, '') }; setCats(n); }} />
              <button onClick={() => setCats(cats.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
      <Field label="Notes"><textarea rows={2} className={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </Modal>
  );
}

function LimitModal({ meta, onClose }: { meta: Meta; onClose: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState(String(meta.settings.hodLimit));
  const save = useMutation({
    mutationFn: () => apiClient.put('/erp/purchases/settings', { hodLimit: Number(v) || 0 }),
    onSuccess: () => { toast.success('Limit saved'); qc.invalidateQueries({ queryKey: ['purchases-meta'] }); onClose(); },
    onError: (e: any) => toast.fromError(e),
  });
  return (
    <Modal title="Approval limit" sub="Heads of department can fully approve requests up to this amount, if within budget" onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} className={btnPrimary}>Save</button></>}>
      <Field label="Limit (₦)"><input className={cn(inp, 'text-right text-base')} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
    </Modal>
  );
}
