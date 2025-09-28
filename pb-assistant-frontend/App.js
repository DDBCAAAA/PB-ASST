import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider } from './src/state/AppContext';
import { ThemeProvider } from './src/theme/ThemeProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
