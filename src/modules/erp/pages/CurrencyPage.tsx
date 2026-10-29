import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Loader2, RefreshCw, Save } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { money } from '@services/erpService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

const NAMES: Record<string, string> = {
  NGN: 'Nigerian naira', USD: 'US dollar', GBP: 'British pound', EUR: 'Euro', CAD: 'Canadian dollar', AED: 'UAE dirham', QAR: 'Qatari riyal', SAR: 'Saudi riyal',
  GHS: 'Ghanaian cedi', ZAR: 'South African rand', CNY: 'Chinese yuan', KES: 'Kenyan shilling',
};
const ngn = (n: any) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** Exchange rates, money held in each currency and its naira value. */
export default function CurrencyPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['fx'], queryFn: () => apiClient.get<any>('/erp/fx') });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [conv, setConv] = useState({ amount: '100', from: 'USD', to: 'NGN' });

  useEffect(() => { if (data) setEdits({}); }, [data]);

  const save = useMutation({
    mutationFn: () => apiClient.put('/erp/fx', { rates: Object.fromEntries(Object.entries(edits).map(([k, v]) => [k, v === '' ? null : Number(v)])) }),
    onSuccess: () => { toast.success('Rates saved', 'Foreign payments without a naira value were updated.'); qc.invalidateQueries({ queryKey: ['fx'] }); },
    onError: (e: any) => toast.fromError(e, 'Could not save rates'),
  });
  const refresh = useMutation({
    mutationFn: () => apiClient.post('/erp/fx/refresh', {}),
    onSuccess: () => { toast.success('Market rates updated'); qc.invalidateQueries({ queryKey: ['fx'] }); },
    onError: (e: any) => toast.fromError(e, 'Could not refresh rates'),
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-16" />;
  if (error || !data) return <p className="text-center text-sm text-red-600 py-16">{(error as any)?.message || 'Could not load currencies'}</p>;

  const rateOf = (c: string) => (c === 'NGN' ? 1 : Number(data.rates.find((r: any) => r.currency === c)?.rate || 0));
  const result = rateOf(conv.from) && rateOf(conv.to) ? (Number(conv.amount || 0) * rateOf(conv.from)) / rateOf(conv.to) : null;
  const totalToday = (data.balances || []).reduce((t: number, b: any) => t + Number(b.ngnToday || 0), 0);
  const all = ['NGN', ...data.rates.map((r: any) => r.currency)];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Currencies & Rates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Money received in other currencies is counted in naira at the rate on the day it came in.</p>
        </div>
        {data.canManage && (
          <button onClick={() => refresh.mutate()} disabled={refresh.isPending} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw className={cn('h-4 w-4', refresh.isPending && 'animate-spin')} />Get today's market rates
          </button>
        )}
      </div>

      {!!data.balances?.length && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">What we have received, by currency</h2>
            <p className="text-sm text-gray-500">All of it is worth <b className="text-gray-900 dark:text-white">{ngn(totalToday)}</b> at today's rates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-[11px] uppercase tracking-wider text-gray-500">
                <tr><th className="text-left px-5 py-3">Currency</th><th className="text-right px-5 py-3">Received</th><th className="text-right px-5 py-3">This month</th><th className="text-right px-5 py-3">Naira when received</th><th className="text-right px-5 py-3">Naira today</th><th className="text-right px-5 py-3">Gain / loss</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.balances.map((b: any) => {
                  const diff = b.ngnToday != null && b.currency !== 'NGN' ? b.ngnToday - b.ngnWhenReceived : null;
                  return (
                    <tr key={b.currency}>
                      <td className="px-5 py-3"><p className="font-semibold text-gray-900 dark:text-white">{b.currency}</p><p className="text-xs text-gray-500">{NAMES[b.currency] || ''} · {b.count} receipt{b.count === 1 ? '' : 's'}</p></td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">{money(b.total, b.currency)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{money(b.thisMonth, b.currency)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{ngn(b.ngnWhenReceived)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{b.ngnToday != null ? ngn(b.ngnToday) : <span className="text-amber-600 text-xs">Set a rate</span>}</td>
                      <td className={cn('px-5 py-3 text-right tabular-nums text-xs font-medium', diff == null ? 'text-gray-400' : diff >= 0 ? 'text-emerald-600' : 'text-red-600')}>{diff == null ? '—' : `${diff >= 0 ? '+' : '−'}${ngn(Math.abs(diff))}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Exchange rates (naira for 1 unit)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Market rates {data.updatedAt ? `updated ${new Date(data.updatedAt).toLocaleString('en-GB')}` : 'not loaded yet'}.
              {data.manualUpdatedAt && ` Our own rates last set by ${data.manualBy} on ${new Date(data.manualUpdatedAt).toLocaleDateString('en-GB')}.`} Our rate, when set, is the one used.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-[11px] uppercase tracking-wider text-gray-500">
              <tr><th className="text-left px-5 py-2.5">Currency</th><th className="text-right px-5 py-2.5">Market</th><th className="text-right px-5 py-2.5 w-44">Our rate</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.rates.map((r: any) => (
                <tr key={r.currency}>
                  <td className="px-5 py-2.5"><span className="font-semibold text-gray-900 dark:text-white">{r.currency}</span> <span className="text-xs text-gray-500">{NAMES[r.currency]}</span></td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">{r.market ? ngn(r.market) : '—'}</td>
                  <td className="px-5 py-2.5 text-right">
                    {data.canManage ? (
                      <input inputMode="decimal" placeholder={r.market ? String(r.market) : 'Not set'} value={edits[r.currency] ?? (r.manual ?? '')}
                        onChange={(e) => setEdits({ ...edits, [r.currency]: e.target.value.replace(/[^\d.]/g, '') })}
                        className="w-32 text-right px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm tabular-nums text-gray-900 dark:text-white" />
                    ) : <span className="tabular-nums">{r.manual ? ngn(r.manual) : '—'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.canManage && Object.keys(edits).length > 0 && (
            <div className="flex justify-end px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => save.mutate()} disabled={save.isPending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save rates
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />Convert</h2>
            <div className="flex gap-2">
              <input value={conv.amount} onChange={(e) => setConv({ ...conv, amount: e.target.value.replace(/[^\d.]/g, '') })} className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white" />
              <select value={conv.from} onChange={(e) => setConv({ ...conv, from: e.target.value })} className="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white">{all.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-500">to</span>
              <select value={conv.to} onChange={(e) => setConv({ ...conv, to: e.target.value })} className="px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white">{all.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{result == null ? 'No rate yet' : money(result, conv.to)}</p>
          </div>

          {!!data.recent?.length && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <h2 className="font-semibold text-gray-900 dark:text-white px-5 py-4 border-b border-gray-100 dark:border-gray-800">Recent foreign payments</h2>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
                {data.recent.map((p: any) => (
                  <li key={p.id} className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0"><p className="font-medium text-gray-900 dark:text-white truncate">{p.customerName}</p><p className="text-xs text-gray-500">{p.receiptNo} · {p.brand || ''} · {new Date(p.paidAt).toLocaleDateString('en-GB')}</p></div>
                    <div className="text-right"><p className="font-semibold tabular-nums">{money(p.amount, p.currency)}</p><p className="text-xs text-gray-500 tabular-nums">{p.amountNgn ? `${ngn(p.amountNgn)} @ ${Number(p.fxRate).toLocaleString()}` : 'no rate yet'}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
