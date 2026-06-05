import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const READINGS_TABLE = process.env.READINGS_TABLE || "SmartGardenReadings";
const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || "garden_node_01";
const DEFAULT_CITY = process.env.DEFAULT_CITY || "Bucharest";
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || "RO";
const DEFAULT_LOCATION_NAME = process.env.DEFAULT_LOCATION_NAME || "Bucharest, RO";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function toNumberOrNull(value) {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function toTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isValidTelemetry(item) {
  const hasTelemetryType =
    item.record_type === "telemetry" ||
    (item.soil_moisture !== undefined && item.temperature !== undefined && item.humidity !== undefined);

  if (!hasTelemetryType) return false;

  const soil = Number(item.soil_moisture);
  const temp = Number(item.temperature);
  const humidity = Number(item.humidity);

  return !Number.isNaN(soil) && !Number.isNaN(temp) && !Number.isNaN(humidity) &&
    soil >= 0 && soil <= 100 && temp > 0 && humidity > 0 && humidity <= 100;
}

function isValidHHMM(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time || "");
}

function dayLabel(date) {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
}

function weatherCodeToCondition(code, precipitationMm) {
  if (precipitationMm > 3) return "rain";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([95, 96, 99].includes(code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([45, 48].includes(code)) return "fog";
  if ([0].includes(code)) return "clear";
  if ([1, 2, 3].includes(code)) return "cloudy";
  return "unknown";
}

async function geocodeLocation(city, country) {
  const safeCity = city || DEFAULT_CITY;
  const safeCountry = (country || DEFAULT_COUNTRY || "").toUpperCase();

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(safeCity)}` +
    `&count=10&language=en&format=json`;

  const geocodeResponse = await fetch(url);
  if (!geocodeResponse.ok) throw new Error(`Geocoding API failed with status ${geocodeResponse.status}`);

  const data = await geocodeResponse.json();
  const results = data.results || [];
  if (results.length === 0) throw new Error(`Could not find coordinates for city: ${safeCity}`);

  const countryMatch =
    results.find((item) => item.country_code === safeCountry) ||
    results.find((item) => item.country_code?.toUpperCase() === safeCountry);

  const result = countryMatch || results[0];

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.name || safeCity,
    country: result.country_code || safeCountry || "",
    timezone: result.timezone || "Europe/Bucharest"
  };
}

async function getLatestTelemetry(deviceId) {
  const result = await docClient.send(new QueryCommand({
    TableName: READINGS_TABLE,
    KeyConditionExpression: "device_id = :device_id",
    ExpressionAttributeValues: { ":device_id": deviceId },
    ScanIndexForward: false,
    Limit: 500
  }));

  const items = (result.Items || []).sort(
    (a, b) => toTime(b.timestamp || b.received_at) - toTime(a.timestamp || a.received_at)
  );

  const latestTelemetry = items.find(isValidTelemetry);
  if (!latestTelemetry) {
    return { soil_moisture: null, soil_status: "unavailable", temperature: null, humidity: null, rain_detected: false, last_update: null };
  }

  const soilMoisture = toNumberOrNull(latestTelemetry.soil_moisture);

  return {
    soil_moisture: soilMoisture,
    soil_status: soilMoisture === null ? "unavailable" : "available",
    temperature: toNumberOrNull(latestTelemetry.temperature),
    humidity: toNumberOrNull(latestTelemetry.humidity),
    rain_detected: Boolean(latestTelemetry.rain_detected),
    last_update: latestTelemetry.timestamp || latestTelemetry.received_at || null
  };
}

async function getWeatherSummary(latitude, longitude, timezone = "Europe/Bucharest") {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum` +
    `&forecast_days=7` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const weatherResponse = await fetch(url);
  if (!weatherResponse.ok) throw new Error(`Weather API failed with status ${weatherResponse.status}`);

  const data = await weatherResponse.json();
  const daily = data.daily || {};
  const dates = daily.time || [];

  return dates.map((date, index) => {
    const precipitationMm = Number((daily.precipitation_sum || [])[index] ?? (daily.rain_sum || [])[index] ?? 0);
    const code = Number((daily.weather_code || [])[index] ?? -1);
    return {
      date,
      condition: weatherCodeToCondition(code, precipitationMm),
      weather_code: code,
      precipitation_mm: precipitationMm,
      rain_mm: Number((daily.rain_sum || [])[index] ?? 0),
      temperature_min: Number((daily.temperature_2m_min || [])[index] ?? 0),
      temperature_max: Number((daily.temperature_2m_max || [])[index] ?? 0)
    };
  });
}

function fallbackPlan(weatherSummary, latest) {
  const soil = Number(latest.soil_moisture ?? 50);
  const soilUnavailable = latest.soil_status === "unavailable";
  const isVeryDry = !soilUnavailable && soil < 25;
  const isDry = !soilUnavailable && soil >= 25 && soil < 40;

  return weatherSummary.map((day, index) => {
    const rainy = day.precipitation_mm >= 3 || day.condition === "rain" || day.condition === "storm";
    if (rainy || latest.rain_detected) {
      return { date: day.date, day_label: dayLabel(day.date), recommended: false, time: "08:00", duration_seconds: 0, reason: "Rain is detected or expected, so watering is not recommended." };
    }
    if (isVeryDry) {
      return { date: day.date, day_label: dayLabel(day.date), recommended: true, time: "08:00", duration_seconds: 15, reason: "Soil moisture is very low and no significant rain is expected." };
    }
    if (isDry) {
      return { date: day.date, day_label: dayLabel(day.date), recommended: true, time: "08:00", duration_seconds: 10, reason: "Soil moisture is below the ideal range and no significant rain is expected." };
    }
    if (soilUnavailable && index >= 2 && day.precipitation_mm < 1) {
      return { date: day.date, day_label: dayLabel(day.date), recommended: true, time: "08:00", duration_seconds: 5, reason: "Soil sensor data is unavailable, but no rain is expected, so a conservative watering is suggested." };
    }
    return { date: day.date, day_label: dayLabel(day.date), recommended: false, time: "08:00", duration_seconds: 0, reason: "Soil moisture and weather conditions do not require watering." };
  });
}

function sanitizePlan(plan, weatherSummary, latest) {
  if (!Array.isArray(plan)) return fallbackPlan(weatherSummary, latest);
  return plan.slice(0, 7).map((item, index) => {
    const weatherDay = weatherSummary[index];
    let duration = Number(item.duration_seconds ?? 0);
    if (![0, 5, 10, 15].includes(duration)) duration = item.recommended ? 5 : 0;
    let recommended = Boolean(item.recommended) && duration > 0;
    if (!recommended) duration = 0;
    if (recommended && ![5, 10, 15].includes(duration)) duration = 5;
    const date = item.date || weatherDay?.date || null;
    return {
      date,
      day_label: item.day_label || (date ? dayLabel(date) : `Day ${index + 1}`),
      recommended,
      time: isValidHHMM(item.time) ? item.time : "08:00",
      duration_seconds: duration,
      reason: typeof item.reason === "string" && item.reason.trim() ? item.reason : "No explanation provided."
    };
  });
}

async function callGemini(latest, weatherSummary, locationName) {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const prompt = `You are an irrigation assistant for a smart garden. Create a 7-day watering plan using current garden telemetry and weekly weather forecast.
Rules: Return ONLY valid JSON. Output an object with a plan array. Each item must have date, day_label, recommended, time, duration_seconds, reason. duration_seconds must be only 0, 5, 10, or 15. If recommended is false, duration_seconds must be 0. time must be valid HH:mm. Avoid watering on rainy days. If rain_detected is true now, avoid immediate watering. Prefer morning watering around 08:00. Keep explanations short.
Location: ${locationName}
Latest telemetry: ${JSON.stringify(latest)}
Weather summary: ${JSON.stringify(weatherSummary)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const geminiResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    })
  });

  if (!geminiResponse.ok) throw new Error(`Gemini API failed: ${geminiResponse.status} ${await geminiResponse.text()}`);
  const geminiData = await geminiResponse.json();
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  const parsed = JSON.parse(text);
  return parsed.plan || parsed;
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return response(200, {});
    const body = JSON.parse(event.body || "{}");
    const deviceId = body.device_id || DEFAULT_DEVICE_ID;
    const city = body.location?.city || DEFAULT_CITY;
    const country = body.location?.country || DEFAULT_COUNTRY;

    const resolvedLocation = await geocodeLocation(city, country);
    const latitude = resolvedLocation.latitude;
    const longitude = resolvedLocation.longitude;
    const locationName = `${resolvedLocation.name}, ${resolvedLocation.country}`;
    const weatherTimezone = resolvedLocation.timezone || "Europe/Bucharest";

    const latest = await getLatestTelemetry(deviceId);
    const weatherSummary = await getWeatherSummary(latitude, longitude, weatherTimezone);

    let source = "gemini";
    let plan;
    try {
      plan = sanitizePlan(await callGemini(latest, weatherSummary, locationName), weatherSummary, latest);
    } catch (geminiError) {
      console.error("Gemini failed, using fallback plan:", geminiError);
      source = "fallback_rules";
      plan = fallbackPlan(weatherSummary, latest);
    }

    return response(200, {
      ok: true,
      source,
      location: locationName || DEFAULT_LOCATION_NAME,
      resolved_location: { city: resolvedLocation.name, country: resolvedLocation.country, latitude, longitude, timezone: weatherTimezone },
      generated_at: new Date().toISOString(),
      latest,
      weather_summary: weatherSummary,
      plan
    });
  } catch (error) {
    console.error("Generate watering plan error:", error);
    return response(500, { ok: false, error: "Failed to generate watering plan", details: error.message });
  }
};
