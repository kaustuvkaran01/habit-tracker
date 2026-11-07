import { useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import appConfig from '../../app.json';
import { Chevron, HabitIcon, previewNotice } from '../components/habit-ui';
import { PreferenceIcon, type PreferenceSymbol, usePreferenceStyles, PrimaryButton, ProMark, SheetHeader } from '../components/preference-ui';
import { type Habit } from '../data/sample-habits';
import { archiveDaysLeft, ARCHIVE_RETENTION_DAYS } from '../data/habit-archive';
import WallpaperPreview from '../components/wallpaper-preview';
import AppIcon from '../components/app-icon';
import RightDrawer from '../components/right-drawer';
import OnboardingScreen from './onboarding-screen';
import useHapticsPreference from '../hooks/use-haptics-preference';
import { createThemedStyles, useTheme } from '../components/theme';

type SettingsRow = { label: string; symbol: PreferenceSymbol; color: string; value?: string; onPress?: () => void;
  toggle?: { value: boolean; onValueChange: (value: boolean) => void } };
type SettingsPage = 'theme' | 'archived' | 'reorder';
const pageTitles: Record<SettingsPage, string> = {
  theme: 'Theme', archived: 'Archived Habits', reorder: 'Reorder Habits',
};
const themeOptions = [
  { name: 'Light', description: 'A bright background with dark text.', shades: ['#F5F2FA'] },
  { name: 'Dark', description: 'A dark background with light text.', shades: ['#262332'] },
  { name: 'System', description: 'Follow your device’s appearance.', shades: ['#F5F2FA', '#262332'] },
] as const;

function SettingsGroup({ title, rows }: { title: string; rows: SettingsRow[] }) {
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors } = useTheme();
  return <View style={shared.section}><Text style={shared.sectionLabel}>{title}</Text><View style={shared.group}>
    {rows.map((row, index) => row.toggle ? <View key={row.label} style={[styles.row, index > 0 && styles.divider]}>
      <PreferenceIcon symbol={row.symbol} color={row.color} /><Text style={styles.rowLabel}>{row.label}</Text>
      <Switch accessibilityLabel={row.label} value={row.toggle.value} onValueChange={row.toggle.onValueChange} trackColor={{ false: colors.controlBorder, true: colors.accent }} thumbColor="#FFFFFF" />
    </View> : <Pressable key={row.label} accessibilityRole="button" accessibilityLabel={`${row.label}${row.value ? `, ${row.value}` : ''}`}
      onPress={row.onPress ?? (() => previewNotice(row.label))} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
      <PreferenceIcon symbol={row.symbol} color={row.color} /><Text style={styles.rowLabel}>{row.label}</Text>
      {row.value && <Text style={styles.rowValue}>{row.value}</Text>}<Chevron />
    </Pressable>)}
  </View></View>;
}

export default function SettingsScreen({ visible, habits, today, hasPro, onClose, onDismiss, onOpenPro, onOpenWallpapers, onRestore, onMove }: {
  visible: boolean;
  habits: Habit[];
  today: Date;
  hasPro: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onOpenPro: () => void;
  onOpenWallpapers: () => void;
  onRestore: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors, mode, choice, setChoice } = useTheme();
  const [page, setPage] = useState<SettingsPage | null>(null);
  const lastPage = useRef<SettingsPage>('theme');
  const displayedPage = page ?? lastPage.current;
  const closePage = () => setPage(null);
  function openPage(next: SettingsPage) {
    lastPage.current = next;
    setPage(next);
  }
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const haptics = useHapticsPreference();
  const archived = habits.filter((habit) => habit.archived);
  const active = habits.filter((habit) => !habit.archived);
  const scrollPadding = { paddingBottom: Math.max(insets.bottom, 24) + 16 };

  function showOnboarding() {
    setOnboardingOpen(true);
  }

  const appRows: SettingsRow[] = [
    { label: 'General', symbol: 'gear', color: '#EE7CB7' },
    { label: 'Haptic feedback', symbol: 'pulse', color: '#AA95E9', toggle: { value: haptics.enabled, onValueChange: haptics.setEnabled } },
    { label: 'Overview', symbol: 'grid', color: '#37CDBF' },
    { label: 'Daily Check-In Reminders', symbol: 'bell', color: '#2BC9DF' },
    { label: 'Theme', symbol: 'palette', color: '#E9BC33', value: choice, onPress: () => openPage('theme') },
    { label: 'Language', symbol: 'language', color: '#AA8EEA', value: 'System' },
    { label: 'Archived Habits', symbol: 'archive', color: '#39CBA5', value: archived.length ? String(archived.length) : undefined, onPress: () => openPage('archived') },
    { label: 'Backup & Restore', symbol: 'cloud', color: '#37BDEB', value: 'Off', onPress: () => Alert.alert('Backup & Restore', 'Habits and earned rewards are saved on this device. Cloud backup and cross-device sync are not enabled yet.') },
    { label: 'Reorder Habits', symbol: 'list', color: '#F07782', onPress: () => openPage('reorder') },
  ];
  const helpRows: SettingsRow[] = [
    { label: 'Show Onboarding', symbol: 'onboarding', color: '#F29949', onPress: showOnboarding },
    { label: "Show What's New", symbol: 'news', color: '#72ACF4', onPress: () => Alert.alert("What's new", 'Collect wallpapers at streak milestones, earn permanent 90-day champion badges, and share your wins. Your habits and rewards now save on this device.') },
    { label: 'Send Feedback', symbol: 'send', color: '#D9D8DE' },
  ];
  const aboutRows: SettingsRow[] = [
    { label: 'Website', symbol: 'globe', color: '#3BCBA5' },
    { label: 'Follow On X', symbol: 'social', color: '#70A4EC' },
    { label: 'Privacy Policy', symbol: 'lock', color: '#EC82BD' },
    { label: 'Terms Of Service', symbol: 'terms', color: '#55CE8F' },
    { label: 'Rate The App', symbol: 'star', color: '#BC8FF3' },
  ];

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
    allowSwipeDismissal onRequestClose={Platform.OS === 'android' && page ? closePage : onClose} onDismiss={() => {
      closePage();
      onDismiss();
    }}>
    <View style={shared.screen} onAccessibilityEscape={page ? closePage : onClose}>
      <View style={shared.screen} accessibilityElementsHidden={page !== null} importantForAccessibility={page ? 'no-hide-descendants' : 'auto'}>
        <SheetHeader title="Settings" onClose={onClose} />
        <ScrollView style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, scrollPadding]}>
          <View style={shared.content}>
            <View style={styles.proCard}>
              <View style={styles.proHeading}><ProMark /><View style={styles.proCopy}>
                <Text style={styles.proTitle}>Habit Tracker <Text style={styles.proAccent}>Pro</Text></Text>
                <Text style={shared.muted}>Unlimited habits, widgets and more</Text>
              </View></View>
              <PrimaryButton onPress={onOpenPro} trailingIcon="chevron-right">Get Habit Tracker Pro</PrimaryButton>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setWallpaperOpen(true)} style={({ pressed }) => [styles.discover, pressed && styles.pressed]}>
              <PreferenceIcon symbol="sparkle" color="#B9A2F9" /><View style={styles.discoverCopy}>
                <Text style={styles.discoverTitle}>Streak-based wallpapers</Text><Text style={styles.discoverSubtitle}>Earn your first at 7 days. Collect your wins.</Text>
              </View><Chevron />
            </Pressable>
            <SettingsGroup title="APP" rows={appRows} />
            <SettingsGroup title="HELP" rows={helpRows} />
            <SettingsGroup title="ABOUT" rows={aboutRows} />
            <View style={styles.version}><Text style={styles.versionText}>Habit Tracker {appConfig.expo.version}</Text><Text style={styles.versionText}>Made for small, daily wins.</Text></View>
          </View>
        </ScrollView>
      </View>
      <RightDrawer inline visible={page !== null} onRequestClose={closePage}>
        <SheetHeader title={pageTitles[displayedPage]} onClose={closePage} onBack={closePage} />
        <ScrollView key={displayedPage} style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, scrollPadding]}>
          <View style={shared.content}>
            {displayedPage === 'theme' ? <>
              <Text style={shared.muted}>Choose an appearance for Habit Tracker.</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="App appearance" style={shared.group}>
                {themeOptions.map(({ name, description, shades }, index) => <Pressable key={name} accessibilityRole="radio"
                  accessibilityLabel={`${name}. ${description}`} accessibilityState={{ checked: choice === name }}
                  onPress={() => setChoice(name)} style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
                  <View accessible={false} style={styles.themeSwatch}>
                    {shades.map((shade) => <View key={shade} style={[styles.swatchShade, { backgroundColor: shade }]} />)}
                    <View style={styles.swatchAccent} />
                  </View>
                  <View style={styles.rowCopy}><Text style={styles.itemTitle}>{name}</Text><Text style={shared.muted}>{description}</Text></View>
                  <View style={[styles.radio, choice === name && styles.checkedRadio]}>{choice === name && <View style={styles.radioDot} />}</View>
                </Pressable>)}
              </View>
            </> : displayedPage === 'archived' ? <>
              <View style={[shared.group, styles.retention]}>
                <PreferenceIcon symbol="archive" color="#39CBA5" />
                <View style={styles.rowCopy}>
                  <Text style={styles.itemTitle}>{hasPro ? 'Kept with Pro' : `${ARCHIVE_RETENTION_DAYS}-day recovery window`}</Text>
                  <Text style={shared.muted}>{hasPro ? 'Your archived habits stay here while you have Pro.' : `Deleted habits are permanently removed after ${ARCHIVE_RETENTION_DAYS} days. Pro keeps archived habits without an expiry.`}</Text>
                </View>
              </View>
              {archived.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No archived habits</Text><Text style={shared.muted}>Habits you delete will appear here.</Text></View>
                : <View style={shared.group}>{archived.map((habit, index) => {
                  const daysLeft = habit.archivedOn ? archiveDaysLeft(habit.archivedOn, today) : ARCHIVE_RETENTION_DAYS;
                  return <View key={habit.id} style={[styles.row, index > 0 && styles.divider]}>
                    <HabitIcon habit={habit} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.itemTitle}>{habit.name}</Text>
                      <Text style={shared.muted}>{hasPro ? 'No expiry' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Restore ${habit.name}`} accessibilityHint="Restores its check-ins and notes"
                      onPress={() => onRestore(habit.id)} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}><Text style={styles.restoreText}>Restore</Text></Pressable>
                  </View>;
                })}</View>}
            </> : <>
              <Text style={shared.muted}>Use the arrows to change the order of your habits in all three home views.</Text>
              {active.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No active habits</Text><Text style={shared.muted}>Add or restore a habit to arrange it here.</Text></View>
                : <View style={shared.group}>{active.map((habit, index) => <View key={habit.id} style={[styles.row, index > 0 && styles.divider]}>
                  <HabitIcon habit={habit} /><Text style={styles.rowLabel}>{habit.name}</Text>
                  {([-1, 1] as const).map((direction) => {
                    const disabled = direction === -1 ? index === 0 : index === active.length - 1;
                    return <Pressable key={direction} accessibilityRole="button" accessibilityLabel={`Move ${habit.name} ${direction === -1 ? 'up' : 'down'}`}
                      disabled={disabled} accessibilityState={{ disabled }} onPress={() => onMove(habit.id, direction)} style={[styles.move, disabled && styles.disabled]}>
                      <AppIcon name={direction === -1 ? 'chevron-up' : 'chevron-down'} size={19} />
                    </Pressable>;
                  })}
                </View>)}</View>}
            </>}
          </View>
        </ScrollView>
      </RightDrawer>
      <WallpaperPreview visible={wallpaperOpen} onClose={() => setWallpaperOpen(false)} onExplore={onOpenWallpapers} />
      <Modal visible={onboardingOpen} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
        allowSwipeDismissal onRequestClose={() => setOnboardingOpen(false)}>
        <OnboardingScreen onContinue={() => setOnboardingOpen(false)} />
      </Modal>
    </View>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  proCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 24, borderCurve: 'continuous', padding: 18, gap: 20 },
  proHeading: { flexDirection: 'row', alignItems: 'center', gap: 16 }, proCopy: { flex: 1, gap: 6 }, proTitle: { color: colors.text, fontSize: 23, fontWeight: '700' }, proAccent: { color: colors.accentText },
  discover: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 22, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  discoverCopy: { flex: 1, gap: 4 }, discoverTitle: { color: colors.text, fontSize: 16, fontWeight: '600' }, discoverSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  row: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, rowLabel: { flex: 1, color: colors.text, fontSize: 16 }, rowValue: { color: colors.muted, fontSize: 14 },
  rowCopy: { flex: 1, gap: 3 }, itemTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  retention: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  themeSwatch: { width: 48, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.controlBorder, overflow: 'hidden', flexDirection: 'row', justifyContent: 'center' },
  swatchShade: { flex: 1 }, swatchAccent: { position: 'absolute', top: 12, width: 20, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  checkedRadio: { borderColor: colors.accentText }, radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accentText },
  version: { paddingTop: 2, gap: 4, alignItems: 'center' }, versionText: { color: colors.subtle, fontSize: 13, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  restore: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }, restoreText: { color: colors.accentText, fontSize: 14, fontWeight: '600' },
  move: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.25 },
}));
