import StatusBadge from "./StatusBadge";

interface SensorCardProps {
  label: string;
  value: string;
  icon: string;
  helperText?: string;
  tone?: "default" | "success" | "warning" | "danger" | "neutral";
  badgeLabel?: string;
}

function SensorCard({
  label,
  value,
  icon,
  helperText,
  tone = "default",
  badgeLabel,
}: SensorCardProps) {
  return (
    <article className={`sensor-card sensor-card--${tone}`}>
      <div className="sensor-card__header">
        <div className="sensor-card__icon" aria-hidden="true">
          {icon}
        </div>
        {badgeLabel ? <StatusBadge label={badgeLabel} tone={tone} /> : null}
      </div>
      <span className="sensor-card__label">{label}</span>
      <strong className="sensor-card__value">{value}</strong>
      {helperText ? <p className="sensor-card__helper">{helperText}</p> : null}
    </article>
  );
}

export default SensorCard;
