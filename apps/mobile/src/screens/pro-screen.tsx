import { space, layout, control, radius } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PreferenceIcon, type PreferenceSymbol, usePreferenceStyles, PrimaryButton, SheetHeader } from '../components/preference-ui';
import { createThemedStyles, useTheme } from '../components/theme';
import { PRO_CAPABILITIES, type ProCapability } from '../data/pro-access';

const PLANS = [
  { id: 'lifetime', name: 'Lifetime', price: '₹ 5,900', interval: '', description: 'Pay once. Unlimited access forever.' },
  { id: 'annual', name: 'Annual', price: '₹ 2,499', interval: '/ year', description: '₹5,988', discount: 'Save 58%' },
  { id: 'monthly', name: 'Monthly', price: '₹ 499', interval: '/ month', description: 'Recurring billing. Cancel anytime.' },
] as const;

const FEATURES: { title: string; description: string; symbol: PreferenceSymbol; color: string }[] = [
  { ...PRO_CAPABILITIES['wallpaper-export'], symbol: 'sparkle', color: '#AA95E9' },
  { ...PRO_CAPABILITIES.analytics, symbol: 'chart', color: '#36C9A0' },
  { ...PRO_CAPABILITIES['icloud-sync'], symbol: 'cloud', color: '#64A4F5' },
  { ...PRO_CAPABILITIES['active-habits'], symbol: 'hash', color: '#36C9A0' },
  { ...PRO_CAPABILITIES.widgets, symbol: 'grid', color: '#64A4F5' },
  { ...PRO_CAPABILITIES['multiple-reminders'], symbol: 'bell', color: '#EF747F' },
  { ...PRO_CAPABILITIES['dashboard-customization'], symbol: 'grid', color: '#33CCBF' },
  { title: 'Compact List', description: 'Choose how many days and habit names to display.', symbol: 'list', color: '#29BFDA' },
  { title: 'Keep archived habits', description: 'Your archived habits stay here while you have Pro.', symbol: 'archive', color: '#F39A4A' },
  { title: 'Support an Indie Developer', description: 'Help shape the future of Habit Tracker.', symbol: 'sparkle', color: '#BA8FE8' },
];

export default function ProScreen({ onClose, reason }: { onClose: () => void; reason?: ProCapability }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const shared = usePreferenceStyles();
  const { mode } = useTheme();
  const [selected, setSelected] = useState<(typeof PLANS)[number]['id']>('annual');
  const insets = useSafeAreaInsets();
  const plan = PLANS.find((item) => item.id === selected)!;

  function continuePreview() {
    Alert.alert(t('Pro is coming soon'), t("{value0} is selected. These prices are a preview. Purchases are not available yet and you will not be charged.", { value0: t(plan.name) }));
  }

  return <View style={shared.screen} onAccessibilityEscape={onClose}>
    <SheetHeader title={t("Unlock Habit Tracker Pro")} onClose={onClose} />
    <ScrollView style={shared.scroll} indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={shared.scrollContent}>
      <View style={shared.content}>
        {reason && <View style={styles.feature} accessibilityRole="summary">
          <PreferenceIcon symbol="lock" color="#AA95E9" />
          <View style={styles.featureText}><Text style={styles.featureTitle}>{t(PRO_CAPABILITIES[reason].title)}</Text>
            <Text style={styles.featureDescription}>{t(PRO_CAPABILITIES[reason].description)}</Text>
            <Text style={styles.featureDescription}>{t('Pro access required. Your progress stays saved.')}</Text></View>
        </View>}
        <View accessibilityRole="radiogroup" accessibilityLabel={t("Pro plan")} style={styles.plans}>
          {PLANS.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }}
            accessibilityLabel={t("{value0}, {value1} {value2}, preview price", { value0: t(item.name), value1: item.price, value2: t(item.interval) })} onPress={() => setSelected(item.id)}
            style={({ pressed }) => [styles.plan, selected === item.id && styles.selectedPlan, pressed && styles.pressed]}>
            <View style={[styles.radio, selected === item.id && styles.selectedRadio]}>{selected === item.id && <View style={styles.radioDot} />}</View>
            <View style={styles.planDescription}>
              <Text style={styles.planName}>{t(item.name)}</Text>
              <Text style={[styles.planHint, item.id === 'annual' && styles.oldPrice]}>{t(item.description)}</Text>
              {item.id === 'annual' && <View style={styles.discount}><Text style={styles.discountText}>{t(item.discount)}</Text></View>}
            </View>
            <View style={styles.priceColumn}><Text style={styles.price}>{item.price}</Text>{!!item.interval && <Text style={styles.interval}>{t(item.interval)}</Text>}</View>
          </Pressable>)}
        </View>
        <View style={styles.restoreArea}>
          <Text style={styles.preview}>{t("Preview prices · Purchases coming soon")}</Text>
          <Pressable accessibilityRole="button" onPress={() => Alert.alert(t('Restore purchases'), t('Purchase restoration will be available when Pro billing is connected.'))} style={styles.restore}>
            <Text style={styles.restoreText}>{t("Already subscribed? Restore purchase")}</Text>
          </Pressable>
        </View>
        <View style={shared.section}>
          <Text style={shared.sectionLabel}>{t("PLANNED PRO FEATURES")}</Text>
          {FEATURES.map((feature) => <View key={t(feature.title)} style={styles.feature}>
            <PreferenceIcon symbol={feature.symbol} color={feature.color} />
            <View style={styles.featureText}><Text style={styles.featureTitle}>{t(feature.title)}</Text><Text style={styles.featureDescription}>{t(feature.description)}</Text></View>
          </View>)}
        </View>
      </View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}><View style={styles.footerContent}>
      <PrimaryButton onPress={continuePreview}>{t("Continue")}</PrimaryButton>
    </View></View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  plans: { gap: space.sm },
  plan: { minHeight: 96, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', paddingHorizontal: layout.inset, paddingVertical: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
  selectedPlan: { backgroundColor: colors.accentPanel, borderColor: colors.accentText },
  radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.subtle, alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { backgroundColor: colors.accent, borderColor: colors.accent }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.onAccent },
  planDescription: { flex: 1, gap: space.xs }, planName: { color: colors.text, fontWeight: '700', fontSize: 20 },
  planHint: { color: colors.subtle, fontSize: 13, lineHeight: 19 }, oldPrice: { textDecorationLine: 'line-through' },
  discount: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 }, discountText: { color: colors.onAccent, fontSize: 11, fontWeight: '600' },
  priceColumn: { alignItems: 'flex-end', gap: 5, flexShrink: 1 }, price: { color: colors.text, fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] }, interval: { color: colors.subtle, fontSize: 12 },
  restoreArea: { gap: space.xs }, preview: { color: colors.subtle, fontSize: 12, textAlign: 'center' }, restore: { minHeight: control.touch, alignItems: 'center', justifyContent: 'center' }, restoreText: { color: colors.accentText, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  feature: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', padding: layout.inset, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: control.roomyRow },
  featureText: { flex: 1, gap: space.xxs }, featureTitle: { color: colors.text, fontSize: 15, fontWeight: '600' }, featureDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  footer: { backgroundColor: colors.background, paddingHorizontal: layout.inset, paddingTop: space.sm }, footerContent: { width: '100%', maxWidth: layout.content, alignSelf: 'center' },
  pressed: { opacity: 0.7 },
}));
