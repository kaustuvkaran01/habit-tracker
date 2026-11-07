import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Pressable from './haptic-pressable';
import { Chevron, RoundButton } from './habit-ui';
import AppIcon, { type AppIconName } from './app-icon';
import { accentForeground, createThemedStyles, useTheme } from './theme';

export function SheetHeader({ title, onClose, onBack }: { title: string; onClose: () => void; onBack?: () => void }) {
  const styles = useStyles();
  return <View style={styles.header}>
    <View style={styles.grabber} />
    <View style={styles.headerRow}>
      <RoundButton label={onBack ? 'Back to settings' : `Close ${title}`} onPress={onBack ?? onClose}>
        {onBack ? <Chevron direction="left" /> : <AppIcon name="close" size={20} />}
      </RoundButton>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  </View>;
}

export function PrimaryButton({ children, onPress, trailingIcon }: { children: ReactNode; onPress: () => void; trailingIcon?: AppIconName }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
    <Text style={styles.primaryText}>{children}</Text>
    {trailingIcon && <AppIcon name={trailingIcon} size={18} color={colors.onAccent} />}
  </Pressable>;
}

export type PreferenceSymbol = 'gear' | 'grid' | 'bell' | 'palette' | 'language' | 'archive' | 'cloud' | 'list' | 'onboarding' | 'news' | 'send' | 'globe' | 'social' | 'lock' | 'terms' | 'star' | 'hash' | 'chart' | 'sparkle' | 'pulse';

export function PreferenceIcon({ symbol, color }: { symbol: PreferenceSymbol; color: string }) {
  const styles = useStyles();
  const { mode } = useTheme();
  return <View pointerEvents="none" accessible={false} style={[styles.iconTile, { backgroundColor: `${color}18`, borderColor: `${color}14` }]}>
    <AppIcon name={symbol} size={21} color={accentForeground(color, mode)} />
  </View>;
}

export function ProMark() {
  const styles = useStyles();
  const shades = ['#B5E83E', '#31D3B5', '#8F83FA', '#C27DF1', '#35D5C5', '#4CD98D', '#FA737F'];
  return <View accessible={false} style={styles.proMark}>
    {shades.map((color, row) => <View key={row} style={styles.markRow}>
      {Array.from({ length: 7 }, (_, column) => <View key={column} style={[styles.markCell, { backgroundColor: color, opacity: (row + column) % 5 === 0 ? 0.3 : 1 }]} />)}
    </View>)}
  </View>;
}

export const usePreferenceStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 }, scrollContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 24 },
  group: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 23, borderCurve: 'continuous', overflow: 'hidden' },
  section: { gap: 10 }, sectionLabel: { color: colors.subtle, fontSize: 12, fontWeight: '500', paddingLeft: 6, letterSpacing: 0.6 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
}));

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  header: { backgroundColor: colors.background, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
  grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.controlBorder, marginBottom: 12 },
  headerRow: { width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  title: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 21, fontWeight: '700' }, spacer: { width: 46 },
  primary: { minHeight: 54, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.accent },
  primaryText: { flexShrink: 1, color: colors.onAccent, fontSize: 17, lineHeight: 23, fontWeight: '600', textAlign: 'center' }, pressed: { opacity: 0.65 },
  iconTile: { width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  proMark: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#050506', alignItems: 'center', justifyContent: 'center', gap: 1.5 },
  markRow: { flexDirection: 'row', gap: 1.5 }, markCell: { width: 4, height: 4, borderRadius: 1 },
}));
