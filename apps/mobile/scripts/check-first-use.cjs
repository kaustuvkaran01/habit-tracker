const assert = require('node:assert/strict');
const { load, harness, tick } = require('./check-actions.cjs');
const { FIRST_USE_KEY, createFirstUsePersistence, homeEmptyState, hasRecordedProgress } = load('src/data/first-use.ts');
const { HABIT_STORAGE_KEY, decodeHabits } = load('src/data/habit-storage.ts');
const { habitFromDraft, emptyDraft } = load('src/data/habit-draft.ts');
const { dateFromKey } = load('src/data/habit-calendar.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const { FREE_ACCESS } = load('src/data/pro-access.ts');
const { createTranslator } = load('src/i18n/locale.ts');
const today = dateFromKey('2026-11-08'), day = '2026-11-08';
const draft = { ...emptyDraft(), name: 'My real habit', description: 'Keep this exactly' };
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
function welcomeFixture({ raw = null, existing = false, readError = false, writeError = false } = {}) {
  let hydrated = false, reads = 0, writes = 0;
  const h = harness();
  const driver = { getItem: async key => { assert.equal(key, FIRST_USE_KEY); reads++; if (readError) throw Error('Read failed'); return raw; },
    setItem: async (key, value) => { assert.equal(key, FIRST_USE_KEY); writes++; if (writeError) throw Error('Write failed'); raw = value; } };
  const hook = load('src/hooks/use-first-use.ts', { react: h.react, '@react-native-async-storage/async-storage': driver }).default;
  return { render: () => h.render(() => hook(hydrated, existing)), enable() { hydrated = true; },
    get raw() { return raw; }, get reads() { return reads; }, get writes() { return writes; },
    allowRead() { readError = false; }, allowWrite() { writeError = false; } };
}
async function check() {
  const persistence = createFirstUsePersistence({ getItem: async () => '{bad', setItem: async () => { throw Error('Must not overwrite unreadable preferences'); } });
  await assert.rejects(persistence.completed());
  for (const raw of ['false', '{}', '{"version":1,"completed":false}', '{"version":2,"completed":true}']) {
    await assert.rejects(createFirstUsePersistence({ getItem: async () => raw, setItem: async () => {} }).completed());
  }
  let f = welcomeFixture();
  assert.equal(f.render().status, 'loading'); await tick(); assert.equal(f.reads, 0, 'Wait for habit hydration before deciding whether this is a new installation');
  f.enable(); f.render(); await tick(); let welcome = f.render();
  assert.equal(welcome.status, 'welcome');
  const finishes = await Promise.all([welcome.finish(), welcome.finish()]);
  assert.deepEqual(finishes, [true, false]); assert.equal(f.writes, 1); assert.equal(f.render().status, 'ready');
  const completedRaw = f.raw;
  f = welcomeFixture({ raw: completedRaw }); f.enable(); f.render(); await tick();
  assert.equal(f.render().status, 'ready', 'A completed or skipped welcome stays dismissed even with an empty tracker');
  assert.equal(f.writes, 0);
  f = welcomeFixture({ existing: true }); f.enable(); f.render(); await tick();
  assert.equal(f.render().status, 'ready', 'Existing history bypasses the welcome'); assert.equal(f.writes, 1);
  f = welcomeFixture({ writeError: true }); f.enable(); f.render(); await tick(); welcome = f.render();
  assert.equal(await welcome.finish(), false); welcome = f.render();
  assert.equal(welcome.status, 'welcome'); assert.equal(welcome.error, 'save'); assert.equal(welcome.saving, false);
  f.allowWrite(); assert.equal(await welcome.finish(), true); assert.equal(f.render().status, 'ready');
  f = welcomeFixture({ readError: true }); f.enable(); f.render(); await tick(); welcome = f.render();
  assert.equal(welcome.status, 'error'); assert.equal(f.writes, 0);
  f.allowRead(); welcome.retry(); f.render(); await tick(); assert.equal(f.render().status, 'welcome');
  f = welcomeFixture({ raw: '{bad' }); f.enable(); f.render(); await tick(); welcome = f.render();
  assert.equal(welcome.status, 'error'); welcome.continueForSession();
  assert.equal(f.render().status, 'ready'); assert.equal(f.writes, 0, 'Continue for now never overwrites unreadable settings');
  f = welcomeFixture({ existing: true, writeError: true }); f.enable(); f.render(); await tick();
  assert.equal(f.render().status, 'error'); f.render().continueForSession(); assert.equal(f.render().status, 'ready');

  // Fresh install -> real habit -> first log -> correction -> archive -> restore
  // -> reload, with no sample history or accidental onboarding-state writes.
  const values = new Map();
  const driver = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) };
  function mountStore() {
    const h = harness();
    const hook = load('src/hooks/use-habit-store.ts', { react: h.react, '@react-native-async-storage/async-storage': driver }).default;
    return () => h.render(() => hook(today, FREE_ACCESS));
  }
  let render = mountStore(); render(); await tick(); let store = render(); await tick();
  assert.equal(store.habits.length, 0); assert.equal(homeEmptyState(store.habits, [], today), 'first');
  assert.equal(values.has(FIRST_USE_KEY), false);
  assert.equal(await store.actions.createHabit(draft), true); store = render();
  const id = store.habits[0].id;
  assert.equal(store.habits[0].description, draft.description); assert.equal(hasRecordedProgress(store.habits), false);
  await store.actions.toggleCheckIn(id, day); store = render();
  assert.equal(hasRecordedProgress(store.habits), true); assert.deepEqual(store.habits[0].checkIns, [day]);
  assert.equal(homeEmptyState(store.habits, [], today), 'complete');
  assert.equal(homeEmptyState(store.habits, [], today, true), 'filtered', 'Search/category emptiness does not get mistaken for completion');
  await store.actions.recordDay(id, day, { kind: 'yes-no', complete: false }, 'Correction'); store = render();
  assert.equal(homeEmptyState(store.habits, [], today), 'filtered');
  assert.equal(store.habits[0].notes[day], 'Correction');
  await store.actions.archiveHabit(id); store = render(); assert.equal(homeEmptyState(store.habits, [], today), 'archived');
  await store.actions.restoreHabit(id); store = render(); assert.equal(store.habits[0].notes[day], 'Correction');
  const history = decodeHabits(values.get(HABIT_STORAGE_KEY));
  render = mountStore(); render(); await tick(); store = render();
  assert.deepEqual(store.habits, history.habits, 'Startup preserves saved habits, notes and entries');
  assert.equal(homeEmptyState(store.habits, store.habits, today), null);
  const quit = habitFromDraft({ ...draft, trackingKind: 'count', habitType: 'quit', target: '0' }, today, 'quit');
  assert.equal(homeEmptyState([quit], [], today), 'filtered', 'Unlogged Quit days are never congratulated');
  const rest = { ...quit, repeatDays: [0] };
  assert.equal(homeEmptyState([rest], [], today), 'filtered', 'Rest days are not claimed as completed days');
  await store.actions.createHabit({ ...draft, trackingKind: 'count', habitType: 'quit', target: '0' }); store = render();
  const quitId = store.habits[0].id;
  await store.actions.recordDay(quitId, day, { kind: 'amount', amount: 0 }); store = render();
  assert.equal(hasRecordedProgress([store.habits[0]]), true, 'An explicit zero is a genuine first entry');
  assert.equal(homeEmptyState([store.habits[0]], [], today), 'complete', 'Quit success is recognized after an explicit zero report');

  let releaseWelcome, lateWrites = 0;
  const lh = harness();
  const lateHook = load('src/hooks/use-first-use.ts', { react: lh.react, '@react-native-async-storage/async-storage': {
    getItem: async () => new Promise(resolve => { releaseWelcome = resolve; }), setItem: async () => { lateWrites++; },
  } }).default;
  let late = lh.render(() => lateHook(true, false)); await tick();
  late.continueForSession(); releaseWelcome(null); await tick(); late = lh.render(() => lateHook(true, false));
  assert.equal(late.status, 'ready'); assert.equal(lateWrites, 0, 'A late welcome read cannot undo the explicit session bypass');

  const native = { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Modal: 'Modal', StyleSheet: { create: s => s, hairlineWidth: 1 }, Platform: { OS: 'ios' }, Switch: 'Switch', Alert: { alert() {} } };
  const theme = { useTheme: () => ({ colors: {}, mode: 'dark', choice: 'Dark', setChoice() {} }), createThemedStyles: f => () => f({}), accentForeground: c => c };
  const locale = { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) };
  let continued = 0, skipped = 0;
  const Onboarding = load('src/screens/onboarding-screen.tsx', { 'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 47, bottom: 34 }) },
    '../components/app-icon': 'AppIcon', '../components/haptic-pressable': 'Pressable', '../components/preference-ui': { PrimaryButton: 'PrimaryButton' }, '../components/theme': theme, '../i18n/context': locale }).default;
  let tree = Onboarding({ firstLaunch: true, onContinue: () => continued++, onSkip: () => skipped++ });
  all(tree, n => n.type === 'PrimaryButton')[0].props.onPress(); all(tree, n => n.type === 'Pressable')[0].props.onPress();
  assert.equal(continued, 1); assert.equal(skipped, 1); assert.equal(tree.props.style[1].paddingTop, 47);
  tree = Onboarding({ firstLaunch: true, saving: true, onContinue() {}, onSkip() {} });
  assert.ok(all(tree, n => n.type === 'PrimaryButton' || n.type === 'Pressable').every(n => n.props.disabled), 'Both welcome actions lock during persistence');
  tree = Onboarding({ onContinue() {} }); assert.equal(all(tree, n => n.type === 'Pressable').length, 0, 'Settings replay does not change first-use completion');

  const sh = harness();
  const pageModule = load('src/screens/settings-page-content.tsx', { 'react-native': native, '../components/theme': theme, '../i18n/context': locale,
    '../components/haptic-pressable': 'Pressable', '../components/habit-ui': { HabitIcon: 'HabitIcon' }, '../components/app-icon': 'AppIcon',
    '../components/preference-ui': { usePreferenceStyles: () => ({}), PreferenceIcon: 'PreferenceIcon' },
    './backup-screen': 'BackupScreen', './settings-guide-screen': 'Guide', './privacy-support-screen': 'PrivacySupport', './settings-preferences-screen': 'Preferences',
  });
  const Settings = load('src/screens/settings-screen.tsx', { '../components/reminder-status': 'ReminderStatus', './settings-page-content': pageModule, react: sh.react, 'react-native': native,
    '../components/private-modal': 'Modal',
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) }, '../../app.json': { expo: { version: 'test' } },
    '../components/haptic-pressable': 'Pressable', '../components/habit-ui': { Chevron: 'Chevron', HabitIcon: 'HabitIcon' },
    '../components/preference-ui': { usePreferenceStyles: () => ({}), PrimaryButton: 'PrimaryButton', PreferenceIcon: 'PreferenceIcon', ProMark: 'ProMark', SheetHeader: 'SheetHeader' },
    './daily-reminder-drawer': { DailyReminderSheet: 'Reminders' },
    '../components/app-preferences': { useAppPreferences: () => ({ preferences: DEFAULT_PREFERENCES, update() {} }) },
    '../components/pro-access': { useProAccess: () => FREE_ACCESS }, '../components/pro-upgrade': { useProUpgrade: () => ({ request: () => false, sheet: null }) },
    '../components/wallpaper-preview': 'WallpaperPreview', '../components/app-icon': 'AppIcon', '../components/right-drawer': 'RightDrawer', './onboarding-screen': 'Onboarding',
    '../hooks/use-haptics-preference': () => ({ enabled: true, setEnabled() {} }), '../components/theme': theme, '../i18n/context': locale,
  }).default;
  const sp = { visible: true, habits: history.habits, today, onClose() {}, onDismiss() {}, onOpenPro() {}, onOpenWallpapers() {}, onRestore() {}, onMove() {} };
  const renderSettings = () => sh.render(() => Settings(sp)); tree = renderSettings();
  const pageContent = () => all(tree, n => n.type === pageModule.default)[0];
  const currentRoute = () => pageModule.default(pageContent().props);
  const groups = all(tree, n => Array.isArray(n.props?.rows));
  const rows = groups.flatMap(n => n.props.rows);
  assert.ok(rows.every(row => row.onPress || row.toggle), 'Every visible Settings row has real behaviour');
  assert.ok(!rows.some(row => ['Website','Follow On X','Rate The App','Send Feedback','Terms Of Service'].includes(row.label)), 'Unconfigured destinations are absent');
  for (const label of ['Privacy Policy', 'Support']) {
    rows.find(row => row.label === label).onPress(); tree = renderSettings();
    assert.equal(currentRoute().props.page, label === 'Support' ? 'support' : 'privacy');
    assert.equal(all(tree, n => n.type === 'RightDrawer')[0].props.visible, true);
    all(tree, n => n.type === 'RightDrawer')[0].props.onRequestClose(); tree = renderSettings();
    assert.equal(all(tree, n => n.type === 'RightDrawer')[0].props.visible, false, 'Privacy and Support keep back/swipe navigation');
    assert.equal(currentRoute().props.page, label === 'Support' ? 'support' : 'privacy', 'Closing retains the page until drawer dismissal finishes');
  }
  assert.equal(rows.find(row => row.label === 'Daily Check-In Reminders').value, 'Off');
  assert.equal(typeof rows.find(row => row.label === 'Backup & Restore').onPress, 'function');
  rows.find(row => row.label === 'Quick guide').onPress(); tree = renderSettings();
  assert.equal(all(tree, n => n.type === 'RightDrawer')[0].props.visible, true);
  assert.equal(currentRoute().type, 'Guide');
  all(tree, n => n.type === 'RightDrawer')[0].props.onRequestClose(); tree = renderSettings();
  assert.equal(all(tree, n => n.type === 'RightDrawer')[0].props.visible, false, 'Guide keeps the shared back/swipe drawer');
  sp.initialPage = 'archived'; renderSettings(); tree = renderSettings();
  assert.equal(all(tree, n => n.type === 'RightDrawer')[0].props.visible, true, 'Archived empty state can deep-link to its recovery screen');
  let retries = 0; sp.saveError = true; sp.onRetrySave = async () => { retries++; return true; }; tree = renderSettings();
  const recovery = all(all(tree, n => n.type === 'RightDrawer')[0], n => n.type === 'PrimaryButton' && n.props.children === 'Retry saving');
  assert.equal(recovery.length, 1); await recovery[0].props.onPress(); assert.equal(retries, 1, 'Archive/reorder errors can be retried inside Settings');
  pageContent().props.onBackupBusyChange(true); tree = renderSettings();
  assert.equal(all(tree, n => n.type === 'Modal')[0].props.allowSwipeDismissal, false);
  all(tree, n => n.type === 'RightDrawer')[0].props.onRequestClose(); tree = renderSettings();
  assert.equal(all(tree, n => n.type === 'RightDrawer')[0].props.visible, true, 'Busy backup blocks submenu dismissal');
  pageContent().props.onBackupBusyChange(false); tree = renderSettings();
  console.log('First-use checks passed: empty installs, durable welcome/skip, existing data, duplicate actions, load/save failures and recovery, session bypass, the first real log/correction/archive/restore/reload, empty-state distinctions, onboarding controls and Settings navigation/audit.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
