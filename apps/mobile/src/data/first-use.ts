import { type Habit } from './habit-types';
import { canCheckIn, dateKey } from './habit-calendar';
import { dayProgress } from './habit-entries';

export const FIRST_USE_KEY = '@habit-tracker/onboarding/v1';
export function createFirstUsePersistence(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> }) {
  return {
    async completed() {
      const raw = await storage.getItem(FIRST_USE_KEY);
      if (raw === null) return false;
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('completed' in value) || value.completed !== true) throw Error('Invalid welcome preference');
      return true;
    },
    async complete() { await storage.setItem(FIRST_USE_KEY, JSON.stringify({ version: 1, completed: true })); },
  };
}

export function homeEmptyState(habits: Habit[], visible: Habit[], today: Date, filtered = false): 'first' | 'archived' | 'complete' | 'filtered' | null {
  if (visible.length) return null;
  const active = habits.filter(habit => !habit.archived);
  if (!active.length) return habits.some(habit => habit.archived) ? 'archived' : 'first';
  if (filtered) return 'filtered';
  const scheduled = active.filter(habit => canCheckIn(habit, dateKey(today), today));
  return scheduled.length > 0 && scheduled.every(habit => dayProgress(habit, dateKey(today), dateKey(today)).complete)
    ? 'complete' : 'filtered';
}

export function hasRecordedProgress(habits: Habit[]) {
  return habits.some(habit => habit.checkIns.length > 0 || Object.keys(habit.entries ?? {}).length > 0);
}
