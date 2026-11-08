import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Habit } from '../data/habit-types';

export type FeedbackKind = 'press' | 'selection' | 'completion' | 'undo' | 'success' | 'longPress' | 'warning' | 'error';
const PREFERENCE_KEY = '@habit-tracker/haptics/v1';
const priority: Record<FeedbackKind, number> = { press: 1, selection: 1, undo: 1, completion: 2, longPress: 2, success: 3, warning: 3, error: 3 };
let enabled = true;
let ready = false;
let frozen = false;
let preferenceRevision = 0;
let loading: Promise<void> | undefined;
let saving: Promise<unknown> = Promise.resolve();
let lastTime = -Infinity;
let lastPriority = 0;
const listeners = new Set<() => void>();

export function feedback(kind: FeedbackKind = 'press'): void {
  if (!ready || !enabled || Platform.OS === 'web' || (AppState.currentState && AppState.currentState !== 'active')) return;
  const now = Date.now();
  if (now >= lastTime && now - lastTime < 80 && priority[kind] <= lastPriority) return;
  lastTime = now;
  lastPriority = priority[kind];
  try {
    let result: Promise<void>;
    if (Platform.OS === 'android') {
      const effects: Record<FeedbackKind, Haptics.AndroidHaptics> = {
        press: Haptics.AndroidHaptics.Context_Click, selection: Haptics.AndroidHaptics.Segment_Tick,
        completion: Haptics.AndroidHaptics.Confirm, undo: Haptics.AndroidHaptics.Clock_Tick,
        success: Haptics.AndroidHaptics.Confirm, longPress: Haptics.AndroidHaptics.Long_Press,
        warning: Haptics.AndroidHaptics.Reject, error: Haptics.AndroidHaptics.Reject,
      };
      result = Haptics.performAndroidHapticsAsync(effects[kind]);
    } else if (kind === 'selection') result = Haptics.selectionAsync();
    else if (kind === 'success' || kind === 'warning' || kind === 'error') {
      result = Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success
        : kind === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error);
    } else result = Haptics.impactAsync(kind === 'press' ? Haptics.ImpactFeedbackStyle.Soft
      : kind === 'undo' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    void result.catch(() => undefined);
  } catch { /* Unsupported devices must never interrupt an action. */ }
}

export function completionFeedbackFor(before: Habit, after: Habit, key: string): FeedbackKind | null {
  const wasComplete = before.checkIns.includes(key);
  const isComplete = after.checkIns.includes(key);
  if (wasComplete === isComplete) return null;
  if (!isComplete) return 'undo';
  // Reward feedback belongs to the reveal after its delivery claim is saved.
  return 'completion';
}

export const getHapticsEnabled = () => enabled;
export function subscribeHaptics(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function initializeHaptics(): Promise<void> {
  if (!loading) {
    const revision = preferenceRevision;
    loading = AsyncStorage.getItem(PREFERENCE_KEY).then((value) => {
      if (preferenceRevision === revision) enabled = value === null || value === 'on';
    }).catch(() => { if (preferenceRevision === revision) enabled = false; }).then(() => {
      ready = true;
      listeners.forEach((listener) => listener());
    });
  }
  return loading;
}

export async function setHapticsEnabled(value: boolean): Promise<void> {
  if (frozen) return;
  if (ready && enabled === value) return;
  const revision = ++preferenceRevision;
  enabled = value;
  ready = true;
  listeners.forEach((listener) => listener());
  if (value) feedback('selection');
  const write = saving.catch(() => undefined).then(() => AsyncStorage.setItem(PREFERENCE_KEY, value ? 'on' : 'off'));
  saving = write;
  try { await write; } catch (error) {
    if (revision === preferenceRevision) throw error;
  }
}

export async function prepareHapticsForErase() {
  frozen = true;
  await Promise.allSettled([loading, saving]);
}
export function resetHapticsAfterErase() {
  preferenceRevision++; frozen = false; enabled = true; ready = false; loading = undefined;
  saving = Promise.resolve(); lastTime = -Infinity; lastPriority = 0;
}
