import { type HabitSymbolName } from './habit-icons';
import { type HabitRewards } from './habit-rewards';

export type HabitIconName = HabitSymbolName | 'emoji';
export type HabitConfiguration = {
  habitType: 'build' | 'quit'; repeatDays: number[];
  tracking: { kind: 'yes-no' | 'count' | 'measure'; target?: number; unit?: string; onTap?: 'add-one' | 'enter-total' };
};
export type EntryValue = { kind: 'yes-no'; complete: boolean } | { kind: 'amount'; amount: number } | { kind: 'clear' } | { kind: 'legacy-complete' };
export type RecordingContext = { id: string; recordedAt: string; occurredAt: string | null; timezone: string | null; utcOffsetMinutes: number };
export type DayRecord = {
  id: string; value: EntryValue; configuration: HabitConfiguration;
  recordedAt: string | null; occurredAt: string | null; timezone: string | null; utcOffsetMinutes: number | null; source: 'user' | 'legacy';
};
export type Habit = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: HabitIconName;
  emoji?: string;
  habitType?: 'build' | 'quit';
  repeatDays?: number[];
  tracking?: { kind: 'yes-no' | 'count' | 'measure'; target?: number; unit?: string; onTap?: 'add-one' | 'enter-total' };
  reminderTime?: string | null;
  reminderTimes?: string[];
  reminderDiscreet?: boolean;
  remindersPaused?: boolean;
  categories?: string[];
  createdOn?: string;
  demo?: boolean;
  archived?: boolean;
  archivedOn?: string;
  archiveProtected?: boolean;
  archiveRecoveryOn?: string;
  // Compatibility projection; daily records are authoritative once present.
  checkIns: string[];
  entries?: Record<string, DayRecord[]>;
  configurationHistory?: { effectiveOn: string | null; configuration: HabitConfiguration }[];
  notes: Record<string, string>;
  rewards?: HabitRewards;
};
