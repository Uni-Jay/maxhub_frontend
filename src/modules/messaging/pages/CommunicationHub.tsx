import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Video, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuthStore } from '@store/authStore';
import { useCalls } from '@components/calls/CallProvider';
import { cn } from '@utils/cn';

const MessagingPage = lazy(() => import('./MessagingPage'));
const VideoCallHub = lazy(() => import('@modules/videocall/pages/VideoCallHub'));

/** One place for chats, scheduled meetings and call history. */
export default function CommunicationHub() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'meetings' ? 'meetings' : params.get('tab') === 'calls' ? 'calls' : 'chats';
  const go = (t: string) => {
    const p = new URLSearchParams(params);
    if (t === 'chats') p.delete('tab'); else { p.set('tab', t); p.delete('c'); }
    setParams(p, { replace: true });
  };
  const tabs = [
    { key: 'chats', label: 'Chats', icon: MessageSquare },
    { key: 'meetings', label: 'Meetings', icon: Video },
    { key: 'calls', label: 'Call history', icon: PhoneCall },
  ];
  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/70 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => go(t.key)}
            className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition',
              tab === t.key ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-700 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" />}>
        {tab === 'chats' ? <MessagingPage /> : tab === 'meetings' ? <VideoCallHub /> : <CallHistory />}
      </Suspense>
    </div>
  );
}

function CallHistory() {
  const me = useAuthStore((s) => s.user?.id);
  const { startCall } = useCalls();
  const { data = [], isLoading } = useQuery({ queryKey: ['call-history'], queryFn: () => apiClient.get<any[]>('/messages/calls', { limit: 50 }) });
  const fmt = (s?: number) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : '');
  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto my-10" />;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-800">
      {!data.length && <p className="p-8 text-center text-sm text-gray-500">No calls yet. Start one from any chat with the phone or camera icon.</p>}
      {data.map((c: any) => {
        const outgoing = String(c.callerUserId) === String(me);
        const other = outgoing ? c.callee : c.caller;
        const name = other ? `${other.firstName} ${other.lastName}` : 'Unknown';
        const missed = !outgoing && ['Missed', 'Declined'].includes(c.status);
        const Icon = missed ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;
        return (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <Icon className={cn('h-5 w-5', missed ? 'text-red-500' : 'text-emerald-500')} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', missed ? 'text-red-600' : 'text-gray-900 dark:text-white')}>{name}</p>
              <p className="text-xs text-gray-500">{c.callType} · {c.status}{c.durationSeconds ? ` · ${fmt(c.durationSeconds)}` : ''} · {new Date(c.createdAt).toLocaleString()}</p>
            </div>
            {other && <>
              <button title="Voice call" onClick={() => startCall({ userIds: [Number(other.id)], callType: 'Voice' })} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><PhoneCall className="h-4 w-4" /></button>
              <button title="Video call" onClick={() => startCall({ userIds: [Number(other.id)], callType: 'Video' })} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><Video className="h-4 w-4" /></button>
            </>}
          </div>
        );
      })}
    </div>
  );
}
