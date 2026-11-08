import { type AppPreferences } from './app-preferences';
import { dateKey } from './habit-calendar';
import { homeEmptyState } from './first-use';
import { type Habit } from './habit-types';

export type HomeFilters = { category: string | null; onlyIncomplete: boolean; searchOpen: boolean; query: string };
type HomePreferences = Pick<AppPreferences, 'showCategoryFilter' | 'showSearch' | 'showCompletedFilter' | 'completedHabits'>;

// Read-only view data. Normalize search and completion membership once, rather
// than repeating date/string/history work inside filter and sort callbacks.
export function selectHomeHabits(habits: Habit[], today: Date, preferences: HomePreferences, filters: HomeFilters) {
  const active = habits.filter(habit => !habit.archived);
  const categories = [...new Set(active.flatMap(habit => habit.categories ?? []))];
  const category = preferences.showCategoryFilter && filters.category && categories.includes(filters.category) ? filters.category : null;
  const query = preferences.showSearch && filters.searchOpen ? filters.query.trim().toLowerCase() : '';
  const policy = preferences.showCompletedFilter && filters.onlyIncomplete ? 'hidden' : preferences.completedHabits;
  const todayKey = dateKey(today);
  const completed = new Set(policy === 'in-place' ? [] : active.filter(habit => habit.checkIns.includes(todayKey)).map(habit => habit.id));
  const visible = active.filter(habit => (!category || habit.categories?.includes(category))
    && (!query || habit.name.toLowerCase().includes(query)) && (policy !== 'hidden' || !completed.has(habit.id)));
  if (policy === 'bottom') visible.sort((a, b) => Number(completed.has(a.id)) - Number(completed.has(b.id)));
  return { active, categories, visible, archivedCount: habits.length - active.length,
    emptyState: homeEmptyState(habits, visible, today, !!(category || query)) };
}

export type HomePresentation = {
  sheetOpen: boolean; sheetPresented: boolean; entryPresented: boolean; detailBusy: boolean; upgradeOpen: boolean;
  habitDetailOpen: boolean; selectedHabitId: string | null;
};
// Both notification navigation and achievement acquisition must wait for native
// dismissal, including the interval where detail is closed but still retained.
export function homePresentationReady(state: HomePresentation) {
  return !state.sheetOpen && !state.sheetPresented && !state.entryPresented && !state.detailBusy && !state.upgradeOpen
    && (state.habitDetailOpen || state.selectedHabitId === null);
}
