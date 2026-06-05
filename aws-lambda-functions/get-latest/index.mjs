import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const READINGS_TABLE = process.env.READINGS_TABLE || "SmartGardenReadings";
const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || "garden_node_01";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function toTime(item) {
  return new Date(item.timestamp || item.received_at || 0).getTime() || 0;
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return response(200, {});
    const deviceId = event.queryStringParameters?.device_id || DEFAULT_DEVICE_ID;

    const result = await ddb.send(new QueryCommand({
      TableName: READINGS_TABLE,
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": deviceId },
      ScanIndexForward: false,
      Limit: 100
    }));

    const items = result.Items || [];
    const telemetry = items.filter((i) => i.soil_moisture !== undefined).sort((a, b) => toTime(b) - toTime(a))[0] || {};
    const valve = items.filter((i) => i.valve_status !== undefined).sort((a, b) => toTime(b) - toTime(a))[0] || {};

    return response(200, {
      device_id: deviceId,
      soil_moisture: telemetry.soil_moisture ?? null,
      temperature: telemetry.temperature ?? null,
      humidity: telemetry.humidity ?? null,
      rain_detected: Boolean(telemetry.rain_detected),
      valve_status: valve.valve_status || "unknown",
      valve_updated_at: valve.timestamp || valve.received_at || null,
      valve_source: valve.source || null,
      valve_command_id: valve.command_id || null,
      auto_mode: false,
      last_update: telemetry.timestamp || telemetry.received_at || null,
      received_at: telemetry.received_at || null
    });
  } catch (error) {
    console.error("Get latest error:", error);
    return response(500, { ok: false, error: "Failed to get latest telemetry", details: error.message });
  }
};
