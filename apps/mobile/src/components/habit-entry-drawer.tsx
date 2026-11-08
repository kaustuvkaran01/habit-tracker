import { space, control, radius, typeSize } from './design-tokens';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomDrawer from './bottom-drawer';
import Pressable from './haptic-pressable';
import { HabitIcon } from './habit-ui';
import { useAppPreferences } from './app-preferences';
import { type EntryValue, type Habit } from '../data/habit-types';
import { dayProgress } from '../data/habit-entries';
import { dateFromKey, dateKey } from '../data/habit-calendar';
import { useTranslation } from '../i18n/context';
import { feedback } from '../utils/feedback';
import { createThemedStyles, useTheme } from './theme';

type Props = { visible: boolean; habit: Habit; day: string; today: Date; onClose: () => void; onDismiss?: () => void; onSave: (value: EntryValue, note?: string) => Promise<boolean>; onRetry: () => Promise<boolean> };
export default function HabitEntryDrawer({ visible, habit, day, today, onClose, onDismiss, onSave, onRetry }: Props) {
  const { t, locale } = useTranslation(), styles = useStyles(), { colors, mode } = useTheme();
  const { preferences } = useAppPreferences();
  // Capture the day's historical rules and draft once; optimistic store changes must not reset it.
  const [initial] = useState(() => dayProgress(habit, day, dateKey(today)));
  const numeric = initial.configuration.tracking.kind !== 'yes-no';
  const [value, setValue] = useState<EntryValue>(() => initial.record?.value ?? (initial.complete ? { kind: 'legacy-complete' } : { kind: 'clear' }));
  const [amount, setAmount] = useState(initial.amount === undefined ? '' : String(initial.amount));
  const [note, setNote] = useState(habit.notes[day] ?? '');
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const parsed = Number(amount.replace(',', '.'));
  const valid = !numeric || value.kind === 'clear' || value.kind === 'legacy-complete' || (amount.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && (initial.configuration.tracking.kind !== 'count' || Number.isSafeInteger(parsed)));
  const label = dateFromKey(day).toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  async function save() {
    if (lock.current || !valid) return;
    lock.current = true; setBusy(true);
    try {
      const next: EntryValue = numeric && value.kind === 'amount' ? { kind: 'amount', amount: parsed } : value;
      const success = failed ? await onRetry() : await onSave(next, preferences.notes ? note.trim() : undefined);
      if (success) { feedback('completion'); onClose(); }
      else { setFailed(true); feedback('error'); }
    } catch { setFailed(true); feedback('error'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <BottomDrawer visible={visible} onDismiss={onDismiss} onClose={() => { if (!lock.current) onClose(); }} dismissDisabled={busy} label={t('Enter total')}>
    <View style={styles.heading}><HabitIcon habit={habit} size={46} /><View style={styles.copy}><Text style={styles.title}>{habit.name}</Text><Text style={styles.hint}>{label}</Text></View></View>
    <View pointerEvents={busy || failed ? 'none' : 'auto'} style={styles.fields}>
      {numeric ? <>
        <Text style={styles.hint}>{t(initial.configuration.habitType === 'quit' ? 'Daily limit' : 'Daily goal')}: {initial.configuration.tracking.target ?? 1} {initial.configuration.tracking.unit ?? ''}</Text>
        {initial.record?.value.kind === 'legacy-complete' && <Text style={styles.hint}>{t('Amount unknown for this older completion.')}</Text>}
        <TextInput editable={!busy && !failed} accessibilityLabel={t('Enter total')} value={amount} onChangeText={text => { setAmount(text); setValue({ kind: 'amount', amount: 0 }); }}
          keyboardAppearance={mode} keyboardType={initial.configuration.tracking.kind === 'count' ? 'number-pad' : 'decimal-pad'}
          placeholder={t('Enter total')} placeholderTextColor={colors.muted} maxLength={16} style={styles.input} />
        {!valid && <Text accessibilityRole="alert" style={styles.error}>{t('Enter a valid amount.')}</Text>}
      </> : <View accessibilityRole="radiogroup" accessibilityLabel={t('Daily progress')} style={styles.options}>{[true, false].map(complete => <Pressable disabled={busy || failed} key={String(complete)} accessibilityRole="radio" accessibilityState={{ checked: value.kind === 'yes-no' && value.complete === complete, disabled: busy || failed }}
        onPress={() => setValue({ kind: 'yes-no', complete })} style={[styles.option, { flex: 1 }, value.kind === 'yes-no' && value.complete === complete && styles.selected]}>
        <Text style={styles.text}>{t(complete ? 'Done' : 'Not done')}</Text></Pressable>)}</View>}
      {(habit.entries?.[day]?.length ?? 0) > 0 && <Pressable disabled={busy || failed} accessibilityRole="button" onPress={() => { const records = habit.entries?.[day] ?? []; const previous = records[records.length - 2]?.value ?? { kind: 'clear' as const }; setValue(previous); setAmount(previous.kind === 'amount' ? String(previous.amount) : ''); }} style={styles.option}><Text style={styles.text}>{t('Undo')}</Text></Pressable>}
      <Pressable disabled={busy || failed} accessibilityRole="button" onPress={() => { setValue({ kind: 'clear' }); setAmount(''); }} style={styles.option}><Text style={styles.text}>{t('Clear entry')}</Text></Pressable>
      {value.kind === 'clear' && <Text style={styles.hint}>{t('Unlogged')}</Text>}
      {preferences.notes && <TextInput editable={!busy && !failed} accessibilityLabel={t('Notes')} multiline value={note} onChangeText={setNote} maxLength={1000} keyboardAppearance={mode}
        placeholder={t('What went well? What got in the way?')} placeholderTextColor={colors.muted} style={[styles.input, styles.note]} />}
    </View>
    {failed && <Text accessibilityRole="alert" style={styles.error}>{t('Changes haven’t saved yet.')}</Text>}
    <Pressable haptic={false} accessibilityRole="button" accessibilityState={{ disabled: busy || !valid, busy }} disabled={busy || !valid} onPress={save} style={styles.save}>
      {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>{t(failed ? 'Retry saving' : 'Save')}</Text>}
    </Pressable>
  </BottomDrawer>;
}
const useStyles = createThemedStyles(c => StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm }, copy: { flex: 1, gap: space.xxs }, title: { color: c.text, fontSize: 20, fontWeight: '600' },
  fields: { gap: space.sm }, hint: { color: c.muted, fontSize: 13, lineHeight: 19 }, input: { backgroundColor: c.raised, color: c.text, padding: space.md, borderRadius: radius.control, borderWidth: 1, borderColor: c.border, fontSize: typeSize.body, minHeight: control.primary },
  note: { minHeight: 100, maxHeight: 160, textAlignVertical: 'top' }, options: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }, option: { padding: space.sm, borderRadius: radius.control, backgroundColor: c.control, alignItems: 'center', minHeight: control.touch, justifyContent: 'center' }, selected: { backgroundColor: c.accentPanel, borderWidth: 1, borderColor: c.accent },
  text: { color: c.text, fontSize: 15 }, error: { color: c.error, fontSize: 13 }, save: { minHeight: control.primary, padding: 14, borderRadius: radius.primary, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm }, saveText: { color: c.onAccent, fontSize: typeSize.action, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
}));
