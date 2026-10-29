import { useRef, useState, type ReactNode } from 'react';
import { X, Loader2, Paperclip, ExternalLink } from 'lucide-react';
import { uploadToCloudinary } from '@services/cloudinaryService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

/** Small shared building blocks for the purchase, recruitment, policy and training screens. */

export const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
export const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50';
export const btnPrimary = cn(btn, 'bg-indigo-600 hover:bg-indigo-700 text-white');
export const btnGhost = cn(btn, 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800');
export const btnDanger = cn(btn, 'border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950');
export const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl';

const SYM: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
export const money = (n: any, c = 'NGN', dp = 0) =>
  `${SYM[c] || `${c} `}${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
export const fmtDate = (d: any, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-GB', opts) : '—';
export const fmtDateTime = (d: any) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function Modal({ title, sub, onClose, children, footer, wide }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4" onClick={onClose}>
      <div className={cn('w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex flex-col max-h-[92vh]', wide ? 'max-w-2xl' : 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0"><h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>{sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-gray-800">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, sub, onClose, children, footer }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">{typeof title === 'string' ? <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2> : title}{sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-gray-800">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn('block text-xs font-semibold text-gray-700 dark:text-gray-300', className)}>
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {hint && <span className="block mt-1 text-[11px] font-normal text-gray-500">{hint}</span>}
    </label>
  );
}

export function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'indigo' | 'violet' }) {
  const T = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  };
  return <span className={cn('inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', T[tone])}>{children}</span>;
}

export function Stat({ label, value, tone, icon: Icon }: { label: string; value: ReactNode; tone?: string; icon?: any }) {
  return (
    <div className={cn(card, 'p-4')}>
      {Icon && <Icon className={cn('h-5 w-5 mb-2', tone || 'text-indigo-600')} />}
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-xl font-bold mt-0.5 tabular-nums', tone || 'text-gray-900 dark:text-white')}>{value}</p>
    </div>
  );
}

/** Upload a file (receipt, CV, certificate, policy) and get its link back. */
export function UploadLink({ value, onChange, label = 'Attach file', folder = 'maxhub-erp', accept }: { value?: string | null; onChange: (url: string | null) => void; label?: string; folder?: string; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input ref={ref} type="file" className="hidden" accept={accept} onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        setBusy(true);
        try { const r = await uploadToCloudinary(f, folder); onChange(r.url); } catch (err: any) { toast.error(err?.message || 'Upload failed'); } finally { setBusy(false); e.target.value = ''; }
      }} />
      <button type="button" onClick={() => ref.current?.click()} className={btnGhost} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}{value ? 'Replace file' : label}
      </button>
      {value && <a href={value} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">Open <ExternalLink className="h-3 w-3" /></a>}
      {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-500 hover:text-red-600">Remove</button>}
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: any; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-14 px-6">
      <Icon className="h-12 w-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
      <p className="font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {text && <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Array<{ id: T; label: string; count?: number }> }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/70 w-fit max-w-full overflow-x-auto">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} className={cn('px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition',
          value === t.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white')}>
          {t.label}{t.count ? <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
