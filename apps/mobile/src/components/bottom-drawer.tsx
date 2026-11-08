import Modal from './private-modal';
import { space, layout, radius, control } from './design-tokens';
import { useTranslation } from '../i18n/context';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pressable from './haptic-pressable';
import { createThemedStyles } from './theme';
import { feedback } from '../utils/feedback';

export default function BottomDrawer({ visible, onClose, onDismiss, children, label, dismissDisabled = false }: {
  visible: boolean; onClose: () => void; onDismiss?: () => void; children: ReactNode; label: string; dismissDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const [presented, setPresented] = useState(false);
  const progress = useSharedValue(1);
  const sheetHeight = useSharedValue(400);
  const ready = useSharedValue(false);
  const close = () => { if (!dismissDisabled) onClose(); };
  const latestClose = useRef(close), latestDismiss = useRef(onDismiss);
  latestDismiss.current = onDismiss;
  const latestVisible = useRef(visible);
  latestClose.current = close;
  latestVisible.current = visible;
  const { height } = useWindowDimensions();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const bottomSpace = Math.max(insets.bottom, 16);
  const finishDismissal = useCallback(() => { setPresented(false); if (Platform.OS !== 'ios') latestDismiss.current?.(); }, []);
  const closeAfterDrag = useCallback(() => {
    Keyboard.dismiss();
    feedback('selection');
    latestClose.current();
    setPresented(false);
    if (Platform.OS !== 'ios') latestDismiss.current?.();
  }, []);

  useEffect(() => {
    if (visible) {
      if (!presented) {
        progress.value = 1;
        setPresented(true);
      }
    } else if (presented) {
      Keyboard.dismiss();
      ready.value = false;
      cancelAnimation(progress);
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finishDismissal);
      });
    }
  }, [visible, presented, finishDismissal, progress, ready]);

  useEffect(() => () => { ready.value = false; cancelAnimation(progress); }, [progress, ready]);

  const drag = usePanGesture({
    enabled: dismissDisabled ? false : ready,
    runOnJS: false,
    cancelsJSResponder: true,
    activeOffsetY: 6,
    failOffsetY: -6,
    failOffsetX: [-16, 16],
    maxPointers: 1,
    onUpdate: (event) => {
      'worklet';
      progress.value = Math.max(0, Math.min(1, event.translationY / sheetHeight.value));
    },
    onDeactivate: (event) => {
      'worklet';
      ready.value = false;
      const close = !event.canceled && event.velocityY > -200
        && (event.translationY >= sheetHeight.value * 0.25 || (event.translationY >= 20 && event.velocityY >= 650));
      progress.value = withSpring(close ? 1 : 0, {
        duration: 200, dampingRatio: 1, velocity: event.velocityY / sheetHeight.value,
        overshootClamping: true, reduceMotion: ReduceMotion.System,
      }, (finished) => {
        'worklet';
        if (!finished) return;
        if (close) scheduleOnRN(closeAfterDrag);
        else ready.value = true;
      });
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: progress.value * (sheetHeight.value + bottomSpace) }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: (1 - progress.value) * 0.6 }));

  return <Modal visible={presented} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent
    onRequestClose={close} onDismiss={() => { if (Platform.OS === 'ios') latestDismiss.current?.(); }} onShow={() => {
      if (!latestVisible.current) return;
      progress.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }, (finished) => {
        'worklet';
        if (finished) ready.value = true;
      });
    }}>
    <GestureHandlerRootView style={styles.root}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable disabled={dismissDisabled} accessibilityState={{ disabled: dismissDisabled }} accessibilityRole="button" accessibilityLabel={t("Dismiss {value0}", { value0: label })} style={StyleSheet.absoluteFill} onPress={close} />
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <Animated.View accessibilityViewIsModal onAccessibilityEscape={close} pointerEvents={visible ? 'auto' : 'none'}
          onLayout={(event) => { sheetHeight.value = Math.max(1, event.nativeEvent.layout.height); }}
          style={[styles.sheet, { marginBottom: bottomSpace, maxHeight: height - insets.top - bottomSpace - 24 }, sheetStyle]}>
          <GestureDetector gesture={drag}>
            <View collapsable={false} accessible accessibilityRole="button" accessibilityLabel={t("Close {value0}", { value0: label })} accessibilityHint={t("Drag down or activate to dismiss without saving")}
              accessibilityState={{ disabled: dismissDisabled }}
              accessibilityActions={[{ name: 'activate', label: t("Close {value0}", { value0: label }) }]} onAccessibilityAction={close} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" bounces={false} style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  root: { flex: 1 }, backdrop: { backgroundColor: '#000000' },
  keyboard: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: layout.inset, paddingTop: layout.inset },
  sheet: { width: '100%', maxWidth: layout.form, flexShrink: 1, alignSelf: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' },
  handleArea: { minHeight: control.touch, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.controlBorder },
  body: { flexGrow: 0 }, bodyContent: { paddingHorizontal: layout.inset, paddingTop: 0, paddingBottom: space.md, gap: layout.group },
}));
