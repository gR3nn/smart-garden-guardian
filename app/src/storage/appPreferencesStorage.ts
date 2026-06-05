import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppLanguage } from '../types/smartGarden';

const APP_LANGUAGE_KEY = '@smart-garden/app-language';

export async function getAppLanguage(): Promise<AppLanguage> {
  const value = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
  return value === 'ro' ? 'ro' : 'en';
}

export async function saveAppLanguage(language: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(APP_LANGUAGE_KEY, language);
}
