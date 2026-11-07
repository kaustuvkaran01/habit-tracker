import { useCallback, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { getHapticsEnabled, setHapticsEnabled, subscribeHaptics } from '../utils/feedback';

export default function useHapticsPreference() {
  const enabled = useSyncExternalStore(subscribeHaptics, getHapticsEnabled, getHapticsEnabled);
  const setEnabled = useCallback((value: boolean) => {
    void setHapticsEnabled(value).catch(() => {
      Alert.alert('Preference not saved', 'Haptics changed for this session, but the preference could not be saved. Please try again.');
    });
  }, []);
  return { enabled, setEnabled };
}
