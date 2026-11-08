import Modal from '../components/private-modal';
import { space, layout, control, radius, typeSize } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, type NativeScrollEvent, type NativeSyntheticEvent, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FiveDayChecklist, HabitCards, MonthlyHabits } from '../components/habit-views';
import { habitViews, Toolbar, ViewIcon } from '../components/habit-ui';
import { canCheckIn, dateFromKey, dateKey, shiftMonth } from '../data/habit-calendar';
import { type HabitDraft } from '../data/habit-draft';
import HabitDetailScreen from './habit-detail-screen';
import HabitFormScreen from './habit-form-screen';
import RightDrawer from '../components/right-drawer';
import SettingsScreen from './settings-screen';
import ProScreen from './pro-screen';
import ChartsScreen from './charts-screen';
import WallpapersScreen from './wallpapers-screen';
import useHabitStore from '../hooks/use-habit-store';
import useToday from '../hooks/use-today';
import { completionFeedbackFor, feedback, prepareHapticsForErase } from '../utils/feedback';
import AchievementHost from '../components/achievement-host';
import HabitEntryDrawer from '../components/habit-entry-drawer';
import { dayProgress } from '../data/habit-entries';
import AppIcon from '../components/app-icon';
import { useAppPreferences } from '../components/app-preferences';
import { createThemedStyles, useTheme } from '../components/theme';
import { useProAccess } from '../components/pro-access';
import { useProUpgrade } from '../components/pro-upgrade';
import { actionAccessIssue, canAddHabits, FREE_HABIT_LIMIT, hasProAccess, loggingHabitIds } from '../data/pro-access';
import FreeHabitsScreen from './free-habits-screen';
import OnboardingScreen from './onboarding-screen';
import { PrimaryButton, SheetHeader } from '../components/preference-ui';
import useFirstUse from '../hooks/use-first-use';
import { hasRecordedProgress, homeEmptyState } from '../data/first-use';
import { ReminderProvider } from '../components/reminders';
import ReminderStatus from '../components/reminder-status';
import BackupScreen from './backup-screen';
import { useLocalReset } from '../components/local-reset';

const VIEW_BUTTON_SIZE = control.regular;
const VIEW_BUTTON_GAP = space.compact;

export default function HomeScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors, mode, prepareForErase: prepareThemeErase } = useTheme();
  const reset = useLocalReset();
  const today = useToday();
  const access = useProAccess(), upgrade = useProUpgrade();
  const { preferences: p, update: updatePreferences, prepareForErase: preparePreferencesErase } = useAppPreferences();
  const [category, setCategory] = useState<string | null>(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { habits, retainedCollections, freeHabitIds, persistedSnapshot, actions, importBackup, prepareForErase: prepareHabitErase, claimAchievement, dismissAchievements, hydrated, saving, storageError, retryStorage } = useHabitStore(today, access);
  const snapshot = { habits, retainedCollections, freeHabitIds };
  const firstUse = useFirstUse(hydrated, habits.length > 0 || retainedCollections.length > 0);
  const [recoveryOpen, setRecoveryOpen] = useState(false), [recoveryBusy, setRecoveryBusy] = useState(false);
  const backupTools = { snapshot: persistedSnapshot, canExport: hydrated && !saving && !storageError, onRestore: importBackup,
    async onErase() {
      await Promise.allSettled([prepareHabitErase(), preparePreferencesErase(), prepareThemeErase(), prepareHapticsForErase()]);
      await reset.erase();
    } };
  const [choosingHabits, setChoosingHabits] = useState(false);
  const [selectionSession, setSelectionSession] = useState(0);
  const [entryTarget, setEntryTarget] = useState<{ id: string; day: string; session: number } | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryPresented, setEntryPresented] = useState(false);
  const [nativeSheetPresented, setNativeSheetPresented] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const entrySession = useRef(0);
  function openEntry(id: string, day: string) {
    if (!loggingHabitIds(snapshot, access).includes(id)) { upgrade.explain('active-habits'); return; }
    setEntryPresented(true); feedback('selection'); setEntryTarget({ id, day, session: ++entrySession.current }); setEntryOpen(true);
  }
  const entryHabit = habits.find(habit => habit.id === entryTarget?.id);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [habitDetailOpen, setHabitDetailOpen] = useState(false);
  const [notificationMonth, setNotificationMonth] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => shiftMonth(today, 0));
  const [addingHabit, setAddingHabit] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<'archived' | null>(null);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [wallpapersOpen, setWallpapersOpen] = useState(false);
  const pendingSettingsScreen = useRef<'pro' | 'wallpapers' | null>(null);
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
  const active = habits.filter((habit) => !habit.archived);
  const loggingIds = loggingHabitIds(snapshot, access);
  const excessHabits = !hasProAccess(access) && active.length > FREE_HABIT_LIMIT;
  const archivedCount = habits.length - active.length;
  const categories = [...new Set(active.flatMap((habit) => habit.categories ?? []))];
  const policy = p.showCompletedFilter && onlyIncomplete ? 'hidden' : p.completedHabits;
  const activeHabits = active.filter((habit) =>
    (!p.showCategoryFilter || !category || !categories.includes(category) || habit.categories?.includes(category))
    && (!p.showSearch || !searchOpen || habit.name.toLowerCase().includes(query.trim().toLowerCase()))
    && (policy !== 'hidden' || !habit.checkIns.includes(dateKey(today))));
  if (policy === 'bottom') activeHabits.sort((a,b) => Number(a.checkIns.includes(dateKey(today))) - Number(b.checkIns.includes(dateKey(today))));
  const emptyState = homeEmptyState(habits, activeHabits, today, !!((p.showCategoryFilter && category && categories.includes(category)) || (p.showSearch && searchOpen && query.trim())));
  useEffect(() => { if (Platform.OS !== 'ios' && !addingHabit && !settingsOpen && !chartsOpen && !proOpen && !wallpapersOpen && !choosingHabits) setNativeSheetPresented(false); }, [addingHabit, settingsOpen, chartsOpen, proOpen, wallpapersOpen, choosingHabits]);
  const previousHabits = useRef(habits);
  const pendingCompletion = useRef<{ id: string; key: string } | null>(null);

  useEffect(() => {
    if (saving || storageError) return;
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
  }, [habits, saving, storageError]);

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

  function reorderHabit(id: string, target: string) { actions.moveHabitTo(id, target); }

  function toggleCheckIn(id: string, key: string) {
    if (actionAccessIssue(snapshot, { type: 'toggle-check-in', id, day: key }, access)) { upgrade.explain('active-habits'); return; }
    const target = habits.find((habit) => habit.id === id);
    if (!target || !canCheckIn(target, key, today)) return;
    const progress = dayProgress(target, key, dateKey(today));
    if (progress.configuration.tracking.kind !== 'yes-no') {
      if (progress.configuration.habitType === 'quit' || progress.configuration.tracking.onTap === 'enter-total' || progress.complete
        || progress.record?.value.kind === 'legacy-complete' || key !== dateKey(today)) { openEntry(id, key); return; }
      pendingCompletion.current = { id, key };
      feedback('press');
      void actions.increment(id, key);
    } else { pendingCompletion.current = { id, key }; void actions.toggleCheckIn(id, key); }
  }

  function openHabit(id: string) {
    setNotificationMonth(null);
    setSelectedHabitId(id);
    setHabitDetailOpen(true);
  }

  function closeHabit() {
    // Retain the selected habit until the drawer has moved completely offscreen.
    setHabitDetailOpen(false);
  }

  async function saveNewHabit(draft: HabitDraft) {
    if (!canAddHabits(snapshot, 1, access)) { upgrade.explain('active-habits'); return false; }
    if (!(await actions.createHabit(draft))) return false;
    setMonth(shiftMonth(today, 0));
    feedback('success');
    return true;
  }

  async function saveHabitChanges(id: string, draft: HabitDraft) {
    const ok = await actions.updateHabit(id, draft);
    if (ok) feedback('success');
    return ok;
  }

  function deleteHabit(id: string) {
    actions.archiveHabit(id);
    closeHabit();
  }

  function restoreArchived() {
    if (!canAddHabits(snapshot, archivedCount, access)) { upgrade.explain('active-habits'); return; }
    actions.restoreAll();
  }

  function addHabit() {
    if (!canAddHabits(snapshot, 1, access)) { upgrade.explain('active-habits'); return; }
    setAddingHabit(true);
  }

  function clearFilters() {
    setCategory(null); setOnlyIncomplete(false); setQuery(''); setSearchOpen(false);
    if (p.completedHabits === 'hidden') updatePreferences({ completedHabits: 'in-place' });
  }

  function openArchived() { setSettingsInitialPage('archived'); setSettingsOpen(true); }

  async function finishWelcome(createHabit: boolean) {
    if (await firstUse.finish()) { if (createHabit) setAddingHabit(true); }
  }

  function finishSettingsDismissal() {
    setNativeSheetPresented(false);
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

  if (!hydrated || firstUse.status === 'loading') return <View style={styles.loading}>
    {storageError === 'load' ? <><Text style={styles.loadingTitle}>{t("Couldn’t load your saved habits")}</Text><Text style={styles.loadingHint}>{t("Your saved data has not been overwritten. Try loading it again.")}</Text><Pressable accessibilityRole="button" onPress={retryStorage} style={styles.restoreButton}><Text style={styles.restoreText}>{t("Try again")}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setRecoveryOpen(true)} style={styles.restoreButton}><Text style={styles.restoreText}>{t('Backup & Restore')}</Text></Pressable>
      <Modal visible={recoveryOpen} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background} allowSwipeDismissal={!recoveryBusy} onRequestClose={() => { if (!recoveryBusy) setRecoveryOpen(false); }}>
        <View style={styles.screen}><SheetHeader title={t('Backup & Restore')} disabled={recoveryBusy} onClose={() => setRecoveryOpen(false)} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.md }}><BackupScreen {...backupTools} onBusyChange={setRecoveryBusy} /></ScrollView>
        </View>
      </Modal>
    </>
      : <><ActivityIndicator color={colors.accentText} /><Text style={styles.loadingHint}>{t("Loading your habits and collection…")}</Text></>}
  </View>;

  if (firstUse.status === 'error') return <View style={styles.loading}>
    <Text accessibilityRole="header" style={styles.loadingTitle}>{t('Welcome settings unavailable')}</Text>
    <Text accessibilityRole="alert" style={styles.loadingHint}>{t('Your habits are safe. Retry loading your welcome preference, or continue for this session.')}</Text>
    <PrimaryButton onPress={firstUse.retry}>{t('Try again')}</PrimaryButton>
    <Pressable accessibilityRole="button" onPress={firstUse.continueForSession} style={styles.restoreButton}><Text style={styles.restoreText}>{t('Continue for now')}</Text></Pressable>
  </View>;
  if (firstUse.status === 'welcome') return <OnboardingScreen firstLaunch saving={firstUse.saving} saveError={firstUse.error === 'save'}
    onContinue={() => { void finishWelcome(true); }} onSkip={() => { void finishWelcome(false); }} onContinueForSession={firstUse.continueForSession} />;

  const entryEditor = entryTarget && entryHabit ? <HabitEntryDrawer key={`${entryTarget.id}:${entryTarget.day}:${entryTarget.session}`} visible={entryOpen} habit={entryHabit} day={entryTarget.day} today={today}
    onClose={() => setEntryOpen(false)} onDismiss={() => setEntryPresented(false)} onSave={(value, note) => actions.recordDay(entryTarget.id, entryTarget.day, value, note)} onRetry={retryStorage} /> : null;
  return <ReminderProvider snapshot={persistedSnapshot} ready={hydrated && !saving && !storageError}
    navigationReady={!entryPresented && !addingHabit && !settingsOpen && !chartsOpen && !proOpen && !wallpapersOpen && !choosingHabits && !upgrade.open && !nativeSheetPresented && !detailBusy && (habitDetailOpen || selectedHabitId === null)}
    onTarget={target => {
      if (target.kind === 'daily') { closeHabit(); selectView(0); return; }
      const habit = habits.find(item => item.id === target.habitId && !item.archived);
      if (!habit) { Alert.alert(t('Reminder'), t('This habit is no longer available.')); return; }
      setNotificationMonth(dateFromKey(target.day)); setSelectedHabitId(habit.id); setHabitDetailOpen(true);
    }}><AchievementHost habits={habits} eligible={hydrated && (habitDetailOpen || selectedHabitId === null) && !entryPresented && !addingHabit && !settingsOpen && !chartsOpen && !proOpen && !wallpapersOpen && !choosingHabits && !upgrade.open && !nativeSheetPresented && !detailBusy}
      saving={saving} storageError={storageError} onClaim={claimAchievement} onDismissAll={dismissAchievements} onRetry={retryStorage} onSelectWallpaper={actions.selectWallpaper}>
      {achievements => <View style={styles.screen}>
    <View style={[styles.header, { paddingTop: insets.top + space.md, paddingLeft: insets.left + layout.inset, paddingRight: insets.right + layout.inset }]}>
      <View style={styles.headerContent}>
        <Toolbar onCharts={() => setChartsOpen(true)} onAdd={addHabit} onSettings={() => { setSettingsInitialPage(null); setSettingsOpen(true); }} onPro={() => setProOpen(true)} onWallpapers={() => setWallpapersOpen(true)} />
        <ReminderStatus onlyProblems />
        {excessHabits && <View style={styles.archiveBanner}><Text style={styles.archiveMessage}>{t('Four habits can be logged on Free. Your other habits stay saved.')}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setSelectionSession(value => value + 1); setChoosingHabits(true); }} style={styles.restoreButton}><Text style={styles.restoreText}>{t('Choose habits')}</Text></Pressable></View>}
        {(p.showCompletedFilter || p.showSearch || (p.showCategoryFilter && categories.length > 0)) && <View style={styles.filters}>
          {p.showCompletedFilter && <Pressable accessibilityRole="checkbox" accessibilityLabel={t("Show only incomplete habits")} accessibilityState={{ checked: onlyIncomplete }}
            onPress={() => setOnlyIncomplete(!onlyIncomplete)} style={[styles.filter, onlyIncomplete && styles.activeFilter]}>
            <AppIcon name="check" size={15} /><Text style={styles.filterText}>{onlyIncomplete ? t('Remaining') : t('All habits')}</Text>
          </Pressable>}
          {p.showCategoryFilter && categories.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilters}>
            {[null,...categories].map((name) => <Pressable key={name ?? 'all'} accessibilityRole="radio" accessibilityLabel={name ? t(name) : t('All categories')} accessibilityState={{ checked: category === name }}
              onPress={() => setCategory(name)} style={[styles.filter, category === name && styles.activeFilter]}>
              <AppIcon name="hash" size={14} />{p.showCategoryNames && <Text style={styles.filterText}>{name ? t(name) : t('All categories')}</Text>}
            </Pressable>)}
          </ScrollView>}
          {p.showSearch && <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? t('Close habit search') : t('Search habits')}
            onPress={() => { setSearchOpen(!searchOpen); setQuery(''); }} style={styles.filter}><AppIcon name={searchOpen ? 'close' : 'search'} size={18} /></Pressable>}
        </View>}
        {p.showSearch && searchOpen && <TextInput autoFocus keyboardAppearance={mode} accessibilityLabel={t("Search habits")} value={query} onChangeText={setQuery}
          placeholder={t("Search habits")} placeholderTextColor={colors.muted} style={styles.searchInput} />}
        {storageError === 'save' && <View style={styles.archiveBanner}><Text accessibilityRole="alert" style={styles.archiveMessage}>{t("Changes haven’t saved yet.")}</Text><Pressable accessibilityRole="button" onPress={retryStorage} style={styles.restoreButton}><Text style={styles.restoreText}>{t("Retry saving")}</Text></Pressable></View>}
        {archivedCount > 0 && <View style={styles.archiveBanner}><Text style={styles.archiveMessage}>{t('{count} habits archived', { count: archivedCount })}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Restore archived habits")} onPress={restoreArchived} style={styles.restoreButton}><Text style={styles.restoreText}>{archivedCount === 1 ? t('Undo') : t('Restore all')}</Text></Pressable>
        </View>}
        {active.length > 0 && !hasRecordedProgress(habits) && <View style={styles.firstLog}>
          <Text style={styles.firstLogTitle}>{t('Your first check-in')}</Text>
          <Text style={styles.loadingHint}>{t('On a scheduled day, tap a completion button to log progress. Open a habit and hold a calendar day to edit an entry or add a note.')}</Text>
        </View>}
      </View>
    </View>
    <Animated.ScrollView ref={pager} scrollEnabled={p.swipeViews} horizontal pagingEnabled directionalLockEnabled nestedScrollEnabled
      showsHorizontalScrollIndicator={false} onScrollBeginDrag={() => feedback('selection')} onMomentumScrollEnd={finishSwipe}
      onScroll={trackScroll} scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="never" style={styles.screen} contentContainerStyle={styles.pagerContent}>
      {habitViews.map(({ id }, index) => <View key={id} style={{ width }}
        accessibilityElementsHidden={selectedIndex !== index} importantForAccessibility={selectedIndex === index ? 'auto' : 'no-hide-descendants'}>
        <ScrollView style={styles.screen} nestedScrollEnabled directionalLockEnabled contentInsetAdjustmentBehavior="never" indicatorStyle={mode === 'dark' ? 'white' : 'black'}
          contentContainerStyle={[styles.scrollContent, { paddingLeft: insets.left + layout.inset, paddingRight: insets.right + layout.inset }]}>
          <View style={styles.content}>
            {emptyState && <View style={styles.emptyState}>
              <AppIcon name={emptyState === 'archived' ? 'archive' : emptyState === 'complete' ? 'check' : emptyState === 'filtered' ? 'search' : 'plus'} size={32} color={colors.accentText} />
              <Text accessibilityRole="header" style={styles.loadingTitle}>{emptyState === 'first' ? t('One small habit. A fresh start.') : emptyState === 'archived' ? t('Your habits are in the archive') : emptyState === 'complete' ? t('All done for today') : t('No habits match these filters.')}</Text>
              <Text style={styles.loadingHint}>{emptyState === 'first' ? t('Start with something small. Your first check-in is only a few taps away.') : emptyState === 'archived' ? t('Restore a habit with its history, or create something new.') : emptyState === 'complete' ? t('Your completed habits are hidden. Show them to review your progress.') : t('Clear the filters to see your habits again.')}</Text>
              <PrimaryButton onPress={emptyState === 'first' ? addHabit : emptyState === 'archived' ? openArchived : clearFilters}>{emptyState === 'first' ? t('Add a habit') : emptyState === 'archived' ? t('Archived Habits') : emptyState === 'complete' ? t('Show all habits') : t('Clear filters')}</PrimaryButton>
              {emptyState === 'archived' && <Pressable accessibilityRole="button" onPress={addHabit} style={styles.restoreButton}><Text style={styles.restoreText}>{t('Add a habit')}</Text></Pressable>}
            </View>}
            {id === 'grid' && <HabitCards habits={activeHabits} onReorder={reorderHabit} today={today} onOpen={openHabit} onToggle={toggleCheckIn} />}
            {id === 'list' && <FiveDayChecklist habits={activeHabits} onReorder={reorderHabit} today={today} onOpen={openHabit} onToggle={toggleCheckIn} />}
            {id === 'month' && <MonthlyHabits habits={activeHabits} onReorder={reorderHabit} today={today} month={month} onMonthChange={setMonth} onOpen={openHabit} onToggle={toggleCheckIn} />}
          </View>
        </ScrollView>
      </View>)}
    </Animated.ScrollView>
    {p.showViewBar && <View pointerEvents="box-none" style={[styles.viewSwitcherDock, { bottom: Math.max(48, insets.bottom + 14) }]}>
      <View accessibilityRole="tablist" accessibilityLabel={t("Habit views")} style={styles.viewSwitcher}>
        <Animated.View accessible={false} pointerEvents="none" style={[styles.viewSelection, {
          transform: [{ translateX: scrollX.interpolate({
            inputRange: habitViews.map((_view, index) => index * width),
            outputRange: habitViews.map((_view, index) => index * (VIEW_BUTTON_SIZE + VIEW_BUTTON_GAP)),
            extrapolate: 'clamp',
          }) }],
        }]} />
        {habitViews.map(({ id, label }, index) => <Pressable key={id} accessibilityRole="tab" accessibilityLabel={t("{value0} view", { value0: t(label) })}
          accessibilityState={{ selected: selectedIndex === index }} onPress={() => selectView(index)}
          style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}>
          <ViewIcon view={id} />
        </Pressable>)}
      </View>
    </View>}
    <Modal visible={addingHabit} onShow={() => setNativeSheetPresented(true)} onDismiss={() => setNativeSheetPresented(false)} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal={!formBusy} onRequestClose={() => { if (!formBusy) setAddingHabit(false); }}>
      {/* Modal keeps this content mounted until its native dismissal finishes. */}
      <HabitFormScreen onClose={() => setAddingHabit(false)} onSave={saveNewHabit} onRetrySave={retryStorage}
        onBusyChange={setFormBusy}
        canSave={() => { if (canAddHabits(snapshot, 1, access)) return true; upgrade.explain('active-habits'); return false; }} />
      {addingHabit && upgrade.sheet}
    </Modal>
    <SettingsScreen visible={settingsOpen} habits={habits} today={today} initialPage={settingsInitialPage}
      backupTools={backupTools}
      saveError={storageError === 'save'} saving={saving} onRetrySave={retryStorage}
      onClose={() => setSettingsOpen(false)} onShow={() => setNativeSheetPresented(true)} onDismiss={finishSettingsDismissal} onOpenPro={openProFromSettings} onOpenWallpapers={openWallpapersFromSettings}
      onRestore={actions.restoreHabit}
      onMove={actions.moveHabit} />
    <Modal visible={chartsOpen} onShow={() => setNativeSheetPresented(true)} onDismiss={() => setNativeSheetPresented(false)} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setChartsOpen(false)}>
      <ChartsScreen habits={habits} today={today} onClose={() => setChartsOpen(false)} />
    </Modal>
    <Modal visible={proOpen} onShow={() => setNativeSheetPresented(true)} onDismiss={() => setNativeSheetPresented(false)} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setProOpen(false)}>
      <ProScreen onClose={() => setProOpen(false)} />
    </Modal>
    <Modal visible={wallpapersOpen} onShow={() => setNativeSheetPresented(true)} onDismiss={() => setNativeSheetPresented(false)} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setWallpapersOpen(false)}>
      <WallpapersScreen habits={habits} retainedCollections={retainedCollections} today={today} onClose={() => setWallpapersOpen(false)}
        onSelectWallpaper={actions.selectWallpaper}
        onStartNextCycle={actions.startNextCycle} />
    </Modal>
    <Modal visible={choosingHabits} onShow={() => setNativeSheetPresented(true)} onDismiss={() => setNativeSheetPresented(false)} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={() => setChoosingHabits(false)}>
      <FreeHabitsScreen key={selectionSession} habits={habits} selected={loggingIds} onSave={actions.chooseFreeHabits} onClose={() => setChoosingHabits(false)} />
    </Modal>
    <RightDrawer visible={habitDetailOpen && selectedHabit !== undefined} onRequestClose={closeHabit}
      onDismiss={() => { if (!habitDetailOpen) { setSelectedHabitId(null); setDetailBusy(false); } }}>
      {selectedHabit && <HabitDetailScreen key={`${selectedHabit.id}:${notificationMonth?.getTime() ?? ''}`} habit={selectedHabit} today={today} initialMonth={notificationMonth ?? (selectedIndex === 2 ? month : today)} onBack={closeHabit}
        readOnly={!loggingIds.includes(selectedHabit.id)}
        onToggle={(key) => toggleCheckIn(selectedHabit.id, key)} onEditEntry={(key) => openEntry(selectedHabit.id, key)} saveError={storageError === 'save'} saving={saving} onRetrySave={retryStorage}
        onModalBusyChange={setDetailBusy} onUpdate={(draft) => saveHabitChanges(selectedHabit.id, draft)} onArchive={() => deleteHabit(selectedHabit.id)} />}
      {habitDetailOpen && entryEditor}
      {habitDetailOpen && achievements}
      {habitDetailOpen && upgrade.sheet}
    </RightDrawer>
    {!habitDetailOpen && entryEditor}
    {!habitDetailOpen && achievements}
    {!habitDetailOpen && !addingHabit && upgrade.sheet}
  </View>}</AchievementHost></ReminderProvider>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  filters: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm }, categoryFilters: { gap: space.xs },
  filter: { minHeight: control.touch, paddingHorizontal: space.sm, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, minWidth: control.touch, paddingVertical: space.xs },
  activeFilter: { borderColor: colors.accent, backgroundColor: colors.accentPanel }, filterText: { fontSize: typeSize.caption, color: colors.text, flexShrink: 1 },
  searchInput: { backgroundColor: colors.panel, color: colors.text, borderRadius: radius.control, padding: space.sm, marginTop: space.sm, minHeight: control.regular }, emptyState: { paddingHorizontal: space.md, paddingVertical: space.xl, gap: space.md, alignItems: 'center', maxWidth: layout.preview, alignSelf: 'center', width: '100%' },
  firstLog: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, padding: space.md, gap: space.xs }, firstLogTitle: { color: colors.text, fontSize: typeSize.label, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  loadingTitle: { color: colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' }, loadingHint: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  header: { backgroundColor: colors.background, paddingBottom: layout.section },
  headerContent: { width: '100%', maxWidth: layout.content, alignSelf: 'center', gap: space.md },
  archiveBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.md, backgroundColor: colors.panel, borderRadius: radius.control },
  archiveMessage: { flex: 1, color: colors.muted, fontSize: 13 }, restoreButton: { minHeight: control.touch, justifyContent: 'center', paddingHorizontal: space.xs }, restoreText: { color: colors.accentText, fontSize: 14, fontWeight: '600' },
  pagerContent: { height: '100%' },
  scrollContent: { paddingBottom: 148 },
  content: { width: '100%', maxWidth: layout.content, alignSelf: 'center', gap: layout.section },
  viewSwitcherDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  viewSwitcher: { flexDirection: 'row', alignItems: 'center', gap: VIEW_BUTTON_GAP, padding: space.compact, borderRadius: 32, borderWidth: 1, borderColor: colors.controlBorder, backgroundColor: colors.raised },
  viewButton: { width: VIEW_BUTTON_SIZE, height: VIEW_BUTTON_SIZE, borderRadius: VIEW_BUTTON_SIZE / 2, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  viewSelection: { position: 'absolute', left: space.compact, top: space.compact, width: VIEW_BUTTON_SIZE, height: VIEW_BUTTON_SIZE, borderRadius: VIEW_BUTTON_SIZE / 2, borderWidth: 1, backgroundColor: colors.selected, borderColor: colors.controlBorder },
  pressed: { opacity: 0.65 },
}));
