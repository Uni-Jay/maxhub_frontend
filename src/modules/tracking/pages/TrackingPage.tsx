import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CircleDot, Clock, ExternalLink, Loader2, Search, X, Ban, ListChecks } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useCurrentRoles } from '@utils/role';
import { Timeline } from '@components/tracking/Timeline';
import { cn } from '@utils/cn';

interface Item {
  type: string; id: number; title: string; context: string; status: string; done: boolean; blocked: boolean; overdue: boolean;
  priority?: string | null; progress: number | null; dueDate?: string | null; updatedAt: string; assigneeName?: string; assignedBy?: string; url: string;
}

const TYPE_LABEL: Record<string, string> = {
  task: 'Task', project: 'Project', travel_case: 'VisaMax customer', tech_project: 'ICT project', support_ticket: 'Support ticket',
  custom_order: 'BeadMax order', export_order: 'Maxfood order',
};
const FILTERS = [
  { key: 'open', label: 'In progress', icon: CircleDot },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { key: 'blocked', label: 'Blocked / on hold', icon: Ban },
  { key: 'done', label: 'Completed', icon: CheckCircle2 },
  { key: 'all', label: 'Everything', icon: ListChecks },
] as const;

/** One place to see where every assigned task, project and brand job stands. */
export default function TrackingPage() {
  const { roles } = useCurrentRoles();
  const manager = ['superadmin', 'admin', 'hr', 'hod'].some((r) => roles.has(r as any));
  const [mine, setMine] = useState(!manager);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('open');
  const [type, setType] = useState('all');
  const [person, setPerson] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Item | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking', mine],
    queryFn: () => apiClient.get<{ summary: any; items: Item[] }>('/erp/tracking', mine ? { mine: 1 } : undefined),
    refetchInterval: 60_000,
  });
  const items = data?.items || [];
  const people = useMemo(() => Array.from(new Set(items.map((i) => i.assigneeName).filter(Boolean) as string[])).sort(), [items]);
  const types = useMemo(() => Array.from(new Set(items.map((i) => i.type))), [items]);

  const shown = items.filter((i) =>
    (filter === 'all' || (filter === 'open' && !i.done) || (filter === 'overdue' && i.overdue) || (filter === 'blocked' && i.blocked && !i.done) || (filter === 'done' && i.done)) &&
    (type === 'all' || i.type === type) && (person === 'all' || i.assigneeName === person) &&
    `${i.title} ${i.context} ${i.assigneeName || ''}`.toLowerCase().includes(q.toLowerCase()),
  ).sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number(b.blocked) - Number(a.blocked) || String(b.updatedAt).localeCompare(String(a.updatedAt)));

  const s = data?.summary || { open: 0, overdue: 0, blocked: 0, done: 0, total: 0 };
  const count: Record<string, number> = { open: s.open, overdue: s.overdue, blocked: s.blocked, done: s.done, all: s.total };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Where every task, project and brand job assigned to {mine ? 'you' : 'your people'} stands — and what happened along the way.</p>
        </div>
        {manager && (
          <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm">
            <button onClick={() => setMine(false)} className={cn('px-3 py-1.5 rounded-lg font-medium', !mine ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>Everyone</button>
            <button onClick={() => setMine(true)} className={cn('px-3 py-1.5 rounded-lg font-medium', mine ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500')}>Assigned to me</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('text-left rounded-2xl border p-4 transition bg-white dark:bg-gray-900',
              filter === f.key ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300')}>
            <f.icon className={cn('h-5 w-5 mb-2', f.key === 'overdue' ? 'text-red-500' : f.key === 'blocked' ? 'text-amber-500' : f.key === 'done' ? 'text-emerald-500' : 'text-indigo-500')} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{count[f.key] ?? 0}</p>
            <p className="text-xs text-gray-500">{f.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white">
            <option value="all">All kinds</option>{types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>)}
          </select>
          {!mine && (
            <select value={person} onChange={(e) => setPerson(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white">
              <option value="all">Everyone</option>{people.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
        </div>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : error ? (
          <p className="p-8 text-center text-sm text-red-600">{(error as any)?.message || 'Could not load tracking'}</p>
        ) : !shown.length ? (
          <p className="p-10 text-center text-sm text-gray-400">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {shown.map((i) => (
              <li key={`${i.type}-${i.id}`}>
                <button onClick={() => setOpen(i)} className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{TYPE_LABEL[i.type] || i.type}</span>
                      {i.overdue && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-500/10">Overdue</span>}
                      {i.blocked && !i.done && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10">{i.status}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{i.title}</p>
                    <p className="text-xs text-gray-500 truncate">{i.context}{i.assigneeName ? ` · ${i.assigneeName}` : ''}{i.assignedBy ? ` · from ${i.assignedBy}` : ''}</p>
                  </div>
                  <div className="w-40 hidden md:block">
                    {i.progress != null ? (
                      <>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={cn('h-full rounded-full', i.done ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: `${Math.min(100, i.progress)}%` }} /></div>
                        <p className="text-[11px] text-gray-500 mt-1">{i.progress}% · {i.status}</p>
                      </>
                    ) : <p className="text-xs text-gray-600 dark:text-gray-300">{i.status}</p>}
                  </div>
                  <div className="w-28 text-right text-xs text-gray-500 flex-shrink-0">
                    {i.dueDate ? <span className={cn('flex items-center justify-end gap-1', i.overdue && 'text-red-600 font-medium')}><Clock className="h-3 w-3" />{new Date(i.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span> : <span>Updated {new Date(i.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setOpen(null)}>
          <div className="w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{TYPE_LABEL[open.type] || open.type} · {open.status}</p>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{open.title}</h2>
                <p className="text-xs text-gray-500">{open.assigneeName ? `Assigned to ${open.assigneeName}` : ''}{open.dueDate ? ` · due ${new Date(open.dueDate).toLocaleDateString('en-GB')}` : ''}</p>
              </div>
              <Link to={open.url} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Open"><ExternalLink className="h-4 w-4" /></Link>
              <button onClick={() => setOpen(null)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <Timeline entityType={open.type} entityId={open.id} progress={open.type === 'task' || open.type === 'project' ? (open.progress ?? 0) : undefined} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
