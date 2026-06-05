import type {
  AiWateringPlanRequest,
  AiWateringPlanResponse,
  CreateScheduleRequest,
  CreateScheduleResponse,
  CommandPayload,
  CommandResponse,
  DeleteScheduleResponse,
  GetSchedulesResponse,
  HistoryReading,
  LatestReading,
} from "../types/smartGarden";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

interface LambdaProxyResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

function parseJsonString(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Watering plan response was invalid.");
  }
}

function unwrapAiWateringPlanPayload(value: unknown): unknown {
  if (typeof value === "string") {
    return unwrapAiWateringPlanPayload(parseJsonString(value));
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  if ("body" in value) {
    const body = (value as LambdaProxyResponse).body;

    if (typeof body === "string" || (typeof body === "object" && body !== null)) {
      return unwrapAiWateringPlanPayload(body);
    }
  }

  return value;
}

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL. Add it to your local .env file.");
  }

  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function normalizeAiWateringPlanResponse(
  rawResponse: AiWateringPlanResponse | LambdaProxyResponse | string,
): AiWateringPlanResponse {
  const normalized = unwrapAiWateringPlanPayload(rawResponse);

  if (
    typeof normalized !== "object" ||
    normalized === null ||
    !Array.isArray((normalized as AiWateringPlanResponse).plan)
  ) {
    throw new Error("Watering plan response was invalid.");
  }

  return normalized as AiWateringPlanResponse;
}

export function getLatest(): Promise<LatestReading> {
  return requestJson<LatestReading>("/latest");
}

export function getHistory(): Promise<HistoryReading[]> {
  return requestJson<HistoryReading[]>("/history");
}

export function getSchedules(): Promise<GetSchedulesResponse> {
  return requestJson<GetSchedulesResponse>("/schedules");
}

export function sendCommand(payload: CommandPayload): Promise<CommandResponse> {
  return requestJson<CommandResponse>("/command", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateWateringPlan(
  payload: AiWateringPlanRequest,
): Promise<AiWateringPlanResponse> {
  return requestJson<AiWateringPlanResponse | LambdaProxyResponse | string>(
    "/ai/watering-plan",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  ).then((response) => normalizeAiWateringPlanResponse(response));
}

export function createSchedule(
  payload: CreateScheduleRequest,
): Promise<CreateScheduleResponse> {
  return requestJson<CreateScheduleResponse>("/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteSchedule(
  scheduleId: string,
): Promise<DeleteScheduleResponse> {
  return requestJson<DeleteScheduleResponse>(
    `/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "DELETE",
    },
  );
}
