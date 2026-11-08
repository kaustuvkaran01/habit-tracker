const assert = require('node:assert/strict');
const { load, harness, tick } = require('./check-actions.cjs');
const { encodeBackup, decodeBackup, restoreBackup, backupSummary, BACKUP_MAX_BYTES } = load('src/data/habit-backup.ts');
const { createLocalEraser, ERASE_MARKER_KEY } = load('src/data/local-erasure.ts');
const { encodeHabits, decodeHabits, HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY } = load('src/data/habit-storage.ts');
const { emptyDraft, habitFromDraft } = load('src/data/habit-draft.ts');
const { applyHabitAction } = load('src/data/habit-actions.ts');
const { FREE_ACCESS, loggingHabitIds } = load('src/data/pro-access.ts');
const { dateFromKey, dateKey, addDays } = load('src/data/habit-calendar.ts');
const { reconcileRewards } = load('src/data/habit-rewards.ts');
const { pendingAchievements } = load('src/data/achievement-events.ts');
const { planReminders } = load('src/data/reminder-plan.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const today = dateFromKey('2026-11-08'), day = dateKey(today);
const draft = { ...emptyDraft(), name: 'My habit 🧘', description: 'Keep my words', trackingKind: 'measure', target: '2.5', unit: 'km', reminderTime: '19:00' };
const make = id => habitFromDraft(draft, today, id);
const snapshot = habits => ({ habits, retainedCollections: [] });
const context = { id: 'record', recordedAt: '2026-11-08T12:00:00.000Z', occurredAt: null, timezone: 'Asia/Kolkata', utcOffsetMinutes: -330 };
async function check() {
  let data = applyHabitAction(snapshot([make('personal')]), { type: 'record-day', id: 'personal', day, value: { kind: 'amount', amount: 1.25 }, note: '私のメモ' }, today, context);
  const raw = encodeBackup(data, today), backup = decodeBackup(raw);
  assert.deepEqual(backup.snapshot, JSON.parse(JSON.stringify(data)));
  assert.deepEqual(backupSummary(backup.snapshot), { habits: 1, archived: 0, entries: 1, notes: 1, collections: 0, badges: 0 });
  assert.equal(decodeBackup(encodeHabits(data)).exportedAt, null, 'Raw v2 snapshots remain recoverable');
  const legacy = { version: 1, habits: [{ ...make('legacy'), entries: undefined, configurationHistory: undefined, checkIns: [day] }], retainedCollections: [] };
  const migrated = decodeBackup(JSON.stringify(legacy));
  assert.equal(migrated.snapshot.habits[0].entries[day][0].value.kind, 'legacy-complete', 'v1 completion amounts remain unknown');
  for (const invalid of ['[]', '{bad', JSON.stringify({ format: 'foreign', version: 1 }), JSON.stringify({ ...JSON.parse(raw), version: 999 }),
    JSON.stringify({ version: 2, habits: [make('x'), make('x')] }), JSON.stringify({ version: 2, habits: [{ ...make('x'), notes: { bad: 'no' } }] })]) assert.throws(() => decodeBackup(invalid));
  assert.throws(() => decodeBackup(' '.repeat(BACKUP_MAX_BYTES + 1)), /size/);
  const before = JSON.stringify(data);
  const merged = restoreBackup(data, { ...backup, snapshot: snapshot([{ ...make('personal'), name: 'Old version' }, make('new')]) }, 'add-missing', today, FREE_ACCESS);
  assert.equal(merged.habits.length, 2); assert.equal(merged.habits[0].name, draft.name); assert.equal(JSON.stringify(data), before);
  assert.equal(merged.habits[1].remindersPaused, true);
  assert.equal(planReminders(snapshot([merged.habits[1]]), DEFAULT_PREFERENCES.dailyReminder, FREE_ACCESS, today, x => x).items.length, 0, 'Restore cannot silently enable notifications');
  assert.throws(() => restoreBackup(null, backup, 'add-missing', today, FREE_ACCESS));
  const replaced = restoreBackup(data, { ...backup, snapshot: snapshot(Array.from({ length: 8 }, (_, i) => make(String(i)))) }, 'replace', today, FREE_ACCESS);
  assert.equal(replaced.habits.length, 8); assert.equal(loggingHabitIds(replaced, FREE_ACCESS).length, 4, 'Free imports preserve history but never grant unlimited logging');
  const archived = restoreBackup(null, { ...backup, snapshot: snapshot([{ ...make('archive'), archived: true, archivedOn: '2026-01-01' }]) }, 'replace', today, FREE_ACCESS);
  assert.equal(archived.habits[0].archiveRecoveryOn, day, 'Restored archives get time to recover instead of immediate purging');
  const champion = reconcileRewards({ ...make('champion'), tracking: { kind: 'yes-no' }, createdOn: dateKey(addDays(today, -89)), checkIns: Array.from({ length: 90 }, (_, i) => dateKey(addDays(today, -i))) }, today);
  const collections = { ...snapshot([champion]), retainedCollections: [{ id: 'deleted', name: 'Kept badge', color: champion.color, icon: champion.icon, rewards: champion.rewards }] };
  assert.equal(decodeBackup(encodeBackup(collections, today)).snapshot.retainedCollections.length, 1);
  const unearned = snapshot([{ ...make('award'), tracking: { kind: 'yes-no' }, createdOn: dateKey(addDays(today, -6)), checkIns: Array.from({ length: 6 }, (_, i) => dateKey(addDays(today, -i - 1))) }]);
  const awarded = applyHabitAction(unearned, { type: 'record-day', id: 'award', day, value: { kind: 'yes-no', complete: true } }, today, context);
  assert.equal(pendingAchievements(awarded).length, 1);
  const quiet = restoreBackup(null, decodeBackup(encodeBackup(awarded, today)), 'replace', today, FREE_ACCESS);
  assert.equal(pendingAchievements(quiet).length, 0); assert.ok(quiet.habits[0].rewards.wallpapers.length);
  const large = snapshot(Array.from({ length: 100 }, (_, n) => ({ ...champion, id: 'history-' + n, rewards: undefined, notes: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [dateKey(addDays(today, -i)), 'Note ' + i])) })));
  assert.equal(decodeBackup(encodeBackup(large, today)).snapshot.habits.length, 100);

  // Store commit is pessimistic: failed restore leaves both old UI and disk intact.
  let stored = encodeHabits(data), failed = false;
  const driver = { getItem: async key => key === HABIT_STORAGE_KEY ? stored : null, setItem: async (_key, value) => { if (failed) throw Error('Full disk'); stored = value; } };
  const h = harness(), hook = load('src/hooks/use-habit-store.ts', { react: h.react, '@react-native-async-storage/async-storage': driver }).default;
  const render = () => h.render(() => hook(today, FREE_ACCESS)); render(); await tick(); let store = render(); await tick();
  const diskBefore = stored; failed = true;
  assert.equal(await store.importBackup({ ...backup, snapshot: snapshot([make('replacement')]) }, 'replace'), false);
  assert.equal(stored, diskBefore); assert.equal(render().habits[0].id, 'personal');
  failed = false; assert.equal(await store.importBackup({ ...backup, snapshot: snapshot([make('replacement')]) }, 'replace'), true);
  store = render(); assert.equal(store.habits[0].id, 'replacement'); assert.equal(decodeHabits(stored).habits[0].id, 'replacement');
  await store.prepareForErase(); assert.equal(await store.actions.createHabit(draft), false, 'Quiesced stores cannot resurrect wiped habits');

  // Erasure never clears foreign data and resumes a partial wipe before hydration.
  const keys = [HABIT_STORAGE_KEY, LEGACY_HABIT_STORAGE_KEY, '@habit-tracker/preferences/v1', '@habit-tracker/theme/v1', '@habit-tracker/haptics/v1', '@habit-tracker/onboarding/v1'];
  const values = new Map([...keys.map(key => [key, 'private']), ['another-app', 'keep']]);
  let removed = 0, failRemove = true, nativeClears = 0, fileClears = 0;
  const eraseStorage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value), getAllKeys: async () => [...values.keys()],
    removeItem: async key => { if (key !== ERASE_MARKER_KEY && ++removed === 2 && failRemove) throw Error('Interrupted erase'); values.delete(key); } };
  const eraser = createLocalEraser(eraseStorage, async () => { nativeClears++; }, async () => { fileClears++; });
  await assert.rejects(eraser.erase()); assert.ok(values.has(ERASE_MARKER_KEY)); assert.equal(values.get('another-app'), 'keep');
  failRemove = false;
  const recovered = createLocalEraser(eraseStorage, async () => { nativeClears++; }, async () => { fileClears++; });
  const first = recovered.recover(), second = recovered.recover(); assert.equal(first, second, 'Concurrent startup recovery has one owner'); await first;
  assert.deepEqual([...values], [['another-app','keep']]); assert.equal(nativeClears, 2); assert.equal(fileClears, 2);
  values.set(ERASE_MARKER_KEY, '{bad'); values.set(HABIT_STORAGE_KEY, 'private');
  await assert.rejects(recovered.recover()); assert.equal(values.get(HABIT_STORAGE_KEY), 'private', 'Invalid reset metadata never authorizes automatic erasure');
  await recovered.erase(); assert.deepEqual([...values], [['another-app','keep']]);
  let deletes = 0;
  const noMarker = createLocalEraser({ ...eraseStorage, setItem: async () => { throw Error('Cannot persist intent'); }, removeItem: async () => { deletes++; } }, async () => {}, async () => {});
  await assert.rejects(noMarker.erase()); assert.equal(deletes, 0, 'No destructive cleanup before durable reset intent');
  console.log('Backup/data checks passed: versioned and legacy round-trips, Unicode, notes/amounts/rewards, invalid/large files, merge/replace rules, Free limits, paused reminders, no replayed awards, failed commits, writer freeze and interrupted namespace-only erasure/recovery.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
