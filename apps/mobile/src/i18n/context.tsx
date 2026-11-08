import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAppPreferences } from '../components/app-preferences';
import { createTranslator, resolveLocale } from './locale';

const Context = createContext(resolveLocale('system'));
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { preferences } = useAppPreferences();
  const [system, setSystem] = useState(() => Intl.DateTimeFormat().resolvedOptions().locale);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setSystem(Intl.DateTimeFormat().resolvedOptions().locale);
    });
    return () => subscription.remove();
  }, []);
  return <Context.Provider value={resolveLocale(preferences.language, system)}>{children}</Context.Provider>;
}
export function useTranslation() {
  const locale = useContext(Context);
  return { locale, t: createTranslator(locale) };
}
