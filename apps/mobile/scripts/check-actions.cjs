const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(file, mocks = {}) {
  file = path.resolve(root, file);
  if (!Object.keys(mocks).length && cache.has(file)) return cache.get(file);
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(id => Object.hasOwn(mocks, id) ? mocks[id]
    : id.startsWith('.') ? load(path.resolve(path.dirname(file), id) + '.ts') : require(id), mod, mod.exports);
  if (!Object.keys(mocks).length) cache.set(file, mod.exports);
  return mod.exports;
}
const { applyHabitAction } = load('src/data/habit-actions.ts');
const { emptyDraft, draftFromHabit } = load('src/data/habit-draft.ts');
const { dateFromKey, dateKey, addDays } = load('src/data/habit-calendar.ts');
const { reconcileRewards } = load('src/data/habit-rewards.ts');
const { encodeHabits, decodeHabits, HABIT_STORAGE_KEY } = load('src/data/habit-storage.ts');
const today = dateFromKey('2026-11-07'), day = dateKey(today);
const draft = { ...emptyDraft(), name: 'Practice 🌿', description: 'Keep my words', categories: ['Health'] };
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function act(snapshot, action) {
  const before = JSON.stringify(snapshot);
  const next = applyHabitAction(freeze(snapshot), action, today, { id: 'test-' + (++act.sequence), recordedAt: '2026-11-07T12:00:00.000Z', occurredAt: null, timezone: 'UTC', utcOffsetMinutes: 0 });
  assert.equal(JSON.stringify(snapshot), before, 'Actions must not mutate the previous snapshot');
  assert.deepEqual(decodeHabits(encodeHabits(next)), JSON.parse(JSON.stringify(next)), 'Every action keeps the v1 format readable');
  return next;
}
act.sequence = 0;
function harness() {
  let slots = [], cursor = 0, effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        if (typeof next === 'function') {
          const a = next(slots[i].value), b = next(slots[i].value);
          assert.deepEqual(a, b, 'Updater replay must be deterministic');
          slots[i].value = a;
        } else slots[i].value = next;
      }];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(effect, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; effects.push(() => { slots[i].cleanup = effect(); }); } },
  };
  return { react, render(fn) { cursor = 0; effects = []; const state = fn(today, { status: 'verified', tier: 'pro' }); effects.forEach(effect => effect()); return state; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function check() {
  let state = act({ habits: [], retainedCollections: [] }, { type: 'create', id: 'practice', draft });
  const created = state.habits[0];
  assert.equal(created.createdOn, day);
  assert.equal(created.description, draft.description);
  assert.throws(() => applyHabitAction(state, { type: 'create', id: 'practice', draft }, today), /unique/);
  state = act(state, { type: 'toggle-check-in', id: 'practice', day });
  assert.deepEqual(state.habits[0].checkIns, [day]);
  state = act(state, { type: 'save-note', id: 'practice', day, note: '私のメモ' });
  state = act(state, { type: 'update', id: 'practice', draft: { ...draftFromHabit(state.habits[0]), name: 'Renamed', trackingKind: 'measure', unit: 'km', target: '2.5' } });
  assert.equal(state.habits[0].id, created.id);
  assert.equal(state.habits[0].createdOn, created.createdOn);
  assert.deepEqual(state.habits[0].checkIns, [day]);
  assert.equal(state.habits[0].notes[day], '私のメモ');
  assert.equal(state.habits[0].tracking.target, 2.5);
  state = act(state, { type: 'toggle-check-in', id: 'practice', day });
  assert.deepEqual(state.habits[0].checkIns, [], 'R1 preserves the existing binary tracking behaviour');
  for (const date of [dateKey(addDays(today, -1)), dateKey(addDays(today, 1))]) {
    assert.equal(act(state, { type: 'toggle-check-in', id: 'practice', day: date }), state, 'Before-creation/future dates cannot be toggled');
  }
  const restricted = { ...state, habits: [{ ...state.habits[0], repeatDays: [0], entries: undefined, configurationHistory: undefined }] };
  assert.equal(act(restricted, { type: 'toggle-check-in', id: 'practice', day }), restricted, 'Unscheduled dates cannot be toggled');
  assert.equal(act(state, { type: 'toggle-check-in', id: 'missing', day }), state);
  state = act(state, { type: 'archive', id: 'practice' });
  assert.equal(state.habits[0].archivedOn, day);
  state = act(state, { type: 'restore', id: 'practice' });
  assert.equal(state.habits[0].archived, false);
  assert.equal(state.habits[0].archivedOn, undefined);
  assert.equal(state.habits[0].notes[day], '私のメモ');
  state = act(state, { type: 'save-note', id: 'practice', day, note: '' });
  assert.equal(Object.hasOwn(state.habits[0].notes, day), false);
  state = act(state, { type: 'create', id: 'second', draft });
  state = act(state, { type: 'create', id: 'archived', draft });
  state = act(state, { type: 'archive', id: 'archived' });
  state = act(state, { type: 'move', id: 'practice', direction: -1 });
  assert.deepEqual(state.habits.map(h => h.id), ['archived', 'practice', 'second']);
  state = act(state, { type: 'move-to', id: 'second', targetId: 'practice' });
  assert.deepEqual(state.habits.map(h => h.id), ['archived', 'second', 'practice']);
  state = act(state, { type: 'restore-all' });
  assert.ok(state.habits.every(h => !h.archived));

  const champion = reconcileRewards({ ...created, createdOn: undefined, checkIns: Array.from({ length: 90 }, (_, i) => dateKey(addDays(today, -i))) }, today);
  state = { habits: [champion], retainedCollections: [] };
  state = act(state, { type: 'select-wallpaper', id: 'practice', days: 90, edition: 'landscape' });
  assert.equal(state.habits[0].rewards.selectedWallpaper, 90);
  state = act(state, { type: 'toggle-check-in', id: 'practice', day });
  assert.equal(state.habits[0].rewards.badges.length, 1, 'Undo preserves earned awards');
  state = act(state, { type: 'start-next-cycle', id: 'practice' });
  assert.equal(state.habits[0].rewards.cycle, 2);
  assert.equal(state.habits[0].rewards.cycleStartsOn, dateKey(addDays(today, 1)));
  assert.equal(act(state, { type: 'start-next-cycle', id: 'practice' }), state, 'Cannot start another cycle without earning its badge');
  const { id, name, icon, color, rewards } = champion;
  state = { habits: [], retainedCollections: [{ id, name, icon, color, rewards }] };
  state = act(state, { type: 'select-wallpaper', id, days: 7, edition: 'quote' });
  assert.equal(state.retainedCollections[0].rewards.selectedWallpaper, 7);
  assert.throws(() => applyHabitAction(state, { type: 'create', id, draft }, today), /unique/, 'Retained collection IDs cannot be overwritten');
  const unearned = { habits: [created], retainedCollections: [] };
  assert.equal(act(unearned, { type: 'select-wallpaper', id: created.id, days: 7, edition: 'landscape' }), unearned);

  let raw = null, writes = 0, fail = false, releaseLoad;
  const driver = { getItem: key => key === '@habit-tracker/state/v1' ? Promise.resolve(null) : new Promise(resolve => { releaseLoad = () => resolve(raw); }), setItem: async (key, value) => {
    assert.equal(key, HABIT_STORAGE_KEY); writes++; if (fail) throw Error('Storage full'); raw = value;
  } };
  function mount(storage) {
    const h = harness();
    const hook = load('src/hooks/use-habit-store.ts', { react: h.react, '@react-native-async-storage/async-storage': storage }).default;
    return () => h.render(hook);
  }
  let render = mount(driver), store = render();
  assert.equal(store.hydrated, false);
  assert.equal('setHabits' in store, false, 'Screens do not receive a general state updater');
  store.actions.createHabit(draft);
  assert.equal(render().habits.length, 0, 'Actions cannot overwrite unhydrated history');
  assert.equal(writes, 0);
  await tick(); releaseLoad(); await tick(); store = render(); await tick(); store = render();
  assert.equal(store.habits.length, 0, 'New installs start without generated habits');
  await store.actions.createHabit(draft); store = render();
  await store.actions.toggleCheckIn(store.habits[0].id, day); store = render();
  const savedWrites = writes;
  render(); render(); await tick();
  assert.equal(writes, savedWrites, 'Rendering/navigation without an action does not save entries');
  const existingId = store.habits[0].id;
  fail = true;
  store.actions.saveNote(existingId, day, 'Pending note');
  store.actions.toggleCheckIn(existingId, day);
  store = render(); await tick(); store = render();
  assert.equal(store.habits[0].notes[day], 'Pending note');
  assert.equal(store.habits[0].checkIns.includes(day), false, 'Queued actions use the latest snapshot');
  assert.equal(store.storageError, 'save');
  fail = false; store.retryStorage(); await tick(); store = render();
  assert.equal(store.storageError, null);
  assert.equal(decodeHabits(raw).habits[0].notes[day], 'Pending note');
  assert.equal(JSON.parse(raw).version, 2);
  render = mount({ ...driver, getItem: async () => raw }); render(); await tick(); store = render();
  assert.equal(store.habits[0].notes[day], 'Pending note', 'Actions survive a store remount');
  const loadedCount = store.habits.length;
  store.actions.createHabit(draft); store.actions.createHabit(draft);
  store = render();
  assert.equal(store.habits.length, loadedCount + 2);
  assert.equal(new Set(store.habits.map(h => h.id)).size, store.habits.length, 'IDs are generated once per action outside replayed updaters');
  await tick();
  let corruptWrites = 0;
  render = mount({ getItem: async () => '{bad', setItem: async () => { corruptWrites++; } }); render(); await tick(); store = render();
  assert.equal(store.storageError, 'load');
  store.actions.restoreAll(); render(); await tick();
  assert.equal(corruptWrites, 0, 'Corrupt stored history is never replaced with an empty action result');
  console.log('Action/store checks passed: immutable transitions, all named actions, storage round-trips, scheduling guards, notes/awards/archives/order, updater replay, hydration protection, no-op renders, queued actions, save retry and reload.');
}
module.exports = { load, harness, tick };
if (require.main === module) check().catch(error => { console.error(error); process.exitCode = 1; });
