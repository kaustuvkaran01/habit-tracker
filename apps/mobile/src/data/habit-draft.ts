import { type Habit, type HabitIconName } from './habit-types';
import { dateKey } from './habit-calendar';
import { currentConfiguration, initializeEntries } from './habit-entries';
import { normalizedHabitEmoji } from './habit-emoji';
import { habitReminderTimes, validReminderTime } from './reminder-settings';

export const HABIT_COLORS = [
  '#FA6C70', '#FF923D', '#FFC52E', '#F7D326', '#A6E92D', '#45D97C', '#2ECC9B',
  '#2DCCBC', '#25CBE2', '#39B7EF', '#609FF1', '#8384F7', '#A289F5', '#BE82F0',
  '#DD70EE', '#EE71BA', '#F76B8E', '#93A2B7', '#969DA9', '#A4A4A5', '#A59F9B',
];
export { HABIT_ICONS } from './habit-icons';
export const CATEGORIES = ['Health', 'Fitness', 'Learning', 'Mindfulness', 'Personal'];

export type HabitDraft = {
  name: string; description: string; icon: HabitIconName; emoji: string; color: string; habitType: 'build' | 'quit';
  repeatDays: number[]; trackingKind: 'yes-no' | 'count' | 'measure'; target: string; unit: string;
  onTap: 'add-one' | 'enter-total';
  reminderTime: string | null; categories: string[];
  extraReminderTimes?: string[]; reminderDiscreet?: boolean;
  remindersPaused?: boolean;
};

export function draftReminderTimes(draft: HabitDraft) {
  return draft.reminderTime === null ? [] : [draft.reminderTime, ...(draft.extraReminderTimes ?? [])];
}

export function emptyDraft(): HabitDraft {
  return {
    name: '', description: '', icon: 'pulse', emoji: '', color: HABIT_COLORS[0], habitType: 'build',
    repeatDays: [0, 1, 2, 3, 4, 5, 6], trackingKind: 'yes-no', target: '1', unit: '', onTap: 'add-one', reminderTime: null, categories: [],
  };
}

export function draftFromHabit(habit: Habit): HabitDraft {
  return {
    name: habit.name, description: habit.description, icon: habit.icon, emoji: habit.emoji ?? '', color: habit.color,
    habitType: habit.habitType ?? 'build',
    repeatDays: [...(habit.repeatDays ?? [0, 1, 2, 3, 4, 5, 6])].sort((a, b) => a - b),
    trackingKind: habit.tracking?.kind ?? 'yes-no', target: String(habit.tracking?.target ?? 1),
    unit: habit.tracking?.unit ?? '', onTap: habit.tracking?.onTap ?? 'add-one',
    reminderTime: habitReminderTimes(habit)[0] ?? null, extraReminderTimes: habitReminderTimes(habit).slice(1), reminderDiscreet: habit.reminderDiscreet !== false, remindersPaused: habit.remindersPaused === true, categories: [...(habit.categories ?? [])],
  };
}

export function draftError(draft: HabitDraft): string | null {
  if (!draft.name.trim()) return 'Enter a habit name.';
  if (draft.icon === 'emoji' && !normalizedHabitEmoji(draft.emoji)) return 'Choose one emoji for the habit icon.';
  if (!draft.repeatDays.length) return 'Choose at least one repeat day.';
  if (draft.trackingKind !== 'yes-no') {
    const targetText = draft.target.trim().replace(',', '.');
    const target = Number(targetText);
    if (!targetText || !Number.isFinite(target) || target < 0 || (draft.habitType === 'build' && target === 0)) {
      return draft.habitType === 'quit' ? 'Enter a daily limit of zero or more.' : 'Enter a daily target greater than zero.';
    }
    if (draft.trackingKind === 'count' && !Number.isSafeInteger(target)) return 'Use a whole number for a count target.';
    if (draft.trackingKind === 'measure' && !draft.unit.trim()) return 'Enter a unit, such as minutes or km.';
  }
  if (draft.reminderTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.reminderTime)) return 'Enter a reminder time as HH:mm, for example 09:00.';
  const times = draftReminderTimes(draft);
  if (times.length > 3 || times.some(time => !validReminderTime(time))) return 'Use up to three valid reminder times.';
  if (new Set(times).size !== times.length) return 'Choose different reminder times.';
  return null;
}

export function stepGoal(draft: HabitDraft, direction: -1 | 1): string {
  const text = draft.target.trim().replace(',', '.');
  const value = Number(text);
  if (!text || !Number.isFinite(value) || value < 0 || (draft.habitType === 'build' && value === 0)
    || (draft.trackingKind === 'count' && !Number.isInteger(value))) {
    return draft.habitType === 'quit' ? '0' : '1';
  }
  const next = Math.max(0, value + direction);
  if (draft.habitType === 'build' && next === 0) return String(value);
  return String(Number(next.toFixed(10)));
}

function settingsFromDraft(draft: HabitDraft) {
  const error = draftError(draft);
  if (error) throw new Error(error);
  return {
    name: draft.name.trim(), description: draft.description.trim(), color: draft.color, icon: draft.icon,
    emoji: draft.icon === 'emoji' ? normalizedHabitEmoji(draft.emoji)! : undefined,
    habitType: draft.habitType, repeatDays: [...draft.repeatDays].sort((a, b) => a - b),
    tracking: { kind: draft.trackingKind, ...(draft.trackingKind !== 'yes-no' ? { target: Number(draft.target.replace(',', '.')), onTap: draft.onTap ?? 'add-one' } : {}),
      ...(draft.trackingKind === 'measure' ? { unit: draft.unit.trim() } : {}) },
    reminderTime: draft.reminderTime, reminderTimes: draftReminderTimes(draft), reminderDiscreet: draft.reminderDiscreet !== false, remindersPaused: draft.remindersPaused === true, categories: [...draft.categories],
  };
}

export function habitFromDraft(draft: HabitDraft, today: Date, id: string): Habit {
  return { ...settingsFromDraft(draft), id, createdOn: dateKey(today), checkIns: [], notes: {} };
}

export function updateHabitFromDraft(habit: Habit, draft: HabitDraft, today: Date): Habit {
  const settings = settingsFromDraft(draft);
  const initialized = initializeEntries(habit);
  const next = { ...initialized, ...settings };
  const configuration = currentConfiguration(next);
  if (JSON.stringify(configuration) === JSON.stringify(currentConfiguration(habit))) return next;
  const effectiveOn = dateKey(today);
  return { ...next, configurationHistory: [...initialized.configurationHistory!.filter(item => item.effectiveOn !== effectiveOn), { effectiveOn, configuration }].sort((a, b) => (a.effectiveOn ?? '').localeCompare(b.effectiveOn ?? '')) };
}
