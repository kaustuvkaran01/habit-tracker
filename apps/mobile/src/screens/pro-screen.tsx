import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PreferenceIcon, type PreferenceSymbol, usePreferenceStyles, PrimaryButton, SheetHeader } from '../components/preference-ui';
import { createThemedStyles, useTheme } from '../components/theme';

const PLANS = [
  { id: 'lifetime', name: 'Lifetime', price: '₹ 5,900', interval: '', description: 'Pay once. Unlimited access forever.' },
  { id: 'annual', name: 'Annual', price: '₹ 2,499', interval: '/ year', description: '₹5,988', discount: 'Save 58%' },
  { id: 'monthly', name: 'Monthly', price: '₹ 499', interval: '/ month', description: 'Recurring billing. Cancel anytime.' },
] as const;

const FEATURES: { title: string; description: string; symbol: PreferenceSymbol; color: string }[] = [
  { title: 'Unlimited number of habits', description: 'Create space for every habit you want to build.', symbol: 'hash', color: '#36C9A0' },
  { title: 'Home Screen Widgets', description: 'Keep your favourite habit on your home screen.', symbol: 'grid', color: '#64A4F5' },
  { title: 'Multiple Reminders', description: 'Set more than one reminder for the same habit.', symbol: 'bell', color: '#EF747F' },
  { title: 'Charts & Statistics', description: 'See your consistency and progress over time.', symbol: 'chart', color: '#E9BC33' },
  { title: 'Dashboard Customization', description: 'Choose which streaks, goals and categories you see.', symbol: 'grid', color: '#33CCBF' },
  { title: 'Compact List', description: 'Choose how many days and habit names to display.', symbol: 'list', color: '#29BFDA' },
  { title: 'Keep archived habits', description: 'Restore archived habits anytime, with no expiry.', symbol: 'archive', color: '#F39A4A' },
  { title: 'Support an Indie Developer', description: 'Help shape the future of Habit Tracker.', symbol: 'sparkle', color: '#BA8FE8' },
];

export default function ProScreen({ onClose }: { onClose: () => void }) {
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { mode } = useTheme();
  const [selected, setSelected] = useState<(typeof PLANS)[number]['id']>('annual');
  const insets = useSafeAreaInsets();
  const plan = PLANS.find((item) => item.id === selected)!;

  function continuePreview() {
    Alert.alert('Pro is coming soon', `${plan.name} is selected. These prices are a preview. Purchases are not available yet and you will not be charged.`);
  }

  return <View style={shared.screen} onAccessibilityEscape={onClose}>
    <SheetHeader title="Unlock Habit Tracker Pro" onClose={onClose} />
    <ScrollView style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={shared.scrollContent}>
      <View style={shared.content}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Pro plan" style={styles.plans}>
          {PLANS.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }}
            accessibilityLabel={`${item.name}, ${item.price} ${item.interval}, preview price`} onPress={() => setSelected(item.id)}
            style={({ pressed }) => [styles.plan, selected === item.id && styles.selectedPlan, pressed && styles.pressed]}>
            <View style={[styles.radio, selected === item.id && styles.selectedRadio]}>{selected === item.id && <View style={styles.radioDot} />}</View>
            <View style={styles.planDescription}>
              <Text style={styles.planName}>{item.name}</Text>
              <Text style={[styles.planHint, item.id === 'annual' && styles.oldPrice]}>{item.description}</Text>
              {item.id === 'annual' && <View style={styles.discount}><Text style={styles.discountText}>{item.discount}</Text></View>}
            </View>
            <View style={styles.priceColumn}><Text style={styles.price}>{item.price}</Text>{!!item.interval && <Text style={styles.interval}>{item.interval}</Text>}</View>
          </Pressable>)}
        </View>
        <View style={styles.restoreArea}>
          <Text style={styles.preview}>Preview prices · Purchases coming soon</Text>
          <Pressable accessibilityRole="button" onPress={() => Alert.alert('Restore purchases', 'Purchase restoration will be available when Pro billing is connected.')} style={styles.restore}>
            <Text style={styles.restoreText}>Already subscribed? Restore purchase</Text>
          </Pressable>
        </View>
        <View style={shared.section}>
          <Text style={shared.sectionLabel}>PLANNED PRO FEATURES</Text>
          {FEATURES.map((feature) => <View key={feature.title} style={styles.feature}>
            <PreferenceIcon symbol={feature.symbol} color={feature.color} />
            <View style={styles.featureText}><Text style={styles.featureTitle}>{feature.title}</Text><Text style={styles.featureDescription}>{feature.description}</Text></View>
          </View>)}
        </View>
      </View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}><View style={styles.footerContent}>
      <PrimaryButton onPress={continuePreview}>Continue</PrimaryButton>
    </View></View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  plans: { gap: 12 },
  plan: { minHeight: 96, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.border, borderRadius: 23, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  selectedPlan: { backgroundColor: colors.accentPanel, borderColor: colors.accentText },
  radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { backgroundColor: colors.accent, borderColor: colors.accent }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.onAccent },
  planDescription: { flex: 1, gap: 6 }, planName: { color: colors.text, fontWeight: '700', fontSize: 20 },
  planHint: { color: colors.subtle, fontSize: 13, lineHeight: 19 }, oldPrice: { textDecorationLine: 'line-through' },
  discount: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 }, discountText: { color: colors.onAccent, fontSize: 11, fontWeight: '600' },
  priceColumn: { alignItems: 'flex-end', gap: 5, flexShrink: 1 }, price: { color: colors.text, fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] }, interval: { color: colors.subtle, fontSize: 12 },
  restoreArea: { gap: 8 }, preview: { color: colors.subtle, fontSize: 12, textAlign: 'center' }, restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, restoreText: { color: colors.accentText, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  feature: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 20, borderCurve: 'continuous', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68 },
  featureText: { flex: 1, gap: 4 }, featureTitle: { color: colors.text, fontSize: 15, fontWeight: '600' }, featureDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  footer: { backgroundColor: colors.background, paddingHorizontal: 22, paddingTop: 12 }, footerContent: { width: '100%', maxWidth: 588, alignSelf: 'center' },
  pressed: { opacity: 0.7 },
}));
