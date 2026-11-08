import { space, layout, control, radius } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { type ReactNode } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { Chevron, Checkmark } from '../components/habit-ui';
import { useAppPreferences } from '../components/app-preferences';
import { LANGUAGES, type AppPreferences } from '../data/app-preferences';
import useHapticsPreference from '../hooks/use-haptics-preference';
import { feedback } from '../utils/feedback';
import { createThemedStyles, useTheme } from '../components/theme';
import { usePreferenceStyles } from '../components/preference-ui';
import { useProUpgrade } from '../components/pro-upgrade';
import { PRO_PREFERENCE_KEYS } from '../data/pro-access';

function Group({ title, pro, children }: { title?: string; pro?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const styles = useStyles(), shared = usePreferenceStyles();
  return <View style={styles.section}>{title && <View style={styles.sectionTitle}>{pro && <Text style={styles.pro}>PRO</Text>}<Text style={shared.sectionLabel}>{t(title)}</Text></View>}<View style={shared.group}>{children}</View></View>;
}
function Row({ label, detail, onPress, children }: { label: string; detail?: string; onPress?: () => void; children?: ReactNode }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const copy = <><View style={styles.copy}><Text style={styles.label}>{t(label)}</Text>{detail && <Text style={styles.detail}>{t(detail)}</Text>}</View>{children}{onPress && <Chevron />}</>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>{copy}</Pressable> : <View style={styles.row}>{copy}</View>;
}
function Toggle({ label, value, onChange, detail, disabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; detail?: string; disabled?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return <Row label={label} detail={detail}><Switch accessibilityLabel={t(label)} disabled={disabled} value={value} onValueChange={(next) => { feedback('selection'); onChange(next); }}
    trackColor={{ false: colors.controlBorder, true: colors.accent }} thumbColor="#FFFFFF" /></Row>;
}
export default function SettingsPreferencesScreen({ page }: { page: 'general' | 'overview' | 'language' }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();
  const { preferences: p, update } = useAppPreferences();
  const haptics = useHapticsPreference();
  const upgrade = useProUpgrade();
  function change(patch: Partial<AppPreferences>) {
    if (PRO_PREFERENCE_KEYS.some(key => Object.hasOwn(patch, key)) && !upgrade.request('dashboard-customization')) return;
    update(patch);
  }
  function setting(key: keyof AppPreferences, label: string) {
    return <Toggle key={key} label={label} value={p[key] as boolean} onChange={(value) => change({ [key]: value })} />;
  }
  if (page === 'general') return <>
    <Group>
      <Row label={p.weekStartsOn === 1 ? t('Week Starts On Monday') : t('Week Starts On Sunday')} onPress={() => Alert.alert(t('Week starts on'), undefined, [
        { text: t('Monday'), onPress: () => update({ weekStartsOn: 1 }) }, { text: t('Sunday'), onPress: () => update({ weekStartsOn: 0 }) }, { text: t('Cancel'), style: 'cancel' },
      ])} />
      {setting('highlightToday','Highlight Current Day')}
      <Toggle label={t("Haptic Feedback")} value={haptics.enabled} onChange={haptics.setEnabled} />
      {setting('notes','Notes')}
    </Group>
    <Text style={styles.note}>{t("Turning Notes off hides note entry. Existing notes stay saved.")}</Text>
    <Group title={t("DEBUG")}>
      <Toggle label={t("Allow Crash Reporting")} value={false} disabled onChange={() => {}} detail={t("Crash reporting is not connected.")} />
      <Row label={t("Purchase ID")} detail={t("Available after purchase integration")} />
    </Group>
  </>;
  if (page === 'language') return <>
    <Text style={styles.note}>{t("Changes apply immediately. System Default follows your device language.")}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("Preferred language")} style={styles.languageGroup}>
      {LANGUAGES.map((language) => <Pressable key={language.id} accessibilityRole="radio" accessibilityState={{ checked: p.language === language.id }}
        accessibilityLabel={(language.id === 'system' ? t('System Default') : language.name)} onPress={() => update({ language: language.id })} style={styles.row}>
        <Text style={[styles.label, styles.copy]}>{(language.id === 'system' ? t('System Default') : language.name)}</Text>
        {p.language === language.id && <View style={styles.check}><Checkmark color={colors.onAccent} /></View>}
      </Pressable>)}
    </View>
  </>;
  const completedLabels = { 'in-place': 'Show in place', bottom: 'Move to bottom', hidden: 'Hide completed' };
  return <>
    <Group title={t("DASHBOARD VIEW MODES")}>
      {setting('showViewBar','Show View Mode Bottom Bar')}
      {setting('swipeViews','Swipe Between View Modes')}
      {setting('showCategoryFilter','Show Category Filter')}
      {setting('showCategoryNames','Show Category Names')}
      {setting('showCompletedFilter','Show Completed Habits Filter')}
      {setting('showSearch','Show Search Button')}
      <Row label={t("Completed habits")} detail={completedLabels[p.completedHabits]} onPress={() => Alert.alert(t('Completed habits'), undefined, [
        ...(['in-place','bottom','hidden'] as const).map((value) => ({ text: t(completedLabels[value]), onPress: () => update({ completedHabits: value }) })),
        { text: t('Cancel'), style: 'cancel' },
      ])} />
      {setting('dragToReorder','Drag To Reorder')}
    </Group>
    <Group title={t("SHOW STREAK COUNT")} pro>
      {setting('cardStreak','Card view')}{setting('listStreak','Compact view')}{setting('monthStreak','Month view')}
    </Group>
    <Group title={t("DASHBOARD CUSTOMIZATION")} pro>
      {setting('showStreakGoal','Show Streak Goal')}{setting('showMonthLabels','Show Month Labels')}
      {setting('showDayLabels','Show Day Labels')}{setting('showCategories','Show Categories')}
    </Group>
    <Group title={t("COMPACT LIST")} pro>
      <View style={styles.daysPanel}><Text style={styles.label}>{t("Days Shown")}</Text><View accessibilityRole="radiogroup" accessibilityLabel={t("Compact list days")} style={styles.days}>
        {[1,2,3,4,5,6,7].map((days) => <Pressable key={days} accessibilityRole="radio" accessibilityLabel={String(days)} accessibilityState={{ checked: p.compactDays === days }}
          onPress={() => change({ compactDays: days })} style={[styles.day, p.compactDays === days && styles.selectedDay]}><Text style={[styles.detail, p.compactDays === days && styles.selectedText]}>{days}</Text></Pressable>)}
      </View></View>
      <Toggle label={t("Habit Names")} value={p.compactNames} onChange={(compactNames) => change({ compactNames })} />
    </Group>
    <Text style={styles.note}>{t('Standard views are free. Extra display controls require Pro.')}</Text>
    {upgrade.sheet}
  </>;
}
const useStyles = createThemedStyles((c) => StyleSheet.create({
  section: { gap: space.sm }, sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.xs }, pro: { color: c.muted, fontSize: 9, fontWeight: '700', borderWidth: 1, borderColor: c.muted, paddingHorizontal: 3, borderRadius: 3 },
  row: { minHeight: control.row, paddingHorizontal: layout.inset, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  copy: { flex: 1, gap: space.xxs }, label: { color: c.text, fontSize: 16 }, detail: { color: c.muted, fontSize: 14, lineHeight: 20 },
  note: { color: c.muted, fontSize: 13, lineHeight: 20 }, languageGroup: { backgroundColor: c.panel, borderRadius: radius.card, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  daysPanel: { padding: layout.inset, gap: space.md }, days: { flexDirection: 'row', gap: space.xxs, flexWrap: 'wrap', justifyContent: 'center' }, day: { minHeight: control.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, borderWidth: 1, borderColor: c.border, flexGrow: 0, flexBasis: 'auto', minWidth: control.touch, paddingVertical: space.xs, paddingHorizontal: space.xs },
  selectedDay: { backgroundColor: c.accent, borderColor: c.accent }, selectedText: { color: c.onAccent },
}));
