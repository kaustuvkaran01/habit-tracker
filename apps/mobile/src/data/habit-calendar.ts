import { completionDates, configurationOn, dayProgress } from './habit-entries';
import { type Habit } from './habit-types';

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isScheduled(habit: Habit, date: Date) {
  return (!habit.createdOn || dateKey(date) >= habit.createdOn)
    && configurationOn(habit, dateKey(date)).repeatDays.includes((date.getDay() + 6) % 7);
}

export function canCheckIn(habit: Habit, key: string, today: Date) {
  return key <= dateKey(today) && isScheduled(habit, dateFromKey(key));
}

export function repeatLabel(days = [0, 1, 2, 3, 4, 5, 6]) {
  return days.length === 7 ? 'Every day' : days.map((day) => DAY_NAMES[day]).join(', ');
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

export function startOfWeek(date: Date, weekStartsOn = 1) {
  return addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

export function calendarDays(month: Date, weekStartsOn = 1) {
  const first = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1, 12), weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function monthLabel(date: Date, short = false, locale?: string) {
  return date.toLocaleDateString(locale, { month: short ? 'short' : 'long', year: 'numeric' });
}

// Inclusive calendar span, independent of local DST or timezone offsets.
export function calendarDaySpan(first: string, last: string) {
  const start = dateFromKey(first), end = dateFromKey(last);
  return Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1;
}

// A rest day is credited only when the next scheduled completion confirms the
// run. Each result is an actual completion and the calendar span it has earned.
export function streakCompletions(habit: Habit, today: Date, from?: string) {
  const last = dateKey(today);
  const eligible = [...new Set(completionDates(habit))].filter(key => key <= last && (!from || key >= from)
    && dateKey(dateFromKey(key)) === key && isScheduled(habit, dateFromKey(key))).sort();
  const results: { start: string; end: string; days: number }[] = [];
  let start: string | undefined, previous: string | undefined;
  for (const key of eligible) {
    if (previous) {
      for (let date = addDays(dateFromKey(previous), 1); dateKey(date) < key; date = addDays(date, 1)) {
        if (isScheduled(habit, date)) { start = undefined; break; }
      }
    }
    start ??= key;
    results.push({ start, end: key, days: calendarDaySpan(start, key) });
    previous = key;
  }
  return results;
}

export function streakDays(habit: Habit, today: Date, from?: string) {
  const todayKey = dateKey(today);
  if (dayProgress(habit, todayKey, todayKey).status === 'failed') return 0;
  const completions = streakCompletions(habit, today, from);
  const latest = completions[completions.length - 1];
  if (!latest) return 0;
  for (let date = addDays(dateFromKey(latest.end), 1); dateKey(date) < todayKey; date = addDays(date, 1)) {
    if (isScheduled(habit, date)) return 0;
  }
  // An unfinished scheduled today preserves the last confirmed span until the
  // day ends; an explicit failure today has already returned zero above.
  return latest.days;
}
