import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return <View style={styles.screen}>
    <StatusBar style="light" />
    <Text style={styles.title}>Habit Tracker</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101012', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F1F0F4', fontSize: 24, fontWeight: '600' },
});
