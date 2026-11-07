import { useRef, useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Pressable from './haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from './preference-ui';
import AppIcon from './app-icon';
import { createThemedStyles, useTheme } from './theme';

const WALLPAPERS = [
  { source: require('../../assets/wallpapers/winning.jpg'), label: 'Winning', background: '#E5E5DF' },
  { source: require('../../assets/wallpapers/dream-big.jpg'), label: 'Dream big', background: '#080808' },
  { source: require('../../assets/wallpapers/psychological.jpg'), label: 'Mental strength', background: '#050505' },
  { source: require('../../assets/wallpapers/discipline.jpg'), label: 'Discipline', background: '#EEEAE7' },
  { source: require('../../assets/wallpapers/consistency.jpg'), label: 'Consistency', background: '#080808' },
];

export default function WallpaperPreview({ visible, onClose, onExplore }: { visible: boolean; onClose: () => void; onExplore?: () => void }) {
  const { height, width } = useWindowDimensions();
  const [frontCard, setFrontCard] = useState(2);
  const styles = useStyles();
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  const pendingExplore = useRef(false);
  const cardWidth = Math.min(160, (Math.min(420, width - 48) - 2) * 0.43, height * 0.19);
  const cardHeight = cardWidth / 0.6;

  function finishDismissal() {
    if (!pendingExplore.current) return;
    pendingExplore.current = false;
    onExplore?.();
  }
  function explore() {
    pendingExplore.current = !!onExplore;
    onClose();
    if (Platform.OS !== 'ios') finishDismissal();
  }

  return <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose} onDismiss={finishDismissal}>
    <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close wallpaper preview" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close wallpaper preview" onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <AppIcon name="close" size={20} color="#FFFFFF" />
        </Pressable>
        <ScrollView bounces={false} indicatorStyle={mode === 'dark' ? 'white' : 'black'} style={styles.scroll}>
          <View style={[styles.artwork, { height: cardHeight + 80 }]}>
            {WALLPAPERS.map((wallpaper, index) => <Pressable key={wallpaper.label} accessibilityRole="button"
              accessibilityLabel={`${wallpaper.label} wallpaper`} accessibilityHint="Bring this wallpaper to the front"
              accessibilityState={{ selected: frontCard === index }} onPress={() => setFrontCard(index)}
              style={[styles.wallpaperCard, {
                width: cardWidth, height: cardHeight, marginLeft: -cardWidth / 2,
                backgroundColor: wallpaper.background, zIndex: frontCard === index ? 10 : 5 - Math.abs(index - 2),
                transform: [{ rotate: `${(index - 2) * 12}deg` }],
              }]}>
              <Image source={wallpaper.source} resizeMode="contain" accessible={false} style={styles.wallpaperImage} />
            </Pressable>)}
            <Text style={styles.fanHint}>Tap a card to bring it forward</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>COLLECT A LITTLE MOTIVATION</Text>
            <Text accessibilityRole="header" style={styles.title}>Your streak.{`\n`}Your wallpaper.</Text>
            <Text style={styles.message}>Unlock wallpapers as your streak grows. Complete 90 scheduled days in a row for a permanent champion badge, then start a fresh cycle.</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}><PrimaryButton onPress={explore}>{onExplore ? 'Explore the collection' : 'Got it!'}</PrimaryButton></View>
      </View>
    </View>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000B8', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, backgroundColor: colors.panel, borderRadius: 28, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  scroll: { flexGrow: 0 },
  artwork: { width: '100%', backgroundColor: '#211B2F' },
  wallpaperCard: { position: 'absolute', left: '50%', bottom: 44, borderRadius: 12, borderWidth: 1, borderColor: '#6C6379', transformOrigin: '50% 100%', boxShadow: '0 8px 18px rgba(0, 0, 0, 0.5)' },
  wallpaperImage: { width: '100%', height: '100%', borderRadius: 11 },
  fanHint: { position: 'absolute', bottom: 10, left: 16, right: 16, textAlign: 'center', fontSize: 11, color: '#B4A9C8' },
  closeButton: { position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#11101DBD', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  copy: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, gap: 12 },
  eyebrow: { color: colors.accentText, fontSize: 10, lineHeight: 16, fontWeight: '600', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 29, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  message: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  pressed: { opacity: 0.65 },
}));
