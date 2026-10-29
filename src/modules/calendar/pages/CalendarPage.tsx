import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Users, Trash2, AlignLeft, Flag, PartyPopper, Pencil, Loader2 } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths, addDays, parseISO, differenceInCalendarDays,
} from 'date-fns';
import { toast } from '@components/ui/toaster';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { cn } from '@utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType = 'Meeting' | 'Leave' | 'Holiday' | 'Birthday' | 'Deadline' | 'Training' | 'Reminder' | 'Other';
type Kind = EventType | 'PublicHoliday' | 'Celebration';

interface CalItem {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  endDate?: string;
  kind: Kind;
  description?: string;
  attendees?: string;
  createdById?: number | string;
  editable: boolean;
}

const STYLES: Record<Kind, { pill: string; dot: string; label: string }> = {
  PublicHoliday: { pill: 'bg-emerald-600 text-white', dot: 'bg-emerald-600', label: 'Public holiday (Nigeria)' },
  Celebration: { pill: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', dot: 'bg-pink-500', label: 'Celebration' },
  Meeting: { pill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', dot: 'bg-indigo-500', label: 'Meeting' },
  Training: { pill: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500', label: 'Training' },
  Deadline: { pill: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', dot: 'bg-purple-500', label: 'Deadline' },
  Leave: { pill: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500', label: 'Leave' },
  Birthday: { pill: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500', label: 'Birthday' },
  Holiday: { pill: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', dot: 'bg-red-500', label: 'Company holiday' },
  Reminder: { pill: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200', dot: 'bg-gray-500', label: 'Reminder' },
  Other: { pill: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', dot: 'bg-teal-500', label: 'Other' },
};
const EVENT_TYPES: EventType[] = ['Meeting', 'Training', 'Deadline', 'Leave', 'Birthday', 'Holiday', 'Reminder', 'Other'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY = { id: '', title: '', date: '', endDate: '', type: 'Meeting' as EventType, description: '', attendees: '' };

const day = (s?: string | null) => (s ? String(s).slice(0, 10) : '');

export default function CalendarPage() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isManager = ['superadmin', 'admin', 'hr'].some((r) => JSON.stringify(me?.roles || '').toLowerCase().includes(r));
  const [current, setCurrent] = useState(new Date());
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [selected, setSelected] = useState<CalItem | null>(null);
  const [show, setShow] = useState({ holidays: true, celebrations: true });

  const gridStart = startOfWeek(startOfMonth(current));
  const gridEnd = endOfWeek(endOfMonth(current));
  const range = { start: format(gridStart, 'yyyy-MM-dd'), end: format(gridEnd, 'yyyy-MM-dd') };

  const eventsQ = useQuery({
    queryKey: ['calendar-events', range.start, range.end],
    queryFn: () => apiClient.get<any[]>('/calendar/events', range),
    placeholderData: (p) => p,
  });
  const allMineQ = useQuery({
    queryKey: ['calendar-events', 'all'],
    queryFn: () => apiClient.get<any[]>('/calendar/events'),
  });
  const obsQ = useQuery({
    queryKey: ['calendar-observances', range.start, range.end],
    queryFn: () => apiClient.get<any[]>('/calendar/observances', range),
    staleTime: 1000 * 60 * 60 * 12,
    placeholderData: (p) => p,
  });
  const holQ = useQuery({
    queryKey: ['calendar-holidays'],
    queryFn: () => apiClient.get<any[]>('/calendar/holidays').catch(() => []),
    staleTime: 1000 * 60 * 60,
  });

  const bdayQ = useQuery({
    queryKey: ['birthdays', 366],
    queryFn: () => apiClient.get<any[]>('/erp/birthdays', { days: 366 }).catch(() => []),
    staleTime: 1000 * 60 * 60,
  });

  const toItem = (e: any): CalItem => ({
    id: String(e.id), title: e.title, date: day(e.date), endDate: day(e.endDate) || undefined, kind: (e.type as EventType) || 'Other',
    description: e.description || '', attendees: e.attendees || '', createdById: e.createdById,
    editable: isManager || String(e.createdById) === String(me?.id),
  });

  const items: CalItem[] = useMemo(() => {
    const list: CalItem[] = (Array.isArray(eventsQ.data) ? eventsQ.data : []).map(toItem);
    const seen = new Set<string>();
    for (const o of Array.isArray(obsQ.data) ? obsQ.data : []) {
      const kind: Kind = o.kind === 'public-holiday' ? 'PublicHoliday' : 'Celebration';
      if (kind === 'PublicHoliday' && !show.holidays) continue;
      if (kind === 'Celebration' && !show.celebrations) continue;
      seen.add(`${o.date}|${o.name.toLowerCase().slice(0, 8)}`);
      list.push({ id: `obs-${o.date}-${o.name}`, title: o.name, date: o.date, kind, description: o.note, editable: false });
    }
    // Company holidays saved in MaxHub (skip ones the calendar already shows).
    for (const h of Array.isArray(holQ.data) ? holQ.data : []) {
      const d = day(h.holidayDate);
      if (!d || d < range.start || d > range.end) continue;
      const name = h.holidayName || 'Holiday';
      if (seen.has(`${d}|${name.toLowerCase().slice(0, 8)}`) || (h.holidayCode || '').startsWith('NG-')) continue;
      list.push({ id: `hol-${h.id}`, title: name, date: d, kind: 'Holiday', description: h.description, editable: false });
    }
    // Staff birthdays (shown for this year and next, so every month is covered).
    for (const b of Array.isArray(bdayQ.data) ? bdayQ.data : []) {
      for (const shift of [0, -1, 1]) {
        const y = Number(String(b.date).slice(0, 4)) + shift;
        const d = `${y}${String(b.date).slice(4)}`;
        if (d < range.start || d > range.end) continue;
        list.push({ id: `bday-${b.staffId}-${y}`, title: `🎂 ${b.name}`, date: d, kind: 'Birthday', description: [b.position, b.department].filter(Boolean).join(' · '), editable: false });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsQ.data, obsQ.data, holQ.data, bdayQ.data, show, range.start, range.end, me?.id]);

  const byDay = useMemo(() => {
    const map: Record<string, CalItem[]> = {};
    const order: Kind[] = ['PublicHoliday', 'Holiday', 'Meeting', 'Training', 'Deadline', 'Leave', 'Birthday', 'Reminder', 'Other', 'Celebration'];
    for (const it of items) {
      const start = parseISO(it.date);
      const span = it.endDate ? Math.min(62, Math.max(0, differenceInCalendarDays(parseISO(it.endDate), start))) : 0;
      for (let i = 0; i <= span; i++) {
        const k = format(addDays(start, i), 'yyyy-MM-dd');
        (map[k] ||= []).push(it);
      }
    }
    Object.values(map).forEach((l) => l.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)));
    return map;
  }, [items]);

  const upcoming = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const until = format(addDays(new Date(), 45), 'yyyy-MM-dd');
    return items.filter((e) => (e.endDate || e.date) >= today && e.date <= until).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  }, [items]);

  const myEvents = useMemo(() => (Array.isArray(allMineQ.data) ? allMineQ.data : [])
    .filter((e: any) => String(e.createdById) === String(me?.id)).map(toItem).sort((a: CalItem, b: CalItem) => b.date.localeCompare(a.date)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allMineQ.data, me?.id]);

  const save = useMutation({
    mutationFn: (f: typeof EMPTY) => {
      const body = { title: f.title.trim(), date: f.date, endDate: f.endDate || null, type: f.type, description: f.description, attendees: f.attendees };
      return f.id ? apiClient.put(`/calendar/events/${f.id}`, body) : apiClient.post('/calendar/events', body);
    },
    onSuccess: (_d, f) => {
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success(f.id ? 'Event updated' : 'Event added — it stays on the calendar until you delete it');
      setForm(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Could not save the event'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/calendar/events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); toast.success('Event deleted'); setSelected(null); },
    onError: (e: any) => toast.error(e?.message || 'Could not delete the event'),
  });

  const openNew = (d?: Date) => setForm({ ...EMPTY, date: format(d || new Date(), 'yyyy-MM-dd') });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your events, Nigerian public holidays and celebrations around the world</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(new Date())} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">Today</button>
          <button onClick={() => openNew()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" /> Add event
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5 items-start">
        <div className="flex-1 w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <button onClick={() => setCurrent((d) => subMonths(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous month"><ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" /></button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {format(current, 'MMMM yyyy')}
              {(eventsQ.isFetching || obsQ.isFetching) && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </h2>
            <button onClick={() => setCurrent((d) => addMonths(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next month"><ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" /></button>
          </div>
          {eventsQ.isError && <p className="px-5 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-500/10">Could not load your events. Check your connection and refresh.</p>}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
            {DAYS.map((d) => <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const k = format(d, 'yyyy-MM-dd');
              const list = byDay[k] || [];
              const inMonth = isSameMonth(d, current);
              const holiday = list.some((e) => e.kind === 'PublicHoliday');
              return (
                <div key={k} onDoubleClick={() => openNew(d)}
                  className={cn('min-h-[104px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800 [&:nth-child(7n)]:border-r-0',
                    !inMonth ? 'bg-gray-50/70 dark:bg-gray-950/40' : holiday ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : (d.getDay() === 0 || d.getDay() === 6) ? 'bg-gray-50/40 dark:bg-gray-900' : 'bg-white dark:bg-gray-900')}>
                  <div className="flex items-center justify-between mb-1 px-0.5">
                    <span className={cn('w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
                      isToday(d) ? 'bg-indigo-600 text-white' : inMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600')}>{format(d, 'd')}</span>
                    {inMonth && <button onClick={() => openNew(d)} className="opacity-0 hover:opacity-100 focus:opacity-100 p-0.5 rounded text-gray-400 hover:text-indigo-600" title="Add event on this day"><Plus className="h-3.5 w-3.5" /></button>}
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map((ev) => (
                      <button key={ev.id + k} onClick={() => setSelected(ev)} title={ev.title}
                        className={cn('w-full text-left text-[10.5px] leading-4 font-medium px-1.5 py-0.5 rounded truncate hover:opacity-85', STYLES[ev.kind]?.pill || STYLES.Other.pill)}>
                        {ev.title}
                      </button>
                    ))}
                    {list.length > 3 && (
                      <button onClick={() => setSelected({ ...list[3], id: `more-${k}`, title: `${list.length} items on ${format(d, 'd MMM')}`, description: list.map((e) => `• ${e.title}`).join('\n'), kind: 'Reminder', editable: false, date: k })}
                        className="text-[10px] text-gray-500 hover:text-indigo-600 pl-1">+{list.length - 3} more</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="w-full xl:w-80 flex-shrink-0 space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Show on calendar</h3>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
              <input type="checkbox" className="rounded text-emerald-600" checked={show.holidays} onChange={(e) => setShow((s) => ({ ...s, holidays: e.target.checked }))} />
              <Flag className="h-4 w-4 text-emerald-600" /> Nigerian public holidays
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" className="rounded text-pink-600" checked={show.celebrations} onChange={(e) => setShow((s) => ({ ...s, celebrations: e.target.checked }))} />
              <PartyPopper className="h-4 w-4 text-pink-500" /> Celebrations (Father's Day, Valentine's…)
            </label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              {EVENT_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"><span className={cn('w-2 h-2 rounded-full', STYLES[t].dot)} />{STYLES[t].label}</div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Coming up</h3>
            {upcoming.length === 0 ? <p className="text-xs text-gray-400 py-4 text-center">Nothing in the next few weeks</p> : (
              <ul className="space-y-1">
                {upcoming.map((ev) => (
                  <li key={ev.id}>
                    <button onClick={() => setSelected(ev)} className="w-full text-left flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="w-10 text-center flex-shrink-0">
                        <div className="text-[10px] uppercase text-gray-400">{format(parseISO(ev.date), 'MMM')}</div>
                        <div className="text-base font-bold text-gray-900 dark:text-white leading-5">{format(parseISO(ev.date), 'd')}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1"><span className={cn('w-1.5 h-1.5 rounded-full', STYLES[ev.kind]?.dot)} />{STYLES[ev.kind]?.label}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">My events</h3>
            <p className="text-[11px] text-gray-500 mb-3">Everything you added stays here until you delete it.</p>
            {myEvents.length === 0 ? <p className="text-xs text-gray-400 text-center py-3">You haven't added any events yet</p> : (
              <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {myEvents.map((ev: CalItem) => (
                  <li key={ev.id} className="flex items-center gap-2 group">
                    <button onClick={() => { setCurrent(parseISO(ev.date)); setSelected(ev); }} className="flex-1 min-w-0 text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{ev.title}</p>
                      <p className="text-[11px] text-gray-500">{format(parseISO(ev.date), 'EEE d MMM yyyy')}</p>
                    </button>
                    <button onClick={() => { if (confirm(`Delete "${ev.title}"?`)) remove.mutate(ev.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-start sm:items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{form.id ? 'Edit event' : 'New event'}</h2>
              <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Title *"><input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Quarterly review" className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date *"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></Field>
                <Field label="Ends (optional)"><input type="date" min={form.date} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })} className={inputCls}>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{STYLES[t].label}</option>)}
                </select>
              </Field>
              <Field label="Details"><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Agenda, location, link…" className={inputCls} /></Field>
              <Field label="People"><input value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="Names or emails, separated by commas" className={inputCls} /></Field>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">Cancel</button>
              <button onClick={() => save.mutate(form)} disabled={save.isPending || !form.title.trim() || !form.date || (!!form.endDate && form.endDate < form.date)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{form.id ? 'Save changes' : 'Add event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-start sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', STYLES[selected.kind]?.pill)}>{STYLES[selected.kind]?.label}</span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{selected.title}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ml-2"><X className="h-4 w-4 text-gray-500" /></button>
              </div>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />{format(parseISO(selected.date), 'EEEE, d MMMM yyyy')}{selected.endDate && selected.endDate !== selected.date && ` → ${format(parseISO(selected.endDate), 'd MMM yyyy')}`}</p>
                {selected.attendees && <p className="flex items-start gap-2"><Users className="h-4 w-4 text-gray-400 mt-0.5" />{selected.attendees}</p>}
                {selected.description && <p className="flex items-start gap-2 whitespace-pre-line"><AlignLeft className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />{selected.description}</p>}
              </div>
              {selected.editable && !selected.id.includes('-') && (
                <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setForm({ id: selected.id, title: selected.title, date: selected.date, endDate: selected.endDate || '', type: selected.kind as EventType, description: selected.description || '', attendees: selected.attendees || '' }); setSelected(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  <button onClick={() => { if (confirm(`Delete "${selected.title}"?`)) remove.mutate(selected.id); }} disabled={remove.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 rounded-xl disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>{children}</div>;
}
