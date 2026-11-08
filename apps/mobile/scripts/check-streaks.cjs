const assert = require('node:assert/strict');
const { load } = require('./check-actions.cjs');
const { addDays, calendarDaySpan, dateFromKey, dateKey, streakDays, streakCompletions } = load('src/data/habit-calendar.ts');
const { habitAnalytics } = load('src/data/habit-analytics.ts');
const { collectionProgress, reconcileRewards, startNextRewardCycle } = load('src/data/habit-rewards.ts');
const { currentConfiguration } = load('src/data/habit-entries.ts');
const { sharePresentation, initialShareAppearance } = load('src/data/habit-share.ts');
const { decodeHabits, encodeHabits } = load('src/data/habit-storage.ts');
const make = (extra = {}) => ({ id: 'practice', name: 'Practice', description: '', color: '#2DCCBC', icon: 'pulse', notes: {}, createdOn: '2026-11-01', repeatDays: [0, 4], checkIns: ['2026-11-02', '2026-11-06', '2026-11-09'], ...extra });
const now = dateFromKey('2026-11-09');
const source = make(), before = JSON.stringify(source);
assert.equal(streakDays(source, now), 8, 'Monday → Friday → Monday spans eight inclusive calendar days');
assert.deepEqual(streakCompletions(source, now).map(run => run.days), [1, 5, 8]);
assert.equal(streakDays(source, dateFromKey('2026-11-03')), 1, 'An unconfirmed rest day does not grow the streak');
assert.equal(streakDays(source, dateFromKey('2026-11-06')), 5);
assert.equal(streakDays(source, dateFromKey('2026-11-08')), 5, 'Rest days after Friday wait for Monday');
const waiting = make({ checkIns: ['2026-11-02', '2026-11-06'] });
assert.equal(streakDays(waiting, now), 5, 'Unfinished scheduled today preserves the last confirmed span');
assert.equal(streakDays(waiting, addDays(now, 1)), 0, 'Once scheduled Monday ends without completion the streak breaks');
const missed = make({ checkIns: ['2026-11-02', '2026-11-09'] });
assert.equal(streakDays(missed, now), 1, 'Missing Friday breaks the span between Mondays');
assert.equal(reconcileRewards(missed, now).rewards, undefined, 'Separate one-day runs cannot combine for a wallpaper');
assert.equal(streakDays(make({ checkIns: [...source.checkIns, '2026-11-05', '2026-11-09', '2026-11-13'] }), now), 8, 'Unscheduled, duplicate and future entries add no credit');
assert.equal(streakDays(make({ createdOn: '2026-11-06' }), now), 4, 'Completions before creation cannot start a streak');
const earned = reconcileRewards(source, now);
assert.deepEqual(earned.rewards.wallpapers.map(w => [w.days, w.earnedOn]), [[7, '2026-11-09']], 'The seven-day milestone unlocks at the confirming completion, not on a rest day');
assert.equal(reconcileRewards(earned, now), earned, 'Repeated reconciliation does not duplicate awards');
assert.equal(collectionProgress(earned, now).currentStreak, 8);
const stats = habitAnalytics(source, now, 30);
assert.equal(stats.currentStreak, 8); assert.equal(stats.bestStreak, 8);
assert.equal(habitAnalytics(source, now, 7).bestStreak, 7, 'Period best clips the confirmed calendar span to the period boundary');
assert.equal(stats.completed, 2); assert.equal(stats.scheduled, 2, 'Rest days change streak duration, not scheduled-day completion denominators');
assert.equal(sharePresentation(source, now, { ...initialShareAppearance(source), showStreak: true }).streak, 8);
assert.equal(JSON.stringify(source), before, 'Deriving streaks/rewards does not mutate the input');

function addRecord(habit, day, value) {
  habit.entries ??= {};
  habit.entries[day] = [{ id: day, value, configuration: currentConfiguration(habit), recordedAt: '2026-11-09T12:00:00.000Z', occurredAt: null, timezone: 'UTC', utcOffsetMinutes: 0, source: 'user' }];
}
const failed = make({ entries: {} });
addRecord(failed, '2026-11-02', { kind: 'yes-no', complete: true });
addRecord(failed, '2026-11-06', { kind: 'yes-no', complete: true });
addRecord(failed, '2026-11-09', { kind: 'yes-no', complete: false });
assert.equal(streakDays(failed, now), 0, 'Explicit failure today ends the current streak immediately');
assert.equal(habitAnalytics(failed, now, 30).bestStreak, 5, 'The completed prior span remains the historical best');
assert.equal(reconcileRewards(failed, now).rewards, undefined, 'Failed/cleared authoritative records cannot earn rewards from stale checkIns');
const numeric = make({ entries: {}, tracking: { kind: 'count', target: 3 } });
for (const day of source.checkIns) addRecord(numeric, day, { kind: 'amount', amount: 3 });
assert.equal(streakDays(numeric, now), 8);
addRecord(numeric, '2026-11-06', { kind: 'amount', amount: 2 });
assert.equal(streakDays(numeric, now), 1, 'A partial scheduled goal breaks the calendar streak');
addRecord(numeric, '2026-11-06', { kind: 'clear' }); assert.equal(streakDays(numeric, now), 1);
const quit = make({ entries: {}, habitType: 'quit', tracking: { kind: 'count', target: 0 } });
for (const day of source.checkIns) addRecord(quit, day, { kind: 'amount', amount: 0 });
assert.equal(streakDays(quit, now), 8, 'Explicit zero reports complete zero-limit Quit days');
delete quit.entries['2026-11-06']; assert.equal(streakDays(quit, now), 1, 'Missing Quit reports are not implicit successes');
const changes = make({ repeatDays: [0, 2, 4] });
changes.configurationHistory = [{ effectiveOn: null, configuration: { ...currentConfiguration(changes), repeatDays: [0, 4] } }, { effectiveOn: '2026-11-07', configuration: currentConfiguration(changes) }];
assert.equal(streakDays(changes, now), 8, 'A new Wednesday schedule does not invent missed Wednesdays in the past');
assert.equal(streakDays(changes, dateFromKey('2026-11-12')), 0, 'Missing the new scheduled Wednesday breaks the run');
changes.checkIns.push('2026-11-11'); assert.equal(streakDays(changes, dateFromKey('2026-11-11')), 10);

// Ninety calendar days may land on a rest day. Only the next qualifying
// completion earns the patch, and the next cycle begins with a new anchor.
const begin = dateFromKey('2026-11-02');
const long = make({ checkIns: Array.from({ length: 92 }, (_, i) => addDays(begin, i)).filter(date => [1, 5].includes(date.getDay())).map(dateKey) });
const resting = reconcileRewards(long, addDays(begin, 89));
assert.equal(collectionProgress(resting, addDays(begin, 89)).currentStreak, 89);
assert.equal(resting.rewards.badges.length, 0);
const champion = reconcileRewards(resting, addDays(begin, 91));
assert.equal(champion.rewards.badges.length, 1); assert.equal(champion.rewards.badges[0].earnedOn, dateKey(addDays(begin, 91)));
assert.equal(collectionProgress(champion, addDays(begin, 91)).currentStreak, 92);
const restart = startNextRewardCycle(champion, addDays(begin, 91));
const nextFriday = addDays(begin, 95);
const nextCycle = reconcileRewards({ ...restart, checkIns: [...restart.checkIns, dateKey(nextFriday)] }, nextFriday);
assert.equal(collectionProgress(nextCycle, nextFriday).currentStreak, 1, 'Previous-cycle rest days do not prefill the next cycle');
assert.equal(streakDays(nextCycle, nextFriday), 96, 'Lifetime streak and reward-cycle progress remain separate');
assert.equal(nextCycle.rewards.badges.length, 1);
const corrected = reconcileRewards({ ...champion, checkIns: [] }, addDays(begin, 91));
assert.equal(corrected.rewards.badges.length, 1, 'Earned rewards stay permanent after corrections');
const saved = decodeHabits(encodeHabits({ habits: [champion], retainedCollections: [] }));
assert.equal(streakDays(saved.habits[0], addDays(begin, 91)), 92, 'The new rule survives a storage round-trip without a schema change');

assert.equal(calendarDaySpan('2026-03-06', '2026-03-09'), 4, 'Spring DST crossing counts calendar dates');
assert.equal(calendarDaySpan('2026-10-30', '2026-11-02'), 4, 'Autumn DST crossing counts calendar dates');
assert.equal(calendarDaySpan('2024-02-26', '2024-03-04'), 8, 'Leap day contributes one calendar day');
assert.equal(calendarDaySpan('2026-12-28', '2027-01-04'), 8, 'Year boundary contributes normal calendar days');
for (const first of ['2026-03-06', '2026-10-30', '2024-02-26', '2026-12-28']) {
  const date = dateFromKey(first), d4 = dateKey(addDays(date, 4)), d7 = dateKey(addDays(date, 7));
  const weekDays = [(date.getDay() + 6) % 7, (dateFromKey(d4).getDay() + 6) % 7];
  const item = make({ createdOn: first, repeatDays: weekDays, checkIns: [first, d4, d7] });
  assert.equal(streakDays(item, dateFromKey(d7)), 8);
}
console.log('Calendar streak checks passed: Monday/Friday/Monday = 8, confirmed rest days, overdue/failed/partial/zero entries, dated schedules, historical best and denominators, sharing, reward crossing dates/cycles/permanence, storage, leap years and DST.');
