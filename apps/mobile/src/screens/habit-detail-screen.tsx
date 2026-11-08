import Modal from '../components/private-modal';
import { space, layout, control, radius } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { formatRepeat } from '../i18n/locale';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { ActivityGrid, MonthSelector } from '../components/habit-views';
import SwipeableMonthCalendar from '../components/swipeable-month-calendar';
import { Chevron, HabitIcon, RoundButton, SettingsIcon, ShareIcon, topPadding } from '../components/habit-ui';
import { type Habit } from '../data/habit-types';
import { shiftMonth, streakDays } from '../data/habit-calendar';
import { type HabitDraft } from '../data/habit-draft';
import HabitFormScreen from './habit-form-screen';
import ShareHabitScreen from './share-habit-screen';
import { useAppPreferences } from '../components/app-preferences';
import AppIcon from '../components/app-icon';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';

export default function HabitDetailScreen({ habit, today, initialMonth, onBack, onToggle, onEditEntry, saveError, saving, onRetrySave, onUpdate, onArchive, onModalBusyChange, readOnly = false }: {
  habit: Habit; today: Date; initialMonth: Date; onBack: () => void; onToggle: (key: string) => void; onEditEntry: (key: string) => void; saveError: boolean; saving: boolean; onRetrySave: () => Promise<boolean>;
  onUpdate: (draft: HabitDraft) => Promise<boolean>;
  onArchive: () => void;
  onModalBusyChange?: (busy: boolean) => void;
  readOnly?: boolean;
}) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const { preferences } = useAppPreferences();
  const habitAccent = accentForeground(habit.color, mode);
  const [month, setMonth] = useState(() => shiftMonth(initialMonth, 0));
  const [editing, setEditing] = useState(false);
  const [editSaveBusy, setEditSaveBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<ComponentRef<typeof View>>(null);
  const historyAnchor = useRef<ComponentRef<typeof View>>(null);
  const pendingMenuAction = useRef<'share' | 'archive' | null>(null);
  useEffect(() => { if (editing || sharing || menuOpen) onModalBusyChange?.(true); else if (Platform.OS !== 'ios') onModalBusyChange?.(false); }, [editing, sharing, menuOpen, onModalBusyChange]);
  useEffect(() => () => onModalBusyChange?.(false), [onModalBusyChange]);
  const { height, width, fontScale } = useWindowDimensions();
  const menuWidth = Math.min(width - 36, Math.max(168, 168 * fontScale));
  const menuRowHeight = Math.max(control.touch, Math.ceil(20 * fontScale) + space.sm);
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
    onModalBusyChange?.(action === 'share');
    if (action === 'archive') onArchive();
  }

  function chooseMenuAction(action: 'share' | 'archive') {
    pendingMenuAction.current = action;
    setMenuOpen(false);
    // iOS must finish dismissing the menu before another sheet is presented.
    if (Platform.OS !== 'ios') finishMenuAction();
  }

  return <View style={styles.screen}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <ScrollView contentInsetAdjustmentBehavior="automatic" indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {saveError && <View><Text accessibilityRole="alert" style={styles.description}>{t('Changes haven’t saved yet.')}</Text><Pressable accessibilityRole="button" disabled={saving} onPress={onRetrySave} style={styles.retryButton}><Text style={styles.todayText}>{t('Retry saving')}</Text></Pressable></View>}
        <View style={styles.toolbar}>
          <RoundButton label={t("Back to habits")} compact onPress={onBack}><Chevron direction="left" /></RoundButton>
          <View style={styles.toolbarRight}>
            <RoundButton label={t("Edit habit")} compact onPress={() => setEditing(true)}><AppIcon name="edit" /></RoundButton>
            <View ref={menuAnchor} collapsable={false}><RoundButton label={t("Habit settings")} compact onPress={openMenu}><SettingsIcon /></RoundButton></View>
          </View>
        </View>
        <View style={styles.hero}>
          <HabitIcon habit={habit} size={54} />
          <View style={styles.heroText}><Text accessibilityRole="header" style={styles.title}>{habit.name}</Text>
            <Text style={styles.description}>{habit.description}</Text></View>
        </View>
        {readOnly && <Text style={styles.description}>{t('Choose four habits to keep logging for free. All other habits and their history stay visible.')}</Text>}
        <View ref={historyAnchor} collapsable={false} style={[styles.historyPanel, { backgroundColor: `${habit.color}0E` }]}>
          <ActivityGrid habit={habit} today={today} labels />
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <AppIcon name="flame" color={habitAccent} size={15} />
            <Text selectable style={[styles.badgeText, { color: habitAccent }]}>{t("{count} days", { count: streakDays(habit, today) })}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <AppIcon name="repeat" color={habitAccent} size={14} /><Text style={[styles.badgeText, { color: habitAccent }]}>{formatRepeat(habit.repeatDays, locale)}</Text>
          </View>
          {habit.habitType === 'quit' && <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <Text style={[styles.badgeText, { color: habitAccent }]}>{t("Quit habit")}</Text>
          </View>}
          {habit.tracking && habit.tracking.kind !== 'yes-no' && <View style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <Text style={[styles.badgeText, { color: habitAccent }]}>{habit.habitType === 'quit' ? t('Limit') : t('Target')}: {habit.tracking.target} {habit.tracking.unit ?? t('times')}</Text>
          </View>}
          {habit.categories?.map((category) => <View key={category} style={[styles.badge, { backgroundColor: `${habit.color}1A` }]}>
            <Text style={[styles.badgeText, { color: habitAccent }]}>{t(category)}</Text>
          </View>)}
        </View>
        <View style={styles.calendarPanel}>
          <SwipeableMonthCalendar habit={habit} month={month} today={today} onChangeMonth={setMonth} onToggle={onToggle} onNote={onEditEntry} />
          <View style={styles.calendarControls}>
            <MonthSelector month={month} onChange={setMonth} short />
            <Pressable accessibilityRole="button" accessibilityLabel={t("Show current month")} onPress={() => setMonth(shiftMonth(today, 0))} style={styles.todayButton}>
              <Text style={styles.todayText}>{t("Today")}</Text>
            </Pressable>
            <RoundButton label={t("Previous month")} onPress={() => setMonth((current) => shiftMonth(current, -1))}><Chevron direction="left" /></RoundButton>
            <RoundButton label={t("Next month")} onPress={() => setMonth((current) => shiftMonth(current, 1))}><Chevron /></RoundButton>
          </View>
          <Text style={styles.calendarHint}>{preferences.notes ? t('Swipe to change month · Hold a day to add a note') : t('Swipe to change month')}</Text>
        </View>
      </View>
    </ScrollView>
    <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent onDismiss={finishMenuAction} onRequestClose={() => setMenuOpen(false)}>
      <View style={styles.menuOverlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t("Close habit menu")} onPress={() => setMenuOpen(false)} />
        <View accessibilityViewIsModal style={[styles.menu, menuPosition, { width: menuWidth }]}>
          <Pressable accessibilityRole="button" onPress={() => chooseMenuAction('share')} style={[styles.menuRow, { height: menuRowHeight }, styles.menuDivider]}>
            <View style={styles.menuIcon}><ShareIcon /></View><Text style={styles.menuText}>{t("Share Habit")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityHint={t("Moves this habit to Archived Habits")} onPress={() => chooseMenuAction('archive')} style={[styles.menuRow, { height: menuRowHeight }]}>
            <View style={styles.menuIcon}><AppIcon name="archive" /></View><Text style={styles.menuText}>{t("Delete Habit")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={sharing} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => { setSharing(false); if (Platform.OS !== 'ios') onModalBusyChange?.(false); }} onDismiss={() => onModalBusyChange?.(false)}>
      <ShareHabitScreen habit={habit} today={today} onClose={() => { setSharing(false); if (Platform.OS !== 'ios') onModalBusyChange?.(false); }} />
    </Modal>
    <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal={!editSaveBusy} onRequestClose={() => { if (editSaveBusy) return; setEditing(false); if (Platform.OS !== 'ios') onModalBusyChange?.(false); }} onDismiss={() => onModalBusyChange?.(false)}>
      <HabitFormScreen key={habit.id} initialHabit={habit} onClose={() => { setEditing(false); if (Platform.OS !== 'ios') onModalBusyChange?.(false); }}
        onRetrySave={onRetrySave} onSave={onUpdate} onBusyChange={setEditSaveBusy} />
    </Modal>

  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  menuOverlay: { flex: 1 }, menu: { position: 'absolute', backgroundColor: colors.panel, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm }, menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.controlBorder }, menuText: { flexShrink: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  menuIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.72 }] },
  scrollContent: { paddingTop: topPadding, paddingHorizontal: layout.inset, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: layout.content, alignSelf: 'center', gap: layout.section },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.xs },
  toolbarRight: { flexDirection: 'row', gap: space.xs },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md }, heroText: { flex: 1, gap: space.xs },
  title: { color: colors.text, fontSize: 21, fontWeight: '700' }, description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  historyPanel: { borderRadius: radius.card, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, padding: space.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }, badge: { flexDirection: 'row', alignItems: 'center', gap: space.compact, borderRadius: radius.pill, paddingVertical: space.xs, paddingHorizontal: space.sm },
  badgeText: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  calendarPanel: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', padding: space.sm, gap: space.md, marginTop: 0 },
  calendarControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.xs, paddingTop: space.xs },
  todayButton: { borderWidth: 1, borderColor: colors.border, minHeight: control.touch, paddingHorizontal: space.sm, borderRadius: radius.pill, justifyContent: 'center' },
  retryButton: { minHeight: control.touch, minWidth: control.touch, alignSelf: 'flex-start', justifyContent: 'center', paddingVertical: space.xs },
  todayText: { color: colors.muted, fontSize: 13 }, calendarHint: { color: colors.subtle, fontSize: 11, textAlign: 'center', lineHeight: 16 },
}));
