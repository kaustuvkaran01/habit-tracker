import Modal from './private-modal';
import { space, layout, control, radius } from './design-tokens';
import { useTranslation } from '../i18n/context';
import { dayProgress } from '../data/habit-entries';
import { weekdayNames } from '../i18n/locale';
import { useRef, useState } from 'react';
import { type LayoutRectangle, StyleSheet, Text, View } from 'react-native';
import Pressable from './haptic-pressable';
import { type Habit } from '../data/habit-types';
import { addDays, calendarDays, canCheckIn, dateKey, isScheduled, monthLabel, startOfWeek, streakDays } from '../data/habit-calendar';
import DraggableHabit from './draggable-habit';
import { useAppPreferences } from './app-preferences';
import { collectionProgress } from '../data/habit-rewards';
import AppIcon from './app-icon';
import { contrastInk } from '../data/habit-share';
import { Checkmark, Chevron, HabitIcon, RoundButton } from './habit-ui';
import { createThemedStyles, useTheme } from './theme';

export function ActivityGrid({ habit, today, labels = false, showMonths = labels, showDays = labels }: { habit: Habit; today: Date; labels?: boolean; showMonths?: boolean; showDays?: boolean }) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { mode } = useTheme();
  const { preferences: p } = useAppPreferences();
  const names = p.weekStartsOn === 0 ? [weekdayNames(locale)[6], ...weekdayNames(locale).slice(0, 6)] : weekdayNames(locale);
  const first = addDays(startOfWeek(today, p.weekStartsOn), -25 * 7);
  const completed = new Set(habit.checkIns);
  const groups: { label: string; count: number }[] = [];
  for (let column = 0; column < 26; column += 1) {
    const label = addDays(first, column * 7).toLocaleDateString(locale, { month: 'short' });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.count += 1;
    else groups.push({ label, count: 1 });
  }
  return <View accessible accessibilityRole="image" accessibilityLabel={t("{value0}, 26-week activity history", { value0: habit.name })} style={styles.activity}>
    {showMonths && <View style={[styles.monthLabels, { paddingLeft: showDays ? 27 : 0 }]}>{groups.map((group, index) =>
      <Text key={index} numberOfLines={1} style={[styles.monthLabel, { flex: group.count }]}>{group.count > 1 ? group.label : ''}</Text>)}</View>}
    {names.map((day, row) => <View key={day} style={styles.activityRow}>
      {showDays && <Text style={styles.weekLabel}>{row % 2 === 1 ? day : ''}</Text>}
      {Array.from({ length: 26 }, (_, column) => {
        const date = addDays(first, column * 7 + row);
        const key = dateKey(date);
        const progress = dayProgress(habit, key, dateKey(today));
        return <View key={column} style={[styles.activityCell, { backgroundColor: `${habit.color}${mode === 'dark' ? '12' : '32'}` },
          completed.has(key) && { backgroundColor: habit.color },
          progress.status === 'partial' && { backgroundColor: `${habit.color}77`, borderWidth: 1, borderStyle: 'dashed' as const, borderColor: habit.color },
          progress.status === 'failed' && { borderWidth: 1, borderColor: habit.color }, (key > dateKey(today) || !isScheduled(habit, date)) && styles.future]} />;
      })}
    </View>)}
  </View>;
}

export function MonthCalendar({ habit, month, today, compact = false, onToggle, onNote }: {
  habit: Habit; month: Date; today: Date; compact?: boolean;
  onToggle?: (key: string) => void; onNote?: (key: string) => void;
}) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const { preferences: p } = useAppPreferences();
  const names = p.weekStartsOn === 0 ? [weekdayNames(locale)[6], ...weekdayNames(locale).slice(0, 6)] : weekdayNames(locale);
  const days = calendarDays(month, p.weekStartsOn);
  const completed = new Set(habit.checkIns);
  return <View style={[styles.calendar, compact && styles.compactCalendar]}>
    {!compact && <View style={styles.calendarRow}>{names.map((day) => <Text key={day} style={styles.dayName}>{day}</Text>)}</View>}
    {Array.from({ length: 6 }, (_, week) => <View key={week} style={[styles.calendarRow, compact && styles.compactRow]}>
      {days.slice(week * 7, week * 7 + 7).map((day) => {
        const key = dateKey(day);
        const inMonth = day.getMonth() === month.getMonth();
        const progress = dayProgress(habit, key, dateKey(today));
        const complete = completed.has(key) && (!compact || inMonth);
        const future = key > dateKey(today);
        const allowed = canCheckIn(habit, key, today);
        const cellStyle = [styles.calendarCell, compact && styles.compactCell,
          complete && { backgroundColor: compact ? habit.color : `${habit.color}24` },
          !complete && compact && { backgroundColor: `${habit.color}${inMonth ? mode === 'dark' ? '10' : '28' : '06'}` },
          progress.status === 'partial' && { backgroundColor: `${habit.color}55`, borderColor: habit.color, borderStyle: 'dashed' as const },
          progress.status === 'failed' && { borderColor: habit.color },
          !compact && p.highlightToday && key === dateKey(today) && { borderColor: habit.color },
          (future || !isScheduled(habit, day)) && styles.future];
        if (compact) return <View key={key} style={cellStyle} />;
        return <Pressable key={key} haptic={false} disabled={!allowed} accessibilityRole={progress.configuration.tracking.kind === 'yes-no' ? 'checkbox' : 'button'}
          accessibilityLabel={`${day.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${p.notes && habit.notes[key] ? t(', has a note') : ''}, ${t(progress.status)}${progress.amount === undefined ? '' : ', ' + progress.amount}`}
          accessibilityState={progress.configuration.tracking.kind === 'yes-no' ? { checked: complete, disabled: !allowed } : { disabled: !allowed }} accessibilityHint={t('Tap to log progress. Hold to edit entry.')}
          onPress={() => onToggle?.(key)} onLongPress={() => onNote?.(key)} delayLongPress={450}
          accessibilityActions={allowed && onNote ? [{ name: 'longpress', label: t('Edit entry') }] : undefined}
          onAccessibilityAction={event => { if (allowed && event.nativeEvent.actionName === 'longpress') onNote?.(key); }}
          style={({ pressed }) => [...cellStyle, pressed && styles.pressed]}>
          <Text style={[styles.dateNumber, !inMonth && !complete && styles.outsideMonth, complete && { color: colors.text }]}>{day.getDate()}</Text>
          {progress.amount !== undefined && <Text numberOfLines={1} style={[styles.dateAmount, { color: colors.text }]}>{progress.amount}{progress.status === 'failed' ? ' ×' : ''}</Text>}
          {progress.status === 'failed' && progress.amount === undefined && <Text style={styles.dateAmount}>×</Text>}
          {(complete || (p.notes && habit.notes[key])) && <View style={[styles.dayDot, { backgroundColor: p.notes && habit.notes[key] ? colors.text : habit.color }, progress.amount !== undefined && { top: 4, right: 4, bottom: undefined }]} />}
        </Pressable>;
      })}
    </View>)}
  </View>;
}

export function MonthSelector({ month, onChange, short = false }: { month: Date; onChange: (date: Date) => void; short?: boolean }) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(month.getFullYear());
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("Choose month, {value0}", { value0: monthLabel(month, false, locale) })}
      onPress={() => { setYear(month.getFullYear()); setOpen(true); }} style={styles.monthSelector}>
      <Text style={styles.selectorText}>{monthLabel(month, short, locale)}</Text><Chevron direction="down" />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t("Close month picker")} onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={styles.monthPicker}>
          <View style={styles.pickerHeading}>
            <RoundButton label={t("Previous year")} onPress={() => setYear((current) => current - 1)}><Chevron direction="left" /></RoundButton>
            <Text accessibilityRole="header" style={styles.pickerTitle}>{year}</Text>
            <RoundButton label={t("Next year")} onPress={() => setYear((current) => current + 1)}><Chevron /></RoundButton>
          </View>
          <View style={styles.monthOptions}>{Array.from({ length: 12 }, (_, index) => {
            const date = new Date(year, index, 1, 12);
            const selected = month.getFullYear() === year && month.getMonth() === index;
            return <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected }}
              onPress={() => { onChange(date); setOpen(false); }} style={[styles.monthOption, selected && styles.selectedMonth]}>
              <Text style={styles.selectorText}>{date.toLocaleDateString(locale, { month: 'short' })}</Text>
            </Pressable>;
          })}</View>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.cancelButton}><Text style={styles.selectorText}>{t("Cancel")}</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}

type HomeViewProps = {
  onReorder?: (id: string, target: string) => void; habits: Habit[]; today: Date; onOpen: (id: string) => void; onToggle: (id: string, key: string) => void;
};

function HabitMeta({ habit, today, view }: { habit: Habit; today: Date; view: 'card' | 'list' | 'month' }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();
  const { preferences: p } = useAppPreferences();
  const showStreak = view === 'card' ? p.cardStreak : view === 'list' ? p.listStreak : p.monthStreak;
  if (!showStreak && !p.showStreakGoal && !(p.showCategories && habit.categories?.length)) return null;
  const progress = collectionProgress(habit, today);
  return <View style={styles.meta}>
    {showStreak && <View style={styles.streak}><AppIcon name="flame" size={12} color={colors.accentText} /><Text style={styles.metaText}>{t("{count} days", { count: streakDays(habit, today) })}</Text></View>}
    {p.showStreakGoal && <Text style={styles.metaText}>{progress.completedCycle ? 90 : Math.min(progress.currentStreak, 90)}/90</Text>}
    {p.showCategories && habit.categories?.map((category) => <Text key={category} style={styles.metaText}>{t(category)}</Text>)}
  </View>;
}

export function HabitCards({ habits, today, onOpen, onToggle, onReorder }: HomeViewProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();
  const { preferences: p } = useAppPreferences();
  const positions = useRef<Record<string, LayoutRectangle>>({});
  return <View style={styles.habitCards}>{habits.map((habit) => {
    const complete = habit.checkIns.includes(dateKey(today));
    const allowed = canCheckIn(habit, dateKey(today), today);
    const progress = dayProgress(habit, dateKey(today), dateKey(today));
    const numeric = progress.configuration.tracking.kind !== 'yes-no';
    return <DraggableHabit key={habit.id} id={habit.id} enabled={p.dragToReorder} positions={positions} onDrop={onReorder} style={[styles.habitCard, { backgroundColor: `${habit.color}07` }]}>
      <View style={styles.habitHeading}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Open {value0}", { value0: habit.name })} onPress={() => onOpen(habit.id)} style={styles.habitTitleButton}>
          <HabitIcon habit={habit} size={48} />
          <View style={styles.habitHeadingCopy}>
            <Text style={styles.habitTitle}>{habit.name}</Text>
            {habit.description.trim() !== '' && <Text style={styles.habitDescription}>{habit.description}</Text>}
          </View>
        </Pressable>
        <Pressable haptic={false} disabled={!allowed} accessibilityRole={numeric ? "button" : "checkbox"} accessibilityLabel={numeric ? `${habit.name}, ${t(progress.status)}, ${progress.amount ?? '—'} / ${progress.configuration.tracking.target ?? 1} ${progress.configuration.tracking.unit ?? ''}` : t("Complete {value0} today", { value0: habit.name })} accessibilityState={{ checked: complete, disabled: !allowed }}
          onPress={() => onToggle(habit.id, dateKey(today))} style={[styles.completeButton, complete && { backgroundColor: habit.color, borderColor: habit.color }, !allowed && styles.future]}>
          {numeric ? <Text numberOfLines={2} style={[styles.amountText, { color: complete ? contrastInk(habit.color) : colors.text }]}>{progress.complete && progress.amount === undefined ? '✓' : `${progress.amount ?? '—'}/${progress.configuration.tracking.target ?? 1}`}</Text> : <Checkmark color={complete ? contrastInk(habit.color) : colors.muted} />}
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Open {value0} history", { value0: habit.name })} onPress={() => onOpen(habit.id)}>
        <ActivityGrid habit={habit} today={today} showMonths={p.showMonthLabels} showDays={p.showDayLabels} />
      </Pressable>
      <HabitMeta habit={habit} today={today} view="card" />
    </DraggableHabit>;
  })}</View>;
}

export function FiveDayChecklist({ habits, today, onOpen, onToggle, onReorder }: HomeViewProps) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { mode } = useTheme();
  const { preferences: p } = useAppPreferences();
  const days = Array.from({ length: p.compactDays }, (_, index) => addDays(today, index - p.compactDays + 1));
  const positions = useRef<Record<string, LayoutRectangle>>({});
  const [daysWidth, setDaysWidth] = useState(0);
  const squareSize = daysWidth ? Math.max(14, Math.min(28, daysWidth / p.compactDays - 6)) : 20;
  const format = (date: Date) => date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return <View style={styles.section}>
    <View style={styles.rangeHeading}><View style={styles.rangePill}><Text style={styles.selectorText}>{p.compactDays === 1 ? t('Today') : t("Last {count} days", { count: p.compactDays })}</Text></View>
      <Text style={styles.rangeText}>{format(days[0])} – {format(today)}</Text></View>
    <View style={styles.checklist}>
      <View style={styles.tableRow}><View style={styles.nameColumn}><Text style={styles.habitCount}>{t("{count} habits", { count: habits.length })}</Text></View>
        <View style={styles.checklistDays} onLayout={(event) => setDaysWidth(event.nativeEvent.layout.width)}>{days.map((date) => <View key={dateKey(date)} style={styles.checklistDay}>
          <Text style={[styles.checklistDayName, p.highlightToday && dateKey(date) === dateKey(today) && styles.todayText]}>{date.toLocaleDateString(locale, { weekday: 'short' })}</Text>
          <Text style={[styles.checklistDate, p.highlightToday && dateKey(date) === dateKey(today) && styles.todayText]}>{date.getDate()}</Text>
        </View>)}</View>
      </View>
      {habits.map((habit) => <DraggableHabit key={habit.id} id={habit.id} enabled={p.dragToReorder} positions={positions} onDrop={onReorder} style={[styles.tableRow, styles.checklistHabitRow]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Open {value0}", { value0: habit.name })} onPress={() => onOpen(habit.id)} style={styles.nameColumn}>
          <HabitIcon habit={habit} size={34} />
          <View style={styles.checklistHabitCopy}>
            {p.compactNames && <Text numberOfLines={2} style={styles.checklistHabitName}>{habit.name}</Text>}
            <HabitMeta habit={habit} today={today} view="list" />
          </View>
        </Pressable>
        <View style={styles.checklistDays}>{days.map((date) => {
          const key = dateKey(date);
          const checked = habit.checkIns.includes(key);
          const allowed = canCheckIn(habit, key, today);
          const progress = dayProgress(habit, key, dateKey(today));
          const numeric = progress.configuration.tracking.kind !== 'yes-no';
          return <Pressable key={key} haptic={false} accessibilityRole={numeric ? "button" : "checkbox"} accessibilityLabel={`${habit.name}, ${date.toLocaleDateString(locale)}, ${t(progress.status)}${progress.amount === undefined ? '' : ', ' + progress.amount + ' ' + (progress.configuration.tracking.unit ?? '')}`}
            disabled={!allowed} accessibilityState={{ checked, disabled: !allowed }} onPress={() => onToggle(habit.id, key)} style={[styles.checklistTouchTarget, !allowed && styles.future]}>
            <View style={[styles.checklistSquare, { width: squareSize, height: squareSize, borderRadius: squareSize * 0.28, backgroundColor: checked ? habit.color : `${habit.color}${progress.status === 'partial' ? '66' : mode === 'dark' ? '15' : '30'}` }, progress.status === 'partial' && { borderWidth: 1, borderStyle: 'dashed' as const, borderColor: habit.color }]}>
              {numeric && progress.amount !== undefined && <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.squareAmount, { color: checked ? contrastInk(habit.color) : styles.todayText.color }]}>{progress.amount}</Text>}
              {progress.status === 'failed' && <Text style={styles.squareAmount}>×</Text>}
            </View>
          </Pressable>;
        })}</View>
      </DraggableHabit>)}
    </View>
  </View>;
}

export function MonthlyHabits({ habits, today, month, onMonthChange, onOpen, onReorder }: HomeViewProps & { month: Date; onMonthChange: (date: Date) => void }) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { preferences: p } = useAppPreferences();
  const positions = useRef<Record<string, LayoutRectangle>>({});
  return <View style={styles.section}>
    <View style={styles.rangeHeading}><MonthSelector month={month} onChange={onMonthChange} /></View>
    <View style={styles.monthlyCards}>{habits.map((habit) =>
      <DraggableHabit key={habit.id} id={habit.id} enabled={p.dragToReorder} positions={positions} onDrop={onReorder} style={styles.monthlyCard}><Pressable accessibilityRole="button" accessibilityLabel={t("Open {value0}, {value1}", { value0: habit.name, value1: monthLabel(month, false, locale) })}
        onPress={() => onOpen(habit.id)} style={({ pressed }) => [styles.monthlyBody, pressed && styles.pressed]}>
        <View style={styles.monthlyCardHeading}>
          <HabitIcon habit={habit} size={28} />
          <View style={styles.habitHeadingCopy}>
            <Text numberOfLines={2} style={styles.monthlyName}>{habit.name}</Text>
          </View>
        </View>
        <MonthCalendar habit={habit} month={month} today={today} compact /><HabitMeta habit={habit} today={today} view="month" />
      </Pressable></DraggableHabit>)}</View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }, streak: { flexDirection: 'row', alignItems: 'center', gap: 3 }, metaText: { color: colors.muted, fontSize: 10 },
  activity: { gap: 3 }, activityRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activityCell: { flex: 1, aspectRatio: 1, borderRadius: 3 }, future: { opacity: 0.35 }, pressed: { opacity: 0.65 },
  monthLabels: { flexDirection: 'row', paddingLeft: 27, paddingBottom: 2 }, monthLabel: { fontSize: 9, color: colors.muted },
  weekLabel: { width: 24, fontSize: 9, lineHeight: 10, color: colors.muted },
  calendar: { gap: 5 }, compactCalendar: { gap: 4 }, calendarRow: { flexDirection: 'row', gap: 5 }, compactRow: { gap: 4 },
  dayName: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, paddingBottom: 6 },
  calendarCell: { flex: 1, aspectRatio: 0.9, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  compactCell: { aspectRatio: 1, borderWidth: 0, borderRadius: 3 },
  dateNumber: { color: colors.muted, fontSize: 14, fontVariant: ['tabular-nums'] }, outsideMonth: { color: colors.subtle },
  dateAmount: { fontSize: 9, color: colors.text }, amountText: { fontSize: 11, textAlign: 'center', paddingHorizontal: 3 }, squareAmount: { fontSize: 10, color: colors.text },
  dayDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: space.sm, minHeight: control.touch },
  selectorText: { color: colors.text, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: space.lg },
  monthPicker: { width: '100%', maxWidth: 400, alignSelf: 'center', backgroundColor: colors.raised, borderRadius: radius.card, padding: space.md, gap: space.md },
  pickerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerTitle: { color: colors.text, fontSize: 22, fontWeight: '600' },
  monthOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }, monthOption: { width: '30%', minHeight: control.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small },
  selectedMonth: { backgroundColor: colors.selected }, cancelButton: { minHeight: control.touch, alignItems: 'center', justifyContent: 'center' },
  habitCards: { gap: space.md }, habitCard: { padding: layout.inset, gap: space.md, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border },
  habitHeading: { flexDirection: 'row', alignItems: 'center', gap: space.sm }, habitTitleButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: control.regular },
  habitHeadingCopy: { flex: 1, minWidth: 0, gap: space.xxs },
  habitTitle: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  habitDescription: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  completeButton: { width: control.regular, height: control.regular, borderRadius: radius.control, borderWidth: 1, borderColor: colors.controlBorder, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  section: { gap: space.sm }, rangeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  rangePill: { borderRadius: radius.pill, paddingHorizontal: space.sm, minHeight: control.touch, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  rangeText: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', flexShrink: 1, textAlign: 'right' },
  checklist: { borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.panel },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: control.row },
  nameColumn: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8, minHeight: control.regular },
  habitCount: { flexShrink: 1, color: colors.muted, fontSize: 10, letterSpacing: 2 }, checklistDays: { flex: 1.2, maxWidth: 300, flexDirection: 'row', alignItems: 'center' },
  checklistDay: { flex: 1, alignItems: 'center', gap: 3 }, checklistDayName: { color: colors.muted, fontSize: 10 }, checklistDate: { color: colors.muted, fontSize: 13 }, todayText: { color: colors.text, fontWeight: '600' },
  checklistHabitRow: { borderTopWidth: 1, borderTopColor: colors.border },
  checklistHabitCopy: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 8 },
  checklistHabitName: { color: colors.text, fontSize: 14, lineHeight: 20 },
  checklistTouchTarget: { flex: 1, minHeight: control.row, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  // Explicit equal dimensions avoid percentage/aspect-ratio sizing before width constraints.
  checklistSquare: { width: 28, height: 28, flexShrink: 0, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  monthlyCards: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  monthlyCard: { width: '31.5%', minWidth: 112, padding: 9, gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderCurve: 'continuous' },
  monthlyBody: { gap: 8 },
  monthlyCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 }, monthlyName: { color: colors.text, fontSize: 13, lineHeight: 18 },
}));
