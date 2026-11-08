import { space, layout, control, radius, typeSize, habitChip } from '../components/design-tokens';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pressable from '../components/haptic-pressable';
import { HabitIcon } from '../components/habit-ui';
import { SheetHeader, usePreferenceStyles } from '../components/preference-ui';
import AnalyticsLineChart from '../components/analytics-line-chart';
import AppIcon from '../components/app-icon';
import { createThemedStyles, useTheme } from '../components/theme';
import { type Habit } from '../data/habit-types';
import { amountSeriesKey, habitAnalytics, type AnalyticsRange } from '../data/habit-analytics';
import { analyticsChart } from '../data/analytics-chart';
import { configurationOn } from '../data/habit-entries';
import { dateFromKey, dateKey } from '../data/habit-calendar';
import { weekdayNames } from '../i18n/locale';
import { useTranslation } from '../i18n/context';
import { canUse } from '../data/pro-access';
import { useProAccess } from '../components/pro-access';
import ProScreen from './pro-screen';

const SYMBOLS = { complete: '✓', partial: '◐', failed: '×', unlogged: '—', unscheduled: '·', future: '·' };
type ChartsProps = { habits: Habit[]; today: Date; onClose: () => void };
export default function ChartsScreen(props: ChartsProps) {
  const access = useProAccess();
  return canUse('analytics', access) ? <ChartsContent {...props} /> : <ProScreen reason="analytics" onClose={props.onClose} />;
}

export function ChartsContent({ habits, today, onClose }: ChartsProps) {
  const { t, locale } = useTranslation(), styles = useStyles(), shared = usePreferenceStyles();
  const { colors, mode } = useTheme(), insets = useSafeAreaInsets(), { fontScale } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRange>(30);
  const [series, setSeries] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [smooth, setSmooth] = useState(true);
  const [details, setDetails] = useState(false);
  const habit = habits.find(item => item.id === selectedId) ?? habits.find(item => !item.archived) ?? habits[0];
  const todayKey = dateKey(today);
  const data = useMemo(() => habit ? habitAnalytics(habit, today, range) : null, [habit, today, range]);
  const current = habit ? configurationOn(habit, todayKey) : null;
  const defaultKey = current ? amountSeriesKey({ configuration: current }) : '';
  const defaultSeries = current?.tracking.kind === 'yes-no' ? 'consistency' : data?.amountSeries.find(item => item.key === defaultKey)?.key ?? data?.amountSeries[data.amountSeries.length - 1]?.key ?? 'consistency';
  const selectedSeries = series ?? defaultSeries;
  const numeric = data?.amountSeries.find(item => item.key === selectedSeries);
  const seriesKey = numeric?.key ?? null;
  const points = useMemo(() => habit && data ? analyticsChart(habit, todayKey, data.days, data.historyStart, seriesKey) : [], [habit, data, todayKey, seriesKey]);
  const fallbackIndex = Math.max(0, points.length - (points[points.length - 1]?.day.day === todayKey && points.length > 1 ? 2 : 1));
  const foundIndex = points.findIndex(point => point.day.day === selectedDay);
  const selectedIndex = foundIndex >= 0 ? foundIndex : fallbackIndex;
  const selected = points[selectedIndex];
  const select = useCallback((index: number) => setSelectedDay(points[Math.max(0, Math.min(points.length - 1, index))]?.day.day ?? null), [points]);
  // Colour belongs to the plot; app surfaces and selections retain their theme.
  const graphColor = mode === 'dark' ? '#45D97C' : '#4263A8';
  const n = (value: number) => t('{value0}', { value0: value });
  const amountFormatter = useMemo(() => { try { return new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }); } catch { return null; } }, [locale]);
  const amount = (value: number) => amountFormatter?.format(value) ?? String(value);
  const formatDate = (day: string, year = false) => dateFromKey(day).toLocaleDateString(locale, { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
  function reset() { setSeries(null); setSelectedDay(null); setDetails(false); }
  function seriesLabel(item: NonNullable<typeof data>['amountSeries'][number]) {
    return `${t(item.kind === 'count' ? 'Count' : 'Measure')} · ${item.unit || t('times')} · ${t(item.habitType === 'quit' ? 'Quit A Habit' : 'Build A Habit')}`;
  }
  const showSeriesPicker = !!data && (data.amountSeries.length > 1 || (data.amountSeries.length === 1 && data.days.some(day => day.configuration.tracking.kind === 'yes-no')));
  const value = !selected ? '—' : numeric ? selected.value === null ? '—' : `${amount(selected.value)} ${numeric.unit || t('times')}` : selected.value === null ? '—' : `${n(Math.round(selected.value))}%`;
  const status = !selected ? '' : selected.day.day === todayKey ? `${t('In progress')} · ${SYMBOLS[selected.day.status]} ${t(selected.day.status)}` : numeric
    ? `${SYMBOLS[selected.day.status]} ${t(selected.day.status)}`
    : selected.window?.scheduled ? t('{value0} of {value1} scheduled days', { value0: selected.window.completed, value1: selected.window.scheduled }) : t('No finished scheduled days yet.');
  const selectedLabel = selected ? `${formatDate(selected.day.day, true)}, ${value}, ${status}` : t('No entries in this period.');
  return <View style={shared.screen} onAccessibilityEscape={onClose}>
    <SheetHeader title={t('Analytics')} onClose={onClose} />
    <ScrollView indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
      <View style={styles.content}>
        {!habit || !data ? <View style={styles.detail}><Text style={styles.heading}>{t('Your progress starts with a habit.')}</Text><Text style={styles.muted}>{t('Add a habit to get started.')}</Text></View> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {habits.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: habit.id === item.id }} accessibilityLabel={`${item.name}${item.archived ? ', ' + t('Archived') : ''}`}
              onPress={() => { setSelectedId(item.id); reset(); }} style={[styles.habit, habit.id === item.id && styles.selectedHabit]}>
              <HabitIcon habit={item} size={habitChip.icon} /><View style={styles.habitCopy}><Text numberOfLines={1} ellipsizeMode="tail" style={styles.habitName}>{item.name}</Text>{item.archived && <Text style={styles.small}>{t('Archived')}</Text>}</View>
            </Pressable>)}
          </ScrollView>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('Analytics period')} style={styles.ranges}>
            {([7, 30, 90, 365] as const).map(days => <Pressable key={days} accessibilityRole="radio" accessibilityState={{ checked: range === days }} onPress={() => { setRange(days); reset(); }} style={[styles.range, range === days && styles.selectedRange]}><Text style={styles.rangeText}>{days === 365 ? t('Year') : t('{count} days', { count: days })}</Text></Pressable>)}
          </View>
          <View style={styles.summary}>
            <Text style={styles.muted}>{t('Consistency')}</Text>
            <Text style={styles.percent}>{data.rate === null ? '—' : n(Math.round(data.rate * 100))}{data.rate !== null && <Text style={styles.percentSign}>%</Text>}</Text>
            <Text style={styles.muted}>{t('{value0} of {value1} scheduled days', { value0: data.completed, value1: data.scheduled })}</Text>
            <Text style={styles.small}>{t('Through yesterday. Today is shown separately.')}</Text>
            {!data.scheduled && <Text style={styles.small}>{t('No finished scheduled days yet.')}</Text>}
            {data.scheduled > 0 && data.scheduled < 14 && <Text style={styles.small}>{t('Early pattern — small sample.')}</Text>}
          </View>
          <View style={styles.streaks}>
            <View style={styles.streak}><View style={styles.inline}><AppIcon name="flame" size={15} color={colors.accentText} /><Text style={styles.small}>{t('Current streak')}</Text></View><Text style={styles.streakValue}>{t('{count} days', { count: data.currentStreak })}</Text></View>
            <View style={styles.streak}><View style={styles.inline}><AppIcon name="star" size={15} color={colors.accentText} /><Text style={styles.small}>{t('Best in this period')}</Text></View><Text style={styles.streakValue}>{t('{count} days', { count: data.bestStreak })}</Text></View>
          </View>
          <View style={styles.chartSection}>
            <View style={styles.row}>
              <Text accessibilityRole="header" style={styles.heading}>{numeric ? t('Daily progress') : t('7-day consistency')}</Text>
              <Pressable accessibilityRole="switch" accessibilityLabel={t('Smooth graph')} accessibilityState={{ checked: smooth }} onPress={() => setSmooth(value => !value)} style={styles.curve}><Text style={styles.curveText}>{smooth ? t('Smooth') : t('Straight')}</Text></Pressable>
            </View>
            {showSeriesPicker && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: !numeric }} onPress={() => { setSeries('consistency'); setSelectedDay(null); }} style={[styles.series, !numeric && styles.selectedRange]}><Text style={styles.small}>{t('Consistency')}</Text></Pressable>
              {data.amountSeries.map(item => <Pressable key={item.key} accessibilityRole="radio" accessibilityState={{ checked: item.key === selectedSeries }} onPress={() => { setSeries(item.key); setSelectedDay(null); }} style={[styles.series, item.key === selectedSeries && styles.selectedRange]}><Text style={styles.small}>{seriesLabel(item)}</Text></Pressable>)}
            </ScrollView>}
            <View style={styles.row}><Text style={styles.small}>{points.length ? `${formatDate(data.start)} – ${formatDate(data.end, true)}` : t('No entries in this period.')}</Text>{numeric && <Text style={styles.total}>{numeric.reported ? n(numeric.total) : '—'} {numeric.unit || t('times')} · {t('Recorded amount')}</Text>}</View>
            {points.length ? <AnalyticsLineChart points={points} selected={selectedIndex} onSelect={select} smooth={smooth} color={graphColor} numeric={!!numeric} valueLabel={selectedLabel} /> : <Text style={styles.muted}>{t('No entries in this period.')}</Text>}
            <View style={styles.legend}>
              <View style={styles.inline}><View style={[styles.swatch, { backgroundColor: graphColor }]} /><Text style={styles.small}>{numeric ? t('Recorded amount') : t('Completed / scheduled')}</Text></View>
              {numeric && <View style={styles.inline}><View style={styles.goalSwatch} /><Text style={styles.small}>{numeric.habitType === 'quit' ? t('Daily limit') : t('Daily goal')}</Text></View>}
            </View>
            {selected && <View style={styles.detail}>
              <View style={styles.row}><Text style={styles.small}>{selected.day.day === todayKey ? t('Today') : formatDate(selected.day.day, true)}</Text><View style={styles.inline}>
                <Pressable accessibilityRole="button" accessibilityLabel={t('Inspect previous day')} disabled={selectedIndex <= 0} onPress={() => select(selectedIndex - 1)} style={[styles.arrow, selectedIndex <= 0 && styles.disabled]}><AppIcon name="chevron-left" size={16} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t('Inspect next day')} disabled={selectedIndex >= points.length - 1} onPress={() => select(selectedIndex + 1)} style={[styles.arrow, selectedIndex >= points.length - 1 && styles.disabled]}><AppIcon name="chevron-right" size={16} /></Pressable>
              </View></View>
              <View style={styles.row}><Text style={styles.dayValue}>{value}</Text><Text style={styles.muted}>{status}</Text></View>
              {numeric && selected.value === null && <Text style={styles.small}>{amountSeriesKey(selected.day) !== numeric.key ? t('Different tracking rules apply on this day.') : selected.day.complete ? t('Amount unknown for this older completion.') : t('No amount recorded')}</Text>}
              {numeric && selected.target !== null && <Text style={styles.small}>{numeric.habitType === 'quit' ? t('Daily limit') : t('Daily goal')}: {amount(selected.target)} {numeric.unit || t('times')}</Text>}
              {!numeric && selected.window && <Text style={styles.small}>{formatDate(selected.window.start)} – {formatDate(selected.window.end)}</Text>}
            </View>}
            <Text style={styles.small}>{numeric ? t('Today is in progress. Gaps mean no amount was recorded for this series.') : t('Each point covers the previous 7 calendar days, including its date. Only finished scheduled days count.')}</Text>
          </View>
          <View style={styles.more}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} accessibilityLabel={t('More details')} onPress={() => setDetails(value => !value)} style={styles.moreButton}><Text style={styles.text}>{t('More details')}</Text><AppIcon name={details ? 'chevron-up' : 'chevron-down'} size={16} color={colors.accentText} /></Pressable>
            {details && <View style={styles.detailsContent}>
              <Text accessibilityRole="header" style={styles.heading}>{t('Weekday patterns')}</Text>
              {data.weekdays.map(item => <View key={item.weekday} accessible accessibilityLabel={`${weekdayNames(locale, 'long')[item.weekday]}, ${n(item.completed)} / ${n(item.scheduled)}`} style={styles.weekday}>
                <Text style={[styles.weekdayName, { width: 43 * fontScale }]}>{weekdayNames(locale)[item.weekday]}</Text><View accessible={false} style={styles.track}><View style={[styles.fill, { width: `${(item.rate ?? 0) * 100}%`, backgroundColor: graphColor }]} /></View><Text style={[styles.fraction, { width: 56 * fontScale }]}>{n(item.completed)}/{n(item.scheduled)}</Text>
              </View>)}
              <Text style={styles.small}>{t('Completed / finished scheduled days. Today excluded.')}</Text>
              <Text style={styles.small}>{t('Streaks span calendar days between scheduled completions.')}</Text>
              <Text style={styles.small}>{t('Rest days are added at the next completion. Missing a scheduled day breaks the streak.')}</Text>
              <Text style={styles.small}>{t('{value0} partial · {value1} failed · {value2} unlogged', { value0: data.partial, value1: data.failed, value2: data.unlogged })}</Text>
              {data.amountSeries.length > 0 && <><Text accessibilityRole="header" style={styles.heading}>{t('Reported activity')}</Text><Text style={styles.small}>{t('Includes today. Different units stay separate.')}</Text>{data.amountSeries.map(item => <View key={item.key} style={styles.activity}><Text style={styles.small}>{seriesLabel(item)}</Text><Text style={styles.text}>{item.reported ? n(item.total) : '—'} {item.unit || t('times')}</Text><Text style={styles.small}>{t('{value0} reported days · {value1} older amounts unknown', { value0: item.reported, value1: item.unknown })}</Text></View>)}</>}
              {data.legacyHistory && <Text style={styles.small}>{t('Older history starts at the first saved date. Earlier days are unknown.')}</Text>}
              <Text style={styles.small}>{t('Based on saved schedules and the rules recorded for each day. Changes to old entries update these results.')}</Text>
            </View>}
          </View>
        </>}
      </View>
    </ScrollView>
  </View>;
}
const useStyles = createThemedStyles(c => StyleSheet.create({
  content: { width: '100%', maxWidth: layout.content, alignSelf: 'center', gap: layout.section },
  heading: { fontSize: 17, fontWeight: '600', color: c.text }, text: { fontSize: 14, lineHeight: 21, color: c.text }, muted: { fontSize: 13, lineHeight: 20, color: c.muted }, small: { fontSize: 11, lineHeight: 17, color: c.muted },
  chips: { gap: space.xs, alignItems: 'center' }, habit: { flexDirection: 'row', alignItems: 'center', gap: habitChip.gap, maxWidth: habitChip.maxWidth, minHeight: habitChip.height, padding: habitChip.inset, borderRadius: radius.control, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel }, selectedHabit: { borderColor: c.accentText }, habitCopy: { flexShrink: 1, gap: space.xxs, minWidth: 0 }, habitName: { color: c.text, fontSize: habitChip.font, fontWeight: '600', lineHeight: 18 },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', padding: space.xxs, gap: space.xxs, borderRadius: radius.control, backgroundColor: c.control, borderWidth: 1, borderColor: c.border }, range: { flexGrow: 1, flexBasis: 64, minHeight: control.touch, justifyContent: 'center', alignItems: 'center', padding: space.xs, borderRadius: radius.small }, selectedRange: { backgroundColor: c.selected }, rangeText: { color: c.text, fontSize: typeSize.caption, textAlign: 'center' },
  summary: { gap: space.xxs }, percent: { fontSize: 55, fontWeight: '500', color: c.text, letterSpacing: -2 }, percentSign: { fontSize: 26, color: c.muted, letterSpacing: -0.5 },
  streaks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingBottom: layout.section, borderBottomWidth: 1, borderBottomColor: c.border }, streak: { flexGrow: 1, flexBasis: 130, gap: space.xs }, streakValue: { color: c.text, fontSize: 21, fontWeight: '500' }, inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  chartSection: { gap: space.sm }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.xs }, curve: { paddingVertical: space.xs, paddingHorizontal: space.sm, minHeight: control.touch, borderRadius: radius.control, backgroundColor: c.accentPanel, justifyContent: 'center' }, curveText: { color: c.accentText, fontSize: typeSize.caption }, series: { minHeight: control.touch, padding: space.xs, borderRadius: radius.control, justifyContent: 'center', borderWidth: 1, borderColor: c.border }, total: { color: c.text, fontSize: 12, flexShrink: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md }, swatch: { width: 15, height: 3, borderRadius: 2 }, goalSwatch: { width: 16, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.muted },
  detail: { padding: layout.inset, gap: space.xs, borderWidth: 1, borderColor: c.border, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: c.panel }, dayValue: { color: c.text, fontSize: 23, fontWeight: '500', flexShrink: 1 }, arrow: { width: control.touch, height: control.touch, borderRadius: control.touch / 2, borderWidth: 1, borderColor: c.controlBorder, backgroundColor: c.control, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.35 },
  more: { borderWidth: 1, borderColor: c.border, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: c.panel, overflow: 'hidden' }, moreButton: { minHeight: control.row, padding: layout.inset, gap: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailsContent: { paddingHorizontal: layout.inset, paddingBottom: layout.inset, gap: space.sm }, activity: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm, gap: space.xxs },
  weekday: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, minHeight: 36 }, weekdayName: { color: c.muted, fontSize: 12 }, track: { flex: 1, minWidth: 35, height: 7, borderRadius: 4, backgroundColor: c.control, overflow: 'hidden' }, fill: { height: 7, borderRadius: 4 }, fraction: { color: c.text, textAlign: 'right', fontSize: 12 },
}));
