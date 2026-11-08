import { type Habit } from './habit-types';
import { addDays, dateFromKey, dateKey, calendarDaySpan, streakCompletions, streakDays } from './habit-calendar';
import { dayProgress } from './habit-entries';
import { isDateKey } from './habit-rewards';

export type AnalyticsRange = 7 | 30 | 90 | 365;
export type AnalyticsDay = ReturnType<typeof dayProgress> & { day: string; weekday: number };
export function amountSeriesKey(day: Pick<AnalyticsDay, 'configuration'>) {
  const { habitType, tracking } = day.configuration;
  return JSON.stringify([habitType, tracking.kind, tracking.unit ?? '']);
}

// Read-only derivation. A chart cannot change entries, awards or configuration.
export function habitAnalytics(habit: Habit, today: Date, range: AnalyticsRange) {
  const end = dateKey(today);
  const observed = [...habit.checkIns, ...Object.keys(habit.entries ?? {}), ...Object.keys(habit.notes)].filter(day => isDateKey(day) && day <= end).sort();
  const historyStart = habit.createdOn ?? observed[0];
  const requestedStart = dateKey(addDays(today, 1 - range));
  const start = historyStart && historyStart > requestedStart ? historyStart : requestedStart;
  const last = habit.archived && habit.archivedOn && habit.archivedOn < end ? habit.archivedOn : end;
  const days: AnalyticsDay[] = [];
  if (historyStart) {
    for (let date = dateFromKey(start); dateKey(date) <= last; date = addDays(date, 1)) {
      const day = dateKey(date);
      days.push({ day, weekday: (date.getDay() + 6) % 7, ...dayProgress(habit, day, end) });
    }
  }
  // Today is never a finished missed day, even if an explicit result exists.
  const closed = days.filter(day => day.day < end && day.status !== 'unscheduled' && day.status !== 'future');
  const completed = closed.filter(day => day.complete).length;
  const partial = closed.filter(day => day.status === 'partial').length;
  const failed = closed.filter(day => day.status === 'failed').length;
  const unlogged = closed.filter(day => day.status === 'unlogged').length;
  const weekdays = Array.from({ length: 7 }, (_, weekday) => {
    const entries = closed.filter(day => day.weekday === weekday);
    const completed = entries.filter(day => day.complete).length;
    return { weekday, entries, completed, scheduled: entries.length, rate: entries.length ? completed / entries.length : null };
  });
  const bestStreak = Math.max(0, ...streakCompletions(habit, dateFromKey(last))
    .filter(run => run.end >= start)
    .map(run => calendarDaySpan(run.start < start ? start : run.start, run.end)));
  const recoveryPairs = closed.slice(1).flatMap((day, index) => !closed[index].complete ? [{ from: closed[index], next: day }] : []);
  const recovered = recoveryPairs.filter(pair => pair.next.complete).length;
  const amountSeries = new Map<string, { key: string; kind: 'count' | 'measure'; habitType: 'build' | 'quit'; unit: string; total: number; reported: number; unknown: number }>();
  for (const day of days) {
    if (day.status === 'unscheduled' || day.status === 'future' || day.configuration.tracking.kind === 'yes-no') continue;
    const key = amountSeriesKey(day);
    const series = amountSeries.get(key) ?? { key, kind: day.configuration.tracking.kind, habitType: day.configuration.habitType, unit: day.configuration.tracking.unit ?? '', total: 0, reported: 0, unknown: 0 };
    if (day.amount !== undefined) { series.total += day.amount; series.reported++; }
    else if (day.complete) series.unknown++;
    amountSeries.set(key, series);
  }
  const candidates = weekdays.filter(day => day.scheduled >= 3).sort((a, b) => b.rate! - a.rate!);
  // Require multiple observed weekdays and a unique best; ties do not imply a winner.
  const bestWeekday = closed.length >= 14 && candidates.length >= 2 && candidates[0].rate! > candidates[1].rate! ? candidates[0] : null;
  const evidence = bestWeekday ? bestWeekday.entries : closed;
  return {
    start, end: last, requestedStart, historyStart, legacyHistory: !habit.createdOn, days, closed,
    completed, partial, failed, unlogged, scheduled: closed.length, rate: closed.length ? completed / closed.length : null,
    today: days.find(day => day.day === end) ?? null,
    currentStreak: habit.archived ? 0 : streakDays(habit, today), bestStreak, weekdays,
    recovery: { recovered, opportunities: recoveryPairs.length, pairs: recoveryPairs },
    amountSeries: [...amountSeries.values()], bestWeekday, evidence,
  };
}
