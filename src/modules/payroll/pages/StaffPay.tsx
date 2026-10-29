import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Pencil, Plus, Trash2, X, Loader2, Wallet, Users, AlertTriangle } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

interface Line { name: string; amount: number | string }
interface PayRow {
  id: number; employeeId?: string; firstName: string; lastName: string; email: string; position?: string; jobTitle?: string;
  departmentName?: string; brand?: string; bankName?: string; accountNumber?: string; status?: string;
  pay: null | { currency: string; basicSalary: number; allowances: Line[]; deductions: Line[]; gross: number; totalDeductions: number; net: number; paymentMethod?: string; effectiveFrom?: string; notes?: string };
}

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];
const money = (n: any, c = 'NGN') => `${({ NGN: '₦', USD: '$', GBP: '£', EUR: '€' } as any)[c] || ''}${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ALLOWANCE_SUGGESTIONS = ['Housing', 'Transport', 'Feeding', 'Data & airtime', 'Responsibility'];
const DEDUCTION_SUGGESTIONS = ['PAYE tax', 'Pension (8%)', 'HMO', 'Loan repayment', 'Cooperative'];

/** Pay is set per staff member — MaxHub does not use salary structures. */
export default function StaffPay() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('All');
  const [editing, setEditing] = useState<PayRow | null>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ['staff-pay'], queryFn: () => apiClient.get<PayRow[]>('/erp/staff-pay') });

  const brands = useMemo(() => ['All', ...Array.from(new Set(data.map((r) => r.brand).filter(Boolean) as string[]))], [data]);
  const rows = data.filter((r) => (brand === 'All' || r.brand === brand) && `${r.firstName} ${r.lastName} ${r.email} ${r.position || ''} ${r.employeeId || ''}`.toLowerCase().includes(q.toLowerCase()));
  const active = data.filter((r) => (r.status || 'Active') === 'Active');
  const ngn = active.filter((r) => r.pay && r.pay.currency === 'NGN');
  const totalGross = ngn.reduce((t, r) => t + (r.pay?.gross || 0), 0);
  const totalNet = ngn.reduce((t, r) => t + (r.pay?.net || 0), 0);
  const missing = active.filter((r) => !r.pay || !r.pay.basicSalary).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Pay</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Set each person's monthly pay. Payroll uses these amounts when you process a month.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Wallet} label="Monthly gross (₦)" value={money(totalGross)} tone="text-indigo-600" />
        <Stat icon={Wallet} label="Monthly take-home (₦)" value={money(totalNet)} tone="text-emerald-600" />
        <Stat icon={missing ? AlertTriangle : Users} label="Active staff without pay set" value={String(missing)} tone={missing ? 'text-amber-600' : 'text-gray-700 dark:text-gray-200'} />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white" />
          </div>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white">
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : error ? (
          <p className="p-8 text-center text-sm text-red-600">{(error as any)?.message || 'Could not load staff pay'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Staff</th>
                  <th className="text-left px-4 py-3">Employed by</th>
                  <th className="text-right px-4 py-3">Basic</th>
                  <th className="text-right px-4 py-3">Allowances</th>
                  <th className="text-right px-4 py-3">Deductions</th>
                  <th className="text-right px-4 py-3">Take-home</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r) => {
                  const p = r.pay;
                  const allow = p ? p.gross - p.basicSalary : 0;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-gray-500">{r.position || r.jobTitle || '—'}{r.employeeId ? ` · ${r.employeeId}` : ''}{r.status && r.status !== 'Active' ? ` · ${r.status}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.brand || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p ? money(p.basicSalary, p.currency) : <span className="text-amber-600 text-xs font-medium">Not set</span>}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{p ? money(allow, p.currency) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600">{p ? money(p.totalDeductions, p.currency) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{p ? money(p.net, p.currency) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditing(r)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Pencil className="h-3.5 w-3.5" />{p ? 'Edit' : 'Set pay'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No staff match your search</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <PayEditor row={editing} onClose={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['staff-pay'] }); setEditing(null); }} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
      <Icon className={cn('h-5 w-5 mb-2', tone)} />
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-xl font-bold mt-0.5 tabular-nums', tone)}>{value}</p>
    </div>
  );
}

function PayEditor({ row, onClose, onSaved }: { row: PayRow; onClose: () => void; onSaved: () => void }) {
  const p = row.pay;
  const [f, setF] = useState({
    currency: p?.currency || 'NGN', basicSalary: p ? String(p.basicSalary) : '',
    allowances: (p?.allowances?.length ? p.allowances : []) as Line[], deductions: (p?.deductions?.length ? p.deductions : []) as Line[],
    paymentMethod: p?.paymentMethod || 'Bank transfer', effectiveFrom: p?.effectiveFrom || '', notes: p?.notes || '',
  });
  const sum = (l: Line[]) => l.reduce((t, x) => t + (Number(x.amount) || 0), 0);
  const gross = (Number(f.basicSalary) || 0) + sum(f.allowances);
  const net = gross - sum(f.deductions);
  const save = useMutation({
    mutationFn: () => apiClient.put(`/erp/staff-pay/${row.id}`, { ...f, basicSalary: Number(f.basicSalary) || 0 }),
    onSuccess: () => { toast.success('Pay saved', `${row.firstName} ${row.lastName}: ${money(net, f.currency)} take-home`); onSaved(); },
    onError: (e: any) => toast.fromError(e, 'Could not save pay'),
  });
  const lines = (key: 'allowances' | 'deductions', suggestions: string[]) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{key === 'allowances' ? 'Allowances' : 'Deductions'}</p>
        <button onClick={() => setF({ ...f, [key]: [...f[key], { name: '', amount: '' }] })} className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button>
      </div>
      {!f[key].length && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => <button key={s} onClick={() => setF({ ...f, [key]: [...f[key], { name: s, amount: '' }] })} className="text-[11px] px-2 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:text-indigo-600 hover:border-indigo-400">+ {s}</button>)}
        </div>
      )}
      <div className="space-y-2">
        {f[key].map((l, i) => (
          <div key={i} className="flex gap-2">
            <input value={l.name} onChange={(e) => { const n = [...f[key]]; n[i] = { ...l, name: e.target.value }; setF({ ...f, [key]: n }); }} placeholder="Name" className={cn(inp, 'flex-1')} list={`${key}-list`} />
            <input value={l.amount} onChange={(e) => { const n = [...f[key]]; n[i] = { ...l, amount: e.target.value.replace(/[^\d.]/g, '') }; setF({ ...f, [key]: n }); }} placeholder="0.00" inputMode="decimal" className={cn(inp, 'w-32 text-right')} />
            <button onClick={() => setF({ ...f, [key]: f[key].filter((_, j) => j !== i) })} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <datalist id={`${key}-list`}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-start sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div><h2 className="font-semibold text-gray-900 dark:text-white">Pay for {row.firstName} {row.lastName}</h2><p className="text-xs text-gray-500">{row.position || row.jobTitle || ''}{row.brand ? ` · ${row.brand}` : ''}</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Basic monthly salary
              <input value={f.basicSalary} onChange={(e) => setF({ ...f, basicSalary: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" placeholder="0.00" className={cn(inp, 'mt-1 text-right text-base')} />
            </label>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Currency
              <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} className={cn(inp, 'mt-1')}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
          </div>
          {lines('allowances', ALLOWANCE_SUGGESTIONS)}
          {lines('deductions', DEDUCTION_SUGGESTIONS)}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Paid by
              <select value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })} className={cn(inp, 'mt-1')}>{['Bank transfer', 'Cash', 'Cheque'].map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Effective from
              <input type="date" value={f.effectiveFrom || ''} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} className={cn(inp, 'mt-1')} />
            </label>
          </div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Notes
            <textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={cn(inp, 'mt-1')} placeholder="e.g. Increment approved by CEO in October" />
          </label>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 grid grid-cols-3 text-center text-sm">
            <div><p className="text-xs text-gray-500">Gross</p><p className="font-semibold tabular-nums">{money(gross, f.currency)}</p></div>
            <div><p className="text-xs text-gray-500">Deductions</p><p className="font-semibold tabular-nums text-red-600">{money(sum(f.deductions), f.currency)}</p></div>
            <div><p className="text-xs text-gray-500">Take-home</p><p className="font-bold tabular-nums text-emerald-600">{money(net, f.currency)}</p></div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending || !(Number(f.basicSalary) > 0) || net < 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save pay
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
