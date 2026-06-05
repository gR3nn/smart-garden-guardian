import type { HistoryReading } from "../types/smartGarden";
import { formatDateTime, toSafeNumber } from "../utils/formatters";

interface RecentReadingsTableProps {
  readings: HistoryReading[];
  isLoading: boolean;
  error: string | null;
  hasRequestedData: boolean;
}

function RecentReadingsTable({
  readings,
  isLoading,
  error,
  hasRequestedData,
}: RecentReadingsTableProps) {
  const safeReadings = Array.isArray(readings) ? readings : [];
  const recentRows = [...safeReadings]
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    )
    .slice(0, 10);

  return (
    <section className="dashboard-panel analytics-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Recent readings</p>
          <h2>Telemetry table</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="state-card">
          <p>Preparing telemetry table...</p>
        </div>
      ) : null}

      {!isLoading && !hasRequestedData ? (
        <div className="state-card">
          <p>No readings loaded yet.</p>
          <span className="state-card__hint">
            Manual refresh will populate this table with recent history.
          </span>
        </div>
      ) : null}

      {!isLoading && hasRequestedData && error ? (
        <div className="state-card state-card--error">
          <p>{error}</p>
        </div>
      ) : null}

      {!isLoading && hasRequestedData && !error && recentRows.length > 0 ? (
        <div className="table-shell">
          <table className="readings-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Soil moisture</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Rain</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.map((reading) => (
                <tr key={reading.timestamp}>
                  <td>{formatDateTime(reading.timestamp)}</td>
                  <td>{toSafeNumber(reading.soil_moisture)}%</td>
                  <td>{toSafeNumber(reading.temperature).toFixed(1)} C</td>
                  <td>{toSafeNumber(reading.humidity)}%</td>
                  <td>{reading.rain_detected ? "Detected" : "Clear"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && hasRequestedData && !error && recentRows.length === 0 ? (
        <div className="state-card">
          <p>No rows are available for the current device.</p>
        </div>
      ) : null}
    </section>
  );
}

export default RecentReadingsTable;
