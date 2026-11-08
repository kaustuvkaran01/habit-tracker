import { type HabitSnapshot } from './habit-archive';
import { type Habit } from './habit-types';
import { type WallpaperMilestone } from './habit-rewards';

export type AchievementEvent = { id: string; kind: 'wallpaper' | 'badge'; cycle: number; days: WallpaperMilestone; earnedOn: string; queuedAt: string };
export type AchievementClaim = 'claimed' | 'missing' | 'failed';
export type AchievementDelivery = { version: 1; pending: AchievementEvent[]; handled: string[] };
export type Achievement = { habit: Pick<Habit, 'id' | 'name' | 'color' | 'icon' | 'emoji' | 'rewards'>; event: AchievementEvent };
export const achievementId = (habitId: string, kind: AchievementEvent['kind'], cycle: number, days: number) => JSON.stringify([habitId, kind, cycle, days]);
export const isDemoHabit = (habit: Habit) => habit.demo === true || (!habit.createdOn && (habit.id === 'habit-2' || habit.id === 'workout'));
const deliveryFor = (habit: Habit): AchievementDelivery => habit.rewards?.delivery ?? { version: 1, pending: [], handled: [] };

// Trigger only from explicit daily recording actions. Hydration, migrated rule
// changes, opening a collection and demo fixtures cannot produce these events.
export function enqueueAchievements(before: HabitSnapshot, after: HabitSnapshot, queuedAt: string): HabitSnapshot {
  let changed = false;
  const habits = after.habits.map(habit => {
    const old = before.habits.find(item => item.id === habit.id);
    if (!old || habit.archived || isDemoHabit(habit) || !habit.rewards) return habit;
    const delivery = deliveryFor(habit), existing = new Set([...delivery.handled, ...delivery.pending.map(event => event.id)]);
    const additions: AchievementEvent[] = [];
    // One wallpaper reveal per habit/milestone across all reward cycles. Each
    // newly earned cycle badge is distinct and receives its own reveal.
    const seenMilestones = new Set(old.rewards?.wallpapers.map(item => item.days));
    for (const reward of habit.rewards.wallpapers) {
      if (seenMilestones.has(reward.days)) continue;
      seenMilestones.add(reward.days);
      const id = achievementId(habit.id, 'wallpaper', reward.cycle, reward.days);
      if (!existing.has(id)) { existing.add(id); additions.push({ ...reward, id, kind: 'wallpaper', queuedAt }); }
    }
    for (const badge of habit.rewards.badges) {
      if (old.rewards?.badges.some(item => item.id === badge.id)) continue;
      const id = achievementId(habit.id, 'badge', badge.cycle, 90);
      if (!existing.has(id)) { existing.add(id); additions.push({ id, kind: 'badge', cycle: badge.cycle, days: 90, earnedOn: badge.earnedOn, queuedAt }); }
    }
    if (!additions.length) return habit;
    changed = true;
    return { ...habit, rewards: { ...habit.rewards, delivery: { ...delivery, pending: [...delivery.pending, ...additions] } } };
  });
  return changed ? { ...after, habits } : after;
}

export function pendingAchievements(snapshot: HabitSnapshot): Achievement[] {
  return snapshot.habits.filter(habit => !habit.archived && !isDemoHabit(habit)).flatMap(habit => {
    const { id, name, color, icon, emoji, rewards } = habit;
    return deliveryFor(habit).pending.map(event => ({ habit: { id, name, color, icon, ...(emoji ? { emoji } : {}), rewards }, event }));
  }).sort((a, b) => a.event.queuedAt.localeCompare(b.event.queuedAt) || a.event.cycle - b.event.cycle || a.event.days - b.event.days || (a.event.kind === b.event.kind ? 0 : a.event.kind === 'badge' ? 1 : -1));
}

// Persist before displaying. Consumed identities survive relaunch and correction.
// With no id, explicitly dismiss every pending celebration in the snapshot.
export function acknowledgeAchievements(snapshot: HabitSnapshot, id?: string): HabitSnapshot {
  let changed = false;
  const habits = snapshot.habits.map(habit => {
    const delivery = deliveryFor(habit), consumed = delivery.pending.filter(event => !id || event.id === id);
    if (!consumed.length || !habit.rewards) return habit;
    changed = true;
    return { ...habit, rewards: { ...habit.rewards, delivery: { ...delivery, pending: delivery.pending.filter(event => !consumed.includes(event)), handled: [...new Set([...delivery.handled, ...consumed.map(event => event.id)])] } } };
  });
  return changed ? { ...snapshot, habits } : snapshot;
}
