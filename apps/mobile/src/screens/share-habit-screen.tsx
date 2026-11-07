import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ActivityGrid } from '../components/habit-views';
import { Checkmark, HabitIcon, RoundButton, ShareIcon } from '../components/habit-ui';
import AppIcon from '../components/app-icon';
import { HABIT_COLORS } from '../data/habit-draft';
import { initialShareAppearance, type ShareAppearance, sharePresentation } from '../data/habit-share';
import { type Habit } from '../data/sample-habits';
import { feedback } from '../utils/feedback';
import { createThemedStyles, ThemeScope, useTheme } from '../components/theme';

export default function ShareHabitScreen({ habit, today, onClose }: { habit: Habit; today: Date; onClose: () => void }) {
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const [appearance, setAppearance] = useState(() => initialShareAppearance(habit));
  const [sharing, setSharing] = useState(false);
  const [ready, setReady] = useState(false);
  const previewRef = useRef<ComponentRef<typeof View>>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const busy = useRef(false);
  const lastCapture = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  const { width } = useWindowDimensions();
  const card = sharePresentation(habit, today, appearance);
  const patch = (settings: Partial<ShareAppearance>) => setAppearance((current) => ({ ...current, ...settings }));

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (lastCapture.current) releaseCapture(lastCapture.current);
    };
  }, []);

  async function shareImage() {
    if (busy.current || !ready || !previewRef.current) return;
    busy.current = true;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Image sharing is not available on this device.');
        return;
      }
      if (!mounted.current) return;
      // Bring the card into view before capture, even after scrolling down to the switches.
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!mounted.current || !previewRef.current) return;
      if (lastCapture.current) {
        releaseCapture(lastCapture.current);
        lastCapture.current = undefined;
      }
      const uri = await captureRef(previewRef.current, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!mounted.current) { releaseCapture(uri); return; }
      // Keep the file available while the receiving app reads it, including on Android.
      lastCapture.current = uri;
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Share ${habit.name}`,
        anchor: { x: width / 2, y: 60, width: 1, height: 1 },
      });
    } catch {
      if (mounted.current) { feedback('error'); Alert.alert('Could not share image', 'Please try again. Your habit and check-ins have not changed.'); }
    } finally {
      busy.current = false;
      if (mounted.current) setSharing(false);
    }
  }

  return <View style={styles.screen}>
    <View style={styles.header}>
      <View style={styles.grabber} />
      <View style={styles.headerRow}>
        <RoundButton label="Close share habit" onPress={onClose} disabled={sharing}><AppIcon name="close" size={20} /></RoundButton>
        <Text accessibilityRole="header" style={styles.title}>Share Habit</Text>
        <RoundButton label="Share habit image" onPress={shareImage} accent disabled={sharing || !ready}><ShareIcon color={colors.onAccent} /></RoundButton>
      </View>
    </View>
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} indicatorStyle={mode === 'dark' ? 'white' : 'black'} removeClippedSubviews={false}>
      <View style={styles.content}>
        <View ref={previewRef} collapsable={false} onLayout={() => setReady(true)} style={[styles.preview, { backgroundColor: card.accent }]}>
          <View style={[styles.previewCard, { backgroundColor: card.cardBackground }]}>
            <ThemeScope mode={appearance.theme}>
              <View style={styles.previewHeading}>
                <View style={[styles.previewIcon, { backgroundColor: `${card.accent}16` }]}>
                  <HabitIcon habit={{ icon: habit.icon, emoji: habit.emoji, color: card.text }} size={44} bare />
                </View>
                <View style={styles.previewHeadingText}>
                  <Text numberOfLines={2} style={[styles.previewName, { color: card.text }]}>{card.title}</Text>
                  {card.description !== undefined && <Text numberOfLines={3} style={[styles.previewDescription, { color: card.text }]}>{card.description}</Text>}
                </View>
                {card.completion !== undefined && <View style={[styles.completion, { backgroundColor: card.completion ? card.accent : `${card.accent}18`, borderColor: `${card.accent}66` }]}>
                  <Checkmark color={card.completion ? card.accentInk : card.muted} />
                </View>}
              </View>
              <ActivityGrid habit={{ ...habit, color: card.accent }} today={today} />
            </ThemeScope>
            <View style={styles.previewFooter}>
              <Text style={[styles.previewBrand, { color: card.muted }]}>Habit Tracker</Text>
              {card.streak !== undefined && <View style={styles.previewBadges}>
                <View style={[styles.previewBadge, { backgroundColor: `${card.accent}16` }]}><Text style={[styles.previewBadgeText, { color: card.text }]}>{card.schedule}</Text></View>
                <View style={[styles.previewBadge, { backgroundColor: `${card.accent}16` }]}><Text style={[styles.previewBadgeText, { color: card.text }]}>{card.streak} days</Text></View>
              </View>}
            </View>
          </View>
          <Text style={[styles.frameBrand, { color: card.accentInk }]}>Habit Tracker</Text>
        </View>
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.appearancePanel}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Theme</Text>
            <View accessibilityRole="tablist" accessibilityLabel="Preview theme" style={styles.themeSelector}>
              {(['light', 'dark'] as const).map((theme) => <Pressable key={theme} disabled={sharing} accessibilityRole="tab" accessibilityLabel={`${theme} theme`}
                accessibilityState={{ selected: appearance.theme === theme, disabled: sharing }} onPress={() => patch({ theme })}
                style={[styles.themeButton, appearance.theme === theme && styles.selectedTheme]}>
                <Text style={[styles.themeLabel, appearance.theme === theme && styles.selectedThemeLabel]}>{theme === 'light' ? 'Light' : 'Dark'}</Text>
              </Pressable>)}
            </View>
          </View>
          <View style={styles.colorSection}>
            <Text style={styles.settingLabel}>Color</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Share image color" style={styles.palette}>
              {[0, 1, 2].map((row) => <View key={row} style={styles.paletteRow}>
                {HABIT_COLORS.slice(row * 7, row * 7 + 7).map((color) => <Pressable key={color} disabled={sharing} accessibilityRole="radio"
                  accessibilityLabel={`Color ${HABIT_COLORS.indexOf(color) + 1}, ${color}`} accessibilityState={{ checked: color === appearance.color, disabled: sharing }}
                  onPress={() => patch({ color })} style={[styles.colorRing, { borderColor: appearance.color === color ? colors.text : 'transparent' }]}>
                  <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                </Pressable>)}
              </View>)}
            </View>
          </View>
          {([
            { key: 'showCompletion', label: 'Show Completion Indicator' },
            { key: 'showDescription', label: 'Show Description' },
            { key: 'showStreak', label: 'Show Streak' },
          ] as const).map(({ key, label }) => <View key={key} style={styles.settingRow}>
            <Text style={[styles.settingLabel, styles.toggleLabel]}>{label}</Text>
            <Switch accessibilityLabel={label} value={appearance[key]} disabled={sharing} onValueChange={(value) => { feedback('selection'); patch({ [key]: value }); }}
              trackColor={{ false: colors.controlBorder, true: colors.accent }} thumbColor="#FFFFFF" />
          </View>)}
        </View>
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Share habit image" accessibilityState={{ disabled: sharing || !ready, busy: sharing }}
        disabled={sharing || !ready} onPress={shareImage} style={[styles.shareButton, (sharing || !ready) && styles.disabled]}>
        {sharing ? <ActivityIndicator color={colors.onAccent} /> : <ShareIcon color={colors.onAccent} />}<Text style={styles.shareButtonText}>{sharing ? 'Preparing image…' : 'Share Habit'}</Text>
      </Pressable>
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, scroll: { flex: 1 },
  header: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 14 }, grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.controlBorder, alignSelf: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center' }, title: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 18 }, content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 18 },
  preview: { borderRadius: 24, padding: 24, paddingBottom: 10, gap: 10, overflow: 'hidden' },
  previewCard: { padding: 10, gap: 12, borderRadius: 12, boxShadow: '0 2px 5px #00000040' },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, previewHeadingText: { flex: 1, gap: 4 }, previewIcon: { borderRadius: 12 },
  previewName: { fontSize: 14, fontWeight: '500' }, previewDescription: { fontSize: 12, lineHeight: 16 },
  completion: { width: 44, height: 44, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, previewBrand: { fontSize: 9, letterSpacing: 0.5 },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, previewBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12 }, previewBadgeText: { fontSize: 9 },
  frameBrand: { alignSelf: 'flex-end', fontSize: 13, fontWeight: '700' }, sectionLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, paddingLeft: 4, paddingTop: 4 },
  appearancePanel: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16 },
  settingRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 12 },
  settingLabel: { color: colors.text, fontSize: 15, fontWeight: '500' }, toggleLabel: { flex: 1 },
  themeSelector: { flexDirection: 'row', borderRadius: 22, padding: 3, backgroundColor: colors.control }, themeButton: { minHeight: 32, minWidth: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 20, paddingHorizontal: 10 },
  selectedTheme: { backgroundColor: colors.selected }, themeLabel: { color: colors.muted, fontSize: 13 }, selectedThemeLabel: { color: colors.accentText },
  colorSection: { paddingVertical: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  palette: { gap: 3 }, paletteRow: { flexDirection: 'row', gap: 3 }, colorRing: { flex: 1, aspectRatio: 1, borderRadius: 13, borderWidth: 2, padding: 1 }, colorSwatch: { flex: 1, borderRadius: 10 },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, backgroundColor: colors.background },
  shareButton: { width: '100%', maxWidth: 560, alignSelf: 'center', minHeight: 54, borderRadius: 30, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  shareButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' }, disabled: { opacity: 0.6 },
}));
