import { createTranslator, resolveLocale } from '../i18n/locale';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AppPreferences, decodePreferences, DEFAULT_PREFERENCES } from '../data/app-preferences';
import { canUse, effectivePreferences, PRO_PREFERENCE_KEYS } from '../data/pro-access';
import { useProAccess } from './pro-access';

const KEY = '@habit-tracker/preferences/v1';
const Context = createContext<{ preferences: AppPreferences; persistedPreferences: AppPreferences | null; update: (patch: Partial<AppPreferences>) => Promise<boolean>; retryPreferences: () => void; prepareForErase: () => Promise<void> }>({
  preferences: DEFAULT_PREFERENCES, persistedPreferences: null, async update() { return false; }, retryPreferences() {}, async prepareForErase() {},
});
export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const access = useProAccess();
  const latestAccess = useRef(access);
  latestAccess.current = access;
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [persistedPreferences, setPersistedPreferences] = useState<AppPreferences | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(preferences);
  const touched = useRef(new Set<keyof AppPreferences>());
  const loaded = useRef(false);
  const alive = useRef(true);
  const frozen = useRef(false);
  const queue = useRef(Promise.resolve());

  function persist(value: AppPreferences) {
    if (frozen.current) return Promise.resolve(false);
    const t = createTranslator(resolveLocale(value.language));
    const operation = queue.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(value))).then(() => {
      if (alive.current) setPersistedPreferences(value);
      return true;
    }).catch(() => {
      Alert.alert(t('Settings not saved'), t('Your settings apply for this session. Please try changing the setting again.'));
      return false;
    });
    queue.current = operation.then(() => undefined);
    return operation;
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    const t = (text: string) => createTranslator(resolveLocale(latest.current.language))(text);
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (!active || frozen.current) return;
      const saved = raw ? decodePreferences(raw) : DEFAULT_PREFERENCES;
      const merged = { ...saved };
      for (const key of touched.current) Object.assign(merged, { [key]: latest.current[key] });
      latest.current = merged;
      loaded.current = true;
      setPreferences(merged);
      setPersistedPreferences(saved);
      if (touched.current.size) persist(merged);
    }).catch(() => {
      if (active && !frozen.current) {
        loaded.current = false;
        Alert.alert(t('Settings unavailable'), t('Saved settings could not be loaded. Your habit history is safe.'));
      }
    });
    return () => { active = false; };
  }, [attempt]);

  function update(patch: Partial<AppPreferences>) {
    if (frozen.current) return Promise.resolve(false);
    if (!canUse('dashboard-customization', latestAccess.current) && PRO_PREFERENCE_KEYS.some(key => Object.hasOwn(patch, key))) return Promise.resolve(false);
    const t = createTranslator(resolveLocale(latest.current.language));
    for (const key of Object.keys(patch) as (keyof AppPreferences)[]) touched.current.add(key);
    const next = { ...latest.current, ...patch };
    if (!next.showViewBar && !next.swipeViews) {
      Alert.alert(t('Keep a way to change views'), t('Keep the bottom bar or swipe navigation enabled.'));
      return Promise.resolve(false);
    }
    latest.current = next;
    setPreferences(next);
    return loaded.current ? persist(next) : Promise.resolve(false);
  }
  return <Context.Provider value={{ preferences: effectivePreferences(preferences, access), persistedPreferences, update,
    async prepareForErase() { frozen.current = true; await queue.current.catch(() => undefined); },
    retryPreferences() { setAttempt(value => value + 1); } }}>{children}</Context.Provider>;
}
export function useAppPreferences() { return useContext(Context); }
