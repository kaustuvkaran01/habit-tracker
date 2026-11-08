const assert = require('node:assert/strict');
const { load, harness } = require('./check-actions.cjs');
const { habitAnalytics, amountSeriesKey } = load('src/data/habit-analytics.ts');
const { dateFromKey, dateKey, addDays } = load('src/data/habit-calendar.ts');
const { currentConfiguration, initializeEntries } = load('src/data/habit-entries.ts');
const { emptyDraft, habitFromDraft } = load('src/data/habit-draft.ts');
const { createTranslator } = load('src/i18n/locale.ts');
const today = dateFromKey('2026-11-07');
const make = (overrides = {}) => ({ ...habitFromDraft({ ...emptyDraft(), name: 'Walking', trackingKind: 'measure', target: '3', unit: 'km' }, dateFromKey('2026-11-01'), 'walk'), entries: {}, ...overrides });
function record(habit, day, value, configuration = currentConfiguration(habit)) {
  habit.entries[day] = [{ id: day, value, configuration, recordedAt: '2026-11-07T12:00:00.000Z', occurredAt: null, timezone: 'UTC', utcOffsetMinutes: 0, source: 'user' }];
}
const analyze = (habit, range = 7, now = today) => habitAnalytics(habit, now, range);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const numeric = make({ repeatDays: [0, 2, 4] });
record(numeric, '2026-11-02', { kind: 'amount', amount: 3.5 });
record(numeric, '2026-11-04', { kind: 'amount', amount: 1.5 });
record(numeric, '2026-11-06', { kind: 'clear' });
const before = JSON.stringify(numeric), stats = analyze(freeze(numeric));
assert.equal(JSON.stringify(numeric), before, 'Analytics does not mutate any entries or awards');
assert.equal(stats.scheduled, 3); assert.equal(stats.completed, 1); assert.equal(stats.partial, 1); assert.equal(stats.unlogged, 1);
assert.equal(stats.rate, 1 / 3); assert.equal(stats.amountSeries[0].total, 5); assert.equal(stats.amountSeries[0].reported, 2);
assert.equal(stats.today.status, 'unscheduled'); assert.equal(stats.weekdays[0].scheduled, 1); assert.equal(stats.weekdays[1].rate, null);
assert.equal(stats.recovery.opportunities, 1); assert.equal(stats.recovery.recovered, 0, 'No invented recovery after last missed day');

const fresh = make({ createdOn: '2026-11-07' }); record(fresh, '2026-11-07', { kind: 'amount', amount: 3 });
assert.equal(analyze(fresh).scheduled, 0); assert.equal(analyze(fresh).rate, null); assert.equal(analyze(fresh).today.complete, true);
assert.equal(analyze(fresh).amountSeries[0].total, 3, 'Activity includes today while completion denominator excludes today');
const unknown = make({ createdOn: undefined, entries: undefined, checkIns: [] });
assert.equal(analyze(unknown, 365).days.length, 0, 'No invented year of missed days for undated legacy habits');
unknown.checkIns = ['2026-11-05']; const legacy = analyze(initializeEntries(unknown));
assert.equal(legacy.start, '2026-11-05'); assert.equal(legacy.scheduled, 2); assert.equal(legacy.amountSeries[0].total, 0);
assert.equal(legacy.amountSeries[0].unknown, 1); assert.equal(legacy.amountSeries[0].reported, 0, 'Legacy completions cannot imply a reported amount');

const quit = make({ habitType: 'quit', tracking: { kind: 'count', target: 0 } });
record(quit, '2026-11-01', { kind: 'amount', amount: 0 }); record(quit, '2026-11-02', { kind: 'amount', amount: 2 });
const qs = analyze(quit); assert.equal(qs.completed, 1); assert.equal(qs.failed, 1); assert.equal(qs.unlogged, 4);
assert.equal(qs.amountSeries[0].reported, 2); assert.equal(qs.amountSeries[0].total, 2); assert.equal(qs.today.status, 'unlogged');
const mixed = make();
record(mixed, '2026-11-01', { kind: 'amount', amount: 2 }, { ...currentConfiguration(mixed), tracking: { kind: 'measure', target: 2, unit: 'miles' } });
record(mixed, '2026-11-02', { kind: 'amount', amount: 2 });
record(mixed, '2026-11-03', { kind: 'amount', amount: 1 }, { ...currentConfiguration(mixed), habitType: 'quit', tracking: { kind: 'count', target: 1 } });
const ms = analyze(mixed); assert.equal(ms.amountSeries.length, 3); assert.equal(ms.completed, 2);
assert.equal(ms.days[0].configuration.tracking.target, 2, 'Charts retain the recorded target instead of using the current goal');
assert.deepEqual(ms.amountSeries.map(s => s.total), [2, 2, 1], 'Different units, types and directions stay separate');
const changed = make({ configurationHistory: [{ effectiveOn: null, configuration: { ...currentConfiguration(make()), repeatDays: [0] } }, { effectiveOn: '2026-11-04', configuration: currentConfiguration(make()) }] });
assert.equal(analyze(changed).scheduled, 4, 'Unlogged days use the schedule in effect on their date');

const yes = make({ tracking: { kind: 'yes-no' } });
for (const [day, complete] of [['01', false], ['02', true], ['03', false], ['04', true], ['05', true], ['06', true]]) record(yes, `2026-11-${day}`, { kind: 'yes-no', complete });
const ys = analyze(yes); assert.equal(ys.recovery.opportunities, 2); assert.equal(ys.recovery.recovered, 2);
assert.equal(ys.currentStreak, 3); assert.equal(ys.bestStreak, 3); assert.equal(ys.amountSeries.length, 0);
record(yes, '2026-11-07', { kind: 'yes-no', complete: false }); assert.equal(analyze(yes).currentStreak, 0);
assert.equal(analyze({ ...yes, archived: true, archivedOn: '2026-11-04' }).end, '2026-11-04');
assert.equal(analyze({ ...yes, archived: true, archivedOn: '2026-11-04' }).currentStreak, 0);
const long = make({ createdOn: '2026-09-01', tracking: { kind: 'yes-no' } });
for (let d = dateFromKey('2026-10-10'); dateKey(d) < '2026-11-07'; d = addDays(d, 1)) record(long, dateKey(d), { kind: 'yes-no', complete: true });
assert.equal(analyze(long).currentStreak, 28); assert.equal(analyze(long).bestStreak, 6, 'Period best is clipped to the selected window');
assert.equal(analyze(long, 30).bestWeekday, null, 'Ties must not invent a best weekday');
const pattern = make({ createdOn: '2026-10-01', tracking: { kind: 'yes-no' } });
for (let d = dateFromKey('2026-10-01'); dateKey(d) < '2026-11-07'; d = addDays(d, 1)) if (d.getDay() === 1) record(pattern, dateKey(d), { kind: 'yes-no', complete: true });
const ps = analyze(pattern, 30); assert.equal(ps.bestWeekday.weekday, 0); assert.ok(ps.evidence.every(d => d.weekday === 0));
assert.equal(analyze(pattern, 7).bestWeekday, null, 'Small samples remain descriptive totals');
const year = analyze(make({ createdOn: '2023-01-01' }), 365, dateFromKey('2024-03-10'));
assert.equal(year.days.length, 365); assert.equal(new Set(year.days.map(d => d.day)).size, 365); assert.ok(year.days.some(d => d.day === '2024-02-29'));

const { analyticsChart, linePath, plotSegments, targetPath, chartLayout, chartIndexAt } = load('src/data/analytics-chart.ts');
const key = amountSeriesKey({ configuration: currentConfiguration(mixed) });
const numericPoints = analyticsChart(mixed, '2026-11-07', ms.days, ms.historyStart, key);
assert.equal(numericPoints.length, 7, 'Switching units cannot compress calendar spacing');
assert.equal(numericPoints[0].value, null); assert.equal(numericPoints[1].value, 2); assert.equal(numericPoints[2].value, null);
assert.equal(numericPoints[1].target, 3); assert.equal(numericPoints[0].target, null);
const quitPoints = analyticsChart(quit, '2026-11-07', qs.days, qs.historyStart, qs.amountSeries[0].key);
assert.equal(quitPoints[0].value, 0); assert.equal(quitPoints[0].target, 0); assert.equal(quitPoints[2].value, null);
const legacyPoints = analyticsChart(initializeEntries(unknown), '2026-11-07', legacy.days, legacy.historyStart, legacy.amountSeries[0].key);
assert.equal(legacyPoints[0].value, null, 'A legacy completion cannot become a numeric graph point');
const scheduledPoints = analyticsChart(numeric, '2026-11-07', stats.days, stats.historyStart, stats.amountSeries[0].key);
assert.equal(scheduledPoints[0].target, null); assert.equal(scheduledPoints[1].target, 3);
const trend = analyticsChart(numeric, '2026-11-07', stats.days, stats.historyStart, null);
assert.equal(trend[0].value, null); assert.equal(trend[1].value, 100); assert.equal(trend[3].value, 50);
assert.equal(trend[5].window.scheduled, 3); assert.ok(Math.abs(trend[5].value - 100 / 3) < 1e-10); assert.equal(trend[6].value, null, 'Today is absent even when reported');
const beforeWindow = analyticsChart(long, '2026-11-07', analyze(long).days, long.createdOn, null);
assert.equal(beforeWindow[0].window.start, '2026-10-26'); assert.equal(beforeWindow[0].window.scheduled, 7); assert.equal(beforeWindow[0].value, 100, 'First plotted point uses the previous six days outside the selected range');
const newTrend = analyticsChart(fresh, '2026-11-07', analyze(fresh).days, fresh.createdOn, null);
assert.equal(newTrend[0].value, null, 'A new habit has no finished-day trend yet');
assert.deepEqual(analyticsChart(fresh, '2026-11-07', [], fresh.createdOn, null), []);
assert.equal(plotSegments([{ x: 0, y: 1 }, null, { x: 2, y: 3 }, { x: 3, y: 4 }]).length, 2, 'Gaps are separate paths');
assert.equal(linePath([], true), ''); assert.equal(linePath([{ x: 0, y: 0 }], true), 'M 0 0');
assert.equal(linePath([{ x: 0, y: 0 }, { x: 1, y: 2 }], false), 'M 0 0 L 1 2');
assert.ok(targetPath([{ x: 0, y: 2 }, { x: 10, y: 4 }]).includes('H 5 V 4 H 10'), 'Historical goals change as steps, not smoothed targets');
// Numerically inspect every cubic segment: exact end points, monotone values,
// no peaks or negative effort invented between neighbouring observations.
for (const values of [[0, 10, 0, 8, 8, 2], [4, 4, 4], [1, 100, 101, 0], [0, 0.1, 0, 9]]) {
  const points = values.map((y, i) => ({ x: i * i * 11 + i * 3, y }));
  const curves = [...linePath(points, true).matchAll(/C ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+)/g)];
  assert.equal(curves.length, values.length - 1);
  curves.forEach((curve, i) => {
    const [, x1, y1, x2, y2, endX, endY] = curve.map(Number);
    assert.equal(endX, points[i + 1].x); assert.equal(endY, points[i + 1].y);
    for (let step = 0; step <= 100; step++) {
      const t = step / 100, v = (1 - t) ** 3 * points[i].y + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * endY;
      assert.ok(v >= Math.min(values[i], values[i + 1]) - 0.001 && v <= Math.max(values[i], values[i + 1]) + 0.001, 'Smooth path stays between its recorded neighbours');
      assert.ok(x1 >= points[i].x && x2 <= endX);
    }
  });
}
assert.equal(chartIndexAt(-10, 320, 1, 7), 0); assert.equal(chartIndexAt(999, 320, 1, 7), 6); assert.equal(chartIndexAt(120, 320, 1, 0), -1);
assert.equal(chartIndexAt(chartLayout(320, 1).left + chartLayout(320, 1).plotWidth / 2, 320, 1, 7), 3);
assert.ok(chartLayout(320, 2).height > chartLayout(320, 1).height);

function all(node, test) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => all(child, test));
  return [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
}
const text = (tree, label) => all(tree, n => n.type === 'Text' && [n.props.children].flat(Infinity).join('') === label).length > 0;
const h = harness(); let fontScale = 1, closes = 0, mode = 'dark';
const native = { View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: s => s, hairlineWidth: 1 }, useWindowDimensions: () => ({ fontScale }) };
const theme = { useTheme: () => ({ colors: {}, mode }), createThemedStyles: f => () => f({}) };
const Screen = load('src/screens/charts-screen.tsx', {
  '../components/pro-access': { useProAccess: () => ({ status: 'verified', tier: 'pro' }) }, './pro-screen': 'ProScreen',
  react: h.react, 'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
  '../components/haptic-pressable': 'Pressable', '../components/habit-ui': { HabitIcon: 'HabitIcon' }, '../components/app-icon': 'AppIcon', '../components/analytics-line-chart': 'LineChart',
  '../components/preference-ui': { SheetHeader: 'SheetHeader', usePreferenceStyles: () => ({}) }, '../components/theme': theme,
  '../i18n/context': { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) },
}).ChartsContent;
const props = { habits: [mixed, { ...yes, id: 'yes', name: 'Practice' }], today, onClose: () => closes++ };
const render = () => h.render(() => Screen(props)); let tree = render();
let chart = all(tree, n => n.type === 'LineChart')[0]; assert.equal(chart.props.points.length, 7); assert.equal(chart.props.numeric, true); assert.equal(chart.props.smooth, true);
assert.equal(all(tree, n => n.props?.accessibilityLabel === 'Inspect next day')[0].props.disabled, false);
chart.props.onSelect(1); tree = render(); chart = all(tree, n => n.type === 'LineChart')[0]; assert.equal(chart.props.selected, 1); assert.ok(text(tree, '2 km'));
assert.equal(text(tree, 'Weekday patterns'), false, 'Secondary details start collapsed');
all(tree, n => n.props?.accessibilityLabel === 'More details')[0].props.onPress(); tree = render(); assert.ok(text(tree, 'Weekday patterns'));
all(tree, n => n.props?.accessibilityLabel === 'More details')[0].props.onPress(); tree = render(); assert.equal(text(tree, 'Weekday patterns'), false);
all(tree, n => n.props?.accessibilityLabel === 'Smooth graph')[0].props.onPress(); tree = render(); assert.equal(all(tree, n => n.type === 'LineChart')[0].props.smooth, false);
all(tree, n => n.type === 'Pressable' && text(n, '7 days'))[0].props.onPress(); tree = render();
assert.equal(all(tree, n => n.type === 'Pressable' && text(n, '7 days'))[0].props.accessibilityState.checked, true);
all(tree, n => n.props?.accessibilityLabel === 'Inspect next day')[0].props.onPress(); tree = render(); assert.ok(text(tree, 'Today')); assert.ok(all(tree, n => n.type === 'Text').some(n => [n.props.children].flat(Infinity).join('').startsWith('In progress')));
all(tree, n => n.props?.accessibilityLabel === 'Inspect next day')[0].props.onPress(); tree = render(); assert.equal(all(tree, n => n.type === 'LineChart')[0].props.selected, 6, 'Even direct repeated next actions cannot leave the plotted range');
all(tree, n => n.props?.accessibilityLabel === 'Practice')[0].props.onPress(); tree = render();
assert.equal(all(tree, n => n.props?.accessibilityLabel === 'Practice')[0].props.accessibilityState.checked, true);
assert.ok(text(tree, '7-day consistency')); assert.equal(all(tree, n => n.type === 'LineChart')[0].props.numeric, false);
mode = 'light'; tree = render(); assert.equal(all(tree, n => n.type === 'LineChart')[0].props.color, '#4263A8');
all(tree, n => n.type === 'SheetHeader')[0].props.onClose(); assert.equal(closes, 1);
// Five habits, including long names, keep a compact visible chip and a full
// accessible name. Minimum heights allow larger text to grow without clipping.
const names = ['Read', 'Workout', 'Drink water', 'Practice a language every morning before breakfast', 'Walk outside'];
props.habits = names.map((name, i) => ({ ...mixed, id: 'chip-' + i, name }));
tree = render();
for (const name of names) {
  const chip = all(tree, n => n.type === 'Pressable' && n.props.accessibilityLabel === name)[0];
  const chipStyle = Object.assign({}, ...chip.props.style.filter(Boolean));
  assert.ok(chipStyle.minHeight >= 44 && chipStyle.minHeight <= 45, 'Compact appearance retains a comfortable target');
  assert.ok(chipStyle.maxWidth <= 196); assert.equal(chipStyle.height, undefined, 'Larger text can increase chip height');
  assert.equal(all(chip, n => n.type === 'HabitIcon')[0].props.size, 30);
  const label = all(chip, n => n.type === 'Text' && n.props.children === name)[0];
  assert.equal(label.props.style.fontSize, 13); assert.equal(label.props.numberOfLines, 1); assert.equal(label.props.ellipsizeMode, 'tail');
}
all(tree, n => n.props?.accessibilityLabel === names[4])[0].props.onPress(); tree = render();
assert.equal(all(tree, n => n.props?.accessibilityLabel === names[4])[0].props.accessibilityState.checked, true);

props.habits = []; tree = render(); assert.ok(text(tree, 'Your progress starts with a habit.'));

// Exercise the native graph's measurement, tap/drag arbitration and screen-reader
// actions separately from the screen. This is a handler test, not device gesture QA.
const gh = harness(); let pan, selected = 3;
const Graph = load('src/components/analytics-line-chart.tsx', {
  react: { ...gh.react, useId: () => ':chart:' },
  'react-native': { ...native, PanResponder: { create: config => { pan = config; return { panHandlers: {} }; } } },
  'react-native-svg': { default: 'Svg', __esModule: true, ...Object.fromEntries(['Circle', 'Defs', 'Line', 'LinearGradient', 'Path', 'Stop', 'Text'].map(name => [name, name === 'Text' ? 'SvgText' : name])) },
  './theme': theme, '../i18n/context': { useTranslation: () => ({ t: createTranslator('en'), locale: 'en' }) },
}).default;
const graphProps = { points: numericPoints, selected, onSelect: i => { selected = i; }, smooth: true, color: '#4263A8', numeric: true, valueLabel: 'Walking, November 4, 1.5 km, partial' };
const renderGraph = () => gh.render(() => Graph(graphProps)); tree = renderGraph();
tree.props.ref.current = { measureInWindow: callback => callback(100) };
tree.props.onLayout({ nativeEvent: { layout: { width: 320 } } }); tree = renderGraph();
assert.equal(tree.props.accessibilityRole, 'adjustable');
assert.equal(pan.onMoveShouldSetPanResponder(null, { dx: 15, dy: 1 }), true);
assert.equal(pan.onMoveShouldSetPanResponder(null, { dx: 3, dy: 20 }), false, 'Vertical scroll is not claimed by the chart');
pan.onPanResponderMove({ nativeEvent: { pageX: 100 + chartLayout(320, 1).left, pageY: 0 } }); assert.equal(selected, 0, 'Gesture coordinates account for the modal/tablet inset');
tree.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); assert.equal(selected, 4);
tree.props.onTouchStart({ nativeEvent: { pageX: 410, pageY: 30 } }); tree.props.onTouchEnd({ nativeEvent: { pageX: 410, pageY: 30 } }); assert.equal(selected, 6);
selected = 2; tree.props.onTouchStart({ nativeEvent: { pageX: 180, pageY: 30 } }); tree.props.onTouchEnd({ nativeEvent: { pageX: 180, pageY: 130 } }); assert.equal(selected, 2, 'Finishing a vertical scroll does not inspect a different day');
assert.ok(all(tree, n => n.type === 'Path').every(n => !/NaN|Infinity/.test(n.props.d)));
fontScale = 2; tree = renderGraph(); assert.equal(tree.props.style.height, chartLayout(320, 2).height);

const tiny = make({ tracking: { kind: 'measure', target: 0.0003, unit: 'kg' } });
record(tiny, '2026-11-06', { kind: 'amount', amount: 0.0002 });
const tinyStats = analyze(tiny), tinyPoints = analyticsChart(tiny, '2026-11-07', tinyStats.days, tinyStats.historyStart, tinyStats.amountSeries[0].key);
graphProps.points = tinyPoints; fontScale = 1; tree = renderGraph();
const tinyCircle = all(tree, n => n.type === 'Circle' && n.props.r === 3)[0];
assert.ok(tinyCircle.props.cy < chartLayout(320, 1).height - chartLayout(320, 1).bottom - 30, 'Sub-unit amounts use a meaningful scale instead of flattening near zero');
assert.ok(all(tree, n => n.type === 'SvgText').some(n => [n.props.children].flat().join('').includes('E')), 'Very small nonzero axis values are labelled scientifically, never all as zero');
const NativeNumberFormat = Intl.NumberFormat;
try { Intl.NumberFormat = undefined; tree = renderGraph(); assert.ok(all(tree, n => n.type === 'SvgText').some(n => [n.props.children].flat().join('').includes('e-')), 'Axis labels tolerate missing Intl.NumberFormat'); }
finally { Intl.NumberFormat = NativeNumberFormat; }

console.log('Analytics checks passed: historical math, seven-day rolling windows, mixed-unit gaps and zero/legacy values, monotone curves, target steps, exact calendar spacing, selectors, expandable details, day selection, themes, text scaling, horizontal/vertical gesture arbitration and accessibility actions.');
