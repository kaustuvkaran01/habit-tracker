import { pendingAchievements, type AchievementClaim } from '../data/achievement-events';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHabitPersistence } from '../data/habit-storage';
import { initializeEntries } from '../data/habit-entries';
import { recordingContext } from '../data/habit-recording';
import { type EntryValue } from '../data/habit-types';
import { reconcileRewards, type WallpaperEdition, type WallpaperMilestone } from '../data/habit-rewards';
import { reconcileArchive, type HabitSnapshot } from '../data/habit-archive';
import { applyHabitAction, type HabitAction } from '../data/habit-actions';
import { type HabitDraft } from '../data/habit-draft';
import { actionAccessIssue, reconcileFreeHabits, type Entitlement } from '../data/pro-access';
import { restoreBackup, type HabitBackup, type RestoreMode } from '../data/habit-backup';

const persistence = createHabitPersistence(AsyncStorage);
export default function useHabitStore(today: Date, entitlement: Entitlement) {
  const [snapshot, setSnapshot] = useState<HabitSnapshot>({ habits: [], retainedCollections: [] });
  const [persistedSnapshot, setPersistedSnapshot] = useState<HabitSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latestSnapshot = useRef(snapshot), latestToday = useRef(today);
  const loaded = useRef(false), alive = useRef(true), revision = useRef(0), newHabitCounter = useRef(0);
  const maintenance = useRef(false);
  latestToday.current = today;
  const latestAccess = useRef(entitlement);
  latestAccess.current = entitlement;

  const save = useCallback(async (next: HabitSnapshot): Promise<boolean> => {
    const current = ++revision.current;
    if (alive.current) setSaving(true);
    try {
      await persistence.save(next);
      if (alive.current) setPersistedSnapshot(next);
      if (alive.current && revision.current === current) setError(null);
      return true;
    } catch {
      if (alive.current && revision.current === current) setError('save');
      return false;
    } finally { if (alive.current && revision.current === current) setSaving(false); }
  }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (loaded.current) return;
    let cancelled = false;
    void persistence.load().then(saved => {
      if (cancelled || maintenance.current) return;
      const habits = (saved?.habits ?? []).map(habit => reconcileRewards(initializeEntries(habit), latestToday.current));
      const next = reconcileFreeHabits(reconcileArchive({ ...saved, habits, retainedCollections: saved?.retainedCollections ?? [] }, latestToday.current, latestAccess.current), latestAccess.current);
      latestSnapshot.current = next;
      loaded.current = true;
      setSnapshot(next); setError(null); setHydrated(true);
      void save(next);
    }).catch(() => { if (!cancelled) setError('load'); });
    return () => { cancelled = true; };
  }, [attempt, save]);
  useEffect(() => {
    if (!loaded.current || maintenance.current) return;
    const next = reconcileFreeHabits(reconcileArchive(latestSnapshot.current, today, entitlement), entitlement);
    if (next !== latestSnapshot.current) { latestSnapshot.current = next; setSnapshot(next); void save(next); }
  }, [hydrated, today, entitlement, save]);

  const dispatch = useCallback(async (action: HabitAction): Promise<boolean> => {
    if (!loaded.current || maintenance.current) return false;
    if (actionAccessIssue(latestSnapshot.current, action, latestAccess.current)) return false;
    const context = recordingContext();
    let next: HabitSnapshot;
    try { next = reconcileFreeHabits(reconcileArchive(applyHabitAction(latestSnapshot.current, action, latestToday.current, context), latestToday.current, latestAccess.current), latestAccess.current); }
    catch { return false; }
    if (next === latestSnapshot.current) return action.type === 'acknowledge-achievements' ? save(next) : true;
    latestSnapshot.current = next;
    setSnapshot(next);
    // Persist this exact result, so retries save state rather than reapplying an increment.
    return save(next);
  }, [today, save]);
  const claimAchievement = useCallback(async (id: string): Promise<AchievementClaim> => {
    if (!loaded.current || !pendingAchievements(latestSnapshot.current).some(item => item.event.id === id)) return 'missing';
    return await dispatch({ type: 'acknowledge-achievements', eventId: id }) ? 'claimed' : 'failed';
  }, [dispatch]);
  const dismissAchievements = useCallback(() => dispatch({ type: 'acknowledge-achievements' }), [dispatch]);
  const actions = useMemo(() => ({
    createHabit: (draft: HabitDraft) => dispatch({ type: 'create', id: `habit-${Date.now()}-${++newHabitCounter.current}`, draft }),
    updateHabit: (id: string, draft: HabitDraft) => dispatch({ type: 'update', id, draft }),
    toggleCheckIn: (id: string, day: string) => dispatch({ type: 'toggle-check-in', id, day }),
    recordDay: (id: string, day: string, value: EntryValue, note?: string) => dispatch({ type: 'record-day', id, day, value, note }),
    increment: (id: string, day: string) => dispatch({ type: 'increment', id, day }),
    saveNote: (id: string, day: string, note: string) => dispatch({ type: 'save-note', id, day, note }),
    archiveHabit: (id: string) => dispatch({ type: 'archive', id }),
    restoreHabit: (id: string) => dispatch({ type: 'restore', id }),
    restoreAll: () => dispatch({ type: 'restore-all' }),
    chooseFreeHabits: (ids: string[]) => dispatch({ type: 'choose-free-habits', ids }),
    moveHabit: (id: string, direction: -1 | 1) => dispatch({ type: 'move', id, direction }),
    moveHabitTo: (id: string, targetId: string) => dispatch({ type: 'move-to', id, targetId }),
    selectWallpaper: (id: string, days: WallpaperMilestone, edition: WallpaperEdition) => dispatch({ type: 'select-wallpaper', id, days, edition }),
    startNextCycle: (id: string) => dispatch({ type: 'start-next-cycle', id }),
  }), [dispatch]);
  const retry = useCallback(async () => {
    if (maintenance.current) return false;
    if (loaded.current) return save(latestSnapshot.current);
    setError(null); setAttempt(value => value + 1); return false;
  }, [save]);
  const importBackup = useCallback(async (backup: HabitBackup, mode: RestoreMode) => {
    if (maintenance.current || (!loaded.current && mode !== 'replace')) return false;
    maintenance.current = true; ++revision.current; setSaving(true);
    try {
      const next = restoreBackup(loaded.current ? latestSnapshot.current : null, backup, mode, latestToday.current, latestAccess.current);
      await persistence.save(next);
      latestSnapshot.current = next; loaded.current = true;
      setSnapshot(next); setPersistedSnapshot(next); setHydrated(true); setError(null);
      return true;
    } catch { return false; }
    finally { maintenance.current = false; setSaving(false); }
  }, []);
  const prepareForErase = useCallback(async () => { maintenance.current = true; ++revision.current; await persistence.flush(); }, []);
  return { ...snapshot, persistedSnapshot, actions, importBackup, prepareForErase, claimAchievement, dismissAchievements, hydrated, saving, storageError: error, retryStorage: retry };
}
