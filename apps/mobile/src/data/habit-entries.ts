import { type Habit, type HabitConfiguration, type DayRecord } from './habit-types';

export function currentConfiguration(habit: Habit): HabitConfiguration {
  return { habitType: habit.habitType ?? 'build', repeatDays: [...(habit.repeatDays ?? [0, 1, 2, 3, 4, 5, 6])], tracking: { ...(habit.tracking ?? { kind: 'yes-no' }) } };
}
export function configurationOn(habit: Habit, day: string): HabitConfiguration {
  const recorded = latestRecord(habit, day);
  if (recorded) return recorded.configuration;
  const revisions = habit.configurationHistory ?? [];
  // Find the last applicable revision without allocating/filtering the entire
  // history for each calendar cell. Recorded-day provenance still takes priority.
  for (let index = revisions.length - 1; index >= 0; index--) {
    const revision = revisions[index];
    if (revision.effectiveOn === null || revision.effectiveOn <= day) return revision.configuration;
  }
  return currentConfiguration(habit);
}
export function latestRecord(habit: Habit, day: string) {
  const records = habit.entries?.[day] ?? [];
  return records[records.length - 1];
}
export function dayProgress(habit: Habit, day: string, today: string) {
  const configuration = configurationOn(habit, day);
  const date = new Date(day + 'T12:00:00');
  const scheduled = (!habit.createdOn || day >= habit.createdOn) && configuration.repeatDays.includes((date.getDay() + 6) % 7);
  const record = latestRecord(habit, day);
  const amount = record?.value.kind === 'amount' ? record.value.amount : undefined;
  let status: 'future' | 'unscheduled' | 'unlogged' | 'complete' | 'partial' | 'failed';
  if (day > today) status = 'future';
  else if (!scheduled) status = 'unscheduled';
  else if (!record || record.value.kind === 'clear') status = !habit.entries && habit.checkIns.includes(day) ? 'complete' : 'unlogged';
  else if (record.value.kind === 'legacy-complete') status = 'complete';
  else if (record.value.kind === 'yes-no') status = record.value.complete ? 'complete' : 'failed';
  else {
    const target = configuration.tracking.target ?? 1;
    status = configuration.habitType === 'quit' ? (amount! <= target ? 'complete' : 'failed') : (amount! >= target ? 'complete' : 'partial');
  }
  return { status, amount, configuration, record, complete: status === 'complete' };
}
export function initializeEntries(habit: Habit): Habit {
  if (habit.entries && habit.configurationHistory) return habit;
  const configuration = currentConfiguration(habit);
  const entries = habit.entries ?? Object.fromEntries([...new Set(habit.checkIns)].map(day => [day, [{
    id: `legacy:${habit.id}:${day}`, value: { kind: 'legacy-complete' }, configuration,
    recordedAt: null, occurredAt: null, timezone: null, utcOffsetMinutes: null, source: 'legacy',
  } satisfies DayRecord]]));
  return { ...habit, entries, configurationHistory: habit.configurationHistory ?? [{ effectiveOn: null, configuration }] };
}
export function completionDates(habit: Habit): string[] {
  if (!habit.entries) return habit.checkIns;
  return Object.keys(habit.entries).filter(day => dayProgress(habit, day, day).complete).sort();
}
