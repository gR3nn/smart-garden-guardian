import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";

const REGION = process.env.AWS_REGION || "us-east-1";
const IOT_DATA_ENDPOINT = process.env.IOT_DATA_ENDPOINT;
const COMMAND_TOPIC = process.env.COMMAND_TOPIC || "smart-garden/node01/commands";

const iot = new IoTDataPlaneClient({ region: REGION, endpoint: IOT_DATA_ENDPOINT ? `https://${IOT_DATA_ENDPOINT}` : undefined });

export const handler = async (event) => {
  const deviceId = event.device_id || "garden_node_01";
  const durationSeconds = Number(event.duration_seconds || 5);
  const commandId = event.schedule_id || `scheduled_${Date.now()}`;

  const payload = {
    command: "open_valve",
    duration_seconds: durationSeconds,
    source: event.source || "schedule",
    device_id: deviceId,
    command_id: commandId,
    timestamp: new Date().toISOString()
  };

  await iot.send(new PublishCommand({
    topic: COMMAND_TOPIC,
    qos: 1,
    payload: Buffer.from(JSON.stringify(payload))
  }));

  return { ok: true, published: payload };
};
