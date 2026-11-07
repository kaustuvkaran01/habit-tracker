import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Pressable from './haptic-pressable';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { canCheckIn, dateFromKey, dateKey, type Habit } from '../data/sample-habits';
import { Checkmark, HabitIcon } from './habit-ui';
import { feedback } from '../utils/feedback';
import { contrastInk } from '../data/habit-share';
import { createThemedStyles, useTheme } from './theme';

type HabitNoteDrawerProps = {
  visible: boolean;
  habit: Habit;
  day: string;
  today: Date;
  note: string;
  onChangeNote: (note: string) => void;
  onToggle: () => void;
  onSave: () => void;
  onClose: () => void;
};

export default function HabitNoteDrawer({ visible, habit, day, today, note, onChangeNote, onToggle, onSave, onClose }: HabitNoteDrawerProps) {
  const [presented, setPresented] = useState(false);
  const progress = useSharedValue(1);
  const sheetHeight = useSharedValue(400);
  const ready = useSharedValue(false);
  const latestClose = useRef(onClose);
  const latestVisible = useRef(visible);
  latestClose.current = onClose;
  latestVisible.current = visible;
  const { height } = useWindowDimensions();
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSpace = Math.max(insets.bottom, 16);
  const complete = habit.checkIns.includes(day);
  const allowed = canCheckIn(habit, day, today);
  const fullDate = dateFromKey(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const label = day === dateKey(today) ? 'Today' : fullDate;

  const finishDismissal = useCallback(() => setPresented(false), []);
  const closeAfterDrag = useCallback(() => {
    Keyboard.dismiss();
    feedback('selection');
    latestClose.current();
    setPresented(false);
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
    enabled: ready,
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
    onRequestClose={onClose} onShow={() => {
      if (!latestVisible.current) return;
      progress.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }, (finished) => {
        'worklet';
        if (finished) ready.value = true;
      });
    }}>
    <GestureHandlerRootView style={styles.root}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss note without saving" style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <Animated.View accessibilityViewIsModal onAccessibilityEscape={onClose} pointerEvents={visible ? 'auto' : 'none'}
          onLayout={(event) => { sheetHeight.value = Math.max(1, event.nativeEvent.layout.height); }}
          style={[styles.sheet, { marginBottom: bottomSpace, maxHeight: height - insets.top - bottomSpace - 24 }, sheetStyle]}>
          <GestureDetector gesture={drag}>
            <View collapsable={false} accessible accessibilityRole="button" accessibilityLabel="Close note drawer" accessibilityHint="Drag down or activate to dismiss without saving"
              accessibilityActions={[{ name: 'activate', label: 'Close note drawer' }]} onAccessibilityAction={onClose} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" bounces={false} style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.header}>
              <HabitIcon habit={habit} size={48} />
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={styles.title}>{habit.name}</Text>
                <Text accessibilityLabel={fullDate} style={styles.date}>{label}</Text>
              </View>
              <Pressable haptic={false} accessibilityRole="checkbox" accessibilityLabel={`Completion for ${fullDate}`} disabled={!allowed}
                accessibilityState={{ checked: complete, disabled: !allowed }} onPress={onToggle}
                style={({ pressed }) => [styles.completion, complete && { backgroundColor: habit.color, borderColor: habit.color }, (pressed || !allowed) && styles.dimmed]}>
                <Checkmark color={complete ? contrastInk(habit.color) : colors.muted} />
              </Pressable>
            </View>
            <TextInput keyboardAppearance={mode} accessibilityLabel={`Note for ${fullDate}`} multiline maxLength={1000} value={note} onChangeText={onChangeNote}
              placeholder="What went well? What got in the way?" placeholderTextColor={colors.muted} selectionColor={habit.color} style={styles.input} />
            <Pressable haptic="success" accessibilityRole="button" onPress={onSave} style={({ pressed }) => [styles.save, pressed && styles.dimmed]}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  root: { flex: 1 }, backdrop: { backgroundColor: '#000000' },
  keyboard: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 16 },
  sheet: { width: '100%', maxWidth: 560, flexShrink: 1, alignSelf: 'center', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 26, borderCurve: 'continuous', overflow: 'hidden' },
  handleArea: { height: 22, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.controlBorder },
  body: { flexGrow: 0 }, bodyContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 18, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heading: { flex: 1, gap: 6 },
  title: { color: colors.text, fontSize: 20, fontWeight: '600' }, date: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  completion: { width: 48, height: 48, borderRadius: 17, borderCurve: 'continuous', borderWidth: 1.5, borderColor: colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 100, maxHeight: 160, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, borderRadius: 20, borderCurve: 'continuous', padding: 18, color: colors.text, fontSize: 17, lineHeight: 25, textAlignVertical: 'top' },
  save: { minHeight: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  saveText: { color: colors.onAccent, fontSize: 18, fontWeight: '600' }, dimmed: { opacity: 0.65 },
}));
