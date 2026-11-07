import { type Habit } from './sample-habits';

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
