import Modal from './private-modal';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { canUse, type ProCapability } from '../data/pro-access';
import ProScreen from '../screens/pro-screen';
import { useProAccess } from './pro-access';
import { useTheme } from './theme';

// Render in the screen making the request, so iOS presents above that screen's
// native sheet. Dismissing the upgrade preserves its form/preview underneath.
export function useProUpgrade() {
  const access = useProAccess();
  const { colors } = useTheme();
  const [reason, setReason] = useState<ProCapability | null>(null);
  const [presented, setPresented] = useState(false);
  const lastReason = useRef<ProCapability | undefined>(undefined);
  if (reason) lastReason.current = reason;
  useEffect(() => { if (!reason && Platform.OS !== 'ios') setPresented(false); }, [reason]);
  const close = () => setReason(null);
  return {
    explain(capability: ProCapability) { setReason(capability); },
    open: reason !== null || presented,
    request(capability: ProCapability) {
      if (canUse(capability, access)) return true;
      setReason(capability);
      return false;
    },
    sheet: <Modal visible={reason !== null} animationType="slide" presentationStyle="pageSheet" backdropColor={colors.background}
      allowSwipeDismissal onRequestClose={close} onShow={() => setPresented(true)} onDismiss={() => setPresented(false)}>
      <ProScreen reason={reason ?? lastReason.current} onClose={close} />
    </Modal>,
  };
}
