import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/images/maxhublogo.jpeg"
          alt="MaxHub"
          className="h-9 w-9 rounded-xl object-contain bg-white dark:bg-gray-800 p-0.5 shadow-sm border border-gray-100 dark:border-gray-700 flex-shrink-0"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
