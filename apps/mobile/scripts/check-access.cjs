const assert = require('node:assert/strict');
const { load, harness, tick } = require('./check-actions.cjs');
const { FREE_ACCESS: FREE, PRO_ACCESS: PRO, PRO_CAPABILITIES, canUse, reminderLimit, canAddHabits, loggingHabitIds, actionAccessIssue, effectivePreferences, purchaseAdapter } = load('src/data/pro-access.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const { habitFromDraft, emptyDraft } = load('src/data/habit-draft.ts');
const { dateFromKey, addDays } = load('src/data/habit-calendar.ts');
const { archiveHabit, restoreHabit, reconcileArchive, archivedDaysLeft } = load('src/data/habit-archive.ts');
const { encodeHabits, decodeHabits } = load('src/data/habit-storage.ts');
const { reconcileRewards } = load('src/data/habit-rewards.ts');
const { dictionaries, translatedLanguages, messageKey } = load('src/i18n/translations.ts');
const { createTranslator } = load('src/i18n/locale.ts');
const today = dateFromKey('2026-11-08'), day = '2026-11-08';
const draft = { ...emptyDraft(), name: 'Practice' };
const make = id => habitFromDraft(draft, today, id);
const snapshot = habits => ({ habits, retainedCollections: [] });
const uncertain = [{ status: 'loading' }, { status: 'unavailable' }];
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
async function check() {
  assert.deepEqual(await purchaseAdapter.read(), FREE, 'Production preview adapter cannot grant Pro');
  for (const capability of Object.keys(PRO_CAPABILITIES)) {
    for (const access of [FREE, ...uncertain]) assert.equal(canUse(capability, access), false, `${capability} requires verified Pro`);
    assert.equal(canUse(capability, PRO), true);
    for (const text of Object.values(PRO_CAPABILITIES[capability])) {
      for (const locale of translatedLanguages) assert.ok(dictionaries[locale][messageKey(text)], `${locale}: ${text}`);
    }
  }
  for (const capability of ['tracking', 'history', 'notes', 'data-export', 'data-restore', 'habit-sharing', 'badge-sharing', 'celebrations', 'appearance']) {
    for (const access of [FREE, PRO, ...uncertain]) assert.equal(canUse(capability, access), true, `${capability} stays free`);
  }
  assert.equal(reminderLimit(FREE), 1); assert.equal(reminderLimit(PRO), 3);
  const four = snapshot(['a','b','c','d'].map(make));
  assert.equal(canAddHabits(four, 1, FREE), false); assert.equal(canAddHabits(four, 100, PRO), true);
  assert.equal(actionAccessIssue(four, { type: 'create', id: 'e', draft }, FREE), 'active-habits');
  assert.equal(actionAccessIssue(four, { type: 'select-wallpaper', id: 'a', days: 7, edition: 'landscape' }, FREE), 'wallpaper-export');
  const six = { ...snapshot(['a','b','c','d','e','f'].map(make)), freeHabitIds: ['f','e','b','a'] };
  assert.deepEqual(loggingHabitIds(six, FREE), ['f','e','b','a']); assert.equal(loggingHabitIds(six, PRO).length, 6);
  for (const type of ['toggle-check-in','record-day','increment','save-note']) {
    assert.equal(actionAccessIssue(six, { type, id: 'c', day }, FREE), 'active-habits');
    assert.equal(actionAccessIssue(six, { type, id: 'e', day }, FREE), null);
    assert.equal(actionAccessIssue(six, { type, id: 'c', day }, PRO), null);
  }
  const prefs = { ...DEFAULT_PREFERENCES, language: 'fr', compactDays: 7, cardStreak: true };
  assert.equal(effectivePreferences(prefs, PRO), prefs);
  assert.equal(effectivePreferences(prefs, FREE).compactDays, 5);
  assert.equal(effectivePreferences(prefs, FREE).cardStreak, false);
  assert.equal(effectivePreferences(prefs, FREE).language, 'fr');
  assert.equal(prefs.cardStreak, true, 'Downgrade never erases saved Pro preferences');

  const old = snapshot([archiveHabit(make('old'), addDays(today, -80))]);
  for (const access of uncertain) assert.equal(reconcileArchive(old, today, access), old, 'Uncertain entitlement cannot purge archives');
  assert.equal(reconcileArchive(old, today, FREE).habits.length, 0);
  const protectedState = reconcileArchive(old, today, PRO);
  assert.equal(protectedState.habits[0].archiveProtected, true);
  const reloaded = decodeHabits(encodeHabits(protectedState));
  const expiredPro = reconcileArchive(reloaded, today, FREE);
  assert.equal(expiredPro.habits[0].archiveRecoveryOn, day);
  assert.equal(archivedDaysLeft(expiredPro.habits[0], today), 30);
  assert.equal(reconcileArchive(expiredPro, addDays(today, 29), FREE), expiredPro, 'Renders do not restart the recovery window');
  assert.equal(reconcileArchive(expiredPro, addDays(today, 30), FREE).habits.length, 0);
  assert.equal(reconcileArchive(expiredPro, addDays(today, 60), uncertain[1]), expiredPro, 'Offline verification failure protects expired recoveries');
  assert.equal(restoreHabit(expiredPro.habits[0]).archiveRecoveryOn, undefined);
  assert.equal(restoreHabit(protectedState.habits[0]).archiveProtected, undefined);
  const renewed = reconcileArchive(expiredPro, addDays(today, 20), PRO);
  const lapsedAgain = reconcileArchive(renewed, addDays(today, 200), FREE);
  assert.equal(archivedDaysLeft(lapsedAgain.habits[0], addDays(today, 200)), 30, 'Each verified Pro lapse gives a fresh window');
  const legacy = reconcileArchive(snapshot([{ ...make('legacy'), archived: true }]), today, PRO);
  assert.equal(legacy.habits[0].archiveProtected, true, 'Undated Pro archives get protected during migration');
  assert.throws(() => decodeHabits(JSON.stringify({ version: 2, ...four, freeHabitIds: ['a','a'] })));
  assert.throws(() => encodeHabits(snapshot([{ ...make('invalid'), archiveProtected: true }])));

  let access = PRO, raw = encodeHabits(six), writes = 0;
  const driver = { getItem: async () => raw, setItem: async (_key, value) => { writes++; raw = value; } };
  const h = harness(), hook = load('src/hooks/use-habit-store.ts', { react: h.react, '@react-native-async-storage/async-storage': driver }).default;
  const render = () => h.render(() => hook(today, access));
  render(); await tick(); let store = render(); await tick();
  const staleActions = store.actions;
  access = FREE; store = render(); await tick(); store = render();
  assert.equal(store.habits.length, 6, 'Downgrade preserves excess habits');
  assert.equal(await staleActions.createHabit(draft), false, 'Old callbacks still consult the latest entitlement');
  const before = writes;
  assert.equal(await store.actions.toggleCheckIn('c', day), false); assert.equal(writes, before, 'Denied actions do not save');
  assert.equal(await store.actions.chooseFreeHabits(['a','b','c','d']), true); store = render();
  assert.equal(await store.actions.toggleCheckIn('c', day), true); store = render();
  assert.ok(store.habits.find(habit => habit.id === 'c').checkIns.includes(day));
  assert.equal(await store.actions.toggleCheckIn('e', day), false);
  assert.equal(await store.actions.chooseFreeHabits(['a','b','c','d','e']), false);
  assert.equal(await store.actions.archiveHabit('e'), true); store = render();
  assert.equal(await store.actions.restoreHabit('e'), false);
  assert.equal(await store.actions.archiveHabit('f'), true); store = render();
  assert.equal(await store.actions.archiveHabit('d'), true); store = render();
  assert.equal(await store.actions.restoreAll(), false, 'Bulk restore at the limit is atomic');
  assert.equal(await store.actions.restoreHabit('e'), true); store = render();
  assert.equal(await store.actions.restoreHabit('f'), false);
  access = PRO; store = render(); await tick();
  assert.equal(await store.actions.restoreAll(), true); store = render();
  assert.equal(await store.actions.toggleCheckIn('f', day), true);
  access = uncertain[1]; store = render(); await tick();
  assert.equal(await store.actions.selectWallpaper('a', 7, 'landscape'), false);
  assert.equal(decodeHabits(raw).habits.length, 6, 'Offline uncertainty preserves all saved history');

  // Screen guards execute before rendering analytics or calling image APIs.
  const native = { Modal: 'Modal', View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: s => s }, Platform: { OS: 'ios' },
    useWindowDimensions: () => ({ width: 390, height: 844 }), Alert: { alert() {} } };
  const theme = { useTheme: () => ({ mode: 'dark', colors: {} }), createThemedStyles: f => () => f({}) };
  const shared = { usePreferenceStyles: () => ({}), SheetHeader: 'SheetHeader' };
  const locale = { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) };
  const charts = load('src/screens/charts-screen.tsx', { react: h.react, 'react-native': native,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '../components/pro-access': { useProAccess: () => access }, './pro-screen': 'ProScreen', '../components/haptic-pressable': 'Pressable',
    '../components/habit-ui': { HabitIcon: 'HabitIcon' }, '../components/preference-ui': shared, '../components/analytics-line-chart': 'LineChart',
    '../components/app-icon': 'AppIcon', '../components/theme': theme, '../i18n/context': locale }).default;
  access = FREE; assert.equal(charts({}).type, 'ProScreen');
  access = PRO; assert.notEqual(charts({}).type, 'ProScreen');
  let captureCalls = 0, shareCalls = 0, upgradeCalls = 0;
  const ph = harness();
  const Preview = load('src/components/collection-preview.tsx', { react: ph.react, 'react-native': native,
    './private-modal': 'Modal',
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'react-native-view-shot': { captureRef: async () => { captureCalls++; return 'file'; }, releaseCapture() {} },
    'expo-sharing': { isAvailableAsync: async () => { shareCalls++; return true; }, shareAsync: async () => { shareCalls++; } },
    './haptic-pressable': 'Pressable', './preference-ui': shared, './collection-art': { CollectionWallpaper: 'Wallpaper', ChampionBadgeArt: 'Badge', WALLPAPER_TITLES: { 7: 'Dawn' } },
    './app-icon': 'AppIcon', './theme': theme, '../utils/feedback': { feedback() {} }, '../i18n/context': locale,
    './pro-access': { useProAccess: () => access }, './pro-upgrade': { useProUpgrade: () => ({ request: cap => { upgradeCalls++; return canUse(cap, access); }, sheet: null }) } }).default;
  const earned = reconcileRewards({ ...make('earned'), createdOn: '2026-11-01', checkIns: ['2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07'] }, today);
  access = FREE;
  const props = { visible: true, habit: earned, item: { kind: 'wallpaper', days: 7 }, onClose() {}, onSelectWallpaper() { throw Error('Free cannot select'); } };
  const content = Preview(props).props.children;
  let tree = ph.render(() => content.type(content.props));
  const exportButton = all(tree, n => n.type === 'Pressable' && n.props.onPress).at(-1);
  assert.equal(exportButton.props.disabled, false, 'Locked artwork still offers the upgrade route before image loading');
  await exportButton.props.onPress();
  assert.equal(upgradeCalls, 1); assert.equal(captureCalls, 0); assert.equal(shareCalls, 0, 'Free export never reaches capture/share APIs');
  global.requestAnimationFrame = callback => callback();
  const badge = { id: 'earned:cycle:1', cycle: 1, earnedOn: day, habitName: earned.name, habitColor: earned.color, habitIcon: earned.icon };
  const badgeHabit = { ...earned, rewards: { ...earned.rewards, badges: [badge] } };
  const badgeContent = Preview({ ...props, habit: badgeHabit, item: { kind: 'badge', badge } }).props.children;
  // This content uses the Preview module's hook runtime, so mount it with ph.
  tree = ph.render(() => badgeContent.type(badgeContent.props));
  all(tree, n => n.props?.collapsable === false)[0].props.ref.current = 'native-view';
  all(tree, n => n.props?.collapsable === false)[0].props.onLayout();
  tree = ph.render(() => badgeContent.type(badgeContent.props));
  const share = all(tree, n => n.type === 'Pressable' && n.props.onPress).at(-1);
  assert.equal(share.props.disabled, false);
  await share.props.onPress();
  assert.equal(captureCalls, 1); assert.equal(shareCalls, 2, 'Free can capture and share earned badges');
  assert.equal(upgradeCalls, 1, 'Free badge sharing does not request an upgrade');
  delete global.requestAnimationFrame;
  const prefHarness = harness();
  let savedPrefs = JSON.stringify(prefs), prefWrites = 0;
  const Provider = load('src/components/app-preferences.tsx', {
    react: { ...prefHarness.react, createContext: () => ({ Provider: 'Provider' }) }, 'react-native': native,
    '@react-native-async-storage/async-storage': { getItem: async () => savedPrefs, setItem: async (_key, value) => { prefWrites++; savedPrefs = value; } },
    './pro-access': { useProAccess: () => access },
  }).AppPreferencesProvider;
  access = PRO;
  prefHarness.render(() => Provider({})); await tick();
  let context = prefHarness.render(() => Provider({})).props.value;
  assert.equal(context.preferences.cardStreak, true);
  const oldUpdate = context.update;
  access = FREE; context = prefHarness.render(() => Provider({})).props.value;
  assert.equal(context.preferences.compactDays, 5);
  oldUpdate({ compactDays: 6 }); await tick();
  assert.equal(prefWrites, 0, 'Stale Pro preference callbacks cannot write after downgrade');
  access = PRO; context = prefHarness.render(() => Provider({})).props.value;
  assert.equal(context.preferences.compactDays, 7); assert.equal(context.preferences.cardStreak, true, 'Upgrade restores saved paid display choices');

  const late = harness(); let resolvePrefs, earlyWrites = 0;
  const savedNavigation = { ...prefs, showViewBar: false, swipeViews: true };
  const LatePreferences = load('src/components/app-preferences.tsx', {
    react: { ...late.react, createContext: () => ({ Provider: 'Provider' }) }, 'react-native': native,
    '@react-native-async-storage/async-storage': { getItem: () => new Promise(resolve => { resolvePrefs = resolve; }), setItem: async () => { earlyWrites++; } },
    './pro-access': { useProAccess: () => PRO },
  }).AppPreferencesProvider;
  let early = late.render(() => LatePreferences({})).props.value;
  assert.equal(await early.update({ showViewBar: false, swipeViews: false }), false);
  resolvePrefs(JSON.stringify(savedNavigation)); await tick(); early = late.render(() => LatePreferences({})).props.value;
  assert.equal(early.preferences.showViewBar, false, 'Rejected pre-hydration patches cannot overwrite saved navigation choices');
  assert.equal(early.preferences.swipeViews, true); assert.equal(earlyWrites, 0, 'Rejected patches do not schedule an unsolicited write after hydration');

  const chooserHarness = harness(); let chosen, chooserWrites = 0, chooserCloses = 0;
  const Chooser = load('src/screens/free-habits-screen.tsx', {
    react: chooserHarness.react, 'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 34 }) },
    '../components/haptic-pressable': 'Pressable', '../components/habit-ui': { HabitIcon: 'HabitIcon' }, '../components/app-icon': 'AppIcon',
    '../components/preference-ui': { ...shared, PrimaryButton: 'PrimaryButton' }, '../components/theme': theme, '../i18n/context': locale,
  }).default;
  const cp = { habits: six.habits, selected: ['a','b','c','d'], onClose: () => chooserCloses++, onSave: async ids => { chooserWrites++; chosen = ids; return false; } };
  const renderChooser = () => chooserHarness.render(() => Chooser(cp));
  tree = renderChooser();
  assert.equal(all(tree, n => n.props?.accessibilityRole === 'checkbox').filter(n => n.props.disabled).length, 2);
  all(tree, n => n.props?.accessibilityRole === 'checkbox')[0].props.onPress(); tree = renderChooser();
  const buttons = all(tree, n => n.props?.accessibilityRole === 'checkbox');
  buttons[4].props.onPress(); buttons[5].props.onPress(); tree = renderChooser();
  assert.equal(all(tree, n => n.props?.accessibilityRole === 'checkbox' && n.props.accessibilityState.checked).length, 4, 'Batched taps never exceed four choices');
  const saveSelection = all(tree, n => n.type === 'PrimaryButton')[0].props.onPress;
  await Promise.all([saveSelection(), saveSelection()]); tree = renderChooser();
  assert.equal(chooserWrites, 1); assert.equal(chooserCloses, 0); assert.deepEqual(chosen, ['b','c','d','e']);
  assert.ok(all(tree, n => n.props?.accessibilityRole === 'alert').length, 'Failed selection save stays open with feedback');
  cp.onSave = async () => true; tree = renderChooser();
  await all(tree, n => n.type === 'PrimaryButton')[0].props.onPress(); assert.equal(chooserCloses, 1);
  console.log('Access checks passed: central Free/Pro policy, limits, downgrade selection, stale callbacks, atomic restore, unavailable access, saved archive protection/recovery, preserved preferences/history/rewards, translations and native-screen entry guards.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
