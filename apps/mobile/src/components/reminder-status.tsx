import { Text, View } from 'react-native';
import Pressable from './haptic-pressable';
import { useReminders } from './reminders';
import { useTranslation } from '../i18n/context';
import { control, space } from './design-tokens';
import { useTheme } from './theme';
import { useAppPreferences } from './app-preferences';

export default function ReminderStatus({ onlyProblems = false }: { onlyProblems?: boolean }) {
  const { t, locale } = useTranslation(), state = useReminders(), { colors } = useTheme();
  const { retryPreferences } = useAppPreferences();
  if (onlyProblems && !(state.failed || (state.configured && (state.permission === 'denied' || state.permission === 'unavailable')))) return null;
  const style = { color: colors.muted, fontSize: 13, lineHeight: 19 };
  const message = state.permission === 'loading' ? t('Checking notification access…') : state.permission === 'denied' ? t('Notifications are turned off. Enable them in device settings.')
    : state.permission === 'unavailable' ? t('Notifications are unavailable on this device.')
      : state.permission === 'undetermined' ? t('Permission is requested when you save an enabled reminder.')
        : state.paused ? t('Reminders are waiting for saved data.') : state.scheduling ? t('Updating reminders…') : state.failed ? t('Could not update reminders. Please retry.')
          : state.coverageUntil ? t('Reminders scheduled through {value0}.', { value0: new Date(state.coverageUntil).toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }) : t('No upcoming reminders.');
  return <View style={{ gap: space.xs }}>
    <Text accessibilityRole={state.failed || state.permission === 'denied' ? 'alert' : 'text'} style={style}>{message}</Text>
    {state.coverageUntil !== null && <Text style={style}>{t('Open the app regularly to refresh future reminders. Times update to your device timezone when the app opens.')}</Text>}
    {(state.failed || state.permission === 'unavailable') && <Pressable accessibilityRole="button" onPress={state.retry} style={{ minHeight: control.touch, justifyContent: 'center' }}><Text style={{ color: colors.accentText }}>{t('Try again')}</Text></Pressable>}
    {state.paused && <Pressable accessibilityRole="button" onPress={() => { retryPreferences(); state.retry(); }} style={{ minHeight: control.touch, justifyContent: 'center' }}><Text style={{ color: colors.accentText }}>{t('Try again')}</Text></Pressable>}
    {(state.permission === 'denied' || state.permission === 'granted') && <Pressable accessibilityRole="button" onPress={() => { void state.openSettings(); }} style={{ minHeight: control.touch, justifyContent: 'center' }}><Text style={{ color: colors.accentText }}>{t('Open device settings')}</Text></Pressable>}
  </View>;
}
