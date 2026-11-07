import { type ComponentRef, useLayoutEffect, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { type Habit, shiftMonth } from '../data/sample-habits';
import { MonthCalendar } from './habit-views';
import { feedback } from '../utils/feedback';

type SwipeableMonthCalendarProps = {
  habit: Habit;
  month: Date;
  today: Date;
  onChangeMonth: (month: Date) => void;
  onToggle: (key: string) => void;
  onNote: (key: string) => void;
};

export default function SwipeableMonthCalendar({ habit, month, today, onChangeMonth, onToggle, onNote }: SwipeableMonthCalendarProps) {
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const monthKey = month.getTime();

  // After a page settles, rebuild the neighbours and re-centre before painting.
  // Arrows, Today, the picker and size changes use this same positioning path.
  useLayoutEffect(() => {
    if (width > 0) pager.current?.scrollTo({ x: width, y: 0, animated: false });
  }, [monthKey, width]);

  function finishSwipe(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width <= 0) return;
    const page = Math.max(0, Math.min(2, Math.round(event.nativeEvent.contentOffset.x / width)));
    if (page !== 1) { feedback('selection'); onChangeMonth(shiftMonth(month, page - 1)); }
  }

  return <View style={styles.viewport} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 ? <ScrollView ref={pager} horizontal pagingEnabled directionalLockEnabled nestedScrollEnabled
      bounces={false} scrollsToTop={false} canCancelContentTouches
      automaticallyAdjustContentInsets={false} showsHorizontalScrollIndicator={false}
      contentOffset={{ x: width, y: 0 }} onMomentumScrollEnd={finishSwipe} style={styles.pager}>
      {[-1, 0, 1].map((offset) => <View key={offset} style={{ width }} collapsable={false}
        pointerEvents={offset === 0 ? 'auto' : 'none'}
        accessibilityElementsHidden={offset !== 0} importantForAccessibility={offset === 0 ? 'auto' : 'no-hide-descendants'}>
        <MonthCalendar habit={habit} month={shiftMonth(month, offset)} today={today}
          onToggle={onToggle} onNote={onNote} />
      </View>)}
    </ScrollView> : <MonthCalendar habit={habit} month={month} today={today} onToggle={onToggle} onNote={onNote} />}
  </View>;
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  pager: { flexGrow: 0 },
});
