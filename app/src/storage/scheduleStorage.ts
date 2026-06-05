import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WateringSchedule } from '../types/smartGarden';

const SCHEDULE_STORAGE_KEY = '@smart-garden/schedules';

export async function getCachedSchedules(): Promise<WateringSchedule[]> {
  const rawSchedules = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);

  if (!rawSchedules) {
    return [];
  }

  const parsedSchedules = JSON.parse(rawSchedules) as unknown[];

  return parsedSchedules
    .filter(Boolean)
    .map((schedule) => normalizeSchedule(schedule))
    .filter((schedule): schedule is WateringSchedule => schedule !== null);
}

export async function saveSchedules(schedules: WateringSchedule[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

export async function cacheSchedule(schedule: WateringSchedule): Promise<WateringSchedule[]> {
  const schedules = await getCachedSchedules();
  const nextSchedules = [schedule, ...schedules.filter((item) => item.schedule_id !== schedule.schedule_id)];
  await saveSchedules(nextSchedules);
  return nextSchedules;
}

export async function removeCachedSchedule(scheduleId: string): Promise<WateringSchedule[]> {
  const schedules = await getCachedSchedules();
  const nextSchedules = schedules.filter((item) => item.schedule_id !== scheduleId);
  await saveSchedules(nextSchedules);
  return nextSchedules;
}

export async function clearSchedules(): Promise<void> {
  await AsyncStorage.removeItem(SCHEDULE_STORAGE_KEY);
}

function normalizeSchedule(value: unknown): WateringSchedule | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const schedule = value as Partial<WateringSchedule>;
  const duration =
    schedule.duration_seconds === 5 || schedule.duration_seconds === 10 || schedule.duration_seconds === 15
      ? schedule.duration_seconds
      : null;

  if (!schedule.schedule_id || !duration) {
    return null;
  }

  return {
    schedule_id: schedule.schedule_id,
    device_id: schedule.device_id ?? 'garden_node_01',
    label: schedule.label?.trim() || 'Watering schedule',
    date: typeof schedule.date === 'string' ? schedule.date : null,
    time: typeof schedule.time === 'string' ? schedule.time : '08:00',
    timezone: typeof schedule.timezone === 'string' ? schedule.timezone : 'Europe/Bucharest',
    duration_seconds: duration,
    enabled: typeof schedule.enabled === 'boolean' ? schedule.enabled : true,
    one_time: typeof schedule.one_time === 'boolean' ? schedule.one_time : schedule.type === 'one_time',
    type: typeof schedule.type === 'string' ? schedule.type : schedule.one_time ? 'one_time' : 'recurring',
    schedule_expression: typeof schedule.schedule_expression === 'string' ? schedule.schedule_expression : null,
    created_at: typeof schedule.created_at === 'string' ? schedule.created_at : new Date().toISOString(),
  };
}
