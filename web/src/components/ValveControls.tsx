import StatusBadge from "./StatusBadge";
import { getValveStatusLabel } from "../utils/formatters";

interface ValveControlsProps {
  isSubmitting: boolean;
  valveStatus: string;
  lastCommandMessage: string | null;
  onOpenValve: (durationSeconds: number) => void;
  onEmergencyStop: () => void;
}

const durationOptions = [5, 10, 15];

function ValveControls({
  isSubmitting,
  valveStatus,
  lastCommandMessage,
  onOpenValve,
  onEmergencyStop,
}: ValveControlsProps) {
  const valveTone =
    valveStatus === "open"
      ? "warning"
      : valveStatus === "closed"
        ? "success"
        : "neutral";

  return (
    <section className="dashboard-panel dashboard-panel--controls">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Manual irrigation</p>
          <h2>Valve controls</h2>
        </div>
        <StatusBadge
          label={getValveStatusLabel(valveStatus)}
          tone={valveTone}
        />
      </div>

      <div className="valve-controls__layout">
        <div className="valve-controls__summary">
          <strong>Manual override</strong>
          <p>
            Send timed watering bursts or immediately close the valve if the
            system needs to be stopped.
          </p>
          <span className="valve-controls__note">
            Commands are sent with source `web`.
          </span>
          {lastCommandMessage ? (
            <div className="valve-controls__message">{lastCommandMessage}</div>
          ) : null}
        </div>

        <div className="valve-controls__actions">
          {durationOptions.map((durationSeconds) => (
            <button
              key={durationSeconds}
              type="button"
              className="action-button action-button--primary"
              onClick={() => {
                onOpenValve(durationSeconds);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Sending command..."
                : `Open valve for ${durationSeconds}s`}
            </button>
          ))}

          <button
            type="button"
            className="action-button action-button--danger"
            onClick={onEmergencyStop}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending command..." : "Emergency stop"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ValveControls;
