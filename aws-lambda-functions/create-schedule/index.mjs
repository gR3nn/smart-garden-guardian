import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";

const REGION = process.env.AWS_REGION || "us-east-1";
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || "SmartGardenSchedules";
const EXECUTE_LAMBDA_ARN = process.env.EXECUTE_LAMBDA_ARN;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;

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

function cronForDailyTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return `cron(${minute} ${hour} * * ? *)`;
}

function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time || "");
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || "");
}

export const handler = async (event) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") return response(200, {});

    const body = JSON.parse(event.body || "{}");
    const scheduleId = `schedule_${Date.now()}`;
    const deviceId = body.device_id || "garden_node_01";
    const label = body.label || "Watering schedule";
    const time = body.time || "08:00";
    const timezone = body.timezone || "Europe/Bucharest";
    const oneTime = Boolean(body.one_time);
    const date = body.date || null;

    if (!isValidTime(time)) return response(400, { ok: false, error: "time must be in HH:mm format" });
    if (oneTime && !isValidDate(date)) return response(400, { ok: false, error: "date is required for one_time schedules and must be YYYY-MM-DD" });

    const durationSeconds = Number(body.duration_seconds);
    if (![5, 10, 15].includes(durationSeconds)) return response(400, { ok: false, error: "duration_seconds must be one of: 5, 10, 15" });

    const scheduleExpression = oneTime ? `at(${date}T${time}:00)` : cronForDailyTime(time);

    const scheduleItem = {
      schedule_id: scheduleId,
      device_id: deviceId,
      label,
      date,
      time,
      timezone,
      duration_seconds: durationSeconds,
      enabled: true,
      one_time: oneTime,
      type: oneTime ? "one_time" : "recurring",
      source: oneTime ? "ai_weekly_plan" : (body.source || "manual_schedule"),
      schedule_expression: scheduleExpression,
      expires_after_run: oneTime,
      created_at: new Date().toISOString()
    };

    await ddb.send(new PutCommand({ TableName: SCHEDULES_TABLE, Item: scheduleItem }));

    const createScheduleInput = {
      Name: scheduleId,
      GroupName: "default",
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: timezone,
      FlexibleTimeWindow: { Mode: "OFF" },
      State: "ENABLED",
      Target: {
        Arn: EXECUTE_LAMBDA_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({ schedule_id: scheduleId, device_id: deviceId, duration_seconds: durationSeconds, source: oneTime ? "ai_weekly_plan" : "schedule" })
      }
    };

    if (oneTime) createScheduleInput.ActionAfterCompletion = "DELETE";
    await scheduler.send(new CreateScheduleCommand(createScheduleInput));

    return response(201, { ok: true, schedule: scheduleItem });
  } catch (error) {
    console.error("Create schedule error:", error);
    return response(500, { ok: false, error: "Failed to create schedule", details: error.message });
  }
};
