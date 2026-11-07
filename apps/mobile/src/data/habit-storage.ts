import { type Habit } from './sample-habits';
import { isDateKey, type HabitRewards, type RetainedCollection, WALLPAPER_MILESTONES } from './habit-rewards';
import { normalizedHabitEmoji } from './habit-emoji';
import { type HabitSnapshot } from './habit-archive';

export const HABIT_STORAGE_KEY = '@habit-tracker/state/v1';
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const positiveInteger = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const icons = new Set(['pulse', 'workout', 'book', 'moon', 'leaf', 'target', 'emoji']);
const color = (value: unknown) => text(value) && /^#[\da-f]{6}$/i.test(value);
const optional = (value: unknown, check: (item: unknown) => boolean) => value === undefined || check(value);
const iconFields = (value: ObjectValue) => icons.has(value.icon as string)
  && (value.icon !== 'emoji' || (text(value.emoji) && !!normalizedHabitEmoji(value.emoji)));

function validRewards(value: unknown): value is HabitRewards {
  if (!object(value) || !positiveInteger(value.cycle) || !optional(value.cycleStartsOn, isDateKey)
    || !Array.isArray(value.wallpapers) || !Array.isArray(value.badges)) return false;
  const cycle = value.cycle as number;
  if (!value.wallpapers.every((entry) => object(entry) && WALLPAPER_MILESTONES.includes(entry.days as never)
    && positiveInteger(entry.cycle) && (entry.cycle as number) <= cycle && isDateKey(entry.earnedOn))) return false;
  const rewards = value as unknown as HabitRewards;
  if (new Set(rewards.wallpapers.map((entry) => `${entry.cycle}:${entry.days}`)).size !== rewards.wallpapers.length) return false;
  if (!value.badges.every((entry) => object(entry) && text(entry.id) && positiveInteger(entry.cycle)
    && (entry.cycle as number) <= cycle && isDateKey(entry.earnedOn) && text(entry.habitName) && color(entry.habitColor)
    && icons.has(entry.habitIcon as string) && (entry.habitIcon !== 'emoji' || (text(entry.habitEmoji) && !!normalizedHabitEmoji(entry.habitEmoji))))) return false;
  if (new Set(rewards.badges.map((entry) => entry.id)).size !== rewards.badges.length
    || new Set(rewards.badges.map((entry) => entry.cycle)).size !== rewards.badges.length) return false;
  if (!optional(value.selectedWallpaperEdition, (edition) => edition === 'landscape' || edition === 'quote')
    || (value.selectedWallpaperEdition === 'quote' && (typeof value.selectedWallpaper !== 'number' || value.selectedWallpaper > 45))) return false;
  return value.selectedWallpaper === undefined || rewards.wallpapers.some((entry) => entry.days === value.selectedWallpaper);
}

function validHabit(value: unknown): value is Habit {
  if (!object(value) || !text(value.id) || !value.id || !text(value.name) || !text(value.description)
    || !color(value.color) || !iconFields(value) || !Array.isArray(value.checkIns) || !value.checkIns.every(isDateKey)
    || !object(value.notes) || !Object.entries(value.notes).every(([key, note]) => isDateKey(key) && text(note))) return false;
  if (!optional(value.createdOn, isDateKey) || !optional(value.archived, (item) => typeof item === 'boolean')
    || !optional(value.archivedOn, (item) => value.archived === true && isDateKey(item))
    || !optional(value.habitType, (item) => item === 'build' || item === 'quit')
    || !optional(value.repeatDays, (item) => Array.isArray(item) && item.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))
    || !optional(value.categories, (item) => Array.isArray(item) && item.every(text))
    || !optional(value.reminderTime, (item) => item === null || (text(item) && /^([01]\d|2[0-3]):[0-5]\d$/.test(item)))
    || !optional(value.rewards, validRewards)) return false;
  return optional(value.tracking, (item) => object(item) && ['yes-no', 'count', 'measure'].includes(item.kind as string)
    && optional(item.target, (target) => typeof target === 'number' && Number.isFinite(target) && target >= 0)
    && optional(item.unit, text) && optional(item.onTap, (tap) => tap === 'add-one' || tap === 'enter-total'));
}

function validCollection(value: unknown): value is RetainedCollection {
  return object(value) && text(value.id) && !!value.id && text(value.name)
    && color(value.color) && iconFields(value) && validRewards(value.rewards);
}

export function decodeHabits(raw: string): HabitSnapshot {
  const value: unknown = JSON.parse(raw);
  const invalid = () => new Error('Saved habits could not be read.');
  if (!object(value) || value.version !== 1 || !Array.isArray(value.habits) || !value.habits.every(validHabit)) throw invalid();
  const retainedCollections = value.retainedCollections === undefined ? [] : value.retainedCollections;
  if (!Array.isArray(retainedCollections) || !retainedCollections.every(validCollection)) throw invalid();
  const ids = [...value.habits, ...retainedCollections].map((habit) => habit.id);
  if (new Set(ids).size !== ids.length) throw invalid();
  return { habits: value.habits, retainedCollections };
}

export function encodeHabits(snapshot: HabitSnapshot): string {
  const raw = JSON.stringify({ version: 1, ...snapshot });
  decodeHabits(raw);
  return raw;
}

export function createHabitPersistence(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> }) {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    async load(): Promise<HabitSnapshot | null> {
      await queue.catch(() => undefined);
      const raw = await storage.getItem(HABIT_STORAGE_KEY);
      return raw === null ? null : decodeHabits(raw);
    },
    async save(snapshot: HabitSnapshot): Promise<unknown> {
      const raw = encodeHabits(snapshot);
      const write = queue.catch(() => undefined).then(() => storage.setItem(HABIT_STORAGE_KEY, raw));
      queue = write;
      return write;
    },
  };
}
