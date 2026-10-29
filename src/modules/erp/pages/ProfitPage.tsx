import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, Printer, TrendingDown, TrendingUp, Plus, Info } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ngn = (n: number) => `${n < 0 ? '−' : ''}₦${Math.abs(Math.round(n || 0)).toLocaleString('en-NG')}`;
const short = (n: number) => {
  const a = Math.abs(n); const s = n < 0 ? '−' : '';
  return a >= 1e9 ? `${s}₦${(a / 1e9).toFixed(1)}bn` : a >= 1e6 ? `${s}₦${(a / 1e6).toFixed(1)}m` : a >= 1e3 ? `${s}₦${Math.round(a / 1e3)}k` : `${s}₦${Math.round(a)}`;
};

function Change({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return null;
  if (!before) return <span className="text-[11px] text-gray-400">new this month</span>;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium', good ? 'text-emerald-600' : 'text-red-600')}>
      {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{pct >= 0 ? '+' : ''}{pct}% vs last month
    </span>
  );
}

/** Monthly profit & loss for every brand. */
export default function ProfitPage() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [share, setShare] = useState(false);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['profit', ym.y, ym.m, share],
    queryFn: () => apiClient.get<any>('/erp/profit', { year: ym.y, month: ym.m, share: share ? 1 : undefined }),
    placeholderData: (p) => p,
  });
  const move = (d: number) => setYm(({ y, m }) => { const t = new Date(y, m - 1 + d, 1); return { y: t.getFullYear(), m: t.getMonth() + 1 }; });
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth() + 1;

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-16" />;
  if (error || !data) return <p className="text-center text-sm text-red-600 py-16">{(error as any)?.message || 'Could not load profit & loss'}</p>;

  const prevOf = (code: string) => data.previous.brands.find((b: any) => b.code === code) || { income: 0, expenses: 0, profit: 0 };
  const maxAbs = Math.max(1, ...data.trend.flatMap((t: any) => [t.income, t.expenses]));
  const co = data.company;

  return (
    <div className="space-y-5" id="pl-print">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profit & Loss</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Money received and money spent by each brand, in naira.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button onClick={() => move(-1)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2 text-sm font-semibold text-gray-900 dark:text-white min-w-[130px] text-center flex items-center justify-center gap-2">{MONTHS[ym.m - 1]} {ym.y}{isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}</span>
            <button onClick={() => move(1)} disabled={isCurrent} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Link to="/finance/expenses" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"><Plus className="h-4 w-4" />Record expense</Link>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"><Printer className="h-4 w-4" />Print</button>
        </div>
      </div>

      {/* Company totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Money in', v: co.income, before: data.previous.company.income, tone: 'text-gray-900 dark:text-white' },
          { label: 'Money out', v: co.expenses, before: data.previous.company.expenses, tone: 'text-gray-900 dark:text-white', invert: true },
          { label: co.profit >= 0 ? 'Profit' : 'Loss', v: co.profit, before: data.previous.company.profit, tone: co.profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
        ].map((t) => (
          <div key={t.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500">{t.label} — all brands</p>
            <p className={cn('text-2xl font-bold tabular-nums mt-1', t.tone)}>{ngn(t.v)}</p>
            <Change now={t.v} before={t.before} invert={t.invert} />
          </div>
        ))}
      </div>

      {/* Per brand */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {data.brands.map((b: any) => {
          const prev = prevOf(b.code);
          const ins = data.insights?.[b.code] || [];
          return (
            <div key={b.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="h-1" style={{ background: b.color || '#4f46e5' }} />
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 mb-3">
                  {b.logoUrl && <img src={b.logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain bg-white ring-1 ring-gray-200" />}
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{b.name}</p>
                </div>
                <p className={cn('text-2xl font-bold tabular-nums', b.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{ngn(b.profit)}</p>
                <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2">{b.profit >= 0 ? 'profit' : 'loss'}{b.margin !== null && <span>· {b.margin}% margin</span>}<Change now={b.profit} before={prev.profit} /></p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between font-medium text-gray-900 dark:text-white"><dt>Money in</dt><dd className="tabular-nums">{ngn(b.income)}</dd></div>
                  {Object.entries(b.incomeLines).map(([k, v]) => <div key={k} className="flex justify-between text-xs text-gray-500 pl-3"><dt>{k}</dt><dd className="tabular-nums">{ngn(v as number)}</dd></div>)}
                  <div className="flex justify-between font-medium text-gray-900 dark:text-white pt-1.5"><dt>Money out</dt><dd className="tabular-nums">{ngn(b.expenses)}</dd></div>
                  {Object.entries(b.expenseLines).sort((a: any, c: any) => c[1] - a[1]).map(([k, v]) => <div key={k} className="flex justify-between text-xs text-gray-500 pl-3"><dt className="truncate pr-2">{k}</dt><dd className="tabular-nums">{ngn(v as number)}</dd></div>)}
                </dl>
                {ins.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2">
                    {ins.map((i: any) => (
                      <div key={i.label} className={cn(i.text && !i.value && 'col-span-2')}>
                        <p className="text-[11px] text-gray-500">{i.label}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={i.text}>{i.value ?? i.text}</p>
                        {i.hint && <p className="text-[11px] text-gray-400">{i.hint}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Head office */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold text-gray-900 dark:text-white">Head Office (not tied to one brand)</p>
          <p className="text-xs text-gray-500">{share ? 'Shared costs are split equally across the four brands above.' : `Costs ${ngn(data.headOffice.expenses)} · income ${ngn(data.headOffice.income)}`}{!share && Object.keys(data.headOffice.expenseLines).length > 0 && ` — ${Object.entries(data.headOffice.expenseLines).map(([k, v]) => `${k} ${ngn(v as number)}`).join(', ')}`}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="rounded text-indigo-600" />
          Share head-office costs across the brands
        </label>
      </div>

      {/* 12-month trend */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Last 12 months — all brands</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />Money in</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" />Money out</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-500" />Profit</span>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-48">
          {data.trend.map((t: any) => (
            <button key={`${t.year}-${t.month}`} onClick={() => setYm({ y: t.year, m: t.month })} title={`${MONTHS[t.month - 1]} ${t.year}: in ${ngn(t.income)}, out ${ngn(t.expenses)}, ${t.profit >= 0 ? 'profit' : 'loss'} ${ngn(t.profit)}`}
              className={cn('h-full flex flex-col justify-end items-center gap-1 group rounded-lg', t.year === ym.y && t.month === ym.m && 'bg-indigo-50/60 dark:bg-indigo-500/10')}>
              <span className={cn('text-[10px] tabular-nums font-medium', t.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{t.income || t.expenses ? short(t.profit) : ''}</span>
              <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                <div className="w-1/3 max-w-[14px] rounded-t bg-indigo-500 group-hover:bg-indigo-600" style={{ height: `${(t.income / maxAbs) * 100}%` }} />
                <div className="w-1/3 max-w-[14px] rounded-t bg-gray-300 dark:bg-gray-600" style={{ height: `${(t.expenses / maxAbs) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-500">{MONTHS[t.month - 1].slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 flex items-start gap-1.5"><Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        Money in = receipts issued in MaxHub, school fees and invoice payments (foreign currency at its naira value on the day). Money out = business expenses recorded here, the month's payroll for the staff each brand employs, and approved staff expense claims.
      </p>
    </div>
  );
}
