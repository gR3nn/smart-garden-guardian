# Smart Garden Guardian

Smart Garden Guardian is an IoT and cloud-based irrigation monitoring and control system built for a practical garden watering setup. The project started from a real use case: a family garden that needs regular observation and watering. The system combines an ESP32 sensor node, a Raspberry Pi valve controller, AWS cloud services, a React web dashboard, and an Android mobile application.

The goal is to monitor garden conditions remotely, visualize historical sensor data, send watering commands safely, and create cloud-based watering schedules.

## Main Features

- Live garden telemetry: soil moisture, temperature, humidity, rain detection, and valve status.
- ESP32 sensor node that publishes telemetry to AWS IoT Core using MQTT over TLS.
- Raspberry Pi valve controller that subscribes to MQTT commands and controls a relay/MOSFET-driven 12 V solenoid valve.
- React web dashboard for telemetry cards, charts, manual valve control, and watering schedules.
- Android mobile app for quick garden status checks, manual watering commands, and schedule management.
- AWS backend using API Gateway, Lambda, DynamoDB, IoT Core, IoT Rules, and EventBridge Scheduler.
- Recurring watering schedules created through the web or mobile app.
- AI-assisted weekly watering plan that uses weather forecast data and latest garden telemetry to suggest one-time watering schedules for the selected week.

## System Architecture

The system is divided into four main layers:

1. **Edge sensing**
   - ESP32 reads soil moisture, rain, temperature, and humidity sensors.
   - Telemetry is sent as JSON over MQTT to AWS IoT Core.

2. **Cloud backend**
   - AWS IoT Core receives telemetry and routes it through IoT Rules.
   - AWS Lambda functions process telemetry, commands, schedules, and AI watering plans.
   - DynamoDB stores latest readings, history, command logs, and schedules.
   - EventBridge Scheduler triggers watering commands at configured times.

3. **User applications**
   - React web dashboard communicates with API Gateway.
   - Android app communicates with the same REST API.
   - Users can monitor telemetry, view history, control the valve, and manage schedules.

4. **Actuation**
   - Raspberry Pi subscribes to the command MQTT topic.
   - It opens or closes the valve through a relay/MOSFET driver.
   - It publishes valve status updates back to AWS IoT Core.

## Hardware Components

- ESP32 development board
- Raspberry Pi 5
- Capacitive soil moisture sensor
- Rain sensor module
- DHT11 temperature and humidity sensor
- Relay or MOSFET driver module
- 12 V solenoid valve
- External 12 V power supply

## Cloud Services Used

- **AWS IoT Core**: MQTT broker for telemetry, commands, and valve status.
- **AWS IoT Rules**: routes MQTT telemetry payloads to Lambda.
- **AWS Lambda**: backend logic for API endpoints and MQTT publishing.
- **Amazon DynamoDB**: stores sensor readings, valve status, command logs, and schedules.
- **Amazon API Gateway**: REST API used by the web dashboard and Android app.
- **Amazon EventBridge Scheduler**: runs scheduled watering commands.
- **Google Gemini API**: generates AI-assisted weekly watering recommendations.
- **Open-Meteo API**: provides weather forecast and city geocoding data.

## Repository Structure

```text
smart-garden/
├── smart-garden-web/              # React/Vite web dashboard
├── smart-garden-app/              # Expo/React Native Android app
├── smart-garden-rpi/              # Raspberry Pi valve controller
├── esp32/                         # ESP32 sensor firmware
├── aws-lambda-functions/          # AWS Lambda source files
│   ├── generate-watering-plan/
│   ├── create-schedule/
│   ├── get-schedules/
│   ├── delete-schedule/
│   ├── execute-scheduled-watering/
│   ├── ingest-telemetry/
│   ├── send-command/
│   ├── get-latest/
│   └── get-history/
└── docs/                          # Diagrams, screenshots, and project documentation
```

## MQTT Topics

| Purpose | Topic |
|---|---|
| ESP32 telemetry | `smart-garden/node01/telemetry` |
| Raspberry Pi command subscription | `smart-garden/node01/commands` |
| Raspberry Pi valve status | `smart-garden/node01/status` |

Example command payload:

```json
{
  "command": "open_valve",
  "duration_seconds": 10,
  "source": "web",
  "device_id": "garden_node_01",
  "command_id": "command-123"
}
```

Example telemetry payload:

```json
{
  "device_id": "garden_node_01",
  "soil_moisture": 55,
  "temperature": 24.7,
  "humidity": 53,
  "rain_detected": false,
  "timestamp": "2026-06-04T19:56:03.771Z"
}
```

Example valve status payload:

```json
{
  "device_id": "garden_node_01",
  "controller": "raspberry_pi_5",
  "valve_status": "closed",
  "timestamp": "2026-06-04T19:56:03.771Z",
  "source": "web",
  "command_id": "command-123"
}
```

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/latest` | Returns latest telemetry and valve status. |
| `GET` | `/history` | Returns recent telemetry history for charts and tables. |
| `POST` | `/command` | Sends manual valve open/close commands. |
| `GET` | `/schedules` | Lists recurring and one-time schedules. |
| `POST` | `/schedules` | Creates recurring or one-time schedules. |
| `DELETE` | `/schedules/{schedule_id}` | Deletes a schedule from EventBridge Scheduler and DynamoDB. |
| `POST` | `/ai/watering-plan` | Generates a weekly AI watering plan from city/country, weather forecast, and latest telemetry. |

## Schedule Types

### Recurring schedule

Recurring schedules repeat daily at the selected time.

```json
{
  "label": "Morning watering",
  "time": "08:00",
  "duration_seconds": 10,
  "timezone": "Europe/Bucharest",
  "device_id": "garden_node_01",
  "one_time": false
}
```

### AI weekly one-time schedule

AI schedules are one-time schedules for a specific date in the generated week.

```json
{
  "label": "AI watering - Monday",
  "date": "2026-06-08",
  "time": "08:00",
  "duration_seconds": 10,
  "timezone": "Europe/Bucharest",
  "device_id": "garden_node_01",
  "one_time": true
}
```

The backend creates an EventBridge `at(...)` schedule and uses `ActionAfterCompletion: DELETE` so the schedule is removed after it runs.

## Environment Variables

### Web dashboard

```env
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com
VITE_DEVICE_ID=garden_node_01
```

### Lambda functions

Common values:

```env
AWS_REGION=us-east-1
READINGS_TABLE=SmartGardenReadings
SCHEDULES_TABLE=SmartGardenSchedules
DEFAULT_DEVICE_ID=garden_node_01
```

Schedule Lambda values:

```env
EXECUTE_LAMBDA_ARN=arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:smartGardenExecuteScheduledWatering
SCHEDULER_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/SmartGardenSchedulerInvokeLambdaRole
```

AI watering plan Lambda values:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
DEFAULT_CITY=Bucharest
DEFAULT_COUNTRY=RO
DEFAULT_LOCATION_NAME=Bucharest, RO
```

## Local Web App Setup

```bash
cd smart-garden-web
npm install
npm run dev
```

Build for hosting:

```bash
npm run build
```

## Hosting

The React web dashboard can be hosted as a static site on Vercel. The AWS backend remains deployed on API Gateway, Lambda, DynamoDB, IoT Core, and EventBridge Scheduler.

Required Vercel environment variables:

```env
VITE_API_BASE_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com
VITE_DEVICE_ID=garden_node_01
```

After deployment, add the Vercel URL to API Gateway CORS allowed origins.

## Safety Notes

- The system controls a real water valve. Keep durations short during testing.
- The project does not include a physical water flow sensor, so the UI should not claim that water flow is confirmed.
- The valve status indicates the controller command state, not measured flow.
- Do not commit AWS certificates, private keys, Gemini API keys, or `.env` files.

## Future Work

- Add user authentication and role-based access control.
- Add stricter API authorization and production CORS rules.
- Add a physical water flow sensor to confirm actual water movement.
- Add better calibration for soil moisture sensors.
- Add push notifications for dry soil, rain detection, and schedule execution.
- Improve AI planning with plant type, soil type, and seasonal watering profiles.

## License

This project is intended for academic and demonstration purposes.
