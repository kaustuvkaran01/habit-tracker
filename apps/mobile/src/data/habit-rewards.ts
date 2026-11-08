import { type AchievementDelivery } from './achievement-events';
import { type Habit, type HabitIconName } from './habit-types';
import { addDays, dateFromKey, dateKey, streakCompletions, streakDays } from './habit-calendar';

export const WALLPAPER_MILESTONES = [7, 10, 21, 30, 45, 60, 90] as const;
export type WallpaperMilestone = (typeof WALLPAPER_MILESTONES)[number];
export type WallpaperEdition = 'landscape' | 'quote';
export type EarnedWallpaper = { days: WallpaperMilestone; cycle: number; earnedOn: string };
export type ChampionBadge = {
  id: string; cycle: number; earnedOn: string; habitName: string; habitColor: string;
  habitIcon: HabitIconName; habitEmoji?: string;
};
export type HabitRewards = {
  cycle: number;
  delivery?: AchievementDelivery;
  cycleStartsOn?: string;
  wallpapers: EarnedWallpaper[];
  badges: ChampionBadge[];
  selectedWallpaper?: WallpaperMilestone;
  selectedWallpaperEdition?: WallpaperEdition;
};
export type RetainedCollection = Pick<Habit, 'id' | 'name' | 'color' | 'icon' | 'emoji'> & { rewards: HabitRewards };

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && dateKey(dateFromKey(value)) === value;
}

export function rewardsFor(habit: Pick<Habit, 'rewards'>): HabitRewards {
  return habit.rewards ?? { cycle: 1, wallpapers: [], badges: [] };
}

// Scan historical runs too: a missed day never revokes an already-earned reward.
export function reconcileRewards(habit: Habit, today: Date): Habit {
  const rewards = rewardsFor(habit);
  const earned = new Set(rewards.wallpapers.filter((item) => item.cycle === rewards.cycle).map((item) => item.days));
  const additions: EarnedWallpaper[] = [];
  let championDate: string | undefined;
  for (const run of streakCompletions(habit, today, rewards.cycleStartsOn)) {
    const key = run.end, count = run.days;
    for (const threshold of WALLPAPER_MILESTONES) {
      if (count >= threshold && !earned.has(threshold)) {
        earned.add(threshold);
        additions.push({ days: threshold, cycle: rewards.cycle, earnedOn: key });
      }
    }
    if (count >= 90 && !championDate) championDate = key;
  }
  const existingChampion = rewards.badges.some((badge) => badge.cycle === rewards.cycle);
  const badge: ChampionBadge | undefined = championDate && !existingChampion ? {
    id: `${habit.id}:cycle:${rewards.cycle}`, cycle: rewards.cycle, earnedOn: championDate,
    habitName: habit.name, habitColor: habit.color, habitIcon: habit.icon,
    ...(habit.emoji ? { habitEmoji: habit.emoji } : {}),
  } : undefined;
  if (!additions.length && !badge) return habit;
  return { ...habit, rewards: { ...rewards, wallpapers: [...rewards.wallpapers, ...additions], badges: badge ? [...rewards.badges, badge] : rewards.badges } };
}

export function collectionProgress(habit: Habit | RetainedCollection, today: Date) {
  const rewards = rewardsFor(habit);
  const currentStreak = 'checkIns' in habit ? streakDays(habit, today, rewards.cycleStartsOn) : 0;
  const collected = new Set(rewards.wallpapers.map((wallpaper) => wallpaper.days));
  const completedCycle = rewards.badges.some((badge) => badge.cycle === rewards.cycle);
  const earnedThisCycle = new Set(rewards.wallpapers.filter((item) => item.cycle === rewards.cycle).map((item) => item.days));
  return {
    rewards, currentStreak, collected, completedCycle,
    nextMilestone: WALLPAPER_MILESTONES.find((day) => !earnedThisCycle.has(day)),
    startsTomorrow: !!rewards.cycleStartsOn && rewards.cycleStartsOn > dateKey(today),
  };
}

export function selectWallpaper<T extends Habit | RetainedCollection>(habit: T, days: WallpaperMilestone, edition: WallpaperEdition = 'landscape'): T {
  const rewards = rewardsFor(habit);
  if (!rewards.wallpapers.some((item) => item.days === days) || (edition === 'quote' && days > 45)) return habit;
  return { ...habit, rewards: { ...rewards, selectedWallpaper: days, selectedWallpaperEdition: edition } };
}

export function startNextRewardCycle(habit: Habit, today: Date): Habit {
  const reconciled = reconcileRewards(habit, today);
  const rewards = rewardsFor(reconciled);
  if (!rewards.badges.some((badge) => badge.cycle === rewards.cycle)) return reconciled;
  return { ...reconciled, rewards: { ...rewards, cycle: rewards.cycle + 1, cycleStartsOn: dateKey(addDays(today, 1)) } };
}
