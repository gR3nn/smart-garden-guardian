export type ValveStatus = 'open' | 'closed' | 'unknown' | string | null | undefined;
export type AppLanguage = 'en' | 'ro';

export interface LatestTelemetry {
  device_id: string;
  soil_moisture: number;
  soil_raw?: number | null;
  temperature: number;
  humidity: number;
  rain_detected: boolean;
  rain_wetness?: number | null;
  rain_raw?: number | null;
  valve_status?: ValveStatus;
  valve_updated_at?: string | null;
  valve_source?: string | null;
  valve_command_id?: string | null;
  auto_mode: boolean;
  last_update: string;
  received_at?: string | null;
}

export interface HistoryReading {
  timestamp: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  rain_detected: boolean;
  valve_status: ValveStatus;
}

export type WateringDurationSeconds = 15 | 30 | 60;

export interface CommandRequest {
  command: 'open_valve' | 'close_valve';
  duration_seconds: WateringDurationSeconds | 0;
  source: 'mobile';
}

export interface CommandResponse {
  ok: boolean;
  message: string;
}

export interface LocalProfile {
  name: string;
  garden_name: string;
}

export type ScheduleDurationSeconds = 5 | 10 | 15;
export type WateringScheduleType = 'one_time' | 'recurring' | string;

export interface WateringSchedule {
  schedule_id: string;
  device_id: string;
  label: string;
  date?: string | null;
  time: string;
  timezone: string;
  duration_seconds: ScheduleDurationSeconds;
  enabled: boolean;
  one_time?: boolean;
  type?: WateringScheduleType;
  schedule_expression?: string | null;
  created_at: string;
}

export interface CreateScheduleRequest {
  label: string;
  time: string;
  duration_seconds: ScheduleDurationSeconds;
  timezone: string;
  device_id: string;
  one_time: boolean;
}

export interface CreateScheduleResponse {
  ok: boolean;
  schedule: WateringSchedule;
}

export interface GetSchedulesResponse {
  ok: boolean;
  schedules: WateringSchedule[];
}

export interface DeleteScheduleResponse {
  ok: boolean;
  message: string;
  schedule_id: string;
}
