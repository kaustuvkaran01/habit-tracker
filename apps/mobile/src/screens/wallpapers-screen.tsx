import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, dateKey, type Habit } from '../data/sample-habits';
import { collectionProgress, type RetainedCollection, type WallpaperEdition, type WallpaperMilestone, WALLPAPER_MILESTONES } from '../data/habit-rewards';
import AppIcon from '../components/app-icon';
import { ChampionBadgeArt, CollectionWallpaper, WALLPAPER_TITLES } from '../components/collection-art';
import CollectionPreview, { type CollectionPreviewItem } from '../components/collection-preview';
import { HabitIcon } from '../components/habit-ui';
import { usePreferenceStyles, PrimaryButton, SheetHeader } from '../components/preference-ui';
import CycleProgressRing from '../components/cycle-progress-ring';
import { badgeDesignForCycle } from '../data/collection-design';
import { accentForeground, createThemedStyles, useTheme } from '../components/theme';

export default function WallpapersScreen({ habits, retainedCollections, today, onClose, onSelectWallpaper, onStartNextCycle }: {
  habits: Habit[]; retainedCollections: RetainedCollection[]; today: Date; onClose: () => void;
  onSelectWallpaper: (id: string, days: WallpaperMilestone, edition: WallpaperEdition) => void;
  onStartNextCycle: (id: string) => void;
}) {
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
  const contentWidth = measuredWidth || Math.min(600, width - 32);
  const columns = contentWidth >= 500 ? 4 : contentWidth < 280 ? 2 : 3;
  const tileWidth = (contentWidth - (columns - 1) * 10) / columns;
  const thumbnailWidth = Math.min(92, tileWidth - 16);
  const badgeColumns = contentWidth >= 500 ? 3 : 2;
  const badgeWidth = (contentWidth - (badgeColumns - 1) * 12) / badgeColumns;
  const collections = [...habits, ...retainedCollections];
  const habit = collections.find((item) => item.id === selectedId) ?? habits.find((item) => !item.archived) ?? collections[0];
  const deleted = habit !== undefined && !('checkIns' in habit);
  const progress = habit ? collectionProgress(habit, today) : null;
  const cycleProgress = progress?.completedCycle ? 90 : Math.min(progress?.currentStreak ?? 0, 90);
  const nextPatchCycle = (progress?.rewards.cycle ?? 1) + (progress?.completedCycle ? 1 : 0);
  const upcomingCycles = Array.from({ length: 5 }, (_, index) => nextPatchCycle + index);

  function openWallpaper(days: WallpaperMilestone) {
    if (!progress?.collected.has(days)) {
      Alert.alert(`${days}-day reward`, `Complete ${days} scheduled days in a row for this habit to unlock ${WALLPAPER_TITLES[days]}. Your current streak is ${progress?.currentStreak ?? 0}.`);
      return;
    }
    setPreview({ kind: 'wallpaper', days });
    setPreviewOpen(true);
  }

  function startAgain() {
    if (!habit || deleted || !progress?.completedCycle) return;
    Alert.alert(`Start cycle ${progress.rewards.cycle + 1}?`, `Your wallpapers, badges, check-ins and notes stay yours. The next cycle starts on ${dateKey(addDays(today, 1))}, so today’s completion counts only once.`, [
      { text: 'Keep this cycle', style: 'cancel' }, { text: 'Start next cycle', onPress: () => onStartNextCycle(habit.id) },
    ]);
  }

  return <View style={shared.screen} onAccessibilityEscape={onClose}>
    <SheetHeader title="Wallpapers & Badges" onClose={onClose} />
    <ScrollView style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={[shared.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
      <View style={shared.content} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}>
        {!habit || !progress ? <View style={styles.empty}>
          <AppIcon name="sparkle" size={32} color={colors.accentText} /><Text style={styles.heading}>Your collection starts with a habit.</Text><Text style={styles.description}>Add a habit, then reach a 7-day streak to unlock your first wallpaper.</Text>
        </View> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.habitPicker}>
            {collections.map((item) => {
              const status = 'checkIns' in item ? item.archived ? 'Archived' : '' : 'Deleted';
              return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={status ? `${item.name}, ${status}` : item.name}
                accessibilityState={{ selected: habit.id === item.id }} onPress={() => setSelectedId(item.id)}
                style={[styles.habitChip, habit.id === item.id && styles.selectedChip]}>
                <HabitIcon habit={item} size={28} /><Text numberOfLines={1} style={styles.chipLabel}>{item.name}{status ? ` · ${status}` : ''}</Text>
              </Pressable>;
            })}
          </ScrollView>
          {deleted ? <Text style={styles.description}>Wallpapers and badges earned before this habit was deleted.</Text> : <View style={styles.progressArea}>
            <Text style={styles.eyebrow}>CYCLE {progress.rewards.cycle} · {habit.name.toUpperCase()}</Text>
            <CycleProgressRing key={`${habit.id}:${progress.rewards.cycle}`} completed={cycleProgress} />
            <Text style={styles.progressLabel}>{progress.completedCycle ? `${badgeDesignForCycle(progress.rewards.cycle).name} patch earned. Cycle complete.` : progress.startsTomorrow ? 'A fresh cycle starts tomorrow.' : 'Consecutive scheduled days'}</Text>
            <Text style={[styles.description, styles.progressDescription]}>{progress.completedCycle ? 'Keep your collection and begin another 90-day journey when you’re ready.'
              : progress.nextMilestone ? `Next: ${WALLPAPER_TITLES[progress.nextMilestone]} at a ${progress.nextMilestone}-day streak. Earned rewards stay yours if a streak breaks.` : 'Keep showing up. Every day adds to your story.'}</Text>
            {!progress.completedCycle && <Text style={styles.nextPatch}>At 90 days: {badgeDesignForCycle(progress.rewards.cycle).name} · {badgeDesignForCycle(progress.rewards.cycle).virtue}</Text>}
            {progress.completedCycle && <PrimaryButton onPress={startAgain}>Start cycle {progress.rewards.cycle + 1}</PrimaryButton>}
          </View>}
          <View accessibilityRole="tablist" accessibilityLabel="Collection type" style={styles.tabs}>
            {(['wallpapers', 'badges'] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.selectedTab]}>
              <Text style={[styles.tabText, tab === item && styles.selectedTabText]}>{item === 'wallpapers' ? `Wallpapers · ${progress.collected.size}/7` : `Badges · ${progress.rewards.badges.length}`}</Text>
            </Pressable>)}
          </View>
          {tab === 'wallpapers' ? <View style={styles.gallery}>{WALLPAPER_MILESTONES.map((days) => {
            const unlocked = progress.collected.has(days);
            return <Pressable key={days} accessibilityRole="button" accessibilityLabel={`${WALLPAPER_TITLES[days]}, ${days}-day reward, ${unlocked ? 'unlocked' : 'locked'}${progress.rewards.selectedWallpaper === days ? ', selected' : ''}`}
              disabled={deleted && !unlocked} onPress={() => openWallpaper(days)} style={[styles.wallpaperTile, { width: tileWidth }]}>
              <View style={[styles.wallpaperFrame, !unlocked && styles.lockedArt]}><View style={styles.thumbnail}><CollectionWallpaper days={days} width={thumbnailWidth}
                edition={progress.rewards.selectedWallpaper === days ? progress.rewards.selectedWallpaperEdition : 'landscape'} /></View></View>
              <View style={styles.tileMeta}><Text numberOfLines={2} style={styles.wallpaperTitle}>{WALLPAPER_TITLES[days]}</Text><View style={styles.tileStatus}>
                <AppIcon name={unlocked ? 'check' : 'lock'} size={13} color={unlocked ? accentForeground('#71D5BB', mode) : colors.muted} /><Text style={styles.tileHint}>{days} days{progress.rewards.selectedWallpaper === days ? ' · Your pick' : ''}</Text>
              </View></View>
            </Pressable>;
          })}</View> : <View style={styles.badgeSections}>
            {progress.rewards.badges.length > 0 && <><Text style={styles.sectionLabel}>YOUR PERMANENT PATCHES</Text><View style={styles.badgeGallery}>{progress.rewards.badges.map((badge) => {
              const design = badgeDesignForCycle(badge.cycle);
              return <Pressable key={badge.id} accessibilityRole="button" accessibilityLabel={`Share ${design.name} permanent 90-day patch, cycle ${badge.cycle}`} onPress={() => { setPreview({ kind: 'badge', badge }); setPreviewOpen(true); }} style={[styles.badgeTile, { width: badgeWidth }]}>
                <ChampionBadgeArt cycle={badge.cycle} size={badgeWidth - 16} /><Text style={styles.tileTitle}>{design.name} · {design.virtue}</Text><Text style={styles.tileHint}>Cycle {badge.cycle} · 90 Days</Text>
                <View style={styles.shareHint}><AppIcon name="share" size={13} color={colors.accentText} /><Text style={styles.shareLabel}>Share patch</Text></View>
              </Pressable>;
            })}</View></>}
            {deleted ? progress.rewards.badges.length === 0 && <Text style={styles.description}>No badges earned for this habit.</Text> : <>
            <Text style={styles.sectionLabel}>YOUR NEXT CHAPTERS</Text><Text style={styles.description}>One animal patch for every completed 90-day cycle. Collect the set and keep building your collection.</Text>
            <View style={styles.badgeGallery}>{upcomingCycles.map((cycle) => {
              const design = badgeDesignForCycle(cycle);
              return <Pressable key={cycle} accessibilityRole="button" accessibilityLabel={`${design.name}, ${design.virtue}, locked cycle ${cycle} patch`}
                onPress={() => Alert.alert(`${design.name} · ${design.virtue}`, `Earn this permanent patch by completing cycle ${cycle}: 90 consecutive scheduled days. You keep every patch when you begin the next cycle.`)} style={[styles.badgeTile, { width: badgeWidth }]}>
                <View style={styles.waitingBadge}><ChampionBadgeArt cycle={cycle} size={badgeWidth - 16} /></View><Text style={styles.tileTitle}>{design.name} · {design.virtue}</Text>
                <View style={styles.shareHint}><AppIcon name="lock" size={12} color={colors.muted} /><Text style={styles.tileHint}>Cycle {cycle} · 90 Days</Text></View>
              </Pressable>;
            })}</View></>}
          </View>}
          <Text style={styles.localNote}>Saved on this device · Phone wallpapers are applied through an image export · Cloud backup is not enabled</Text>
        </>}
      </View>
    </ScrollView>
    {habit && <CollectionPreview visible={previewOpen} habit={habit} item={preview} onClose={() => setPreviewOpen(false)} onSelectWallpaper={(days, edition) => onSelectWallpaper(habit.id, days, edition)} />}
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  habitPicker: { gap: 8 }, habitChip: { maxWidth: 220, padding: 8, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel },
  selectedChip: { borderColor: colors.accentText, backgroundColor: colors.accentPanel }, chipLabel: { color: colors.text, fontSize: 13, flexShrink: 1 },
  progressArea: { alignItems: 'center', gap: 14, paddingVertical: 8 }, eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: '600', textAlign: 'center' },
  progressLabel: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }, progressDescription: { textAlign: 'center', maxWidth: 320 }, nextPatch: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.panel, padding: 4, borderRadius: 20, gap: 4 }, tab: { flex: 1, padding: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16 }, selectedTab: { backgroundColor: colors.selected }, tabText: { color: colors.muted, fontSize: 13, textAlign: 'center' }, selectedTabText: { color: colors.text, fontWeight: '600' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, wallpaperTile: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, borderRadius: 16, overflow: 'hidden' }, wallpaperFrame: { overflow: 'hidden', alignItems: 'center', paddingTop: 10, paddingBottom: 2, backgroundColor: colors.raised }, thumbnail: { borderRadius: 8, overflow: 'hidden' }, lockedArt: { opacity: 0.32 },
  tileMeta: { padding: 8, gap: 5, minHeight: 65, justifyContent: 'center' }, wallpaperTitle: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'center' }, tileTitle: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }, tileStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, tileHint: { color: colors.muted, fontSize: 10, textAlign: 'center', flexShrink: 1 },
  badgeSections: { gap: 16 }, badgeGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sectionLabel: { color: colors.subtle, fontSize: 10, fontWeight: '600', letterSpacing: 1.3 },
  badgeTile: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: 'center', paddingVertical: 12, gap: 6 }, shareHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 7 }, shareLabel: { color: colors.accentText, fontSize: 11 },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 24, paddingHorizontal: 14 }, waitingBadge: { opacity: 0.45 }, heading: { color: colors.text, fontSize: 19, fontWeight: '600', textAlign: 'center' }, description: { color: colors.muted, fontSize: 13, lineHeight: 20 }, localNote: { color: colors.subtle, fontSize: 11, lineHeight: 18, textAlign: 'center' },
}));
