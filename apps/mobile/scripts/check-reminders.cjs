const assert = require('node:assert/strict');
const { load, tick } = require('./check-actions.cjs');
const { planReminders, habitReminderTimes, createReminderReconciler, REMINDER_PREFIX } = load('src/data/reminder-plan.ts');
const { FREE_ACCESS: FREE, PRO_ACCESS: PRO } = load('src/data/pro-access.ts');
const { emptyDraft, habitFromDraft } = load('src/data/habit-draft.ts');
const { dateKey } = load('src/data/habit-calendar.ts');
const { applyHabitAction } = load('src/data/habit-actions.ts');
const { encodeHabits, decodeHabits } = load('src/data/habit-storage.ts');
const { DEFAULT_PREFERENCES } = load('src/data/app-preferences.ts');
const now = new Date(2026, 10, 9, 8), day = dateKey(now);
const t = source => source;
const dailyOff = DEFAULT_PREFERENCES.dailyReminder;
const make = (id, overrides = {}) => ({ ...habitFromDraft({ ...emptyDraft(), name: 'Private habit', reminderTime: '09:00' }, now, id), ...overrides, ...('reminderTime' in overrides && !('reminderTimes' in overrides) ? { reminderTimes: overrides.reminderTime ? [overrides.reminderTime] : [] } : {}) });
const snapshot = habits => ({ habits, retainedCollections: [] });
const plan = (habits, access = FREE, daily = dailyOff, time = now) => planReminders(snapshot(habits), daily, access, time, t);
function record(habit, value) {
  return applyHabitAction(snapshot([habit]), { type: 'record-day', id: habit.id, day, value }, now,
    { id: 'entry-' + JSON.stringify(value), recordedAt: now.toISOString(), occurredAt: null, timezone: null, utcOffsetMinutes: now.getTimezoneOffset() }).habits[0];
}
async function check() {
  const habit = make('personal');
  assert.deepEqual(habitReminderTimes(habit), ['09:00'], 'Old single-time records continue working');
  assert.deepEqual(habitReminderTimes({ reminderTime: '09:00', reminderTimes: [] }), [], 'An explicit empty list turns reminders off');
  const simple = plan([habit]);
  assert.equal(simple.items[0].at, new Date(2026, 10, 9, 9).getTime());
  assert.equal(simple.items[0].title, 'Habit Tracker'); assert.equal(simple.items[0].body, 'Time for a check-in.');
  assert.ok(simple.items.every(item => !JSON.stringify(item).includes('Private habit')), 'Discreet jobs contain no habit name or note');
  assert.equal(plan([make('visible', { reminderDiscreet: false })]).items[0].title, 'Private habit');
  assert.equal(new Set(simple.items.map(item => item.id)).size, simple.items.length);
  assert.equal(plan([make('weekly', { repeatDays: [0, 4] })]).items.length, 9, 'Only Monday/Friday opportunities in the 30-day window');
  assert.equal(plan([make('archive', { archived: true })]).items.length, 0);
  assert.equal(plan([make('demo', { demo: true })]).items.length, 0);
  assert.ok(plan([habit], FREE, dailyOff, new Date(2026, 10, 9, 10)).items.every(item => item.target.day !== day), 'Past reminder times are never sent immediately');
  const completed = record(habit, { kind: 'yes-no', complete: true });
  assert.ok(plan([completed]).items.every(item => item.target.day !== day));
  const count = make('count', { tracking: { kind: 'count', target: 3, onTap: 'add-one' } });
  assert.ok(plan([record(count, { kind: 'amount', amount: 2 })]).items.some(item => item.target.day === day), 'Partial goals still receive reminders');
  assert.ok(plan([record(count, { kind: 'amount', amount: 3 })]).items.every(item => item.target.day !== day));
  const quit = make('quit', { habitType: 'quit', tracking: { kind: 'count', target: 0 } });
  assert.ok(plan([quit]).items.some(item => item.target.day === day), 'Unlogged Quit is not presumed successful');
  assert.ok(plan([record(quit, { kind: 'amount', amount: 0 })]).items.every(item => item.target.day !== day));
  assert.ok(plan([record(quit, { kind: 'amount', amount: 1 })]).items.some(item => item.target.day === day));
  const three = make('three', { reminderTimes: ['18:00', '09:00', '12:00'], reminderDiscreet: true });
  assert.equal(plan([three], FREE).items.filter(item => item.target.day === day).length, 1);
  assert.equal(plan([three], PRO).items.filter(item => item.target.day === day).length, 3);
  const many = Array.from({ length: 10 }, (_, i) => make(String(i), { reminderTimes: ['09:00','12:00','18:00'] }));
  const bounded = plan(many, PRO);
  assert.equal(bounded.items.length, 60); assert.equal(bounded.truncated, true);
  assert.ok(bounded.items.every(item => item.at <= bounded.items.at(-1).at));
  assert.ok(bounded.coverageUntil < bounded.items.at(-1).at || bounded.coverageUntil > now.getTime());
  const excluded = plan(many, FREE);
  assert.ok(excluded.items.every(item => ['0','1','2','3'].includes(item.target.habitId)), 'Excess Free habits do not generate reminders');
  const daily = { enabled: true, days: [0], time: '18:00', title: 'Sensitive title', message: 'Sensitive message' };
  const privateReview = plan([], FREE, daily);
  assert.equal(privateReview.items[0].title, 'Habit Tracker'); assert.equal(privateReview.items[0].body, 'Time for your daily check-in.');
  assert.equal(plan([], FREE, { ...daily, discreet: false }).items[0].body, 'Sensitive message');
  const persisted = decodeHabits(encodeHabits(snapshot([three])));
  assert.deepEqual(persisted.habits[0].reminderTimes, three.reminderTimes);
  for (const bad of [['25:00'], ['09:00','09:00'], ['01:00','02:00','03:00','04:00']]) {
    assert.throws(() => encodeHabits(snapshot([make('bad', { reminderTimes: bad })])));
  }

  // Native queue is the source of truth. Never cancel another project's jobs.
  const native = new Map([['someone-else', { id: 'someone-else', fingerprint: null }]]);
  let schedules = 0, cancellations = 0, fail = false;
  const reconciler = createReminderReconciler({ list: async () => [...native.values()], cancel: async id => { cancellations++; native.delete(id); },
    schedule: async item => { if (fail) throw Error('Native queue unavailable'); schedules++; native.set(item.id, { id: item.id, fingerprint: item.fingerprint }); } });
  assert.equal(await reconciler.sync(simple), true); assert.equal(schedules, simple.items.length);
  assert.equal(await reconciler.sync(simple), true); assert.equal(schedules, simple.items.length, 'Reopens and duplicate syncs do not duplicate notifications');
  const edited = plan([make('personal', { reminderTime: '11:00' })]);
  await reconciler.sync(edited); assert.equal(cancellations, simple.items.length);
  assert.ok(native.has('someone-else'));
  await reconciler.sync(plan([])); assert.equal(native.size, 1, 'Archiving/deleting cancels only owned jobs');
  fail = true; await assert.rejects(reconciler.sync(simple)); fail = false;
  await reconciler.sync(simple); assert.equal(native.size, simple.items.length + 1, 'A failed scheduling attempt can be retried');
  const changed = { ...simple, items: simple.items.map(item => ({ ...item, fingerprint: item.fingerprint + '-translated' })) };
  await reconciler.sync(changed); assert.equal([...native.keys()].filter(id => id.startsWith(REMINDER_PREFIX)).length, simple.items.length);
  const first = reconciler.sync(simple), second = reconciler.sync(edited);
  assert.equal(await first, false); assert.equal(await second, true, 'Only the newest queued plan wins');
  await tick();
  assert.deepEqual([...native.values()].filter(item => item.id.startsWith(REMINDER_PREFIX)).map(item => item.id).sort(), edited.items.map(item => item.id).sort());
  const spring = planReminders(snapshot([{ ...habit, reminderTimes: ['02:30'] }]), dailyOff, FREE, new Date(2027, 2, 13, 8), t);
  assert.equal(spring.items.find(item => item.target.day === '2027-03-14').at, new Date(2027, 2, 14, 2, 30).getTime(), 'DST-gap times follow local calendar normalization');
  const autumn = planReminders(snapshot([{ ...habit, reminderTimes: ['01:30'] }]), dailyOff, FREE, new Date(2027, 10, 6, 8), t);
  assert.equal(autumn.items.filter(item => item.target.day === '2027-11-07').length, 1, 'Repeated DST hours produce a single local-day reminder');
  console.log('Reminder planner/queue checks passed: legacy times, weekday schedules, completion/partial/Quit-zero rules, privacy, tier limits, bounded coverage, persistence, native reconciliation, duplicate prevention, stale plans, DST and retry. Physical delivery remains a device check.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
