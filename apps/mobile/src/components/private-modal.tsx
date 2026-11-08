import { Modal as NativeModal, type ModalProps } from 'react-native';
import { PrivacySurface } from './app-privacy';

export default function PrivateModal({ children, ...props }: ModalProps) {
  return <NativeModal {...props}><PrivacySurface>{children}</PrivacySurface></NativeModal>;
}
