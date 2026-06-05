# AWS Lambda Functions

This folder contains the Node.js Lambda handlers used by Smart Garden Guardian.

## Functions

- `ingest-telemetry`: stores ESP32 telemetry and Raspberry Pi valve status in DynamoDB.
- `get-latest`: returns the latest telemetry and valve status.
- `get-history`: returns recent sensor history.
- `send-command`: publishes manual valve commands to AWS IoT Core.
- `create-schedule`: creates recurring or one-time EventBridge schedules.
- `get-schedules`: lists schedules from DynamoDB.
- `delete-schedule`: deletes schedules from EventBridge Scheduler and DynamoDB.
- `execute-scheduled-watering`: publishes a valve command when EventBridge Scheduler invokes it.
- `generate-watering-plan`: uses city/country, Open-Meteo forecast data, latest telemetry, and Gemini to generate a weekly watering plan.

## Notes

- Do not commit real API keys or certificates.
- Configure Lambda environment variables in AWS Console.
- API Gateway must include CORS for the hosted web app origin.
