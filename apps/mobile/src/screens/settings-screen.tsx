import Modal from '../components/private-modal';
import { space, layout, control, radius } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import appConfig from '../../app.json';
import { Chevron, HabitIcon } from '../components/habit-ui';
import { PreferenceIcon, type PreferenceSymbol, usePreferenceStyles, PrimaryButton, ProMark, SheetHeader } from '../components/preference-ui';
import SettingsPreferencesScreen from './settings-preferences-screen';
import { DailyReminderSheet } from './daily-reminder-drawer';
import { useAppPreferences } from '../components/app-preferences';
import { LANGUAGES } from '../data/app-preferences';
import { type Habit } from '../data/habit-types';
import { archivedDaysLeft, ARCHIVE_RETENTION_DAYS } from '../data/habit-archive';
import { canAddHabits, hasProAccess } from '../data/pro-access';
import { useProAccess } from '../components/pro-access';
import { useProUpgrade } from '../components/pro-upgrade';
import WallpaperPreview from '../components/wallpaper-preview';
import AppIcon from '../components/app-icon';
import RightDrawer from '../components/right-drawer';
import OnboardingScreen from './onboarding-screen';
import SettingsGuideScreen from './settings-guide-screen';
import ReminderStatus from '../components/reminder-status';
import BackupScreen, { type BackupScreenProps } from './backup-screen';
import PrivacySupportScreen from './privacy-support-screen';
import useHapticsPreference from '../hooks/use-haptics-preference';
import { createThemedStyles, useTheme } from '../components/theme';

type SettingsRow = { label: string; symbol: PreferenceSymbol; color: string; value?: string; onPress?: () => void;
  toggle?: { value: boolean; onValueChange: (value: boolean) => void } };
type SettingsPage = 'theme' | 'archived' | 'reorder' | 'general' | 'overview' | 'language' | 'guide' | 'backup' | 'privacy' | 'support';
const pageTitles: Record<SettingsPage, string> = {
  theme: 'Theme', archived: 'Archived Habits', reorder: 'Reorder Habits', general: 'General', overview: 'Overview', language: 'Language', guide: 'Quick guide', backup: 'Backup & Restore',
  privacy: 'Privacy Policy', support: 'Support',
};
const themeOptions = [
  { name: 'Light', description: 'A bright background with dark text.', shades: ['#F5F2FA'] },
  { name: 'Dark', description: 'A dark background with light text.', shades: ['#262332'] },
  { name: 'System', description: 'Follow your device’s appearance.', shades: ['#F5F2FA', '#262332'] },
] as const;

function SettingsGroup({ title, rows }: { title: string; rows: SettingsRow[] }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors } = useTheme();
  return <View style={shared.section}><Text style={shared.sectionLabel}>{t(title)}</Text><View style={shared.group}>
    {rows.map((row, index) => row.toggle ? <View key={row.label} style={[styles.row, index > 0 && styles.divider]}>
      <PreferenceIcon symbol={row.symbol} color={row.color} /><Text style={styles.rowLabel}>{t(row.label)}</Text>
      <Switch accessibilityLabel={t(row.label)} value={row.toggle.value} onValueChange={row.toggle.onValueChange} trackColor={{ false: colors.controlBorder, true: colors.accent }} thumbColor="#FFFFFF" />
    </View> : <Pressable key={row.label} accessibilityRole="button" accessibilityLabel={`${t(row.label)}${row.value ? `, ${t(row.value)}` : ''}`}
      disabled={!row.onPress} accessibilityState={{ disabled: !row.onPress }} onPress={row.onPress} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
      <PreferenceIcon symbol={row.symbol} color={row.color} /><Text style={styles.rowLabel}>{t(row.label)}</Text>
      {row.value && <Text style={styles.rowValue}>{t(row.value)}</Text>}<Chevron />
    </Pressable>)}
  </View></View>;
}

export default function SettingsScreen({ visible, habits, today, backupTools, initialPage = null, saveError = false, saving = false, onRetrySave, onClose, onShow, onDismiss, onOpenPro, onOpenWallpapers, onRestore, onMove }: {
  visible: boolean;
  habits: Habit[];
  today: Date;
  backupTools?: BackupScreenProps;
  initialPage?: 'archived' | null;
  saveError?: boolean;
  saving?: boolean;
  onRetrySave?: () => Promise<boolean>;
  onClose: () => void;
  onShow?: () => void;
  onDismiss: () => void;
  onOpenPro: () => void;
  onOpenWallpapers: () => void;
  onRestore: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const access = useProAccess(), upgrade = useProUpgrade();
  const hasPro = hasProAccess(access), retentionPaused = access.status !== 'verified';
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors, mode, choice, setChoice } = useTheme();
  const [page, setPage] = useState<SettingsPage | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const lastPage = useRef<SettingsPage>('theme');
  const displayedPage = page ?? lastPage.current;
  const closePage = () => { if (!backupBusy) setPage(null); };
  function openPage(next: SettingsPage) {
    lastPage.current = next;
    setPage(next);
  }
  useEffect(() => { if (visible && initialPage) { lastPage.current = initialPage; setPage(initialPage); } }, [visible, initialPage]);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const haptics = useHapticsPreference();
  const { preferences, update } = useAppPreferences();
  const [remindersOpen, setRemindersOpen] = useState(false);
  const archived = habits.filter((habit) => habit.archived);
  const active = habits.filter((habit) => !habit.archived);
  const scrollPadding = { paddingBottom: Math.max(insets.bottom, 24) + 16 };
  const saveStatus = saveError && <View style={[shared.group, { padding: space.md, gap: space.sm }]}>
    <Text accessibilityRole="alert" style={shared.muted}>{t('Changes haven’t saved yet.')}</Text>
    {onRetrySave && <PrimaryButton disabled={saving} onPress={() => { void onRetrySave(); }}>{t('Retry saving')}</PrimaryButton>}
  </View>;

  function showOnboarding() {
    setOnboardingOpen(true);
  }

  const appRows: SettingsRow[] = [
    { label: 'General', symbol: 'gear', color: '#EE7CB7', onPress: () => openPage('general') },
    { label: 'Haptic feedback', symbol: 'pulse', color: '#AA95E9', toggle: { value: haptics.enabled, onValueChange: haptics.setEnabled } },
    { label: 'Overview', symbol: 'grid', color: '#37CDBF', onPress: () => openPage('overview') },
    { label: 'Daily Check-In Reminders', symbol: 'bell', color: '#2BC9DF', value: preferences.dailyReminder.enabled ? 'On' : 'Off', onPress: () => setRemindersOpen(true) },
    { label: 'Theme', symbol: 'palette', color: '#E9BC33', value: choice, onPress: () => openPage('theme') },
    { label: 'Language', symbol: 'language', color: '#AA8EEA', value: LANGUAGES.find((language) => language.id === preferences.language)?.name, onPress: () => openPage('language') },
    { label: 'Archived Habits', symbol: 'archive', color: '#39CBA5', value: archived.length ? String(archived.length) : undefined, onPress: () => openPage('archived') },
    { label: 'Backup & Restore', symbol: 'cloud', color: '#37BDEB', onPress: () => openPage('backup') },
    { label: 'iCloud Sync', symbol: 'cloud', color: '#72ACF4', value: 'Coming soon', onPress: () => {
      if (upgrade.request('icloud-sync')) Alert.alert(t('iCloud Sync'), t('Optional cross-device iCloud sync is planned for Pro.'));
    } },
    { label: 'Reorder Habits', symbol: 'list', color: '#F07782', onPress: () => openPage('reorder') },
  ];
  const helpRows: SettingsRow[] = [
    { label: 'Quick guide', symbol: 'list', color: '#36C9A0', onPress: () => openPage('guide') },
    { label: 'Support', symbol: 'send', color: '#72ACF4', onPress: () => openPage('support') },
    { label: 'Privacy Policy', symbol: 'lock', color: '#EE82B9', onPress: () => openPage('privacy') },
    { label: 'Show Onboarding', symbol: 'onboarding', color: '#F29949', onPress: showOnboarding },
    { label: "Show What's New", symbol: 'news', color: '#72ACF4', onPress: () => Alert.alert(t("What's new"), t('Collect wallpapers at streak milestones, earn permanent 90-day champion badges, and share your wins. Your habits and rewards now save on this device.')) },
  ];

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
    allowSwipeDismissal={!backupBusy} onShow={onShow} onRequestClose={backupBusy ? () => {} : Platform.OS === 'android' && page ? closePage : onClose} onDismiss={() => {
      closePage();
      onDismiss();
    }}>
    <View style={shared.screen} onAccessibilityEscape={page ? closePage : onClose}>
      <View style={shared.screen} accessibilityElementsHidden={page !== null} importantForAccessibility={page ? 'no-hide-descendants' : 'auto'}>
        <SheetHeader title={t("Settings")} onClose={onClose} />
        <ScrollView style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, scrollPadding]}>
          <View style={shared.content}>
            {saveStatus}
            <View style={styles.proCard}>
              <View style={styles.proHeading}><ProMark /><View style={styles.proCopy}>
                <Text style={styles.proTitle}>Habit Tracker <Text style={styles.proAccent}>Pro</Text></Text>
                <Text style={shared.muted}>{t('Unlimited habits, analytics and earned wallpaper exports')}</Text>
              </View></View>
              <PrimaryButton onPress={onOpenPro} trailingIcon="chevron-right">{t("Get Habit Tracker Pro")}</PrimaryButton>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setWallpaperOpen(true)} style={({ pressed }) => [styles.discover, pressed && styles.pressed]}>
              <PreferenceIcon symbol="sparkle" color="#B9A2F9" /><View style={styles.discoverCopy}>
                <Text style={styles.discoverTitle}>{t("Streak-based wallpapers")}</Text><Text style={styles.discoverSubtitle}>{t("Earn your first at 7 days. Collect your wins.")}</Text>
              </View><Chevron />
            </Pressable>
            <SettingsGroup title={t("APP")} rows={appRows} />
            <ReminderStatus />
            <SettingsGroup title={t("HELP")} rows={helpRows} />
            <View style={styles.version}><Text style={styles.versionText}>Habit Tracker {appConfig.expo.version}</Text><Text style={styles.versionText}>{t("Made for small, daily wins.")}</Text></View>
          </View>
        </ScrollView>
      </View>
      <RightDrawer inline dismissDisabled={backupBusy} visible={page !== null} onRequestClose={closePage}>
        <SheetHeader disabled={backupBusy} title={pageTitles[displayedPage]} onClose={closePage} onBack={closePage} />
        <ScrollView keyboardShouldPersistTaps="handled" key={displayedPage} style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, scrollPadding]}>
          <View style={shared.content}>
            {saveStatus}
            {displayedPage === 'privacy' || displayedPage === 'support' ? <PrivacySupportScreen page={displayedPage} /> : displayedPage === 'backup' && backupTools ? <BackupScreen {...backupTools} onBusyChange={setBackupBusy} /> : displayedPage === 'guide' ? <SettingsGuideScreen /> : displayedPage === 'general' || displayedPage === 'overview' || displayedPage === 'language' ? <SettingsPreferencesScreen page={displayedPage} /> : displayedPage === 'theme' ? <>
              <Text style={shared.muted}>{t("Choose an appearance for Habit Tracker.")}</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel={t("App appearance")} style={shared.group}>
                {themeOptions.map(({ name, description, shades }, index) => <Pressable key={name} accessibilityRole="radio"
                  accessibilityLabel={`${t(name)}. ${t(description)}`} accessibilityState={{ checked: choice === name }}
                  onPress={() => setChoice(name)} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
                  <View accessible={false} style={styles.themeSwatch}>
                    {shades.map((shade) => <View key={shade} style={[styles.swatchShade, { backgroundColor: shade }]} />)}
                    <View style={styles.swatchAccent} />
                  </View>
                  <View style={styles.rowCopy}><Text style={styles.itemTitle}>{t(name)}</Text><Text style={shared.muted}>{t(description)}</Text></View>
                  <View style={[styles.radio, choice === name && styles.checkedRadio]}>{choice === name && <View style={styles.radioDot} />}</View>
                </Pressable>)}
              </View>
            </> : displayedPage === 'archived' ? <>
              <View style={[shared.group, styles.retention]}>
                <PreferenceIcon symbol="archive" color="#39CBA5" />
                <View style={styles.rowCopy}>
                  <Text style={styles.itemTitle}>{retentionPaused ? t('Archive cleanup paused') : hasPro ? t('Kept with Pro') : t("{value0}-day recovery window", { value0: ARCHIVE_RETENTION_DAYS })}</Text>
                  <Text style={shared.muted}>{retentionPaused ? t('Nothing is deleted while purchase status cannot be verified.') : hasPro ? t('Your archived habits stay here while you have Pro.') : t('Free archives expire after 30 days. After Pro ends, protected archives get a fresh 30-day recovery window.')}</Text>
                </View>
              </View>
              {archived.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{t("No archived habits")}</Text><Text style={shared.muted}>{t("Habits you delete will appear here.")}</Text></View>
                : <View style={shared.group}>{archived.map((habit, index) => {
                  const daysLeft = archivedDaysLeft(habit, today);
                  return <View key={habit.id} style={[styles.row, index > 0 && styles.divider]}>
                    <HabitIcon habit={habit} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.itemTitle}>{habit.name}</Text>
                      <Text style={shared.muted}>{retentionPaused ? t('Archive cleanup paused') : hasPro ? t('No expiry') : t("{count} days left", { count: daysLeft })}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("Restore {value0}", { value0: habit.name })} accessibilityHint={t("Restores its check-ins and notes")}
                      onPress={() => { if (!canAddHabits({ habits, retainedCollections: [] }, 1, access)) { upgrade.explain('active-habits'); return; } onRestore(habit.id); }} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}><Text style={styles.restoreText}>{t("Restore")}</Text></Pressable>
                  </View>;
                })}</View>}
            </> : <>
              <Text style={shared.muted}>{t("Use the arrows to change the order of your habits in all three home views.")}</Text>
              {active.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{t("No active habits")}</Text><Text style={shared.muted}>{t("Add or restore a habit to arrange it here.")}</Text></View>
                : <View style={shared.group}>{active.map((habit, index) => <View key={habit.id} style={[styles.row, index > 0 && styles.divider]}>
                  <HabitIcon habit={habit} /><Text style={styles.rowLabel}>{habit.name}</Text>
                  {([-1, 1] as const).map((direction) => {
                    const disabled = direction === -1 ? index === 0 : index === active.length - 1;
                    return <Pressable key={direction} accessibilityRole="button" accessibilityLabel={t("Move {value0} {value1}", { value0: habit.name, value1: t(direction === -1 ? 'up' : 'down') })}
                      disabled={disabled} accessibilityState={{ disabled }} onPress={() => onMove(habit.id, direction)} style={[styles.move, disabled && styles.disabled]}>
                      <AppIcon name={direction === -1 ? 'chevron-up' : 'chevron-down'} size={19} />
                    </Pressable>;
                  })}
                </View>)}</View>}
            </>}
          </View>
        </ScrollView>
      </RightDrawer>
      <DailyReminderSheet visible={remindersOpen} initial={preferences.dailyReminder} onSave={(dailyReminder) => update({ dailyReminder })} onClose={() => setRemindersOpen(false)} />
      {upgrade.sheet}
      <WallpaperPreview visible={wallpaperOpen} onClose={() => setWallpaperOpen(false)} onExplore={onOpenWallpapers} />
      <Modal visible={onboardingOpen} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
        allowSwipeDismissal onRequestClose={() => setOnboardingOpen(false)}>
        <OnboardingScreen onContinue={() => setOnboardingOpen(false)} />
      </Modal>
    </View>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  proCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', padding: layout.inset, gap: space.md },
  proHeading: { flexDirection: 'row', alignItems: 'center', gap: space.md }, proCopy: { flex: 1, gap: space.xs }, proTitle: { color: colors.text, fontSize: 23, fontWeight: '700' }, proAccent: { color: colors.accentText },
  discover: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', padding: layout.inset, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  discoverCopy: { flex: 1, gap: space.xxs }, discoverTitle: { color: colors.text, fontSize: 16, fontWeight: '600' }, discoverSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  row: { minHeight: control.row, paddingHorizontal: layout.inset, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, rowLabel: { flex: 1, color: colors.text, fontSize: 16 }, rowValue: { color: colors.muted, fontSize: 14 },
  rowCopy: { flex: 1, gap: space.xxs }, itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  retention: { flexDirection: 'row', alignItems: 'flex-start', padding: layout.inset, gap: space.sm },
  themeSwatch: { width: 48, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.controlBorder, overflow: 'hidden', flexDirection: 'row', justifyContent: 'center' },
  swatchShade: { flex: 1 }, swatchAccent: { position: 'absolute', top: 12, width: 20, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  checkedRadio: { borderColor: colors.accentText }, radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accentText },
  version: { paddingTop: 2, gap: 4, alignItems: 'center' }, versionText: { color: colors.subtle, fontSize: 13, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  restore: { minHeight: control.touch, justifyContent: 'center', paddingHorizontal: space.xs }, restoreText: { color: colors.accentText, fontSize: 14, fontWeight: '600' },
  move: { width: control.touch, height: control.touch, borderRadius: control.touch / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.25 },
}));
