import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HABIT_COLORS } from '../data/habit-draft';
import { useTranslation } from '../i18n/context';
import { choiceGrid, control, radius, space } from './design-tokens';
import Pressable from './haptic-pressable';
import { createThemedStyles, useTheme } from './theme';

export default function HabitColorPalette({ value, onChange, disabled = false, label, selection = 'color' }: {
  value: string; onChange: (color: string) => void; disabled?: boolean; label: string; selection?: 'color' | 'contrast';
}) {
  const { t } = useTranslation(), { colors } = useTheme(), styles = useStyles();
  const [width, setWidth] = useState(0);
  const { size } = choiceGrid(width || control.touch * 7 + space.xxs * 6);
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {HABIT_COLORS.map((color, index) => <Pressable key={color} disabled={disabled} accessibilityRole="radio" accessibilityLabel={t('Color {value0}, {value1}', { value0: index + 1, value1: color })}
      accessibilityState={{ checked: value === color, disabled }} onPress={() => onChange(color)} style={[styles.target, { width: size, height: size, borderColor: value === color ? selection === 'contrast' ? colors.text : color : 'transparent' }]}>
      <View pointerEvents="none" style={[styles.swatch, { backgroundColor: color }]} />
    </Pressable>)}
  </View>;
}
const useStyles = createThemedStyles(() => StyleSheet.create({
  grid: { width: '100%', maxWidth: control.primary * 7 + space.xxs * 6, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.xxs },
  target: { padding: space.xxs, borderRadius: radius.control, borderWidth: 2 }, swatch: { flex: 1, borderRadius: radius.small },
}));
