import Modal from './private-modal';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BACK_SWIPE_EDGE_WIDTH, backSwipeProgress, shouldCompleteBackSwipe } from './right-drawer-gesture';
import { feedback } from '../utils/feedback';
import { createThemedStyles } from './theme';

type RightDrawerProps = {
  visible: boolean;
  children: ReactNode;
  inline?: boolean;
  dismissDisabled?: boolean;
  onRequestClose: () => void;
  onDismiss?: () => void;
};

export default function RightDrawer({ visible, children, inline = false, dismissDisabled = false, onRequestClose, onDismiss }: RightDrawerProps) {
  const styles = useStyles();
  const [presented, setPresented] = useState(false);
  const [inlineWidth, setInlineWidth] = useState(0);
  const progress = useSharedValue(1);
  const gestureAvailable = useSharedValue(false);
  const blocked = useSharedValue(dismissDisabled);
  useEffect(() => { blocked.value = dismissDisabled; }, [blocked, dismissDisabled]);
  const gestureEnabled = useDerivedValue(() => gestureAvailable.value && !blocked.value);
  const dragging = useSharedValue(false);
  const isPresented = useRef(false);
  const gestureFinishedClosing = useRef(false);
  const desiredVisibility = useRef(visible);
  const latestDismiss = useRef(onDismiss);
  const latestClose = useRef(onRequestClose);
  const { width: windowWidth } = useWindowDimensions();
  const width = inline && inlineWidth > 0 ? inlineWidth : windowWidth;
  desiredVisibility.current = visible;
  latestDismiss.current = onDismiss;
  latestClose.current = onRequestClose;

  const finishDismissal = useCallback(() => {
    isPresented.current = false;
    setPresented(false);
    if (inline || Platform.OS !== 'ios') latestDismiss.current?.();
  }, [inline]);

  const requestCloseAfterGesture = useCallback(() => {
    if (!isPresented.current || !desiredVisibility.current) return;
    // The UI-thread exit is complete. Closing React state must not start another animation.
    gestureFinishedClosing.current = true;
    feedback('selection');
    latestClose.current();
  }, []);

  const animateTo = useCallback((target: 0 | 1, onFinished?: () => void) => {
    gestureAvailable.value = false;
    dragging.value = false;
    cancelAnimation(progress);
    progress.value = withTiming(target, {
      duration: target === 0 ? 280 : 240,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      'worklet';
      if (!finished) return;
      if (target === 0) gestureAvailable.value = true;
      if (onFinished) scheduleOnRN(onFinished);
    });
  }, [dragging, gestureAvailable, progress]);

  const backGesture = usePanGesture({
    enabled: gestureEnabled,
    runOnJS: false,
    cancelsJSResponder: true,
    shouldCancelWhenOutside: false,
    activeOffsetX: 6,
    failOffsetX: -6,
    failOffsetY: [-12, 12],
    maxPointers: 1,
    onActivate: (event) => {
      'worklet';
      cancelAnimation(progress);
      dragging.value = true;
      progress.value = backSwipeProgress(event.translationX, width);
    },
    onUpdate: (event) => {
      'worklet';
      if (!dragging.value) return;
      if (event.numberOfPointers !== 1) {
        dragging.value = false;
        gestureAvailable.value = false;
        progress.value = withSpring(0, { duration: 200, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System }, (finished) => {
          'worklet';
          if (finished) gestureAvailable.value = true;
        });
        return;
      }
      progress.value = backSwipeProgress(event.translationX, width);
    },
    onDeactivate: (event) => {
      'worklet';
      if (!dragging.value) return;
      dragging.value = false;
      gestureAvailable.value = false;
      const close = !event.canceled && shouldCompleteBackSwipe(event.translationX, event.velocityX, width);
      progress.value = withSpring(close ? 1 : 0, {
        duration: 200,
        dampingRatio: 1,
        velocity: event.velocityX / Math.max(1, width),
        overshootClamping: true,
        reduceMotion: ReduceMotion.System,
      }, (finished) => {
        'worklet';
        if (!finished) return;
        if (close) scheduleOnRN(requestCloseAfterGesture);
        else gestureAvailable.value = true;
      });
    },
  });

  useEffect(() => {
    if (visible) {
      if (!isPresented.current) {
        progress.value = 1;
        gestureFinishedClosing.current = false;
        isPresented.current = true;
        setPresented(true);
      } else {
        animateTo(0);
      }
    } else if (isPresented.current) {
      if (gestureFinishedClosing.current) {
        gestureFinishedClosing.current = false;
        finishDismissal();
      } else {
        animateTo(1, finishDismissal);
      }
    }
    return () => {
      gestureAvailable.value = false;
      dragging.value = false;
      cancelAnimation(progress);
    };
  }, [visible, animateTo, dragging, finishDismissal, gestureAvailable, progress]);

  useEffect(() => {
    if (inline && presented && desiredVisibility.current) animateTo(0);
  }, [inline, presented, animateTo]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * width }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 0.18 * (1 - progress.value) }));

  function openPanel() {
    if (desiredVisibility.current) animateTo(0);
  }

  const panel = <>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
    <Animated.View accessibilityViewIsModal onAccessibilityEscape={() => { if (!dismissDisabled) onRequestClose(); }} pointerEvents={visible ? 'auto' : 'none'} style={[styles.panel, panelStyle]}>
      {children}
      <GestureDetector gesture={backGesture}>
        <View collapsable={false} accessible={false} importantForAccessibility="no" style={styles.backGestureEdge} />
      </GestureDetector>
    </Animated.View>
  </>;

  if (inline) {
    if (!presented) return null;
    return <GestureHandlerRootView style={styles.inlineOverlay} onLayout={(event) => {
      setInlineWidth(event.nativeEvent.layout.width);
    }}>
      {panel}
    </GestureHandlerRootView>;
  }

  return <Modal visible={presented} transparent animationType="none" presentationStyle="overFullScreen"
    statusBarTranslucent onRequestClose={onRequestClose} onShow={openPanel}
    onDismiss={() => { if (!desiredVisibility.current) latestDismiss.current?.(); }}>
    <GestureHandlerRootView style={styles.overlay}>{panel}</GestureHandlerRootView>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  overlay: { flex: 1 },
  inlineOverlay: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  scrim: { backgroundColor: '#000000' },
  panel: { flex: 1, backgroundColor: colors.background },
  backGestureEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: BACK_SWIPE_EDGE_WIDTH },
}));
