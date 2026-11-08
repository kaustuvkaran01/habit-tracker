import Modal from './private-modal';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pendingAchievements, type Achievement, type AchievementClaim } from '../data/achievement-events';
import { type Habit } from '../data/habit-types';
import { badgeDesignForCycle, WALLPAPER_ASPECT_RATIO } from '../data/collection-design';
import { type WallpaperEdition, type WallpaperMilestone } from '../data/habit-rewards';
import { useTranslation } from '../i18n/context';
import { feedback } from '../utils/feedback';
import { ChampionBadgeArt, CollectionWallpaper, WALLPAPER_TITLES } from './collection-art';
import CollectionPreview, { type CollectionPreviewItem } from './collection-preview';
import Pressable from './haptic-pressable';
import AppIcon from './app-icon';
import { control, layout, radius, space, typeSize } from './design-tokens';
import { ACHIEVEMENT_REVEALS } from './achievement-reveals';
import { useAppPrivacyCovered } from './app-privacy';
import { createThemedStyles, useTheme } from './theme';

type Phase = 'idle' | 'preparing' | 'ready' | 'error' | 'closing' | 'preview';
type Props = {
  habits: Habit[]; eligible: boolean; saving: boolean; storageError: 'load' | 'save' | null;
  onClaim: (id: string) => Promise<AchievementClaim>; onDismissAll: () => Promise<boolean>; onRetry: () => Promise<boolean>;
  onSelectWallpaper: (id: string, days: WallpaperMilestone, edition: WallpaperEdition) => void;
  // Keep this controller mounted once while Home places the native presentation
  // inside the currently active surface (Home or the habit-detail drawer).
  children?: (presentation: ReactNode) => ReactNode;
};
function Spark({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const angle = index / 12 * Math.PI * 2;
  const style = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, progress.value * 4) * (1 - progress.value)), transform: [
    { translateX: Math.cos(angle) * (48 + progress.value * 82) }, { translateY: Math.sin(angle) * (48 + progress.value * 82) }, { rotate: `${index * 30 + progress.value * 70}deg` },
  ] }));
  return <Animated.View pointerEvents="none" accessible={false} style={[sparkStyle, { backgroundColor: color }, style]} />;
}
const sparkStyle = { position: 'absolute' as const, left: '50%' as const, top: '50%' as const, width: 5, height: 9, borderRadius: 2 };

export default function AchievementHost({ habits, eligible, saving, storageError, onClaim, onDismissAll, onRetry, onSelectWallpaper, children }: Props) {
  const covered = useAppPrivacyCovered();
  const { t } = useTranslation(), { colors, mode } = useTheme(), styles = useStyles(), insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const queue = useMemo(() => pendingAchievements({ habits, retainedCollections: [] }), [habits]);
  const [current, setCurrent] = useState<Achievement | null>(null), [phase, setPhase] = useState<Phase>('idle');
  const [onscreen, setOnscreen] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduced, setReduced] = useState<boolean | null>(null), [retrying, setRetrying] = useState(false), [previewOpen, setPreviewOpen] = useState(false);
  const generation = useRef(0), retryLock = useRef(false);
  const mounted = useRef(true), acquiring = useRef(false), played = useRef(new Set<string>());
  const destination = useRef<'next' | 'preview' | 'dismiss' | null>(null);
  const progress = useSharedValue(1);
  useEffect(() => {
    mounted.current = true;
    const app = AppState.addEventListener('change', state => { setActive(state === 'active'); if (state !== 'active') { cancelAnimation(progress); progress.value = 1; } });
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); }).catch(() => { if (live) setReduced(true); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { setReduced(value); if (value) { cancelAnimation(progress); progress.value = 1; } });
    return () => { live = false; mounted.current = false; app.remove(); motion.remove(); cancelAnimation(progress); };
  }, [progress]);
  useEffect(() => { if (covered) { cancelAnimation(progress); progress.value = 1; } }, [covered, progress]);
  const mayPresent = eligible && active && !covered && reduced !== null;
  useEffect(() => {
    if (!mayPresent || saving || storageError || current || phase !== 'idle' || acquiring.current || !queue.length) return;
    acquiring.current = true;
    const operation = ++generation.current;
    const next = queue[0]; setCurrent(next); setPhase('preparing');
    void onClaim(next.event.id).then(result => {
      if (!mounted.current || operation !== generation.current) return;
      if (result === 'missing') { setCurrent(null); setPhase('idle'); } else { if (result === 'claimed') progress.value = reduced ? 1 : 0; setPhase(result === 'claimed' ? 'ready' : 'error'); }
    }).catch(() => { if (mounted.current && operation === generation.current) setPhase('error'); })
      .finally(() => { if (operation === generation.current) acquiring.current = false; });
  }, [mayPresent, saving, storageError, current, phase, queue, onClaim]);
  useEffect(() => {
    if (current && !habits.some(habit => habit.id === current.habit.id && !habit.archived)) { generation.current++; acquiring.current = false; setCurrent(null); setPhase('idle'); setPreviewOpen(false); }
  }, [habits, current]);
  const definition = current ? ACHIEVEMENT_REVEALS[current.event.kind] : ACHIEVEMENT_REVEALS.wallpaper;
  const artStyle = useAnimatedStyle(() => ({ opacity: reduced ? 1 : Math.min(1, 0.3 + progress.value), transform: [
    { translateY: reduced ? 0 : definition.rise * (1 - progress.value) },
    { scale: reduced ? 1 : definition.startScale + (1 - definition.startScale) * progress.value },
    { rotate: `${reduced ? 0 : definition.tilt * (1 - progress.value)}deg` },
  ] }));
  function shown() {
    if (!current || phase !== 'ready') return;
    if (played.current.has(current.event.id)) { progress.value = 1; return; }
    played.current.add(current.event.id);
    feedback('success');
    progress.value = reduced ? 1 : 0;
    if (!reduced) progress.value = withTiming(1, { duration: definition.duration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }
  useEffect(() => { if (onscreen && mayPresent && phase === 'ready') shown(); }, [onscreen, mayPresent, phase, reduced, current?.event.id]);
  function close(action: 'next' | 'preview' | 'dismiss') {
    if (!current) return;
    generation.current++; acquiring.current = false; setRetrying(false);
    cancelAnimation(progress); progress.value = 1;
    destination.current = action;
    if (action === 'dismiss') void onDismissAll().catch(() => undefined);
    setPhase('closing');
  }
  function dismissed() {
    setOnscreen(false);
    const next = destination.current;
    if (!next) return; // Backgrounding or another editor pauses this same event.
    destination.current = null;
    if (next === 'preview') { setPhase('preview'); setPreviewOpen(true); }
    else { setCurrent(null); setPhase('idle'); }
  }
  useEffect(() => {
    if (phase !== 'closing' || Platform.OS === 'ios') return;
    const frame = requestAnimationFrame(dismissed);
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  async function retry() {
    if (retryLock.current) return;
    retryLock.current = true; setRetrying(true);
    const operation = generation.current;
    try {
      if (await onRetry() && mounted.current && operation === generation.current) {
        progress.value = reduced ? 1 : 0;
        setPhase('ready');
      }
    } catch { if (mounted.current && operation === generation.current) setPhase('error'); }
    finally { retryLock.current = false; if (mounted.current && operation === generation.current) setRetrying(false); }
  }
  function closePreview() {
    setPreviewOpen(false);
    if (Platform.OS !== 'ios') { setCurrent(null); setPhase('idle'); }
  }
  if (!current) return children ? children(null) : null;
  const badge = current.habit.rewards?.badges.find(item => item.cycle === current.event.cycle);
  const badgeDesign = badge ? badgeDesignForCycle(badge.cycle) : null;
  const previewItem: CollectionPreviewItem = current.event.kind === 'badge' && badge ? { kind: 'badge', badge } : { kind: 'wallpaper', days: current.event.days };
  const wallpaper = current.event.kind === 'wallpaper';
  const artWidth = wallpaper ? Math.max(112, Math.min(172, width - layout.inset * 4, (height - 330) * WALLPAPER_ASPECT_RATIO)) : Math.min(230, width - layout.inset * 4);
  const presentation = <>
    <Modal visible={mayPresent && (phase === 'ready' || phase === 'error')} animationType="none" presentationStyle="overFullScreen" transparent
      onRequestClose={() => close('dismiss')} onShow={() => setOnscreen(true)} onDismiss={dismissed}>
      <View accessibilityViewIsModal onAccessibilityEscape={() => close('dismiss')} style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.top}><Pressable accessibilityRole="button" accessibilityLabel={t('Dismiss celebrations')} onPress={() => close('dismiss')} style={styles.close}><AppIcon name="close" size={control.icon} /></Pressable></View>
        <ScrollView indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            <Text style={styles.eyebrow}>{t('A little progress. A lasting reward.')}</Text>
            <Text accessibilityRole="header" style={styles.headline}>{phase === 'error' ? t('Your reward is waiting') : t(definition.title)}</Text>
            <Text style={styles.habit}>{badge?.habitName ?? current.habit.name} · {t('{count} days', { count: current.event.days })}</Text>
            <View style={{ minHeight: wallpaper ? artWidth / WALLPAPER_ASPECT_RATIO + space.xl : artWidth + space.xl, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              {phase === 'ready' && !reduced && Array.from({ length: 12 }, (_, index) => <Spark key={index} index={index} progress={progress} color={index % 2 ? colors.accent : current.habit.color} />)}
              <Animated.View style={[styles.art, artStyle]}>
                {wallpaper ? <CollectionWallpaper days={current.event.days} width={artWidth} /> : badge && <ChampionBadgeArt cycle={badge.cycle} size={artWidth} />}
              </Animated.View>
            </View>
            <Text style={styles.rewardName}>{wallpaper ? t(WALLPAPER_TITLES[current.event.days]) : badgeDesign ? `${t(badgeDesign.name)} · ${t(badgeDesign.virtue)}` : ''}</Text>
            <Text style={styles.description}>{phase === 'error' ? t('Your reward stays in your collection. Try again to celebrate.') : wallpaper ? t('You earned a new wallpaper. Make your progress part of your day.') : t('Ninety days of showing up. This permanent badge is yours to keep.')}</Text>
            {queue.length > 0 && <Text style={styles.small}>{t('More rewards are waiting')}</Text>}
            {phase === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel={t('Retry saving')} disabled={retrying} onPress={retry} style={styles.primary}>
              {retrying ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryText}>{t('Retry saving')}</Text>}
            </Pressable> : <>
              <Pressable accessibilityRole="button" onPress={() => close('preview')} style={styles.primary}><AppIcon name={wallpaper ? 'wallpaper' : 'share'} size={control.icon} color={colors.onAccent} /><Text style={styles.primaryText}>{t(definition.action)}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => close('next')} style={styles.secondary}><Text style={styles.secondaryText}>{t('Continue')}</Text></Pressable>
            </>}
          </View>
        </ScrollView>
      </View>
    </Modal>
    <CollectionPreview visible={previewOpen} habit={current.habit} item={previewItem} onClose={closePreview}
      onDismiss={() => { if (phase === 'preview' && !previewOpen) { setCurrent(null); setPhase('idle'); } }}
      onSelectWallpaper={(days, edition) => onSelectWallpaper(current.habit.id, days, edition)} />
  </>;
  return children ? children(presentation) : presentation;
}
const useStyles = createThemedStyles(c => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, top: { width: '100%', maxWidth: layout.content, alignSelf: 'center', paddingHorizontal: layout.inset, paddingTop: space.xs, alignItems: 'flex-end' },
  close: { width: control.touch, height: control.touch, borderRadius: control.touch / 2, backgroundColor: c.control, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: layout.inset, paddingTop: space.sm, paddingBottom: layout.section, justifyContent: 'center' }, content: { width: '100%', maxWidth: layout.preview, alignSelf: 'center', alignItems: 'center', gap: space.md },
  eyebrow: { color: c.accentText, fontSize: typeSize.caption, textAlign: 'center' }, headline: { color: c.text, fontSize: 30, fontWeight: '700', textAlign: 'center' }, habit: { color: c.muted, fontSize: typeSize.label, textAlign: 'center' },
  art: { borderRadius: radius.control, overflow: 'hidden' }, rewardName: { color: c.text, fontSize: typeSize.title, fontWeight: '600', textAlign: 'center' }, description: { color: c.muted, fontSize: typeSize.label, lineHeight: 21, textAlign: 'center' }, small: { color: c.muted, fontSize: typeSize.caption },
  primary: { width: '100%', minHeight: control.primary, borderRadius: radius.primary, padding: space.md, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs }, primaryText: { color: c.onAccent, fontSize: typeSize.action, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  secondary: { minHeight: control.touch, paddingHorizontal: space.md, paddingVertical: space.xs, justifyContent: 'center' }, secondaryText: { color: c.accentText, fontSize: typeSize.label, textAlign: 'center' },
}));
