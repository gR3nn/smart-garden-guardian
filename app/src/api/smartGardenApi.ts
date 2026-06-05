import type {
  CommandRequest,
  CommandResponse,
  CreateScheduleRequest,
  CreateScheduleResponse,
  DeleteScheduleResponse,
  GetSchedulesResponse,
  HistoryReading,
  LatestTelemetry,
} from '../types/smartGarden';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL. Create a local .env from .env.example.');
  }

  return API_BASE_URL.replace(/\/$/, '');
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getLatest(): Promise<LatestTelemetry> {
  return requestJson<LatestTelemetry>('/latest');
}

export function getHistory(): Promise<HistoryReading[]> {
  return requestJson<HistoryReading[]>('/history');
}

export function sendCommand(command: CommandRequest): Promise<CommandResponse> {
  return requestJson<CommandResponse>('/command', {
    method: 'POST',
    body: JSON.stringify(command),
  });
}

export function getSchedules(): Promise<GetSchedulesResponse> {
  return requestJson<GetSchedulesResponse>('/schedules');
}

export function createSchedule(schedule: CreateScheduleRequest): Promise<CreateScheduleResponse> {
  return requestJson<CreateScheduleResponse>('/schedules', {
    method: 'POST',
    body: JSON.stringify(schedule),
  });
}

export function deleteSchedule(scheduleId: string): Promise<DeleteScheduleResponse> {
  return requestJson<DeleteScheduleResponse>(`/schedules/${encodeURIComponent(scheduleId)}`, {
    method: 'DELETE',
  });
}

export function getConfiguredApiBaseUrl(): string {
  return API_BASE_URL ?? '';
}
