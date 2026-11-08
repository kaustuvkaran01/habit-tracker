import { type Habit } from './habit-types';

export function moveActiveHabit(habits: Habit[], id: string, direction: -1 | 1): Habit[] {
  const active = habits.filter((habit) => !habit.archived);
  const index = active.findIndex((habit) => habit.id === id);
  const neighbour = active[index + direction];
  if (index < 0 || !neighbour) return habits;
  const from = habits.findIndex((habit) => habit.id === id);
  const to = habits.findIndex((habit) => habit.id === neighbour.id);
  const reordered = [...habits];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
  return reordered;
}

export function moveHabitTo(habits: Habit[], id: string, targetId: string): Habit[] {
  const active = habits.filter((habit) => !habit.archived);
  const from = active.findIndex((habit) => habit.id === id);
  const to = active.findIndex((habit) => habit.id === targetId);
  if (from < 0 || to < 0 || from === to) return habits;
  const [moving] = active.splice(from, 1);
  active.splice(to, 0, moving);
  let index = 0;
  return habits.map((habit) => habit.archived ? habit : active[index++]);
}
