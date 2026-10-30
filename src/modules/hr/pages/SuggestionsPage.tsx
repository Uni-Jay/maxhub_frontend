import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, ThumbsUp, Plus, Loader2, ShieldCheck, Trash2, Reply, EyeOff, Eye } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Modal, Field, Pill, Empty, inp, btnPrimary, btnGhost, btnDanger, card, fmtDate } from '@components/erp/Kit';

interface Sug { id: number; code: string; category: string; title: string; body: string; status: string; isPublic: boolean; reply: string | null; repliedByName: string | null; repliedAt: string | null; createdAt: string; votes: number; iVoted: boolean }
const TONE: Record<string, 'gray' | 'blue' | 'violet' | 'green' | 'amber'> = { New: 'gray', 'Under review': 'blue', Planned: 'violet', Done: 'green', 'Not now': 'amber' };

export default function SuggestionsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['suggestions'], queryFn: () => apiClient.get<{ suggestions: Sug[]; categories: string[]; canManage: boolean }>('/erp/suggestions') });
  const [writing, setWriting] = useState(false);
  const [filter, setFilter] = useState('All');
  const d = q.data;
  const list = (d?.suggestions || []).filter((s) => filter === 'All' || (filter === 'Waiting' ? s.status === 'New' : filter === 'On the board' ? s.isPublic : s.status === filter));
  const openId = Number(params.get('open')) || null;
  const open = d?.suggestions.find((s) => s.id === openId) || null;
  const setOpen = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };
  const vote = useMutation({ mutationFn: (id: number) => apiClient.post(`/erp/suggestions/${id}/vote`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['suggestions'] }) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suggestion Box</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Share an idea or a concern — anonymously. {d?.canManage ? 'You see every suggestion; choose which to answer on the board.' : 'Management answers on the board below.'}</p>
        </div>
        <button onClick={() => setWriting(true)} className={btnPrimary}><Plus className="h-4 w-4" />Make a suggestion</button>
      </div>

      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900 p-4 flex gap-3 text-sm text-emerald-900 dark:text-emerald-200">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <p><b>Your name is never saved.</b> MaxHub stores only what you write — not who wrote it — so nobody, including management, can see who sent a suggestion. Votes are counted without recording who voted.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['All', ...(d?.canManage ? ['Waiting', 'On the board'] : []), 'Under review', 'Planned', 'Done'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-sm', filter === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300')}>{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !list.length ? (
          <div className={card}><Empty icon={Lightbulb} title={d?.canManage ? 'No suggestions here' : 'Nothing on the board yet'} text="Ideas that management answers appear here for everyone to see and support." /></div>
        ) : list.map((s) => (
          <div key={s.id} className={cn(card, 'p-4 flex gap-4')}>
            <button onClick={() => vote.mutate(s.id)} className={cn('flex flex-col items-center justify-center w-14 shrink-0 rounded-xl border py-2 transition', s.iVoted ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300')} title="I support this">
              <ThumbsUp className="h-4 w-4" /><span className="text-sm font-bold">{s.votes}</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-900 dark:text-white">{s.title}</p><Pill tone={TONE[s.status]}>{s.status}</Pill>{d?.canManage && !s.isPublic && <Pill tone="gray">Private</Pill>}</div>
              <p className="text-xs text-gray-500 mt-0.5">{s.category} · {fmtDate(s.createdAt)} · {s.code}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{s.body}</p>
              {s.reply && (
                <div className="mt-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-sm">
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1"><Reply className="h-3.5 w-3.5" />Reply from {s.repliedByName || 'management'} · {fmtDate(s.repliedAt)}</p>
                  <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{s.reply}</p>
                </div>
              )}
            </div>
            {d?.canManage && <button onClick={() => setOpen(s.id)} className={cn(btnGhost, 'self-start')}>Respond</button>}
          </div>
        ))}
      </div>

      {writing && d && <WriteModal categories={d.categories} onClose={() => setWriting(false)} onDone={() => { setWriting(false); qc.invalidateQueries({ queryKey: ['suggestions'] }); }} />}
      {open && d?.canManage && <RespondModal s={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); qc.invalidateQueries({ queryKey: ['suggestions'] }); }} />}
    </div>
  );
}

function WriteModal({ categories, onClose, onDone }: { categories: string[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ category: 'General', title: '', body: '' });
  const [sent, setSent] = useState<string | null>(null);
  const save = useMutation({ mutationFn: () => apiClient.post<{ code: string }>('/erp/suggestions', f), onSuccess: (d) => setSent(d.code), onError: (e: any) => toast.fromError(e) });
  if (sent) return (
    <Modal title="Sent anonymously" onClose={onDone} footer={<button onClick={onDone} className={btnPrimary}>Done</button>}>
      <p className="text-sm">Thank you. Your reference is <b className="font-mono">{sent}</b> — look for it on the board when management replies. Nobody can see that it came from you.</p>
    </Modal>
  );
  return (
    <Modal title="Make a suggestion" sub="Anonymous — your name is not saved" onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.title.trim() || f.body.trim().length < 10} className={btnPrimary}>Send anonymously</button></>}>
      <Field label="Topic"><select className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="In a few words"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. A water dispenser on the second floor" /></Field>
      <Field label="Tell us more" hint="Avoid details that would identify you if you want to stay anonymous."><textarea rows={5} className={inp} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
    </Modal>
  );
}

function RespondModal({ s, onClose, onDone }: { s: Sug; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ status: s.status, reply: s.reply || '', isPublic: s.isPublic });
  const save = useMutation({ mutationFn: () => apiClient.put(`/erp/suggestions/${s.id}`, f), onSuccess: () => { toast.success('Saved'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: () => apiClient.delete(`/erp/suggestions/${s.id}`), onSuccess: () => { toast.success('Deleted'); onDone(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Modal title={s.title} sub={`${s.category} · ${s.code}`} onClose={onClose}
      footer={<><button onClick={() => { if (confirm('Delete this suggestion?')) del.mutate(); }} className={btnDanger}><Trash2 className="h-4 w-4" /></button><span className="flex-1" /><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending} className={btnPrimary}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></>}>
      <p className="text-sm whitespace-pre-wrap rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">{s.body}</p>
      <Field label="Status"><select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['New', 'Under review', 'Planned', 'Done', 'Not now'].map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Your reply"><textarea rows={4} className={inp} value={f.reply} onChange={(e) => setF({ ...f, reply: e.target.value })} placeholder="What will happen, or why not now" /></Field>
      <label className="flex items-start gap-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer">
        <input type="checkbox" checked={f.isPublic} onChange={(e) => setF({ ...f, isPublic: e.target.checked })} className="mt-1" />
        <span>{f.isPublic ? <Eye className="inline h-4 w-4 mr-1" /> : <EyeOff className="inline h-4 w-4 mr-1" />}<b>Show on the board</b> — everyone can read it and your reply. Leave unticked for personal or sensitive matters.</span>
      </label>
    </Modal>
  );
}
