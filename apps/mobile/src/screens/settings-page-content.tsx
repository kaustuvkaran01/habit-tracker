import { StyleSheet, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { HabitIcon } from '../components/habit-ui';
import AppIcon from '../components/app-icon';
import { PreferenceIcon, usePreferenceStyles } from '../components/preference-ui';
import { control, layout, space } from '../components/design-tokens';
import { createThemedStyles, useTheme } from '../components/theme';
import { useTranslation } from '../i18n/context';
import { archivedDaysLeft, ARCHIVE_RETENTION_DAYS } from '../data/habit-archive';
import { hasProAccess, type Entitlement } from '../data/pro-access';
import { type Habit } from '../data/habit-types';
import BackupScreen, { type BackupScreenProps } from './backup-screen';
import SettingsGuideScreen from './settings-guide-screen';
import SettingsPreferencesScreen from './settings-preferences-screen';
import PrivacySupportScreen from './privacy-support-screen';

export const SETTINGS_PAGE_TITLES = {
  theme: 'Theme', archived: 'Archived Habits', reorder: 'Reorder Habits', general: 'General', overview: 'Overview', language: 'Language',
  guide: 'Quick guide', backup: 'Backup & Restore', privacy: 'Privacy Policy', support: 'Support',
} as const;
export type SettingsPage = keyof typeof SETTINGS_PAGE_TITLES;
type Props = { page: SettingsPage; habits: Habit[]; today: Date; access: Entitlement; backupTools?: BackupScreenProps;
  onBackupBusyChange: (busy: boolean) => void; onRestore: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void };

// Exhaustive routing: a missing/new page cannot silently display reorder tools.
// Navigation and retained dismissal content remain owned by SettingsScreen.
export default function SettingsPageContent(props: Props) {
  switch (props.page) {
    case 'privacy': case 'support': return <PrivacySupportScreen page={props.page} />;
    case 'general': case 'overview': case 'language': return <SettingsPreferencesScreen page={props.page} />;
    case 'guide': return <SettingsGuideScreen />;
    case 'backup': return props.backupTools ? <BackupScreen {...props.backupTools} onBusyChange={props.onBackupBusyChange} /> : null;
    case 'theme': return <AppearanceSettings />;
    case 'archived': return <ArchivedSettings habits={props.habits} today={props.today} access={props.access} onRestore={props.onRestore} />;
    case 'reorder': return <ReorderSettings habits={props.habits} onMove={props.onMove} />;
    default: { const unhandled: never = props.page; return unhandled; }
  }
}

const themeOptions = [
  { name: 'Light', description: 'A bright background with dark text.', shades: ['#F5F2FA'] },
  { name: 'Dark', description: 'A dark background with light text.', shades: ['#262332'] },
  { name: 'System', description: 'Follow your device’s appearance.', shades: ['#F5F2FA', '#262332'] },
] as const;
function AppearanceSettings() {
  const { t } = useTranslation(), styles = useStyles(), shared = usePreferenceStyles(), { choice, setChoice } = useTheme();
  return <>
    <Text style={shared.muted}>{t('Choose an appearance for Habit Tracker.')}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('App appearance')} style={shared.group}>
      {themeOptions.map(({ name, description, shades }, index) => <Pressable key={name} accessibilityRole="radio"
        accessibilityLabel={`${t(name)}. ${t(description)}`} accessibilityState={{ checked: choice === name }}
        onPress={() => setChoice(name)} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
        <View accessible={false} style={styles.themeSwatch}>
          {shades.map(shade => <View key={shade} style={[styles.swatchShade, { backgroundColor: shade }]} />)}<View style={styles.swatchAccent} />
        </View>
        <View style={styles.rowCopy}><Text style={styles.itemTitle}>{t(name)}</Text><Text style={shared.muted}>{t(description)}</Text></View>
        <View style={[styles.radio, choice === name && styles.checkedRadio]}>{choice === name && <View style={styles.radioDot} />}</View>
      </Pressable>)}
    </View>
  </>;
}

function ArchivedSettings({ habits, today, access, onRestore }: Pick<Props, 'habits' | 'today' | 'access' | 'onRestore'>) {
  const { t } = useTranslation(), styles = useStyles(), shared = usePreferenceStyles();
  const archived = habits.filter(habit => habit.archived), hasPro = hasProAccess(access), retentionPaused = access.status !== 'verified';
  return <>
    <View style={[shared.group, styles.retention]}>
      <PreferenceIcon symbol="archive" color="#39CBA5" />
      <View style={styles.rowCopy}>
        <Text style={styles.itemTitle}>{retentionPaused ? t('Archive cleanup paused') : hasPro ? t('Kept with Pro') : t('{value0}-day recovery window', { value0: ARCHIVE_RETENTION_DAYS })}</Text>
        <Text style={shared.muted}>{retentionPaused ? t('Nothing is deleted while purchase status cannot be verified.') : hasPro ? t('Your archived habits stay here while you have Pro.') : t('Free archives expire after 30 days. After Pro ends, protected archives get a fresh 30-day recovery window.')}</Text>
      </View>
    </View>
    {archived.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{t('No archived habits')}</Text><Text style={shared.muted}>{t('Habits you delete will appear here.')}</Text></View>
      : <View style={shared.group}>{archived.map((habit, index) => <View key={habit.id} style={[styles.row, index > 0 && styles.divider]}>
        <HabitIcon habit={habit} />
        <View style={styles.rowCopy}><Text style={styles.itemTitle}>{habit.name}</Text>
          <Text style={shared.muted}>{retentionPaused ? t('Archive cleanup paused') : hasPro ? t('No expiry') : t('{count} days left', { count: archivedDaysLeft(habit, today) })}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Restore {value0}', { value0: habit.name })} accessibilityHint={t('Restores its check-ins and notes')}
          onPress={() => onRestore(habit.id)} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}><Text style={styles.restoreText}>{t('Restore')}</Text></Pressable>
      </View>)}</View>}
  </>;
}

function ReorderSettings({ habits, onMove }: Pick<Props, 'habits' | 'onMove'>) {
  const { t } = useTranslation(), styles = useStyles(), shared = usePreferenceStyles();
  const active = habits.filter(habit => !habit.archived);
  return <>
    <Text style={shared.muted}>{t('Use the arrows to change the order of your habits in all three home views.')}</Text>
    {active.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{t('No active habits')}</Text><Text style={shared.muted}>{t('Add or restore a habit to arrange it here.')}</Text></View>
      : <View style={shared.group}>{active.map((habit, index) => <View key={habit.id} style={[styles.row, index > 0 && styles.divider]}>
        <HabitIcon habit={habit} /><Text style={styles.rowLabel}>{habit.name}</Text>
        {([-1, 1] as const).map(direction => {
          const disabled = direction === -1 ? index === 0 : index === active.length - 1;
          return <Pressable key={direction} accessibilityRole="button" accessibilityLabel={t('Move {value0} {value1}', { value0: habit.name, value1: t(direction === -1 ? 'up' : 'down') })}
            disabled={disabled} accessibilityState={{ disabled }} onPress={() => onMove(habit.id, direction)} style={[styles.move, disabled && styles.disabled]}>
            <AppIcon name={direction === -1 ? 'chevron-up' : 'chevron-down'} size={19} />
          </Pressable>;
        })}
      </View>)}</View>}
  </>;
}
const useStyles = createThemedStyles(colors => StyleSheet.create({
  row: { minHeight: control.row, paddingHorizontal: layout.inset, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, rowLabel: { flex: 1, color: colors.text, fontSize: 16 },
  rowCopy: { flex: 1, gap: space.xxs }, itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' }, retention: { flexDirection: 'row', alignItems: 'flex-start', padding: layout.inset, gap: space.sm },
  themeSwatch: { width: 48, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.controlBorder, overflow: 'hidden', flexDirection: 'row', justifyContent: 'center' },
  swatchShade: { flex: 1 }, swatchAccent: { position: 'absolute', top: 12, width: 20, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  checkedRadio: { borderColor: colors.accentText }, radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accentText },
  empty: { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  restore: { minHeight: control.touch, justifyContent: 'center', paddingHorizontal: space.xs }, restoreText: { color: colors.accentText, fontSize: 14, fontWeight: '600' },
  move: { width: control.touch, height: control.touch, borderRadius: control.touch / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.25 },
}));
