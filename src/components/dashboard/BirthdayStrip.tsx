import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Cake, MessageSquare } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';

interface Birthday { staffId: number; name: string; position?: string; department?: string; date: string; daysAway: number }

/** Today's and this week's staff birthdays, shown at the top of every dashboard. */
export function BirthdayStrip() {
  const me = useAuthStore((s) => s.user);
  const { data = [] } = useQuery({
    queryKey: ['birthdays', 7],
    queryFn: () => apiClient.get<Birthday[]>('/erp/birthdays', { days: 7 }),
    staleTime: 30 * 60_000,
  });
  if (!data.length) return null;
  const today = data.filter((b) => b.daysAway === 0);
  const soon = data.filter((b) => b.daysAway > 0);
  const myName = `${(me as any)?.firstName || ''} ${(me as any)?.lastName || ''}`.trim().toLowerCase();
  const mine = today.some((b) => b.name.toLowerCase() === myName);

  return (
    <div className="mb-5 rounded-2xl border border-pink-200 dark:border-pink-900/50 bg-gradient-to-r from-pink-50 via-amber-50 to-white dark:from-pink-500/10 dark:via-amber-500/5 dark:to-gray-900 px-5 py-4 flex flex-wrap items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center text-xl" aria-hidden>🎂</div>
      <div className="flex-1 min-w-[220px]">
        {mine ? (
          <p className="font-semibold text-gray-900 dark:text-white">Happy birthday, {(me as any)?.firstName}! 🎉 The whole team is celebrating you today.</p>
        ) : today.length ? (
          <p className="font-semibold text-gray-900 dark:text-white">
            Today is {today.map((b) => b.name).join(' and ')}'s birthday{today.length > 1 ? 's' : ''} 🎉
          </p>
        ) : (
          <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />Birthdays this week</p>
        )}
        {soon.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Coming up: {soon.map((b) => `${b.name} (${new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })})`).join(' · ')}
          </p>
        )}
      </div>
      {today.length > 0 && !mine && (
        <Link to="/messages" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium">
          <MessageSquare className="h-4 w-4" />Send a wish
        </Link>
      )}
    </div>
  );
}
