import { dateKey, type Habit } from './sample-habits';
import { type RetainedCollection } from './habit-rewards';

export const ARCHIVE_RETENTION_DAYS = 30;
export type HabitSnapshot = { habits: Habit[]; retainedCollections: RetainedCollection[] };

export function archiveHabit(habit: Habit, today: Date): Habit {
  return habit.archived ? habit : { ...habit, archived: true, archivedOn: dateKey(today) };
}

export function restoreHabit(habit: Habit): Habit {
  if (!habit.archived) return habit;
  const { archivedOn, ...rest } = habit;
  return { ...rest, archived: false };
}

export function archiveDaysLeft(archivedOn: string, today: Date) {
  // UTC date arithmetic counts calendar days even across daylight saving changes.
  const elapsed = (Date.parse(dateKey(today)) - Date.parse(archivedOn)) / 86_400_000;
  return Math.max(0, ARCHIVE_RETENTION_DAYS - Math.max(0, elapsed));
}

export function reconcileArchive(snapshot: HabitSnapshot, today: Date, hasPro: boolean): HabitSnapshot {
  let changed = false;
  const retained: RetainedCollection[] = [];
  const habits = snapshot.habits.flatMap((habit) => {
    if (!habit.archived) return [habit];
    // Older archives had no date. Give them a full recovery window on migration.
    if (!habit.archivedOn) {
      changed = true;
      return [{ ...habit, archivedOn: dateKey(today) }];
    }
    if (hasPro || archiveDaysLeft(habit.archivedOn, today) > 0) return [habit];

    changed = true;
    const { id, name, color, icon, emoji, rewards } = habit;
    if (rewards && (rewards.wallpapers.length || rewards.badges.length)) {
      retained.push({ id, name, color, icon, ...(emoji ? { emoji } : {}), rewards });
    }
    return [];
  });
  return changed ? { habits, retainedCollections: [...snapshot.retainedCollections, ...retained] } : snapshot;
}
