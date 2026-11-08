import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, usePreferenceStyles } from '../components/preference-ui';
import { space } from '../components/design-tokens';
import { createThemedStyles } from '../components/theme';
import { PRIVACY_SECTIONS, PRIVACY_UPDATED_ON, SUPPORT_EMAIL, supportMailto } from '../data/privacy-info';
import { dateFromKey } from '../data/habit-calendar';
import { useTranslation } from '../i18n/context';

export default function PrivacySupportScreen({ page }: { page: 'privacy' | 'support' }) {
  const { t, locale } = useTranslation(), shared = usePreferenceStyles(), styles = useStyles();
  const [opening, setOpening] = useState(false), [error, setError] = useState(false), lock = useRef(false);
  async function email() {
    if (lock.current) return;
    lock.current = true; setOpening(true); setError(false);
    try { await Linking.openURL(supportMailto(t('Habit Tracker support'))); }
    catch { setError(true); }
    finally { lock.current = false; setOpening(false); }
  }
  return <>
    {page === 'privacy' ? <>
      <Text style={shared.muted}>{t('Updated {value0}', { value0: dateFromKey(PRIVACY_UPDATED_ON).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) })}</Text>
      {PRIVACY_SECTIONS.map(section => <View key={section.title} style={[shared.group, styles.card]}>
        <Text accessibilityRole="header" style={styles.heading}>{t(section.title)}</Text>
        <Text style={shared.muted}>{t(section.description)}</Text>
      </View>)}
    </> : <>
      <View style={[shared.group, styles.card]}>
        <Text accessibilityRole="header" style={styles.heading}>{t('How can we help?')}</Text>
        <Text style={shared.muted}>{t('Describe what happened and what you expected. You can include your app version and device model. Please leave out private habit details and notes.')}</Text>
      </View>
      <View style={[shared.group, styles.card]}>
        <Text accessibilityRole="header" style={styles.heading}>{t('Backup & Restore')}</Text>
        <Text style={shared.muted}>{t('Export a backup file, or choose one to review before restoring. Backups and restore are free.')}</Text>
        <Text accessibilityRole="header" style={styles.heading}>{t('Archived Habits')}</Text>
        <Text style={shared.muted}>{t('Open Settings → Archived Habits to restore a habit with its check-ins and notes.')}</Text>
      </View>
    </>}
    <View style={[shared.group, styles.card]}>
      <Text selectable style={styles.address}>{SUPPORT_EMAIL}</Text>
      <Text style={shared.muted}>{t('Your email app opens a draft. You choose what to send. Nothing is attached automatically.')}</Text>
      <PrimaryButton disabled={opening} onPress={() => { void email(); }}>{t('Email support')}</PrimaryButton>
      {error && <Text accessibilityRole="alert" style={styles.error}>{t('Could not open an email app. You can select the address above and email us directly.')}</Text>}
    </View>
  </>;
}
const useStyles = createThemedStyles(colors => StyleSheet.create({
  card: { padding: space.md, gap: space.sm }, heading: { color: colors.text, fontSize: 17, fontWeight: '600' },
  address: { color: colors.text, fontSize: 16, flexShrink: 1 }, error: { color: colors.error, fontSize: 14, lineHeight: 21 },
}));
