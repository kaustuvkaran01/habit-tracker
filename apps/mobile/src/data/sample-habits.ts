// Demo fixtures only. Production types and date rules live in their own modules.
import { type Habit } from './habit-types';
import { addDays, dateKey } from './habit-calendar';

export function createSampleHabits(today: Date): Habit[] {
  return [
    {
      id: 'habit-2', demo: true, name: 'Habit 2', description: 'Some description',
      color: '#2DCCBC', icon: 'pulse', notes: {},
      checkIns: [...Array.from({ length: 12 }, (_, index) => index), 15, 16, 19, 22, 24, 27, 29, 33]
        .map((offset) => dateKey(addDays(today, -offset))),
    },
    {
      id: 'workout', demo: true, name: 'Workout', description: 'Make time to move.',
      color: '#FFC52E', icon: 'workout', notes: {},
      checkIns: [0, 1, 2, 3, 8, 10].map((offset) => dateKey(addDays(today, -offset))),
    },
  ];
}
