import { type RecordingContext } from './habit-types';
let sequence = 0;
export function recordingContext(now = new Date()): RecordingContext {
  let timezone: string | null = null;
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { /* Keep unknown context explicit. */ }
  return { id: `entry-${now.getTime()}-${++sequence}-${Math.random().toString(36).slice(2)}`, recordedAt: now.toISOString(), occurredAt: null, timezone, utcOffsetMinutes: -now.getTimezoneOffset() };
}
