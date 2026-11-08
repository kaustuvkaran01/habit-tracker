export const SUPPORT_EMAIL = 'kaustuvkaran@gmail.com';
export const PRIVACY_UPDATED_ON = '2026-11-08';

// These describe the currently connected app, not planned billing/cloud tools.
export const PRIVACY_SECTIONS = [
  { title: 'On your device', description: 'Habits, notes, entries and rewards are stored on your device. No app account is required. Your device backup settings may include this data.' },
  { title: 'Sharing and backup files', description: 'You choose when to export or share. Backup files include private notes and are not encrypted by this app. Your chosen destination handles exported copies.' },
  { title: 'Notifications', description: 'Reminders are scheduled on your device with your permission. Discreet text is the default. You can choose to show habit names. Notes are never included.' },
  { title: 'Deleting your data', description: 'Free archives expire after 30 days. Pro keeps them. Earned collections survive ordinary habit deletion. Backup & Restore lets you erase all local habits, notes, rewards and preferences. External exported copies stay with you.' },
  { title: 'Services and diagnostics', description: 'This version has no connected advertising, usage-tracking or crash-reporting service. In-app cloud sync and purchases are not connected yet. Expo Go and device services have their own privacy practices.' },
  { title: 'Privacy and support contact', description: 'If you email support, your email provider delivers the message you choose to send. No habit history, notes or backup is attached automatically. Avoid including sensitive details.' },
] as const;

export function supportMailto(subject: string) {
  // No body, identifiers, logs, habit data or attachments are prefilled.
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
