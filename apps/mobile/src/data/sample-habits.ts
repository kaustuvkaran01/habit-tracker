import { type HabitRewards } from './habit-rewards';

export type HabitIconName = 'pulse' | 'workout' | 'book' | 'moon' | 'leaf' | 'target' | 'emoji';
export type Habit = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: HabitIconName;
  emoji?: string;
  habitType?: 'build' | 'quit';
  repeatDays?: number[];
  tracking?: { kind: 'yes-no' | 'count' | 'measure'; target?: number; unit?: string; onTap?: 'add-one' | 'enter-total' };
  reminderTime?: string | null;
  categories?: string[];
  createdOn?: string;
  archived?: boolean;
  archivedOn?: string;
  checkIns: string[];
  notes: Record<string, string>;
  rewards?: HabitRewards;
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isScheduled(habit: Habit, date: Date) {
  return (!habit.createdOn || dateKey(date) >= habit.createdOn)
    && (habit.repeatDays ?? [0, 1, 2, 3, 4, 5, 6]).includes((date.getDay() + 6) % 7);
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

export function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

export function calendarDays(month: Date) {
  const first = startOfWeek(new Date(month.getFullYear(), month.getMonth(), 1, 12));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function monthLabel(date: Date, short = false) {
  return date.toLocaleDateString(undefined, { month: short ? 'short' : 'long', year: 'numeric' });
}

export function streakDays(habit: Habit, today: Date) {
  const completed = new Set(habit.checkIns);
  if (!completed.size) return 0;
  const first = [...completed].sort()[0];
  let date = completed.has(dateKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (dateKey(date) >= first) {
    if (isScheduled(habit, date)) {
      if (!completed.has(dateKey(date))) break;
      count += 1;
    }
    date = addDays(date, -1);
  }
  return count;
}

export function createSampleHabits(today: Date): Habit[] {
  return [
    {
      id: 'habit-2', name: 'Habit 2', description: 'Some description',
      color: '#2DCCBC', icon: 'pulse', notes: {},
      checkIns: [...Array.from({ length: 12 }, (_, index) => index), 15, 16, 19, 22, 24, 27, 29, 33]
        .map((offset) => dateKey(addDays(today, -offset))),
    },
    {
      id: 'workout', name: 'Workout', description: 'Make time to move.',
      color: '#FFC52E', icon: 'workout', notes: {},
      checkIns: [0, 1, 2, 3, 8, 10].map((offset) => dateKey(addDays(today, -offset))),
    },
  ];
}
