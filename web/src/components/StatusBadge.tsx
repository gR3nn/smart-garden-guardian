interface StatusBadgeProps {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "neutral";
}

function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span className="status-badge__dot" />
      {label}
    </span>
  );
}

export default StatusBadge;
