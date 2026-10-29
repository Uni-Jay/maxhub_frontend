import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Flag, GitCommitVertical, Loader2, MessageSquare, Send, TrendingUp, UserPlus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

const ICONS: Record<string, any> = {
  created: Flag, status: GitCommitVertical, progress: TrendingUp, assigned: UserPlus, edited: Pencil, due: CalendarClock,
  report: MessageSquare, update: MessageSquare, deleted: Trash2, StageChange: GitCommitVertical, Note: MessageSquare,
  Payment: CheckCircle2, Message: Send, Document: Flag,
};

function when(d: string) {
  const t = new Date(d);
  const diff = (Date.now() - t.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return t.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: t.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Step-by-step history of a task, project or brand record, with a box to post progress. */
export function Timeline({ entityType, entityId, progress, canUpdate = true, compact = false }: {
  entityType: string; entityId: number | string; progress?: number | null; canUpdate?: boolean; compact?: boolean;
}) {
  const qc = useQueryClient();
  const key = ['timeline', entityType, String(entityId)];
  const { data = [], isLoading } = useQuery({ queryKey: key, queryFn: () => apiClient.get<any[]>(`/erp/timeline/${entityType}/${entityId}`) });
  const [note, setNote] = useState('');
  const [pct, setPct] = useState<string>(progress != null ? String(progress) : '');
  const post = useMutation({
    mutationFn: () => apiClient.post(`/erp/timeline/${entityType}/${entityId}`, { note: note.trim(), progress: pct !== '' && Number(pct) !== Number(progress ?? -1) ? Number(pct) : undefined }),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['tracking'] });
      qc.invalidateQueries({ queryKey: ['task'] }); qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['project'] });
      toast.success('Update added');
    },
    onError: (e: any) => toast.fromError(e, 'Could not add the update'),
  });

  return (
    <div className="space-y-4">
      {canUpdate && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/60 dark:bg-gray-900/40">
          <textarea rows={compact ? 2 : 3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Post a progress update — what was done, what's next, anything blocking…"
            className="w-full text-sm bg-transparent resize-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400" />
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            {progress !== undefined && (
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-[180px]">
                Progress
                <input type="range" min={0} max={100} step={5} value={pct === '' ? 0 : Number(pct)} onChange={(e) => setPct(e.target.value)} className="flex-1 accent-indigo-600" />
                <span className="w-9 text-right font-semibold tabular-nums">{pct === '' ? 0 : pct}%</span>
              </label>
            )}
            <button onClick={() => post.mutate()} disabled={post.isPending || (!note.trim() && (pct === '' || Number(pct) === Number(progress ?? -1)))}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50">
              {post.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Post update
            </button>
          </div>
        </div>
      )}
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto my-6" /> : !data.length ? (
        <p className="text-sm text-gray-400 text-center py-6">No history yet — updates and changes will appear here.</p>
      ) : (
        <ol className="relative ml-3 border-l-2 border-gray-100 dark:border-gray-800 space-y-4">
          {[...data].reverse().map((a: any) => {
            const ev = a.meta?.event || a.kind;
            const Icon = ICONS[ev] || Circle;
            const done = /done|completed|delivered|approved|closed/i.test(a.content || '') && (ev === 'status' || a.kind === 'StageChange');
            return (
              <li key={a.id} className="ml-5">
                <span className={cn('absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900',
                  done ? 'bg-emerald-500 text-white' : ev === 'progress' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
                  <Icon className="h-3 w-3" />
                </span>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">{a.content}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{a.createdByName || 'System'} · {when(a.createdAt)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
