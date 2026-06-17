import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Users,
  Trash2,
  AlignLeft,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addDays,
  parseISO,
} from 'date-fns';
import { apiClient } from '@services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType = 'Meeting' | 'Leave' | 'Holiday' | 'Birthday' | 'Deadline' | 'Training';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: EventType;
  description?: string;
  attendees?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EVENT_TYPE_STYLES: Record<EventType, { pill: string; dot: string; badge: string }> = {
  Meeting:  { pill: 'bg-indigo-100 text-indigo-700',  dot: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Leave:    { pill: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  Holiday:  { pill: 'bg-red-100 text-red-700',        dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' },
  Birthday: { pill: 'bg-green-100 text-green-700',    dot: 'bg-green-500',   badge: 'bg-green-50 text-green-700 border-green-200' },
  Deadline: { pill: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  Training: { pill: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const EVENT_TYPES: EventType[] = ['Meeting', 'Leave', 'Holiday', 'Birthday', 'Deadline', 'Training'];


const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const INIT_FORM = { title: '', date: '', endDate: '', type: 'Meeting' as EventType, description: '', attendees: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr: string) {
  const d = parseISO(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return format(d, 'MMM d');
  return format(d, 'MMM d');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(INIT_FORM);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch user-created events
  const { data: eventsData } = useQuery({
    queryKey: ['calendar-events', format(monthStart, 'yyyy-MM'), format(monthEnd, 'yyyy-MM')],
    queryFn: () => apiClient.get<CalendarEvent[]>('/calendar/events', {
      start: format(monthStart, 'yyyy-MM-dd'),
      end: format(monthEnd, 'yyyy-MM-dd'),
    }).catch(() => [] as CalendarEvent[]),
    placeholderData: (prev) => prev,
  });

  // Fetch public holidays from DB
  const { data: holidaysData } = useQuery({
    queryKey: ['calendar-holidays', new Date().getFullYear()],
    queryFn: () => apiClient.get<any[]>('/calendar/holidays').catch(() => [] as any[]),
    staleTime: 1000 * 60 * 60,
  });

  const rawHolidays: CalendarEvent[] = (Array.isArray(holidaysData) ? holidaysData : []).map((h: any) => ({
    id: String(h.id ?? h.uuid ?? `hol-${h.holidayDate}`),
    title: h.holidayName ?? h.name ?? 'Holiday',
    date: (h.holidayDate ?? h.date ?? '').slice(0, 10),
    type: 'Holiday' as EventType,
    description: h.description ?? '',
  })).filter(h => h.date);

  const userEvents: CalendarEvent[] = Array.isArray(eventsData) ? eventsData : [];
  const events: CalendarEvent[] = [...userEvents, ...rawHolidays];

  // Create event
  const createMutation = useMutation({
    mutationFn: (payload: typeof INIT_FORM) => apiClient.post('/calendar/events', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowAddModal(false);
      setForm(INIT_FORM);
    },
  });

  // Delete event
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/calendar/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events'] });
      setSelectedEvent(null);
    },
  });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [monthStart, monthEnd]);

  // Events grouped by date string
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const key = e.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  // Upcoming events (next 14 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const future = addDays(today, 14);
    return events
      .filter((e) => {
        const d = parseISO(e.date);
        return d >= today && d <= future;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [events]);

  const prevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const nextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToday   = () => setCurrentDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage events, meetings and holidays</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Today
          </button>
          <button
            onClick={() => { setForm({ ...INIT_FORM, date: format(new Date(), 'yyyy-MM-dd') }); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[key] ?? [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDay = isToday(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const visibleEvents = dayEvents.slice(0, 3);
              const hiddenCount = dayEvents.length - 3;

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] p-1.5 border-b border-r border-gray-100 dark:border-gray-700/50 last:border-r-0
                    ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/30' : isWeekend ? 'bg-gray-50/30 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}
                  `}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition
                        ${isTodayDay ? 'bg-indigo-600 text-white' : isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {visibleEvents.map((ev) => {
                      const style = EVENT_TYPE_STYLES[ev.type] ?? EVENT_TYPE_STYLES.Meeting;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${style.pill} hover:opacity-80 transition`}
                        >
                          {ev.title}
                        </button>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">+{hiddenCount} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar — Upcoming */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Event Types</h3>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${EVENT_TYPE_STYLES[t].dot}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Upcoming (14 days)</h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => {
                  const style = EVENT_TYPE_STYLES[ev.type] ?? EVENT_TYPE_STYLES.Meeting;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full text-left flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{ev.title}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{relativeTime(ev.date)}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${style.badge}`}>
                        {ev.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add New Event</h2>
                <button onClick={() => { setShowAddModal(false); setForm(INIT_FORM); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Title *">
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Event title"
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date *">
                    <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="End Date">
                    <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
                <Field label="Event Type">
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))} className={inputCls}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Description">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description..."
                    className={inputCls}
                  />
                </Field>
                <Field label="Attendees">
                  <input
                    value={form.attendees}
                    onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
                    placeholder="Email addresses, comma separated"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => { setShowAddModal(false); setForm(INIT_FORM); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition">
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending || !form.title || !form.date}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {createMutation.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Create Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${EVENT_TYPE_STYLES[selectedEvent.type].badge}`}>
                      {selectedEvent.type}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{selectedEvent.title}</h2>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ml-2">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>
                      {format(parseISO(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
                      {selectedEvent.endDate && ` → ${format(parseISO(selectedEvent.endDate), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                  {selectedEvent.attendees && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{selectedEvent.attendees}</span>
                    </div>
                  )}
                  {selectedEvent.description && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <AlignLeft className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{selectedEvent.description}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => setSelectedEvent(null)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition">
                    Close
                  </button>
                  {selectedEvent.type !== 'Holiday' && (
                    <button
                      onClick={() => deleteMutation.mutate(selectedEvent.id)}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
const inputCls =
  'w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  );
}
