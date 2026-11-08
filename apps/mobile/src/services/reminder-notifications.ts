import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isDateKey } from '../data/habit-rewards';
import { REMINDER_PREFIX, type PlannedReminder, type ReminderQueue, type ReminderTarget } from '../data/reminder-plan';

const CHANNEL = 'habit-reminders';
export type ReminderPermission = 'loading' | 'granted' | 'denied' | 'undetermined' | 'unavailable';
let channelReady: Promise<void> | null = null;
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Habit reminders', importance: Notifications.AndroidImportance.DEFAULT, sound: 'default', lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  }).then(() => undefined).catch(error => { channelReady = null; throw error; });
  await channelReady;
}
function permissionState(value: Notifications.NotificationPermissionsStatus): ReminderPermission {
  return value.granted || value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL || value.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    ? 'granted' : value.status === 'denied' ? 'denied' : 'undetermined';
}
export async function readReminderPermission(): Promise<ReminderPermission> {
  try { return permissionState(await Notifications.getPermissionsAsync()); } catch { return 'unavailable'; }
}
let permissionRequest: Promise<ReminderPermission> | null = null;
export function requestReminderPermission(): Promise<ReminderPermission> {
  if (permissionRequest) return permissionRequest;
  permissionRequest = (async () => {
    try {
      await ensureChannel();
      const previous = await Notifications.getPermissionsAsync();
      if (permissionState(previous) === 'granted' || !previous.canAskAgain) return permissionState(previous);
      return permissionState(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } }));
    } catch { return 'unavailable' as const; }
    finally { permissionRequest = null; }
  })();
  return permissionRequest;
}

export const nativeReminderQueue: ReminderQueue = {
  async list() {
    await ensureChannel();
    return (await Notifications.getAllScheduledNotificationsAsync()).map(item => ({ id: item.identifier,
      fingerprint: typeof item.content.data?.reminderFingerprint === 'string' ? item.content.data.reminderFingerprint : null }));
  },
  async cancel(id) { await Notifications.cancelScheduledNotificationAsync(id); },
  async schedule(item: PlannedReminder) {
    await Notifications.scheduleNotificationAsync({ identifier: item.id,
      content: { title: item.title, body: item.body, sound: 'default', data: { reminderTarget: item.target, reminderFingerprint: item.fingerprint } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.at), delivery: 'bestEffort', ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) },
    });
  },
};

export function reminderTarget(response: Notifications.NotificationResponse | null): ReminderTarget | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER || !response.notification.request.identifier.startsWith(REMINDER_PREFIX)) return null;
  const value: unknown = response.notification.request.content.data?.reminderTarget;
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('day' in value) || !isDateKey(value.day) || !('kind' in value)) return null;
  if (value.kind === 'daily') return { version: 1, kind: 'daily', day: value.day };
  return value.kind === 'habit' && 'habitId' in value && typeof value.habitId === 'string' && value.habitId.length > 0
    ? { version: 1, kind: 'habit', habitId: value.habitId, day: value.day } : null;
}

export function watchReminderResponses(onTarget: (target: ReminderTarget) => void) {
  const handled = new Set<string>();
  function receive(response: Notifications.NotificationResponse | null) {
    const target = reminderTarget(response);
    if (!target || !response) return;
    const key = response.notification.request.identifier + ':' + response.actionIdentifier;
    if (handled.has(key)) return;
    handled.add(key);
    // The coordinator queues navigation until hydration and modal dismissal.
    onTarget(target);
    try { Notifications.clearLastNotificationResponse(); } catch { /* In-memory delivery remains deduplicated if the native clear fails. */ }
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(receive);
  receive(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}

export function configureReminderPresentation() {
  Notifications.setNotificationHandler({ handleNotification: async notification => ({
    shouldShowBanner: notification.request.identifier.startsWith(REMINDER_PREFIX),
    shouldShowList: notification.request.identifier.startsWith(REMINDER_PREFIX),
    shouldPlaySound: notification.request.identifier.startsWith(REMINDER_PREFIX), shouldSetBadge: false,
  }) });
  return () => Notifications.setNotificationHandler(null);
}

export async function clearOwnedReminders() {
  for (const item of await Notifications.getAllScheduledNotificationsAsync()) {
    if (item.identifier.startsWith(REMINDER_PREFIX)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  }
  for (const item of await Notifications.getPresentedNotificationsAsync()) {
    if (item.request.identifier.startsWith(REMINDER_PREFIX)) await Notifications.dismissNotificationAsync(item.request.identifier);
  }
  if (reminderTarget(Notifications.getLastNotificationResponse())) Notifications.clearLastNotificationResponse();
}
