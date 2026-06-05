export interface LatestReading {
  device_id: string;
  soil_moisture: number;
  soil_raw?: number | null;
  temperature: number;
  humidity: number;
  rain_detected: boolean;
  rain_wetness?: number | null;
  rain_raw?: number | null;
  valve_status?: "open" | "closed" | "unknown" | string;
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
}

export interface CommandPayload {
  command: "open_valve" | "close_valve";
  duration_seconds: number;
  source: "web";
}

export interface CommandResponse {
  ok: boolean;
  message: string;
}

export interface AiWateringLocation {
  city: string;
  country: string;
}

export interface AiWateringPlanRequest {
  device_id: string;
  location: AiWateringLocation;
}

export interface WeatherSummaryDay {
  date: string;
  condition: string;
  precipitation_mm: number;
  temperature_min: number;
  temperature_max: number;
  weather_code?: number;
  rain_mm?: number;
}

export interface AiPlanItem {
  date: string;
  day_label: string;
  recommended: boolean;
  time: string;
  duration_seconds: number;
  reason: string;
}

export interface EditablePlanItem extends AiPlanItem {
  selected: boolean;
}

export interface AiWateringPlanResponse {
  ok: boolean;
  source: string;
  location: string;
  generated_at: string;
  latest: LatestReading;
  weather_summary: WeatherSummaryDay[];
  plan: AiPlanItem[];
}

export interface ScheduleRequest {
  label: string;
  time: string;
  duration_seconds: number;
  timezone: string;
  device_id: string;
  date?: string | null;
  one_time: boolean;
}

export interface WateringSchedule {
  schedule_id: string;
  label: string;
  date: string | null;
  time: string;
  duration_seconds: number;
  timezone: string;
  enabled: boolean;
  one_time: boolean;
  type: "recurring" | "one_time" | string;
  created_at?: string;
}

export interface GetSchedulesResponse {
  ok: boolean;
  schedules: WateringSchedule[];
}

export interface CreateScheduleRequest extends ScheduleRequest {}

export interface CreateScheduleResponse {
  ok: boolean;
  message?: string;
  schedule_id?: string;
  schedule?: WateringSchedule;
}

export interface DeleteScheduleResponse {
  ok: boolean;
  message?: string;
}
