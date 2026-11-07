import { type ReactNode, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { Checkmark, Chevron, HabitIcon, RoundButton } from '../components/habit-ui';
import { CATEGORIES, draftError, draftFromHabit, emptyDraft, HABIT_COLORS, HABIT_ICONS, type HabitDraft, stepGoal } from '../data/habit-draft';
import { DAY_NAMES, type Habit, repeatLabel } from '../data/sample-habits';
import { HABIT_EMOJIS, normalizedHabitEmoji } from '../data/habit-emoji';
import { contrastInk } from '../data/habit-share';
import AppIcon from '../components/app-icon';
import { feedback } from '../utils/feedback';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';

type Picker = 'icon' | 'repeat' | 'reminder' | 'categories';

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  const styles = useStyles();
  return <View style={styles.section}><Text style={styles.sectionLabel}>{title}</Text>{children}
    {hint && <Text style={styles.hint}>{hint}</Text>}
  </View>;
}

function Segments<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string;
}) {
  const styles = useStyles();
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.segments}>
    {options.map((option) => <Pressable key={option.id} accessibilityRole="tab" accessibilityLabel={option.label}
      accessibilityState={{ selected: value === option.id }} onPress={() => onChange(option.id)}
      style={[styles.segment, value === option.id && styles.selectedSegment]}>
      <Text style={[styles.segmentText, value === option.id && styles.selectedSegmentText]}>{option.label}</Text>
    </Pressable>)}
  </View>;
}

export default function HabitFormScreen({ initialHabit, onClose, onSave }: { initialHabit?: Habit; onClose: () => void; onSave: (draft: HabitDraft) => void }) {
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const [draft, setDraft] = useState(() => initialHabit ? draftFromHabit(initialHabit) : emptyDraft());
  const editing = initialHabit !== undefined;
  const [picker, setPicker] = useState<Picker | null>(null);
  const lastPicker = useRef<Picker>('icon');
  if (picker !== null) lastPicker.current = picker;
  const displayedPicker = picker ?? lastPicker.current;
  const [iconTab, setIconTab] = useState<'icons' | 'emoji'>(initialHabit?.icon === 'emoji' ? 'emoji' : 'icons');
  const saved = useRef(false);
  const { fontScale } = useWindowDimensions();
  const error = draftError(draft);
  const preview = { icon: draft.icon, emoji: draft.emoji, color: draft.color };
  const patch = (changes: Partial<HabitDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const pickerTitle = displayedPicker === 'icon' ? 'Choose an icon' : displayedPicker === 'repeat' ? 'Repeat' : displayedPicker === 'reminder' ? 'Reminder' : 'Categories';
  const pickerInvalid = (displayedPicker === 'repeat' && !draft.repeatDays.length)
    || (displayedPicker === 'icon' && draft.icon === 'emoji' && !normalizedHabitEmoji(draft.emoji))
    || (displayedPicker === 'reminder' && draft.reminderTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.reminderTime));
  const targetValue = draft.target.trim() ? Number(draft.target.replace(',', '.')) : NaN;
  const decreaseDisabled = Number.isFinite(targetValue) && targetValue <= (draft.habitType === 'quit' ? 0 : 1);

  function save() {
    if (draftError(draft) || saved.current) return;
    saved.current = true;
    Keyboard.dismiss();
    onSave(draft);
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
    <View style={styles.header}>
      <View style={styles.grabber} />
      <View style={styles.headerRow}>
        <RoundButton label={editing ? 'Cancel editing habit' : 'Cancel new habit'} onPress={onClose}><AppIcon name="close" size={20} /></RoundButton>
        <Text accessibilityRole="header" style={styles.headerTitle}>{editing ? 'Edit Habit' : 'New Habit'}</Text><View style={styles.headerSpacer} />
      </View>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} indicatorStyle={mode === 'dark' ? 'white' : 'black'}>
      <View style={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change habit icon" onPress={() => { setIconTab(draft.icon === 'emoji' ? 'emoji' : 'icons'); setPicker('icon'); }} style={styles.iconHero}>
          <View pointerEvents="none" style={styles.iconWallpaper}>
            {Array.from({ length: 24 }, (_, index) => <HabitIcon key={index} habit={{ icon: HABIT_ICONS[index % HABIT_ICONS.length].id, color: draft.color }} size={30} bare />)}
          </View>
          <View><HabitIcon habit={preview} size={96} round /><View style={[styles.editBadge, { backgroundColor: draft.color }]}><AppIcon name="edit" size={15} color={contrastInk(draft.color)} /></View></View>
          <Text style={[styles.changeIcon, { color: accentForeground(draft.color, mode) }]}>Change icon</Text>
        </Pressable>
        <Section title="NAME"><TextInput keyboardAppearance={mode} accessibilityLabel="Habit name" value={draft.name} onChangeText={(name) => patch({ name })}
          maxLength={60} autoCapitalize="sentences" style={styles.input} selectionColor={draft.color} returnKeyType="done" /></Section>
        <Section title="DESCRIPTION"><TextInput keyboardAppearance={mode} accessibilityLabel="Habit description" value={draft.description} onChangeText={(description) => patch({ description })}
          maxLength={300} multiline style={styles.input} selectionColor={draft.color} /></Section>
        <Section title="COLOR"><View accessibilityRole="radiogroup" accessibilityLabel="Habit color" style={styles.palette}>
          {[0, 1, 2].map((row) => <View key={row} style={styles.paletteRow}>
            {HABIT_COLORS.slice(row * 7, row * 7 + 7).map((color) => <Pressable key={color} accessibilityRole="radio"
              accessibilityLabel={`Color ${HABIT_COLORS.indexOf(color) + 1}, ${color}`} accessibilityState={{ checked: draft.color === color }}
              onPress={() => patch({ color })} style={[styles.colorRing, { borderColor: draft.color === color ? color : 'transparent' }]}>
              <View style={[styles.colorSwatch, { backgroundColor: color }]} />
            </Pressable>)}
          </View>)}
        </View></Section>
        <Section title="HABIT TYPE" hint={draft.habitType === 'build' ? 'Mark each day you complete it.' : 'Mark each day you stay away from it.'}>
          <Segments label="Habit type" value={draft.habitType} onChange={(habitType) => patch({ habitType })}
            options={[{ id: 'build', label: 'Build A Habit' }, { id: 'quit', label: 'Quit A Habit' }]} />
        </Section>
        <Section title="REPEAT"><Pressable accessibilityRole="button" accessibilityLabel={`Repeat, ${repeatLabel(draft.repeatDays)}`} onPress={() => setPicker('repeat')} style={styles.optionRow}>
          <Text style={styles.optionText}>{repeatLabel(draft.repeatDays) || 'Choose days'}</Text>
          <View style={styles.repeatDots}>{DAY_NAMES.map((day, index) => <View key={day} style={[styles.repeatDot, { backgroundColor: draft.repeatDays.includes(index) ? draft.color : colors.controlBorder }]} />)}</View>
          <Chevron />
        </Pressable></Section>
        <Section title="TRACKING" hint={draft.trackingKind === 'yes-no' ? 'Check the day off — done or not done.' : draft.trackingKind === 'count' ? 'Count toward a daily goal — glasses, sets, pages' : 'Log amounts with a unit — 2 L of water, 7.5 km'}>
          <Segments label="Tracking method" value={draft.trackingKind} onChange={(trackingKind) => patch({ trackingKind })}
            options={[{ id: 'yes-no', label: 'Yes / No' }, { id: 'count', label: 'Count' }, { id: 'measure', label: 'Measure' }]} />
        </Section>
        {draft.trackingKind !== 'yes-no' && <>
          {draft.trackingKind === 'measure' && <Section title="UNIT">
            <TextInput keyboardAppearance={mode} accessibilityLabel="Measurement unit" value={draft.unit} onChangeText={(unit) => patch({ unit })}
              placeholder="km, pages, minutes…" placeholderTextColor={colors.muted} style={styles.input} maxLength={20}
              selectionColor={draft.color} autoCapitalize="none" />
          </Section>}
          <View style={styles.section}>
            <View style={styles.goalHeading}>
              <Text style={styles.sectionLabel}>{draft.habitType === 'quit' ? 'DAILY LIMIT' : 'DAILY GOAL'}</Text>
              <View style={styles.goalIndicator}>
                <View style={[styles.goalIndicatorCell, { backgroundColor: `${draft.color}30` }]} />
                <View style={[styles.goalIndicatorCell, { backgroundColor: draft.color }]} />
              </View>
            </View>
            <View style={styles.goalRow}>
              <View style={styles.goalField}>
                <TextInput keyboardAppearance={mode} accessibilityLabel={draft.habitType === 'quit' ? 'Daily limit' : 'Daily goal'} value={draft.target}
                  onChangeText={(target) => patch({ target })} keyboardType={draft.trackingKind === 'count' ? 'number-pad' : 'decimal-pad'}
                  selectTextOnFocus maxLength={12} selectionColor={draft.color}
                  style={[styles.goalNumber, { width: Math.max(20, Math.min(120, draft.target.length * 10 + 2)) * fontScale }]} />
                <Text style={styles.goalSuffix}>/ Day</Text>
              </View>
              {([-1, 1] as const).map((direction) => {
                const disabled = direction === -1 && decreaseDisabled;
                return <Pressable key={direction} accessibilityRole="button"
                  accessibilityLabel={`${direction === -1 ? 'Decrease' : 'Increase'} daily ${draft.habitType === 'quit' ? 'limit' : 'goal'} by one`}
                  accessibilityState={{ disabled }} disabled={disabled}
                  onPress={() => setDraft((current) => ({ ...current, target: stepGoal(current, direction) }))}
                  style={({ pressed }) => [styles.goalStep, disabled && styles.disabledStep, pressed && styles.pressed]}>
                  <AppIcon name={direction === 1 ? 'plus' : 'minus'} size={18} color={colors.icon} />
                </Pressable>;
              })}
            </View>
            <Text style={styles.hint}>{draft.habitType === 'quit' ? 'Staying within this amount completes the day' : 'Reaching this amount completes the day'}</Text>
          </View>
          <Section title="ON TAP" hint={(draft.onTap ?? 'add-one') === 'add-one' ? `Adds one. At your ${draft.habitType === 'quit' ? 'limit' : 'goal'}, opens the editor.` : 'Opens the editor to enter the day’s total.'}>
            <Segments label="On tap" value={draft.onTap ?? 'add-one'} onChange={(onTap) => patch({ onTap })}
              options={[{ id: 'add-one', label: 'Add 1' }, { id: 'enter-total', label: 'Enter total' }]} />
          </Section>
        </>}
        <Section title="REMINDER"><Pressable accessibilityRole="button" accessibilityLabel={`Reminder, ${draft.reminderTime ?? 'none'}`} onPress={() => setPicker('reminder')} style={styles.optionRow}>
          <Text style={styles.optionText}>{draft.reminderTime ?? 'No Reminders'}</Text><Chevron />
        </Pressable>
          {draft.reminderTime !== null && <Text style={styles.hint}>Notification delivery is coming later.</Text>}
        </Section>
        <Section title="CATEGORIES"><Pressable accessibilityRole="button" accessibilityLabel={`Categories, ${draft.categories.join(', ') || 'none'}`} onPress={() => setPicker('categories')} style={styles.optionRow}>
          <Text style={styles.optionText}>{draft.categories.join(', ') || 'None'}</Text><Chevron />
        </Pressable></Section>
        {draft.name.trim() !== '' && error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <Pressable haptic={false} accessibilityRole="button" accessibilityLabel={editing ? 'Save habit changes' : 'Save new habit'} accessibilityState={{ disabled: error !== null }} disabled={error !== null}
        onPress={save} style={({ pressed }) => [styles.saveButton, error !== null && styles.disabledSave, pressed && styles.pressed]}>
        <Text style={[styles.saveText, error !== null && styles.disabledSaveText]}>Save</Text>
      </Pressable>
    </View>
    <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.pickerBackdrop}>
        <View accessibilityViewIsModal style={styles.pickerPanel}>
          <Text accessibilityRole="header" style={styles.pickerTitle}>{pickerTitle}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pickerContent}>
            {displayedPicker === 'icon' && <>
              <Segments label="Icon style" value={iconTab} onChange={setIconTab} options={[{ id: 'icons', label: 'Icons' }, { id: 'emoji', label: 'Emoji' }]} />
              {iconTab === 'icons' ? <View accessibilityRole="radiogroup" accessibilityLabel="Habit icon" style={styles.iconOptions}>{HABIT_ICONS.map(({ id, label }) =>
                <Pressable key={id} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: draft.icon === id }}
                  onPress={() => patch({ icon: id })} style={[styles.iconOption, draft.icon === id && { borderColor: draft.color }]}>
                  <HabitIcon habit={{ icon: id, color: draft.color }} size={48} /><Text style={styles.pickerLabel}>{label}</Text>
                </Pressable>)}</View> : <>
                <View style={styles.emojiInputRow}>
                  <HabitIcon habit={preview} size={48} />
                  <TextInput keyboardAppearance={mode} accessibilityLabel="Custom habit emoji" value={draft.icon === 'emoji' ? draft.emoji : ''}
                    onChangeText={(emoji) => patch({ icon: 'emoji', emoji })} placeholder="Your favourite emoji"
                    placeholderTextColor={colors.muted} autoCorrect={false} autoCapitalize="none" spellCheck={false} maxLength={40}
                    style={[styles.input, styles.emojiInput]} selectionColor={draft.color} />
                </View>
                <Text style={styles.pickerHint}>Use your emoji keyboard, paste one, or choose below.</Text>
                {draft.icon === 'emoji' && !normalizedHabitEmoji(draft.emoji) && <Text accessibilityRole="alert" style={styles.error}>Choose just one emoji.</Text>}
                <View accessibilityRole="radiogroup" accessibilityLabel="Emoji icons" style={styles.emojiOptions}>
                  {HABIT_EMOJIS.map(({ emoji, label }) => <Pressable key={emoji} accessibilityRole="radio" accessibilityLabel={`${label}, ${emoji}`}
                    accessibilityState={{ checked: draft.icon === 'emoji' && normalizedHabitEmoji(draft.emoji) === emoji }}
                    onPress={() => { Keyboard.dismiss(); patch({ icon: 'emoji', emoji }); }}
                    style={[styles.emojiOption, draft.icon === 'emoji' && normalizedHabitEmoji(draft.emoji) === emoji && { borderColor: draft.color, backgroundColor: `${draft.color}18` }]}>
                    <Text allowFontScaling={false} style={styles.emojiOptionText}>{emoji}</Text>
                  </Pressable>)}
                </View>
              </>}
            </>}
            {displayedPicker === 'repeat' && <>
              <Text style={styles.pickerHint}>Choose the days for this habit.</Text>
              <View style={styles.dayOptions}>{DAY_NAMES.map((day, index) => <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={day}
                accessibilityState={{ checked: draft.repeatDays.includes(index) }} onPress={() => setDraft((current) => ({ ...current,
                  repeatDays: current.repeatDays.includes(index) ? current.repeatDays.filter((value) => value !== index) : [...current.repeatDays, index].sort((a, b) => a - b),
                }))} style={[styles.dayOption, draft.repeatDays.includes(index) && { backgroundColor: draft.color }]}>
                <Text style={[styles.pickerLabel, draft.repeatDays.includes(index) && { color: contrastInk(draft.color), fontWeight: '600' }]}>{day}</Text>
              </Pressable>)}</View>
              {!draft.repeatDays.length && <Text style={styles.error}>Choose at least one day.</Text>}
            </>}
            {displayedPicker === 'reminder' && <>
              <View style={styles.switchRow}><Text style={styles.pickerLabel}>Save a reminder time</Text>
                <Switch accessibilityLabel="Save a reminder time" value={draft.reminderTime !== null}
                  onValueChange={(enabled) => { feedback('selection'); patch({ reminderTime: enabled ? '09:00' : null }); }} trackColor={{ true: draft.color }} /></View>
              {draft.reminderTime !== null && <TextInput keyboardAppearance={mode} accessibilityLabel="Reminder time in 24-hour HH:mm format" value={draft.reminderTime}
                onChangeText={(reminderTime) => patch({ reminderTime })} placeholder="09:00" placeholderTextColor={colors.muted} maxLength={5}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} style={styles.input} />}
              <Text style={styles.pickerHint}>Use 24-hour time (HH:mm). The time is saved with the habit. Notification delivery is coming later.</Text>
              {draft.reminderTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.reminderTime) && <Text style={styles.error}>Enter a time such as 09:00 or 18:30.</Text>}
            </>}
            {displayedPicker === 'categories' && CATEGORIES.map((category) => {
              const checked = draft.categories.includes(category);
              return <Pressable key={category} accessibilityRole="checkbox" accessibilityLabel={category} accessibilityState={{ checked }}
                onPress={() => setDraft((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((value) => value !== category) : [...current.categories, category] }))}
                style={styles.categoryRow}><Text style={styles.pickerLabel}>{category}</Text><View style={[styles.categoryCheck, checked && { backgroundColor: draft.color, borderColor: draft.color }]}>
                  {checked && <Checkmark color={contrastInk(draft.color)} />}
                </View></Pressable>;
            })}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: pickerInvalid }} disabled={pickerInvalid}
            onPress={() => { Keyboard.dismiss(); setPicker(null); }} style={[styles.doneButton, pickerInvalid && styles.disabledSave]}><Text style={styles.saveText}>Done</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </KeyboardAvoidingView>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, scroll: { flex: 1 },
  header: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 4, backgroundColor: colors.background },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.controlBorder, alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' }, headerTitle: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }, headerSpacer: { width: 46 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 }, content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 16 },
  iconHero: { height: 164, alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconWallpaper: { position: 'absolute', inset: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignContent: 'space-around', gap: 14, opacity: 0.17, overflow: 'hidden' },
  editBadge: { position: 'absolute', right: -1, bottom: 1, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  changeIcon: { fontSize: 15, fontWeight: '500' },
  section: { gap: 8 }, sectionLabel: { color: colors.muted, fontSize: 12, letterSpacing: 0.5, paddingLeft: 4 },
  input: { minHeight: 54, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, color: colors.text, fontSize: 16 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
  palette: { gap: 2 }, paletteRow: { flexDirection: 'row', gap: 3 }, colorRing: { flex: 1, aspectRatio: 1, borderRadius: 16, borderWidth: 2, padding: 3 },
  colorSwatch: { flex: 1, borderRadius: 12 },
  segments: { flexDirection: 'row', borderRadius: 19, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, padding: 4 },
  segment: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 15, paddingHorizontal: 6 },
  selectedSegment: { backgroundColor: colors.control }, segmentText: { fontSize: 14, color: colors.muted, textAlign: 'center', fontWeight: '500' }, selectedSegmentText: { color: colors.text },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 20 },
  optionText: { flex: 1, color: colors.text, fontSize: 16 }, repeatDots: { flexDirection: 'row', gap: 3 }, repeatDot: { width: 6, height: 6, borderRadius: 2 },
  goalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  goalIndicator: { flexDirection: 'row', gap: 3 }, goalIndicatorCell: { width: 10, height: 10, borderRadius: 3 },
  goalRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  goalField: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.panel },
  goalNumber: { flexShrink: 1, minWidth: 18, paddingVertical: 10, paddingHorizontal: 0, color: colors.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  goalSuffix: { color: colors.muted, fontSize: 15, letterSpacing: 1 },
  goalStep: { width: 64, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  disabledStep: { opacity: 0.45 },
  error: { color: colors.error, fontSize: 12, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 18, backgroundColor: colors.background },
  saveButton: { width: '100%', maxWidth: 544, alignSelf: 'center', backgroundColor: colors.accent, borderRadius: 30, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  disabledSave: { backgroundColor: colors.disabled }, saveText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' }, disabledSaveText: { color: colors.disabledText }, pressed: { opacity: 0.7 },
  pickerBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 24 }, pickerPanel: { width: '100%', maxWidth: 440, maxHeight: '85%', alignSelf: 'center', backgroundColor: colors.raised, borderRadius: 24, padding: 20, gap: 16 },
  pickerTitle: { color: colors.text, fontSize: 21, fontWeight: '600' }, pickerContent: { gap: 14 }, pickerLabel: { color: colors.text, fontSize: 14 }, pickerHint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  iconOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, iconOption: { width: '30%', minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: 'transparent', borderRadius: 16 },
  emojiInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, emojiInput: { flex: 1, minWidth: 0 },
  emojiOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOption: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderCurve: 'continuous', borderWidth: 1.5, borderColor: 'transparent' },
  emojiOptionText: { fontSize: 27, lineHeight: 36, includeFontPadding: false },
  dayOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dayOption: { width: '22%', minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: colors.control },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, categoryRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryCheck: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: colors.controlBorder, alignItems: 'center', justifyContent: 'center' }, doneButton: { minHeight: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
}));
