import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@utils/cn';

/** Live clock + date, meant to sit in a dashboard header next to the greeting/refresh button. */
export default function DashboardClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn('flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700', className)}>
      <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
      </div>
    </div>
  );
}
