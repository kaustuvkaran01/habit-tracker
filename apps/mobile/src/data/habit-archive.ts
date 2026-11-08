import { type Habit } from './habit-types';
import { dateKey } from './habit-calendar';
import { type RetainedCollection } from './habit-rewards';
import { canExpireArchives, hasProAccess, type Entitlement } from './pro-access';

export const ARCHIVE_RETENTION_DAYS = 30;
export type HabitSnapshot = { habits: Habit[]; retainedCollections: RetainedCollection[]; freeHabitIds?: string[] };

export function archiveHabit(habit: Habit, today: Date): Habit {
  return habit.archived ? habit : { ...habit, archived: true, archivedOn: dateKey(today) };
}

export function restoreHabit(habit: Habit): Habit {
  if (!habit.archived) return habit;
  const { archivedOn, archiveProtected, archiveRecoveryOn, ...rest } = habit;
  return { ...rest, archived: false };
}

export function archiveDaysLeft(archivedOn: string, today: Date) {
  // UTC date arithmetic counts calendar days even across daylight saving changes.
  const elapsed = (Date.parse(dateKey(today)) - Date.parse(archivedOn)) / 86_400_000;
  return Math.max(0, ARCHIVE_RETENTION_DAYS - Math.max(0, elapsed));
}

export function archiveRecoveryStart(habit: Habit) { return habit.archiveRecoveryOn ?? habit.archivedOn; }
export function archivedDaysLeft(habit: Habit, today: Date) {
  const start = archiveRecoveryStart(habit);
  return start ? archiveDaysLeft(start, today) : ARCHIVE_RETENTION_DAYS;
}

export function reconcileArchive(snapshot: HabitSnapshot, today: Date, entitlement: Entitlement): HabitSnapshot {
  // Never interpret loading, offline verification failure or missing access as
  // Free. The last paid protection marker survives restarts and unavailable days.
  if (entitlement.status !== 'verified') return snapshot;
  let changed = false;
  const retained: RetainedCollection[] = [];
  const habits = snapshot.habits.flatMap((original) => {
    let habit = original;
    if (!habit.archived) return [habit];
    // Older archives had no date. Give them a full recovery window on migration.
    if (!habit.archivedOn) {
      changed = true;
      habit = { ...habit, archivedOn: dateKey(today) };
    }
    if (hasProAccess(entitlement)) {
      if (habit.archiveProtected) return [habit];
      changed = true;
      return [{ ...habit, archiveProtected: true }];
    }
    if (habit.archiveProtected) {
      changed = true;
      const { archiveProtected, ...rest } = habit;
      return [{ ...rest, archiveRecoveryOn: dateKey(today) }];
    }
    if (!canExpireArchives(entitlement) || archivedDaysLeft(habit, today) > 0) return [habit];

    changed = true;
    const { id, name, color, icon, emoji, rewards } = habit;
    if (rewards && (rewards.wallpapers.length || rewards.badges.length)) {
      retained.push({ id, name, color, icon, ...(emoji ? { emoji } : {}), rewards });
    }
    return [];
  });
  return changed ? { ...snapshot, habits, retainedCollections: [...snapshot.retainedCollections, ...retained] } : snapshot;
}
