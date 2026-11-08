import { achievementId } from './achievement-events';
import { initializeEntries } from './habit-entries';
import { HABIT_ICON_NAMES } from './habit-icons';
import { type Habit } from './habit-types';
import { isDateKey, type HabitRewards, type RetainedCollection, WALLPAPER_MILESTONES } from './habit-rewards';
import { normalizedHabitEmoji } from './habit-emoji';
import { type HabitSnapshot } from './habit-archive';

export const HABIT_STORAGE_KEY = '@habit-tracker/state/v2';
export const LEGACY_HABIT_STORAGE_KEY = '@habit-tracker/state/v1';
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): value is ObjectValue => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const positiveInteger = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const icons = new Set([...HABIT_ICON_NAMES, 'emoji']);
const color = (value: unknown) => text(value) && /^#[\da-f]{6}$/i.test(value);
const optional = (value: unknown, check: (item: unknown) => boolean) => value === undefined || check(value);
const iconFields = (value: ObjectValue) => icons.has(value.icon as string)
  && (value.icon !== 'emoji' || (text(value.emoji) && !!normalizedHabitEmoji(value.emoji)));

function validAchievementId(value: unknown): boolean {
  if (!text(value)) return false;
  try {
    const parts: unknown = JSON.parse(value);
    return Array.isArray(parts) && parts.length === 4 && text(parts[0]) && !!parts[0]
      && ['wallpaper', 'badge'].includes(parts[1]) && positiveInteger(parts[2])
      && WALLPAPER_MILESTONES.includes(parts[3]) && (parts[1] !== 'badge' || parts[3] === 90)
      && value === achievementId(parts[0], parts[1], parts[2], parts[3]);
  } catch { return false; }
}
function validDelivery(value: unknown): boolean {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.pending) || !Array.isArray(value.handled)) return false;
  if (!value.handled.every(validAchievementId) || !value.pending.every(event => object(event) && validAchievementId(event.id)
    && ['wallpaper', 'badge'].includes(String(event.kind)) && positiveInteger(event.cycle) && WALLPAPER_MILESTONES.includes(event.days as never)
    && (event.kind !== 'badge' || event.days === 90) && isDateKey(event.earnedOn)
    && text(event.queuedAt) && /^\d{4}-\d{2}-\d{2}T/.test(event.queuedAt) && Number.isFinite(Date.parse(event.queuedAt)))) return false;
  const ids = [...value.handled, ...value.pending.map(event => (event as ObjectValue).id)];
  return new Set(ids).size === ids.length;
}
function deliveryMatches(habit: { id: string; rewards?: HabitRewards }): boolean {
  const rewards = habit.rewards, delivery = rewards?.delivery;
  if (!rewards || !delivery) return true;
  return delivery.handled.every(id => JSON.parse(id)[0] === habit.id) && delivery.pending.every(event =>
    event.id === achievementId(habit.id, event.kind, event.cycle, event.days) && event.cycle <= rewards.cycle
    && (event.kind === 'wallpaper'
      ? rewards.wallpapers.some(item => item.cycle === event.cycle && item.days === event.days && item.earnedOn === event.earnedOn)
      : rewards.badges.some(item => item.cycle === event.cycle && item.earnedOn === event.earnedOn)));
}

function validRewards(value: unknown): value is HabitRewards {
  if (!object(value) || !optional(value.delivery, validDelivery) || !positiveInteger(value.cycle) || !optional(value.cycleStartsOn, isDateKey)
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

function validConfiguration(value: unknown): boolean {
  if (!object(value) || !['build', 'quit'].includes(String(value.habitType)) || !Array.isArray(value.repeatDays)
    || !value.repeatDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6) || !object(value.tracking)) return false;
  const tracking = value.tracking;
  return ['yes-no', 'count', 'measure'].includes(String(tracking.kind))
    && optional(tracking.target, target => typeof target === 'number' && Number.isFinite(target) && target >= 0)
    && optional(tracking.unit, text) && optional(tracking.onTap, tap => tap === 'add-one' || tap === 'enter-total');
}
const timestamp = (value: unknown) => value === null || (text(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)));
function validEntries(value: unknown): boolean {
  if (!object(value)) return false;
  const ids = new Set<string>();
  return Object.entries(value).every(([day, records]) => isDateKey(day) && Array.isArray(records) && records.length > 0 && records.every(record => {
    if (!object(record) || !text(record.id) || !record.id || ids.has(record.id) || !validConfiguration(record.configuration)
      || !timestamp(record.recordedAt) || !timestamp(record.occurredAt) || !(record.timezone === null || text(record.timezone))
      || !(record.utcOffsetMinutes === null || (typeof record.utcOffsetMinutes === 'number' && Number.isInteger(record.utcOffsetMinutes) && Math.abs(record.utcOffsetMinutes) <= 1440))
      || !['user', 'legacy'].includes(String(record.source)) || !object(record.value)) return false;
    ids.add(record.id);
    if (record.source === 'user' && record.recordedAt === null) return false;
    const entry = record.value;
    if (entry.kind === 'clear' || entry.kind === 'legacy-complete') return true;
    const configuration = record.configuration as { tracking: { kind: string } };
    if (entry.kind === 'yes-no') return configuration.tracking.kind === 'yes-no' && typeof entry.complete === 'boolean';
    return entry.kind === 'amount' && configuration.tracking.kind !== 'yes-no' && typeof entry.amount === 'number' && Number.isFinite(entry.amount) && entry.amount >= 0
      && (configuration.tracking.kind !== 'count' || Number.isSafeInteger(entry.amount));
  }));
}
function validHistory(value: unknown): boolean {
  if (!Array.isArray(value) || !value.length) return false;
  let previous: string | null = null;
  return value.every((revision, index) => {
    if (!object(revision) || !validConfiguration(revision.configuration)) return false;
    const day = revision.effectiveOn;
    if (day === null) return index === 0;
    if (!isDateKey(day) || (previous !== null && day <= previous)) return false;
    previous = day;
    return true;
  });
}

function validHabit(value: unknown): value is Habit {
  if (!object(value) || !text(value.id) || !value.id || !text(value.name) || !text(value.description)
    || !color(value.color) || !iconFields(value) || !Array.isArray(value.checkIns) || !value.checkIns.every(isDateKey)
    || !object(value.notes) || !Object.entries(value.notes).every(([key, note]) => isDateKey(key) && text(note))) return false;
  if (!optional(value.demo, item => typeof item === 'boolean') || !optional(value.createdOn, isDateKey) || !optional(value.archived, (item) => typeof item === 'boolean')
    || !optional(value.archivedOn, (item) => value.archived === true && isDateKey(item))
    || !optional(value.archiveProtected, item => value.archived === true && typeof item === 'boolean')
    || !optional(value.archiveRecoveryOn, item => value.archived === true && isDateKey(item))
    || !optional(value.habitType, (item) => item === 'build' || item === 'quit')
    || !optional(value.repeatDays, (item) => Array.isArray(item) && item.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))
    || !optional(value.categories, (item) => Array.isArray(item) && item.every(text))
    || !optional(value.reminderTime, (item) => item === null || (text(item) && /^([01]\d|2[0-3]):[0-5]\d$/.test(item)))
    || !optional(value.reminderTimes, item => Array.isArray(item) && item.length <= 3 && new Set(item).size === item.length && item.every(time => text(time) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
    || !optional(value.reminderDiscreet, item => typeof item === 'boolean')
    || !optional(value.remindersPaused, item => typeof item === 'boolean')
    || !optional(value.rewards, validRewards) || !optional(value.entries, validEntries) || !optional(value.configurationHistory, validHistory)) return false;
  return deliveryMatches(value as unknown as Habit) && optional(value.tracking, (item) => object(item) && ['yes-no', 'count', 'measure'].includes(item.kind as string)
    && optional(item.target, (target) => typeof target === 'number' && Number.isFinite(target) && target >= 0)
    && optional(item.unit, text) && optional(item.onTap, (tap) => tap === 'add-one' || tap === 'enter-total'));
}

function validCollection(value: unknown): value is RetainedCollection {
  return object(value) && text(value.id) && !!value.id && text(value.name)
    && color(value.color) && iconFields(value) && validRewards(value.rewards) && deliveryMatches(value as unknown as RetainedCollection);
}

export function decodeHabits(raw: string): HabitSnapshot {
  const value: unknown = JSON.parse(raw);
  const invalid = () => new Error('Saved habits could not be read.');
  if (!object(value) || (value.version !== 1 && value.version !== 2) || !Array.isArray(value.habits) || !value.habits.every(validHabit)) throw invalid();
  const retainedCollections = value.retainedCollections === undefined ? [] : value.retainedCollections;
  if (!Array.isArray(retainedCollections) || !retainedCollections.every(validCollection)) throw invalid();
  const ids = [...value.habits, ...retainedCollections].map((habit) => habit.id);
  if (new Set(ids).size !== ids.length) throw invalid();
  const freeHabitIds = value.freeHabitIds;
  if (freeHabitIds !== undefined && (!Array.isArray(freeHabitIds) || !freeHabitIds.every(text) || new Set(freeHabitIds).size !== freeHabitIds.length)) throw invalid();
  return { habits: value.version === 1 ? value.habits.map(initializeEntries) : value.habits, retainedCollections,
    ...(freeHabitIds === undefined ? {} : { freeHabitIds }) };
}

export function encodeHabits(snapshot: HabitSnapshot): string {
  const raw = JSON.stringify({ version: 2, ...snapshot });
  decodeHabits(raw);
  return raw;
}

export function createHabitPersistence(storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> }) {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    async flush() { await queue.catch(() => undefined); },
    async load(): Promise<HabitSnapshot | null> {
      const read = queue.catch(() => undefined).then(async () => {
        const raw = await storage.getItem(HABIT_STORAGE_KEY);
        if (raw !== null) return decodeHabits(raw);
        const legacy = await storage.getItem(LEGACY_HABIT_STORAGE_KEY);
        if (legacy === null) return null;
        const migrated = decodeHabits(legacy);
        // Commit only a validated v2 snapshot; retain the untouched v1 source.
        await storage.setItem(HABIT_STORAGE_KEY, encodeHabits(migrated));
        return migrated;
      });
      queue = read;
      return read;
    },
    async save(snapshot: HabitSnapshot): Promise<unknown> {
      const raw = encodeHabits(snapshot);
      const write = queue.catch(() => undefined).then(() => storage.setItem(HABIT_STORAGE_KEY, raw));
      queue = write;
      return write;
    },
  };
}
