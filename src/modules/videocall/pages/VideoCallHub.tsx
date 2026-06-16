import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video, Phone, Users, Calendar, Mic,
  VideoOff, Maximize2, Minimize2, X, Plus, ExternalLink,
  BarChart2, History, Dot, PhoneIncoming, PhoneOutgoing, PhoneMissed,
} from 'lucide-react';
import { JitsiMeetComponent } from '../components/JitsiMeetComponent';
import { videoCallService, PERMANENT_ROOMS, type Meeting, type CallHistoryEntry } from '@services/videoCallService';
import { useAuthStore } from '@store/authStore';

/* ─── Room Card ───────────────────────────────────── */
const ROOM_COLORS: Record<string, string> = {
  indigo: 'from-indigo-500 to-indigo-700',
  blue: 'from-blue-500 to-blue-700',
  violet: 'from-violet-500 to-violet-700',
  green: 'from-green-500 to-green-700',
  amber: 'from-amber-500 to-amber-700',
  pink: 'from-pink-500 to-pink-700',
  rose: 'from-rose-500 to-rose-700',
  slate: 'from-slate-600 to-slate-800',
  teal: 'from-teal-500 to-teal-700',
  emerald: 'from-emerald-500 to-emerald-700',
};

function RoomCard({ room, onJoin }: { room: typeof PERMANENT_ROOMS[number]; onJoin: (id: string, name: string) => void }) {
  const gradient = ROOM_COLORS[room.color] || 'from-indigo-500 to-indigo-700';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white cursor-pointer shadow-md hover:shadow-xl transition-all`}
      onClick={() => onJoin(room.id, room.name)}
    >
      <div className="text-3xl mb-3">{room.icon}</div>
      <h3 className="font-bold text-base mb-1">{room.name}</h3>
      <p className="text-white/70 text-xs mb-4">{room.description}</p>
      <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors">
        <Video className="h-3.5 w-3.5" /> Join Now
      </button>
    </motion.div>
  );
}

/* ─── In-Call Overlay ─────────────────────────────── */
function InCallOverlay({
  roomName, roomTitle, onClose,
}: { roomName: string; roomTitle: string; onClose: () => void }) {
  const [minimized, setMinimized] = useState(false);
  const { mutate: leaveMeeting } = useMutation({ mutationFn: () => Promise.resolve() });

  const handleClose = () => { leaveMeeting(); onClose(); };

  if (minimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50 bg-gray-900 rounded-2xl shadow-2xl p-3 flex items-center gap-3"
      >
        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
          <Video className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <p className="text-white text-xs font-medium">Live: {roomTitle}</p>
        </div>
        <button onClick={() => setMinimized(false)} className="p-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleClose} className="p-1.5 bg-red-600 rounded-lg text-white hover:bg-red-700">
          <VideoOff className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ width: '92vw', maxWidth: 1200, height: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
            <div>
              <p className="text-white font-semibold">{roomTitle}</p>
              <p className="text-gray-400 text-xs">Room: {roomName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://meet.jit.si/${roomName}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Pop out
            </a>
            <button onClick={() => setMinimized(true)} className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={handleClose} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              <VideoOff className="h-4 w-4" /> End
            </button>
          </div>
        </div>

        {/* Jitsi - All features unlocked */}
        <div className="flex-1 overflow-hidden">
          <JitsiMeetComponent
            roomName={roomName}
            subject={roomTitle}
            isHost
            onReadyToClose={handleClose}
          />
        </div>

        <div className="bg-gray-800 border-t border-gray-700 px-5 py-1.5 text-center">
          <p className="text-xs text-gray-500">
            Screen sharing · Camera · Mic · Whiteboard · Recording · Breakout rooms · Background blur — all available inside
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────── */
type Tab = 'rooms' | 'meetings' | 'history' | 'analytics';

export default function VideoCallHub() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const currentUserId = (user as any)?.id;

  const [activeTab, setActiveTab] = useState<Tab>('rooms');
  const [activeCall, setActiveCall] = useState<{ roomName: string; title: string } | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);

  /* ─── Queries ──────────────────────────────── */
  const { data: meetingsRaw } = useQuery({
    queryKey: ['meetings', 'upcoming'],
    queryFn: () => videoCallService.getMeetings({ status: 'Scheduled', limit: 10 }),
    enabled: activeTab === 'meetings',
  });

  const { data: historyRaw } = useQuery({
    queryKey: ['call-history'],
    queryFn: () => videoCallService.getCallHistory({ limit: 20 }),
    enabled: activeTab === 'history',
  });

  const { data: analyticsRaw } = useQuery({
    queryKey: ['call-analytics'],
    queryFn: () => videoCallService.getAnalytics(),
    enabled: activeTab === 'analytics',
  });

  const meetings: Meeting[] = (meetingsRaw as any)?.data || [];
  const history: CallHistoryEntry[] = (historyRaw as any)?.data || [];
  const analytics = (analyticsRaw as any)?.data;

  const handleJoinRoom = useCallback((roomId: string, roomTitle: string) => {
    setActiveCall({ roomName: roomId, title: roomTitle });
  }, []);

  const cancelMutation = useMutation({
    mutationFn: (id: number) => videoCallService.cancelMeeting(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'rooms', label: 'Meeting Rooms', icon: Video },
    { id: 'meetings', label: 'Scheduled', icon: Calendar },
    { id: 'history', label: 'Call History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  function fmt(sec: number) {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  }

  function callIcon(entry: CallHistoryEntry) {
    if (entry.status === 'Missed') return <PhoneMissed className="h-4 w-4 text-red-500" />;
    if (entry.callerUserId === currentUserId) return <PhoneOutgoing className="h-4 w-4 text-indigo-500" />;
    return <PhoneIncoming className="h-4 w-4 text-green-500" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video & Voice Calls</h1>
          <p className="text-sm text-gray-500">Meetings, rooms, and call history</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { handleJoinRoom(`MaxHub-QuickCall-${currentUserId}-${Date.now()}`, 'Quick Meeting'); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 text-sm font-medium"
          >
            <Video className="h-4 w-4" /> Quick Meet
          </button>
          <button
            onClick={() => setShowScheduler(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Schedule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Rooms Tab ─────────────────────── */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Permanent Meeting Rooms</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{PERMANENT_ROOMS.length} rooms</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {PERMANENT_ROOMS.map(room => (
              <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
            ))}
          </div>

          <div className="mt-6">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Start — One Click</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Video Call', icon: Video, color: 'bg-indigo-600', action: () => handleJoinRoom(`MaxHub-Video-${currentUserId}-${Date.now()}`, 'Personal Video Call') },
                { label: 'Voice Call', icon: Mic, color: 'bg-green-600', action: () => handleJoinRoom(`MaxHub-Voice-${currentUserId}-${Date.now()}`, 'Personal Voice Call') },
                { label: 'Team Meeting', icon: Users, color: 'bg-violet-600', action: () => handleJoinRoom(`MaxHub-Team-${Date.now()}`, 'Team Meeting') },
              ].map(q => {
                const Icon = q.icon;
                return (
                  <button key={q.label} onClick={q.action}
                    className={`${q.color} text-white rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity`}>
                    <div className="p-2.5 bg-white/20 rounded-lg"><Icon className="h-5 w-5" /></div>
                    <div className="text-left">
                      <p className="font-semibold">{q.label}</p>
                      <p className="text-white/70 text-xs">Start instantly</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Features callout */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5">
            <h3 className="font-semibold text-indigo-900 mb-3">All Features Available Inside Every Room</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['🖥️ Screen Sharing', 'Share screen, app, or tab'],
                ['📹 Camera Controls', 'On/off, quality, switch'],
                ['✨ Virtual Background', 'Blur or custom background'],
                ['📝 Whiteboard', 'Collaborative drawing & notes'],
                ['💬 In-Meeting Chat', 'Text, emoji, file sharing'],
                ['⏺️ Recording', 'Record and save sessions'],
                ['🚪 Breakout Rooms', 'Split into sub-groups'],
                ['✋ Raise Hand', 'Polls, reactions, hand raise'],
                ['🔒 Host Controls', 'Mute all, remove, lock room'],
                ['👥 Participants', 'Panel with all attendees'],
                ['📊 AI Summaries', 'Auto meeting notes (Beta)'],
                ['📅 Calendar Sync', 'Google / Outlook links'],
              ].map(([title, desc]) => (
                <div key={title} className="bg-white rounded-xl p-3 border border-indigo-50">
                  <p className="text-sm font-medium text-gray-900">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Scheduled Tab ─────────────────── */}
      {activeTab === 'meetings' && (
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No scheduled meetings</p>
              <button onClick={() => setShowScheduler(true)} className="text-indigo-600 text-sm mt-2 hover:underline">Schedule one</button>
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
                    <button onClick={() => handleJoinRoom(m.roomName, m.title)}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700">
                      <Video className="h-3.5 w-3.5" /> Join
                    </button>
                  )}
                  {m.status === 'Scheduled' && (
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

      {/* ── Call History Tab ───────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No call history yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Type','With','Direction','Duration','Time','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((entry, i) => {
                  const isCaller = entry.callerUserId === currentUserId;
                  const other = isCaller ? entry.callee : entry.caller;
                  const otherName = other ? `${other.firstName} ${other.lastName}` : '—';
                  return (
                    <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          {entry.callType === 'Video' ? <Video className="h-3.5 w-3.5 text-indigo-500" /> : <Phone className="h-3.5 w-3.5 text-green-500" />}
                          {entry.callType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{otherName}</td>
                      <td className="px-4 py-3">{callIcon(entry)}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.durationSeconds ? fmt(entry.durationSeconds) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.status === 'Ended' ? 'bg-gray-100 text-gray-600' : entry.status === 'Missed' ? 'bg-red-100 text-red-700' : entry.status === 'Declined' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {entry.status}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Analytics Tab ──────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Calls', value: analytics.totalCalls, color: 'from-blue-500 to-indigo-600' },
                  { label: 'Total Meetings', value: analytics.totalMeetings, color: 'from-violet-500 to-purple-600' },
                  { label: 'Call Duration', value: analytics.totalCallDurationSeconds ? fmt(analytics.totalCallDurationSeconds) : '0m', color: 'from-green-500 to-emerald-600' },
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

      {/* ── In-Call Overlay ─────────────────── */}
      <AnimatePresence>
        {activeCall && (
          <InCallOverlay
            roomName={activeCall.roomName}
            roomTitle={activeCall.title}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Schedule Modal ──────────────────── */}
      <AnimatePresence>
        {showScheduler && (
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
    title: '', meetingType: 'Group' as const,
    scheduledAt: '', durationMinutes: 60,
    description: '', participantUserIds: '',
  });

  const mutation = useMutation({
    mutationFn: () => videoCallService.scheduleMeeting({
      title: form.title,
      meetingType: form.meetingType,
      scheduledAt: form.scheduledAt || undefined,
      durationMinutes: Number(form.durationMinutes),
      description: form.description || undefined,
      participantUserIds: form.participantUserIds
        ? form.participantUserIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        : [],
    }),
    onSuccess: onCreated,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Schedule Meeting</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700">Meeting Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Meeting Type</label>
            <select value={form.meetingType} onChange={e => setForm(f => ({ ...f, meetingType: e.target.value as any }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['OneToOne','Group','Department','Classroom','Interview','Training'].map(t => <option key={t}>{t}</option>)}
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
            <label className="text-xs font-medium text-gray-700">Participant IDs (comma-separated)</label>
            <input value={form.participantUserIds} onChange={e => setForm(f => ({ ...f, participantUserIds: e.target.value }))} placeholder="e.g. 2, 5, 9" className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Calendar className="h-4 w-4" />}
            Schedule
          </button>
        </div>
      </motion.div>
    </div>
  );
}
