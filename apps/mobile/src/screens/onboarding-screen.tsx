import { space, layout, control, radius } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon, { type AppIconName } from '../components/app-icon';
import { PrimaryButton } from '../components/preference-ui';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';
import Pressable from '../components/haptic-pressable';

const FEATURES: { title: string; description: string; icon: AppIconName; color: string; comingSoon?: boolean }[] = [
  { title: 'Build new habits', description: 'Create your habits and track your progress.', icon: 'view-list', color: '#A69BF2' },
  { title: 'Check it off', description: 'Mark each day you complete your habits.', icon: 'check', color: '#5BD99D' },
  { title: 'See the big picture', description: 'See your completions in a colourful activity grid.', icon: 'grid', color: '#6DA9F5' },
  { title: 'Get motivation from streaks', description: 'Milestones and celebrations are free. Export earned wallpapers with Pro. Badges stay free to share.', icon: 'flame', color: '#F37983' },
  { title: 'Don’t miss a completion', description: 'Reminders to keep your daily habits on track.', icon: 'bell', color: '#3DC8EC' },
  { title: 'Build your dashboard', description: 'Choose colours, icons and emoji to make it yours.', icon: 'palette', color: '#EDC34D' },
  { title: 'Explore your history', description: 'Browse past completions, edit them and add notes.', icon: 'calendar', color: '#B98BEA' },
  { title: 'Share your progress', description: 'Share a habit image or your earned animal patches.', icon: 'share', color: '#3DCFA9' },
  { title: 'Home Screen Widgets', description: 'Keep your favourite habits on your home screen.', icon: 'wallpaper', color: '#D987E7', comingSoon: true },
  { title: 'Preserve your privacy', description: 'Your habits and notes are saved on your device. You choose what to share.', icon: 'lock', color: '#EE82B9' },
];

export default function OnboardingScreen({ onContinue, onSkip, onContinueForSession, firstLaunch = false, saving = false, saveError = false }: {
  onContinue: () => void; onSkip?: () => void; onContinueForSession?: () => void; firstLaunch?: boolean; saving?: boolean; saveError?: boolean;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, firstLaunch && { paddingTop: insets.top }]} onAccessibilityEscape={saving ? undefined : onSkip ?? onContinue}>
    {firstLaunch ? <View style={styles.skipRow}><Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={onSkip ?? onContinue} style={styles.skip}><Text style={styles.skipText}>{t('Skip')}</Text></Pressable></View>
      : <View style={styles.handleArea}><View style={styles.handle} /></View>}
    <ScrollView style={styles.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.welcome}>{t("Welcome to")}{`\n`}Habit <Text style={styles.accent}>Tracker</Text></Text>
        <View style={styles.features}>
          {FEATURES.map((feature) => <View key={t(feature.title)} accessible
            accessibilityLabel={`${t(feature.title)}. ${t(feature.description)}${feature.comingSoon ? ' ' + t('Coming soon') : ''}`} style={styles.feature}>
            <View accessible={false} style={[styles.iconTile, { backgroundColor: `${feature.color}1A` }]}>
              <AppIcon name={feature.icon} size={24} color={accentForeground(feature.color, mode)} strokeWidth={1.8} />
            </View>
            <View style={styles.featureCopy}>
              <View style={styles.titleRow}><Text style={styles.featureTitle}>{t(feature.title)}</Text>
                {feature.comingSoon && <View style={styles.soon}><Text style={styles.soonText}>{t("Coming soon")}</Text></View>}
              </View>
              <Text style={styles.description}>{t(feature.description)}</Text>
            </View>
          </View>)}
        </View>
      </View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom) }]}>
      <View style={styles.footerContent}>
        {saveError && <Text accessibilityRole="alert" style={styles.saveError}>{t('Your welcome preference could not be saved. Try again to continue.')}</Text>}
        <PrimaryButton disabled={saving} onPress={onContinue}>{saving ? t('Saving…') : firstLaunch ? t('Create your first habit') : t('Continue')}</PrimaryButton>
        {saveError && onContinueForSession && <Pressable accessibilityRole="button" onPress={onContinueForSession} style={styles.skip}><Text style={[styles.skipText, { textAlign: 'center' }]}>{t('Continue for now')}</Text></Pressable>}
      </View>
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  skipRow: { width: '100%', maxWidth: layout.content, alignSelf: 'center', alignItems: 'flex-end', paddingHorizontal: layout.inset },
  skip: { minHeight: control.touch, minWidth: control.touch, paddingHorizontal: space.xs, justifyContent: 'center' }, skipText: { color: colors.accentText, fontSize: 15 },
  saveError: { color: colors.error, fontSize: 13, lineHeight: 19, marginBottom: space.sm, textAlign: 'center' },
  handleArea: { height: 26, justifyContent: 'center', alignItems: 'center' }, handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.controlBorder },
  scroll: { flex: 1 }, scrollContent: { paddingHorizontal: layout.inset, paddingTop: space.sm, paddingBottom: layout.section },
  content: { width: '100%', maxWidth: layout.content, alignSelf: 'center' },
  welcome: { color: colors.text, fontSize: 34, lineHeight: 41, letterSpacing: -0.5, fontWeight: '700', textAlign: 'center', marginBottom: layout.section }, accent: { color: colors.accentText },
  features: { gap: space.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: layout.inset, minHeight: control.roomyRow, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: colors.panel },
  iconTile: { width: 42, height: 42, borderRadius: 15, borderCurve: 'continuous', justifyContent: 'center', alignItems: 'center' },
  featureCopy: { flex: 1, gap: space.xxs }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  featureTitle: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' }, description: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  soon: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: colors.accentPanel, flexShrink: 1, maxWidth: '38%' }, soonText: { color: colors.accentText, fontSize: 11, fontWeight: '600' },
  footer: { backgroundColor: colors.background, paddingHorizontal: layout.inset, paddingTop: space.sm }, footerContent: { width: '100%', maxWidth: layout.content, alignSelf: 'center' },
}));
