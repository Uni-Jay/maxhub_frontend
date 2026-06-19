import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video, Calendar, Plus, X, ExternalLink,
  BarChart2, Dot, Users2,
} from 'lucide-react';
import { videoCallService, type Meeting, type MeetingType } from '@services/videoCallService';
import { useCurrentRoles, useCurrentPermissions, hasPermission } from '@utils/role';

const MEETING_TYPES: MeetingType[] = ['Group', 'Department', 'Classroom', 'Interview', 'Training'];

/* ─── Main Page ───────────────────────────────────── */
type Tab = 'meetings' | 'analytics';

export default function VideoCallHub() {
  const qc = useQueryClient();
  const { roles } = useCurrentRoles();
  const permissions = useCurrentPermissions();
  const canSchedule = hasPermission(roles, permissions, 'meeting.create.all');

  const [activeTab, setActiveTab] = useState<Tab>('meetings');
  const [showScheduler, setShowScheduler] = useState(false);

  /* ─── Queries ──────────────────────────────── */
  const { data: meetingsRaw } = useQuery({
    queryKey: ['meetings', 'upcoming'],
    queryFn: () => videoCallService.getMeetings({ limit: 20 }),
  });

  const { data: analyticsRaw } = useQuery({
    queryKey: ['call-analytics'],
    queryFn: () => videoCallService.getAnalytics(),
    enabled: activeTab === 'analytics',
  });

  const meetings: Meeting[] = (meetingsRaw as any)?.data || [];
  const analytics = (analyticsRaw as any)?.data;

  const joinMutation = useMutation({
    mutationFn: (id: number) => videoCallService.joinMeeting(id),
    onSuccess: (res: any) => {
      const link = res?.meetingLink || res?.data?.meetingLink;
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
      qc.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => videoCallService.cancelMeeting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'meetings', label: 'Meetings', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  function fmt(sec: number) {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500">Scheduled via Google Meet — join links are emailed and shown below</p>
        </div>
        {canSchedule && (
          <button
            onClick={() => setShowScheduler(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Meetings Tab ─────────────────── */}
      {activeTab === 'meetings' && (
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No meetings scheduled</p>
              {canSchedule && (
                <button onClick={() => setShowScheduler(true)} className="text-indigo-600 text-sm mt-2 hover:underline">Schedule one</button>
              )}
            </div>
          ) : (
            meetings.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-100 rounded-xl"><Video className="h-5 w-5 text-indigo-600" /></div>
                  <div>
                    <p className="font-semibold text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.meetingType} · {m.meetingCode}</p>
                    {m.scheduledAt && (
                      <p className="text-xs text-indigo-600 mt-0.5">
                        {new Date(m.scheduledAt).toLocaleString()} · {m.durationMinutes || 60} min
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.status === 'Live' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                    {m.status === 'Live' && <Dot className="inline h-3 w-3" />}{m.status}
                  </span>
                  {(m.status === 'Scheduled' || m.status === 'Live') && (
                    <button onClick={() => joinMutation.mutate(m.id)}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
                      <ExternalLink className="h-3.5 w-3.5" /> Join
                    </button>
                  )}
                  {m.status === 'Scheduled' && canSchedule && (
                    <button onClick={() => cancelMutation.mutate(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── Analytics Tab ──────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Total Meetings', value: analytics.totalMeetings, color: 'from-violet-500 to-purple-600' },
                  { label: 'Total Duration', value: analytics.totalMeetingDurationSeconds ? fmt(analytics.totalMeetingDurationSeconds) : '0m', color: 'from-green-500 to-emerald-600' },
                  { label: 'Attendance Rate', value: analytics.attendanceRate ? `${analytics.attendanceRate.toFixed(0)}%` : '—', color: 'from-amber-500 to-orange-600' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white`}>
                    <p className="text-white/70 text-xs">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </motion.div>
                ))}
              </div>

              {analytics.byDepartment?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">By Department</h3>
                  <div className="space-y-2">
                    {analytics.byDepartment.map((d: any, i: number) => {
                      const max = Math.max(...analytics.byDepartment.map((x: any) => x.count));
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-28 text-xs text-gray-600 truncate">{d.department}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${(d.count / max) * 100}%` }}
                              className="h-full bg-indigo-400 rounded-full"
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-8 text-right">{d.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No analytics data yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── Schedule Modal ──────────────────── */}
      <AnimatePresence>
        {showScheduler && canSchedule && (
          <SchedulerModal
            onClose={() => setShowScheduler(false)}
            onCreated={() => { setShowScheduler(false); setActiveTab('meetings'); qc.invalidateQueries({ queryKey: ['meetings'] }); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Inline Scheduler Modal ──────────────────────── */
function SchedulerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', meetingType: 'Group' as MeetingType, meetingLink: '',
    scheduledAt: '', durationMinutes: 60,
    description: '', participantUserIds: '',
  });
  const [linkError, setLinkError] = useState('');

  const mutation = useMutation({
    mutationFn: () => videoCallService.scheduleMeeting({
      title: form.title,
      meetingType: form.meetingType,
      meetingLink: form.meetingLink.trim(),
      scheduledAt: form.scheduledAt || undefined,
      durationMinutes: Number(form.durationMinutes),
      description: form.description || undefined,
      participantUserIds: form.participantUserIds
        ? form.participantUserIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        : [],
    }),
    onSuccess: onCreated,
    onError: (err: any) => setLinkError(err?.message || 'Failed to schedule meeting'),
  });

  const googleMeetUrlPattern = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i;
  const linkLooksValid = googleMeetUrlPattern.test(form.meetingLink.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Schedule Meeting</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Meeting Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
            <label className="text-xs font-medium text-gray-700">Google Meet Link *</label>
            <input
              value={form.meetingLink}
              onChange={e => { setForm(f => ({ ...f, meetingLink: e.target.value })); setLinkError(''); }}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {form.meetingLink.trim() && !linkLooksValid && (
              <p className="text-xs text-red-600">Must be a meet.google.com link.</p>
            )}
            <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              <ExternalLink className="h-3 w-3" /> Create a new Google Meet, then paste the link here
            </a>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">Meeting Type</label>
            <select value={form.meetingType} onChange={e => setForm(f => ({ ...f, meetingType: e.target.value as MeetingType }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {MEETING_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700">Date & Time</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Duration (min)</label>
              <input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5" /> Participant User IDs (comma-separated)</label>
            <input value={form.participantUserIds} onChange={e => setForm(f => ({ ...f, participantUserIds: e.target.value }))} placeholder="e.g. 2, 5, 9" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-[11px] text-gray-400 mt-1">Everyone listed gets the Google Meet link sent to them automatically.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {linkError && <p className="text-xs text-red-600">{linkError}</p>}
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !linkLooksValid}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Calendar className="h-4 w-4" />}
            Schedule &amp; Send Link
          </button>
        </div>
      </motion.div>
    </div>
  );
}
