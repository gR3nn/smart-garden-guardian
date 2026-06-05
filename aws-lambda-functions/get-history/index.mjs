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

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return response(200, {});
    const deviceId = event.queryStringParameters?.device_id || DEFAULT_DEVICE_ID;
    const limit = Number(event.queryStringParameters?.limit || 50);

    const result = await ddb.send(new QueryCommand({
      TableName: READINGS_TABLE,
      KeyConditionExpression: "device_id = :device_id",
      ExpressionAttributeValues: { ":device_id": deviceId },
      ScanIndexForward: false,
      Limit: Math.min(limit, 200)
    }));

    const readings = (result.Items || [])
      .filter((item) => item.soil_moisture !== undefined || item.temperature !== undefined || item.humidity !== undefined)
      .map((item) => ({
        device_id: item.device_id,
        timestamp: item.timestamp || item.received_at,
        received_at: item.received_at || item.timestamp,
        soil_moisture: item.soil_moisture ?? null,
        temperature: item.temperature ?? null,
        humidity: item.humidity ?? null,
        rain_detected: Boolean(item.rain_detected)
      }));

    return response(200, { ok: true, readings });
  } catch (error) {
    console.error("Get history error:", error);
    return response(500, { ok: false, error: "Failed to get history", details: error.message });
  }
};
