import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocalProfile } from '../types/smartGarden';

const PROFILE_STORAGE_KEY = '@smart-garden/profile';

export const DEFAULT_PROFILE: LocalProfile = {
  name: 'Alex',
  garden_name: 'My Smart Garden',
};

export async function getProfile(): Promise<LocalProfile> {
  const rawProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);

  if (!rawProfile) {
    return DEFAULT_PROFILE;
  }

  return {
    ...DEFAULT_PROFILE,
    ...JSON.parse(rawProfile),
  };
}

export async function saveProfile(profile: LocalProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export async function resetProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
}
