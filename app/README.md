# Smart Garden Guardian Mobile

Android-focused Expo React Native app for the Smart Garden Guardian IoT + Cloud Architectures project.

The mobile app is intentionally designed as a friendly garden assistant, not as a clone of the technical web dashboard.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local `.env` file from `.env.example` and set your API Gateway invoke URL:

   ```bash
   cp .env.example .env
   ```

3. Run the app:

   ```bash
   npm run android
   ```

The Android script assumes the SDK is installed at `$HOME/Android/Sdk` and adds `platform-tools` and `emulator` to `PATH` for this project run. If your SDK is somewhere else, update the `android` script in `package.json` or export `ANDROID_HOME` before running Expo.

If Expo Go gets stuck on the loading screen, try:

```bash
adb reverse tcp:8081 tcp:8081
npm run android
```

If port `8081` is already running from a previous Metro session, reload that session instead of starting a second one.

## Environment

Create a local `.env` from `.env.example`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://REPLACE_WITH_MY_API_GATEWAY_INVOKE_URL
EXPO_PUBLIC_APP_NAME=Smart Garden Guardian
EXPO_PUBLIC_DEVICE_ID=garden_node_01
EXPO_PUBLIC_USER_NAME=Garden Owner
```

Only `EXPO_PUBLIC_` variables are used by the mobile app. Do not commit `.env`.

## Backend

The app uses the real backend for:

- `GET /latest`
- `GET /history`
- `POST /command`

Manual watering uses fixed safe presets shown in the mobile UI as `5`, `10`, or `15` seconds. Emergency stop sends `close_valve` with `duration_seconds: 0`.

Profile, app language, local watering reminders, and notification preferences are stored on the phone with AsyncStorage until backend endpoints exist.
The schedule feature is a local reminder system: reminders are saved on this phone and notify the user to open the app and water manually.
Dry soil notifications are local notifications with a 30-minute cooldown and can be turned on or off from Settings.
In Expo Go, local notification behavior can vary by SDK version and device state. If notification testing is unreliable, use a development build for more predictable behavior.

## Screens

- Home: friendly garden greeting, health message, live sensor values, backend status, pull-to-refresh.
- Water: manual watering controls, valve status, timed post-command refreshes, emergency stop.
- Schedule: local-only watering reminders saved on this phone.
- History: recent backend readings and simple trend summary.
- Settings: local profile editing, English/Romanian language selector, dry-soil notification toggle, device/API info, backend connection test, local data reset actions.

## Verify

```bash
npm run typecheck
npm run android
```

Recommended test checklist:

- Home shows soil moisture, rain status, valve status, and last update from `GET /latest`.
- Manual watering buttons still send commands and refresh valve state after sending.
- Emergency stop closes the valve and updates the status card.
- Create a local reminder in Schedule, close and reopen the app, and confirm it persists.
- If notifications are allowed, confirm the scheduled reminder appears on the device.
- Turn on dry soil notifications in Settings and confirm a dry reading from `GET /latest` triggers a local alert without repeating within 30 minutes.
- Switch the app language in Settings and confirm the tab labels and main screen copy update to Romanian.

Do not place AWS credentials, certificates, private keys, or secrets in this mobile app.
