import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'] as const;
const KEY = 'maxhub-last-activity';

function markActive() {
  try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ }
}
function lastActive(): number {
  try { return Number(localStorage.getItem(KEY)) || Date.now(); } catch { return Date.now(); }
}

/**
 * Calls `onIdle` after `ms` without activity. Activity in ANY open MaxHub tab
 * counts (shared through localStorage), and nobody is logged out while on a
 * call (window.__maxhubInCall is set by the call screen).
 */
export function useIdleTimeout(ms: number, onIdle: () => void, enabled = true): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    markActive();
    let throttle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - throttle > 5000) { throttle = now; markActive(); }
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    const timer = setInterval(() => {
      if ((window as any).__maxhubInCall) { markActive(); return; }
      if (Date.now() - lastActive() >= ms) onIdleRef.current();
    }, 30_000);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [ms, enabled]);
}
