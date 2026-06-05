import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const READINGS_TABLE = process.env.READINGS_TABLE || "SmartGardenReadings";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export const handler = async (event) => {
  const now = new Date().toISOString();
  const deviceId = event.device_id || "garden_node_01";
  const timestamp = event.timestamp || now;

  const item = {
    device_id: deviceId,
    timestamp,
    received_at: now,
    record_type: event.valve_status ? "valve_status" : "telemetry",
    mqtt_topic: event.mqtt_topic || null,
    ...event
  };

  await ddb.send(new PutCommand({ TableName: READINGS_TABLE, Item: item }));
  return { ok: true, item };
};
