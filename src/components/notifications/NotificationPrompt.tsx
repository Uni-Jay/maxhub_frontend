import { useEffect, useState } from 'react';
import { Bell, BellRing, MessageSquare, CheckSquare, PhoneCall, X, Smartphone, ShieldAlert, Loader2 } from 'lucide-react';
import { pushSupported, enablePush } from '@services/pushService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

/** Set by the sign-in page so we ask (once) right after each sign-in. */
export const ASK_KEY = 'maxhub-ask-notifications';

export type PushStatus = 'granted' | 'default' | 'denied' | 'unsupported' | 'ios-install';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export function pushStatus(): PushStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIOS() && !isStandalone()) return 'ios-install';
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as PushStatus;
}

/** Which browser we are in — so the "how to unblock" steps match what people see. */
function browserName(): 'chrome-android' | 'chrome' | 'edge' | 'firefox' | 'safari' | 'ios' | 'other' {
  const ua = navigator.userAgent;
  if (isIOS()) return 'ios';
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Android/.test(ua) && /Chrome\//.test(ua)) return 'chrome-android';
  if (/Chrome\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'other';
}

export function UnblockSteps({ compact }: { compact?: boolean }) {
  const b = browserName();
  const steps: Record<string, string[]> = {
    chrome: ['Click the icon just left of the web address (a padlock or sliders icon).', 'Find “Notifications” and change it to “Allow”.', 'Reload the page.'],
    edge: ['Click the padlock just left of the web address.', 'Under “Permissions for this site”, set Notifications to “Allow”.', 'Reload the page.'],
    firefox: ['Click the padlock just left of the web address.', 'Next to “Send notifications”, click the ✕ to remove the block.', 'Reload the page and click “Turn on notifications” again.'],
    'chrome-android': ['Tap ⋮ (top right) → Settings → Site settings → Notifications.', 'Find www.maxhubng.company under “Blocked” and change it to “Allow”.', 'Come back to MaxHub and reload.'],
    safari: ['In the menu bar choose Safari → Settings → Websites → Notifications.', 'Set www.maxhubng.company to “Allow”.', 'Reload the page.'],
    ios: ['Open the Settings app → Notifications → MaxHub.', 'Turn on “Allow Notifications”.', 'Open MaxHub again from your home screen.'],
    other: ['Open your browser’s site settings for www.maxhubng.company.', 'Set Notifications to “Allow”.', 'Reload the page.'],
  };
  return (
    <ol className={cn('list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300', compact ? 'text-xs' : 'text-sm')}>
      {steps[b].map((s) => <li key={s}>{s}</li>)}
    </ol>
  );
}

export function IosInstallSteps() {
  return (
    <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
      <li>In Safari, tap the Share button (the square with an arrow, at the bottom).</li>
      <li>Choose “Add to Home Screen”, then “Add”.</li>
      <li>Open MaxHub from the new icon on your home screen and sign in.</li>
      <li>Tap “Turn on notifications” when MaxHub asks.</li>
    </ol>
  );
}

/** Turn on in one tap: asks the browser and saves this device for pop-ups. */
export async function turnOnNotifications(): Promise<PushStatus> {
  const r = await enablePush(true).catch(() => 'denied' as const);
  window.dispatchEvent(new Event('maxhub-push-changed'));
  if (r === 'granted') toast.success('Notifications are on', 'You will get pop-ups for messages, calls and approvals.');
  else if (r === 'denied') toast.error('Notifications are blocked', 'Follow the steps shown to allow them for MaxHub.');
  return r as PushStatus;
}

/**
 * Shown right after signing in (and on first visit) when notifications are not
 * on yet: one big button. "Not now" hides it until the next sign-in.
 */
export function NotificationPrompt() {
  const [status, setStatus] = useState<PushStatus>(() => pushStatus());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let afterLogin = false; let fresh = false;
    try { afterLogin = sessionStorage.getItem(ASK_KEY) === '1'; fresh = localStorage.getItem('maxhub-push-seen') !== '1'; } catch { /* storage blocked */ }
    const s = pushStatus();
    setStatus(s);
    if (window.location.pathname.startsWith('/settings/notifications')) return undefined;
    // Ask after every sign-in until it is on; show the "blocked" help only once.
    if (((s === 'default' || s === 'ios-install') && (afterLogin || fresh)) || (s === 'denied' && fresh)) {
      const t = setTimeout(() => setOpen(true), 900); // let the dashboard paint first
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const close = () => {
    setOpen(false);
    try { sessionStorage.removeItem(ASK_KEY); localStorage.setItem('maxhub-push-seen', '1'); } catch { /* ignore */ }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={close}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-gradient-to-br from-indigo-600 to-violet-600 px-6 pt-6 pb-8 text-white">
          <button onClick={close} className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-white/15" aria-label="Close"><X className="h-4 w-4" /></button>
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center mb-3">{status === 'denied' ? <ShieldAlert className="h-7 w-7" /> : status === 'ios-install' ? <Smartphone className="h-7 w-7" /> : <BellRing className="h-7 w-7" />}</div>
          <h2 className="text-xl font-bold">{status === 'denied' ? 'Notifications are blocked' : status === 'ios-install' ? 'Get MaxHub notifications on your iPhone' : 'Don’t miss anything important'}</h2>
          <p className="text-sm text-white/80 mt-1">
            {status === 'denied' ? 'Your browser is blocking MaxHub pop-ups. It takes a few seconds to fix.'
              : status === 'ios-install' ? 'iPhones only show notifications for apps on the home screen. Add MaxHub once — it works like an app.'
                : 'Get a pop-up for new messages, calls and approvals — even when MaxHub is in the background.'}
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {status === 'default' && (
            <>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><MessageSquare className="h-4 w-4 text-indigo-600 mt-0.5" />New messages and mentions</li>
                <li className="flex gap-2"><PhoneCall className="h-4 w-4 text-indigo-600 mt-0.5" />Incoming calls and meetings starting</li>
                <li className="flex gap-2"><CheckSquare className="h-4 w-4 text-indigo-600 mt-0.5" />Tasks, approvals and reminders for you</li>
              </ul>
              <button disabled={busy} onClick={async () => { setBusy(true); const r = await turnOnNotifications(); setBusy(false); setStatus(r); if (r === 'granted') close(); }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}Turn on notifications
              </button>
              <p className="text-xs text-gray-500 text-center">Your browser will ask once — choose <b>Allow</b>.</p>
            </>
          )}
          {status === 'denied' && <><UnblockSteps /><p className="text-xs text-gray-500">You can also find these steps later under Settings → Notifications.</p></>}
          {status === 'ios-install' && <IosInstallSteps />}
          {status === 'unsupported' && <p className="text-sm text-gray-600 dark:text-gray-400">This browser cannot show pop-up notifications. Use Chrome, Edge or Firefox on a computer, or Chrome on Android. You will still see everything under the bell in MaxHub.</p>}
          <button onClick={close} className="w-full py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">{status === 'default' ? 'Not now' : 'Done'}</button>
        </div>
      </div>
    </div>
  );
}
