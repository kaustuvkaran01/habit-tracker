import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSampleHabits, type Habit } from '../data/sample-habits';
import { createHabitPersistence } from '../data/habit-storage';
import { reconcileRewards, selectWallpaper, type WallpaperEdition, type WallpaperMilestone } from '../data/habit-rewards';
import { reconcileArchive, type HabitSnapshot } from '../data/habit-archive';

const persistence = createHabitPersistence(AsyncStorage);

export default function useHabitStore(today: Date, hasPro: boolean) {
  const [snapshot, setSnapshot] = useState<HabitSnapshot>({ habits: [], retainedCollections: [] });
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latestSnapshot = useRef(snapshot);
  const latestToday = useRef(today);
  const alive = useRef(true);
  const revision = useRef(0);
  latestSnapshot.current = snapshot;
  latestToday.current = today;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    persistence.load().then((saved) => {
      if (cancelled) return;
      const habits = (saved?.habits ?? createSampleHabits(latestToday.current)).map((habit) => reconcileRewards(habit, latestToday.current));
      setSnapshot(reconcileArchive({ habits, retainedCollections: saved?.retainedCollections ?? [] }, latestToday.current, hasPro));
      setError(null);
      setHydrated(true);
    }).catch(() => { if (!cancelled) setError('load'); });
    return () => { cancelled = true; };
  }, [attempt, hydrated, hasPro]);

  useEffect(() => {
    if (hydrated) setSnapshot((current) => reconcileArchive(current, today, hasPro));
  }, [hydrated, today, hasPro]);

  function setHabits(update: (habits: Habit[]) => Habit[]) {
    setSnapshot((current) => ({ ...current, habits: update(current.habits) }));
  }

  function setWallpaper(id: string, days: WallpaperMilestone, edition: WallpaperEdition) {
    setSnapshot((current) => ({
      habits: current.habits.map((habit) => habit.id === id ? selectWallpaper(habit, days, edition) : habit),
      retainedCollections: current.retainedCollections.map((entry) => entry.id === id ? selectWallpaper(entry, days, edition) : entry),
    }));
  }

  const save = useCallback((snapshot: HabitSnapshot) => {
    const current = ++revision.current;
    persistence.save(snapshot).then(() => {
      if (alive.current && revision.current === current) setError(null);
    }).catch(() => {
      if (alive.current && revision.current === current) setError('save');
    });
  }, []);

  useEffect(() => { if (hydrated) save(snapshot); }, [snapshot, hydrated, save]);

  const retry = useCallback(() => {
    if (hydrated) save(latestSnapshot.current);
    else { setError(null); setAttempt((value) => value + 1); }
  }, [hydrated, save]);
  return { ...snapshot, setHabits, setWallpaper, hydrated, storageError: error, retryStorage: retry };
}
