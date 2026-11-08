import { space, control, radius, typeSize } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useRef, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import BottomDrawer from '../components/bottom-drawer';
import Pressable from '../components/haptic-pressable';
import AppIcon from '../components/app-icon';
import { type AppPreferences, reminderValid } from '../data/app-preferences';
import { weekdayNames } from '../i18n/locale';
import { feedback } from '../utils/feedback';
import { createThemedStyles, useTheme } from '../components/theme';
import { useReminders } from '../components/reminders';
import ReminderStatus from '../components/reminder-status';

export default function DailyReminderDrawer({ initial, onSave, onClose, onBusyChange }: {
  initial: AppPreferences['dailyReminder']; onSave: (value: AppPreferences['dailyReminder']) => Promise<boolean>; onClose: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const { t, locale } = useTranslation();
  const [draft, setDraft] = useState(() => ({ ...initial, days: [...initial.days] }));
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const reminders = useReminders(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const valid = reminderValid(draft);
  const patch = (value: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...value }));
  async function save() {
    if (lock.current || !valid) return;
    lock.current = true; setBusy(true); onBusyChange?.(true); setFailed(false);
    try {
      if (draft.enabled && !(await reminders.requestPermission())) return;
      if (await onSave(draft)) { feedback('success'); onClose(); }
      else setFailed(true);
    } catch { setFailed(true); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  return <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: space.md }}>
    <View style={styles.heading}><View style={styles.copy}>
      <Text accessibilityRole="header" style={styles.title}>{t("Daily Check-In Reminders")}</Text>
      <Text style={styles.subtitle}>{t("A little nudge to make time for your habits.")}</Text>
    </View><Switch accessibilityLabel={t("Enable daily check-in reminder")} value={draft.enabled}
      onValueChange={(enabled) => {
        feedback('selection');
        const time = !enabled && !reminderValid({ ...draft, enabled: false }) ? initial.time : draft.time;
        patch({ enabled, time });
      }} trackColor={{ false: colors.controlBorder, true: colors.accent }} thumbColor="#FFFFFF" /></View>
    <View accessibilityRole="group" accessibilityLabel={t("Reminder days")} style={[styles.days, !draft.enabled && styles.disabled]}>
      {weekdayNames(locale).map((name, day) => <Pressable key={name} disabled={!draft.enabled} accessibilityRole="checkbox" accessibilityLabel={name}
        accessibilityState={{ checked: draft.days.includes(day), disabled: !draft.enabled }} onPress={() => patch({ days: draft.days.includes(day) ? draft.days.filter((item) => item !== day) : [...draft.days, day].sort() })}
        style={[styles.day, draft.days.includes(day) && styles.selectedDay]}><Text style={styles.dayText}>{name}</Text></Pressable>)}
    </View>
    <View style={[styles.timeRow, !draft.enabled && styles.disabled]}><AppIcon name="clock" size={20} />
      <TextInput keyboardAppearance={mode} accessibilityLabel={t("Daily reminder time, 24-hour HH:mm")} value={draft.time} onChangeText={(time) => patch({ time })}
        editable={draft.enabled} maxLength={5} placeholder="18:00" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" style={styles.time} />
    </View>
    <TextInput keyboardAppearance={mode} accessibilityLabel={t("Custom notification title")} value={draft.title} onChangeText={(title) => patch({ title })} editable={draft.enabled && draft.discreet === false}
      placeholder={t("Custom Notification Title")} placeholderTextColor={colors.muted} maxLength={80} style={[styles.input, !draft.enabled && styles.disabled]} />
    <TextInput keyboardAppearance={mode} accessibilityLabel={t("Custom notification message")} value={draft.message} onChangeText={(message) => patch({ message })} editable={draft.enabled && draft.discreet === false}
      placeholder={t("Custom Notification Message")} placeholderTextColor={colors.muted} maxLength={200} multiline style={[styles.input, !draft.enabled && styles.disabled]} />
    {!valid && <Text accessibilityRole="alert" style={styles.error}>{t("Choose at least one day and a time such as 18:00.")}</Text>}
    <View style={styles.heading}><Text style={[styles.subtitle, { flex: 1 }]}>{t('Discreet notifications')}</Text><Switch accessibilityLabel={t('Discreet notifications')} value={draft.discreet !== false} disabled={!draft.enabled || busy} onValueChange={discreet => patch({ discreet })} trackColor={{ false: colors.controlBorder, true: colors.accent }} /></View>
    <Text style={styles.subtitle}>{t('Discreet notifications hide habit names and custom text.')}</Text>
    <ReminderStatus />
    {failed && <Text accessibilityRole="alert" style={styles.error}>{t('Changes haven’t saved yet.')}</Text>}
    <Pressable haptic={false} accessibilityRole="button" disabled={!valid || busy} accessibilityState={{ disabled: !valid || busy, busy }} onPress={save}
      style={[styles.save, !valid && styles.disabled]}><Text style={styles.saveText}>{t("Save")}</Text></Pressable>
  </View>;
}
export function DailyReminderSheet({ visible, initial, onSave, onClose }: {
  visible: boolean; initial: AppPreferences['dailyReminder']; onSave: (value: AppPreferences['dailyReminder']) => Promise<boolean>; onClose: () => void;
}) {
  const { t } = useTranslation();
  const session = useRef(0);
  const wasVisible = useRef(false);
  const [busy, setBusy] = useState(false);
  if (visible && !wasVisible.current) session.current += 1;
  wasVisible.current = visible;
  return <BottomDrawer visible={visible} dismissDisabled={busy} onClose={() => { if (!busy) onClose(); }} label={t("daily check-in reminders")}>
    <DailyReminderDrawer key={session.current} initial={initial} onSave={onSave} onClose={onClose} onBusyChange={setBusy} />
  </BottomDrawer>;
}
const useStyles = createThemedStyles((c) => StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm }, copy: { flex: 1, gap: space.xs },
  title: { color: c.text, fontSize: 21, fontWeight: '700' }, subtitle: { color: c.muted, fontSize: 13, lineHeight: 19 },
  days: { flexDirection: 'row', gap: space.xxs, flexWrap: 'wrap', justifyContent: 'center' }, day: { minHeight: control.touch, borderRadius: radius.small, backgroundColor: c.raised, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, flexGrow: 0, flexBasis: 'auto', minWidth: control.touch, paddingVertical: space.xs, paddingHorizontal: space.xs },
  selectedDay: { backgroundColor: c.accentPanel, borderColor: c.accent }, dayText: { color: c.text, fontSize: 11 },
  timeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xs, minHeight: control.row, borderRadius: radius.control, borderWidth: 1, borderColor: c.border, backgroundColor: c.raised },
  time: { flexShrink: 1, color: c.text, minWidth: 100, fontSize: 23, fontWeight: '600', textAlign: 'center', padding: 12, fontVariant: ['tabular-nums'] },
  input: { minHeight: control.primary, borderRadius: radius.control, padding: space.md, color: c.text, backgroundColor: c.raised, borderWidth: 1, borderColor: c.border, fontSize: typeSize.body },
  save: { minHeight: control.primary, borderRadius: radius.primary, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, paddingHorizontal: space.md }, saveText: { color: c.onAccent, fontWeight: '600', fontSize: typeSize.action, textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.45 }, error: { color: c.error, fontSize: 13 },
}));
