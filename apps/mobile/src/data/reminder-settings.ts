import { type Habit } from './habit-types';

export const validReminderTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function habitReminderTimes(habit: Pick<Habit, 'reminderTime' | 'reminderTimes'>): string[] {
  return [...new Set(habit.reminderTimes ?? (habit.reminderTime ? [habit.reminderTime] : []))].filter(validReminderTime).sort();
}
