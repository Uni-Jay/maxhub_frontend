import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Download, LogIn, ShieldAlert, Users, Activity, Search, RefreshCw, X, ChevronLeft, ChevronRight, Loader2, Monitor, Globe } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

const ACTIONS = ['All', 'Login', 'Login failed', 'Logout', 'Create', 'Update', 'Delete', 'Approve', 'Reject', 'Send', 'Password reset'];
const MODULES = ['All', 'Auth', 'Staff', 'HR', 'Leave', 'Payroll', 'Brands', 'Customer reports', 'Tasks', 'Projects', 'School', 'Files', 'Calendar', 'Settings'];

const TONE: Record<string, string> = {
  Login: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  'Login code sent': 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  'Login failed': 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  Logout: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Create: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  Update: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
  Delete: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  Approve: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  Reject: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('All');
  const [mod, setMod] = useState('All');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const LIMIT = 25;

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['audit-logs', page, action, mod, search, startDate, endDate],
    queryFn: () => apiClient.getRaw('/audit-logs', {
      page, limit: LIMIT,
      ...(action !== 'All' && { action }), ...(mod !== 'All' && { module: mod }),
      ...(search && { search }), ...(startDate && { startDate }), ...(endDate && { endDate }),
    }),
    placeholderData: (p) => p,
    refetchInterval: 30_000,
  });
  const logs: any[] = (data as any)?.data || [];
  const pg = (data as any)?.pagination || { total: 0, totalPages: 1 };
  const last = (data as any)?.last24h || {};

  const exportCSV = useCallback(() => {
    const head = ['Time', 'Person', 'Email', 'Action', 'Area', 'What happened', 'IP address', 'Device', 'Result'];
    const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = logs.map((l) => [format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss'), l.userName, l.userEmail, l.action, l.module, l.description, l.ipAddress, l.device, l.status].map(cell).join(','));
    const blob = new Blob([[head.map(cell).join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `maxhub-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
  }, [logs]);

  const reset = () => { setAction('All'); setMod('All'); setSearch(''); setStartDate(''); setEndDate(''); setPage(1); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Who signed in, from where, and every change made in MaxHub.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />Refresh
          </button>
          <button onClick={exportCSV} disabled={!logs.length} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
            <Download className="h-4 w-4" />Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={LogIn} label="Sign-ins (24h)" value={last.logins} tone="text-emerald-600" onClick={() => { reset(); setAction('Login'); }} />
        <Stat icon={Users} label="People signed in (24h)" value={last.people} tone="text-indigo-600" />
        <Stat icon={ShieldAlert} label="Failed sign-ins (24h)" value={last.failed} tone={last.failed ? 'text-red-600' : 'text-gray-500'} onClick={() => { reset(); setAction('Login failed'); }} />
        <Stat icon={Activity} label="Changes (24h)" value={last.changes} tone="text-amber-600" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search person, email, IP or activity" className={cn(inp, 'pl-9 w-full')} />
          </div>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={inp}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</select>
          <select value={mod} onChange={(e) => { setMod(e.target.value); setPage(1); }} className={inp}>{MODULES.map((a) => <option key={a} value={a}>{a === 'All' ? 'All areas' : a}</option>)}</select>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className={inp} title="From" />
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className={inp} title="To" />
          {(action !== 'All' || mod !== 'All' || search || startDate || endDate) && <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-2">Clear</button>}
        </div>

        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-14" /> : error ? (
          <p className="p-10 text-center text-sm text-red-600">{(error as any)?.response?.data?.message || 'Could not load the audit log'}</p>
        ) : !logs.length ? (
          <p className="p-10 text-center text-sm text-gray-400">No activity matches these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-[11px] uppercase tracking-wider text-gray-500">
                <tr><th className="text-left px-4 py-3">When</th><th className="text-left px-4 py-3">Person</th><th className="text-left px-4 py-3">Action</th><th className="text-left px-4 py-3">What happened</th><th className="text-left px-4 py-3">Where from</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((l) => (
                  <tr key={l.id} onClick={() => setSelected(l)} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-900 dark:text-white">{format(new Date(l.createdAt), 'd MMM, HH:mm')}</p>
                      <p className="text-[11px] text-gray-400">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{l.userName}</p>
                      <p className="text-[11px] text-gray-500">{l.userEmail || ''}</p>
                    </td>
                    <td className="px-4 py-3"><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', TONE[l.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}>{l.action}</span><p className="text-[11px] text-gray-400 mt-1">{l.module}</p></td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-md"><p className="line-clamp-2">{l.description}</p></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      <p className="flex items-center gap-1"><Globe className="h-3 w-3" />{l.ipAddress || '—'}</p>
                      {l.device && <p className="flex items-center gap-1 mt-0.5"><Monitor className="h-3 w-3" />{l.device}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
          <span>{pg.total.toLocaleString()} entries</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span>Page {page} of {pg.totalPages}</span>
            <button disabled={page >= pg.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md h-full overflow-y-auto bg-white dark:bg-gray-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">Activity details</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            <dl className="p-5 space-y-3 text-sm">
              {[
                ['When', format(new Date(selected.createdAt), 'EEEE d MMMM yyyy, HH:mm:ss')],
                ['Person', `${selected.userName}${selected.userEmail ? ` (${selected.userEmail})` : ''}`],
                ['Action', selected.action], ['Area', selected.module], ['Record', selected.resource],
                ['What happened', selected.description], ['Result', selected.status],
                ['IP address', selected.ipAddress], ['Device', selected.device], ['Browser details', selected.userAgent],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}><dt className="text-[11px] uppercase tracking-wide text-gray-400">{k}</dt><dd className="text-gray-900 dark:text-white break-words">{v as string}</dd></div>
              ))}
              {selected.details && (
                <div><dt className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Changes</dt>
                  <dd><pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">{typeof selected.details === 'string' ? selected.details : JSON.stringify(selected.details, null, 2)}</pre></dd></div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white';

function Stat({ icon: Icon, label, value, tone, onClick }: { icon: any; label: string; value?: number; tone: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 enabled:hover:border-gray-300">
      <Icon className={cn('h-5 w-5 mb-2', tone)} />
      <p className={cn('text-2xl font-bold tabular-nums', tone)}>{value ?? 0}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </button>
  );
}
