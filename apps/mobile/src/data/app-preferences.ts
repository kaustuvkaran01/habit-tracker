export const LANGUAGES = [
  { id: 'system', name: 'System Default' }, { id: 'ca', name: 'Català' }, { id: 'de', name: 'Deutsch' },
  { id: 'en', name: 'English' }, { id: 'es', name: 'Español' }, { id: 'fr', name: 'Français' },
  { id: 'it', name: 'Italiano' }, { id: 'hu', name: 'Magyar' }, { id: 'nl', name: 'Nederlands' },
  { id: 'pt-BR', name: 'Português (Brasil)' }, { id: 'pt-PT', name: 'Português (Portugal)' },
  { id: 'tr', name: 'Türkçe' }, { id: 'be', name: 'Беларуская' },
] as const;
export type AppPreferences = {
  weekStartsOn: 0 | 1; highlightToday: boolean; notes: boolean; language: string;
  showViewBar: boolean; swipeViews: boolean; showCategoryFilter: boolean; showCategoryNames: boolean;
  showCompletedFilter: boolean; showSearch: boolean; dragToReorder: boolean; completedHabits: 'in-place' | 'bottom' | 'hidden';
  cardStreak: boolean; listStreak: boolean; monthStreak: boolean; showStreakGoal: boolean;
  showMonthLabels: boolean; showDayLabels: boolean; showCategories: boolean;
  compactDays: number; compactNames: boolean;
  dailyReminder: { enabled: boolean; days: number[]; time: string; title: string; message: string; discreet?: boolean };
};
export const DEFAULT_PREFERENCES: AppPreferences = {
  weekStartsOn: 1, highlightToday: true, notes: true, language: 'system',
  showViewBar: true, swipeViews: true, showCategoryFilter: true, showCategoryNames: true,
  showCompletedFilter: true, showSearch: false, dragToReorder: false, completedHabits: 'in-place',
  cardStreak: false, listStreak: false, monthStreak: false, showStreakGoal: false,
  showMonthLabels: false, showDayLabels: false, showCategories: false, compactDays: 5, compactNames: true,
  dailyReminder: { enabled: false, days: [0, 1, 2, 3, 4, 5, 6], time: '18:00', title: '', message: '' },
};
export function reminderValid(reminder: AppPreferences['dailyReminder']) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time)
    && (!reminder.enabled || reminder.days.length > 0);
}
export function decodePreferences(raw: string): AppPreferences {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid preferences');
  const saved = value as Record<string, unknown>;
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof AppPreferences)[]) {
    if (typeof DEFAULT_PREFERENCES[key] === 'boolean' && typeof saved[key] === 'boolean') {
      Object.assign(result, { [key]: saved[key] });
    }
  }
  if (saved.weekStartsOn === 0 || saved.weekStartsOn === 1) result.weekStartsOn = saved.weekStartsOn;
  if (LANGUAGES.some((language) => language.id === saved.language)) result.language = saved.language as string;
  if (['in-place', 'bottom', 'hidden'].includes(String(saved.completedHabits))) result.completedHabits = saved.completedHabits as AppPreferences['completedHabits'];
  if (Number.isInteger(saved.compactDays) && Number(saved.compactDays) >= 1 && Number(saved.compactDays) <= 7) result.compactDays = Number(saved.compactDays);
  const reminder = saved.dailyReminder as AppPreferences['dailyReminder'] | undefined;
  if (reminder && typeof reminder.enabled === 'boolean' && typeof reminder.title === 'string' && typeof reminder.message === 'string'
    && typeof reminder.time === 'string' && Array.isArray(reminder.days)
    && reminder.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) && reminderValid(reminder)) {
    result.dailyReminder = { enabled: reminder.enabled, time: reminder.time, title: reminder.title.slice(0, 80), message: reminder.message.slice(0, 200), days: [...new Set(reminder.days)].sort(), ...(typeof reminder.discreet === 'boolean' ? { discreet: reminder.discreet } : {}) };
  }
  // At least one way to switch views must remain available.
  if (!result.showViewBar && !result.swipeViews) result.showViewBar = true;
  return result;
}
