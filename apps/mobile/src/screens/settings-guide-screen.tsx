import { Text, View } from 'react-native';
import { PreferenceIcon, type PreferenceSymbol, usePreferenceStyles } from '../components/preference-ui';
import { space } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';

const STEPS: { title: string; description: string; symbol: PreferenceSymbol; color: string }[] = [
  { title: 'Check it off', description: 'On a scheduled day, tap a completion button to log progress. Open a habit and hold a calendar day to edit an entry or add a note.', symbol: 'pulse', color: '#36C9A0' },
  { title: 'Explore your history', description: 'Swipe to change month · Hold a day to add a note', symbol: 'grid', color: '#64A4F5' },
  { title: 'Archived Habits', description: 'Open Settings → Archived Habits to restore a habit with its check-ins and notes.', symbol: 'archive', color: '#36C9A0' },
  { title: 'Streak-based wallpapers', description: 'Milestones and celebrations are free. Export earned wallpapers with Pro. Badges stay free to share.', symbol: 'sparkle', color: '#AA95E9' },
  { title: 'Use wallpaper · Export', description: 'Export the image, save it, then choose it in your phone’s Wallpaper settings. You make the final change on your device.', symbol: 'send', color: '#64A4F5' },
  { title: 'Backup & Restore', description: 'Export a backup file, or choose one to review before restoring. Backups and restore are free.', symbol: 'cloud', color: '#AA95E9' },
  { title: 'Daily Check-In Reminders', description: 'Save an enabled reminder to allow notifications. Open the app regularly to refresh future reminders.', symbol: 'bell', color: '#36C9A0' },
];

export default function SettingsGuideScreen() {
  const { t } = useTranslation(), shared = usePreferenceStyles();
  return <>{STEPS.map(step => <View key={step.title} style={[shared.group, { padding: space.md, gap: space.sm }]}>
    <PreferenceIcon symbol={step.symbol} color={step.color} />
    <Text accessibilityRole="header" style={shared.sectionLabel}>{t(step.title)}</Text>
    <Text style={shared.muted}>{t(step.description)}</Text>
  </View>)}</>;
}
