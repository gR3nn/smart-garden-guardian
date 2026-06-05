import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../i18n/I18nProvider';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WaterScreen } from '../screens/WaterScreen';

export type RootTabParamList = {
  Home: undefined;
  Water: undefined;
  Schedule: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#2f6f3e',
          tabBarInactiveTintColor: '#7f8c7a',
          tabBarIcon: ({ color, focused }) => (
            <Text
              style={{
                color,
                fontSize: focused ? 19 : 18,
              }}
            >
              {getTabIcon(route.name)}
            </Text>
          ),
          tabBarIconStyle: {
            marginBottom: 4,
          },
          tabBarItemStyle: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
            lineHeight: 14,
          },
          tabBarStyle: {
            backgroundColor: '#fbfff6',
            borderTopColor: '#d8e5d0',
            borderTopWidth: 1,
            height: 92 + insets.bottom,
            paddingBottom: 14 + insets.bottom,
            paddingHorizontal: 8,
            paddingTop: 10,
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
        <Tab.Screen name="Water" component={WaterScreen} options={{ tabBarLabel: t('tabs.water') }} />
        <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ tabBarLabel: t('tabs.schedule') }} />
        <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('tabs.history') }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('tabs.settings') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function getTabIcon(routeName: keyof RootTabParamList): string {
  switch (routeName) {
    case 'Home':
      return '🏠';
    case 'Water':
      return '💧';
    case 'Schedule':
      return '📅';
    case 'History':
      return '🕘';
    case 'Settings':
      return '⚙️';
    default:
      return '•';
  }
}
