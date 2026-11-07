import { type ComponentProps } from 'react';
import { Pressable as NativePressable } from 'react-native';
import { feedback, type FeedbackKind } from '../utils/feedback';

type HapticPressableProps = ComponentProps<typeof NativePressable> & {
  haptic?: FeedbackKind | false;
  longPressHaptic?: FeedbackKind | false;
};

export default function HapticPressable({ haptic, longPressHaptic = 'longPress', onPress, onLongPress, disabled, accessibilityRole, accessibilityState, ...props }: HapticPressableProps) {
  const blocked = !!disabled || !!accessibilityState?.disabled;
  const isChoice = accessibilityRole === 'tab' || accessibilityRole === 'radio' || accessibilityRole === 'checkbox';
  const alreadySelected = accessibilityState?.selected === true
    || (accessibilityRole === 'radio' && accessibilityState?.checked === true);
  return <NativePressable {...props} disabled={blocked} accessibilityRole={accessibilityRole} accessibilityState={accessibilityState}
    onPress={onPress ? (event) => {
      if (blocked) return;
      if (haptic !== false && !alreadySelected) feedback(haptic ?? (isChoice ? 'selection' : 'press'));
      return onPress(event);
    } : undefined}
    onLongPress={onLongPress ? (event) => {
      if (blocked) return;
      if (longPressHaptic !== false) feedback(longPressHaptic);
      return onLongPress(event);
    } : undefined} />;
}
