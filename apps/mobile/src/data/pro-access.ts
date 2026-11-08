import { type HabitSnapshot } from './habit-archive';
import { type HabitAction } from './habit-actions';
import { type AppPreferences, DEFAULT_PREFERENCES } from './app-preferences';
import { habitReminderTimes } from './reminder-settings';

export type Entitlement =
  | { status: 'loading' | 'unavailable' }
  | { status: 'verified'; tier: 'free' | 'pro' };

// There is deliberately no environment flag, local preference or preview-plan
// selection that grants Pro. L19 replaces this adapter with purchase verification.
export interface EntitlementAdapter { read(): Promise<Entitlement> }
export const purchaseAdapter: EntitlementAdapter = {
  async read() { return { status: 'verified', tier: 'free' }; },
};
export const FREE_ACCESS: Entitlement = { status: 'verified', tier: 'free' };
export const PRO_ACCESS: Entitlement = { status: 'verified', tier: 'pro' };

// Confirmed L05 policy. Keep limits together rather than in individual screens.
export const FREE_HABIT_LIMIT = 4;
export function reminderLimit(entitlement: Entitlement) { return hasProAccess(entitlement) ? 3 : 1; }
export const PRO_CAPABILITIES = {
  'active-habits': { title: 'Unlimited number of habits', description: 'Free includes four active habits. Archive one or explore Pro to add another.' },
  analytics: { title: 'Charts & Statistics', description: 'See your consistency and progress over time.' },
  'wallpaper-export': { title: 'Streak-based wallpapers', description: 'Earn the milestone, then export your wallpaper with Pro.' },
  'icloud-sync': { title: 'iCloud Sync', description: 'Optional cross-device iCloud sync is planned for Pro.' },
  'dashboard-customization': { title: 'Dashboard Customization', description: 'Choose which streaks, goals and categories you see.' },
  'multiple-reminders': { title: 'Multiple Reminders', description: 'Set more than one reminder for the same habit.' },
  widgets: { title: 'Home Screen Widgets', description: 'Keep your favourite habit on your home screen.' },
} as const;
export type ProCapability = keyof typeof PRO_CAPABILITIES;
export type Capability = ProCapability | 'tracking' | 'history' | 'notes' | 'data-export' | 'data-restore'
  | 'habit-sharing' | 'badge-sharing' | 'celebrations' | 'appearance';

export function hasProAccess(entitlement: Entitlement) {
  return entitlement.status === 'verified' && entitlement.tier === 'pro';
}
export function canUse(capability: Capability, entitlement: Entitlement) {
  return !Object.hasOwn(PRO_CAPABILITIES, capability) || hasProAccess(entitlement);
}
export function canExpireArchives(entitlement: Entitlement) {
  return entitlement.status === 'verified' && entitlement.tier === 'free';
}
export function loggingHabitIds(snapshot: HabitSnapshot, entitlement: Entitlement) {
  const active = snapshot.habits.filter(habit => !habit.archived).map(habit => habit.id);
  if (hasProAccess(entitlement)) return active;
  return [...new Set([...(snapshot.freeHabitIds ?? []).filter(id => active.includes(id)), ...active])].slice(0, FREE_HABIT_LIMIT);
}
export function canAddHabits(snapshot: HabitSnapshot, count: number, entitlement: Entitlement) {
  return hasProAccess(entitlement) || snapshot.habits.filter(habit => !habit.archived).length + count <= FREE_HABIT_LIMIT;
}
export function reconcileFreeHabits(snapshot: HabitSnapshot, entitlement: Entitlement): HabitSnapshot {
  if (hasProAccess(entitlement)) return snapshot;
  const ids = loggingHabitIds(snapshot, entitlement);
  return ids.length === snapshot.freeHabitIds?.length && ids.every((id, index) => id === snapshot.freeHabitIds![index])
    ? snapshot : { ...snapshot, freeHabitIds: ids };
}
export function actionAccessIssue(snapshot: HabitSnapshot, action: HabitAction, entitlement: Entitlement): ProCapability | null {
  if (action.type === 'create' || action.type === 'update') {
    const times = action.draft.reminderTime === null ? [] : [action.draft.reminderTime, ...(action.draft.extraReminderTimes ?? [])];
    const previous = action.type === 'update' ? snapshot.habits.find(habit => habit.id === action.id) : undefined;
    if (times.length > reminderLimit(entitlement) && (!previous || times.some(time => !habitReminderTimes(previous).includes(time)))) return 'multiple-reminders';
  }
  if (action.type === 'choose-free-habits' && action.ids.length > FREE_HABIT_LIMIT) return 'active-habits';
  if (action.type === 'select-wallpaper' && !canUse('wallpaper-export', entitlement)) return 'wallpaper-export';
  const restored = action.type === 'restore-all' ? snapshot.habits.filter(habit => habit.archived).length
    : action.type === 'restore' && snapshot.habits.some(habit => habit.id === action.id && habit.archived) ? 1 : 0;
  if ((action.type === 'create' || restored > 0) && !canAddHabits(snapshot, action.type === 'create' ? 1 : restored, entitlement)) return 'active-habits';
  if (['toggle-check-in', 'record-day', 'increment', 'save-note'].includes(action.type) && 'id' in action
    && snapshot.habits.some(habit => habit.id === action.id && !habit.archived)
    && !loggingHabitIds(snapshot, entitlement).includes(action.id)) return 'active-habits';
  return null;
}

export const PRO_PREFERENCE_KEYS = ['cardStreak', 'listStreak', 'monthStreak', 'showStreakGoal', 'showMonthLabels',
  'showDayLabels', 'showCategories', 'compactDays', 'compactNames'] as const satisfies readonly (keyof AppPreferences)[];
export function effectivePreferences(preferences: AppPreferences, entitlement: Entitlement): AppPreferences {
  if (canUse('dashboard-customization', entitlement)) return preferences;
  const effective = { ...preferences };
  for (const key of PRO_PREFERENCE_KEYS) Object.assign(effective, { [key]: DEFAULT_PREFERENCES[key] });
  return effective;
}
