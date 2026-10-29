/* MaxHub service worker — desktop / phone pop-up notifications. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: 'MaxHub', body: event.data && event.data.text() }; }
  event.waitUntil((async () => {
    // If MaxHub is open and in front of the person, the in-app toast already shows it.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const looking = wins.some((w) => w.visibilityState === 'visible' && w.focused);
    if (looking) return;
    await self.registration.showNotification(data.title || 'MaxHub', {
      body: data.body || '',
      icon: data.icon || '/images/maxhublogo.jpeg',
      badge: '/images/maxhublogo.jpeg',
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        w.postMessage({ type: 'navigate', url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
