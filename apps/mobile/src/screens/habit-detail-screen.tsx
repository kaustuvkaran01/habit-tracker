import { type ComponentRef, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Modal, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { ActivityGrid, MonthSelector } from '../components/habit-views';
import SwipeableMonthCalendar from '../components/swipeable-month-calendar';
import HabitNoteDrawer from '../components/habit-note-drawer';
import { Chevron, HabitIcon, RoundButton, SettingsIcon, ShareIcon, topPadding } from '../components/habit-ui';
import { dateKey, type Habit, repeatLabel, shiftMonth, streakDays } from '../data/sample-habits';
import { type HabitDraft } from '../data/habit-draft';
import HabitFormScreen from './habit-form-screen';
import ShareHabitScreen from './share-habit-screen';
import AppIcon from '../components/app-icon';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';

export default function HabitDetailScreen({ habit, today, initialMonth, onBack, onToggle, onSaveNote, onUpdate, onArchive }: {
  habit: Habit; today: Date; initialMonth: Date; onBack: () => void; onToggle: (key: string) => void; onSaveNote: (key: string, note: string) => void;
  onUpdate: (draft: HabitDraft) => void;
  onArchive: () => void;
}) {
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const habitAccent = accentForeground(habit.color, mode);
  const [month, setMonth] = useState(() => shiftMonth(initialMonth, 0));
  const [noteDate, setNoteDate] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<ComponentRef<typeof View>>(null);
  const historyAnchor = useRef<ComponentRef<typeof View>>(null);
  const pendingMenuAction = useRef<'share' | 'archive' | null>(null);
  const { height, width, fontScale } = useWindowDimensions();
  const menuWidth = Math.min(width - 36, Math.max(168, 168 * fontScale));
  const menuRowHeight = Math.max(40, Math.ceil(20 * fontScale) + 12);
  const menuHeight = menuRowHeight * 2 + 2;

  function openMenu() {
    menuAnchor.current?.measureInWindow((x, y, anchorWidth, anchorHeight) => {
      historyAnchor.current?.measureInWindow((_gridX, gridTop) => {
        // The 42-point circle is inset two points inside its unchanged touch target.
        const buttonBottom = y + anchorHeight - 2;
        const top = (buttonBottom + gridTop - menuHeight) / 2;
        setMenuPosition({
          top: Math.max(8, Math.min(top, height - menuHeight - 8)),
          left: Math.max(18, Math.min(x + anchorWidth - 2 - menuWidth, width - menuWidth - 18)),
        });
        setMenuOpen(true);
      });
    });
  }

  function finishMenuAction() {
    const action = pendingMenuAction.current;
    pendingMenuAction.current = null;
    if (action === 'share') setSharing(true);
    if (action === 'archive') onArchive();
  }

  function chooseMenuAction(action: 'share' | 'archive') {
    pendingMenuAction.current = action;
    setMenuOpen(false);
    // iOS must finish dismissing the menu before another sheet is presented.
    if (Platform.OS !== 'ios') finishMenuAction();
  }

  function openNote(key: string) {
    setNoteDraft(habit.notes[key] ?? '');
    setNoteDate(key);
    setNoteOpen(true);
  }

  return <View style={styles.screen}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <ScrollView contentInsetAdjustmentBehavior="automatic" indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.toolbar}>
          <RoundButton label="Back to habits" compact onPress={onBack}><Chevron direction="left" /></RoundButton>
          <View style={styles.toolbarRight}>
            <RoundButton label="Edit habit" compact onPress={() => setEditing(true)}><AppIcon name="edit" /></RoundButton>
            <View ref={menuAnchor} collapsable={false}><RoundButton label="Habit settings" compact onPress={openMenu}><SettingsIcon /></RoundButton></View>
          </View>
        </View>
        <View style={styles.hero}>
          <HabitIcon habit={habit} size={54} />
          <View style={styles.heroText}><Text accessibilityRole="header" style={styles.title}>{habit.name}</Text>
            <Text style={styles.description}>{habit.description}</Text></View>
        </View>
        <View ref={historyAnchor} collapsable={false} style={[styles.historyPanel, { backgroundColor: `${habit.color}0E` }]}>
          <ActivityGrid habit={habit} today={today} labels />
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <AppIcon name="flame" color={habitAccent} size={15} />
            <Text selectable style={[styles.badgeText, { color: habitAccent }]}>{streakDays(habit, today)} days</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <AppIcon name="repeat" color={habitAccent} size={14} /><Text style={[styles.badgeText, { color: habitAccent }]}>{repeatLabel(habit.repeatDays)}</Text>
          </View>
          {habit.habitType === 'quit' && <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <Text style={[styles.badgeText, { color: habitAccent }]}>Quit habit</Text>
          </View>}
          {habit.tracking && habit.tracking.kind !== 'yes-no' && <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <Text style={[styles.badgeText, { color: habitAccent }]}>{habit.habitType === 'quit' ? 'Limit' : 'Target'}: {habit.tracking.target} {habit.tracking.unit ?? 'times'}</Text>
          </View>}
          {habit.categories?.map((category) => <View key={category} style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <Text style={[styles.badgeText, { color: habitAccent }]}>{category}</Text>
          </View>)}
        </View>
        <View style={styles.calendarPanel}>
          <SwipeableMonthCalendar habit={habit} month={month} today={today} onChangeMonth={setMonth} onToggle={onToggle} onNote={openNote} />
          <View style={styles.calendarControls}>
            <MonthSelector month={month} onChange={setMonth} short />
            <Pressable accessibilityRole="button" accessibilityLabel="Show current month" onPress={() => setMonth(shiftMonth(today, 0))} style={styles.todayButton}>
              <Text style={styles.todayText}>Today</Text>
            </Pressable>
            <RoundButton label="Previous month" onPress={() => setMonth((current) => shiftMonth(current, -1))}><Chevron direction="left" /></RoundButton>
            <RoundButton label="Next month" onPress={() => setMonth((current) => shiftMonth(current, 1))}><Chevron /></RoundButton>
          </View>
          <Text style={styles.calendarHint}>Swipe to change month · Hold a day to add a note</Text>
        </View>
      </View>
    </ScrollView>
    <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent onDismiss={finishMenuAction} onRequestClose={() => setMenuOpen(false)}>
      <View style={styles.menuOverlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close habit menu" onPress={() => setMenuOpen(false)} />
        <View accessibilityViewIsModal style={[styles.menu, menuPosition, { width: menuWidth }]}>
          <Pressable accessibilityRole="button" onPress={() => chooseMenuAction('share')} style={[styles.menuRow, { height: menuRowHeight }, styles.menuDivider]}>
            <View style={styles.menuIcon}><ShareIcon /></View><Text style={styles.menuText}>Share Habit</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityHint="Moves this habit to Archived Habits" onPress={() => chooseMenuAction('archive')} style={[styles.menuRow, { height: menuRowHeight }]}>
            <View style={styles.menuIcon}><AppIcon name="archive" /></View><Text style={styles.menuText}>Delete Habit</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={sharing} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setSharing(false)}>
      <ShareHabitScreen habit={habit} today={today} onClose={() => setSharing(false)} />
    </Modal>
    <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setEditing(false)}>
      <HabitFormScreen key={habit.id} initialHabit={habit} onClose={() => setEditing(false)}
        onSave={(draft) => { onUpdate(draft); setEditing(false); }} />
    </Modal>
    <HabitNoteDrawer visible={noteOpen} habit={habit} day={noteDate ?? dateKey(today)} today={today}
      note={noteDraft} onChangeNote={setNoteDraft} onClose={() => setNoteOpen(false)}
      onToggle={() => { if (noteDate) onToggle(noteDate); }} onSave={() => {
        if (noteDate) onSaveNote(noteDate, noteDraft.trim());
        setNoteOpen(false);
      }} />
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  menuOverlay: { flex: 1 }, menu: { position: 'absolute', backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }, menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.controlBorder }, menuText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  menuIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.72 }] },
  scrollContent: { paddingTop: topPadding, paddingHorizontal: 18, paddingBottom: 36 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 18 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  toolbarRight: { flexDirection: 'row', gap: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 }, heroText: { flex: 1, gap: 6 },
  title: { color: colors.text, fontSize: 21, fontWeight: '700' }, description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  historyPanel: { borderRadius: 25, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, padding: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 12 },
  badgeText: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  calendarPanel: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 26, borderCurve: 'continuous', padding: 14, gap: 14, marginTop: 2 },
  calendarControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 6 },
  todayButton: { borderWidth: 1, borderColor: colors.border, minHeight: 44, paddingHorizontal: 10, borderRadius: 24, justifyContent: 'center' },
  todayText: { color: colors.muted, fontSize: 13 }, calendarHint: { color: colors.subtle, fontSize: 11, textAlign: 'center', lineHeight: 16 },
}));
