import Modal from '../components/private-modal';
import { space, layout, control, radius, typeSize } from '../components/design-tokens';
import HabitColorPalette from '../components/habit-color-palette';
import { useTranslation } from '../i18n/context';
import { formatRepeat, weekdayNames } from '../i18n/locale';
import { type ReactNode, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { Checkmark, Chevron, HabitIcon, RoundButton } from '../components/habit-ui';
import { CATEGORIES, draftError, draftFromHabit, draftReminderTimes, emptyDraft, HABIT_ICONS, type HabitDraft, stepGoal } from '../data/habit-draft';
import { type Habit } from '../data/habit-types';
import { DAY_NAMES } from '../data/habit-calendar';
import HabitIconScreen from './habit-icon-screen';
import RightDrawer from '../components/right-drawer';
import { contrastInk } from '../data/habit-share';
import AppIcon from '../components/app-icon';
import { feedback } from '../utils/feedback';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';
import { useReminders } from '../components/reminders';
import ReminderStatus from '../components/reminder-status';
import { useProUpgrade } from '../components/pro-upgrade';
import { habitReminderTimes, validReminderTime } from '../data/reminder-settings';

type Picker = 'repeat' | 'reminder' | 'categories';

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  const { t } = useTranslation();
  const styles = useStyles();
  return <View style={styles.section}><Text style={styles.sectionLabel}>{t(title)}</Text>{children}
    {hint && <Text style={styles.hint}>{t(hint)}</Text>}
  </View>;
}

function Segments<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  return <View accessibilityRole="tablist" accessibilityLabel={t(label)} style={styles.segments}>
    {options.map((option) => <Pressable key={option.id} accessibilityRole="tab" accessibilityLabel={t(option.label)}
      accessibilityState={{ selected: value === option.id }} onPress={() => onChange(option.id)}
      style={[styles.segment, value === option.id && styles.selectedSegment]}>
      <Text style={[styles.segmentText, value === option.id && styles.selectedSegmentText]}>{t(option.label)}</Text>
    </Pressable>)}
  </View>;
}

export default function HabitFormScreen({ initialHabit, onClose, onSave, onRetrySave, canSave, onBusyChange }: { initialHabit?: Habit; onClose: () => void; onSave: (draft: HabitDraft) => Promise<boolean>; onRetrySave: () => Promise<boolean>; canSave?: () => boolean; onBusyChange?: (busy: boolean) => void }) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const reminders = useReminders(), upgrade = useProUpgrade();
  const latest = useRef({ canSave, onSave, onRetrySave, upgrade });
  latest.current = { canSave, onSave, onRetrySave, upgrade };
  const [permissionError, setPermissionError] = useState(false);
  const [reminderTouched, setReminderTouched] = useState(false);
  const [draft, setDraft] = useState(() => initialHabit ? draftFromHabit(initialHabit) : emptyDraft());
  const editing = initialHabit !== undefined;
  const [picker, setPicker] = useState<Picker | null>(null);
  const lastPicker = useRef<Picker>('repeat');
  if (picker !== null) lastPicker.current = picker;
  const displayedPicker = picker ?? lastPicker.current;
  const [iconOpen, setIconOpen] = useState(false);
  const saved = useRef(false);
  const [busy, setBusy] = useState(false), [saveFailed, setSaveFailed] = useState(false);
  const { fontScale } = useWindowDimensions();
  const error = draftError(draft);
  const preview = { icon: draft.icon, emoji: draft.emoji, color: draft.color };
  const patch = (changes: Partial<HabitDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const pickerTitle = displayedPicker === 'repeat' ? 'Repeat' : displayedPicker === 'reminder' ? 'Reminder' : 'Categories';
  const times = draftReminderTimes(draft);
  const reminderError = times.length > 3 || times.some(time => !validReminderTime(time)) ? 'Use up to three valid reminder times.'
    : new Set(times).size !== times.length ? 'Choose different reminder times.' : null;
  const pickerInvalid = (displayedPicker === 'repeat' && !draft.repeatDays.length)
    || (displayedPicker === 'reminder' && reminderError !== null);
  const targetValue = draft.target.trim() ? Number(draft.target.replace(',', '.')) : NaN;
  const decreaseDisabled = Number.isFinite(targetValue) && targetValue <= (draft.habitType === 'quit' ? 0 : 1);

  function closeIcon() { Keyboard.dismiss(); setIconOpen(false); }

  async function save() {
    if (draftError(draft) || saved.current) return;
    if (!saveFailed && canSave && !canSave()) return;
    saved.current = true; setBusy(true); onBusyChange?.(true); Keyboard.dismiss();
    try {
      const times = draftReminderTimes(draft);
      if (!saveFailed && times.length && (reminderTouched || reminders.permission === 'undetermined' || JSON.stringify([...times].sort()) !== JSON.stringify(initialHabit ? habitReminderTimes(initialHabit) : []))) {
        if (!(await reminders.requestPermission())) { setPermissionError(true); return; }
      }
      // Permission UI can outlive an entitlement/data refresh. Recheck current
      // policy before dispatch, and keep the draft when access changed.
      if (!saveFailed && latest.current.canSave && !latest.current.canSave()) return;
      if (!saveFailed && times.length > 1 && times.some(time => !initialHabit || !habitReminderTimes(initialHabit).includes(time))
        && !latest.current.upgrade.request('multiple-reminders')) return;
      setPermissionError(false);
      const ok = saveFailed ? await latest.current.onRetrySave() : await latest.current.onSave({ ...draft, remindersPaused: reminderTouched ? false : draft.remindersPaused });
      if (ok) onClose();
      else setSaveFailed(true);
    } catch { setSaveFailed(true); }
    finally { saved.current = false; setBusy(false); onBusyChange?.(false); }
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
    <View style={styles.screen} accessibilityElementsHidden={iconOpen} importantForAccessibility={iconOpen ? 'no-hide-descendants' : 'auto'}>
      <View style={styles.header}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <RoundButton label={editing ? t('Cancel editing habit') : t('Cancel new habit')} disabled={busy} onPress={onClose}><AppIcon name="close" size={20} /></RoundButton>
          <Text accessibilityRole="header" style={styles.headerTitle}>{editing ? t('Edit Habit') : t('New Habit')}</Text><View style={styles.headerSpacer} />
        </View>
      </View>
      <ScrollView pointerEvents={busy || saveFailed ? 'none' : 'auto'} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} indicatorStyle={mode === 'dark' ? 'white' : 'black'}>
        <View style={styles.content}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Change habit icon")} onPress={() => setIconOpen(true)} style={styles.iconHero}>
            <View pointerEvents="none" style={styles.iconWallpaper}>
              {Array.from({ length: 24 }, (_, index) => <HabitIcon key={index} habit={{ icon: HABIT_ICONS[index % HABIT_ICONS.length].id, color: draft.color }} size={30} bare />)}
            </View>
            <View><HabitIcon habit={preview} size={96} round /><View style={[styles.editBadge, { backgroundColor: draft.color }]}><AppIcon name="edit" size={15} color={contrastInk(draft.color)} /></View></View>
            <Text style={[styles.changeIcon, { color: accentForeground(draft.color, mode) }]}>{t("Change icon")}</Text>
          </Pressable>
          <Section title={t("NAME")}><TextInput editable={!busy && !saveFailed} keyboardAppearance={mode} accessibilityLabel={t("Habit name")} value={draft.name} onChangeText={(name) => patch({ name })}
            maxLength={60} autoCapitalize="sentences" style={styles.input} selectionColor={draft.color} returnKeyType="done" /></Section>
          <Section title={t("DESCRIPTION")}><TextInput editable={!busy && !saveFailed} keyboardAppearance={mode} accessibilityLabel={t("Habit description")} value={draft.description} onChangeText={(description) => patch({ description })}
            maxLength={300} multiline style={styles.input} selectionColor={draft.color} /></Section>
          <Section title={t("COLOR")}><HabitColorPalette label={t("Habit color")} value={draft.color} disabled={busy || saveFailed} onChange={(color) => patch({ color })} /></Section>
          <Section title={t("HABIT TYPE")} hint={draft.habitType === 'build' ? t('Mark each day you complete it.') : t('Mark each day you stay away from it.')}>
            <Segments label={t("Habit type")} value={draft.habitType} onChange={(habitType) => patch({ habitType })}
              options={[{ id: 'build', label: 'Build A Habit' }, { id: 'quit', label: 'Quit A Habit' }]} />
          </Section>
          <Section title={t("REPEAT")}><Pressable accessibilityRole="button" accessibilityLabel={t("Repeat, {value0}", { value0: formatRepeat(draft.repeatDays, locale) })} onPress={() => setPicker('repeat')} style={styles.optionRow}>
            <Text style={styles.optionText}>{formatRepeat(draft.repeatDays, locale) || t('Choose days')}</Text>
            <View style={styles.repeatDots}>{DAY_NAMES.map((day, index) => <View key={day} style={[styles.repeatDot, { backgroundColor: draft.repeatDays.includes(index) ? draft.color : colors.controlBorder }]} />)}</View>
            <Chevron />
          </Pressable></Section>
          <Section title={t("TRACKING")} hint={draft.trackingKind === 'yes-no' ? t('Check the day off — done or not done.') : draft.trackingKind === 'count' ? t('Count toward a daily goal — glasses, sets, pages') : t('Log amounts with a unit — 2 L of water, 7.5 km')}>
            <Segments label={t("Tracking method")} value={draft.trackingKind} onChange={(trackingKind) => patch({ trackingKind })}
              options={[{ id: 'yes-no', label: 'Yes / No' }, { id: 'count', label: 'Count' }, { id: 'measure', label: 'Measure' }]} />
          </Section>
          {draft.trackingKind !== 'yes-no' && <>
            {draft.trackingKind === 'measure' && <Section title={t("UNIT")}>
              <TextInput editable={!busy && !saveFailed} keyboardAppearance={mode} accessibilityLabel={t("Measurement unit")} value={draft.unit} onChangeText={(unit) => patch({ unit })}
                placeholder={t("km, pages, minutes…")} placeholderTextColor={colors.muted} style={styles.input} maxLength={20}
                selectionColor={draft.color} autoCapitalize="none" />
            </Section>}
            <View style={styles.section}>
              <View style={styles.goalHeading}>
                <Text style={styles.sectionLabel}>{draft.habitType === 'quit' ? t('DAILY LIMIT') : t('DAILY GOAL')}</Text>
                <View style={styles.goalIndicator}>
                  <View style={[styles.goalIndicatorCell, { backgroundColor: `${draft.color}30` }]} />
                  <View style={[styles.goalIndicatorCell, { backgroundColor: draft.color }]} />
                </View>
              </View>
              <View style={styles.goalRow}>
                <View style={styles.goalField}>
                  <TextInput editable={!busy && !saveFailed} keyboardAppearance={mode} accessibilityLabel={draft.habitType === 'quit' ? t('Daily limit') : t('Daily goal')} value={draft.target}
                    onChangeText={(target) => patch({ target })} keyboardType={draft.trackingKind === 'count' ? 'number-pad' : 'decimal-pad'}
                    selectTextOnFocus maxLength={12} selectionColor={draft.color}
                    style={[styles.goalNumber, { width: Math.max(20, Math.min(120, draft.target.length * 10 + 2)) * fontScale }]} />
                  <Text style={styles.goalSuffix}>{t("/ Day")}</Text>
                </View>
                {([-1, 1] as const).map((direction) => {
                  const disabled = direction === -1 && decreaseDisabled;
                  return <Pressable key={direction} accessibilityRole="button"
                    accessibilityLabel={t("{value0} daily {value1} by one", { value0: t(direction === -1 ? 'Decrease' : 'Increase'), value1: t(draft.habitType === 'quit' ? 'limit' : 'goal') })}
                    accessibilityState={{ disabled }} disabled={disabled}
                    onPress={() => setDraft((current) => ({ ...current, target: stepGoal(current, direction) }))}
                    style={({ pressed }) => [styles.goalStep, disabled && styles.disabledStep, pressed && styles.pressed]}>
                    <AppIcon name={direction === 1 ? 'plus' : 'minus'} size={18} color={colors.icon} />
                  </Pressable>;
                })}
              </View>
              <Text style={styles.hint}>{draft.habitType === 'quit' ? t('Staying within this amount completes the day') : t('Reaching this amount completes the day')}</Text>
            </View>
            <Section title={t("ON TAP")} hint={(draft.onTap ?? 'add-one') === 'add-one' ? t("Adds one. At your {value0}, opens the editor.", { value0: t(draft.habitType === 'quit' ? 'limit' : 'goal') }) : t('Opens the editor to enter the day’s total.')}>
              <Segments label={t("On tap")} value={draft.onTap ?? 'add-one'} onChange={(onTap) => patch({ onTap })}
                options={[{ id: 'add-one', label: 'Add 1' }, { id: 'enter-total', label: 'Enter total' }]} />
            </Section>
          </>}
          <Section title={t("REMINDER")}><Pressable accessibilityRole="button" accessibilityLabel={t("Reminder, {value0}", { value0: draft.reminderTime ?? t('None') })} onPress={() => { setReminderTouched(true); setPicker('reminder'); }} style={styles.optionRow}>
            <Text style={styles.optionText}>{draft.reminderTime ?? t('No Reminders')}</Text><Chevron />
          </Pressable>
            {draft.reminderTime !== null && <Text style={styles.hint}>{t('Save to update your reminders.')}</Text>}
            {draft.remindersPaused && <Text style={styles.hint}>{t('Restored reminders are paused. Open reminder settings and save to enable them.')}</Text>}
          </Section>
          <Section title={t("CATEGORIES")}><Pressable accessibilityRole="button" accessibilityLabel={t("Categories, {value0}", { value0: draft.categories.map(category => t(category)).join(', ') || t('None') })} onPress={() => setPicker('categories')} style={styles.optionRow}>
            <Text style={styles.optionText}>{draft.categories.map(category => t(category)).join(', ') || t('None')}</Text><Chevron />
          </Pressable></Section>
          {draft.name.trim() !== '' && error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {permissionError && <ReminderStatus />}
        {saveFailed && <Text accessibilityRole="alert" style={styles.error}>{t("Changes haven’t saved yet.")}</Text>}
        <Pressable haptic={false} accessibilityRole="button" accessibilityLabel={editing ? t('Save habit changes') : t('Save new habit')} accessibilityState={{ disabled: error !== null || busy }} disabled={error !== null || busy}
          onPress={save} style={({ pressed }) => [styles.saveButton, error !== null && styles.disabledSave, pressed && styles.pressed]}>
          <Text style={[styles.saveText, error !== null && styles.disabledSaveText]}>{t(busy ? "Saving…" : saveFailed ? "Retry saving" : "Save")}</Text>
        </Pressable>
      </View>
    </View>
    <RightDrawer inline visible={iconOpen} onRequestClose={closeIcon}>
      <HabitIconScreen icon={draft.icon} emoji={draft.emoji} onChange={(icon, emoji) => patch({ icon, emoji })} onBack={closeIcon} />
    </RightDrawer>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.pickerBackdrop}>
        <View accessibilityViewIsModal style={styles.pickerPanel}>
          <Text accessibilityRole="header" style={styles.pickerTitle}>{t(pickerTitle)}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pickerContent}>
            {displayedPicker === 'repeat' && <>
              <Text style={styles.pickerHint}>{t("Choose the days for this habit.")}</Text>
              <View style={styles.dayOptions}>{DAY_NAMES.map((day, index) => <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={weekdayNames(locale, 'long')[index]}
                accessibilityState={{ checked: draft.repeatDays.includes(index) }} onPress={() => setDraft((current) => ({ ...current,
                  repeatDays: current.repeatDays.includes(index) ? current.repeatDays.filter((value) => value !== index) : [...current.repeatDays, index].sort((a, b) => a - b),
                }))} style={[styles.dayOption, draft.repeatDays.includes(index) && { backgroundColor: draft.color }]}>
                <Text style={[styles.pickerLabel, draft.repeatDays.includes(index) && { color: contrastInk(draft.color), fontWeight: '600' }]}>{weekdayNames(locale)[index]}</Text>
              </Pressable>)}</View>
              {!draft.repeatDays.length && <Text style={styles.error}>{t("Choose at least one day.")}</Text>}
            </>}
            {displayedPicker === 'reminder' && <>
              <View style={styles.switchRow}><Text style={styles.pickerLabel}>{t("Save a reminder time")}</Text>
                <Switch accessibilityLabel={t("Save a reminder time")} value={draft.reminderTime !== null}
                  onValueChange={(enabled) => { feedback('selection'); patch({ reminderTime: enabled ? '09:00' : null }); }} trackColor={{ true: draft.color }} /></View>
              {draft.reminderTime !== null && <TextInput editable={!busy && !saveFailed} keyboardAppearance={mode} accessibilityLabel={t("Reminder time in 24-hour HH:mm format")} value={draft.reminderTime}
                onChangeText={(reminderTime) => patch({ reminderTime })} placeholder="09:00" placeholderTextColor={colors.muted} maxLength={5}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} style={styles.input} />}
              {draft.reminderTime !== null && <>
                {(draft.extraReminderTimes ?? []).map((time, index) => <View key={index} style={styles.switchRow}>
                  <TextInput editable={!busy && !saveFailed} keyboardAppearance={mode} accessibilityLabel={t('Reminder time {value0}', { value0: index + 2 })} value={time} maxLength={5}
                    keyboardType="numbers-and-punctuation" style={[styles.input, { flex: 1 }]} onChangeText={next => {
                      if (!upgrade.request('multiple-reminders')) return;
                      patch({ extraReminderTimes: (draft.extraReminderTimes ?? []).map((value, i) => i === index ? next : value) });
                    }} />
                  <RoundButton label={t('Remove reminder')} onPress={() => patch({ extraReminderTimes: (draft.extraReminderTimes ?? []).filter((_value, i) => i !== index) })}><AppIcon name="close" /></RoundButton>
                </View>)}
                {(draft.extraReminderTimes?.length ?? 0) < 2 && <Pressable accessibilityRole="button" style={styles.categoryRow} onPress={() => {
                  if (upgrade.request('multiple-reminders')) patch({ extraReminderTimes: [...(draft.extraReminderTimes ?? []), ['12:00','18:00'].find(time => !draftReminderTimes(draft).includes(time)) ?? '20:00'] });
                }}><Text style={styles.pickerLabel}>{t('Add reminder')} · PRO</Text><AppIcon name="plus" /></Pressable>}
                <View style={styles.switchRow}><Text style={styles.pickerLabel}>{t('Discreet notifications')}</Text><Switch accessibilityLabel={t('Discreet notifications')} value={draft.reminderDiscreet !== false}
                  onValueChange={value => patch({ reminderDiscreet: value })} trackColor={{ true: draft.color }} /></View>
                <Text style={styles.pickerHint}>{t('Discreet notifications hide habit names and custom text.')}</Text>
              </>}
              <ReminderStatus />
              {reminderError && <Text accessibilityRole="alert" style={styles.error}>{t(reminderError)}</Text>}
            </>}
            {displayedPicker === 'categories' && CATEGORIES.map((category) => {
              const checked = draft.categories.includes(category);
              return <Pressable key={category} accessibilityRole="checkbox" accessibilityLabel={t(category)} accessibilityState={{ checked }}
                onPress={() => setDraft((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((value) => value !== category) : [...current.categories, category] }))}
                style={styles.categoryRow}><Text style={styles.pickerLabel}>{t(category)}</Text><View style={[styles.categoryCheck, checked && { backgroundColor: draft.color, borderColor: draft.color }]}>
                  {checked && <Checkmark color={contrastInk(draft.color)} />}
                </View></Pressable>;
            })}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: pickerInvalid }} disabled={pickerInvalid}
            onPress={() => { Keyboard.dismiss(); setPicker(null); }} style={[styles.doneButton, pickerInvalid && styles.disabledSave]}><Text style={styles.saveText}>{t("Done")}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    {upgrade.sheet}
  </KeyboardAvoidingView>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, scroll: { flex: 1 },
  header: { paddingTop: space.xs, paddingHorizontal: layout.inset, paddingBottom: space.xxs, backgroundColor: colors.background },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.controlBorder, alignSelf: 'center', marginBottom: 12 },
  headerRow: { width: '100%', maxWidth: layout.form, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }, headerTitle: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }, headerSpacer: { width: control.roundTarget },
  scrollContent: { paddingHorizontal: layout.inset, paddingBottom: layout.section }, content: { width: '100%', maxWidth: layout.form, alignSelf: 'center', gap: layout.group },
  iconHero: { height: 164, alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconWallpaper: { position: 'absolute', inset: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignContent: 'space-around', gap: 14, opacity: 0.17, overflow: 'hidden' },
  editBadge: { position: 'absolute', right: -1, bottom: 1, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  changeIcon: { fontSize: 15, fontWeight: '500' },
  section: { gap: space.xs }, sectionLabel: { color: colors.muted, fontSize: 12, letterSpacing: 0.5, paddingLeft: space.xxs },
  input: { minHeight: control.primary, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.control, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, color: colors.text, fontSize: typeSize.body },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.xs },

  segments: { flexDirection: 'row', borderRadius: radius.control, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: space.xxs },
  segment: { flex: 1, minHeight: control.touch, justifyContent: 'center', alignItems: 'center', borderRadius: radius.small, paddingHorizontal: space.xs, paddingVertical: space.xs },
  selectedSegment: { backgroundColor: colors.control }, segmentText: { fontSize: typeSize.label, color: colors.muted, textAlign: 'center', fontWeight: '500' }, selectedSegmentText: { color: colors.text },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: control.row, paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control },
  optionText: { flex: 1, color: colors.text, fontSize: typeSize.body }, repeatDots: { flexDirection: 'row', gap: 3 }, repeatDot: { width: 6, height: 6, borderRadius: 2 },
  goalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  goalIndicator: { flexDirection: 'row', gap: 3 }, goalIndicatorCell: { width: 10, height: 10, borderRadius: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'stretch', gap: space.xs },
  goalField: { flex: 1, minWidth: 0, minHeight: control.regular, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.panel },
  goalNumber: { flexShrink: 1, minWidth: 18, paddingVertical: 10, paddingHorizontal: 0, color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  goalSuffix: { flexShrink: 1, color: colors.muted, fontSize: 15, letterSpacing: 1 },
  goalStep: { width: control.primary, minHeight: control.regular, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  disabledStep: { opacity: 0.45 },
  error: { color: colors.error, fontSize: 12, lineHeight: 18 },
  footer: { paddingHorizontal: layout.inset, paddingTop: space.sm, paddingBottom: Platform.OS === 'ios' ? 24 : 18, backgroundColor: colors.background },
  saveButton: { width: '100%', maxWidth: layout.form, alignSelf: 'center', backgroundColor: colors.accent, borderRadius: radius.primary, minHeight: control.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, paddingHorizontal: space.md },
  disabledSave: { backgroundColor: colors.disabled }, saveText: { color: colors.onAccent, fontSize: typeSize.action, fontWeight: '600', textAlign: 'center', flexShrink: 1 }, disabledSaveText: { color: colors.disabledText }, pressed: { opacity: 0.7 },
  pickerBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space.lg }, pickerPanel: { width: '100%', maxWidth: layout.preview, maxHeight: '85%', alignSelf: 'center', backgroundColor: colors.raised, borderRadius: radius.card, padding: space.md, gap: space.md },
  pickerTitle: { color: colors.text, fontSize: 21, fontWeight: '600' }, pickerContent: { gap: space.md }, pickerLabel: { color: colors.text, fontSize: 14 }, pickerHint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  emojiOption: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderCurve: 'continuous', borderWidth: 1.5, borderColor: 'transparent' },
  emojiOptionText: { fontSize: 27, lineHeight: 36, includeFontPadding: false },
  dayOptions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs }, dayOption: { minWidth: control.touch, flexGrow: 0, flexBasis: 'auto', minHeight: control.touch, justifyContent: 'center', alignItems: 'center', borderRadius: radius.small, backgroundColor: colors.control, paddingHorizontal: space.xs, paddingVertical: space.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }, categoryRow: { minHeight: control.regular, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryCheck: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: colors.controlBorder, alignItems: 'center', justifyContent: 'center' }, doneButton: { minHeight: control.touch, borderRadius: radius.control, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
}));
