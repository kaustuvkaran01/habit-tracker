import { type Habit } from './habit-types';
import { dateKey, repeatLabel, streakDays } from './habit-calendar';

export type ShareAppearance = {
  theme: 'dark' | 'light'; color: string;
  showCompletion: boolean; showDescription: boolean; showStreak: boolean;
};

export function initialShareAppearance(habit: Habit): ShareAppearance {
  return { theme: 'dark', color: habit.color, showCompletion: true, showDescription: true, showStreak: false };
}

export function contrastInk(hex: string) {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.0556 > 1.05 / (luminance + 0.05) ? '#111111' : '#FFFFFF';
}

export function sharePresentation(habit: Habit, today: Date, appearance: ShareAppearance) {
  const light = appearance.theme === 'light';
  return {
    title: habit.name,
    description: appearance.showDescription && habit.description ? habit.description : undefined,
    completion: appearance.showCompletion ? habit.checkIns.includes(dateKey(today)) : undefined,
    streak: appearance.showStreak ? streakDays(habit, today) : undefined,
    schedule: appearance.showStreak ? repeatLabel(habit.repeatDays) : undefined,
    cardBackground: light ? '#FFFFFF' : '#15151A',
    text: light ? '#15151A' : '#F4F3F6', muted: light ? '#6E6C76' : '#A5A1AE',
    accent: appearance.color, accentInk: contrastInk(appearance.color),
  };
}
