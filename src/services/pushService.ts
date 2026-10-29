import { apiClient } from './apiClient';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

/** Subscribes this browser to pop-up notifications (asks permission if needed). */
export async function enablePush(ask = true): Promise<'granted' | 'denied' | 'unsupported' | 'default'> {
  if (!pushSupported()) return 'unsupported';
  let perm = Notification.permission;
  if (perm === 'default' && ask) perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm;
  const reg = (await registerServiceWorker()) || (await navigator.serviceWorker.ready);
  const { publicKey } = await apiClient.get<{ publicKey: string | null }>('/erp/push/key');
  if (!publicKey) return 'unsupported';
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  await apiClient.post('/erp/push/subscribe', { subscription: sub.toJSON() });
  return 'granted';
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await apiClient.post('/erp/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
}

/** Short, quiet two-note chime for in-app alerts. */
export function chime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.12); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.25);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* autoplay blocked */ }
}
