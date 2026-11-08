const assert = require('node:assert/strict');
const { load } = require('./check-actions.cjs');
const { selectHomeHabits, homePresentationReady } = load('src/data/home-state.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const { emptyDraft, habitFromDraft } = load('src/data/habit-draft.ts');
const { homeEmptyState } = load('src/data/first-use.ts');
const { dateKey } = load('src/data/habit-calendar.ts');
const today = new Date(2026, 10, 8), day = dateKey(today);
const habit = (id, name, categories, complete = false) => ({ ...habitFromDraft({ ...emptyDraft(), name, categories }, today, id), checkIns: complete ? [day] : [] });
const habits = [habit('workout', 'Morning Workout', ['Health'], true), habit('read', 'Read a Book', ['Study']), habit('water', 'Drink Water', ['Health'], true),
  habit('walk', 'Evening Walk', []), { ...habit('archive', 'Archived Habit', ['Hidden']), archived: true, archivedOn: day }];
const filters = { category: null, onlyIncomplete: false, searchOpen: false, query: '' };
const ids = items => items.map(item => item.id);
const original = JSON.stringify(habits);
let selected = selectHomeHabits(habits, today, DEFAULT_PREFERENCES, filters);
assert.deepEqual(ids(selected.visible), ['workout', 'read', 'water', 'walk']);
assert.deepEqual(selected.categories, ['Health', 'Study']); assert.equal(selected.archivedCount, 1);
assert.deepEqual(ids(selectHomeHabits(habits, today, { ...DEFAULT_PREFERENCES, completedHabits: 'bottom' }, filters).visible), ['read', 'walk', 'workout', 'water'], 'Moving completed habits preserves relative order within both groups');
assert.deepEqual(ids(selectHomeHabits(habits, today, DEFAULT_PREFERENCES, { ...filters, onlyIncomplete: true }).visible), ['read', 'walk']);
assert.deepEqual(ids(selectHomeHabits(habits, today, DEFAULT_PREFERENCES, { ...filters, category: 'Hidden' }).visible), ['workout', 'read', 'water', 'walk'], 'An archive-only/stale category cannot hide every active habit');
assert.deepEqual(ids(selectHomeHabits(habits, today, { ...DEFAULT_PREFERENCES, showSearch: true }, { ...filters, searchOpen: true, query: '  BOOK  ' }).visible), ['read']);
assert.equal(selectHomeHabits([], today, DEFAULT_PREFERENCES, filters).emptyState, 'first');
assert.equal(selectHomeHabits([habits[4]], today, DEFAULT_PREFERENCES, filters).emptyState, 'archived');

// Golden comparison against the pre-extraction UI rules across independent
// filter/control choices, including disabled controls with retained values.
let combinations = 0;
for (const completedHabits of ['in-place', 'bottom', 'hidden']) for (const showCategoryFilter of [false, true]) for (const showSearch of [false, true])
for (const showCompletedFilter of [false, true]) for (const onlyIncomplete of [false, true]) for (const searchOpen of [false, true])
for (const category of [null, 'Health', 'missing']) for (const query of ['', '   ', '  WaL  ', 'nothing']) {
  const preferences = { ...DEFAULT_PREFERENCES, completedHabits, showCategoryFilter, showSearch, showCompletedFilter };
  const f = { category, query, searchOpen, onlyIncomplete };
  const active = habits.filter(h => !h.archived), categories = [...new Set(active.flatMap(h => h.categories ?? []))];
  const policy = showCompletedFilter && onlyIncomplete ? 'hidden' : completedHabits;
  const visible = active.filter(h => (!showCategoryFilter || !category || !categories.includes(category) || h.categories?.includes(category))
    && (!showSearch || !searchOpen || h.name.toLowerCase().includes(query.trim().toLowerCase())) && (policy !== 'hidden' || !h.checkIns.includes(day)));
  if (policy === 'bottom') visible.sort((a, b) => Number(a.checkIns.includes(day)) - Number(b.checkIns.includes(day)));
  const emptyState = homeEmptyState(habits, visible, today, !!((showCategoryFilter && category && categories.includes(category)) || (showSearch && searchOpen && query.trim())));
  selected = selectHomeHabits(habits, today, preferences, f);
  assert.deepEqual(ids(selected.visible), ids(visible)); assert.equal(selected.emptyState, emptyState); combinations++;
}
assert.equal(JSON.stringify(habits), original, 'Selectors never reorder/mutate saved habits');
const ready = { sheetOpen: false, sheetPresented: false, entryPresented: false, detailBusy: false, upgradeOpen: false, habitDetailOpen: false, selectedHabitId: null };
assert.equal(homePresentationReady(ready), true);
for (const blocker of ['sheetOpen', 'sheetPresented', 'entryPresented', 'detailBusy', 'upgradeOpen']) assert.equal(homePresentationReady({ ...ready, [blocker]: true }), false, blocker);
assert.equal(homePresentationReady({ ...ready, selectedHabitId: 'workout', habitDetailOpen: true }), true, 'The active detail surface can present');
assert.equal(homePresentationReady({ ...ready, selectedHabitId: 'workout' }), false, 'Retained detail must finish dismissing before Home presents');
console.log(`Home state checks passed: ${combinations} filter combinations match prior UI behavior; stable ordering, immutable history, empty states and all presentation/dismissal blockers.`);
