import { useId, useMemo, useRef, useState, type ComponentRef } from 'react';
import { PanResponder, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { chartIndexAt, chartLayout, linePath, plotSegments, targetPath, type ChartPoint } from '../data/analytics-chart';
import { dateFromKey } from '../data/habit-calendar';
import { useTheme } from './theme';
import { useTranslation } from '../i18n/context';

export default function AnalyticsLineChart({ points, selected, onSelect, smooth, color, numeric, valueLabel }: {
  points: ChartPoint[]; selected: number; onSelect: (index: number) => void; smooth: boolean; color: string; numeric: boolean; valueLabel: string;
}) {
  const { colors } = useTheme(), { locale, t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const view = useRef<ComponentRef<typeof View>>(null), left = useRef(0), start = useRef<{ x: number; y: number } | null>(null);
  const id = 'analytics-' + useId().replace(/[^a-z0-9_-]/gi, '');
  const layout = chartLayout(width, fontScale);
  const peak = Math.max(0, ...points.flatMap(point => [point.value ?? 0, point.target ?? 0]));
  const paddedPeak = peak * 1.12;
  const maximum = numeric ? peak > 0 ? Number.isFinite(paddedPeak) ? paddedPeak : peak : 1 : 100;
  const x = (index: number) => layout.left + (points.length > 1 ? index / (points.length - 1) : 0.5) * layout.plotWidth;
  const y = (value: number) => layout.height - layout.bottom - value / maximum * (layout.height - layout.bottom - layout.top);
  const geometry = useMemo(() => {
    const segments = plotSegments(points.map((point, i) => point.value === null ? null : { x: x(i), y: y(point.value) }));
    return {
      segments,
      lines: segments.map(segment => linePath(segment, smooth)),
      targets: plotSegments(points.map((point, i) => point.target === null ? null : { x: x(i), y: y(point.target) })).map(targetPath),
    };
  // Coordinates depend only on these inputs, not the inspected day.
  }, [points, width, fontScale, numeric, smooth]);
  function pick(event: GestureResponderEvent) {
    const index = chartIndexAt(event.nativeEvent.pageX - left.current, width, fontScale, points.length);
    if (index >= 0) onSelect(index);
  }
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderGrant: pick,
    onPanResponderMove: pick,
    onPanResponderTerminationRequest: () => true,
    onPanResponderRelease: () => { start.current = null; },
    onPanResponderTerminate: () => { start.current = null; },
  }), [width, fontScale, points.length, onSelect]);
  function axis(value: number) {
    try { return new Intl.NumberFormat(locale, { maximumSignificantDigits: 3, notation: value >= 10000 ? 'compact' : value > 0 && value < 0.01 ? 'scientific' : 'standard' }).format(value); }
    catch { return value >= 10000 || (value > 0 && value < 0.01) ? value.toExponential(1) : t('{value0}', { value0: Number(value.toPrecision(3)) }); }
  }
  const ticks = points.length ? layout.plotWidth < 125 * Math.max(1, fontScale) ? [Math.floor((points.length - 1) / 2)] : layout.plotWidth < 240 * Math.max(1, fontScale) ? [0, points.length - 1] : [0, Math.floor((points.length - 1) / 2), points.length - 1] : [];
  const chosen = points[selected];
  return <View ref={view} accessible accessibilityRole="adjustable" accessibilityLabel={t('Daily progress')} accessibilityValue={{ text: valueLabel }}
    accessibilityActions={[{ name: 'increment', label: t('Inspect next day') }, { name: 'decrement', label: t('Inspect previous day') }]}
    onAccessibilityAction={event => { const direction = event.nativeEvent.actionName === 'increment' ? 1 : event.nativeEvent.actionName === 'decrement' ? -1 : 0; if (direction && points.length) onSelect(Math.max(0, Math.min(points.length - 1, selected + direction))); }}
    onLayout={event => { setWidth(event.nativeEvent.layout.width); view.current?.measureInWindow(px => { left.current = px; }); }}
    onTouchStart={event => { start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }}
    onTouchEnd={event => { const initial = start.current; start.current = null; if (initial && Math.abs(event.nativeEvent.pageX - initial.x) < 6 && Math.abs(event.nativeEvent.pageY - initial.y) < 6) pick(event); }}
    onTouchCancel={() => { start.current = null; }} {...pan.panHandlers} style={{ height: layout.height, width: '100%' }}>
    {width > 0 && <Svg accessible={false} importantForAccessibility="no-hide-descendants" width={width} height={layout.height}>
      <Defs><LinearGradient id={id} x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity={0.14} /><Stop offset="1" stopColor={color} stopOpacity={0} /></LinearGradient></Defs>
      {[0, maximum / 2, maximum].map(value => <Line key={value} x1={layout.left} x2={width - layout.right} y1={y(value)} y2={y(value)} stroke={colors.border} strokeWidth={StyleSheet.hairlineWidth} />)}
      {geometry.segments.map((segment, i) => <Path key={`fill-${i}`} d={`${geometry.lines[i]} L ${segment[segment.length - 1].x} ${y(0)} L ${segment[0].x} ${y(0)} Z`} fill={`url(#${id})`} />)}
      {geometry.targets.map((path, i) => <Path key={`target-${i}`} d={path} fill="none" stroke={colors.muted} strokeWidth={1} strokeDasharray="4 5" />)}
      {geometry.lines.map((path, i) => <Path key={`line-${i}`} d={path} fill="none" stroke={color} strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />)}
      {geometry.segments.filter(segment => segment.length === 1).map((segment, i) => <Circle key={`single-${i}`} cx={segment[0].x} cy={segment[0].y} r={3} fill={color} />)}
      {chosen && <Line x1={x(selected)} x2={x(selected)} y1={layout.top} y2={y(0)} stroke={colors.muted} strokeWidth={StyleSheet.hairlineWidth} />}
      {chosen && chosen.value !== null && <><Circle cx={x(selected)} cy={y(chosen.value)} r={6} fill={colors.panel} stroke={colors.accentText} strokeWidth={2.5} /><Circle cx={x(selected)} cy={y(chosen.value)} r={2} fill={colors.accentText} /></>}
      {[0, maximum / 2, maximum].map(value => <SvgText key={value} x={layout.left - 8} y={y(value) + layout.labelSize * 0.33} fontSize={layout.labelSize} fill={colors.muted} textAnchor="end">{axis(value)}{numeric ? '' : '%'}</SvgText>)}
      {[...new Set(ticks)].map(index => <SvgText key={index} x={x(index)} y={layout.height - 6} fontSize={layout.labelSize} fill={colors.muted} textAnchor={ticks.length === 1 ? 'middle' : index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>{dateFromKey(points[index].day.day).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</SvgText>)}
    </Svg>}
  </View>;
}
