import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, ChevronDown } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

interface Item { kind: string; title: string; detail?: string; date: string; overdue: boolean; url: string }

const KEY = 'maxhub-agenda-open';

function when(d: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(`${d}T00:00:00`);
  const diff = Math.round((t.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff} days ago`;
  if (diff < 7) return t.toLocaleDateString('en-GB', { weekday: 'long' });
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "Coming up" for a brand: appointments, deliveries, renewals, best-before dates and anything overdue. */
export function AgendaStrip({ brand }: { brand: string }) {
  const code = brand.split('-')[0].toUpperCase();
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } });
  const { data = [] } = useQuery({
    queryKey: ['agenda', code],
    queryFn: () => apiClient.get<Item[]>('/erp/agenda', { brand: code, days: 14 }),
    enabled: ['VM', 'KS', 'BM', 'MF'].includes(code),
    refetchInterval: 5 * 60_000,
  });
  if (!data.length) return null;
  const overdue = data.filter((i) => i.overdue).length;
  const toggle = () => { setOpen(!open); try { localStorage.setItem(KEY, open ? '0' : '1'); } catch { /* */ } };
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <button onClick={toggle} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <CalendarClock className="h-4 w-4 brand-text" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Coming up</span>
        <span className="text-xs text-gray-500">{data.length} item{data.length > 1 ? 's' : ''} in the next two weeks</span>
        {overdue > 0 && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{overdue} overdue</span>}
        <ChevronDown className={cn('h-4 w-4 text-gray-400 ml-auto transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
          {data.slice(0, 20).map((i, k) => (
            <Link key={k} to={i.url} className={cn('flex-shrink-0 w-56 rounded-xl border p-3 transition hover:shadow-sm',
              i.overdue ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-500/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')}>
              <p className={cn('text-[11px] font-semibold uppercase tracking-wide', i.overdue ? 'text-red-600' : 'brand-text')}>{when(i.date)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{i.kind}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{i.title}</p>
              {i.detail && <p className="text-[11px] text-gray-500 truncate">{i.detail}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
