import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SchedulerClient, DeleteScheduleCommand } from "@aws-sdk/client-scheduler";

const REGION = process.env.AWS_REGION || "us-east-1";
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || "SmartGardenSchedules";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const scheduler = new SchedulerClient({ region: REGION });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

function response(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function getScheduleId(event) {
  return event.pathParameters?.schedule_id || event.pathParameters?.scheduleId || event.pathParameters?.id || null;
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return response(200, {});
    const scheduleId = getScheduleId(event);
    if (!scheduleId) return response(400, { ok: false, error: "Missing schedule_id path parameter" });

    let existingSchedule = null;
    try {
      const getResult = await ddb.send(new GetCommand({ TableName: SCHEDULES_TABLE, Key: { schedule_id: scheduleId } }));
      existingSchedule = getResult.Item || null;
    } catch (getError) {
      console.warn("Could not read schedule before deletion:", getError);
    }

    try {
      await scheduler.send(new DeleteScheduleCommand({ Name: scheduleId, GroupName: "default" }));
    } catch (schedulerError) {
      if (schedulerError.name !== "ResourceNotFoundException") throw schedulerError;
      console.warn("Schedule not found in EventBridge Scheduler, continuing:", scheduleId);
    }

    await ddb.send(new DeleteCommand({ TableName: SCHEDULES_TABLE, Key: { schedule_id: scheduleId } }));
    return response(200, { ok: true, message: "Schedule deleted", schedule_id: scheduleId, deleted_schedule: existingSchedule });
  } catch (error) {
    console.error("Delete schedule error:", error);
    return response(500, { ok: false, error: "Failed to delete schedule", details: error.message });
  }
};
