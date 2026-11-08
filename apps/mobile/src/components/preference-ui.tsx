import { space, layout, control, radius, typeSize } from './design-tokens';
import { useTranslation } from '../i18n/context';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Pressable from './haptic-pressable';
import { Chevron, RoundButton } from './habit-ui';
import AppIcon, { type AppIconName } from './app-icon';
import { accentForeground, createThemedStyles, useTheme } from './theme';

export function SheetHeader({ title, onClose, onBack, disabled = false }: { title: string; onClose: () => void; onBack?: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const styles = useStyles();
  return <View style={styles.header}>
    <View style={styles.grabber} />
    <View style={styles.headerRow}>
      <RoundButton disabled={disabled} label={onBack ? t('Back to settings') : t("Close {value0}", { value0: t(title) })} onPress={onBack ?? onClose}>
        {onBack ? <Chevron direction="left" /> : <AppIcon name="close" size={20} />}
      </RoundButton>
      <Text accessibilityRole="header" style={styles.title}>{t(title)}</Text>
      <View style={styles.spacer} />
    </View>
  </View>;
}

export function PrimaryButton({ children, onPress, trailingIcon, disabled = false }: { children: ReactNode; onPress: () => void; trailingIcon?: AppIconName; disabled?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [styles.primary, (pressed || disabled) && styles.pressed]}>
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
  scroll: { flex: 1 }, scrollContent: { paddingHorizontal: layout.inset, paddingTop: space.md, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: layout.content, alignSelf: 'center', gap: layout.section },
  group: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' },
  section: { gap: space.sm }, sectionLabel: { color: colors.subtle, fontSize: 12, fontWeight: '500', paddingLeft: space.xxs, letterSpacing: 0.6 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
}));

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  header: { backgroundColor: colors.background, paddingHorizontal: layout.inset, paddingTop: space.xs, paddingBottom: space.sm },
  grabber: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.controlBorder, marginBottom: 12 },
  headerRow: { width: '100%', maxWidth: layout.content, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: control.regular },
  title: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 21, fontWeight: '700', flexShrink: 1 }, spacer: { width: control.roundTarget },
  primary: { minHeight: control.primary, borderRadius: radius.primary, paddingHorizontal: space.md, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, backgroundColor: colors.accent },
  primaryText: { flexShrink: 1, color: colors.onAccent, fontSize: typeSize.action, lineHeight: 23, fontWeight: '600', textAlign: 'center' }, pressed: { opacity: 0.65 },
  iconTile: { width: 36, height: 36, borderRadius: 12, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  proMark: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#050506', alignItems: 'center', justifyContent: 'center', gap: 1.5 },
  markRow: { flexDirection: 'row', gap: 1.5 }, markCell: { width: 4, height: 4, borderRadius: 1 },
}));
