import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, BellRing, Send, Loader2, Sun, Smartphone, ShieldAlert, Inbox, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { disablePush } from '@services/pushService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';
import { pushStatus, turnOnNotifications, UnblockSteps, IosInstallSteps, type PushStatus } from '@components/notifications/NotificationPrompt';

const card = 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5';
const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50';

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PushStatus>(() => pushStatus());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const sync = () => setStatus(pushStatus());
    window.addEventListener('focus', sync); window.addEventListener('maxhub-push-changed', sync);
    return () => { window.removeEventListener('focus', sync); window.removeEventListener('maxhub-push-changed', sync); };
  }, []);
  const test = useMutation({ mutationFn: () => apiClient.post('/erp/push/test', {}), onSuccess: () => toast.success('Test sent', 'Switch to another tab or app — the pop-up appears in a few seconds.'), onError: (e: any) => toast.fromError(e) });
  const summary = useQuery({ queryKey: ['daily-summary'], queryFn: () => apiClient.get<{ morningMessage: boolean }>('/erp/daily-summary') });
  const morning = useMutation({
    mutationFn: (on: boolean) => apiClient.put('/erp/daily-summary/settings', { morningMessage: on }),
    onSuccess: (_d, on) => { toast.success(on ? 'Morning message on' : 'Morning message off'); qc.invalidateQueries({ queryKey: ['daily-summary'] }); },
  });

  const badge = {
    granted: ['On', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'],
    default: ['Off', 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'],
    denied: ['Blocked by your browser', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'],
    'ios-install': ['Add MaxHub to your home screen first', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
    unsupported: ['Not available in this browser', 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'],
  }[status];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Choose how MaxHub lets you know about messages, calls, approvals and reminders.</p>
      </div>

      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">{status === 'granted' ? <BellRing className="h-5 w-5 text-indigo-600" /> : status === 'denied' ? <ShieldAlert className="h-5 w-5 text-red-500" /> : status === 'ios-install' ? <Smartphone className="h-5 w-5 text-amber-600" /> : <BellOff className="h-5 w-5 text-gray-500" />}</div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-900 dark:text-white">Pop-up notifications on this device</p><span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', badge[1])}>{badge[0]}</span></div>
            <p className="text-sm text-gray-500 mt-0.5">A pop-up on your computer or phone for new messages, calls and things that need you — even when MaxHub is in the background. Turn it on separately on each device you use.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {status === 'default' && (
            <button disabled={busy} onClick={async () => { setBusy(true); setStatus(await turnOnNotifications()); setBusy(false); }} className={cn(btn, 'bg-indigo-600 hover:bg-indigo-700 text-white')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}Turn on notifications
            </button>
          )}
          {status === 'granted' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => test.mutate()} disabled={test.isPending} className={cn(btn, 'bg-indigo-600 hover:bg-indigo-700 text-white')}><Send className="h-4 w-4" />Send me a test</button>
              <button onClick={async () => { await disablePush(); window.dispatchEvent(new Event('maxhub-push-changed')); toast.success('Pop-ups turned off on this device', 'You will still see everything under the bell.'); setStatus(pushStatus()); }}
                className={cn(btn, 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300')}><BellOff className="h-4 w-4" />Turn off on this device</button>
            </div>
          )}
          {status === 'denied' && (
            <div className="rounded-xl bg-red-50/60 dark:bg-red-500/5 border border-red-100 dark:border-red-900/50 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">How to allow MaxHub notifications</p>
              <UnblockSteps />
            </div>
          )}
          {status === 'ios-install' && (
            <div className="rounded-xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-900/50 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">On iPhone and iPad (iOS 16.4 or newer)</p>
              <IosInstallSteps />
            </div>
          )}
          {status === 'unsupported' && <p className="text-sm text-gray-600 dark:text-gray-400">Use Chrome, Edge or Firefox on a computer, or Chrome on an Android phone, to get pop-ups.</p>}
        </div>
      </div>

      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><Sun className="h-5 w-5 text-amber-500" /></div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Morning summary</p>
            <p className="text-sm text-gray-500 mt-0.5">At 7:30 each working morning (Monday–Saturday): your tasks due, meetings, interviews and approvals waiting.</p>
          </div>
          <button role="switch" aria-checked={!!summary.data?.morningMessage} disabled={!summary.data || morning.isPending} onClick={() => morning.mutate(!summary.data?.morningMessage)}
            className={cn('relative h-6 w-11 rounded-full transition shrink-0', summary.data?.morningMessage ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', summary.data?.morningMessage ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"><Inbox className="h-5 w-5 text-emerald-600" /></div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Always in MaxHub</p>
            <ul className="mt-1 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Every notification is kept under the bell at the top, even with pop-ups off.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />While MaxHub is open you also hear a soft chime and see a small message in the corner.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Important things — your welcome, birthday wishes, staff of the month — also come by email.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
