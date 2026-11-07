import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/home-screen';
import { initializeHaptics } from './src/utils/feedback';
import { ThemeProvider, useTheme } from './src/components/theme';

function ThemedApp() {
  const { mode } = useTheme();
  return <>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <HomeScreen />
  </>;
}

export default function App() {
  useEffect(() => { void initializeHaptics(); }, []);
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider><ThemedApp /></ThemeProvider>
    </SafeAreaProvider>
  );
}
