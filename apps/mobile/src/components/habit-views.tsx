import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Pressable from './haptic-pressable';
import { addDays, calendarDays, canCheckIn, dateKey, DAY_NAMES, type Habit, isScheduled, monthLabel, startOfWeek } from '../data/sample-habits';
import { contrastInk } from '../data/habit-share';
import { Checkmark, Chevron, HabitIcon, RoundButton } from './habit-ui';
import { createThemedStyles, useTheme } from './theme';

export function ActivityGrid({ habit, today, labels = false }: { habit: Habit; today: Date; labels?: boolean }) {
  const styles = useStyles();
  const { mode } = useTheme();
  const first = addDays(startOfWeek(today), -25 * 7);
  const completed = new Set(habit.checkIns);
  const groups: { label: string; count: number }[] = [];
  for (let column = 0; column < 26; column += 1) {
    const label = addDays(first, column * 7).toLocaleDateString(undefined, { month: 'short' });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.count += 1;
    else groups.push({ label, count: 1 });
  }
  return <View accessible accessibilityRole="image" accessibilityLabel={`${habit.name}, 26-week sample activity history`} style={styles.activity}>
    {labels && <View style={styles.monthLabels}>{groups.map((group, index) =>
      <Text key={index} numberOfLines={1} style={[styles.monthLabel, { flex: group.count }]}>{group.count > 1 ? group.label : ''}</Text>)}</View>}
    {DAY_NAMES.map((day, row) => <View key={day} style={styles.activityRow}>
      {labels && <Text style={styles.weekLabel}>{row % 2 === 1 ? day : ''}</Text>}
      {Array.from({ length: 26 }, (_, column) => {
        const date = addDays(first, column * 7 + row);
        const key = dateKey(date);
        return <View key={column} style={[styles.activityCell, { backgroundColor: `${habit.color}${mode === 'dark' ? '12' : '32'}` },
          completed.has(key) && { backgroundColor: habit.color }, (key > dateKey(today) || !isScheduled(habit, date)) && styles.future]} />;
      })}
    </View>)}
  </View>;
}

export function MonthCalendar({ habit, month, today, compact = false, onToggle, onNote }: {
  habit: Habit; month: Date; today: Date; compact?: boolean;
  onToggle?: (key: string) => void; onNote?: (key: string) => void;
}) {
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const days = calendarDays(month);
  const completed = new Set(habit.checkIns);
  return <View style={[styles.calendar, compact && styles.compactCalendar]}>
    {!compact && <View style={styles.calendarRow}>{DAY_NAMES.map((day) => <Text key={day} style={styles.dayName}>{day}</Text>)}</View>}
    {Array.from({ length: 6 }, (_, week) => <View key={week} style={[styles.calendarRow, compact && styles.compactRow]}>
      {days.slice(week * 7, week * 7 + 7).map((day) => {
        const key = dateKey(day);
        const inMonth = day.getMonth() === month.getMonth();
        const complete = completed.has(key) && (!compact || inMonth);
        const future = key > dateKey(today);
        const allowed = canCheckIn(habit, key, today);
        const cellStyle = [styles.calendarCell, compact && styles.compactCell,
          complete && { backgroundColor: compact ? habit.color : `${habit.color}24` },
          !complete && compact && { backgroundColor: `${habit.color}${inMonth ? mode === 'dark' ? '10' : '28' : '06'}` },
          !compact && key === dateKey(today) && { borderColor: habit.color },
          (future || !isScheduled(habit, day)) && styles.future];
        if (compact) return <View key={key} style={cellStyle} />;
        return <Pressable key={key} haptic={false} disabled={!allowed} accessibilityRole="checkbox"
          accessibilityLabel={`${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${habit.notes[key] ? ', has a note' : ''}`}
          accessibilityState={{ checked: complete, disabled: !allowed }} accessibilityHint="Tap to change completion. Hold to add a note."
          onPress={() => onToggle?.(key)} onLongPress={() => onNote?.(key)} delayLongPress={450}
          style={({ pressed }) => [...cellStyle, pressed && styles.pressed]}>
          <Text style={[styles.dateNumber, !inMonth && !complete && styles.outsideMonth, complete && { color: colors.text }]}>{day.getDate()}</Text>
          {(complete || habit.notes[key]) && <View style={[styles.dayDot, { backgroundColor: habit.notes[key] ? colors.text : habit.color }]} />}
        </Pressable>;
      })}
    </View>)}
  </View>;
}

export function MonthSelector({ month, onChange, short = false }: { month: Date; onChange: (date: Date) => void; short?: boolean }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(month.getFullYear());
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose month, ${monthLabel(month)}`}
      onPress={() => { setYear(month.getFullYear()); setOpen(true); }} style={styles.monthSelector}>
      <Text style={styles.selectorText}>{monthLabel(month, short)}</Text><Chevron direction="down" />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close month picker" onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={styles.monthPicker}>
          <View style={styles.pickerHeading}>
            <RoundButton label="Previous year" onPress={() => setYear((current) => current - 1)}><Chevron direction="left" /></RoundButton>
            <Text accessibilityRole="header" style={styles.pickerTitle}>{year}</Text>
            <RoundButton label="Next year" onPress={() => setYear((current) => current + 1)}><Chevron /></RoundButton>
          </View>
          <View style={styles.monthOptions}>{Array.from({ length: 12 }, (_, index) => {
            const date = new Date(year, index, 1, 12);
            const selected = month.getFullYear() === year && month.getMonth() === index;
            return <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected }}
              onPress={() => { onChange(date); setOpen(false); }} style={[styles.monthOption, selected && styles.selectedMonth]}>
              <Text style={styles.selectorText}>{date.toLocaleDateString(undefined, { month: 'short' })}</Text>
            </Pressable>;
          })}</View>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.cancelButton}><Text style={styles.selectorText}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}

type HomeViewProps = {
  habits: Habit[]; today: Date; onOpen: (id: string) => void; onToggle: (id: string, key: string) => void;
};

export function HabitCards({ habits, today, onOpen, onToggle }: HomeViewProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.habitCards}>{habits.map((habit) => {
    const complete = habit.checkIns.includes(dateKey(today));
    const allowed = canCheckIn(habit, dateKey(today), today);
    return <View key={habit.id} style={[styles.habitCard, { backgroundColor: `${habit.color}07` }]}>
      <View style={styles.habitHeading}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${habit.name}`} onPress={() => onOpen(habit.id)} style={styles.habitTitleButton}>
          <HabitIcon habit={habit} size={48} /><Text style={styles.habitTitle}>{habit.name}</Text>
        </Pressable>
        <Pressable haptic={false} disabled={!allowed} accessibilityRole="checkbox" accessibilityLabel={`Complete ${habit.name} today`} accessibilityState={{ checked: complete, disabled: !allowed }}
          onPress={() => onToggle(habit.id, dateKey(today))} style={[styles.completeButton, complete && { backgroundColor: habit.color, borderColor: habit.color }, !allowed && styles.future]}>
          <Checkmark color={complete ? contrastInk(habit.color) : colors.muted} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${habit.name} history`} onPress={() => onOpen(habit.id)}>
        <ActivityGrid habit={habit} today={today} />
      </Pressable>
    </View>;
  })}</View>;
}

export function FiveDayChecklist({ habits, today, onOpen, onToggle }: HomeViewProps) {
  const styles = useStyles();
  const { mode } = useTheme();
  const days = Array.from({ length: 5 }, (_, index) => addDays(today, index - 4));
  const format = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return <View style={styles.section}>
    <View style={styles.rangeHeading}><View style={styles.rangePill}><Text style={styles.selectorText}>Last 5 days</Text></View>
      <Text style={styles.rangeText}>{format(days[0])} – {format(today)}</Text></View>
    <View style={styles.checklist}>
      <View style={styles.tableRow}><View style={styles.nameColumn}><Text style={styles.habitCount}>{habits.length} HABITS</Text></View>
        <View style={styles.checklistDays}>{days.map((date) => <View key={dateKey(date)} style={styles.checklistDay}>
          <Text style={[styles.checklistDayName, dateKey(date) === dateKey(today) && styles.todayText]}>{date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</Text>
          <Text style={[styles.checklistDate, dateKey(date) === dateKey(today) && styles.todayText]}>{date.getDate()}</Text>
        </View>)}</View>
      </View>
      {habits.map((habit) => <View key={habit.id} style={[styles.tableRow, styles.checklistHabitRow]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${habit.name}`} onPress={() => onOpen(habit.id)} style={styles.nameColumn}>
          <HabitIcon habit={habit} size={34} /><Text numberOfLines={2} style={styles.checklistHabitName}>{habit.name}</Text>
        </Pressable>
        <View style={styles.checklistDays}>{days.map((date) => {
          const key = dateKey(date);
          const checked = habit.checkIns.includes(key);
          const allowed = canCheckIn(habit, key, today);
          return <Pressable key={key} haptic={false} accessibilityRole="checkbox" accessibilityLabel={`${habit.name}, ${date.toLocaleDateString()}`}
            disabled={!allowed} accessibilityState={{ checked, disabled: !allowed }} onPress={() => onToggle(habit.id, key)} style={[styles.checklistTouchTarget, !allowed && styles.future]}>
            <View style={[styles.checklistSquare, { backgroundColor: checked ? habit.color : `${habit.color}${mode === 'dark' ? '15' : '30'}` }]} />
          </Pressable>;
        })}</View>
      </View>)}
    </View>
  </View>;
}

export function MonthlyHabits({ habits, today, month, onMonthChange, onOpen }: HomeViewProps & { month: Date; onMonthChange: (date: Date) => void }) {
  const styles = useStyles();
  return <View style={styles.section}>
    <View style={styles.rangeHeading}><MonthSelector month={month} onChange={onMonthChange} /></View>
    <View style={styles.monthlyCards}>{habits.map((habit) =>
      <Pressable key={habit.id} accessibilityRole="button" accessibilityLabel={`Open ${habit.name}, ${monthLabel(month)}`}
        onPress={() => onOpen(habit.id)} style={({ pressed }) => [styles.monthlyCard, pressed && styles.pressed]}>
        <View style={styles.monthlyCardHeading}><HabitIcon habit={habit} size={28} /><Text style={styles.monthlyName}>{habit.name}</Text></View>
        <MonthCalendar habit={habit} month={month} today={today} compact />
      </Pressable>)}</View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  activity: { gap: 3 }, activityRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activityCell: { flex: 1, aspectRatio: 1, borderRadius: 3 }, future: { opacity: 0.35 }, pressed: { opacity: 0.65 },
  monthLabels: { flexDirection: 'row', paddingLeft: 27, paddingBottom: 2 }, monthLabel: { fontSize: 9, color: colors.muted },
  weekLabel: { width: 24, fontSize: 9, lineHeight: 10, color: colors.muted },
  calendar: { gap: 5 }, compactCalendar: { gap: 4 }, calendarRow: { flexDirection: 'row', gap: 5 }, compactRow: { gap: 4 },
  dayName: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 11, paddingBottom: 6 },
  calendarCell: { flex: 1, aspectRatio: 0.9, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  compactCell: { aspectRatio: 1, borderWidth: 0, borderRadius: 3 },
  dateNumber: { color: colors.muted, fontSize: 14, fontVariant: ['tabular-nums'] }, outsideMonth: { color: colors.subtle },
  dayDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingHorizontal: 14, minHeight: 40 },
  selectorText: { color: colors.text, fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', padding: 24 },
  monthPicker: { width: '100%', maxWidth: 400, alignSelf: 'center', backgroundColor: colors.raised, borderRadius: 24, padding: 20, gap: 20 },
  pickerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pickerTitle: { color: colors.text, fontSize: 22, fontWeight: '600' },
  monthOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, monthOption: { width: '30%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  selectedMonth: { backgroundColor: colors.selected }, cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  habitCards: { gap: 14 }, habitCard: { padding: 16, gap: 14, borderRadius: 28, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border },
  habitHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, habitTitleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  habitTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  completeButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.controlBorder, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12 }, rangeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rangePill: { borderRadius: 24, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  rangeText: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', flexShrink: 1, textAlign: 'right' },
  checklist: { borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.panel },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 56 },
  nameColumn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8, minHeight: 48 },
  habitCount: { color: colors.muted, fontSize: 10, letterSpacing: 2 }, checklistDays: { flex: 1.2, maxWidth: 220, flexDirection: 'row', alignItems: 'center' },
  checklistDay: { flex: 1, alignItems: 'center', gap: 3 }, checklistDayName: { color: colors.muted, fontSize: 10 }, checklistDate: { color: colors.muted, fontSize: 13 }, todayText: { color: colors.text, fontWeight: '600' },
  checklistHabitRow: { borderTopWidth: 1, borderTopColor: colors.border }, checklistHabitName: { flex: 1, color: colors.text, fontSize: 14 },
  checklistTouchTarget: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  // Explicit equal dimensions avoid percentage/aspect-ratio sizing before width constraints.
  checklistSquare: { width: 28, height: 28, flexShrink: 0, borderRadius: 8, borderCurve: 'continuous' },
  monthlyCards: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  monthlyCard: { width: '31.5%', minWidth: 112, padding: 9, gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderCurve: 'continuous' },
  monthlyCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 }, monthlyName: { flex: 1, color: colors.text, fontSize: 13 },
}));
