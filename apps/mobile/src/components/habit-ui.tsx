import { type ReactNode } from 'react';
import { Alert, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import Pressable from './haptic-pressable';
import { type Habit } from '../data/sample-habits';
import AppIcon from './app-icon';
import { normalizedHabitEmoji } from '../data/habit-emoji';
import { accentForeground, createThemedStyles, useTheme } from './theme';

export const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 18 : 18;
export type HabitView = 'grid' | 'list' | 'month';
export const habitViews: { id: HabitView; label: string }[] = [
  { id: 'grid', label: 'Activity grid' }, { id: 'list', label: 'Five-day checklist' }, { id: 'month', label: 'Monthly calendars' },
];

export function previewNotice(label: string) {
  Alert.alert(label, `${label} will be added in a future step.`);
}

export function RoundButton({ label, children, accent = false, onPress, disabled = false, compact = false }: {
  label: string; children: ReactNode; accent?: boolean; onPress?: () => void; disabled?: boolean; compact?: boolean;
}) {
  const styles = useStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }}
    onPress={onPress ?? (() => previewNotice(label))}
    style={({ pressed }) => [styles.buttonTarget, (pressed || disabled) && styles.pressed]}>
    <View pointerEvents="none" style={[styles.roundButton, compact && styles.compactRoundButton, accent && styles.accentButton]}>
      <View style={compact && styles.compactButtonIcon}>{children}</View>
    </View>
  </Pressable>;
}

export function ShareIcon({ color }: { color?: string }) { return <AppIcon name="share" color={color} />; }
export function SettingsIcon() { return <AppIcon name="gear" />; }
export function ChartIcon() { return <AppIcon name="chart" />; }
export function ViewIcon({ view }: { view: HabitView }) {
  return <AppIcon name={view === 'grid' ? 'view-grid' : view === 'list' ? 'view-list' : 'view-month'} />;
}

export function HabitIcon({ habit, size = 36, bare = false, round = false }: {
  habit: Pick<Habit, 'icon' | 'color' | 'emoji'>; size?: number; bare?: boolean; round?: boolean;
}) {
  const styles = useStyles();
  const { mode } = useTheme();
  return <View style={[styles.habitIcon, {
    width: size, height: size, borderRadius: size * (round ? 0.5 : 0.3),
    backgroundColor: bare ? 'transparent' : `${habit.color}1C`,
    borderWidth: bare ? 0 : StyleSheet.hairlineWidth, borderColor: `${habit.color}24`,
  }]}>
    {habit.icon === 'emoji'
      ? <Text allowFontScaling={false} style={[styles.emoji, { fontSize: size * 0.56, lineHeight: size * 0.78 }]}>{normalizedHabitEmoji(habit.emoji ?? '') ?? '✨'}</Text>
      : <AppIcon name={habit.icon} size={size * 0.58} color={accentForeground(habit.color, mode)} strokeWidth={1.75} />}
  </View>;
}

export function Chevron({ direction = 'right' }: { direction?: 'left' | 'right' | 'down' }) {
  return <AppIcon name={direction === 'left' ? 'chevron-left' : direction === 'down' ? 'chevron-down' : 'chevron-right'} size={16} />;
}
export function Checkmark({ color }: { color?: string }) {
  const { colors } = useTheme();
  return <AppIcon name="check" size={22} color={color ?? colors.muted} strokeWidth={1.9} />;
}

export function Toolbar({ onAdd, onSettings, onPro, onWallpapers }: { onAdd: () => void; onSettings: () => void; onPro: () => void; onWallpapers: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.toolbar}>
    <RoundButton label="Settings" compact onPress={onSettings}><SettingsIcon /></RoundButton>
    <View style={styles.toolbarRight}>
      <RoundButton label="Pro" compact onPress={onPro}><View style={styles.proBadge}><Text allowFontScaling={false} style={styles.proText}>PRO</Text></View></RoundButton>
      <RoundButton label="Wallpapers and badges" compact onPress={onWallpapers}><AppIcon name="wallpaper" /></RoundButton>
      <RoundButton label="Charts" compact><ChartIcon /></RoundButton>
      <RoundButton label="Add a habit" compact accent onPress={onAdd}><AppIcon name="plus" color={colors.onAccent} size={24} /></RoundButton>
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  buttonTarget: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  roundButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control, borderWidth: 1, borderColor: colors.controlBorder },
  compactRoundButton: { width: 42, height: 42, borderRadius: 21 },
  compactButtonIcon: { transform: [{ scale: 42 / 46 }] },
  accentButton: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.65 },
  habitIcon: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  emoji: { textAlign: 'center', includeFontPadding: false, color: colors.text },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  toolbarRight: { flexDirection: 'row', gap: 10 },
  proBadge: { borderWidth: 1.25, borderColor: colors.icon, borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  proText: { color: colors.icon, fontSize: 9, fontWeight: '600', lineHeight: 12 },
}));
