import { type Habit } from './habit-types';
import { type AnalyticsDay, amountSeriesKey } from './habit-analytics';
import { addDays, dateFromKey, dateKey } from './habit-calendar';
import { dayProgress } from './habit-entries';

export type ChartPoint = {
  day: AnalyticsDay;
  value: number | null;
  target: number | null;
  window?: { start: string; end: string; completed: number; scheduled: number };
};

// Preserve every calendar date on the x axis: other units, absent reports and
// unscheduled numeric days are gaps, never compressed dates or invented zeros.
export function analyticsChart(habit: Habit, today: string, days: AnalyticsDay[], historyStart: string | undefined, series: string | null): ChartPoint[] {
  if (series !== null) return days.map(day => {
    const eligible = day.status !== 'unscheduled' && day.status !== 'future' && amountSeriesKey(day) === series;
    return { day, value: eligible ? day.amount ?? null : null, target: eligible ? day.configuration.tracking.target ?? 1 : null };
  });
  return days.map(day => {
    if (day.day >= today || !historyStart) return { day, value: null, target: null };
    const requestedStart = dateKey(addDays(dateFromKey(day.day), -6));
    const start = requestedStart < historyStart ? historyStart : requestedStart;
    let scheduled = 0, completed = 0;
    for (let date = dateFromKey(start); dateKey(date) <= day.day; date = addDays(date, 1)) {
      const result = dayProgress(habit, dateKey(date), today);
      if (result.status === 'unscheduled' || result.status === 'future') continue;
      scheduled++;
      if (result.complete) completed++;
    }
    return { day, value: scheduled ? completed / scheduled * 100 : null, target: null, window: { start, end: day.day, completed, scheduled } };
  });
}

export type PlotPoint = { x: number; y: number };
export function plotSegments(points: (PlotPoint | null)[]): PlotPoint[][] {
  const segments: PlotPoint[][] = [];
  let current: PlotPoint[] = [];
  for (const point of points) {
    if (point) current.push(point);
    else if (current.length) { segments.push(current); current = []; }
  }
  if (current.length) segments.push(current);
  return segments;
}
const coordinate = (n: number) => Number(n.toFixed(3));

// Monotone cubic interpolation. Limit tangents so the curve cannot overshoot
// either neighbouring observation, including unevenly spaced points.
export function linePath(points: PlotPoint[], smooth: boolean): string {
  if (!points.length) return '';
  const pair = (p: PlotPoint) => `${coordinate(p.x)} ${coordinate(p.y)}`;
  let path = `M ${pair(points[0])}`;
  if (!smooth) return path + points.slice(1).map(p => ` L ${pair(p)}`).join('');
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangents = points.map((_, i) => i === 0 ? slopes[0] ?? 0 : i === points.length - 1 ? slopes[i - 1] : (slopes[i - 1] + slopes[i]) / 2);
  slopes.forEach((slope, i) => {
    if (slope === 0) { tangents[i] = 0; tangents[i + 1] = 0; return; }
    if (tangents[i] * slope < 0) tangents[i] = 0;
    if (tangents[i + 1] * slope < 0) tangents[i + 1] = 0;
    const length = Math.hypot(tangents[i] / slope, tangents[i + 1] / slope);
    if (length > 3) { const scale = 3 / length; tangents[i] *= scale; tangents[i + 1] *= scale; }
  });
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], third = (b.x - a.x) / 3;
    path += ` C ${pair({ x: a.x + third, y: a.y + tangents[i - 1] * third })} ${pair({ x: b.x - third, y: b.y - tangents[i] * third })} ${pair(b)}`;
  }
  return path;
}

export function targetPath(points: PlotPoint[]): string {
  if (!points.length) return '';
  let path = `M ${coordinate(points[0].x - 3)} ${coordinate(points[0].y)} L ${coordinate(points[0].x)} ${coordinate(points[0].y)}`;
  points.slice(1).forEach((point, i) => {
    const previous = points[i], boundary = coordinate((previous.x + point.x) / 2);
    path += ` H ${boundary} V ${coordinate(point.y)} H ${coordinate(point.x)}`;
  });
  return path + ` H ${coordinate(points[points.length - 1].x + 3)}`;
}

export function chartLayout(width: number, fontScale: number) {
  const scale = Math.max(1, fontScale), left = Math.min(width * 0.46, 44 * scale), right = 14;
  return { left, right, top: 18, bottom: 32 * scale, height: 236 + 34 * (scale - 1), plotWidth: Math.max(1, width - left - right), labelSize: 11 * scale };
}
export function chartIndexAt(x: number, width: number, fontScale: number, count: number) {
  const layout = chartLayout(width, fontScale);
  return count ? Math.max(0, Math.min(count - 1, Math.round((x - layout.left) / layout.plotWidth * (count - 1)))) : -1;
}
