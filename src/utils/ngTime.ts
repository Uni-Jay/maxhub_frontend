/**
 * Nigeria runs a single timezone with no DST (Africa/Lagos, UTC+1), but the
 * viewing device's own clock/timezone may not be set correctly - so times
 * are always formatted against Africa/Lagos explicitly rather than relying
 * on the browser's implicit local timezone.
 */
export const NG_TZ = 'Africa/Lagos';

export function formatNgTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-US', {
    timeZone: NG_TZ, hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatNgDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { timeZone: NG_TZ, ...opts });
}

/** Hour-of-day (0-23) in Lagos time, for greetings/time-window checks. */
export function ngHour(d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: NG_TZ, hour: '2-digit', hour12: false }).format(d)
  );
}
