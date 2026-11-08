import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n/context';
import AppIcon from './app-icon';
import { layout, space, typeSize } from './design-tokens';
import { createThemedStyles } from './theme';

const Context = createContext(false);
export function useAppPrivacyCovered() { return useContext(Context); }

export function AppPrivacyProvider({ children }: { children: ReactNode }) {
  const status = useRef(AppState.currentState), blurred = useRef(false);
  const [covered, setCovered] = useState(AppState.currentState !== 'active');
  useEffect(() => {
    const sync = () => setCovered(status.current !== 'active' || blurred.current);
    const change = AppState.addEventListener('change', (next: AppStateStatus) => {
      status.current = next;
      // A transition back from another Activity must not retain a stale blur.
      if (next !== 'active') blurred.current = false;
      sync();
    });
    const blur = Platform.OS === 'android' ? AppState.addEventListener('blur', () => { blurred.current = true; sync(); }) : null;
    const focus = Platform.OS === 'android' ? AppState.addEventListener('focus', () => { blurred.current = false; sync(); }) : null;
    status.current = AppState.currentState; sync();
    return () => { change.remove(); blur?.remove(); focus?.remove(); };
  }, []);
  return <Context.Provider value={covered}>{children}</Context.Provider>;
}

// Render inside every native surface, not as a new Modal: a cover behind an
// existing native sheet cannot protect that sheet's visible content.
export function PrivacySurface({ children }: { children: ReactNode }) {
  const covered = useAppPrivacyCovered(), styles = useStyles(), { t } = useTranslation();
  return <View style={styles.surface}>
    <View pointerEvents={covered ? 'none' : 'auto'} accessibilityElementsHidden={covered}
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'} style={styles.surface}>{children}</View>
    {covered && <View accessibilityViewIsModal accessible accessibilityLabel={t('App hidden')} onAccessibilityEscape={() => {}}
      onStartShouldSetResponder={() => true} style={styles.cover}>
      <AppIcon name="lock" size={36} />
      <Text style={styles.name}>Habit Tracker</Text>
      <Text style={styles.message}>{t('App hidden')}</Text>
    </View>}
  </View>;
}

const useStyles = createThemedStyles(colors => StyleSheet.create({
  surface: { flex: 1 },
  cover: { ...StyleSheet.absoluteFill, zIndex: 10000, elevation: 10000, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: layout.inset, gap: space.md },
  name: { color: colors.text, fontSize: typeSize.title, fontWeight: '600', textAlign: 'center' },
  message: { color: colors.muted, fontSize: typeSize.body, textAlign: 'center' },
}));
