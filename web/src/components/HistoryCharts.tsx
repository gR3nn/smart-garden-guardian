import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryReading } from "../types/smartGarden";
import { formatChartTime } from "../utils/formatters";

interface HistoryChartsProps {
  readings: HistoryReading[];
  isLoading: boolean;
  error: string | null;
  hasRequestedData: boolean;
}

function HistoryCharts({
  readings,
  isLoading,
  error,
  hasRequestedData,
}: HistoryChartsProps) {
  const safeReadings = Array.isArray(readings) ? readings : [];
  const chartData = [...safeReadings].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  return (
    <section className="dashboard-panel analytics-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Historical trends</p>
          <h2>Sensor history</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="state-card">
          <p>Loading history data...</p>
          <span className="state-card__hint">
            The dashboard is requesting `GET /history`.
          </span>
        </div>
      ) : null}

      {!isLoading && !hasRequestedData ? (
        <div className="state-card">
          <p>No history requested yet.</p>
          <span className="state-card__hint">
            Refresh the dashboard to load recent readings and trend lines.
          </span>
        </div>
      ) : null}

      {!isLoading && hasRequestedData && error ? (
        <div className="state-card state-card--error">
          <p>{error}</p>
          <span className="state-card__hint">
            History charts could not be loaded from the backend.
          </span>
        </div>
      ) : null}

      {!isLoading && hasRequestedData && !error && chartData.length === 0 ? (
        <div className="state-card">
          <p>No historical readings are available.</p>
          <span className="state-card__hint">
            The backend responded without entries for the selected device.
          </span>
        </div>
      ) : null}

      {!isLoading && chartData.length > 0 ? (
        <div className="chart-grid">
          <article className="chart-card">
            <div className="chart-card__header">
              <h3>Soil moisture</h3>
              <span>Percent</span>
            </div>
            <div className="chart-card__body">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="soilGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71d79c" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#71d79c" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatChartTime}
                    stroke="#8ea9a3"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="#8ea9a3"
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(8, 24, 28, 0.96)",
                      border: "1px solid rgba(122, 196, 223, 0.2)",
                      borderRadius: "16px",
                    }}
                    labelFormatter={formatChartTime}
                  />
                  <Area
                    type="monotone"
                    dataKey="soil_moisture"
                    stroke="#71d79c"
                    fill="url(#soilGradient)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="chart-card">
            <div className="chart-card__header">
              <h3>Temperature and humidity</h3>
              <span>Combined view</span>
            </div>
            <div className="chart-card__body">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f0b45f" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f0b45f" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#68c8ef" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#68c8ef" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatChartTime}
                    stroke="#8ea9a3"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="#8ea9a3"
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(8, 24, 28, 0.96)",
                      border: "1px solid rgba(122, 196, 223, 0.2)",
                      borderRadius: "16px",
                    }}
                    labelFormatter={formatChartTime}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature"
                    stroke="#f0b45f"
                    fill="url(#tempGradient)"
                    strokeWidth={2.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity"
                    stroke="#68c8ef"
                    fill="url(#humidityGradient)"
                    strokeWidth={2.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

export default HistoryCharts;
