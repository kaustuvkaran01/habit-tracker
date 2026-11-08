const assert = require('node:assert/strict');
const { load, harness, tick } = require('./check-actions.cjs');
const { FREE_ACCESS: FREE } = load('src/data/pro-access.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const { emptyDraft, habitFromDraft, draftError, draftFromHabit } = load('src/data/habit-draft.ts');
const { createTranslator } = load('src/i18n/locale.ts');
const { REMINDER_PREFIX, createReminderReconciler, planReminders } = load('src/data/reminder-plan.ts');
const { actionAccessIssue } = load('src/data/pro-access.ts');
function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const now = new Date(2026, 10, 9, 8);
const habit = habitFromDraft({ ...emptyDraft(), name: 'Private', reminderTime: '09:00' }, now, 'personal');
const snapshot = { habits: [habit], retainedCollections: [] };
const translator = createTranslator('en');
const plan = planReminders(snapshot, DEFAULT_PREFERENCES.dailyReminder, FREE, now, translator);
const request = (id = plan.items[0].id, target = plan.items[0].target) => ({ actionIdentifier: 'default', notification: { request: { identifier: id, content: { data: { reminderTarget: target } } } } });

async function check() {
  let state = { status: 'undetermined', granted: false, canAskAgain: true }, systemRequests = 0, channels = 0, clearCalls = 0, listener, handler;
  const pending = new Map();
  const presented = new Map();
  const notifications = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 }, AndroidImportance: { DEFAULT: 3 }, AndroidNotificationVisibility: { PRIVATE: 0 },
    SchedulableTriggerInputTypes: { DATE: 'date' }, DEFAULT_ACTION_IDENTIFIER: 'default',
    getPermissionsAsync: async () => state, requestPermissionsAsync: async () => { systemRequests++; return { status: 'granted', granted: true, canAskAgain: true }; },
    setNotificationChannelAsync: async () => { channels++; }, getAllScheduledNotificationsAsync: async () => [...pending.values()],
    scheduleNotificationAsync: async item => { pending.set(item.identifier, item); return item.identifier; }, cancelScheduledNotificationAsync: async id => pending.delete(id),
    getPresentedNotificationsAsync: async () => [...presented.values()], dismissNotificationAsync: async id => presented.delete(id),
    addNotificationResponseReceivedListener: fn => { listener = fn; return { remove() { listener = null; } }; },
    getLastNotificationResponse: () => request(), clearLastNotificationResponse: () => { clearCalls++; }, setNotificationHandler: value => { handler = value; },
  };
  const adapter = load('src/services/reminder-notifications.ts', { 'expo-notifications': notifications, 'react-native': { Platform: { OS: 'ios' } } });
  assert.equal(await adapter.readReminderPermission(), 'undetermined'); assert.equal(systemRequests, 0, 'Reading permission never prompts');
  assert.deepEqual(await Promise.all([adapter.requestReminderPermission(), adapter.requestReminderPermission()]), ['granted','granted']);
  assert.equal(systemRequests, 1, 'Concurrent requests use one system prompt');
  state = { status: 'denied', granted: false, canAskAgain: false };
  assert.equal(await adapter.requestReminderPermission(), 'denied'); assert.equal(systemRequests, 1, 'Never reprompt when device settings are required');
  state = { status: 'undetermined', granted: false, canAskAgain: true, ios: { status: 3 } };
  assert.equal(await adapter.readReminderPermission(), 'granted', 'Provisional iOS authorization is usable');
  const broken = load('src/services/reminder-notifications.ts', { 'expo-notifications': { ...notifications, getPermissionsAsync: async () => { throw Error('Missing native module'); } }, 'react-native': { Platform: { OS: 'ios' } } });
  assert.equal(await broken.readReminderPermission(), 'unavailable');
  const android = load('src/services/reminder-notifications.ts', { 'expo-notifications': notifications, 'react-native': { Platform: { OS: 'android' } } });
  await android.requestReminderPermission(); await android.nativeReminderQueue.list(); assert.equal(channels, 1, 'Android channel is created once before permission/delivery');
  await adapter.nativeReminderQueue.schedule(plan.items[0]);
  const nativeItem = pending.get(plan.items[0].id);
  assert.equal(nativeItem.trigger.type, 'date'); assert.equal(nativeItem.trigger.delivery, 'bestEffort');
  assert.equal(nativeItem.content.title, 'Habit Tracker');
  assert.equal((await adapter.nativeReminderQueue.list())[0].fingerprint, plan.items[0].fingerprint);
  await adapter.nativeReminderQueue.cancel(plan.items[0].id); assert.equal(pending.size, 0);
  assert.deepEqual(adapter.reminderTarget(request()), plan.items[0].target);
  assert.equal(adapter.reminderTarget(request('foreign-job')), null);
  assert.equal(adapter.reminderTarget(request(undefined, { version: 1, kind: 'habit', day: '2026-02-31', habitId: 'x' })), null);
  assert.equal(adapter.reminderTarget(request(undefined, { version: 1, kind: 'url', day: '2026-11-09', url: 'https://example.com' })), null);
  const targets = [], unsubscribe = adapter.watchReminderResponses(target => targets.push(target));
  listener(request()); assert.equal(targets.length, 1); assert.equal(clearCalls, 1, 'Cold-start and listener callbacks are deduplicated');
  unsubscribe(); assert.equal(listener, null);
  const removePresentation = adapter.configureReminderPresentation();
  assert.equal((await handler.handleNotification(request().notification)).shouldSetBadge, false);
  assert.equal((await handler.handleNotification(request('foreign').notification)).shouldShowBanner, false);
  removePresentation(); assert.equal(handler, null);
  pending.set(plan.items[0].id, nativeItem); pending.set('foreign-job', { identifier: 'foreign-job' });
  presented.set(plan.items[0].id, request().notification); presented.set('foreign-job', request('foreign-job').notification);
  await adapter.clearOwnedReminders();
  assert.deepEqual([...pending.keys()], ['foreign-job'], 'Erase cancels only this app’s pending reminders');
  assert.deepEqual([...presented.keys()], ['foreign-job'], 'Erase dismisses only this app’s presented notifications');
  const clearedOwnResponse = clearCalls;
  notifications.getLastNotificationResponse = () => request('foreign-job');
  await adapter.clearOwnedReminders(); assert.equal(clearCalls, clearedOwnResponse, 'Erase preserves unrelated notification responses');

  // Coordinator: no initial cancellation while permission is still loading,
  // no unsaved snapshot effects, and tap navigation waits for a safe screen.
  let resolvePermission, responseTarget, lifecycle, permission = 'granted', scheduleCalls = 0, listCalls = 0, plans = 0, navigation = 0;
  const queue = new Map();
  let inputPlan = { ...plan, items: plan.items.slice(0, 2) };
  let firstRead = true;
  const fakeService = { configureReminderPresentation: () => () => {}, watchReminderResponses: fn => { responseTarget = fn; return () => {}; },
    readReminderPermission: async () => { if (firstRead) { firstRead = false; return new Promise(resolve => { resolvePermission = resolve; }); } return permission; },
    requestReminderPermission: async () => permission,
    nativeReminderQueue: { list: async () => { listCalls++; return [...queue.values()]; }, cancel: async id => queue.delete(id),
      schedule: async item => { scheduleCalls++; queue.set(item.id, { id: item.id, fingerprint: item.fingerprint }); } },
  };
  const h = harness(), previousInterval = global.setInterval, previousClear = global.clearInterval;
  global.setInterval = () => 1; global.clearInterval = () => {};
  try {
    const Provider = load('src/components/reminders.tsx', { react: { ...h.react, createContext: () => ({ Provider: 'Provider' }) },
      'react-native': { AppState: { currentState: 'active', addEventListener: (_name, fn) => { lifecycle = fn; return { remove() {} }; } }, Linking: { openSettings: async () => {} } },
      '../i18n/context': { useTranslation: () => ({ t: translator, locale: 'en' }) }, './app-preferences': { useAppPreferences: () => ({ persistedPreferences: DEFAULT_PREFERENCES }) },
      './pro-access': { useProAccess: () => FREE }, '../services/reminder-notifications': fakeService,
      '../data/reminder-plan': { createReminderReconciler, planReminders: () => { plans++; return inputPlan; } },
    }).ReminderProvider;
    const props = { snapshot, ready: true, navigationReady: false, onTarget: () => navigation++ };
    const render = () => {
      const stringify = JSON.stringify;
      JSON.stringify = (value, ...args) => {
        assert.ok(!Array.isArray(value) || value[0] !== props.snapshot, 'Rendering reminder status must not serialize the entire habit history/notes');
        return stringify(value, ...args);
      };
      try { return h.render(() => Provider(props)); } finally { JSON.stringify = stringify; }
    };
    let tree = render(); await tick(); assert.equal(tree.props.value.permission, 'loading'); assert.equal(listCalls, 0);
    resolvePermission('granted'); await tick(); render(); await tick(); tree = render();
    assert.equal(scheduleCalls, 2); assert.equal(tree.props.value.queued, 2);
    render(); await tick(); assert.equal(scheduleCalls, 2, 'Unrelated renders never replace jobs');
    const beforeSavedEdit = plans;
    props.snapshot = { ...snapshot, habits: [{ ...habit, notes: { '2026-11-09': 'Private saved note' } }] };
    render(); await tick(); render(); assert.ok(plans > beforeSavedEdit, 'A newly committed snapshot still reconciles');
    assert.equal(scheduleCalls, 2, 'Unchanged notification fingerprints avoid duplicate jobs after saved edits');
    responseTarget(plan.items[0].target); render(); assert.equal(navigation, 0);
    props.navigationReady = true; render(); render(); assert.equal(navigation, 1);
    props.ready = false; inputPlan = { ...inputPlan, items: [] }; render(); await tick(); assert.equal(queue.size, 2, 'Unsaved data cannot cancel reminders');
    props.ready = true; render(); await tick(); render(); assert.equal(queue.size, 0);
    inputPlan = { ...plan, items: plan.items.slice(0, 2) }; lifecycle('active'); await tick(); render(); await tick(); render(); assert.equal(queue.size, 2, 'Foreground refresh replenishes the native queue');
    permission = 'denied'; lifecycle('active'); await tick(); render(); await tick(); tree = render(); assert.equal(queue.size, 0); assert.equal(tree.props.value.permission, 'denied');
    permission = 'unavailable'; lifecycle('active'); await tick(); render(); const before = listCalls; await tick(); render(); assert.equal(listCalls, before, 'Unavailable permission cannot destructively touch the queue');
    assert.ok(plans >= 3);
  } finally { global.setInterval = previousInterval; global.clearInterval = previousClear; }

  // Saved preferences, not optimistic choices, drive scheduling.
  const ph = harness(); let raw = JSON.stringify(DEFAULT_PREFERENCES), fail = true;
  const Prefs = load('src/components/app-preferences.tsx', { react: { ...ph.react, createContext: () => ({ Provider: 'Provider' }) }, 'react-native': { Alert: { alert() {} } },
    './pro-access': { useProAccess: () => FREE }, '@react-native-async-storage/async-storage': { getItem: async () => raw, setItem: async (_key, value) => { if (fail) throw Error('Disk full'); raw = value; } },
  }).AppPreferencesProvider;
  ph.render(() => Prefs({})); await tick(); let context = ph.render(() => Prefs({})).props.value;
  assert.equal(await context.update({ dailyReminder: { ...DEFAULT_PREFERENCES.dailyReminder, enabled: true } }), false);
  context = ph.render(() => Prefs({})).props.value;
  assert.equal(context.preferences.dailyReminder.enabled, true); assert.equal(context.persistedPreferences.dailyReminder.enabled, false);
  fail = false; assert.equal(await context.update({ dailyReminder: { ...DEFAULT_PREFERENCES.dailyReminder, enabled: true } }), true);
  context = ph.render(() => Prefs({})).props.value; assert.equal(context.persistedPreferences.dailyReminder.enabled, true);

  const more = { ...draftFromHabit(habit), extraReminderTimes: ['12:00','18:00'] };
  assert.equal(draftError(more), null); assert.equal(actionAccessIssue(snapshot, { type: 'create', id: 'new', draft: more }, FREE), 'multiple-reminders');
  assert.equal(draftError({ ...more, extraReminderTimes: ['09:00'] }), 'Choose different reminder times.');

  // Drawer keeps drafts after denial/save failure and blocks duplicate saves.
  const dh = harness(); let allowed = false, writes = 0, closes = 0, saveOk = false;
  const native = { View: 'View', Text: 'Text', TextInput: 'TextInput', Switch: 'Switch', StyleSheet: { create: value => value } };
  const Drawer = load('src/screens/daily-reminder-drawer.tsx', { react: dh.react, 'react-native': native, '../components/bottom-drawer': 'BottomDrawer',
    '../components/haptic-pressable': 'Pressable', '../components/app-icon': 'AppIcon', '../components/reminder-status': 'ReminderStatus',
    '../components/reminders': { useReminders: () => ({ requestPermission: async () => allowed }) }, '../utils/feedback': { feedback() {} },
    '../i18n/context': { useTranslation: () => ({ t: translator, locale: 'en' }) }, '../components/theme': { createThemedStyles: f => () => f({}), useTheme: () => ({ colors: {}, mode: 'dark' }) },
  }).default;
  const dp = { initial: { ...DEFAULT_PREFERENCES.dailyReminder, enabled: true }, onSave: async () => { writes++; return saveOk; }, onClose: () => closes++ };
  const renderDrawer = () => dh.render(() => Drawer(dp)); let tree = renderDrawer();
  await all(tree, n => n.type === 'Pressable').at(-1).props.onPress(); assert.equal(writes, 0); assert.equal(closes, 0);
  allowed = true; tree = renderDrawer(); const save = all(tree, n => n.type === 'Pressable').at(-1).props.onPress;
  await Promise.all([save(), save()]); assert.equal(writes, 1); assert.equal(closes, 0);
  tree = renderDrawer(); assert.ok(all(tree, n => n.props?.accessibilityRole === 'alert').length);
  saveOk = true; await all(tree, n => n.type === 'Pressable').at(-1).props.onPress(); assert.equal(closes, 1);
  const fh = harness(); let habitSaves = 0, habitRetries = 0, permissionPrompts = 0, formCloses = 0;
  const Form = load('src/screens/habit-form-screen.tsx', { react: fh.react,
    '../components/private-modal': 'Modal',
    'react-native': { ...native, KeyboardAvoidingView: 'KeyboardAvoidingView', Modal: 'Modal', ScrollView: 'ScrollView', Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, useWindowDimensions: () => ({ fontScale: 1 }) },
    '../components/haptic-pressable': 'Pressable', '../components/habit-color-palette': 'Palette', '../components/app-icon': 'AppIcon', '../components/right-drawer': 'RightDrawer', './habit-icon-screen': 'IconScreen',
    '../components/habit-ui': { HabitIcon: 'HabitIcon', Checkmark: 'Checkmark', Chevron: 'Chevron', RoundButton: 'RoundButton' },
    '../components/reminder-status': 'ReminderStatus', '../components/reminders': { useReminders: () => ({ permission: 'undetermined', requestPermission: async () => { permissionPrompts++; return allowed; } }) },
    '../components/pro-upgrade': { useProUpgrade: () => ({ request: () => false, sheet: null }) },
    '../components/theme': { createThemedStyles: f => () => f({}), useTheme: () => ({ colors: {}, mode: 'dark' }), accentForeground: c => c },
    '../i18n/context': { useTranslation: () => ({ t: translator, locale: 'en' }) }, '../utils/feedback': { feedback() {} },
  }).default;
  const fp = { onClose: () => formCloses++, onSave: async () => { habitSaves++; return false; }, onRetrySave: async () => { habitRetries++; return true; } };
  const renderForm = () => fh.render(() => Form(fp)); tree = renderForm();
  all(tree, n => n.props?.accessibilityLabel === 'Habit name')[0].props.onChangeText('Real reminder'); tree = renderForm();
  all(tree, n => n.props?.accessibilityLabel === 'Reminder, None')[0].props.onPress(); tree = renderForm();
  all(tree, n => n.props?.accessibilityLabel === 'Save a reminder time')[0].props.onValueChange(true); tree = renderForm();
  allowed = false; await all(tree, n => n.props?.accessibilityLabel === 'Save new habit')[0].props.onPress(); tree = renderForm();
  assert.equal(habitSaves, 0); assert.equal(formCloses, 0); assert.equal(permissionPrompts, 1);
  allowed = true; await all(tree, n => n.props?.accessibilityLabel === 'Save new habit')[0].props.onPress(); tree = renderForm();
  assert.equal(habitSaves, 1); assert.equal(formCloses, 0);
  await all(tree, n => n.props?.accessibilityLabel === 'Save new habit')[0].props.onPress();
  assert.equal(habitSaves, 1); assert.equal(habitRetries, 1); assert.equal(formCloses, 1, 'Retry saves the existing result without another permission prompt or duplicate habit');
  assert.equal(permissionPrompts, 2);
  console.log('Notification integration checks passed: permission/quiet authorization/denial, Android channel, native job API, owned tap validation/deduplication, presentation, startup safety, saved-data gating, lifecycle refresh, permission revocation, durable preferences, limits and retained drawer drafts/retry. Physical delivery remains a device check.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
