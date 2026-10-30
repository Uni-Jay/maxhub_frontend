import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sun, CheckSquare, CalendarClock, ShieldCheck, ScrollText, Users, GraduationCap, ChevronRight, Bell, BellOff, Award } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

interface Item { kind: string; text: string; url: string; count?: number; urgent?: boolean }
const ICON: Record<string, any> = { tasks: CheckSquare, meeting: CalendarClock, interview: Users, booking: CalendarClock, approval: ShieldCheck, policy: ScrollText, review: Award, training: GraduationCap };
const TONE: Record<string, string> = {
  tasks: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10', meeting: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10', interview: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10',
  booking: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10', approval: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', policy: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
  birthday: 'text-pink-600 bg-pink-50 dark:bg-pink-500/10', review: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10', training: 'text-red-600 bg-red-50 dark:bg-red-500/10',
};

/** "Your day": tasks due, meetings, interviews, approvals and reminders — the same list sent each morning. */
export function TodayCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['daily-summary'], queryFn: () => apiClient.get<{ date: string; firstName: string | null; items: Item[]; morningMessage: boolean }>('/erp/daily-summary'), staleTime: 60_000, refetchInterval: 5 * 60_000 });
  const toggle = useMutation({
    mutationFn: (on: boolean) => apiClient.put('/erp/daily-summary/settings', { morningMessage: on }),
    onSuccess: (_d, on) => { toast.success(on ? 'Morning message on' : 'Morning message off', on ? 'You will get this list at 7:30 each working morning' : undefined); qc.invalidateQueries({ queryKey: ['daily-summary'] }); },
  });
  const d = q.data;
  if (!d) return null;
  const items = d.items.filter((i) => i.kind !== 'birthday');
  return (
    <div className="mb-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="h-5 w-5 text-amber-500" />
        <p className="font-semibold text-gray-900 dark:text-white flex-1">Your day{d.firstName ? `, ${d.firstName}` : ''}</p>
        <button onClick={() => toggle.mutate(!d.morningMessage)} title={d.morningMessage ? 'Turn off the 7:30 morning message' : 'Get this list every morning at 7:30'}
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 inline-flex items-center gap-1">
          {d.morningMessage ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}{d.morningMessage ? 'Morning message on' : 'Morning message off'}
        </button>
      </div>
      {!items.length ? (
        <p className="text-sm text-gray-500">Nothing urgent today — no tasks due, meetings or approvals waiting. 🎉</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((i, k) => {
            const Icon = ICON[i.kind] || CheckSquare;
            return (
              <Link key={k} to={i.url} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <span className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', TONE[i.kind] || TONE.tasks)}><Icon className="h-4 w-4" /></span>
                <span className={cn('flex-1 text-sm', i.urgent ? 'text-red-700 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300')}>{i.text}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
