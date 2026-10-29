import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; title: string; message?: string; action?: { label: string; onClick: () => void } }

interface ToastState { items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; dismiss: (id: number) => void }

let seq = 0;
const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items.slice(-4), { ...t, id }] }));
    window.setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), t.kind === 'error' ? 7000 : 4500);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

/** Pulls a readable message out of an axios / API error. */
export function errorMessage(err: any, fallback = 'Something went wrong'): string {
  return err?.response?.data?.message || err?.response?.data?.error?.message || err?.message || fallback;
}

export const toast = {
  success: (title: string, message?: string, action?: ToastItem['action']) => useToastStore.getState().push({ kind: 'success', title, message, action }),
  error: (title: string, message?: string) => useToastStore.getState().push({ kind: 'error', title, message }),
  info: (title: string, message?: string, action?: ToastItem['action']) => useToastStore.getState().push({ kind: 'info', title, message, action }),
  fromError: (err: any, title = 'Could not complete that') => useToastStore.getState().push({ kind: 'error', title, message: errorMessage(err) }),
};

const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONE = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-indigo-600 dark:text-indigo-400',
};

export function Toaster() {
  const { items, dismiss } = useToastStore();
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex gap-3 items-start bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3">
              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${TONE[t.kind]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.title}</p>
                {t.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">{t.message}</p>}
                {t.action && (
                  <button onClick={() => { t.action!.onClick(); dismiss(t.id); }} className="mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
