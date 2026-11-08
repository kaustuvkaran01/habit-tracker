import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { PrimaryButton, usePreferenceStyles } from '../components/preference-ui';
import { createThemedStyles, useTheme } from '../components/theme';
import { control, radius, space } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useReminders } from '../components/reminders';
import { backupSummary, type HabitBackup, type RestoreMode } from '../data/habit-backup';
import { type HabitSnapshot } from '../data/habit-archive';
import { exportBackupFile, pickBackupFile } from '../services/backup-files';

export type BackupScreenProps = { snapshot: HabitSnapshot | null; canExport: boolean;
  onRestore: (backup: HabitBackup, mode: RestoreMode) => Promise<boolean>; onErase: () => Promise<void>; onBusyChange?: (busy: boolean) => void };
export default function BackupScreen({ snapshot, canExport, onRestore, onErase, onBusyChange }: BackupScreenProps) {
  const { t, locale } = useTranslation(), { colors, mode } = useTheme(), styles = useStyles(), shared = usePreferenceStyles();
  const reminders = useReminders(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Awaited<ReturnType<typeof pickBackupFile>>>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('add-missing');
  const [erasing, setErasing] = useState(false), [confirmation, setConfirmation] = useState('');
  async function perform(action: () => Promise<void>, failure: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusyChange?.(true); setError(null); setMessage(null);
    try { await action(); } catch { setError(failure); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  function exportFile() {
    if (!snapshot || !canExport) return;
    void perform(async () => {
      await exportBackupFile(snapshot, new Date(), t('Export backup'));
      setMessage('The share sheet closed. Check that your backup was saved in your chosen destination.');
    }, 'Could not export the backup. Your habits have not changed.');
  }
  function selectFile() {
    void perform(async () => {
      const result = await pickBackupFile().catch(error => { setSelected(null); throw error; });
      if (result) { setSelected(result); setRestoreMode(snapshot ? 'add-missing' : 'replace'); }
    }, 'Could not read this backup. Choose a valid Habit Tracker backup under 20 MB.');
  }
  function restore() {
    if (!selected || busy) return;
    const backup = selected.backup, chosenMode = restoreMode;
    Alert.alert(t(chosenMode === 'replace' ? 'Replace local habits?' : 'Add missing habits?'),
      t(chosenMode === 'replace' ? 'This replaces all local habits, entries, notes and earned collections with this backup. Export your current data first if you want to keep it.' : 'Existing copies stay unchanged. Only missing habits and collections are added.'), [
        { text: t('Cancel'), style: 'cancel' }, { text: t('Restore backup'), style: chosenMode === 'replace' ? 'destructive' : 'default', onPress: () => {
          void perform(async () => {
            if (!(await onRestore(backup, chosenMode))) throw Error('Restore failed');
            setSelected(null); setMessage('Backup restored. Imported reminders are paused until you enable them.');
          }, 'Could not restore the backup. Your existing data stays available.');
        } },
      ]);
  }
  const summary = selected ? backupSummary(selected.backup.snapshot) : null;
  const existing = new Set([...(snapshot?.habits ?? []), ...(snapshot?.retainedCollections ?? [])].map(item => item.id));
  const duplicates = selected ? [...selected.backup.snapshot.habits, ...selected.backup.snapshot.retainedCollections].filter(item => existing.has(item.id)).length : 0;
  return <View style={{ gap: space.lg }}>
    <Text style={shared.muted}>{t('Backups include habits, entries, notes, schedules and earned rewards. Device preferences and notification permission stay on this device.')}</Text>
    <Text style={shared.muted}>{t('Backups include private notes. Keep the file somewhere you trust.')}</Text>
    <View style={styles.group}>
      <PrimaryButton disabled={busy || !canExport || !snapshot} onPress={exportFile}>{t('Export backup')}</PrimaryButton>
      {!canExport && <Text style={shared.muted}>{t('Save or retry your changes before exporting a backup.')}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={selectFile} style={styles.secondary}><Text style={styles.action}>{t('Choose backup file')}</Text></Pressable>
    </View>
    {selected && summary && <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.title}>{t('Review backup')}</Text>
      <Text style={shared.muted}>{selected.name}</Text>
      <Text style={shared.muted}>{selected.backup.exportedAt ? new Date(selected.backup.exportedAt).toLocaleString(locale) : t('Older-format backup')}</Text>
      <Text style={shared.muted}>{t('Habits: {value0} · Archived: {value1} · Retained collections: {value2}', { value0: summary.habits, value1: summary.archived, value2: summary.collections })}</Text>
      <Text style={shared.muted}>{t('Entries: {value0} · Notes: {value1} · Badges: {value2}', { value0: summary.entries, value1: summary.notes, value2: summary.badges })}</Text>
      <Text style={shared.muted}>{t('Existing copies kept when adding: {value0}', { value0: duplicates })}</Text>
      <Text style={shared.muted}>{t('Imported reminders start paused. Earned rewards stay saved without replaying celebrations. Extra habits stay visible under the Free logging allowance.')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('Restore option')}>
        {(['add-missing','replace'] as const).map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ checked: restoreMode === choice, disabled: busy || (choice === 'add-missing' && !snapshot) }} disabled={busy || (choice === 'add-missing' && !snapshot)}
          onPress={() => setRestoreMode(choice)} style={[styles.option, restoreMode === choice && { borderColor: colors.accent }]}><Text style={styles.action}>{choice === 'add-missing' ? t('Add missing habits') : t('Replace local habits')}</Text></Pressable>)}
      </View>
      <PrimaryButton disabled={busy} onPress={restore}>{t('Restore backup')}</PrimaryButton>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => setSelected(null)} style={styles.secondary}><Text style={styles.action}>{t('Cancel')}</Text></Pressable>
    </View>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
    {message && <Text accessibilityRole="alert" style={shared.muted}>{t(message)}</Text>}
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.title}>{t('Erase all local data')}</Text>
      <Text style={shared.muted}>{t('This permanently removes all habits, notes, rewards and preferences from this app.')}</Text>
      <Text style={shared.muted}>{t('Archiving a habit keeps recovery data and earned rewards. Erasing all local data removes them. Exported files outside this app are not deleted.')}</Text>
      {erasing ? <>
        <TextInput accessibilityLabel={t('Type {value0} to confirm', { value0: 'ERASE' })} value={confirmation} editable={!busy} onChangeText={setConfirmation}
          autoCapitalize="characters" autoCorrect={false} keyboardAppearance={mode} placeholder="ERASE" placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={shared.muted}>{t('Type {value0} to confirm', { value0: 'ERASE' })}</Text>
        <Pressable accessibilityRole="button" disabled={busy || confirmation !== 'ERASE'} accessibilityState={{ disabled: busy || confirmation !== 'ERASE' }} onPress={() => {
          if (confirmation !== 'ERASE') return;
          void perform(async () => { await reminders.prepareForErase(); await onErase(); }, 'Could not finish erasing local data. Retry cleanup.');
        }} style={styles.secondary}><Text style={styles.error}>{t('Permanently erase local data')}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setErasing(false); setConfirmation(''); }} style={styles.secondary}><Text style={styles.action}>{t('Cancel')}</Text></Pressable>
      </> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => setErasing(true)} style={styles.secondary}><Text style={styles.error}>{t('Erase all local data')}</Text></Pressable>}
    </View>
  </View>;
}
const useStyles = createThemedStyles(colors => StyleSheet.create({
  group: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' }, action: { color: colors.accentText, fontSize: 15, textAlign: 'center' },
  error: { color: colors.error, fontSize: 14, lineHeight: 21 }, secondary: { minHeight: control.touch, padding: space.xs, alignItems: 'center', justifyContent: 'center' },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, minHeight: control.regular, justifyContent: 'center', padding: space.sm, marginTop: space.xs },
  input: { minHeight: control.primary, padding: space.md, borderRadius: radius.control, backgroundColor: colors.raised, color: colors.text, fontSize: 16 },
}));
