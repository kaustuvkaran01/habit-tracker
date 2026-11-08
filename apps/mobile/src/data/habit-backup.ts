import { decodeHabits, encodeHabits } from './habit-storage';
import { type HabitSnapshot } from './habit-archive';
import { type HabitRewards } from './habit-rewards';
import { dateKey } from './habit-calendar';
import { reconcileFreeHabits, type Entitlement } from './pro-access';

export const BACKUP_FORMAT = 'habit-tracker-backup';
export const BACKUP_MAX_BYTES = 20 * 1024 * 1024;
export type HabitBackup = { format: typeof BACKUP_FORMAT; version: 1; exportedAt: string | null; snapshot: HabitSnapshot };
export type RestoreMode = 'add-missing' | 'replace';

function byteLength(raw: string) {
  // UTF-8 byte count, including supplementary emoji, without Intl/TextEncoder.
  let count = 0;
  for (const character of raw) { const code = character.codePointAt(0)!; count += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4; }
  return count;
}
export function encodeBackup(snapshot: HabitSnapshot, exportedAt: Date) {
  const data = JSON.parse(encodeHabits(snapshot));
  const raw = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: exportedAt.toISOString(), data });
  if (byteLength(raw) > BACKUP_MAX_BYTES) throw Error('Backup exceeds the supported file size.');
  return raw;
}
export function decodeBackup(raw: string): HabitBackup {
  if (raw.length > BACKUP_MAX_BYTES || byteLength(raw) > BACKUP_MAX_BYTES) throw Error('Backup exceeds the supported file size.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid backup file.');
  if ('format' in value) {
    if (value.format !== BACKUP_FORMAT || !('version' in value) || value.version !== 1 || !('data' in value)
      || !('exportedAt' in value) || typeof value.exportedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.exportedAt) || !Number.isFinite(Date.parse(value.exportedAt))) throw Error('Unsupported backup format.');
    return { format: BACKUP_FORMAT, version: 1, exportedAt: value.exportedAt, snapshot: decodeHabits(JSON.stringify(value.data)) };
  }
  // Earlier app snapshots use a v1/v2 habit envelope. Decode through the same
  // validator/migration instead of accepting arbitrary arrays or foreign files.
  return { format: BACKUP_FORMAT, version: 1, exportedAt: null, snapshot: decodeHabits(raw) };
}
export function backupSummary(snapshot: HabitSnapshot) {
  return { habits: snapshot.habits.length, archived: snapshot.habits.filter(habit => habit.archived).length,
    entries: snapshot.habits.reduce((sum, habit) => sum + (habit.entries ? Object.values(habit.entries).reduce((n, records) => n + records.length, 0) : habit.checkIns.length), 0),
    notes: snapshot.habits.reduce((sum, habit) => sum + Object.keys(habit.notes).length, 0),
    collections: snapshot.retainedCollections.length,
    badges: [...snapshot.habits, ...snapshot.retainedCollections].reduce((sum, item) => sum + (item.rewards?.badges.length ?? 0), 0) };
}
function quietRewards(rewards: HabitRewards | undefined) {
  if (!rewards?.delivery) return rewards;
  return { ...rewards, delivery: { ...rewards.delivery, pending: [], handled: [...new Set([...rewards.delivery.handled, ...rewards.delivery.pending.map(event => event.id)])] } };
}
export function restoreBackup(current: HabitSnapshot | null, backup: HabitBackup, mode: RestoreMode, today: Date, access: Entitlement) {
  // Validate again at commit time; the preview is never a capability grant.
  if (backup.format !== BACKUP_FORMAT || backup.version !== 1 || (backup.exportedAt !== null && (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))))) throw Error('Unsupported backup format.');
  const imported = decodeHabits(encodeHabits(backup.snapshot));
  const habits = imported.habits.map(habit => ({ ...habit, remindersPaused: true,
    ...(habit.archived ? { archiveProtected: false, archiveRecoveryOn: dateKey(today) } : {}),
    ...(habit.rewards ? { rewards: quietRewards(habit.rewards) } : {}) }));
  const retainedCollections = imported.retainedCollections.map(item => ({ ...item, rewards: quietRewards(item.rewards)! }));
  let next: HabitSnapshot = { habits, retainedCollections };
  if (mode === 'add-missing') {
    if (!current) throw Error('Existing habits must load before adding a backup.');
    const ids = new Set([...current.habits, ...current.retainedCollections].map(item => item.id));
    next = { ...current, habits: [...current.habits, ...habits.filter(item => !ids.has(item.id))],
      retainedCollections: [...current.retainedCollections, ...retainedCollections.filter(item => !ids.has(item.id))] };
  } else if (mode !== 'replace') throw Error('Choose a restore option.');
  return reconcileFreeHabits(next, access);
}
