import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/home-screen';
import { initializeHaptics } from './src/utils/feedback';
import { AppPreferencesProvider } from './src/components/app-preferences';
import { LocaleProvider } from './src/i18n/context';
import { ThemeProvider, useTheme } from './src/components/theme';
import { ProAccessProvider } from './src/components/pro-access';
import { LocalResetBoundary } from './src/components/local-reset';
import { AppPrivacyProvider, PrivacySurface } from './src/components/app-privacy';

function ThemedApp() {
  useEffect(() => { void initializeHaptics(); }, []);
  const { mode } = useTheme();
  return <AppPrivacyProvider><PrivacySurface>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <HomeScreen />
  </PrivacySurface></AppPrivacyProvider>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <LocalResetBoundary><ProAccessProvider><AppPreferencesProvider><LocaleProvider><ThemeProvider><ThemedApp /></ThemeProvider></LocaleProvider></AppPreferencesProvider></ProAccessProvider></LocalResetBoundary>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}
