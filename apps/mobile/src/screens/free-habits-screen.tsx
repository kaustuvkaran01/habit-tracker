import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pressable from '../components/haptic-pressable';
import { HabitIcon } from '../components/habit-ui';
import AppIcon from '../components/app-icon';
import { PrimaryButton, SheetHeader, usePreferenceStyles } from '../components/preference-ui';
import { createThemedStyles, useTheme } from '../components/theme';
import { control, layout, radius, space } from '../components/design-tokens';
import { FREE_HABIT_LIMIT } from '../data/pro-access';
import { type Habit } from '../data/habit-types';
import { useTranslation } from '../i18n/context';

export default function FreeHabitsScreen({ habits, selected, onSave, onClose }: {
  habits: Habit[]; selected: string[]; onSave: (ids: string[]) => Promise<boolean>; onClose: () => void;
}) {
  const { t } = useTranslation(), { colors } = useTheme(), styles = useStyles(), shared = usePreferenceStyles();
  const [ids, setIds] = useState(selected), [saving, setSaving] = useState(false), [failed, setFailed] = useState(false);
  const lock = useRef(false), insets = useSafeAreaInsets();
  const active = habits.filter(habit => !habit.archived);
  async function save() {
    if (lock.current || ids.length !== Math.min(FREE_HABIT_LIMIT, active.length)) return;
    lock.current = true;
    setSaving(true);
    try {
      const ok = await onSave(ids);
      setFailed(!ok);
      if (ok) onClose();
    } catch { setFailed(true); }
    finally { lock.current = false; setSaving(false); }
  }
  return <View style={shared.screen} onAccessibilityEscape={onClose}>
    <SheetHeader title={t('Choose habits')} onClose={onClose} />
    <ScrollView contentContainerStyle={[shared.scrollContent, { paddingBottom: Math.max(space.lg, insets.bottom) + space.md }]}>
      <View style={shared.content}>
        <Text style={shared.muted}>{t('Choose four habits to keep logging for free. All other habits and their history stay visible.')}</Text>
        <Text style={shared.muted}>{t('{value0} / {value1} selected', { value0: ids.length, value1: Math.min(FREE_HABIT_LIMIT, active.length) })}</Text>
        <View style={shared.group}>{active.map(habit => {
          const checked = ids.includes(habit.id);
          const disabled = saving || (!checked && ids.length >= FREE_HABIT_LIMIT);
          return <Pressable key={habit.id} accessibilityRole="checkbox" accessibilityLabel={habit.name} accessibilityState={{ checked, disabled }} disabled={disabled}
            onPress={() => setIds(current => current.includes(habit.id) ? current.filter(id => id !== habit.id) : current.length < FREE_HABIT_LIMIT ? [...current, habit.id] : current)} style={[styles.row, disabled && styles.dim]}>
            <HabitIcon habit={habit} size={36} /><Text style={styles.name}>{habit.name}</Text>
            <View style={[styles.check, checked && styles.checked]}>{checked && <AppIcon name="check" size={18} color={colors.onAccent} />}</View>
          </Pressable>;
        })}</View>
        {failed && <Text accessibilityRole="alert" style={shared.muted}>{t('Changes haven’t saved yet.')}</Text>}
        <PrimaryButton disabled={saving || ids.length !== Math.min(FREE_HABIT_LIMIT, active.length)} onPress={save}>{t('Save')}</PrimaryButton>
      </View>
    </ScrollView>
  </View>;
}
const useStyles = createThemedStyles(colors => StyleSheet.create({
  row: { minHeight: control.roomyRow, padding: layout.inset, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  name: { flex: 1, color: colors.text, fontSize: 16 },
  check: { width: 28, height: 28, borderRadius: radius.small, borderWidth: 1, borderColor: colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent }, dim: { opacity: 0.55 },
}));
