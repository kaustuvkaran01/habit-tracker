import { type AchievementEvent } from '../data/achievement-events';

// Add presentation variants here; event generation and durable delivery stay
// independent of the artwork, motion and haptic treatment.
export const ACHIEVEMENT_REVEALS: Record<AchievementEvent['kind'], { title: string; action: string; startScale: number; rise: number; tilt: number; duration: number }> = {
  wallpaper: { title: 'Wallpaper unlocked', action: 'View wallpaper', startScale: 0.84, rise: 32, tilt: -5, duration: 620 },
  badge: { title: 'Badge earned', action: 'View and share badge', startScale: 1.18, rise: 0, tilt: -8, duration: 520 },
};
