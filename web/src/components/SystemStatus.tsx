import StatusBadge from "./StatusBadge";

interface SystemStatusProps {
  hasRequestedData: boolean;
  isReachable: boolean;
  isRefreshing: boolean;
  autoRefreshEnabled: boolean;
  deviceId: string;
  lastRefreshAt: string | null;
  onRefresh: () => void;
  onAutoRefreshToggle: () => void;
}

function SystemStatus({
  hasRequestedData,
  isReachable,
  isRefreshing,
  autoRefreshEnabled,
  deviceId,
  lastRefreshAt,
  onRefresh,
  onAutoRefreshToggle,
}: SystemStatusProps) {
  return (
    <section className="dashboard-panel dashboard-panel--status">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">System status</p>
          <h2>Connection and refresh</h2>
        </div>
        <StatusBadge
          label={
            !hasRequestedData
              ? "Waiting for request"
              : isReachable
                ? "Backend reachable"
                : "Backend unreachable"
          }
          tone={!hasRequestedData ? "neutral" : isReachable ? "success" : "danger"}
        />
      </div>

      <div className="system-status__grid">
        <article className="detail-card">
          <span className="detail-card__label">Device ID</span>
          <strong>{deviceId}</strong>
        </article>
        <article className="detail-card">
          <span className="detail-card__label">Last refresh</span>
          <strong>{lastRefreshAt ?? "Waiting for first sync"}</strong>
        </article>
        <article className="detail-card detail-card--accent">
          <span className="detail-card__label">Auto refresh</span>
          <strong>{autoRefreshEnabled ? "Every 15 seconds" : "Manual refresh only"}</strong>
        </article>
      </div>

      <div className="system-status__actions">
        <button
          type="button"
          className="action-button action-button--primary"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh now"}
        </button>
        <button
          type="button"
          className="action-button action-button--ghost"
          onClick={onAutoRefreshToggle}
        >
          {autoRefreshEnabled ? "Disable auto-refresh" : "Enable auto-refresh"}
        </button>
      </div>
    </section>
  );
}

export default SystemStatus;
