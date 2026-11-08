import { type ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { HABIT_ICONS, type HabitSymbolName } from '../data/habit-icons';
import { useTheme } from './theme';

export type AppIconName = HabitSymbolName | 'search' | 'clock' | 'pulse' | 'workout' | 'book' | 'moon' | 'leaf' | 'target'
  | 'gear' | 'share' | 'chart' | 'plus' | 'minus' | 'close' | 'edit' | 'check'
  | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'chevron-up'
  | 'view-grid' | 'view-list' | 'view-month' | 'grid' | 'bell' | 'palette' | 'language'
  | 'archive' | 'cloud' | 'list' | 'onboarding' | 'news' | 'send' | 'globe' | 'social'
  | 'lock' | 'terms' | 'star' | 'hash' | 'sparkle' | 'repeat' | 'wallpaper' | 'flame' | 'calendar';

// Rounded corners on the actual gear outline, with no background-coloured cutout.
function roundedGearPath() {
  const points = Array.from({ length: 32 }, (_, index) => {
    const phase = index % 4;
    const angle = ((Math.floor(index / 4) + [0.08, 0.23, 0.77, 0.92][phase]) / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = phase === 0 || phase === 3 ? 8.1 : 10.1;
    return { x: 12 + Math.cos(angle) * radius, y: 12 + Math.sin(angle) * radius };
  });
  const mix = (a: { x: number; y: number }, b: { x: number; y: number }) => `${(a.x * 0.76 + b.x * 0.24).toFixed(2)} ${(a.y * 0.76 + b.y * 0.24).toFixed(2)}`;
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    return `${index === 0 ? 'M' : 'L'}${mix(point, previous)} Q${point.x.toFixed(2)} ${point.y.toFixed(2)} ${mix(point, next)}`;
  }).join(' ') + ' Z';
}

const GEAR_PATH = roundedGearPath();

function content(name: AppIconName): ReactNode {
  const habit = HABIT_ICONS.find((icon) => icon.id === name);
  if (habit && name.startsWith('habit-')) return <Path d={habit.path} />;
  switch (name) {
    case 'search': return <><Circle cx="10.5" cy="10.5" r="7" /><Path d="m16 16 5 5" /></>;
    case 'clock': return <><Circle cx="12" cy="12" r="9" /><Path d="M12 6v6l4 3" /></>;
    case 'pulse': return <Path d="M3 12h4l2.4 6.5L13.2 5l2.5 7H21" />;
    case 'workout': return <><Rect x="4.5" y="6.5" width="4" height="11" rx="1.5" /><Rect x="15.5" y="6.5" width="4" height="11" rx="1.5" /><Path d="M8.5 12h7M2 9.5v5m20-5v5" /></>;
    case 'book': return <><Path d="M12 5.5C9.5 3.8 6.1 3.5 3 4.8v14c3.1-1.3 6.5-1 9 .7 2.5-1.7 5.9-2 9-.7v-14c-3.1-1.3-6.5-1-9 .7Z M12 5.5v14" /><Path d="M6 8h3m6 0h3" /></>;
    case 'moon': return <Path d="M20.1 14.3A8.6 8.6 0 0 1 9.7 3.9a8.7 8.7 0 1 0 10.4 10.4Z" />;
    case 'leaf': return <><Path d="M20.5 3.5c-7-1-15.9.5-16 8.5-.1 4.5 3.1 7.5 7.3 7.5 7.1 0 9-8.3 8.7-16Z M3 21 15.5 8.5" /><Path d="M9 15v-4.5m0 4.5h4.5" /></>;
    case 'target': return <><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="4.6" /><Circle cx="12" cy="12" r="0.7" /></>;
    case 'gear': return <><Path d={GEAR_PATH} /><Circle cx="12" cy="12" r="3.2" /></>;
    case 'share': return <><Circle cx="5" cy="12" r="2.5" /><Circle cx="18" cy="5" r="2.5" /><Circle cx="18" cy="19" r="2.5" /><Path d="m7.2 10.8 8.6-4.6m-8.6 7 8.6 4.6" /></>;
    case 'chart': return <><Path d="M4 20v-5m5 5v-8m5 8v-5m5 5v-9 M3.5 9.5l5-4 5 3 7-6m-5 0h5v5" /></>;
    case 'plus': return <Path d="M12 4v16M4 12h16" />;
    case 'minus': return <Path d="M5 12h14" />;
    case 'close': return <Path d="m6 6 12 12M6 18 18 6" />;
    case 'check': return <Path d="m5 12 4.5 4.5L19 6.5" />;
    case 'edit': return <><Path d="m14.5 5.5 4 4 M4 20l4.8-1.2L20 7.6a2.8 2.8 0 0 0-4-4L4.8 14.8 4 20Z" /><Path d="m4.8 14.8 4 4" /></>;
    case 'chevron-left': return <Path d="m14.5 5-7 7 7 7" />;
    case 'chevron-right': return <Path d="m9.5 5 7 7-7 7" />;
    case 'chevron-down': return <Path d="m5 9.5 7 7 7-7" />;
    case 'chevron-up': return <Path d="m5 14.5 7-7 7 7" />;
    case 'view-grid': return <>{[3, 10, 17].flatMap((y) => [3, 10, 17].map((x) => <Rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1.1" />))}</>;
    case 'view-list': return <Path d="m3 5 1.3 1.4L6.5 3.8M10 5h11m-18 7 1.3 1.4 2.2-2.6M10 12h11m-18 7 1.3 1.4 2.2-2.6M10 19h11" />;
    case 'view-month': return <>{[5, 12, 19].flatMap((y) => [3, 10, 17].map((x) => <Path key={`${x}-${y}`} d={`M${x} ${y}h4`} />))}</>;
    case 'grid': return <>{[3, 13.5].flatMap((y) => [3, 13.5].map((x) => <Rect key={`${x}-${y}`} x={x} y={y} width="7.5" height="7.5" rx="1.7" />))}</>;
    case 'bell': return <><Path d="M5 9a7 7 0 0 1 14 0v4.2c0 1.7.8 2.5 1.5 3.8h-17C4.2 15.7 5 14.9 5 13.2V9Z M9.5 20a2.8 2.8 0 0 0 5 0" /></>;
    case 'palette': return <><Path d="M21 11.5a9 9 0 1 0-9 9c1.8 0 2.8-1.3 1.9-2.8-.9-1.5.1-2.7 1.6-2.7H18c1.8 0 3-1.5 3-3.5Z" /><Circle cx="7" cy="9" r="0.7" /><Circle cx="11" cy="6.5" r="0.7" /><Circle cx="16" cy="8" r="0.7" /><Circle cx="6.5" cy="14" r="0.7" /></>;
    case 'language': return <Path d="M3 5h11M8.5 3v2M12 5c-.7 6-4.3 9.5-9 12M5 9c1.3 3.4 3.5 5.8 7 7M13 21l4-10 4 10m-6.6-3.5h5.2" />;
    case 'archive': return <><Rect x="3" y="4" width="18" height="4" rx="1.4" /><Path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M9 12h6" /></>;
    case 'cloud': return <><Path d="M7 18H6a4 4 0 0 1-.7-7.9A6.8 6.8 0 0 1 18.5 9a4.5 4.5 0 0 1-.5 9h-1M12 21V11m-3 3 3-3 3 3" /></>;
    case 'list': return <><Path d="M9 5h12M9 12h12M9 19h12" /><Circle cx="3.5" cy="5" r="0.8" /><Circle cx="3.5" cy="12" r="0.8" /><Circle cx="3.5" cy="19" r="0.8" /></>;
    case 'onboarding': return <Path d="M5 21V4c5-4 9 4 14 0v11c-5 4-9-4-14 0" />;
    case 'news': return <><Rect x="5" y="3" width="15" height="18" rx="2.5" /><Path d="M5 8H2v10.5A2.5 2.5 0 0 0 4.5 21M9 7h7M9 11h7M9 15h3" /></>;
    case 'send': return <Path d="m3 3 18 9L3 21l3.5-9L3 3Zm3.5 9H21" />;
    case 'globe': return <><Circle cx="12" cy="12" r="9" /><Path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z" /></>;
    case 'social': return <Path d="m4 3 12.5 18H20L7.5 3H4Zm16 0L4 21" />;
    case 'lock': return <><Rect x="4.5" y="10" width="15" height="11" rx="2.5" /><Path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>;
    case 'terms': return <><Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8M8 17h6" /></>;
    case 'star': return <Path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9L12 3Z" />;
    case 'hash': return <Path d="m9 3-3 18M18 3l-3 18M3 8h18M2 16h18" />;
    case 'sparkle': return <><Path d="M10 3c1.4 4.8 2.2 5.6 7 7-4.8 1.4-5.6 2.2-7 7-1.4-4.8-2.2-5.6-7-7 4.8-1.4 5.6-2.2 7-7Z M19 14c.6 2.5 1 2.9 3.5 3.5-2.5.6-2.9 1-3.5 3.5-.6-2.5-1-2.9-3.5-3.5 2.5-.6 2.9-1 3.5-3.5Z" /></>;
    case 'repeat': return <Path d="M4 10V7a2 2 0 0 1 2-2h14m-3-3 3 3-3 3M20 14v3a2 2 0 0 1-2 2H4m3-3-3 3 3 3" />;
    case 'wallpaper': return <><Rect x="3.5" y="2.5" width="17" height="19" rx="3" /><Circle cx="15.5" cy="7.5" r="1.5" /><Path d="m3.5 16 5-5 4 4 3-3 5 5" /></>;
    case 'calendar': return <><Rect x="3.5" y="5" width="17" height="16" rx="2.5" /><Path d="M7.5 2.5v5m9-5v5M3.5 10h17" /></>;
    case 'flame': return <><Path d="M13 2.5c1 4.3 6.5 7.2 6.5 11.6a7.5 7.5 0 0 1-15 0c0-2.7 1.5-5.1 3.8-7.3-.1 2.6.9 4 2.2 4.7C12.5 8.6 13.4 5.6 13 2.5Z" /><Path d="M12.5 12.5c.2 2.2 3 3.1 3 5.3a3.5 3.5 0 0 1-7 0c0-1.7 1.6-3.2 4-5.3Z" /></>;
  }
}

export default function AppIcon({ name, size = 24, color, strokeWidth = 1.65 }: {
  name: AppIconName; size?: number; color?: string; strokeWidth?: number;
}) {
  const { colors } = useTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} pointerEvents="none">
    <G fill="none" stroke={color ?? colors.icon} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{content(name)}</G>
  </Svg>;
}
