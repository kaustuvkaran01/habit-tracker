import { useTranslation } from '../i18n/context';
import { useCallback, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { getHapticsEnabled, setHapticsEnabled, subscribeHaptics } from '../utils/feedback';

export default function useHapticsPreference() {
  const { t } = useTranslation();
  const enabled = useSyncExternalStore(subscribeHaptics, getHapticsEnabled, getHapticsEnabled);
  const setEnabled = useCallback((value: boolean) => {
    void setHapticsEnabled(value).catch(() => {
      Alert.alert(t('Preference not saved'), t('Haptics changed for this session, but the preference could not be saved. Please try again.'));
    });
  }, [t]);
  return { enabled, setEnabled };
}
