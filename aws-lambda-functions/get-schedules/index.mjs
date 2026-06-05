import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || "SmartGardenSchedules";
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

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return response(200, {});

    const result = await ddb.send(new ScanCommand({ TableName: SCHEDULES_TABLE, Limit: 100 }));
    const schedules = (result.Items || []).map((item) => ({
      schedule_id: item.schedule_id,
      device_id: item.device_id || "garden_node_01",
      label: item.label || "Watering schedule",
      date: item.date || null,
      time: item.time || "08:00",
      timezone: item.timezone || "Europe/Bucharest",
      duration_seconds: Number(item.duration_seconds || 5),
      enabled: item.enabled !== false,
      one_time: Boolean(item.one_time),
      type: item.type || (item.one_time ? "one_time" : "recurring"),
      source: item.source || null,
      schedule_expression: item.schedule_expression || null,
      expires_after_run: Boolean(item.expires_after_run),
      created_at: item.created_at || null
    })).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return response(200, { ok: true, schedules });
  } catch (error) {
    console.error("Get schedules error:", error);
    return response(500, { ok: false, error: "Failed to get schedules", details: error.message });
  }
};
