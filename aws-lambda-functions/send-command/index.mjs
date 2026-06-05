import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const IOT_DATA_ENDPOINT = process.env.IOT_DATA_ENDPOINT;
const COMMAND_TOPIC = process.env.COMMAND_TOPIC || "smart-garden/node01/commands";
const EVENTS_TABLE = process.env.EVENTS_TABLE || "SmartGardenEvents";

const iot = new IoTDataPlaneClient({ region: REGION, endpoint: IOT_DATA_ENDPOINT ? `https://${IOT_DATA_ENDPOINT}` : undefined });
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
    const body = JSON.parse(event.body || "{}");

    const command = body.command || "open_valve";
    const durationSeconds = Number(body.duration_seconds || 5);
    const deviceId = body.device_id || "garden_node_01";
    const commandId = body.command_id || `${Date.now()}`;

    if (!["open_valve", "close_valve"].includes(command)) return response(400, { ok: false, error: "Invalid command" });
    if (command === "open_valve" && ![5, 10, 15].includes(durationSeconds)) return response(400, { ok: false, error: "duration_seconds must be 5, 10, or 15" });

    const payload = {
      command,
      duration_seconds: command === "close_valve" ? 0 : durationSeconds,
      source: body.source || "web",
      device_id: deviceId,
      command_id: commandId,
      timestamp: new Date().toISOString()
    };

    await iot.send(new PublishCommand({ topic: COMMAND_TOPIC, qos: 1, payload: Buffer.from(JSON.stringify(payload)) }));

    try {
      await ddb.send(new PutCommand({
        TableName: EVENTS_TABLE,
        Item: { device_id: deviceId, timestamp: payload.timestamp, event_type: "command", ...payload }
      }));
    } catch (logError) {
      console.warn("Could not log command:", logError);
    }

    return response(200, { ok: true, command: payload });
  } catch (error) {
    console.error("Send command error:", error);
    return response(500, { ok: false, error: "Failed to send command", details: error.message });
  }
};
