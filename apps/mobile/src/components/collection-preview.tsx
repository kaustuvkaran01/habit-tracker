import Modal from './private-modal';
import { space, layout, control, radius, typeSize } from './design-tokens';
import { useTranslation } from '../i18n/context';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from './haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { type Habit } from '../data/habit-types';
import { type ChampionBadge, rewardsFor, type WallpaperMilestone } from '../data/habit-rewards';
import { usePreferenceStyles, SheetHeader } from './preference-ui';
import { ChampionBadgeArt, CollectionWallpaper, type WallpaperEdition, WALLPAPER_TITLES } from './collection-art';
import { badgeDesignForCycle, WALLPAPER_ASPECT_RATIO, WALLPAPER_EXPORT_SIZE } from '../data/collection-design';
import AppIcon from './app-icon';
import { feedback } from '../utils/feedback';
import { createThemedStyles, useTheme } from './theme';
import { canUse } from '../data/pro-access';
import { useProAccess } from './pro-access';
import { useProUpgrade } from './pro-upgrade';

export type CollectionPreviewItem = { kind: 'wallpaper'; days: WallpaperMilestone } | { kind: 'badge'; badge: ChampionBadge };
type PreviewProps = { habit: Pick<Habit, 'rewards'>; item: CollectionPreviewItem; onClose: () => void; onSelectWallpaper: (days: WallpaperMilestone, edition: WallpaperEdition) => void };

function PreviewContent({ habit, item, onClose, onSelectWallpaper }: PreviewProps) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors, mode } = useTheme();
  const access = useProAccess();
  const latestAccess = useRef(access);
  latestAccess.current = access;
  const upgrade = useProUpgrade();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [edition, setEdition] = useState<WallpaperEdition>(() => item.kind === 'wallpaper' && rewardsFor(habit).selectedWallpaper === item.days
    ? rewardsFor(habit).selectedWallpaperEdition ?? 'landscape' : 'landscape');
  const activeEdition = useRef(edition);
  activeEdition.current = edition;
  const capturing = useRef(false);
  const mounted = useRef(true);
  const capture = useRef<ComponentRef<typeof View>>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const lastFile = useRef<string | undefined>(undefined);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWallpaper = item.kind === 'wallpaper';
  const artWidth = isWallpaper ? Math.max(150, Math.min(300, width - 64, (height - 350) * WALLPAPER_ASPECT_RATIO)) : Math.min(360, width - 56);
  const badgeDesign = item.kind === 'badge' ? badgeDesignForCycle(item.badge.cycle) : null;
  const title = isWallpaper ? t(WALLPAPER_TITLES[item.days]) : `${t(badgeDesign!.name)} · ${t(badgeDesign!.virtue)}`;
  const rewards = rewardsFor(habit);
  const unlocked = isWallpaper ? rewards.wallpapers.some((entry) => entry.days === item.days) : rewards.badges.some((badge) => badge.id === item.badge.id);
  const paidLock = isWallpaper && !canUse('wallpaper-export', access);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (lastFile.current) releaseCapture(lastFile.current); };
  }, []);

  async function exportImage() {
    if (isWallpaper && !upgrade.request('wallpaper-export')) return;
    if (!ready || capturing.current || !capture.current || !unlocked) return;
    capturing.current = true;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) { Alert.alert(t('Sharing unavailable'), t('Image export is not available on this device.')); return; }
      if (!mounted.current) return;
      scroll.current?.scrollTo({ y: 0, animated: false });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!mounted.current || !capture.current) return;
      if (isWallpaper && !canUse('wallpaper-export', latestAccess.current)) return;
      if (lastFile.current) { releaseCapture(lastFile.current); lastFile.current = undefined; }
      const file = await captureRef(capture.current, { format: 'png', quality: 1, result: 'tmpfile', width: isWallpaper ? WALLPAPER_EXPORT_SIZE.width : 1080, height: isWallpaper ? WALLPAPER_EXPORT_SIZE.height : 1080 });
      if (!mounted.current) { releaseCapture(file); return; }
      lastFile.current = file;
      if (isWallpaper && !canUse('wallpaper-export', latestAccess.current)) return;
      if (item.kind === 'wallpaper') onSelectWallpaper(item.days, edition);
      await Sharing.shareAsync(file, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: isWallpaper ? 'Export earned wallpaper' : `Share ${item.badge.habitName} achievement`, anchor: { x: width / 2, y: 80, width: 1, height: 1 } });
    } catch {
      if (mounted.current) { feedback('error'); Alert.alert(t('Could not export image'), t('Please try again. Your earned rewards are safe.')); }
    } finally {
      capturing.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <View style={shared.screen}>
    <SheetHeader title={title} onClose={() => { if (!capturing.current) onClose(); }} />
    <ScrollView ref={scroll} style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} removeClippedSubviews={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={styles.earned}>{isWallpaper ? t("EARNED · {value0}-DAY STREAK", { value0: item.days }) : t("PERMANENT BADGE · CYCLE {value0}", { value0: item.badge.cycle })}</Text>
        {item.kind === 'wallpaper' && item.days <= 45 && <View accessibilityRole="tablist" accessibilityLabel={t("Wallpaper design")} style={styles.editions}>
          {(['landscape', 'quote'] as const).map((choice) => <Pressable key={choice} accessibilityRole="tab" disabled={busy}
            accessibilityState={{ selected: edition === choice, disabled: busy }} onPress={() => {
              if (capturing.current || choice === edition) return;
              setReady(false); setImageError(false); setEdition(choice);
            }} style={[styles.edition, choice === edition && styles.selectedEdition]}><Text style={styles.editionLabel}>{choice === 'landscape' ? t('Landscape') : t('Quote')}</Text></Pressable>)}
        </View>}
        <View style={styles.artFrame}>
          <View ref={capture} collapsable={false} onLayout={() => { if (!isWallpaper) setReady(true); }}>
            {item.kind === 'wallpaper' ? <CollectionWallpaper key={`${item.days}-${edition}`} days={item.days} width={artWidth} edition={edition}
              onReady={() => { if (activeEdition.current === edition) setReady(true); }} onError={() => { if (activeEdition.current === edition) setImageError(true); }} />
              : <View style={[styles.badgeExport, { width: artWidth, height: artWidth }]}>
                <Text allowFontScaling={false} style={[styles.badgeBrand, { fontSize: artWidth * 0.025 }]}>{`HABIT TRACKER · ${t(badgeDesign!.name).toLocaleUpperCase(locale)} / ${t(badgeDesign!.virtue).toLocaleUpperCase(locale)}`}</Text>
                <ChampionBadgeArt cycle={item.badge.cycle} size={artWidth * 0.69} />
                <Text allowFontScaling={false} numberOfLines={2} style={[styles.badgeName, { fontSize: artWidth * 0.048 }]}>{item.badge.habitName}</Text>
                <Text allowFontScaling={false} style={[styles.badgeCaption, { fontSize: artWidth * 0.029 }]}>{t("Cycle {value0} · 90 days", { value0: item.badge.cycle })}</Text>
              </View>}
          </View>
        </View>
        {isWallpaper && <Text style={styles.date}>{t("iPhone 16 · 1179 × 2556 · Full-resolution PNG")}</Text>}
        {paidLock && <Text style={styles.description}>{t('Milestone earned. Export with Pro. Your reward stays in your collection.')}</Text>}
        {imageError && <Text accessibilityRole="alert" style={styles.error}>{t("The image could not load. Close this preview and try again.")}</Text>}
        <Text style={styles.heading}>{isWallpaper ? t('A little proof of showing up.') : t('You earned every single day.')}</Text>
        <Text style={styles.description}>{isWallpaper
          ? t('Export the image, save it, then choose it in your phone’s Wallpaper settings. You make the final change on your device.')
          : t('Share your achievement with your favourite social app. This badge stays in your collection when you start another cycle.')}</Text>
        {!isWallpaper && <Text style={styles.date}>{t("Earned on {value0}", { value0: new Date(item.badge.earnedOn + "T12:00:00").toLocaleDateString(locale) })}</Text>}
      </View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !unlocked || (!paidLock && (!ready || imageError)), busy }}
        disabled={busy || !unlocked || (!paidLock && (!ready || imageError))} onPress={exportImage} style={[styles.exportButton, (busy || !unlocked || (!paidLock && (!ready || imageError))) && styles.disabled]}>
        {busy ? <ActivityIndicator color={colors.onAccent} /> : <AppIcon name="share" size={20} color={colors.onAccent} />}
        <Text style={styles.exportText}>{busy ? t('Preparing image…') : paidLock ? t('View Pro') : isWallpaper ? t('Use wallpaper · Export') : t('Share badge')}</Text>
      </Pressable>
      <Text style={styles.footerHint}>{Platform.OS === 'ios' && isWallpaper ? t('Save to Photos, then set it as your wallpaper.') : t('Only the artwork is shared. Notes stay private.')}</Text>
    </View>
    {upgrade.sheet}
  </View>;
}

export default function CollectionPreview({ visible, onDismiss, ...props }: PreviewProps & { visible: boolean; onDismiss?: () => void }) {
  const { colors } = useTheme();
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
    allowSwipeDismissal onRequestClose={props.onClose} onDismiss={onDismiss}>
    <PreviewContent key={props.item.kind === 'wallpaper' ? `wall-${props.item.days}` : props.item.badge.id} {...props} />
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  scrollContent: { padding: layout.inset, paddingBottom: layout.section }, content: { width: '100%', maxWidth: layout.preview, alignSelf: 'center', gap: layout.section },
  earned: { color: colors.accentText, fontSize: 11, fontWeight: '600', textAlign: 'center', letterSpacing: 1.3 },
  artFrame: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  badgeExport: { backgroundColor: '#101A21', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  badgeBrand: { color: '#A99E88', fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
  badgeName: { color: '#E8E0CD', fontWeight: '700', textAlign: 'center' }, badgeCaption: { color: '#A99E88', marginTop: 7, textAlign: 'center' },
  editions: { flexDirection: 'row', padding: space.xxs, borderRadius: radius.control, backgroundColor: colors.raised, alignSelf: 'center', gap: space.xxs },
  edition: { minHeight: control.touch, minWidth: 100, paddingHorizontal: space.sm, justifyContent: 'center', alignItems: 'center', borderRadius: radius.small, paddingVertical: space.xs }, selectedEdition: { backgroundColor: colors.selected }, editionLabel: { color: colors.text, fontSize: 13 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' }, date: { color: colors.subtle, fontSize: 12, textAlign: 'center' }, error: { color: colors.error, fontSize: 13 },
  footer: { paddingHorizontal: layout.inset, paddingTop: space.sm, gap: space.sm, backgroundColor: colors.background },
  exportButton: { width: '100%', maxWidth: layout.preview, alignSelf: 'center', minHeight: control.primary, borderRadius: radius.primary, backgroundColor: colors.accent, flexDirection: 'row', gap: space.xs, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm },
  exportText: { color: colors.onAccent, fontSize: typeSize.action, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  footerHint: { color: colors.subtle, fontSize: 11, textAlign: 'center' }, disabled: { opacity: 0.5 },
}));
