import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { createTranslator, resolveLocale } from '../i18n/locale';
import { useAppPreferences } from './app-preferences';
import { useProAccess } from './pro-access';
import { type HabitSnapshot } from '../data/habit-archive';
import { habitReminderTimes } from '../data/reminder-settings';
import { loggingHabitIds } from '../data/pro-access';
import { createReminderReconciler, planReminders, type ReminderTarget } from '../data/reminder-plan';
import { configureReminderPresentation, nativeReminderQueue, readReminderPermission, requestReminderPermission, watchReminderResponses, type ReminderPermission } from '../services/reminder-notifications';

type ReminderState = {
  permission: ReminderPermission; configured: boolean; scheduling: boolean; paused: boolean; failed: boolean; coverageUntil: number | null; queued: number;
  requestPermission: () => Promise<boolean>; openSettings: () => Promise<void>; retry: () => void;
  prepareForErase: () => Promise<void>;
};
const Context = createContext<ReminderState>({ permission: 'unavailable', configured: false, scheduling: false, paused: false, failed: false, coverageUntil: null, queued: 0,
  async requestPermission() { return false; }, async openSettings() {}, retry() {},
  async prepareForErase() {},
});

export function ReminderProvider({ snapshot, ready, navigationReady, onTarget, children }: {
  snapshot: HabitSnapshot | null; ready: boolean; navigationReady: boolean; onTarget: (target: ReminderTarget) => void; children: ReactNode;
}) {
  const { persistedPreferences } = useAppPreferences(), access = useProAccess();
  const locale = resolveLocale(persistedPreferences?.language ?? 'system'), t = createTranslator(locale);
  const [permission, setPermission] = useState<ReminderPermission>('loading');
  const [scheduling, setScheduling] = useState(false), [failed, setFailed] = useState(false);
  const [coverageUntil, setCoverageUntil] = useState<number | null>(null), [queued, setQueued] = useState(0);
  const [tick, setTick] = useState(0), [target, setTarget] = useState<ReminderTarget | null>(null);
  const [coordinator] = useState(() => createReminderReconciler(nativeReminderQueue));
  const alive = useRef(true), permissionRevision = useRef(0), requesting = useRef(false);
  const latestTarget = useRef(onTarget); latestTarget.current = onTarget;
  const foreground = useRef(AppState.currentState === 'active');
  const frozen = useRef(false);
  const retry = useCallback(() => { setTick(value => value + 1); }, []);
  const poll = useCallback(async () => {
    if (requesting.current || frozen.current) return;
    const revision = ++permissionRevision.current;
    const value = await readReminderPermission();
    if (alive.current && revision === permissionRevision.current) setPermission(value);
  }, []);
  useEffect(() => {
    alive.current = true;
    let removePresentation = () => {}, removeResponses = () => {};
    try { removePresentation = configureReminderPresentation(); removeResponses = watchReminderResponses(setTarget); }
    catch { setPermission('unavailable'); }
    void poll();
    const subscription = AppState.addEventListener('change', state => {
      foreground.current = state === 'active';
      if (foreground.current) { void poll(); retry(); }
    });
    const timer = setInterval(() => { if (foreground.current) { void poll(); retry(); } }, 60_000);
    return () => { alive.current = false; permissionRevision.current++; clearInterval(timer); subscription.remove(); removePresentation(); removeResponses(); coordinator.invalidate(); };
  }, [poll, retry, coordinator]);
  useEffect(() => { if (target && navigationReady) { latestTarget.current(target); setTarget(null); } }, [target, navigationReady]);
  // These owners publish immutable committed values with stable identities.
  // Depend on them directly; do not stringify private multi-year history on render.
  const paused = !ready || !snapshot || !persistedPreferences || access.status === 'loading';
  useEffect(() => {
    const reconciler = coordinator;
    if (frozen.current || !ready || !snapshot || !persistedPreferences || permission === 'unavailable' || permission === 'loading' || access.status === 'loading') { reconciler.invalidate(); setScheduling(false); return; }
    let cancelled = false;
    const plan = planReminders(snapshot, persistedPreferences.dailyReminder, access, new Date(), t);
    const active = permission === 'granted' ? plan : { ...plan, items: [] };
    setScheduling(true); setFailed(false); setCoverageUntil(null);
    void reconciler.sync(active).then(ok => {
      if (cancelled || !ok) return;
      setQueued(active.items.length); setCoverageUntil(active.items.length ? active.coverageUntil : null);
    }).catch(() => { if (!cancelled) { setFailed(true); setQueued(0); setCoverageUntil(null); } })
      .finally(() => { if (!cancelled) setScheduling(false); });
    return () => { cancelled = true; reconciler.invalidate(); };
    // Locale captures translated copy; callback/style identities are not inputs.
  }, [snapshot, persistedPreferences?.dailyReminder, access, locale, ready, permission, tick, coordinator]);

  const requestPermission = useCallback(async () => {
    requesting.current = true; permissionRevision.current++;
    const value = await requestReminderPermission();
    requesting.current = false;
    if (alive.current) { setPermission(value); retry(); }
    return value === 'granted';
  }, [retry]);
  async function openSettings() { try { await Linking.openSettings(); } catch { setFailed(true); } }
  const allowed = snapshot ? new Set(loggingHabitIds(snapshot, access)) : new Set<string>();
  const configured = !!(persistedPreferences?.dailyReminder.enabled || snapshot?.habits.some(habit => allowed.has(habit.id) && !habit.archived && !habit.demo && !habit.remindersPaused && habitReminderTimes(habit).length > 0));
  return <Context.Provider value={{ permission, configured, scheduling, paused, failed, coverageUntil, queued, requestPermission, openSettings,
    async prepareForErase() { frozen.current = true; coordinator.invalidate(); await coordinator.flush(); },
    retry() { void poll(); retry(); } }}>{children}</Context.Provider>;
}
export function useReminders() { return useContext(Context); }
