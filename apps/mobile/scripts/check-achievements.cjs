const assert = require('node:assert/strict');
const { load, harness, tick } = require('./check-actions.cjs');
const { dateKey, addDays, dateFromKey } = load('src/data/habit-calendar.ts');
const { initializeEntries } = load('src/data/habit-entries.ts');
const { reconcileRewards, startNextRewardCycle, WALLPAPER_MILESTONES } = load('src/data/habit-rewards.ts');
const { applyHabitAction } = load('src/data/habit-actions.ts');
const { enqueueAchievements, acknowledgeAchievements, pendingAchievements, achievementId } = load('src/data/achievement-events.ts');
const { encodeHabits, decodeHabits } = load('src/data/habit-storage.ts');
const { createSampleHabits } = load('src/data/sample-habits.ts');
const { createTranslator } = load('src/i18n/locale.ts');
const today = dateFromKey('2026-11-08'), day = dateKey(today);
const context = { id: 'achievement-test', recordedAt: '2026-11-08T12:00:00.000Z', occurredAt: null, timezone: 'UTC', utcOffsetMinutes: 0 };
function fixture(count, id = 'practice') {
  return reconcileRewards(initializeEntries({ id, name: 'Practice', description: 'Private habit', color: '#2DCCBC', icon: 'pulse', createdOn: dateKey(addDays(today, -count)), notes: { [day]: 'Private note must never be shared' }, checkIns: Array.from({ length: count }, (_, i) => dateKey(addDays(today, -count + i))) }), today);
}
const snapshot = habit => ({ habits: [habit], retainedCollections: [] });
const before = snapshot(fixture(6));
const after = applyHabitAction(before, { type: 'toggle-check-in', id: 'practice', day }, today, context);
assert.equal(pendingAchievements(before).length, 0); assert.equal(pendingAchievements(after).length, 1);
assert.deepEqual(applyHabitAction(before, { type: 'toggle-check-in', id: 'practice', day }, today, context), after, 'React updater replay generates stable, deterministic delivery records');
const award = pendingAchievements(after)[0];
assert.equal(award.event.id, achievementId('practice', 'wallpaper', 1, 7)); assert.equal(award.event.earnedOn, day);
assert.equal(award.habit.notes, undefined, 'Presentation payload excludes notes and daily records');
assert.equal(award.habit.entries, undefined);
assert.deepEqual(decodeHabits(encodeHabits(after)), after, 'Entries and pending delivery share one validated storage record');
const claimed = acknowledgeAchievements(after, award.event.id);
assert.equal(pendingAchievements(claimed).length, 0); assert.equal(claimed.habits[0].rewards.delivery.handled[0], award.event.id);
assert.equal(acknowledgeAchievements(claimed, award.event.id), claimed, 'Delivery claims are idempotent');
const undo = applyHabitAction(claimed, { type: 'toggle-check-in', id: 'practice', day }, today, { ...context, id: 'undo' });
const redo = applyHabitAction(undo, { type: 'toggle-check-in', id: 'practice', day }, today, { ...context, id: 'redo' });
assert.equal(pendingAchievements(redo).length, 0, 'Undo/redo does not farm a reveal');
const otherBefore = { habits: [...before.habits, fixture(6, 'other')], retainedCollections: [] };
const other = applyHabitAction(otherBefore, { type: 'toggle-check-in', id: 'other', day }, today, context);
assert.equal(pendingAchievements(other)[0].habit.id, 'other', 'Another habit can celebrate its own first milestone');
for (const milestone of WALLPAPER_MILESTONES) {
  let multiple = { habits: ['workout', 'habit-2', 'reading', 'water', 'meditation'].map(id => fixture(milestone - 1, id)), retainedCollections: [] };
  for (const habit of multiple.habits) multiple = applyHabitAction(multiple, { type: 'toggle-check-in', id: habit.id, day }, today, { ...context, id: `${habit.id}:${milestone}` });
  const wallpapers = pendingAchievements(decodeHabits(encodeHabits(multiple))).filter(item => item.event.kind === 'wallpaper');
  assert.deepEqual(new Set(wallpapers.map(item => item.habit.id)), new Set(multiple.habits.map(item => item.id)), `Every personal habit queues its own ${milestone}-day wallpaper, including the former demo names`);
  assert.ok(wallpapers.every(item => item.event.days === milestone));
}
const ninety = applyHabitAction(snapshot(fixture(89)), { type: 'toggle-check-in', id: 'practice', day }, today, context);
assert.deepEqual(pendingAchievements(ninety).map(x => x.event.kind), ['wallpaper', 'badge'], 'Queue the 90-day wallpaper followed by the new badge');
assert.equal(pendingAchievements(acknowledgeAchievements(ninety)).length, 0, 'Quick dismissal consumes the remaining queue');
const cycle2 = startNextRewardCycle(ninety.habits[0], today);
const cycle2End = addDays(today, 90);
let later = initializeEntries({ ...cycle2, entries: undefined, configurationHistory: undefined, checkIns: [...cycle2.checkIns, ...Array.from({ length: 90 }, (_, i) => dateKey(addDays(today, i + 1)))] });
later = reconcileRewards(later, cycle2End);
const repeated = enqueueAchievements(snapshot({ ...cycle2, rewards: { ...cycle2.rewards, delivery: undefined } }), snapshot({ ...later, rewards: { ...later.rewards, delivery: undefined } }), context.recordedAt);
assert.deepEqual(pendingAchievements(repeated).map(x => [x.event.kind, x.event.cycle]), [['badge', 2]], 'Repeating wallpapers in another cycle skips their reveal but celebrates the distinct badge');
for (const sample of createSampleHabits(today)) {
  const baseline = snapshot({ ...fixture(6, sample.id), demo: true });
  const result = applyHabitAction(baseline, { type: 'toggle-check-in', id: sample.id, day }, today, context);
  assert.equal(pendingAchievements(result).length, 0, 'Explicit demo data cannot produce personal celebrations');
}
const legacySeed = fixture(6, 'workout'); delete legacySeed.createdOn; legacySeed.demo = undefined;
assert.equal(pendingAchievements(applyHabitAction(snapshot(legacySeed), { type: 'toggle-check-in', id: 'workout', day }, today, context)).length, 0, 'Older seed identities are excluded too');
const migrated = decodeHabits(JSON.stringify({ version: 1, habits: [fixture(90)], retainedCollections: [] }));
assert.equal(pendingAchievements(migrated).length, 0, 'Migration, historical reconciliation and startup do not invent pending reveals');
// Missing an early date splits the run; filling that date can cross several
// historical milestones in a single explicit correction.
let rawBack = fixture(10); delete rawBack.entries[dateKey(addDays(today, -5))]; rawBack.checkIns = rawBack.checkIns.filter(x => x !== dateKey(addDays(today, -5))); rawBack.rewards = undefined;
rawBack = reconcileRewards(rawBack, today);
const back = applyHabitAction(snapshot(rawBack), { type: 'toggle-check-in', id: 'practice', day: dateKey(addDays(today, -5)) }, today, context);
assert.ok(pendingAchievements(back).length >= 1, 'Explicit backdated corrections can earn a reveal');
assert.ok(pendingAchievements(back).every(x => x.event.earnedOn < day && x.event.queuedAt === context.recordedAt));
const archived = { ...after, habits: after.habits.map(h => ({ ...h, archived: true, archivedOn: day })) };
assert.equal(pendingAchievements(archived).length, 0, 'Archived/deleted habits do not interrupt the active screen');
for (const mutate of [
 s => { s.habits[0].rewards.delivery.pending[0].id = 'invalid'; },
 s => { s.habits[0].rewards.delivery.pending[0].cycle = 2; },
 s => { s.habits[0].rewards.delivery.pending[0].earnedOn = '2026-02-31'; },
 s => { s.habits[0].rewards.delivery.pending[0].queuedAt = 'invalid'; },
 s => { s.habits[0].rewards.delivery.pending.push(s.habits[0].rewards.delivery.pending[0]); },
 s => { s.habits[0].rewards.delivery.handled.push(s.habits[0].rewards.delivery.pending[0].id); },
 s => { s.habits[0].rewards.wallpapers = []; },
]) { const data = JSON.parse(JSON.stringify(after)); mutate(data); assert.throws(() => decodeHabits(JSON.stringify({ version: 2, ...data })), 'Reject corrupt or unbacked delivery records'); }

function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
function player(source, options = {}) {
  const h = harness(), calls = [], timings = []; let appListener, motionListener;
  let state = source;
  const props = { habits: state.habits, eligible: options.eligible ?? true, saving: options.saving ?? false, storageError: null,
    onClaim: async id => { calls.push(['claim', id]); state = acknowledgeAchievements(state, id); props.habits = state.habits; return options.fail ? 'failed' : 'claimed'; },
    onDismissAll: async () => { calls.push(['dismiss']); state = acknowledgeAchievements(state); props.habits = state.habits; return true; },
    onRetry: async () => { calls.push(['retry']); return true; }, onSelectWallpaper: (...args) => calls.push(['select', ...args]),
  };
  const Host = load('src/components/achievement-host.tsx', {
    './private-modal': 'Modal',
    './app-privacy': { useAppPrivacyCovered: () => options.covered ?? false },
    react: h.react,
    'react-native': { ActivityIndicator: 'Spinner', Modal: 'Modal', ScrollView: 'ScrollView', Text: 'Text', View: 'View', Platform: { OS: 'ios' }, StyleSheet: { create: x => x }, useWindowDimensions: () => ({ width: 390, height: 844 }),
      AppState: { currentState: 'active', addEventListener: (_event, fn) => { appListener = fn; return { remove() {} }; } },
      AccessibilityInfo: { isReduceMotionEnabled: async () => options.reduced ?? false, addEventListener: (_event, fn) => { motionListener = fn; return { remove() {} }; } },
    },
    'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' }, cancelAnimation() {}, Easing: { out: x => x, cubic: 'cubic' }, ReduceMotion: { System: 'system' },
      useSharedValue: value => h.react.useRef({ value }).current, useAnimatedStyle: factory => factory(), withTiming: (value, config) => { timings.push(config); return value; } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../utils/feedback': { feedback: kind => calls.push(['haptic', kind]) },
    '../i18n/context': { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) }, './collection-art': { ChampionBadgeArt: 'BadgeArt', CollectionWallpaper: 'WallpaperArt', WALLPAPER_TITLES: { 7: 'First Spark', 90: 'The Summit' } },
    './collection-preview': 'CollectionPreview', './haptic-pressable': 'Pressable', './app-icon': 'AppIcon',
    './theme': { useTheme: () => ({ colors: {}, mode: 'dark' }), createThemedStyles: f => () => f({}) },
  }).default;
  return { calls, timings, props, render: () => h.render(() => Host(props)), app: value => appListener(value), motion: value => motionListener(value) };
}
const modal = tree => all(tree, n => n.type === 'Modal')[0];
const press = (tree, text) => all(tree, n => n.type === 'Pressable' && all(n, x => x.type === 'Text' && x.props.children === text).length > 0)[0].props.onPress();
async function check() {
  const privacy = { covered: true }, held = player(after, privacy);
  held.render(); await tick(); held.render(); assert.equal(held.calls.length, 0, 'An Android blur/visual cover holds pending rewards even while AppState remains active');
  privacy.covered = false; held.render(); await tick(); let visibleReward = held.render();
  assert.equal(modal(visibleReward).props.visible, true); modal(visibleReward).props.onShow(); held.render();
  privacy.covered = true; visibleReward = held.render(); assert.equal(modal(visibleReward).props.visible, false);
  privacy.covered = false; visibleReward = held.render(); modal(visibleReward).props.onShow(); held.render();
  assert.equal(held.timings.length, 1, 'Uncovering resumes a revealed reward without duplicate playback');
  // The controller survives moving its native presentation between Home and
  // detail, including a navigation change while a durable claim is in flight.
  let routed = player(other), surface = 'Home', releaseClaim;
  routed.props.children = children => ({ type: surface, props: { children } });
  const claim = routed.props.onClaim;
  routed.props.onClaim = async id => { await new Promise(resolve => { releaseClaim = resolve; }); return claim(id); };
  assert.equal(routed.render().type, 'Home'); await tick(); routed.render();
  surface = 'Detail'; assert.equal(routed.render().type, 'Detail');
  releaseClaim(); await tick(); let routedTree = routed.render();
  assert.equal(modal(routedTree).props.visible, true, 'A claimed reward survives the native-surface handoff');
  modal(routedTree).props.onShow(); routed.render();
  surface = 'Home'; routedTree = routed.render(); modal(routedTree).props.onShow(); routed.render();
  assert.equal(routed.calls.filter(item => item[0] === 'claim').length, 1);
  assert.equal(routed.timings.length, 1, 'Moving the presentation never restarts its reveal');
  assert.ok(all(routedTree, node => node.type === 'Text' && String(node.props.children).includes('Practice')).length);

  let multi = player({ habits: [...after.habits, ...other.habits.filter(habit => habit.id === 'other')], retainedCollections: [] });
  for (const id of ['practice', 'other']) {
    multi.render(); await tick(); multi.render(); await tick(); const screen = multi.render();
    modal(screen).props.onShow(); multi.render();
    assert.equal(multi.calls.filter(item => item[0] === 'claim').at(-1)[1], achievementId(id, 'wallpaper', 1, 7));
    press(multi.render(), 'Continue'); modal(multi.render()).props.onDismiss();
  }
  assert.equal(multi.render(), null);
  assert.equal(multi.timings.length, 2, 'Each habit gets a separate app-wide animation for the same milestone');

  let p = player(after, { eligible: false }); p.render(); await tick(); p.render(); assert.equal(p.calls.length, 0, 'An open editor blocks acquisition before any delivery claim');
  p.props.eligible = true; p.props.saving = true; p.render(); await tick(); p.render(); assert.equal(p.calls.length, 0, 'An unsaved entry cannot reveal');
  p.props.saving = false; p.props.storageError = 'save'; p.render(); await tick(); p.render(); assert.equal(p.calls.length, 0);
  p.props.storageError = null; p.render(); await tick(); let tree = p.render();
  assert.equal(modal(tree).props.visible, true); assert.equal(all(tree, n => n.type === 'AnimatedView')[0].props.style[1].opacity, 0.3, 'Artwork starts in its reveal pose before native presentation'); assert.equal(p.calls.filter(x => x[0] === 'haptic').length, 0, 'Claim finishes before native presentation and haptic');
  modal(tree).props.onShow(); tree = p.render();
  assert.equal(p.calls.filter(x => x[0] === 'haptic').length, 1); assert.equal(p.timings.length, 1);
  assert.ok(all(tree, n => n.type === 'WallpaperArt').length);
  modal(tree).props.onShow(); p.render(); assert.equal(p.timings.length, 1, 'Repeated renders and native callbacks cannot replay motion');
  p.app('background'); tree = p.render(); assert.equal(modal(tree).props.visible, false); modal(tree).props.onDismiss(); p.render();
  p.app('active'); tree = p.render(); modal(tree).props.onShow(); p.render(); assert.equal(p.calls.filter(x => x[0] === 'haptic').length, 1, 'Foregrounding resumes without another reward haptic');
  tree = p.render(); press(tree, 'View wallpaper'); tree = p.render(); assert.equal(modal(tree).props.visible, false);
  assert.equal(all(tree, n => n.type === 'CollectionPreview')[0].props.visible, false, 'Preview waits for the celebration Modal to dismiss');
  modal(tree).props.onDismiss(); tree = p.render(); let preview = all(tree, n => n.type === 'CollectionPreview')[0]; assert.equal(preview.props.visible, true); assert.equal(preview.props.item.days, 7);
  preview.props.onSelectWallpaper(7, 'landscape'); assert.ok(p.calls.some(x => x[0] === 'select' && x[1] === 'practice'));
  preview.props.onClose(); tree = p.render(); preview = all(tree, n => n.type === 'CollectionPreview')[0]; assert.equal(preview.props.visible, false); preview.props.onDismiss(); assert.equal(p.render(), null);

  p = player(ninety); p.render(); await tick(); p.render(); await tick(); tree = p.render(); modal(tree).props.onShow(); tree = p.render(); press(tree, 'Continue'); tree = p.render(); modal(tree).props.onDismiss(); p.render(); await tick(); tree = p.render();
  assert.ok(all(tree, n => n.type === 'BadgeArt').length, 'Continuing advances the queue to the actual cycle badge');
  all(tree, n => n.props?.accessibilityLabel === 'Dismiss celebrations')[0].props.onPress(); tree = p.render(); modal(tree).props.onDismiss(); assert.equal(p.render(), null);

  p = player(after, { reduced: true }); p.render(); await tick(); p.render(); await tick(); tree = p.render(); modal(tree).props.onShow(); p.render(); assert.equal(p.timings.length, 0, 'Reduce Motion shows static earned artwork');
  p = player(after, { fail: true }); p.render(); await tick(); p.render(); await tick(); tree = p.render(); modal(tree).props.onShow(); tree = p.render(); assert.equal(p.timings.length, 0); assert.equal(p.calls.filter(x => x[0] === 'haptic').length, 0, 'Failed delivery writes never celebrate');
  await press(tree, 'Retry saving'); tree = p.render(); assert.equal(p.timings.length, 1, 'A successful retry starts the reveal even when the error Modal was already visible');

  p = player(after, { fail: true }); p.render(); await tick(); p.render(); await tick(); tree = p.render();
  let finishRetry; p.props.onRetry = () => new Promise(resolve => { finishRetry = resolve; }); tree = p.render();
  const retrying = press(tree, 'Retry saving'); tree = p.render();
  all(tree, n => n.props?.accessibilityLabel === 'Dismiss celebrations')[0].props.onPress(); tree = p.render(); modal(tree).props.onDismiss(); assert.equal(p.render(), null, 'A pending retry does not trap the user in the reveal');
  finishRetry(true); await retrying; assert.equal(p.render(), null, 'A late retry cannot reopen a dismissed celebration');

  let raw = encodeHabits(before), fail = false;
  const driver = { getItem: async () => raw, setItem: async (_key, value) => { if (fail) throw Error('Full'); raw = value; } };
  function mount() { const h = harness(); const store = load('src/hooks/use-habit-store.ts', { react: h.react, '@react-native-async-storage/async-storage': driver }).default; return () => h.render(() => store(today, { status: 'verified', tier: 'free' })); }
  let render = mount(); render(); await tick(); let store = render(); await tick();
  fail = true; assert.equal(await store.actions.toggleCheckIn('practice', day), false); store = render();
  assert.equal(pendingAchievements(store).length, 1); assert.equal(pendingAchievements(decodeHabits(raw)).length, 0, 'Failed entry save keeps the reveal pending only in memory');
  fail = false; assert.equal(await store.retryStorage(), true); store = render(); assert.equal(pendingAchievements(decodeHabits(raw)).length, 1, 'Retry persists progress and the event together');
  fail = true; assert.equal(await store.claimAchievement(award.event.id), 'failed'); store = render(); assert.equal(pendingAchievements(decodeHabits(raw)).length, 1);
  fail = false; assert.equal(await store.dismissAchievements(), true); store = render(); assert.equal(pendingAchievements(decodeHabits(raw)).length, 0, 'Dismissing after a failed claim still persists its optimistic delivery state');
  assert.equal(await store.claimAchievement(award.event.id), 'missing', 'An already-consumed identity cannot be claimed again');
  render = mount(); render(); await tick(); store = render(); assert.equal(pendingAchievements(store).length, 0, 'Remount after delivery never replays the reveal');
  console.log('Achievement checks passed: stable events, per-habit firsts, cycle badges, demo/migration exclusion, backdating, validation, durable progress+delivery, failed saves/retry, idempotent claims, modal sequencing, queue advancement, previews, backgrounding and Reduce Motion.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
