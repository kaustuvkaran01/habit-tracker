import Modal from '../components/private-modal';
import { space, layout, control, radius } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import appConfig from '../../app.json';
import { Chevron } from '../components/habit-ui';
import { PreferenceIcon, type PreferenceSymbol, usePreferenceStyles, PrimaryButton, ProMark, SheetHeader } from '../components/preference-ui';
import { DailyReminderSheet } from './daily-reminder-drawer';
import { useAppPreferences } from '../components/app-preferences';
import { LANGUAGES } from '../data/app-preferences';
import { type Habit } from '../data/habit-types';
import { canAddHabits } from '../data/pro-access';
import { useProAccess } from '../components/pro-access';
import { useProUpgrade } from '../components/pro-upgrade';
import WallpaperPreview from '../components/wallpaper-preview';
import RightDrawer from '../components/right-drawer';
import OnboardingScreen from './onboarding-screen';
import ReminderStatus from '../components/reminder-status';
import { type BackupScreenProps } from './backup-screen';
import SettingsPageContent, { SETTINGS_PAGE_TITLES, type SettingsPage } from './settings-page-content';
import useHapticsPreference from '../hooks/use-haptics-preference';
import { createThemedStyles, useTheme } from '../components/theme';

type SettingsRow = { label: string; symbol: PreferenceSymbol; color: string; value?: string; onPress?: () => void;
  toggle?: { value: boolean; onValueChange: (value: boolean) => void } };
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
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors, mode, choice } = useTheme();
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
        <SheetHeader disabled={backupBusy} title={SETTINGS_PAGE_TITLES[displayedPage]} onClose={closePage} onBack={closePage} />
        <ScrollView keyboardShouldPersistTaps="handled" key={displayedPage} style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, scrollPadding]}>
          <View style={shared.content}>
            {saveStatus}
            <SettingsPageContent page={displayedPage} habits={habits} today={today} access={access} backupTools={backupTools}
              onBackupBusyChange={setBackupBusy} onMove={onMove} onRestore={(id) => {
                if (!canAddHabits({ habits, retainedCollections: [] }, 1, access)) { upgrade.explain('active-habits'); return; }
                onRestore(id);
              }} />
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
  version: { paddingTop: 2, gap: 4, alignItems: 'center' }, versionText: { color: colors.subtle, fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.65 },
}));
