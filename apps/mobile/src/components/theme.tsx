import { useTranslation } from '../i18n/context';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeChoice = 'Light' | 'Dark' | 'System';
const STORAGE_KEY = '@habit-tracker/theme/v1';

const dark = {
  background: '#101012', panel: '#19181D', raised: '#222226', control: '#29282F', selected: '#3F3B51',
  border: '#2D2C32', controlBorder: '#42404A', text: '#F1F0F4', icon: '#E2DFE9', muted: '#AFACB8', subtle: '#ACA9B5',
  accent: '#9185F9', accentText: '#BBAEFF', accentPanel: '#242035', onAccent: '#111021',
  disabled: '#504A80', disabledText: '#C1BBD9', error: '#FF9A9D',
};
const light: typeof dark = {
  background: '#F7F6FA', panel: '#FFFFFF', raised: '#F1EFF6', control: '#EBE8F2', selected: '#DED8EF',
  border: '#DDD9E5', controlBorder: '#C6C0D3', text: '#211E2A', icon: '#393349', muted: '#5A5367', subtle: '#625A70',
  accent: '#6252C1', accentText: '#5342AD', accentPanel: '#ECE7FC', onAccent: '#FFFFFF',
  disabled: '#DDD7EC', disabledText: '#665E76', error: '#A52B3C',
};

type ThemeMode = 'light' | 'dark';
const ThemeContext = createContext<{ choice: ThemeChoice; mode: ThemeMode; setChoice: (choice: ThemeChoice) => void; prepareForErase: () => Promise<void> }>({
  choice: 'Dark', mode: 'dark', setChoice: () => {}, async prepareForErase() {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const system = useColorScheme();
  const [choice, setChoice] = useState<ThemeChoice>('Dark');
  const changed = useRef(false);
  const frozen = useRef(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (active && !changed.current && (saved === 'Light' || saved === 'Dark' || saved === 'System')) setChoice(saved);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  function choose(next: ThemeChoice) {
    if (frozen.current) return;
    changed.current = true;
    setChoice(next);
    const write = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, next));
    const pending = write.catch(() => {
      if (writes.current === pending) Alert.alert(t('Theme preference not saved'), t('Your choice applies for this session. Select it again to retry saving.'));
    });
    writes.current = pending;
  }

  const mode = choice === 'System' ? system === 'light' ? 'light' : 'dark' : choice === 'Light' ? 'light' : 'dark';
  return <ThemeContext.Provider value={{ choice, mode, setChoice: choose, async prepareForErase() { frozen.current = true; await writes.current.catch(() => undefined); } }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  return { ...theme, colors: theme.mode === 'dark' ? dark : light };
}

export function ThemeScope({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const theme = useContext(ThemeContext);
  return <ThemeContext.Provider value={{ ...theme, mode }}>{children}</ThemeContext.Provider>;
}

export function createThemedStyles<T>(create: (colors: typeof dark) => T) {
  const styles = { light: create(light), dark: create(dark) };
  return function useThemedStyles() { return styles[useContext(ThemeContext).mode]; };
}

export function accentForeground(color: string, mode: ThemeMode) {
  if (mode === 'dark') return color;
  const channels = [1, 3, 5].map((index) =>
    Math.round(parseInt(color.slice(index, index + 2), 16) * 0.44).toString(16).padStart(2, '0'));
  return `#${channels.join('')}`;
}
