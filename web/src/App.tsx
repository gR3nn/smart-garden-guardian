import { useEffect, useState } from "react";
import { getHistory, getLatest, sendCommand } from "./api/smartGardenApi";
import FeedbackToast from "./components/FeedbackToast";
import HistoryCharts from "./components/HistoryCharts";
import RecentReadingsTable from "./components/RecentReadingsTable";
import SensorCard from "./components/SensorCard";
import StatusBadge from "./components/StatusBadge";
import SystemStatus from "./components/SystemStatus";
import ValveControls from "./components/ValveControls";
import WeeklyAiWateringPlan from "./components/WeeklyAiWateringPlan";
import type { CommandPayload } from "./types/smartGarden";
import type { HistoryReading, LatestReading } from "./types/smartGarden";
import {
  formatDateTime,
  formatRelativeTime,
  getValveStatusLabel,
  toSafeNumber,
} from "./utils/formatters";

const appName = import.meta.env.VITE_APP_NAME ?? "Smart Garden Guardian";
const deviceId = import.meta.env.VITE_DEVICE_ID ?? "garden_node_01";
const autoRefreshIntervalMs = 15000;

function getEnvironmentState(latest: LatestReading | null): {
  soilTheme: "idle" | "thriving" | "dry" | "soaked";
  weatherTheme: "clear" | "rain" | "freezing";
  label: string;
} {
  if (!latest) {
    return {
      soilTheme: "idle",
      weatherTheme: "clear",
      label: "Waiting for telemetry",
    };
  }

  const soilMoistureValue = toSafeNumber(latest.soil_moisture);
  const temperatureValue = toSafeNumber(latest.temperature);

  const soilTheme =
    soilMoistureValue < 35
      ? "dry"
      : soilMoistureValue > 75
        ? "soaked"
        : "thriving";

  const weatherTheme = temperatureValue <= 0
    ? "freezing"
    : latest.rain_detected
      ? "rain"
      : "clear";

  const label =
    weatherTheme === "freezing"
      ? "Freezing conditions"
      : weatherTheme === "rain"
        ? "Rainy conditions"
        : soilTheme === "dry"
          ? "Dry soil"
          : soilTheme === "soaked"
            ? "Overwatered soil"
            : "Thriving garden";

  return {
    soilTheme,
    weatherTheme,
    label,
  };
}

function App() {
  const [latest, setLatest] = useState<LatestReading | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [hasRequestedData, setHasRequestedData] = useState(false);
  const [historyReadings, setHistoryReadings] = useState<HistoryReading[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [lastCommandMessage, setLastCommandMessage] = useState<string | null>(
    null,
  );
  const [feedbackToast, setFeedbackToast] = useState<{
    tone: "success" | "danger";
    title: string;
    message: string;
  } | null>(null);

  async function loadLatest(options?: { silent?: boolean }) {
    const shouldKeepVisibleData = options?.silent ?? false;
    setHasRequestedData(true);

    if (!shouldKeepVisibleData) {
      setIsLoading(true);
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const data = await getLatest();
      setLatest(data);
      setLastRefreshAt(new Date().toISOString());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load the latest reading.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function loadHistory(options?: { silent?: boolean }) {
    const shouldKeepVisibleData = options?.silent ?? false;
    setHasRequestedData(true);

    if (!shouldKeepVisibleData) {
      setIsLoadingHistory(true);
    }

    setHistoryError(null);

    try {
      const data = await getHistory();

      if (Array.isArray(data)) {
        setHistoryReadings(data);
      } else {
        setHistoryReadings([]);
        setHistoryError("History response format is invalid.");
      }
    } catch (loadError) {
      setHistoryError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load the history readings.",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function refreshDashboard(options?: { silent?: boolean }) {
    const shouldKeepVisibleData = options?.silent ?? false;

    await Promise.all([
      loadLatest({ silent: shouldKeepVisibleData }),
      loadHistory({ silent: shouldKeepVisibleData }),
    ]);
  }

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshDashboard({ silent: true });
    }, autoRefreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshEnabled]);

  const backendReachable = hasRequestedData && !error && latest !== null;
  const soilMoistureValue = toSafeNumber(latest?.soil_moisture);
  const temperatureValue = toSafeNumber(latest?.temperature);
  const humidityValue = toSafeNumber(latest?.humidity);
  const moistureTone =
    latest && soilMoistureValue < 35 ? "warning" : "success";
  const rainTone = latest?.rain_detected ? "warning" : "default";
  const valveTone =
    latest?.valve_status === "open"
      ? "warning"
      : latest?.valve_status === "closed"
        ? "success"
        : "neutral";
  const autoModeTone = latest?.auto_mode ? "success" : "neutral";
  const environmentState = getEnvironmentState(latest);
  const valveStatusLabel = getValveStatusLabel(latest?.valve_status);
  const valveStatusBadgeLabel =
    latest?.valve_status === "open"
      ? "Open"
      : latest?.valve_status === "closed"
        ? "Closed"
        : "Unknown";
  const valveStatusHelperText = latest?.valve_updated_at
    ? `Updated ${formatDateTime(latest.valve_updated_at)}`
    : latest?.valve_source
      ? `Source ${latest.valve_source}`
      : "Latest valve status reported by the backend.";
  const overviewStats = [
    {
      label: "Polling",
      value: autoRefreshEnabled ? "15s live sync" : "on demand",
    },
    {
      label: "Backend",
      value: !hasRequestedData ? "idle" : backendReachable ? "reachable" : "offline",
    },
    {
      label: "Mode",
      value: latest?.auto_mode ? "automatic" : "manual",
    },
  ];

  async function handleCommand(
    payload: CommandPayload,
    confirmationMessage: string,
    successTitle: string,
  ) {
    const isConfirmed = window.confirm(confirmationMessage);

    if (!isConfirmed) {
      return;
    }

    setIsSendingCommand(true);

    try {
      const response = await sendCommand(payload);
      const message = response.message || "Command sent successfully.";

      setLastCommandMessage(message);
      setFeedbackToast({
        tone: "success",
        title: successTitle,
        message,
      });
      void refreshDashboard({ silent: true });
      window.setTimeout(() => {
        void refreshDashboard({ silent: true });
      }, 1500);
    } catch (commandError) {
      const message =
        commandError instanceof Error
          ? commandError.message
          : "Failed to send command.";

      setFeedbackToast({
        tone: "danger",
        title: "Unable to send command",
        message,
      });
    } finally {
      setIsSendingCommand(false);
    }
  }

  return (
    <main
      className={`app-shell app-shell--${environmentState.soilTheme} app-shell--${environmentState.weatherTheme}`}
    >
      <div className="environment-scene" aria-hidden="true">
        <div className="environment-scene__glow environment-scene__glow--left" />
        <div className="environment-scene__glow environment-scene__glow--right" />
        <div className="environment-scene__weather" />
      </div>

      {feedbackToast ? (
        <FeedbackToast
          tone={feedbackToast.tone}
          title={feedbackToast.title}
          message={feedbackToast.message}
          onDismiss={() => {
            setFeedbackToast(null);
          }}
        />
      ) : null}

      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" aria-hidden="true">
            SG
          </span>
          <div>
            <p className="topbar__eyebrow">Irrigation intelligence platform</p>
            <strong>{appName}</strong>
          </div>
        </div>
        <div className="topbar__status">
          <StatusBadge
            label={
              !hasRequestedData
                ? "Waiting for refresh"
                : backendReachable
                  ? "Telemetry live"
                  : "Backend offline"
            }
            tone={!hasRequestedData ? "neutral" : backendReachable ? "success" : "danger"}
          />
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-panel__content">
          <h1>{appName}</h1>
          <p className="hero-copy">
            Monitor soil conditions, track irrigation readiness, and keep
            connected watering systems under control from a single dashboard.
          </p>
          <div className="hero-scene-tag">
            <span className="hero-scene-tag__label">Current garden mood</span>
            <strong>{environmentState.label}</strong>
          </div>
          <div className="hero-stats">
            {overviewStats.map((item) => (
              <article key={item.label} className="hero-stat">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
        <aside className="hero-aside">
          <div className="hero-meta">
            <strong>
              {!hasRequestedData
                ? "Ready for first refresh"
                : backendReachable
                  ? "Live telemetry online"
                  : "Awaiting sync"}
            </strong>
            <span className="hero-meta__subtle">
              {lastRefreshAt
                ? `Updated ${formatRelativeTime(lastRefreshAt)}`
                : "Use refresh to request live telemetry"}
            </span>
          </div>
          <div className="hero-landscape" aria-hidden="true">
            <div className="hero-landscape__sky" />
            <div className="hero-landscape__sun" />
            <div className="hero-landscape__cloud hero-landscape__cloud--one" />
            <div className="hero-landscape__cloud hero-landscape__cloud--two" />
            <div className="hero-landscape__rain" />
            <div className="hero-landscape__snow" />
            <div className="hero-landscape__hill hero-landscape__hill--back" />
            <div className="hero-landscape__hill hero-landscape__hill--front" />
            <div className="hero-landscape__ground" />
            <div className="hero-landscape__plant">
              <span className="hero-landscape__stem" />
              <span className="hero-landscape__leaf hero-landscape__leaf--left" />
              <span className="hero-landscape__leaf hero-landscape__leaf--right" />
            </div>
            <div className="hero-landscape__cracks" />
            <div className="hero-landscape__water" />
            <div className="hero-landscape__ice" />
          </div>
        </aside>
      </section>

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Dashboard overview</p>
            <h2>Live sensor cards</h2>
          </div>
          <StatusBadge
            label={
              !hasRequestedData
                ? "No request sent yet"
                : error
                  ? "Data fetch failed"
                  : "Latest payload ready"
            }
            tone={!hasRequestedData ? "neutral" : error ? "danger" : "success"}
          />
        </div>

        {isLoading ? (
          <div className="state-grid">
            <div className="state-card state-card--loading">
              <p>Loading latest sensor payload...</p>
              <span className="state-card__hint">
                The app is waiting for the latest telemetry to respond.
              </span>
            </div>
            <div className="sensor-grid sensor-grid--placeholder">
              {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="sensor-card sensor-card--placeholder">
                  <div className="placeholder-line placeholder-line--short" />
                  <div className="placeholder-line placeholder-line--tall" />
                  <div className="placeholder-line" />
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {!isLoading && hasRequestedData && error ? (
          <div className="fallback-layout">
            <div className="state-card state-card--error state-card--spotlight">
              <p>{error}</p>
              <span className="state-card__hint">
                Telemetry is temporarily unavailable, but monitoring and layout
                sections remain ready for live data.
              </span>
            </div>
            <div className="sensor-grid sensor-grid--placeholder">
              <article className="sensor-card sensor-card--placeholder">
                <span className="sensor-card__label">Soil moisture</span>
                <strong className="sensor-card__value">--%</strong>
                <p className="sensor-card__helper">
                  Waiting for the first payload from the node.
                </p>
              </article>
              <article className="sensor-card sensor-card--placeholder">
                <span className="sensor-card__label">Temperature</span>
                <strong className="sensor-card__value">--.- C</strong>
                <p className="sensor-card__helper">
                  Connect the API Gateway endpoint to populate readings.
                </p>
              </article>
              <article className="sensor-card sensor-card--placeholder">
                <span className="sensor-card__label">Humidity</span>
                <strong className="sensor-card__value">--%</strong>
                <p className="sensor-card__helper">
                  Placeholder cards keep the monitoring layout stable.
                </p>
              </article>
              <article className="sensor-card sensor-card--placeholder">
                <span className="sensor-card__label">Valve status</span>
                <strong className="sensor-card__value">unknown</strong>
                <p className="sensor-card__helper">
                  Live valve actions will appear once controls are enabled.
                </p>
              </article>
            </div>
          </div>
        ) : null}

        {!isLoading && latest ? (
          <div className="sensor-grid">
            <SensorCard
              label="Soil moisture"
              value={`${soilMoistureValue}%`}
              icon="🌱"
              helperText={
                soilMoistureValue < 35
                  ? "Dry soil detected. Irrigation may be needed."
                  : "Moisture level is within the expected range."
              }
              tone={moistureTone}
              badgeLabel={soilMoistureValue < 35 ? "Dry" : "Healthy"}
            />
            <SensorCard
              label="Temperature"
              value={`${temperatureValue.toFixed(1)} C`}
              icon="🌡"
              helperText="Ambient air temperature reported by the device."
              tone="default"
              badgeLabel="Live"
            />
            <SensorCard
              label="Humidity"
              value={`${humidityValue}%`}
              icon="💧"
              helperText="Relative humidity around the monitored zone."
              tone="default"
              badgeLabel="Stable"
            />
            <SensorCard
              label="Rain detected"
              value={latest.rain_detected ? "Yes" : "No"}
              icon="☔"
              helperText={
                latest.rain_detected
                  ? "Rain sensor is active. Irrigation should be reviewed."
                  : "No rain detected by the sensor."
              }
              tone={rainTone}
              badgeLabel={latest.rain_detected ? "Warning" : "Clear"}
            />
            <SensorCard
              label="Valve status"
              value={valveStatusLabel}
              icon="🚰"
              helperText={valveStatusHelperText}
              tone={valveTone}
              badgeLabel={valveStatusBadgeLabel}
            />
            <SensorCard
              label="Last update"
              value={formatDateTime(latest.last_update)}
              icon="🕒"
              helperText={`Received ${formatRelativeTime(latest.last_update)} from the device.`}
              tone="neutral"
              badgeLabel="Timestamp"
            />
            <SensorCard
              label="Auto mode"
              value={latest.auto_mode ? "Enabled" : "Disabled"}
              icon="⚙"
              helperText="Indicates whether the backend reports autonomous control."
              tone={autoModeTone}
              badgeLabel={latest.auto_mode ? "Automatic" : "Manual"}
            />
            <SensorCard
              label="Device ID"
              value={latest.device_id}
              icon="📡"
              helperText="Source node currently providing the telemetry payload."
              tone="neutral"
              badgeLabel="Connected"
            />
          </div>
        ) : null}

        {!isLoading && !latest && !error && !hasRequestedData ? (
          <div className="state-card">
            <p>No telemetry requested yet.</p>
            <span className="state-card__hint">
              Use the refresh button below to request the latest device data.
            </span>
          </div>
        ) : null}

        {!isLoading && !latest && !error && hasRequestedData ? (
          <div className="state-card">
            <p>No live reading is available yet.</p>
            <span className="state-card__hint">
              Check the API response format and try refreshing.
            </span>
          </div>
        ) : null}
      </section>

      <SystemStatus
        hasRequestedData={hasRequestedData}
        isReachable={backendReachable}
        isRefreshing={isRefreshing}
        autoRefreshEnabled={autoRefreshEnabled}
        deviceId={latest?.device_id ?? deviceId}
        lastRefreshAt={lastRefreshAt ? formatDateTime(lastRefreshAt) : null}
        onRefresh={() => {
          void refreshDashboard({ silent: false });
        }}
        onAutoRefreshToggle={() => {
          setAutoRefreshEnabled((currentValue) => !currentValue);
        }}
      />

      <ValveControls
        isSubmitting={isSendingCommand}
        valveStatus={latest?.valve_status ?? "unknown"}
        lastCommandMessage={lastCommandMessage}
        onOpenValve={(durationSeconds) => {
          void handleCommand(
            {
              command: "open_valve",
              duration_seconds: durationSeconds,
              source: "web",
            },
            `Open the valve for ${durationSeconds} seconds?`,
            `Valve opened for ${durationSeconds}s`,
          );
        }}
        onEmergencyStop={() => {
          void handleCommand(
            {
              command: "close_valve",
              duration_seconds: 0,
              source: "web",
            },
            "Send an emergency stop and close the valve now?",
            "Emergency stop sent",
          );
        }}
      />

      <WeeklyAiWateringPlan deviceId={latest?.device_id ?? deviceId} />

      <div className="analytics-layout">
        <HistoryCharts
          readings={historyReadings}
          isLoading={isLoadingHistory}
          error={historyError}
          hasRequestedData={hasRequestedData}
        />
        <RecentReadingsTable
          readings={historyReadings}
          isLoading={isLoadingHistory}
          error={historyError}
          hasRequestedData={hasRequestedData}
        />
      </div>
    </main>
  );
}

export default App;
