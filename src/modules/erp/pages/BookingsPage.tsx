import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Phone, Mail, Video, MapPin, Loader2, Plus, Trash2, CheckCircle2, XCircle, UserX, ExternalLink, Globe } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { Drawer, Field, Pill, Empty, Tabs, Stat, inp, btnPrimary, btnGhost, btnDanger, card, fmtDate } from '@components/erp/Kit';

interface Booking { id: number; code: string; brand: string; service: string; mode: string; startAt: string; endAt: string; name: string; email: string; phone: string | null; notes: string | null; status: string; staffNotes: string | null; assignedToUserId: number | null; assignedName: string | null; mine: boolean; meta: any }
const BRANDS: Record<string, { name: string; hasPage: boolean }> = { VM: { name: 'VisaMax', hasPage: true }, KS: { name: 'Kurios SAT', hasPage: true }, BM: { name: 'BeadMax', hasPage: false }, MF: { name: 'Maxfood Farm', hasPage: false } };
const TONE: Record<string, 'blue' | 'green' | 'red' | 'gray' | 'amber'> = { Confirmed: 'blue', Completed: 'green', Cancelled: 'gray', 'No-show': 'red' };
const MODE_ICON: Record<string, any> = { 'In person': MapPin, 'Video call': Video, 'Phone call': Phone };
const timeOf = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayKey = (d: string) => new Date(d).toLocaleDateString('en-CA');

export default function BookingsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'upcoming' | 'past' | 'settings'>('upcoming');
  const [brand, setBrand] = useState('All');
  const q = useQuery({ queryKey: ['bookings'], queryFn: () => apiClient.get<{ bookings: Booking[]; canManage: Record<string, boolean> }>('/erp/bookings', { from: new Date(Date.now() - 90 * 86400_000).toISOString() }) });
  const all = q.data?.bookings || [];
  const now = Date.now();
  const list = all.filter((b) => (brand === 'All' || b.brand === brand) && (tab === 'upcoming' ? new Date(b.endAt).getTime() >= now - 3600_000 && b.status !== 'Cancelled' : new Date(b.endAt).getTime() < now - 3600_000 || b.status === 'Cancelled'));
  if (tab === 'past') list.reverse();
  const groups = useMemo(() => { const m = new Map<string, Booking[]>(); for (const b of list) { const k = dayKey(b.startAt); m.set(k, [...(m.get(k) || []), b]); } return [...m.entries()]; }, [list]);
  const openId = Number(params.get('open')) || null;
  const open = all.find((b) => b.id === openId) || null;
  const setOpen = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('open', String(id)); else p.delete('open'); setParams(p, { replace: true }); };
  const manageable = Object.entries(q.data?.canManage || {}).filter(([, v]) => v).map(([k]) => k);
  const today = all.filter((b) => dayKey(b.startAt) === dayKey(new Date().toISOString()) && b.status === 'Confirmed').length;
  const week = all.filter((b) => new Date(b.startAt).getTime() > now && new Date(b.startAt).getTime() < now + 7 * 86400_000 && b.status === 'Confirmed').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consultation Bookings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Clients book a free time on the brand websites. They get an email confirmation and a reminder the day before; you get a notification and a calendar entry.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={CalendarCheck} label="Today" value={today} />
        <Stat icon={CalendarCheck} label="Next 7 days" value={week} />
        <Stat icon={CheckCircle2} label="Completed (90 days)" value={all.filter((b) => b.status === 'Completed').length} tone="text-emerald-600" />
        <Stat icon={UserX} label="No-shows (90 days)" value={all.filter((b) => b.status === 'No-show').length} tone="text-red-600" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past & cancelled' }, ...(manageable.length ? [{ id: 'settings' as const, label: 'Booking settings' }] : [])]} />
        {tab !== 'settings' && <select className={cn(inp, 'w-auto ml-auto')} value={brand} onChange={(e) => setBrand(e.target.value)}><option value="All">All brands</option>{Object.entries(BRANDS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>}
      </div>
      {tab === 'settings' ? <SettingsTab brands={manageable} /> : (
        <div className="space-y-4">
          {q.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" /> : !groups.length ? (
            <div className={card}><Empty icon={CalendarCheck} title={tab === 'upcoming' ? 'No upcoming consultations' : 'Nothing here yet'} text="Bookings made on the VisaMax and Kurios SAT websites appear here." /></div>
          ) : groups.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <div className={cn(card, 'divide-y divide-gray-100 dark:divide-gray-800')}>
                {items.map((b) => {
                  const Icon = MODE_ICON[b.mode] || MapPin;
                  return (
                    <button key={b.id} onClick={() => setOpen(b.id)} className="w-full text-left flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="w-16 shrink-0"><p className="font-semibold tabular-nums">{timeOf(b.startAt)}</p><p className="text-[11px] text-gray-500">{Math.round((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000)} min</p></div>
                      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-[180px]"><p className="font-medium text-gray-900 dark:text-white">{b.name}</p><p className="text-xs text-gray-500">{BRANDS[b.brand]?.name} · {b.service} · {b.mode}{b.assignedName ? ` · with ${b.assignedName}` : ''}</p></div>
                      {b.mine && b.status === 'Confirmed' && <Pill tone="violet">Yours</Pill>}
                      <Pill tone={TONE[b.status] || 'gray'}>{b.status}</Pill>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <BookingDrawer b={open} canManage={!!q.data?.canManage?.[open.brand]} onClose={() => setOpen(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['bookings'] })} />}
    </div>
  );
}

function BookingDrawer({ b, canManage, onClose, onChanged }: { b: Booking; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const [notes, setNotes] = useState(b.staffNotes || '');
  const people = useQuery({ queryKey: ['erp-people'], queryFn: () => apiClient.get<any[]>('/erp/people'), enabled: canManage });
  const upd = useMutation({ mutationFn: (body: any) => apiClient.put(`/erp/bookings/${b.id}`, body), onSuccess: () => { toast.success('Booking updated'); onChanged(); }, onError: (e: any) => toast.fromError(e) });
  const Icon = MODE_ICON[b.mode] || MapPin;
  const future = new Date(b.startAt).getTime() > Date.now();
  return (
    <Drawer onClose={onClose} title={<div className="flex items-center gap-2 flex-wrap"><h2 className="font-semibold text-gray-900 dark:text-white">{b.name}</h2><Pill tone={TONE[b.status] || 'gray'}>{b.status}</Pill></div>}
      sub={<>{b.code} · {BRANDS[b.brand]?.name}</>}
      footer={b.status === 'Confirmed' ? <>
        {future && <button onClick={() => { if (confirm('Cancel this consultation? The client will be emailed.')) upd.mutate({ status: 'Cancelled' }); }} className={btnDanger}><XCircle className="h-4 w-4" />Cancel</button>}
        {!future && <button onClick={() => upd.mutate({ status: 'No-show' })} className={btnGhost}><UserX className="h-4 w-4" />Did not come</button>}
        <button onClick={() => upd.mutate({ status: 'Completed', staffNotes: notes })} className={btnPrimary}><CheckCircle2 className="h-4 w-4" />Mark as done</button>
      </> : undefined}>
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 space-y-1.5 text-sm">
        <p className="font-semibold">{b.service}</p>
        <p>{new Date(b.startAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} – {timeOf(b.endAt)}</p>
        <p className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><Icon className="h-4 w-4" />{b.mode}</p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><Mail className="h-4 w-4" />{b.email}</a>
        {b.phone && <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"><Phone className="h-4 w-4" />{b.phone}</a>}
        {b.phone && <a href={`https://wa.me/${b.phone.replace(/\D/g, '').replace(/^0/, '234')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline">WhatsApp</a>}
      </div>
      {b.notes && <div><p className="text-xs font-semibold text-gray-500 mb-1">What the client wrote</p><p className="text-sm whitespace-pre-wrap">{b.notes}</p></div>}
      {canManage && (
        <Field label="Consultant">
          <select className={inp} value={b.assignedToUserId ? String(b.assignedToUserId) : ''} onChange={(e) => upd.mutate({ assignedToUserId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Not assigned</option>{(people.data || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Notes after the consultation (staff only)">
        <textarea rows={4} className={inp} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed, documents needed, next steps…" />
        <button onClick={() => upd.mutate({ staffNotes: notes })} disabled={notes === (b.staffNotes || '')} className={cn(btnGhost, 'mt-2')}>Save notes</button>
      </Field>
      {b.meta?.cancelledBy && <p className="text-xs text-gray-500">Cancelled by {b.meta.cancelledBy} on {fmtDate(b.meta.cancelledAt)}</p>}
    </Drawer>
  );
}

const DAY_NAMES: Array<[string, string]> = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const MODES = ['In person', 'Video call', 'Phone call'];

function SettingsTab({ brands }: { brands: string[] }) {
  const [brand, setBrand] = useState(brands[0]);
  const q = useQuery({ queryKey: ['booking-settings', brand], queryFn: () => apiClient.get<any>(`/erp/booking-settings/${brand}`), enabled: !!brand });
  const people = useQuery({ queryKey: ['erp-people'], queryFn: () => apiClient.get<any[]>('/erp/people') });
  const [s, setS] = useState<any | null>(null);
  const [closed, setClosed] = useState('');
  useEffect(() => { if (q.data) setS(q.data); }, [q.data]);
  const save = useMutation({ mutationFn: () => apiClient.put(`/erp/booking-settings/${brand}`, s), onSuccess: () => { toast.success('Booking settings saved', s?.enabled ? 'The website shows these times now' : 'Online booking is turned off'); q.refetch(); }, onError: (e: any) => toast.fromError(e) });
  if (!s || q.isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-12" />;
  const setSvc = (i: number, patch: any) => setS({ ...s, services: s.services.map((x: any, k: number) => (k === i ? { ...x, ...patch } : x)) });
  const setHours = (d: string, w: any[]) => setS({ ...s, hours: { ...s.hours, [d]: w } });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {brands.map((b) => <button key={b} onClick={() => { setS(null); setBrand(b); }} className={cn('px-3 py-1.5 rounded-lg text-sm border', brand === b ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 font-semibold' : 'border-gray-200 dark:border-gray-700')}>{BRANDS[b]?.name}</button>)}
        {BRANDS[brand]?.hasPage && s.bookingPage && <a href={s.bookingPage} target="_blank" rel="noreferrer" className="ml-auto text-sm text-indigo-600 inline-flex items-center gap-1"><Globe className="h-4 w-4" />Open the booking page<ExternalLink className="h-3 w-3" /></a>}
      </div>
      <div className={cn(card, 'p-5 space-y-5')}>
        <label className="flex items-center gap-3"><input type="checkbox" checked={!!s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="h-4 w-4" /><span className="font-semibold">Clients can book online for {BRANDS[brand]?.name}</span></label>
        {!BRANDS[brand]?.hasPage && <p className="text-xs text-amber-700 -mt-3">This brand’s website does not have a booking page yet — turning this on only prepares MaxHub.</p>}
        <Field label="Message at the top of the booking page"><input className={inp} value={s.intro || ''} onChange={(e) => setS({ ...s, intro: e.target.value })} /></Field>
        <div>
          <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Services clients can book</p><button onClick={() => setS({ ...s, services: [...s.services, { name: '', minutes: 30, modes: ['In person'] }] })} className="text-xs text-indigo-600 flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add service</button></div>
          <div className="space-y-2">
            {s.services.map((x: any, i: number) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-2">
                <input className={cn(inp, 'flex-1 min-w-[180px]')} value={x.name} onChange={(e) => setSvc(i, { name: e.target.value })} placeholder="Service" />
                <select className={cn(inp, 'w-24')} value={x.minutes} onChange={(e) => setSvc(i, { minutes: Number(e.target.value) })}>{[15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
                {MODES.map((m) => <label key={m} className="text-xs inline-flex items-center gap-1"><input type="checkbox" checked={x.modes.includes(m)} onChange={(e) => setSvc(i, { modes: e.target.checked ? [...x.modes, m] : x.modes.filter((y: string) => y !== m) })} />{m}</label>)}
                <button onClick={() => setS({ ...s, services: s.services.filter((_: any, k: number) => k !== i) })} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Opening hours for bookings (Lagos time)</p>
          <div className="space-y-1.5">
            {DAY_NAMES.map(([d, label]) => {
              const w = s.hours?.[d] || [];
              return (
                <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="w-32 inline-flex items-center gap-2"><input type="checkbox" checked={w.length > 0} onChange={(e) => setHours(d, e.target.checked ? [{ from: '09:00', to: '17:00' }] : [])} />{label}</label>
                  {w.length ? w.map((x: any, k: number) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      <input type="time" className={cn(inp, 'w-28 py-1.5')} value={x.from} onChange={(e) => setHours(d, w.map((y: any, j: number) => (j === k ? { ...y, from: e.target.value } : y)))} />–
                      <input type="time" className={cn(inp, 'w-28 py-1.5')} value={x.to} onChange={(e) => setHours(d, w.map((y: any, j: number) => (j === k ? { ...y, to: e.target.value } : y)))} />
                    </span>
                  )) : <span className="text-gray-400">Closed</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Start times every"><select className={inp} value={s.slotMinutes} onChange={(e) => setS({ ...s, slotMinutes: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
          <Field label="Gap after each booking"><select className={inp} value={s.bufferMinutes} onChange={(e) => setS({ ...s, bufferMinutes: Number(e.target.value) })}>{[0, 5, 10, 15, 30].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
          <Field label="Book at least"><select className={inp} value={s.noticeHours} onChange={(e) => setS({ ...s, noticeHours: Number(e.target.value) })}>{[0, 1, 2, 3, 6, 12, 24, 48].map((m) => <option key={m} value={m}>{m} h ahead</option>)}</select></Field>
          <Field label="Book up to"><select className={inp} value={s.daysAhead} onChange={(e) => setS({ ...s, daysAhead: Number(e.target.value) })}>{[7, 14, 30, 60, 90].map((m) => <option key={m} value={m}>{m} days ahead</option>)}</select></Field>
          <Field label="Clients at the same time"><select className={inp} value={s.perSlot} onChange={(e) => setS({ ...s, perSlot: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Office address (in-person meetings)"><input className={inp} value={s.location || ''} onChange={(e) => setS({ ...s, location: e.target.value })} /></Field>
          <Field label="Note for video calls"><input className={inp} value={s.videoNote || ''} onChange={(e) => setS({ ...s, videoNote: e.target.value })} /></Field>
        </div>
        <Field label="Consultants who take bookings" hint="Bookings are shared between them. If none are chosen, the head of the brand gets them.">
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {(people.data || []).map((p: any) => {
              const on = (s.consultantUserIds || []).includes(p.id);
              return <button key={p.id} type="button" onClick={() => setS({ ...s, consultantUserIds: on ? s.consultantUserIds.filter((x: number) => x !== p.id) : [...(s.consultantUserIds || []), p.id] })} className={cn('text-xs px-2.5 py-1 rounded-full border', on ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-gray-700')}>{p.name}</button>;
            })}
          </div>
        </Field>
        <Field label="Closed dates" hint="Nigerian public holidays are closed automatically.">
          <div className="flex flex-wrap gap-1.5 mb-2">{(s.closedDates || []).map((d: string) => <span key={d} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 inline-flex items-center gap-1">{fmtDate(d)}<button onClick={() => setS({ ...s, closedDates: s.closedDates.filter((x: string) => x !== d) })}><XCircle className="h-3 w-3" /></button></span>)}</div>
          <div className="flex gap-2"><input type="date" className={cn(inp, 'w-44')} value={closed} onChange={(e) => setClosed(e.target.value)} /><button onClick={() => { if (closed) { setS({ ...s, closedDates: [...new Set([...(s.closedDates || []), closed])].sort() }); setClosed(''); } }} className={btnGhost}>Add</button></div>
        </Field>
        <div className="flex justify-end"><button onClick={() => save.mutate()} disabled={save.isPending || !s.canEdit} className={btnPrimary}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save settings</button></div>
      </div>
    </div>
  );
}
