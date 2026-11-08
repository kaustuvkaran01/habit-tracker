import { space, layout, control, radius, typeSize, habitChip } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Habit } from '../data/habit-types';
import { addDays } from '../data/habit-calendar';
import { collectionProgress, type RetainedCollection, type WallpaperEdition, type WallpaperMilestone, WALLPAPER_MILESTONES } from '../data/habit-rewards';
import AppIcon from '../components/app-icon';
import { ChampionBadgeArt, CollectionWallpaper, WALLPAPER_TITLES } from '../components/collection-art';
import CollectionPreview, { type CollectionPreviewItem } from '../components/collection-preview';
import { HabitIcon } from '../components/habit-ui';
import { usePreferenceStyles, PrimaryButton, SheetHeader } from '../components/preference-ui';
import CycleProgressRing from '../components/cycle-progress-ring';
import { badgeDesignForCycle } from '../data/collection-design';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';
import { canUse } from '../data/pro-access';
import { useProAccess } from '../components/pro-access';

export default function WallpapersScreen({ habits, retainedCollections, today, onClose, onSelectWallpaper, onStartNextCycle }: {
  habits: Habit[]; retainedCollections: RetainedCollection[]; today: Date; onClose: () => void;
  onSelectWallpaper: (id: string, days: WallpaperMilestone, edition: WallpaperEdition) => void;
  onStartNextCycle: (id: string) => void;
}) {
  const { t, locale } = useTranslation();
  const access = useProAccess();
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { colors, mode } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'wallpapers' | 'badges'>('wallpapers');
  const [preview, setPreview] = useState<CollectionPreviewItem>({ kind: 'wallpaper', days: 7 });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = measuredWidth || Math.min(layout.content, width - layout.inset * 2);
  const columns = contentWidth >= 500 ? 4 : contentWidth < 280 ? 2 : 3;
  const tileWidth = (contentWidth - (columns - 1) * space.sm) / columns;
  const thumbnailWidth = Math.min(92, tileWidth - 16);
  const badgeColumns = contentWidth >= 500 ? 3 : 2;
  const badgeWidth = (contentWidth - (badgeColumns - 1) * space.sm) / badgeColumns;
  const collections = [...habits, ...retainedCollections];
  const habit = collections.find((item) => item.id === selectedId) ?? habits.find((item) => !item.archived) ?? collections[0];
  const deleted = habit !== undefined && !('checkIns' in habit);
  const progress = habit ? collectionProgress(habit, today) : null;
  const cycleProgress = progress?.completedCycle ? 90 : Math.min(progress?.currentStreak ?? 0, 90);
  const nextPatchCycle = (progress?.rewards.cycle ?? 1) + (progress?.completedCycle ? 1 : 0);
  const upcomingCycles = Array.from({ length: 5 }, (_, index) => nextPatchCycle + index);

  function openWallpaper(days: WallpaperMilestone) {
    if (!progress?.collected.has(days)) {
      Alert.alert(t("{value0}-day reward", { value0: days }), t("Reach a {value0}-day calendar streak to unlock {value1}. Your current streak is {value2}.", { value0: days, value1: t(WALLPAPER_TITLES[days]), value2: progress?.currentStreak ?? 0 }));
      return;
    }
    setPreview({ kind: 'wallpaper', days });
    setPreviewOpen(true);
  }

  function startAgain() {
    if (!habit || deleted || !progress?.completedCycle) return;
    Alert.alert(t("Start cycle {value0}?", { value0: progress.rewards.cycle + 1 }), t("Your wallpapers, badges, check-ins and notes stay yours. The next cycle starts on {value0}, so today’s completion counts only once.", { value0: addDays(today, 1).toLocaleDateString(locale) }), [
      { text: t('Keep this cycle'), style: 'cancel' }, { text: t('Start next cycle'), onPress: () => onStartNextCycle(habit.id) },
    ]);
  }

  return <View style={shared.screen} onAccessibilityEscape={onClose}>
    <SheetHeader title={t("Wallpapers & Badges")} onClose={onClose} />
    <ScrollView style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
      <View style={shared.content} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}>
        {!habit || !progress ? <View style={styles.empty}>
          <AppIcon name="sparkle" size={32} color={colors.accentText} /><Text style={styles.heading}>{t("Your collection starts with a habit.")}</Text><Text style={styles.description}>{t("Add a habit, then reach a 7-day streak to unlock your first wallpaper.")}</Text>
        </View> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitPicker}>
            {collections.map((item) => {
              const status = 'checkIns' in item ? item.archived ? 'Archived' : '' : 'Deleted';
              return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={status ? `${item.name}, ${t(status)}` : item.name}
                accessibilityState={{ selected: habit.id === item.id }} onPress={() => setSelectedId(item.id)}
                style={[styles.habitChip, habit.id === item.id && styles.selectedChip]}>
                <HabitIcon habit={item} size={habitChip.icon} /><Text numberOfLines={1} style={styles.chipLabel}>{item.name}{status ? ` · ${t(status)}` : ''}</Text>
              </Pressable>;
            })}
          </ScrollView>
          {deleted ? <Text style={styles.description}>{t("Wallpapers and badges earned before this habit was deleted.")}</Text> : <View style={styles.progressArea}>
            <Text style={styles.eyebrow}>{t("Cycle {value0}", { value0: progress.rewards.cycle })} · {habit.name.toUpperCase()}</Text>
            <CycleProgressRing key={`${habit.id}:${progress.rewards.cycle}`} completed={cycleProgress} />
            <Text style={styles.progressLabel}>{progress.completedCycle ? t("{value0} patch earned. Cycle complete.", { value0: t(badgeDesignForCycle(progress.rewards.cycle).name) }) : progress.startsTomorrow ? t('A fresh cycle starts tomorrow.') : t('Calendar-day streak')}</Text>
            <Text style={[styles.description, styles.progressDescription]}>{progress.completedCycle ? t('Keep your collection and begin another 90-day journey when you’re ready.')
              : progress.nextMilestone ? t("Next: {value0} at a {value1}-day streak. Earned rewards stay yours if a streak breaks.", { value0: t(WALLPAPER_TITLES[progress.nextMilestone]), value1: progress.nextMilestone }) : t('Keep showing up. Every day adds to your story.')}</Text>
            {!progress.completedCycle && <Text style={[styles.description, styles.progressDescription]}>{t('Rest days are added at the next completion. Missing a scheduled day breaks the streak.')}</Text>}
            {!progress.completedCycle && <Text style={styles.nextPatch}>{t("At 90 days: {value0} · {value1}", { value0: t(badgeDesignForCycle(progress.rewards.cycle).name), value1: t(badgeDesignForCycle(progress.rewards.cycle).virtue) })}</Text>}
            {progress.completedCycle && <PrimaryButton onPress={startAgain}>{t("Start cycle {value0}", { value0: progress.rewards.cycle + 1 })}</PrimaryButton>}
          </View>}
          {tab === 'wallpapers' && !canUse('wallpaper-export', access) && <Text style={styles.description}>{t('Milestones and celebrations are free. Export earned wallpapers with Pro. Badges stay free to share.')}</Text>}
          <View accessibilityRole="tablist" accessibilityLabel={t("Collection type")} style={styles.tabs}>
            {(['wallpapers', 'badges'] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.selectedTab]}>
              <Text style={[styles.tabText, tab === item && styles.selectedTabText]}>{item === 'wallpapers' ? t("Wallpapers · {value0}/7", { value0: progress.collected.size }) : t("Badges · {value0}", { value0: progress.rewards.badges.length })}</Text>
            </Pressable>)}
          </View>
          {tab === 'wallpapers' ? <View style={styles.gallery}>{WALLPAPER_MILESTONES.map((days) => {
            const unlocked = progress.collected.has(days);
            return <Pressable key={days} accessibilityRole="button" accessibilityLabel={t("{value0}, {value1}-day reward, {value2}{value3}", { value0: t(WALLPAPER_TITLES[days]), value1: days, value2: t(unlocked ? 'unlocked' : 'locked'), value3: progress.rewards.selectedWallpaper === days ? ', ' + t('selected') : '' })}
              disabled={deleted && !unlocked} onPress={() => openWallpaper(days)} style={[styles.wallpaperTile, { width: tileWidth }]}>
              <View style={[styles.wallpaperFrame, !unlocked && styles.lockedArt]}><View style={styles.thumbnail}><CollectionWallpaper days={days} width={thumbnailWidth}
                edition={progress.rewards.selectedWallpaper === days ? progress.rewards.selectedWallpaperEdition : 'landscape'} /></View></View>
              <View style={styles.tileMeta}><Text numberOfLines={2} style={styles.wallpaperTitle}>{t(WALLPAPER_TITLES[days])}</Text><View style={styles.tileStatus}>
                <AppIcon name={unlocked ? 'check' : 'lock'} size={13} color={unlocked ? accentForeground('#71D5BB', mode) : colors.muted} /><Text style={styles.tileHint}>{t("{count} days", { count: days })}{progress.rewards.selectedWallpaper === days ? ' · ' + t('Your pick') : ''}</Text>
              </View></View>
            </Pressable>;
          })}</View> : <View style={styles.badgeSections}>
            {progress.rewards.badges.length > 0 && <><Text style={styles.sectionLabel}>{t("YOUR PERMANENT PATCHES")}</Text><View style={styles.badgeGallery}>{progress.rewards.badges.map((badge) => {
              const design = badgeDesignForCycle(badge.cycle);
              return <Pressable key={badge.id} accessibilityRole="button" accessibilityLabel={t("Share {value0} permanent 90-day patch, cycle {value1}", { value0: t(design.name), value1: badge.cycle })} onPress={() => { setPreview({ kind: 'badge', badge }); setPreviewOpen(true); }} style={[styles.badgeTile, { width: badgeWidth }]}>
                <ChampionBadgeArt cycle={badge.cycle} size={badgeWidth - 16} /><Text style={styles.tileTitle}>{t(design.name)} · {t(design.virtue)}</Text><Text style={styles.tileHint}>{t("Cycle {value0} · 90 days", { value0: badge.cycle })}</Text>
                <View style={styles.shareHint}><AppIcon name="share" size={13} color={colors.accentText} /><Text style={styles.shareLabel}>{t("Share patch")}</Text></View>
              </Pressable>;
            })}</View></>}
            {deleted ? progress.rewards.badges.length === 0 && <Text style={styles.description}>{t("No badges earned for this habit.")}</Text> : <>
            <Text style={styles.sectionLabel}>{t("YOUR NEXT CHAPTERS")}</Text><Text style={styles.description}>{t("One animal patch for every completed 90-day cycle. Collect the set and keep building your collection.")}</Text>
            <View style={styles.badgeGallery}>{upcomingCycles.map((cycle) => {
              const design = badgeDesignForCycle(cycle);
              return <Pressable key={cycle} accessibilityRole="button" accessibilityLabel={t("{value0}, {value1}, locked cycle {value2} patch", { value0: t(design.name), value1: t(design.virtue), value2: cycle })}
                onPress={() => Alert.alert(`${t(design.name)} · ${t(design.virtue)}`, t("Earn this patch with a 90-day calendar streak in cycle {value0}. Earned patches stay yours.", { value0: cycle }))} style={[styles.badgeTile, { width: badgeWidth }]}>
                <View style={styles.waitingBadge}><ChampionBadgeArt cycle={cycle} size={badgeWidth - 16} /></View><Text style={styles.tileTitle}>{t(design.name)} · {t(design.virtue)}</Text>
                <View style={styles.shareHint}><AppIcon name="lock" size={12} color={colors.muted} /><Text style={styles.tileHint}>{t("Cycle {value0} · 90 days", { value0: cycle })}</Text></View>
              </Pressable>;
            })}</View></>}
          </View>}
          <Text style={styles.localNote}>{t("Saved on this device · Phone wallpapers are applied through an image export · Cloud backup is not enabled")}</Text>
        </>}
      </View>
    </ScrollView>
    {habit && <CollectionPreview visible={previewOpen} habit={habit} item={preview} onClose={() => setPreviewOpen(false)} onSelectWallpaper={(days, edition) => onSelectWallpaper(habit.id, days, edition)} />}
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  habitPicker: { gap: space.xs, alignItems: 'center' }, habitChip: { maxWidth: habitChip.maxWidth, padding: habitChip.inset, paddingRight: habitChip.inset, flexDirection: 'row', alignItems: 'center', gap: habitChip.gap, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, minHeight: habitChip.height },
  selectedChip: { borderColor: colors.accentText, backgroundColor: colors.accentPanel }, chipLabel: { color: colors.text, fontSize: habitChip.font, flexShrink: 1 },
  progressArea: { alignItems: 'center', gap: space.md, paddingVertical: space.xs }, eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: '600', textAlign: 'center' },
  progressLabel: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, progressDescription: { textAlign: 'center', maxWidth: 320 }, nextPatch: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.panel, padding: space.xxs, borderRadius: radius.control, gap: space.xxs }, tab: { flex: 1, padding: space.sm, minHeight: control.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small }, selectedTab: { backgroundColor: colors.selected }, tabText: { color: colors.muted, fontSize: 13, textAlign: 'center' }, selectedTabText: { color: colors.text, fontWeight: '600' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, wallpaperTile: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 16, overflow: 'hidden' }, wallpaperFrame: { overflow: 'hidden', alignItems: 'center', paddingTop: 10, paddingBottom: 2, backgroundColor: colors.raised }, thumbnail: { borderRadius: 8, overflow: 'hidden' }, lockedArt: { opacity: 0.32 },
  tileMeta: { padding: 8, gap: 5, minHeight: 65, justifyContent: 'center' }, wallpaperTitle: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'center' }, tileTitle: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }, tileStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, tileHint: { color: colors.muted, fontSize: 10, textAlign: 'center', flexShrink: 1 },
  badgeSections: { gap: layout.group }, badgeGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }, sectionLabel: { color: colors.subtle, fontSize: typeSize.caption, fontWeight: '600', letterSpacing: 1.3 },
  badgeTile: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, alignItems: 'center', paddingVertical: space.sm, gap: space.xs }, shareHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 7 }, shareLabel: { color: colors.accentText, fontSize: 11 },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: layout.section, paddingHorizontal: layout.inset }, waitingBadge: { opacity: 0.45 }, heading: { color: colors.text, fontSize: 19, fontWeight: '600', textAlign: 'center' }, description: { color: colors.muted, fontSize: 13, lineHeight: 20 }, localNote: { color: colors.subtle, fontSize: 11, lineHeight: 18, textAlign: 'center' },
}));
