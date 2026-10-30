import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpenCheck, Sparkles, Trash2, Send, Loader2, Users, CheckCircle2, Circle, CalendarClock, MapPin, ListChecks, Gavel, X } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Modal, Drawer, Field, Pill, Empty, inp, btnPrimary, btnGhost, btnDanger, card, fmtDate, fmtDateTime } from '@components/erp/Kit';

interface Person { userId: number; name: string }
interface Action { id: string; text: string; ownerUserId: number | null; ownerName: string | null; due: string | null; taskId: number | null; taskStatus?: string | null }
interface Minutes { id: number; code: string; title: string; heldAt: string; location: string | null; attendees: Person[]; apologies: Person[]; agenda: string | null; notes: string | null; decisions: string[]; actions: Action[]; nextMeetingAt: string | null; status: string; createdByName: string; canEdit: boolean; openActions: number; myActions: number; meetingId: number | null }

const newId = () => Math.random().toString(36).slice(2, 10);
const toLocal = (d?: string | null) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

export default function MinutesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['minutes'], queryFn: () => apiClient.get<Minutes[]>('/erp/minutes') });
  const [editing, setEditing] = useState<Partial<Minutes> | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const rows = (q.data || []).filter((m) => filter === 'all' || m.myActions > 0);
  const openId = Number(params.get('open')) || null;
  const open = (q.data || []).find((m) => m.id === openId) || null;
  const setOpen = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['minutes'] });
  const myOpen = (q.data || []).reduce((t, m) => t + m.myActions, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meeting Minutes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Record what was discussed and decided. When you share the minutes, each action point becomes a task for its owner.</p>
        </div>
        <button onClick={() => setEditing({ heldAt: new Date().toISOString(), attendees: [], apologies: [], decisions: [], actions: [] })} className={btnPrimary}><Plus className="h-4 w-4" />Write minutes</button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')} className={cn('px-3 py-1.5 rounded-lg text-sm', filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700')}>All meetings</button>
        <button onClick={() => setFilter('mine')} className={cn('px-3 py-1.5 rounded-lg text-sm', filter === 'mine' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700')}>My open action points ({myOpen})</button>
      </div>
      <div className={card}>
        {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !rows.length ? (
          <Empty icon={BookOpenCheck} title="No minutes yet" text="After a meeting, write quick notes — or paste rough notes and let AI tidy them into a summary, decisions and action points." />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((m) => (
              <button key={m.id} onClick={() => setOpen(m.id)} className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <BookOpenCheck className="h-5 w-5 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-[200px]"><p className="font-medium text-gray-900 dark:text-white">{m.title}</p><p className="text-xs text-gray-500">{fmtDateTime(m.heldAt)} · {m.attendees.length} attended · by {m.createdByName}</p></div>
                {m.actions.length > 0 && <span className="text-xs text-gray-600 dark:text-gray-400">{m.actions.length - m.openActions}/{m.actions.length} actions done</span>}
                {m.myActions > 0 && <Pill tone="violet">{m.myActions} for you</Pill>}
                <Pill tone={m.status === 'Shared' ? 'green' : 'gray'}>{m.status === 'Shared' ? 'Shared' : 'Draft'}</Pill>
              </button>
            ))}
          </div>
        )}
      </div>
      {open && <MinutesView m={open} onClose={() => setOpen(null)} onEdit={() => setEditing(open)} onChanged={refresh} />}
      {editing && <MinutesEditor m={editing} onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); refresh(); setOpen(id); }} />}
    </div>
  );
}

function MinutesView({ m, onClose, onEdit, onChanged }: { m: Minutes; onClose: () => void; onEdit: () => void; onChanged: () => void }) {
  const share = useMutation({ mutationFn: () => apiClient.post<any>(`/erp/minutes/${m.id}/share`, {}), onSuccess: () => { toast.success('Minutes shared', 'Action points are now tasks'); onChanged(); }, onError: (e: any) => toast.fromError(e) });
  const del = useMutation({ mutationFn: () => apiClient.delete(`/erp/minutes/${m.id}`), onSuccess: () => { toast.success('Deleted'); onChanged(); onClose(); }, onError: (e: any) => toast.fromError(e) });
  return (
    <Drawer onClose={onClose} title={<div className="flex items-center gap-2 flex-wrap"><h2 className="font-semibold text-gray-900 dark:text-white">{m.title}</h2><Pill tone={m.status === 'Shared' ? 'green' : 'gray'}>{m.status}</Pill></div>}
      sub={<>{m.code} · written by {m.createdByName}</>}
      footer={m.canEdit ? <>
        <button onClick={() => { if (confirm('Delete these minutes? Tasks already created stay.')) del.mutate(); }} className={btnDanger}><Trash2 className="h-4 w-4" /></button>
        <button onClick={onEdit} className={btnGhost}>Edit</button>
        {m.status !== 'Shared' && <button onClick={() => share.mutate()} disabled={share.isPending} className={btnPrimary}>{share.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Share & create tasks</button>}
      </> : undefined}>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{fmtDateTime(m.heldAt)}</span>
        {m.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{m.location}</span>}
      </div>
      <div className="text-sm"><p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1"><Users className="h-3.5 w-3.5" />Present</p><p>{m.attendees.map((a) => a.name).join(', ') || '—'}</p>
        {m.apologies.length > 0 && <p className="text-gray-500 mt-1">Apologies: {m.apologies.map((a) => a.name).join(', ')}</p>}</div>
      {m.agenda && <div><p className="text-xs font-semibold text-gray-500 mb-1">Agenda</p><p className="text-sm whitespace-pre-wrap">{m.agenda}</p></div>}
      {m.notes && <div><p className="text-xs font-semibold text-gray-500 mb-1">Discussion</p><p className="text-sm whitespace-pre-wrap leading-relaxed">{m.notes}</p></div>}
      {m.decisions.length > 0 && (
        <div><p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Gavel className="h-3.5 w-3.5" />Decisions</p>
          <ul className="space-y-1.5">{m.decisions.map((d, i) => <li key={i} className="text-sm flex gap-2"><span className="text-indigo-500">•</span>{d}</li>)}</ul></div>
      )}
      {m.actions.length > 0 && (
        <div><p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />Action points</p>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {m.actions.map((a) => {
              const done = a.taskStatus === 'Done';
              return (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                  {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" /> : <Circle className="h-4 w-4 text-gray-300 mt-0.5" />}
                  <div className="flex-1"><p className={cn(done && 'line-through text-gray-400')}>{a.text}</p><p className="text-xs text-gray-500">{a.ownerName || 'No owner'}{a.due ? ` · by ${fmtDate(a.due)}` : ''}{a.taskStatus ? ` · ${a.taskStatus}` : ''}</p></div>
                  {a.taskId && <Link to={`/tasks/${a.taskId}`} className="text-xs text-indigo-600 hover:underline">Task</Link>}
                </div>
              );
            })}
          </div>
          {m.status !== 'Shared' && <p className="text-xs text-gray-500 mt-1.5">These become tasks when you share the minutes.</p>}
        </div>
      )}
      {m.nextMeetingAt && <p className="text-sm text-gray-600 dark:text-gray-400">Next meeting: <b>{fmtDateTime(m.nextMeetingAt)}</b></p>}
    </Drawer>
  );
}

function PeoplePicker({ value, onChange, people, label }: { value: Person[]; onChange: (p: Person[]) => void; people: Person[]; label: string }) {
  const [q, setQ] = useState('');
  const chosen = new Set(value.map((p) => p.userId));
  const matches = q ? people.filter((p) => !chosen.has(p.userId) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 mb-1.5">{value.map((p) => <span key={p.userId} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">{p.name}<button type="button" onClick={() => onChange(value.filter((x) => x.userId !== p.userId))}><X className="h-3 w-3" /></button></span>)}</div>
      <div className="relative">
        <input className={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name to add" />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
            {matches.map((p) => <button key={p.userId} type="button" onClick={() => { onChange([...value, p]); setQ(''); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">{p.name}</button>)}
          </div>
        )}
      </div>
    </Field>
  );
}

function MinutesEditor({ m, onClose, onSaved }: { m: Partial<Minutes>; onClose: () => void; onSaved: (id: number) => void }) {
  const peopleQ = useQuery({ queryKey: ['erp-people'], queryFn: () => apiClient.get<any[]>('/erp/people') });
  const meetingsQ = useQuery({ queryKey: ['minutes-meetings'], queryFn: () => apiClient.get<any[]>('/erp/minutes/meetings') });
  const people: Person[] = useMemo(() => (peopleQ.data || []).map((p: any) => ({ userId: Number(p.id), name: p.name })), [peopleQ.data]);
  const [f, setF] = useState({
    title: m.title || '', heldAt: toLocal(m.heldAt), location: m.location || '', meetingId: m.meetingId ? String(m.meetingId) : '',
    attendees: (m.attendees || []) as Person[], apologies: (m.apologies || []) as Person[], agenda: m.agenda || '', notes: m.notes || '',
    decisions: (m.decisions || []) as string[], actions: (m.actions || []) as Action[], nextMeetingAt: toLocal(m.nextMeetingAt),
  });
  const tidy = useMutation({
    mutationFn: () => apiClient.post<{ notes: string; decisions: string[]; actions: Action[] }>('/erp/minutes/ai-tidy', { notes: f.notes, attendees: f.attendees }),
    onSuccess: (d) => { setF({ ...f, notes: d.notes || f.notes, decisions: [...f.decisions, ...d.decisions], actions: [...f.actions, ...d.actions] }); toast.success('Tidied', `${d.decisions.length} decisions and ${d.actions.length} action points found — check them`); },
    onError: (e: any) => toast.fromError(e, 'AI could not tidy the notes'),
  });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, heldAt: f.heldAt ? new Date(f.heldAt).toISOString() : null, nextMeetingAt: f.nextMeetingAt ? new Date(f.nextMeetingAt).toISOString() : null, meetingId: f.meetingId || null };
      return m.id ? apiClient.put<any>(`/erp/minutes/${m.id}`, body) : apiClient.post<any>('/erp/minutes', body);
    },
    onSuccess: (d: any) => { toast.success('Minutes saved'); onSaved(Number(d?.id ?? m.id)); },
    onError: (e: any) => toast.fromError(e),
  });
  const owners = f.attendees.length ? [...f.attendees, ...people.filter((p) => !f.attendees.some((a) => a.userId === p.userId))] : people;
  return (
    <Modal wide title={m.id ? 'Edit minutes' : 'Write minutes'} onClose={onClose}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={() => save.mutate()} disabled={save.isPending || !f.title.trim()} className={btnPrimary}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></>}>
      {!!meetingsQ.data?.length && !m.id && (
        <Field label="From a MaxHub meeting (optional)">
          <select className={inp} value={f.meetingId} onChange={(e) => {
            const mt = meetingsQ.data!.find((x: any) => String(x.id) === e.target.value);
            setF({ ...f, meetingId: e.target.value, ...(mt ? { title: f.title || mt.title, heldAt: toLocal(mt.scheduledAt), attendees: mt.people } : {}) });
          }}>
            <option value="">—</option>{meetingsQ.data!.map((x: any) => <option key={x.id} value={x.id}>{x.title} — {fmtDate(x.scheduledAt)}</option>)}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Meeting" className="sm:col-span-2"><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. VisaMax weekly team meeting" /></Field>
        <Field label="When"><input type="datetime-local" className={inp} value={f.heldAt} onChange={(e) => setF({ ...f, heldAt: e.target.value })} /></Field>
      </div>
      <Field label="Where"><input className={inp} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Board room / Video call" /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <PeoplePicker label="Present" value={f.attendees} onChange={(v) => setF({ ...f, attendees: v })} people={people} />
        <PeoplePicker label="Apologies (absent)" value={f.apologies} onChange={(v) => setF({ ...f, apologies: v })} people={people} />
      </div>
      <Field label="Agenda"><textarea rows={2} className={inp} value={f.agenda} onChange={(e) => setF({ ...f, agenda: e.target.value })} placeholder="1. …  2. …" /></Field>
      <Field label="Discussion / notes">
        <textarea rows={6} className={inp} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Type or paste rough notes — e.g. “agreed to open saturdays in nov. tolu to call the 12 uk clients by friday”" />
        <button type="button" onClick={() => tidy.mutate()} disabled={tidy.isPending || f.notes.trim().length < 20} className={cn(btnGhost, 'mt-2')}>{tidy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-indigo-600" />}Tidy with AI and find decisions & actions</button>
      </Field>
      <div>
        <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Decisions</p><button type="button" onClick={() => setF({ ...f, decisions: [...f.decisions, ''] })} className="text-xs text-indigo-600 flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button></div>
        <div className="space-y-2">{f.decisions.map((d, i) => (
          <div key={i} className="flex gap-2"><input className={inp} value={d} onChange={(e) => setF({ ...f, decisions: f.decisions.map((x, k) => (k === i ? e.target.value : x)) })} /><button type="button" onClick={() => setF({ ...f, decisions: f.decisions.filter((_, k) => k !== i) })} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
        ))}</div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5"><p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Action points</p><button type="button" onClick={() => setF({ ...f, actions: [...f.actions, { id: newId(), text: '', ownerUserId: null, ownerName: null, due: null, taskId: null }] })} className="text-xs text-indigo-600 flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button></div>
        <div className="space-y-2">{f.actions.map((a, i) => {
          const set = (patch: Partial<Action>) => setF({ ...f, actions: f.actions.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          return (
            <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_170px_140px_32px] gap-2 items-center">
              <input className={inp} value={a.text} onChange={(e) => set({ text: e.target.value })} placeholder="What needs doing" />
              <select className={inp} value={a.ownerUserId ? String(a.ownerUserId) : ''} onChange={(e) => { const p = owners.find((x) => String(x.userId) === e.target.value); set({ ownerUserId: p?.userId || null, ownerName: p?.name || null }); }}>
                <option value="">Owner…</option>{owners.map((p) => <option key={p.userId} value={p.userId}>{p.name}</option>)}
              </select>
              <input type="date" className={inp} value={a.due || ''} onChange={(e) => set({ due: e.target.value || null })} />
              <button type="button" disabled={!!a.taskId} title={a.taskId ? 'Already a task' : 'Remove'} onClick={() => setF({ ...f, actions: f.actions.filter((_, k) => k !== i) })} className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}</div>
      </div>
      <Field label="Next meeting (optional)"><input type="datetime-local" className={inp} value={f.nextMeetingAt} onChange={(e) => setF({ ...f, nextMeetingAt: e.target.value })} /></Field>
    </Modal>
  );
}
