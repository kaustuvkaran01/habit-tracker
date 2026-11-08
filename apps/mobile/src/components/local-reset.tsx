import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLocalEraser } from '../data/local-erasure';
import { clearOwnedReminders } from '../services/reminder-notifications';
import { clearBackupFiles } from '../services/backup-files';
import { resetHapticsAfterErase } from '../utils/feedback';
import { createTranslator, resolveLocale } from '../i18n/locale';
import { control, layout, space } from './design-tokens';

const eraser = createLocalEraser(AsyncStorage, clearOwnedReminders, clearBackupFiles);
const Context = createContext<{ erase: () => Promise<void> }>({ async erase() { throw Error('Reset unavailable'); } });
export function LocalResetBoundary({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'erasing' | 'failed'>('loading');
  const [epoch, setEpoch] = useState(0), [attempt, setAttempt] = useState(0);
  const requested = useRef(false), busy = useRef(false);
  const t = createTranslator(resolveLocale('system'));
  useEffect(() => {
    let active = true;
    void eraser.recover().then(() => { if (active) { resetHapticsAfterErase(); setPhase('ready'); } })
      .catch(() => { if (active) setPhase('failed'); });
    return () => { active = false; };
  }, [attempt]);
  async function erase() {
    if (busy.current) return;
    busy.current = true; requested.current = true; setPhase('erasing');
    try {
      // All data owners have frozen/drained their writes before this call.
      // Unmount them before native jobs and local storage are removed.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await eraser.erase();
      resetHapticsAfterErase(); setEpoch(value => value + 1); setPhase('ready');
    } catch { setPhase('failed'); throw Error('Local data cleanup did not finish.'); }
    finally { busy.current = false; }
  }
  if (phase === 'ready') return <Context.Provider key={epoch} value={{ erase }}>{children}</Context.Provider>;
  return <View style={styles.screen}>
    {phase === 'failed' ? <>
      <Text accessibilityRole="header" style={styles.title}>{t('Local data recovery needs attention')}</Text>
      <Text accessibilityRole="alert" style={styles.text}>{t('The app stays closed until cleanup can finish safely. Your other apps and exported files are not changed.')}</Text>
      <Pressable accessibilityRole="button" onPress={() => {
        if (requested.current) { void erase().catch(() => {}); }
        else { setPhase('loading'); setAttempt(value => value + 1); }
      }} style={styles.button}><Text style={styles.title}>{t('Try again')}</Text></Pressable>
      {!requested.current && <Pressable accessibilityRole="button" onPress={() => Alert.alert(t('Erase all local data?'), t('This permanently removes all habits, notes, rewards and preferences from this app.'), [
        { text: t('Cancel'), style: 'cancel' }, { text: t('Erase all local data'), style: 'destructive', onPress: () => { void erase().catch(() => {}); } },
      ])} style={styles.button}><Text style={styles.text}>{t('Erase all local data')}</Text></Pressable>}
    </> : <><ActivityIndicator color="#BBAEFF" /><Text style={styles.text}>{phase === 'erasing' ? t('Erasing local data…') : t('Opening your tracker…')}</Text></>}
  </View>;
}
export function useLocalReset() { return useContext(Context); }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101012', alignItems: 'center', justifyContent: 'center', padding: layout.inset, gap: space.md },
  text: { color: '#AFACB8', fontSize: 15, textAlign: 'center', maxWidth: layout.preview }, title: { color: '#F1F0F4', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  button: { minHeight: control.touch, justifyContent: 'center', padding: space.sm },
});
