import { acknowledgeAchievements, enqueueAchievements } from './achievement-events';
import { type Habit, type EntryValue, type RecordingContext } from './habit-types';
import { completionDates, configurationOn, initializeEntries, latestRecord } from './habit-entries';
import { canCheckIn } from './habit-calendar';
import { habitFromDraft, updateHabitFromDraft, type HabitDraft } from './habit-draft';
import { archiveHabit, restoreHabit, type HabitSnapshot } from './habit-archive';
import { moveActiveHabit, moveHabitTo } from './habit-order';
import { reconcileRewards, selectWallpaper, startNextRewardCycle, type WallpaperEdition, type WallpaperMilestone } from './habit-rewards';

export type HabitAction =
  | { type: 'acknowledge-achievements'; eventId?: string }
  | { type: 'create'; id: string; draft: HabitDraft }
  | { type: 'update'; id: string; draft: HabitDraft }
  | { type: 'toggle-check-in'; id: string; day: string }
  | { type: 'record-day'; id: string; day: string; value: EntryValue; note?: string }
  | { type: 'increment'; id: string; day: string }
  | { type: 'save-note'; id: string; day: string; note: string }
  | { type: 'archive' | 'restore' | 'start-next-cycle'; id: string }
  | { type: 'restore-all' }
  | { type: 'choose-free-habits'; ids: string[] }
  | { type: 'move'; id: string; direction: -1 | 1 }
  | { type: 'move-to'; id: string; targetId: string }
  | { type: 'select-wallpaper'; id: string; days: WallpaperMilestone; edition: WallpaperEdition };

// Pure transitions shared by application entry points. Persistence and UI effects
// stay outside the reducer; replaying React updaters must not generate IDs/haptics.
function transition(snapshot: HabitSnapshot, action: HabitAction, today: Date, context?: RecordingContext): HabitSnapshot {
  function replaceHabits(habits: Habit[]) {
    return habits.every((habit, index) => habit === snapshot.habits[index]) && habits.length === snapshot.habits.length
      ? snapshot : { ...snapshot, habits };
  }
  function update(id: string, change: (habit: Habit) => Habit) {
    return replaceHabits(snapshot.habits.map(habit => habit.id === id ? change(habit) : habit));
  }
  switch (action.type) {
    case 'acknowledge-achievements': return acknowledgeAchievements(snapshot, action.eventId);
    case 'choose-free-habits': {
      if (new Set(action.ids).size !== action.ids.length || !action.ids.every(id => snapshot.habits.some(habit => habit.id === id && !habit.archived))) throw new Error('Choose active habits.');
      return { ...snapshot, freeHabitIds: [...action.ids] };
    }
    case 'create': {
      if (!action.id || [...snapshot.habits, ...snapshot.retainedCollections].some(habit => habit.id === action.id)) {
        throw new Error('Habit ID must be unique.');
      }
      return { ...snapshot, habits: [habitFromDraft(action.draft, today, action.id), ...snapshot.habits] };
    }
    case 'update':
      return update(action.id, habit => reconcileRewards(updateHabitFromDraft(habit, action.draft, today), today));
    case 'toggle-check-in':
    case 'increment':
    case 'record-day':
      return update(action.id, original => {
        if (!canCheckIn(original, action.day, today)) return original;
        if (!context) throw new Error('Recording context required.');
        const habit = initializeEntries(original);
        const records = habit.entries![action.day] ?? [];
        if (records.some(record => record.id === context.id)) return original;
        const configuration = configurationOn(habit, action.day);
        const current = latestRecord(habit, action.day);
        let value: EntryValue;
        if (action.type === 'record-day') value = action.value;
        else if (action.type === 'increment') {
          if (configuration.tracking.kind === 'yes-no' || current?.value.kind === 'legacy-complete') throw new Error('Enter a total for this day.');
          value = { kind: 'amount', amount: (current?.value.kind === 'amount' ? current.value.amount : 0) + 1 };
        } else {
          if (configuration.tracking.kind !== 'yes-no') throw new Error('Enter a total for this day.');
          value = original.checkIns.includes(action.day) ? { kind: 'clear' } : { kind: 'yes-no', complete: true };
        }
        if (value.kind === 'amount' && (configuration.tracking.kind === 'yes-no' || !Number.isFinite(value.amount) || value.amount < 0
          || (configuration.tracking.kind === 'count' && !Number.isSafeInteger(value.amount)))) throw new Error('Enter a valid amount.');
        if (value.kind === 'yes-no' && configuration.tracking.kind !== 'yes-no') throw new Error('Enter a total for this day.');
        if (value.kind === 'legacy-complete' && !records.some(record => record.value.kind === 'legacy-complete')) throw new Error('An amount is required.');
        const entry = { ...context, value, configuration, source: 'user' as const };
        const notes = { ...habit.notes };
        if (action.type === 'record-day' && action.note !== undefined) {
          if (action.note) notes[action.day] = action.note;
          else delete notes[action.day];
        }
        const next = { ...habit, notes, entries: { ...habit.entries, [action.day]: [...records, entry] } };
        return reconcileRewards({ ...next, checkIns: completionDates(next) }, today);
      });
    case 'save-note':
      return update(action.id, habit => {
        const notes = { ...habit.notes };
        if (action.note) notes[action.day] = action.note;
        else delete notes[action.day];
        return { ...habit, notes };
      });
    case 'archive': return update(action.id, habit => archiveHabit(habit, today));
    case 'restore': return update(action.id, restoreHabit);
    case 'restore-all': return replaceHabits(snapshot.habits.map(restoreHabit));
    case 'move': return replaceHabits(moveActiveHabit(snapshot.habits, action.id, action.direction));
    case 'move-to': return replaceHabits(moveHabitTo(snapshot.habits, action.id, action.targetId));
    case 'start-next-cycle': return update(action.id, habit => startNextRewardCycle(habit, today));
    case 'select-wallpaper': {
      const next = update(action.id, habit => selectWallpaper(habit, action.days, action.edition));
      const retainedCollections = next.retainedCollections.map(habit => habit.id === action.id ? selectWallpaper(habit, action.days, action.edition) : habit);
      return retainedCollections.every((habit, index) => habit === next.retainedCollections[index]) ? next : { ...next, retainedCollections };
    }
  }
}

export function applyHabitAction(snapshot: HabitSnapshot, action: HabitAction, today: Date, context?: RecordingContext): HabitSnapshot {
  const next = transition(snapshot, action, today, context);
  return next !== snapshot && context && ['record-day', 'increment', 'toggle-check-in'].includes(action.type)
    ? enqueueAchievements(snapshot, next, context.recordedAt) : next;
}
