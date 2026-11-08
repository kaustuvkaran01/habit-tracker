import { type HabitSnapshot } from './habit-archive';
import { type AppPreferences } from './app-preferences';
import { type Entitlement, loggingHabitIds, reminderLimit } from './pro-access';
import { addDays, canCheckIn, dateKey } from './habit-calendar';
import { dayProgress } from './habit-entries';
import { habitReminderTimes, validReminderTime } from './reminder-settings';
export { habitReminderTimes, validReminderTime } from './reminder-settings';

export const REMINDER_PREFIX = 'habit-tracker:reminder:v1:';
export const REMINDER_QUEUE_LIMIT = 60;
export const REMINDER_HORIZON_DAYS = 30;
export type ReminderTarget = { version: 1; kind: 'habit'; habitId: string; day: string } | { version: 1; kind: 'daily'; day: string };
export type PlannedReminder = { id: string; at: number; title: string; body: string; target: ReminderTarget; fingerprint: string };
export type ReminderPlan = { items: PlannedReminder[]; coverageUntil: number; truncated: boolean };

// Pure planning: no permission requests, native calls, IDs, persistence or clocks.
// Dates are constructed in the current local timezone; native queue refreshes on
// foreground/timezone changes. A nonexistent DST time advances with Date's rules.
export function planReminders(snapshot: HabitSnapshot, daily: AppPreferences['dailyReminder'], access: Entitlement, now: Date,
  t: (source: string) => string, limit = REMINDER_QUEUE_LIMIT): ReminderPlan {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = dateKey(now), allowed = new Set(loggingHabitIds(snapshot, access));
  const items: PlannedReminder[] = [];
  function append(target: ReminderTarget, day: Date, time: string, title: string, body: string) {
    if (!validReminderTime(time)) return;
    const [hour, minute] = time.split(':').map(Number);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).getTime();
    if (at <= now.getTime()) return;
    const id = REMINDER_PREFIX + JSON.stringify([target.kind, target.kind === 'habit' ? target.habitId : '', target.day, time]);
    items.push({ id, at, title, body, target, fingerprint: JSON.stringify([at, title, body, target]) });
  }
  for (let offset = 0; offset < REMINDER_HORIZON_DAYS; offset++) {
    const day = addDays(midnight, offset), key = dateKey(day);
    for (const habit of snapshot.habits) {
      if (habit.archived || habit.demo || habit.remindersPaused || !allowed.has(habit.id) || !canCheckIn(habit, key, day)) continue;
      // Only a successful recorded goal suppresses remaining reminders today.
      // Numeric partials, explicit failures and unlogged Quit days still qualify.
      if (key === today && dayProgress(habit, key, today).complete) continue;
      const times = habitReminderTimes(habit).slice(0, reminderLimit(access));
      for (const time of times) append({ version: 1, kind: 'habit', habitId: habit.id, day: key }, day, time,
        habit.reminderDiscreet === false ? habit.name : 'Habit Tracker', t('Time for a check-in.'));
    }
    if (daily.enabled && daily.days.includes((day.getDay() + 6) % 7)) {
      const discreet = daily.discreet !== false;
      append({ version: 1, kind: 'daily', day: key }, day, daily.time,
        discreet ? 'Habit Tracker' : daily.title.trim() || 'Habit Tracker',
        discreet ? t('Time for your daily check-in.') : daily.message.trim() || t('Time for your daily check-in.'));
    }
  }
  items.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const count = Number.isFinite(limit) ? Math.max(0, Math.min(REMINDER_QUEUE_LIMIT, Math.floor(limit))) : REMINDER_QUEUE_LIMIT;
  const truncated = items.length > count;
  return { items: items.slice(0, count), truncated,
    coverageUntil: truncated ? items[count].at - 1 : addDays(midnight, REMINDER_HORIZON_DAYS).getTime() - 1 };
}

export type ScheduledReminder = { id: string; fingerprint: string | null };
export interface ReminderQueue {
  list(): Promise<ScheduledReminder[]>;
  cancel(id: string): Promise<void>;
  schedule(item: PlannedReminder): Promise<void>;
}

// One owner serializes replacement plans. A newer revision stops stale work at
// each await boundary; callers always reconcile against the native queue again.
export function createReminderReconciler(queue: ReminderQueue) {
  let revision = 0, pending: Promise<unknown> = Promise.resolve();
  return {
    async flush() { await pending.catch(() => undefined); },
    invalidate() { revision++; },
    sync(plan: ReminderPlan) {
      const current = ++revision;
      const run = pending.catch(() => undefined).then(async () => {
        const saved = await queue.list();
        if (current !== revision) return false;
        const wanted = new Map(plan.items.map(item => [item.id, item]));
        const existing = new Map(saved.filter(item => item.id.startsWith(REMINDER_PREFIX)).map(item => [item.id, item]));
        for (const [id, item] of existing) {
          if (current !== revision) return false;
          if (!wanted.has(id) || wanted.get(id)!.fingerprint !== item.fingerprint) {
            await queue.cancel(id); existing.delete(id);
          }
        }
        for (const item of plan.items) {
          if (current !== revision) return false;
          if (!existing.has(item.id)) await queue.schedule(item);
        }
        return current === revision;
      });
      pending = run;
      return run;
    },
  };
}
