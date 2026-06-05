import StatusBadge from "./StatusBadge";

interface FeedbackToastProps {
  tone: "success" | "danger";
  title: string;
  message: string;
  onDismiss: () => void;
}

function FeedbackToast({
  tone,
  title,
  message,
  onDismiss,
}: FeedbackToastProps) {
  return (
    <div className={`feedback-toast feedback-toast--${tone}`} role="status">
      <div className="feedback-toast__header">
        <StatusBadge
          label={tone === "success" ? "Command sent" : "Command failed"}
          tone={tone}
        />
        <button
          type="button"
          className="feedback-toast__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          x
        </button>
      </div>
      <strong className="feedback-toast__title">{title}</strong>
      <p className="feedback-toast__message">{message}</p>
    </div>
  );
}

export default FeedbackToast;
