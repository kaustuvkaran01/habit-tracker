import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { feedback } from '../utils/feedback';

type Props = {
  id: string; enabled: boolean; positions: RefObject<Record<string, LayoutRectangle>>;
  onDrop?: (id: string, target: string) => void; style?: StyleProp<ViewStyle>; children: ReactNode;
};
export default function DraggableHabit({ id, enabled, positions, onDrop, style, children }: Props) {
  const x = useSharedValue(0), y = useSharedValue(0), active = useSharedValue(false);
  const latest = useRef({ id, positions, onDrop });
  latest.current = { id, positions, onDrop };
  const measured = useRef<LayoutRectangle | null>(null);
  useEffect(() => {
    if (measured.current) positions.current[id] = measured.current;
    return () => { delete positions.current[id]; };
  }, [id, positions]);
  function finish(dx: number, dy: number) {
    const { id, positions, onDrop } = latest.current;
    const origin = positions.current[id];
    if (!origin) return;
    const point = { x: origin.x + origin.width / 2 + dx, y: origin.y + origin.height / 2 + dy };
    let closest = id, distance = Infinity;
    for (const [target, rect] of Object.entries(positions.current)) {
      const next = Math.hypot(rect.x + rect.width / 2 - point.x, rect.y + rect.height / 2 - point.y);
      if (next < distance) { closest = target; distance = next; }
    }
    if (closest !== id) {
      // The parent applies the new layout. Clear the old drag offset first.
      x.value = 0;
      y.value = 0;
      onDrop?.(id, closest);
      feedback('selection');
    }
  }
  const gesture = usePanGesture({
    enabled, runOnJS: false, maxPointers: 1, activateAfterLongPress: 350, cancelsJSResponder: true,
    onActivate: () => { 'worklet'; active.value = true; scheduleOnRN(feedback, 'longPress'); },
    onUpdate: (event) => { 'worklet'; x.value = event.translationX; y.value = event.translationY; },
    onDeactivate: (event) => {
      'worklet';
      active.value = false;
      if (!event.canceled) scheduleOnRN(finish, event.translationX, event.translationY);
      x.value = withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System });
      y.value = withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System });
    },
  });
  const animated = useAnimatedStyle(() => ({ zIndex: active.value ? 5 : 0, opacity: active.value ? 0.85 : 1, transform: [{ translateX: x.value }, { translateY: y.value }] }));
  return <GestureDetector gesture={gesture}><Animated.View
    onLayout={(event) => { measured.current = event.nativeEvent.layout; positions.current[id] = event.nativeEvent.layout; }}
    style={[style, animated]}>
    {children}
  </Animated.View></GestureDetector>;
}
