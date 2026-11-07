import { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { createThemedStyles, useTheme } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RADIUS = 105;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CycleProgressRing({ completed }: { completed: number }) {
  const count = Math.max(0, Math.min(90, completed));
  const progress = useSharedValue(0);
  const styles = useStyles();
  const { colors } = useTheme();
  const gradientId = `progress-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  useEffect(() => {
    progress.value = withTiming(count / 90, { duration: 650, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [count, progress]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value), opacity: progress.value > 0 ? 1 : 0,
  }));

  return <View accessible accessibilityRole="progressbar" accessibilityLabel="90-day reward cycle"
    accessibilityValue={{ min: 0, max: 90, now: count, text: `${count} of 90 days, ${90 - count} days to go` }} style={styles.ring}>
    <Svg width={236} height={236} viewBox="0 0 236 236" accessible={false}>
      <Defs><LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#D1BEFF" /><Stop offset="1" stopColor={colors.accent} /></LinearGradient></Defs>
      <Circle cx={118} cy={118} r={RADIUS} fill="none" stroke={colors.control} strokeWidth={9} />
      <AnimatedCircle animatedProps={animatedProps} cx={118} cy={118} r={RADIUS} fill="none" stroke={`url(#${gradientId})`} strokeWidth={9}
        strokeLinecap="round" strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]} rotation={-90} originX={118} originY={118} />
    </Svg>
    <View pointerEvents="none" style={styles.counter}>
      <Text allowFontScaling={false} style={styles.count}>{count}<Text style={styles.total}>/90</Text></Text>
      <Text style={styles.remaining}>{90 - count} days to go</Text>
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => StyleSheet.create({
  ring: { width: 236, height: 236, alignSelf: 'center' },
  counter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  count: { color: colors.text, fontSize: 47, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  total: { color: colors.muted, fontSize: 33, fontWeight: '400' },
  remaining: { color: colors.muted, fontSize: 13 },
}));
