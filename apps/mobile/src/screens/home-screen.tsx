import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, type NativeScrollEvent, type NativeSyntheticEvent, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FiveDayChecklist, HabitCards, MonthlyHabits } from '../components/habit-views';
import { habitViews, Toolbar, ViewIcon } from '../components/habit-ui';
import { canCheckIn, shiftMonth } from '../data/sample-habits';
import { habitFromDraft, type HabitDraft, updateHabitFromDraft } from '../data/habit-draft';
import HabitDetailScreen from './habit-detail-screen';
import HabitFormScreen from './habit-form-screen';
import RightDrawer from '../components/right-drawer';
import SettingsScreen from './settings-screen';
import ProScreen from './pro-screen';
import { moveActiveHabit } from '../data/habit-order';
import WallpapersScreen from './wallpapers-screen';
import { reconcileRewards, startNextRewardCycle } from '../data/habit-rewards';
import { archiveHabit, restoreHabit } from '../data/habit-archive';
import useHabitStore from '../hooks/use-habit-store';
import useToday from '../hooks/use-today';
import { completionFeedbackFor, feedback } from '../utils/feedback';
import { createThemedStyles, useTheme } from '../components/theme';

const VIEW_BUTTON_SIZE = 48;
const VIEW_BUTTON_GAP = 6;
// Pro purchases are a preview. Supply the verified entitlement when billing is connected.
const HAS_PRO = false;

export default function HomeScreen() {
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const today = useToday();
  const { habits, retainedCollections, setHabits, setWallpaper, hydrated, storageError, retryStorage } = useHabitStore(today, HAS_PRO);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [habitDetailOpen, setHabitDetailOpen] = useState(false);
  const [month, setMonth] = useState(() => shiftMonth(today, 0));
  const [addingHabit, setAddingHabit] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [wallpapersOpen, setWallpapersOpen] = useState(false);
  const pendingSettingsScreen = useRef<'pro' | 'wallpapers' | null>(null);
  const newHabitCounter = useRef(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const trackScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true },
  ), [scrollX]);
  const currentIndex = useRef(0);
  const selectedHabit = habits.find((habit) => habit.id === selectedHabitId);
  const activeHabits = habits.filter((habit) => !habit.archived);
  const archivedCount = habits.length - activeHabits.length;
  const previousHabits = useRef(habits);
  const pendingCompletion = useRef<{ id: string; key: string } | null>(null);

  useEffect(() => {
    const previous = previousHabits.current;
    previousHabits.current = habits;
    const intent = pendingCompletion.current;
    pendingCompletion.current = null;
    if (!intent) return;
    const before = previous.find((habit) => habit.id === intent.id);
    const after = habits.find((habit) => habit.id === intent.id);
    if (!before || !after) return;
    const kind = completionFeedbackFor(before, after, intent.key);
    if (kind) feedback(kind);
  }, [habits]);

  useEffect(() => {
    pager.current?.scrollTo({ x: currentIndex.current * width, animated: false });
    scrollX.setValue(currentIndex.current * width);
  }, [width, scrollX]);

  function selectView(index: number) {
    currentIndex.current = index;
    setSelectedIndex(index);
    pager.current?.scrollTo({ x: index * width, animated: true });
  }

  function finishSwipe(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.max(0, Math.min(habitViews.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
    currentIndex.current = index;
    setSelectedIndex(index);
  }

  function toggleCheckIn(id: string, key: string) {
    const target = habits.find((habit) => habit.id === id);
    if (!target || !canCheckIn(target, key, today)) return;
    pendingCompletion.current = { id, key };
    setHabits((current) => current.map((habit) => habit.id !== id || !canCheckIn(habit, key, today) ? habit : reconcileRewards({
      ...habit,
      checkIns: habit.checkIns.includes(key) ? habit.checkIns.filter((day) => day !== key) : [...habit.checkIns, key],
    }, today)));
  }

  function openHabit(id: string) {
    setSelectedHabitId(id);
    setHabitDetailOpen(true);
  }

  function closeHabit() {
    // Retain the selected habit until the drawer has moved completely offscreen.
    setHabitDetailOpen(false);
  }

  function saveNewHabit(draft: HabitDraft) {
    const habit = habitFromDraft(draft, today, `habit-${Date.now()}-${++newHabitCounter.current}`);
    setHabits((current) => [habit, ...current]);
    setMonth(shiftMonth(today, 0));
    setAddingHabit(false);
    feedback('success');
  }

  function saveHabitChanges(id: string, draft: HabitDraft) {
    setHabits((current) => current.map((habit) => habit.id === id ? reconcileRewards(updateHabitFromDraft(habit, draft), today) : habit));
    feedback('success');
  }

  function deleteHabit(id: string) {
    setHabits((current) => current.map((habit) => habit.id === id ? archiveHabit(habit, today) : habit));
    closeHabit();
  }

  function restoreArchived() {
    setHabits((current) => current.map(restoreHabit));
  }

  function finishSettingsDismissal() {
    const destination = pendingSettingsScreen.current;
    pendingSettingsScreen.current = null;
    if (destination === 'pro') setProOpen(true);
    if (destination === 'wallpapers') setWallpapersOpen(true);
  }

  function openProFromSettings() {
    pendingSettingsScreen.current = 'pro';
    setSettingsOpen(false);
    // Finish dismissing the iOS sheet before presenting its sibling.
    if (Platform.OS !== 'ios') finishSettingsDismissal();
  }

  function openWallpapersFromSettings() {
    pendingSettingsScreen.current = 'wallpapers';
    setSettingsOpen(false);
    if (Platform.OS !== 'ios') finishSettingsDismissal();
  }

  function saveNote(id: string, key: string, note: string) {
    setHabits((current) => current.map((habit) => {
      if (habit.id !== id) return habit;
      const notes = { ...habit.notes };
      if (note) notes[key] = note;
      else delete notes[key];
      return { ...habit, notes };
    }));
  }

  if (!hydrated) return <View style={styles.loading}>
    {storageError === 'load' ? <><Text style={styles.loadingTitle}>Couldn’t load your saved habits</Text><Text style={styles.loadingHint}>Your saved data has not been overwritten. Try loading it again.</Text><Pressable accessibilityRole="button" onPress={retryStorage} style={styles.restoreButton}><Text style={styles.restoreText}>Try again</Text></Pressable></>
      : <><ActivityIndicator color={colors.accentText} /><Text style={styles.loadingHint}>Loading your habits and collection…</Text></>}
  </View>;

  return <View style={styles.screen}>
    <View style={[styles.header, { paddingTop: insets.top + 18, paddingLeft: insets.left + 8, paddingRight: insets.right + 8 }]}>
      <View style={styles.headerContent}>
        <Toolbar onAdd={() => setAddingHabit(true)} onSettings={() => setSettingsOpen(true)} onPro={() => setProOpen(true)} onWallpapers={() => setWallpapersOpen(true)} />
        {storageError === 'save' && <View style={styles.archiveBanner}><Text accessibilityRole="alert" style={styles.archiveMessage}>Changes haven’t saved yet.</Text><Pressable accessibilityRole="button" onPress={retryStorage} style={styles.restoreButton}><Text style={styles.restoreText}>Retry saving</Text></Pressable></View>}
        {archivedCount > 0 && <View style={styles.archiveBanner}><Text style={styles.archiveMessage}>{archivedCount} {archivedCount === 1 ? 'habit' : 'habits'} archived</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Restore archived habits" onPress={restoreArchived} style={styles.restoreButton}><Text style={styles.restoreText}>{archivedCount === 1 ? 'Undo' : 'Restore all'}</Text></Pressable>
        </View>}
      </View>
    </View>
    <Animated.ScrollView ref={pager} horizontal pagingEnabled directionalLockEnabled nestedScrollEnabled
      showsHorizontalScrollIndicator={false} onScrollBeginDrag={() => feedback('selection')} onMomentumScrollEnd={finishSwipe}
      onScroll={trackScroll} scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="never" style={styles.screen} contentContainerStyle={styles.pagerContent}>
      {habitViews.map(({ id }) => <View key={id} style={{ width }}>
        <ScrollView style={styles.screen} nestedScrollEnabled directionalLockEnabled contentInsetAdjustmentBehavior="never" indicatorStyle={mode === 'dark' ? 'white' : 'black'}
          contentContainerStyle={[styles.scrollContent, { paddingLeft: insets.left + 8, paddingRight: insets.right + 8 }]}>
          <View style={styles.content}>
            {id === 'grid' && <HabitCards habits={activeHabits} today={today} onOpen={openHabit} onToggle={toggleCheckIn} />}
            {id === 'list' && <FiveDayChecklist habits={activeHabits} today={today} onOpen={openHabit} onToggle={toggleCheckIn} />}
            {id === 'month' && <MonthlyHabits habits={activeHabits} today={today} month={month} onMonthChange={setMonth} onOpen={openHabit} onToggle={toggleCheckIn} />}
          </View>
        </ScrollView>
      </View>)}
    </Animated.ScrollView>
    <View pointerEvents="box-none" style={[styles.viewSwitcherDock, { bottom: Math.max(48, insets.bottom + 14) }]}>
      <View accessibilityRole="tablist" accessibilityLabel="Habit views" style={styles.viewSwitcher}>
        <Animated.View accessible={false} pointerEvents="none" style={[styles.viewSelection, {
          transform: [{ translateX: scrollX.interpolate({
            inputRange: habitViews.map((_view, index) => index * width),
            outputRange: habitViews.map((_view, index) => index * (VIEW_BUTTON_SIZE + VIEW_BUTTON_GAP)),
            extrapolate: 'clamp',
          }) }],
        }]} />
        {habitViews.map(({ id, label }, index) => <Pressable key={id} accessibilityRole="tab" accessibilityLabel={`${label} view`}
          accessibilityState={{ selected: selectedIndex === index }} onPress={() => selectView(index)}
          style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}>
          <ViewIcon view={id} />
        </Pressable>)}
      </View>
    </View>
    <Modal visible={addingHabit} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setAddingHabit(false)}>
      {/* Modal keeps this content mounted until its native dismissal finishes. */}
      <HabitFormScreen onClose={() => setAddingHabit(false)} onSave={saveNewHabit} />
    </Modal>
    <SettingsScreen visible={settingsOpen} habits={habits} today={today} hasPro={HAS_PRO}
      onClose={() => setSettingsOpen(false)} onDismiss={finishSettingsDismissal} onOpenPro={openProFromSettings} onOpenWallpapers={openWallpapersFromSettings}
      onRestore={(id) => setHabits((current) => current.map((habit) => habit.id === id ? restoreHabit(habit) : habit))}
      onMove={(id, direction) => setHabits((current) => moveActiveHabit(current, id, direction))} />
    <Modal visible={proOpen} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setProOpen(false)}>
      <ProScreen onClose={() => setProOpen(false)} />
    </Modal>
    <Modal visible={wallpapersOpen} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setWallpapersOpen(false)}>
      <WallpapersScreen habits={habits} retainedCollections={retainedCollections} today={today} onClose={() => setWallpapersOpen(false)}
        onSelectWallpaper={setWallpaper}
        onStartNextCycle={(id) => setHabits((current) => current.map((habit) => habit.id === id ? startNextRewardCycle(habit, today) : habit))} />
    </Modal>
    <RightDrawer visible={habitDetailOpen && selectedHabit !== undefined} onRequestClose={closeHabit}
      onDismiss={() => { if (!habitDetailOpen) setSelectedHabitId(null); }}>
      {selectedHabit && <HabitDetailScreen key={selectedHabit.id} habit={selectedHabit} today={today} initialMonth={selectedIndex === 2 ? month : today} onBack={closeHabit}
        onToggle={(key) => toggleCheckIn(selectedHabit.id, key)} onSaveNote={(key, note) => saveNote(selectedHabit.id, key, note)}
        onUpdate={(draft) => saveHabitChanges(selectedHabit.id, draft)} onArchive={() => deleteHabit(selectedHabit.id)} />}
    </RightDrawer>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  loadingTitle: { color: colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' }, loadingHint: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  header: { backgroundColor: colors.background, paddingBottom: 26 },
  headerContent: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 14 },
  archiveBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, backgroundColor: colors.panel, borderRadius: 16 },
  archiveMessage: { flex: 1, color: colors.muted, fontSize: 13 }, restoreButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }, restoreText: { color: colors.accentText, fontSize: 14, fontWeight: '600' },
  pagerContent: { height: '100%' },
  scrollContent: { paddingBottom: 148 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 26 },
  viewSwitcherDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  viewSwitcher: { flexDirection: 'row', alignItems: 'center', gap: VIEW_BUTTON_GAP, padding: 6, borderRadius: 32, borderWidth: 1, borderColor: colors.controlBorder, backgroundColor: colors.raised },
  viewButton: { width: VIEW_BUTTON_SIZE, height: VIEW_BUTTON_SIZE, borderRadius: VIEW_BUTTON_SIZE / 2, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  viewSelection: { position: 'absolute', left: 6, top: 6, width: VIEW_BUTTON_SIZE, height: VIEW_BUTTON_SIZE, borderRadius: VIEW_BUTTON_SIZE / 2, borderWidth: 1, backgroundColor: colors.selected, borderColor: colors.controlBorder },
  pressed: { opacity: 0.65 },
}));
