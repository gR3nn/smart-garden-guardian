import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from './src/i18n/I18nProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppNavigator />
        <StatusBar style="dark" />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
