const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = new Map();
function source(name) {
  const file = path.resolve(__dirname, '../src/data', `${name}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)((id) => id.startsWith('./') ? source(id.slice(2)) : require(id), module, module.exports);
  return module.exports;
}

const { addDays, dateFromKey, dateKey } = source('habit-calendar');
const { WALLPAPER_MILESTONES, collectionProgress, reconcileRewards, rewardsFor, selectWallpaper, startNextRewardCycle } = source('habit-rewards');
const { HABIT_STORAGE_KEY, createHabitPersistence, decodeHabits, encodeHabits } = source('habit-storage');
const { archiveHabit, restoreHabit, archiveDaysLeft, reconcileArchive } = source('habit-archive');
const { badgeDesignForCycle, WALLPAPER_ASPECT_RATIO, WALLPAPER_EXPORT_SIZE, WALLPAPER_SCENES } = source('collection-design');
const start = dateFromKey('2026-01-01');
const habit = (count, extra = {}) => ({ id: 'practice', name: 'Daily practice', description: '', color: '#2DCCBC', icon: 'pulse', notes: {}, checkIns: Array.from({ length: count }, (_, i) => dateKey(addDays(start, i))), ...extra });
const progress = (item, today) => collectionProgress(reconcileRewards(item, today), today);
const snapshot = (...habits) => ({ habits, retainedCollections: [] });

async function check() {
  assert.deepEqual(WALLPAPER_EXPORT_SIZE, { width: 1179, height: 2556 });
  assert.equal(WALLPAPER_ASPECT_RATIO, 1179 / 2556);
  assert.ok(WALLPAPER_MILESTONES.every((days) => WALLPAPER_SCENES[days]), 'Every reward has full-size landscape artwork');
  assert.deepEqual([1, 2, 3, 4, 5].map((cycle) => badgeDesignForCycle(cycle).animal), ['bear', 'boar', 'bison', 'badger', 'wolf']);
  assert.equal(badgeDesignForCycle(6).animal, 'bear');
  assert.equal(badgeDesignForCycle(6).rank, 2, 'New sets have a higher rank');
  for (const milestone of WALLPAPER_MILESTONES) {
    const last = addDays(start, milestone - 1);
    const below = reconcileRewards(habit(milestone - 1), addDays(last, -1));
    assert.ok(!rewardsFor(below).wallpapers.some((entry) => entry.days === milestone), `${milestone} must not unlock early`);
    const earned = reconcileRewards(habit(milestone), last);
    assert.ok(rewardsFor(earned).wallpapers.some((entry) => entry.days === milestone && entry.earnedOn === dateKey(last)));
    assert.equal(reconcileRewards(earned, last), earned, 'Reconciliation must be idempotent');
  }
  assert.equal(progress(habit(7), addDays(start, 6)).currentStreak, 7);
  assert.equal(progress(habit(7), addDays(start, 7)).currentStreak, 7, 'Today is not a miss until the day ends');
  assert.equal(progress(habit(7), addDays(start, 8)).currentStreak, 0);
  assert.ok(progress(habit(7), addDays(start, 8)).collected.has(7), 'A broken streak keeps its reward');

  const separated = habit(14, { checkIns: [...habit(6).checkIns, ...habit(6).checkIns.map((key) => dateKey(addDays(dateFromKey(key), 8)))] });
  assert.equal(progress(separated, addDays(start, 13)).collected.size, 0, 'Separate short runs do not add together');
  const duplicated = habit(6, { checkIns: habit(6).checkIns.flatMap((key) => [key, key]) });
  assert.equal(progress(duplicated, addDays(start, 5)).collected.size, 0, 'Duplicate check-ins count once');
  assert.equal(progress(habit(90), addDays(start, 5)).collected.size, 0, 'Future check-ins do not unlock rewards');
  const createdLater = habit(10, { createdOn: dateKey(addDays(start, 5)) });
  assert.equal(progress(createdLater, addDays(start, 9)).collected.size, 0, 'Check-ins before creation do not count');

  const weekdays = [];
  for (let i = 0; weekdays.length < 10; i++) {
    const date = addDays(start, i);
    if (date.getDay() !== 0 && date.getDay() !== 6) weekdays.push(dateKey(date));
  }
  const weekdayHabit = habit(0, { repeatDays: [0, 1, 2, 3, 4], checkIns: weekdays });
  const weekdayToday = dateFromKey(weekdays.at(-1));
  assert.equal(progress(weekdayHabit, weekdayToday).currentStreak, 14, 'Completed scheduled days credit the intervening calendar days');
  assert.ok(progress(weekdayHabit, weekdayToday).collected.has(10));
  const missedWeekday = { ...weekdayHabit, checkIns: weekdays.filter((_, i) => i !== 4) };
  assert.equal(progress(missedWeekday, weekdayToday).currentStreak, 7);
  assert.ok(progress(missedWeekday, weekdayToday).collected.has(7), 'The new run spans seven calendar days');

  const lastDay = addDays(start, 89);
  const champion = reconcileRewards(habit(90, { notes: { '2026-01-01': 'Keep this private' } }), lastDay);
  assert.equal(champion.rewards.wallpapers.length, 7);
  assert.equal(champion.rewards.badges.length, 1);
  assert.equal(champion.rewards.badges[0].earnedOn, dateKey(lastDay));
  assert.equal(champion.rewards.badges[0].habitName, champion.name);
  assert.equal(reconcileRewards(champion, lastDay).rewards.badges.length, 1, 'No duplicate badge');
  const undo = reconcileRewards({ ...champion, checkIns: [] }, lastDay);
  assert.equal(undo.rewards.badges.length, 1, 'A permanent badge survives historical corrections');
  assert.equal(undo.rewards.wallpapers.length, 7);
  const selected = selectWallpaper(champion, 90);
  assert.equal(selected.rewards.selectedWallpaper, 90);
  const quote = selectWallpaper(champion, 7, 'quote');
  assert.equal(decodeHabits(encodeHabits(snapshot(quote))).habits[0].rewards.selectedWallpaperEdition, 'quote');
  assert.equal(selectWallpaper(champion, 90, 'quote'), champion, 'Only milestones with quote artwork can select that edition');
  const locked = habit(0);
  assert.equal(selectWallpaper(locked, 7), locked, 'A locked wallpaper cannot be equipped');
  assert.equal(startNextRewardCycle(locked, lastDay), locked, 'A new cycle needs a completed 90-day run');

  const restarted = startNextRewardCycle(selected, lastDay);
  assert.equal(restarted.rewards.cycle, 2);
  assert.equal(restarted.rewards.cycleStartsOn, dateKey(addDays(lastDay, 1)));
  assert.deepEqual(restarted.checkIns, champion.checkIns);
  assert.deepEqual(restarted.notes, champion.notes);
  assert.equal(restarted.rewards.badges.length, 1);
  assert.equal(collectionProgress(restarted, lastDay).currentStreak, 0);
  assert.equal(startNextRewardCycle(restarted, lastDay), restarted, 'Repeated reset cannot farm cycles');
  assert.equal(reconcileRewards(restarted, lastDay).rewards.badges.length, 1);
  const tomorrow = addDays(lastDay, 1);
  const oneNewDay = reconcileRewards({ ...restarted, checkIns: [...restarted.checkIns, dateKey(tomorrow)] }, tomorrow);
  assert.equal(collectionProgress(oneNewDay, tomorrow).currentStreak, 1);
  const secondEnd = addDays(tomorrow, 89);
  const twice = reconcileRewards({ ...restarted, checkIns: [...restarted.checkIns, ...Array.from({ length: 90 }, (_, i) => dateKey(addDays(tomorrow, i)))] }, secondEnd);
  assert.equal(twice.rewards.badges.length, 2);
  assert.equal(new Set(twice.rewards.badges.map((badge) => badge.id)).size, 2);
  assert.equal(twice.rewards.wallpapers.length, 14, 'Each cycle keeps its own earning records');
  assert.equal(collectionProgress(twice, secondEnd).collected.size, 7, 'The permanent gallery counts unique wallpapers');

  const renamed = reconcileRewards({ ...twice, name: 'A new habit name', archived: true }, secondEnd);
  assert.equal(renamed.rewards.badges[0].habitName, 'Daily practice', 'An earned badge keeps its original achievement snapshot');
  assert.deepEqual(decodeHabits(encodeHabits(snapshot(renamed))), snapshot(renamed));
  const emojiHabit = habit(0, { icon: 'emoji', emoji: '👩🏽‍💻' });
  assert.deepEqual(decodeHabits(encodeHabits(snapshot(emojiHabit))), snapshot(emojiHabit));
  assert.deepEqual(decodeHabits(encodeHabits(snapshot())), snapshot());
  for (const raw of ['{broken', JSON.stringify({ version: 99, habits: [] }), JSON.stringify({ version: 1, habits: [habit(0), habit(0)] }), JSON.stringify({ version: 1, habits: [habit(0, { checkIns: ['2026-02-31'] })] }), JSON.stringify({ version: 1, habits: [habit(0, { rewards: { cycle: -1, wallpapers: [], badges: [] } })] })]) assert.throws(() => decodeHabits(raw));

  const deletionDay = dateFromKey('2026-03-01');
  const day29 = addDays(deletionDay, 29);
  const day30 = addDays(deletionDay, 30);
  const legacy = decodeHabits(JSON.stringify({ version: 1, habits: [renamed] }));
  const migrated = reconcileArchive(legacy, deletionDay, { status: 'verified', tier: 'free' });
  assert.equal(migrated.habits[0].archivedOn, dateKey(deletionDay));
  const withNote = { ...champion, notes: { '2026-01-01': 'First day' } };
  const archived = archiveHabit(withNote, deletionDay);
  const beforeExpiry = snapshot(archived);
  assert.deepEqual(decodeHabits(encodeHabits(beforeExpiry)), beforeExpiry);
  assert.equal(archiveHabit(archived, day29), archived, 'Repeated deletes do not extend recovery');
  assert.equal(archiveDaysLeft(archived.archivedOn, day29), 1);
  assert.equal(reconcileArchive(beforeExpiry, day29, { status: 'verified', tier: 'free' }), beforeExpiry);
  assert.equal(reconcileArchive(beforeExpiry, day30, { status: 'verified', tier: 'pro' }).habits[0].archiveProtected, true, 'Pro archives have no expiry and persist paid protection');
  const restored = restoreHabit(archived);
  assert.deepEqual(restored, { ...withNote, archived: false });
  assert.equal(archiveHabit(restored, day29).archivedOn, dateKey(day29));
  const expired = reconcileArchive(beforeExpiry, day30, { status: 'verified', tier: 'free' });
  assert.deepEqual(expired.habits, []);
  const [collection] = expired.retainedCollections;
  assert.deepEqual(collection, { id: archived.id, name: archived.name, color: archived.color, icon: archived.icon, rewards: archived.rewards });
  assert.deepEqual(decodeHabits(encodeHabits(expired)), expired);
  assert.equal(collectionProgress(collection, day30).collected.size, 7);
  assert.equal(selectWallpaper(collection, 90).rewards.selectedWallpaper, 90);
  assert.equal(reconcileArchive(expired, day30, { status: 'verified', tier: 'free' }), expired, 'A purge runs only once');
  assert.deepEqual(reconcileArchive(snapshot(archiveHabit(emojiHabit, deletionDay)), day30, { status: 'verified', tier: 'free' }), snapshot());

  let stored = null;
  const writes = [];
  let release;
  const store = createHabitPersistence({ getItem: async () => stored, setItem: async (key, value) => {
    assert.equal(key, HABIT_STORAGE_KEY);
    writes.push(value);
    if (writes.length === 1) await new Promise((resolve) => { release = resolve; });
    stored = value;
  } });
  const first = store.save(snapshot(champion));
  const second = store.save(snapshot(twice));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(writes.length, 1, 'Writes must be serialized');
  release();
  await Promise.all([first, second]);
  assert.deepEqual(await store.load(), decodeHabits(encodeHabits(snapshot(twice))), 'The newest collection survives a reload');

  let attempts = 0;
  const flaky = createHabitPersistence({ getItem: async () => null, setItem: async () => { if (++attempts === 1) throw new Error('Full storage'); } });
  await assert.rejects(flaky.save(snapshot(champion)));
  await flaky.save(snapshot(twice));
  assert.equal(attempts, 2, 'A failed write must not poison later saves');
  const corrupt = createHabitPersistence({ getItem: async () => '{invalid', setItem: async () => { throw new Error('Must never overwrite corrupt data on load'); } });
  await assert.rejects(corrupt.load());
  console.log('Reward and storage checks passed: milestones, streaks, reward cycles, archive migration, restore, free expiry, Pro retention, permanent rewards, validation, serialized saves, reloads and failure recovery.');
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
