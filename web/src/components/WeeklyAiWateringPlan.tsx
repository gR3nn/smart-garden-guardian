import { useEffect, useMemo, useState } from "react";
import {
  createSchedule,
  deleteSchedule,
  generateWateringPlan,
  getSchedules,
} from "../api/smartGardenApi";
import StatusBadge from "./StatusBadge";
import type {
  AiWateringPlanRequest,
  AiWateringPlanResponse,
  CreateScheduleRequest,
  EditablePlanItem,
  WateringSchedule,
} from "../types/smartGarden";
import { formatDateTime } from "../utils/formatters";

const DEFAULT_TIMEZONE = "Europe/Bucharest";
const VALID_DURATIONS = [5, 10, 15] as const;
const RECURRING_SCHEDULES_PER_PAGE = 5;

interface WeeklyAiWateringPlanProps {
  deviceId: string;
}

interface LocationFormState {
  city: string;
  country: string;
}

interface RecurringScheduleFormState {
  label: string;
  time: string;
  durationSeconds: (typeof VALID_DURATIONS)[number];
}

type ScheduleTab = "recurring" | "one-time";

function isValidDuration(value: number): value is (typeof VALID_DURATIONS)[number] {
  return VALID_DURATIONS.includes(value as (typeof VALID_DURATIONS)[number]);
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function isValidPlanDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toEditablePlanItems(response: AiWateringPlanResponse): EditablePlanItem[] {
  return response.plan.map((item) => {
    const durationSeconds =
      item.recommended && isValidDuration(item.duration_seconds)
        ? item.duration_seconds
        : 0;

    return {
      ...item,
      duration_seconds: durationSeconds,
      selected: item.recommended && durationSeconds > 0,
    };
  });
}

function WeeklyAiWateringPlan({ deviceId }: WeeklyAiWateringPlanProps) {
  const [activeTab, setActiveTab] = useState<ScheduleTab>("recurring");
  const [schedules, setSchedules] = useState<WateringSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [isDeletingScheduleId, setIsDeletingScheduleId] = useState<string | null>(
    null,
  );
  const [location, setLocation] = useState<LocationFormState>({
    city: "Bucharest",
    country: "RO",
  });
  const [recurringForm, setRecurringForm] = useState<RecurringScheduleFormState>({
    label: "",
    time: "08:00",
    durationSeconds: 10,
  });
  const [planResponse, setPlanResponse] = useState<AiWateringPlanResponse | null>(
    null,
  );
  const [editablePlan, setEditablePlan] = useState<EditablePlanItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [recurringFormError, setRecurringFormError] = useState<string | null>(null);
  const [scheduleActionMessage, setScheduleActionMessage] = useState<string | null>(
    null,
  );
  const [scheduleActionErrors, setScheduleActionErrors] = useState<string[]>([]);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);
  const [isCreatingAiSchedules, setIsCreatingAiSchedules] = useState(false);
  const [recurringPage, setRecurringPage] = useState(1);

  const recurringSchedules = useMemo(
    () => schedules.filter((schedule) => !schedule.one_time),
    [schedules],
  );
  const oneTimeSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.one_time),
    [schedules],
  );
  const selectedCount = useMemo(
    () => editablePlan.filter((item) => item.selected).length,
    [editablePlan],
  );
  const recurringTotalPages = Math.max(
    1,
    Math.ceil(recurringSchedules.length / RECURRING_SCHEDULES_PER_PAGE),
  );
  const paginatedRecurringSchedules = useMemo(() => {
    const startIndex = (recurringPage - 1) * RECURRING_SCHEDULES_PER_PAGE;

    return recurringSchedules.slice(
      startIndex,
      startIndex + RECURRING_SCHEDULES_PER_PAGE,
    );
  }, [recurringPage, recurringSchedules]);

  async function loadSchedules(options?: { silent?: boolean }) {
    const shouldKeepContent = options?.silent ?? false;

    if (!shouldKeepContent) {
      setIsLoadingSchedules(true);
    }

    setSchedulesError(null);

    try {
      const response = await getSchedules();

      if (!response.ok || !Array.isArray(response.schedules)) {
        throw new Error("Schedules response was invalid.");
      }

      setSchedules(response.schedules);
    } catch (error) {
      setSchedulesError(
        error instanceof Error
          ? error.message
          : "Could not load watering schedules.",
      );
    } finally {
      setIsLoadingSchedules(false);
    }
  }

  useEffect(() => {
    void loadSchedules();
  }, []);

  useEffect(() => {
    if (recurringPage > recurringTotalPages) {
      setRecurringPage(recurringTotalPages);
    }
  }, [recurringPage, recurringTotalPages]);

  function updateLocationField(field: keyof LocationFormState, value: string) {
    setLocation((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function updateRecurringFormField(
    field: keyof RecurringScheduleFormState,
    value: string | number,
  ) {
    setRecurringForm((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function updatePlanItem(index: number, updates: Partial<EditablePlanItem>) {
    setEditablePlan((currentValue) =>
      currentValue.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          ...updates,
        };
      }),
    );
  }

  async function handleCreateRecurringSchedule() {
    const trimmedLabel = recurringForm.label.trim();

    if (!trimmedLabel) {
      setRecurringFormError("Recurring schedule label is required.");
      return;
    }

    if (!isValidTime(recurringForm.time)) {
      setRecurringFormError("Recurring schedule time must use HH:mm.");
      return;
    }

    if (!isValidDuration(recurringForm.durationSeconds)) {
      setRecurringFormError(
        "Recurring schedule duration must be 5, 10, or 15 seconds.",
      );
      return;
    }

    setRecurringFormError(null);
    setScheduleActionMessage(null);
    setScheduleActionErrors([]);
    setIsCreatingRecurring(true);

    const payload: CreateScheduleRequest = {
      label: trimmedLabel,
      time: recurringForm.time,
      duration_seconds: recurringForm.durationSeconds,
      timezone: DEFAULT_TIMEZONE,
      device_id: deviceId,
      one_time: false,
    };

    try {
      const response = await createSchedule(payload);

      if (!response.ok) {
        throw new Error("Recurring schedule creation failed.");
      }

      setScheduleActionMessage("Recurring schedule created successfully.");
      setRecurringForm({
        label: "",
        time: recurringForm.time,
        durationSeconds: recurringForm.durationSeconds,
      });
      await loadSchedules({ silent: true });
      setRecurringPage(1);
    } catch (error) {
      setRecurringFormError(
        error instanceof Error
          ? error.message
          : "Could not create recurring schedule.",
      );
    } finally {
      setIsCreatingRecurring(false);
    }
  }

  async function handleGeneratePlan() {
    if (!location.city.trim() || !location.country.trim()) {
      setLocationError("Enter a valid city and country.");
      return;
    }

    setLocationError(null);
    setGenerateError(null);
    setScheduleActionMessage(null);
    setScheduleActionErrors([]);
    setIsGenerating(true);

    const payload: AiWateringPlanRequest = {
      device_id: deviceId,
      location: {
        city: location.city.trim(),
        country: location.country.trim(),
      },
    };

    try {
      const response = await generateWateringPlan(payload);

      if (!response.ok) {
        throw new Error("The backend did not return a valid watering plan.");
      }

      setPlanResponse(response);
      setEditablePlan(toEditablePlanItems(response));
    } catch (error) {
      setPlanResponse(null);
      setEditablePlan([]);
      setGenerateError(
        error instanceof Error
          ? error.message === "Watering plan response was invalid."
            ? error.message
            : `Could not generate watering plan. Please try again. ${error.message}`
          : "Could not generate watering plan. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAddSelectedToOneTimeSchedules() {
    const selectedItems = editablePlan.filter((item) => item.selected);
    const errors: string[] = [];

    if (selectedItems.length === 0) {
      setScheduleActionMessage("Select at least one watering recommendation.");
      setScheduleActionErrors([]);
      return;
    }

    selectedItems.forEach((item) => {
      if (!isValidPlanDate(item.date)) {
        errors.push(`${item.day_label}: date is missing or invalid.`);
      }

      if (!isValidTime(item.time)) {
        errors.push(`${item.day_label}: time must use HH:mm.`);
      }

      if (!isValidDuration(item.duration_seconds)) {
        errors.push(`${item.day_label}: duration must be 5, 10, or 15 seconds.`);
      }
    });

    if (errors.length > 0) {
      setScheduleActionMessage(null);
      setScheduleActionErrors(errors);
      return;
    }

    setIsCreatingAiSchedules(true);
    setScheduleActionMessage(null);
    setScheduleActionErrors([]);

    try {
      const results = await Promise.allSettled(
        selectedItems.map(async (item) => {
          if (!isValidPlanDate(item.date)) {
            throw new Error("Date is missing or invalid.");
          }

          const payload: CreateScheduleRequest = {
            label: `AI watering - ${item.day_label}`,
            date: item.date,
            time: item.time,
            duration_seconds: item.duration_seconds,
            timezone: DEFAULT_TIMEZONE,
            device_id: deviceId,
            one_time: true,
          };

          const response = await createSchedule(payload);

          if (!response.ok) {
            throw new Error("One-time schedule creation failed.");
          }

          return item.day_label;
        }),
      );

      const failedItems = results
        .map((result, index) => ({ result, item: selectedItems[index] }))
        .filter(
          (entry): entry is {
            result: PromiseRejectedResult;
            item: EditablePlanItem;
          } => entry.result.status === "rejected",
        );
      const successCount = results.length - failedItems.length;

      if (successCount > 0) {
        setScheduleActionMessage(
          successCount === 1
            ? "1 one-time schedule created. Schedules created successfully."
            : `${successCount} one-time schedules created. Schedules created successfully.`,
        );
        await loadSchedules({ silent: true });
      } else {
        setScheduleActionMessage(null);
      }

      setScheduleActionErrors(
        failedItems.map(({ result, item }) => {
          const reason =
            result.reason instanceof Error
              ? result.reason.message
              : "Schedule creation failed.";
          return `${item.day_label}: ${reason}`;
        }),
      );
    } finally {
      setIsCreatingAiSchedules(false);
    }
  }

  async function handleDeleteSchedule(schedule: WateringSchedule) {
    const isConfirmed = window.confirm(
      `Delete watering schedule "${schedule.label}"?`,
    );

    if (!isConfirmed) {
      return;
    }

    setIsDeletingScheduleId(schedule.schedule_id);
    setScheduleActionMessage(null);
    setScheduleActionErrors([]);

    try {
      const response = await deleteSchedule(schedule.schedule_id);

      if (!response.ok) {
        throw new Error("Schedule deletion failed.");
      }

      setScheduleActionMessage("Watering schedule deleted successfully.");
      await loadSchedules({ silent: true });
    } catch (error) {
      setScheduleActionErrors([
        error instanceof Error ? error.message : "Could not delete schedule.",
      ]);
    } finally {
      setIsDeletingScheduleId(null);
    }
  }

  return (
    <section className="dashboard-panel dashboard-panel--ai-plan">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Scheduling</p>
          <h2>Watering Schedules</h2>
        </div>
        <StatusBadge
          label={
            isLoadingSchedules
              ? "Loading schedules"
              : `${schedules.length} schedules loaded`
          }
          tone={isLoadingSchedules ? "neutral" : "success"}
        />
      </div>

      <div className="ai-plan__tabs" role="tablist" aria-label="Watering schedule tabs">
        <button
          type="button"
          className={`ai-plan__tab ${activeTab === "recurring" ? "ai-plan__tab--active" : ""}`}
          onClick={() => {
            setActiveTab("recurring");
          }}
        >
          Recurring schedules
        </button>
        <button
          type="button"
          className={`ai-plan__tab ${activeTab === "one-time" ? "ai-plan__tab--active" : ""}`}
          onClick={() => {
            setActiveTab("one-time");
          }}
        >
          AI weekly one-time schedules
        </button>
      </div>

      {schedulesError ? (
        <div className="state-card state-card--error">
          <p>{schedulesError}</p>
          <span className="state-card__hint">
            Schedule management is temporarily unavailable.
          </span>
        </div>
      ) : null}

      {scheduleActionMessage ? (
        <p className="ai-plan__success">{scheduleActionMessage}</p>
      ) : null}
      {scheduleActionErrors.length > 0 ? (
        <div className="ai-plan__error-list">
          {scheduleActionErrors.map((item) => (
            <p key={item} className="ai-plan__error">
              {item}
            </p>
          ))}
        </div>
      ) : null}

      {activeTab === "recurring" ? (
        <div className="ai-plan__tab-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Repeating irrigation</p>
              <h2>Recurring Watering Schedules</h2>
              <p className="hero-copy ai-plan__copy">
                Create repeating watering schedules for regular irrigation.
              </p>
            </div>
            <StatusBadge
              label={`${recurringSchedules.length} recurring`}
              tone={recurringSchedules.length > 0 ? "success" : "neutral"}
            />
          </div>

          <div className="ai-plan__layout">
            <div className="ai-plan__controls">
              <div className="state-card">
                <span className="detail-card__label">Create recurring schedule</span>
                <div className="ai-plan__location-grid">
                  <label className="ai-plan__field ai-plan__field--full">
                    <span>Label</span>
                    <input
                      type="text"
                      value={recurringForm.label}
                      onChange={(event) => {
                        updateRecurringFormField("label", event.target.value);
                      }}
                    />
                  </label>
                  <label className="ai-plan__field">
                    <span>Time</span>
                    <input
                      type="time"
                      value={recurringForm.time}
                      onChange={(event) => {
                        updateRecurringFormField("time", event.target.value);
                      }}
                    />
                  </label>
                  <label className="ai-plan__field">
                    <span>Duration</span>
                    <select
                      value={recurringForm.durationSeconds}
                      onChange={(event) => {
                        updateRecurringFormField(
                          "durationSeconds",
                          Number(event.target.value),
                        );
                      }}
                    >
                      {VALID_DURATIONS.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} seconds
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="ai-plan__actions">
                  <button
                    type="button"
                    className="action-button action-button--primary"
                    onClick={() => {
                      void handleCreateRecurringSchedule();
                    }}
                    disabled={isCreatingRecurring}
                  >
                    {isCreatingRecurring
                      ? "Creating..."
                      : "Create recurring schedule"}
                  </button>
                </div>

                {recurringFormError ? (
                  <p className="ai-plan__error">{recurringFormError}</p>
                ) : null}
              </div>
            </div>

            <div className="ai-plan__results">
              {recurringSchedules.length > 0 ? (
                <div className="ai-plan__schedule-list">
                  {paginatedRecurringSchedules.map((schedule) => (
                    <article
                      key={schedule.schedule_id}
                      className="detail-card ai-plan__schedule-item"
                    >
                      <div className="ai-plan__schedule-header">
                        <div>
                          <span className="detail-card__label">{schedule.label}</span>
                          <strong>Recurring</strong>
                        </div>
                        <StatusBadge
                          label={schedule.enabled ? "Enabled" : "Disabled"}
                          tone={schedule.enabled ? "success" : "neutral"}
                        />
                      </div>
                      <div className="ai-plan__schedule-grid">
                        <article className="detail-card">
                          <span className="detail-card__label">Time</span>
                          <strong>{schedule.time}</strong>
                        </article>
                        <article className="detail-card">
                          <span className="detail-card__label">Duration</span>
                          <strong>{schedule.duration_seconds} seconds</strong>
                        </article>
                        <article className="detail-card">
                          <span className="detail-card__label">Timezone</span>
                          <strong>{schedule.timezone}</strong>
                        </article>
                        <article className="detail-card">
                          <span className="detail-card__label">Type</span>
                          <strong>Recurring</strong>
                        </article>
                      </div>
                      <div className="ai-plan__schedule-actions">
                        <button
                          type="button"
                          className="action-button action-button--danger"
                          onClick={() => {
                            void handleDeleteSchedule(schedule);
                          }}
                          disabled={isDeletingScheduleId === schedule.schedule_id}
                        >
                          {isDeletingScheduleId === schedule.schedule_id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                  {recurringTotalPages > 1 ? (
                    <div className="ai-plan__pagination">
                      <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={() => {
                          setRecurringPage((currentValue) => Math.max(1, currentValue - 1));
                        }}
                        disabled={recurringPage === 1}
                      >
                        Previous
                      </button>
                      <span className="ai-plan__pagination-label">
                        Page {recurringPage} of {recurringTotalPages}
                      </span>
                      <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={() => {
                          setRecurringPage((currentValue) =>
                            Math.min(recurringTotalPages, currentValue + 1),
                          );
                        }}
                        disabled={recurringPage === recurringTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="state-card">
                  <p>No recurring schedules yet.</p>
                  <span className="state-card__hint">
                    Create a repeating watering schedule to manage regular irrigation.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="ai-plan__tab-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">AI schedule planning</p>
              <h2>AI Weekly One-Time Schedules</h2>
              <p className="hero-copy ai-plan__copy">
                Generate a weekly watering recommendation from weather forecast
                and garden telemetry. Selected recommendations become one-time
                schedules for this week only.
              </p>
            </div>
            <StatusBadge
              label={`${oneTimeSchedules.length} one-time`}
              tone={oneTimeSchedules.length > 0 ? "success" : "neutral"}
            />
          </div>

          <div className="ai-plan__layout">
            <div className="ai-plan__controls">
              <div className="state-card">
                <span className="detail-card__label">Location</span>
                <div className="ai-plan__location-grid">
                  <label className="ai-plan__field">
                    <span>City</span>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(event) => {
                        updateLocationField("city", event.target.value);
                      }}
                    />
                  </label>
                  <label className="ai-plan__field">
                    <span>Country</span>
                    <input
                      type="text"
                      value={location.country}
                      onChange={(event) => {
                        updateLocationField("country", event.target.value);
                      }}
                    />
                  </label>
                </div>

                <div className="ai-plan__actions">
                  <button
                    type="button"
                    className="action-button action-button--primary"
                    onClick={() => {
                      void handleGeneratePlan();
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Generating..." : "Generate weekly plan"}
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--ghost"
                    onClick={() => {
                      void handleAddSelectedToOneTimeSchedules();
                    }}
                    disabled={isCreatingAiSchedules || editablePlan.length === 0}
                  >
                    {isCreatingAiSchedules
                      ? "Creating schedules..."
                      : "Add selected to one-time schedules"}
                  </button>
                </div>

                <p className="ai-plan__info">
                  AI recommendations are added as one-time schedules for this
                  specific week.
                </p>
                {locationError ? (
                  <p className="ai-plan__error">{locationError}</p>
                ) : null}
                {generateError ? (
                  <p className="ai-plan__error">{generateError}</p>
                ) : null}
              </div>

              {planResponse ? (
                <div className="state-card ai-plan__summary-card">
                  <span className="detail-card__label">Weather summary</span>
                  <div className="ai-plan__summary-grid">
                    <article className="detail-card">
                      <span className="detail-card__label">Source</span>
                      <strong>{planResponse.source}</strong>
                    </article>
                    <article className="detail-card">
                      <span className="detail-card__label">Location</span>
                      <strong>{planResponse.location}</strong>
                    </article>
                    <article className="detail-card">
                      <span className="detail-card__label">Generated</span>
                      <strong>{formatDateTime(planResponse.generated_at)}</strong>
                    </article>
                    <article className="detail-card">
                      <span className="detail-card__label">Latest soil moisture</span>
                      <strong>{planResponse.latest.soil_moisture}%</strong>
                    </article>
                  </div>
                  {planResponse.weather_summary.length > 0 ? (
                    <div className="ai-plan__weather-list">
                      {planResponse.weather_summary.map((day) => (
                        <article key={day.date} className="detail-card">
                          <span className="detail-card__label">{day.date}</span>
                          <strong>{day.condition}</strong>
                          <p className="sensor-card__helper">
                            {day.precipitation_mm} mm precipitation, {day.temperature_min}
                            {" - "}
                            {day.temperature_max} C
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="ai-plan__results">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">This Week</p>
                  <h2>This Week&apos;s Watering Plan</h2>
                </div>
                <StatusBadge
                  label={
                    selectedCount > 0
                      ? `${selectedCount} selected`
                      : "Review recommendations"
                  }
                  tone={selectedCount > 0 ? "success" : "neutral"}
                />
              </div>

              {planResponse && editablePlan.length > 0 ? (
                <div className="ai-plan__items">
                  {editablePlan.map((item, index) => {
                    const durationValue = isValidDuration(item.duration_seconds)
                      ? item.duration_seconds
                      : "";

                    return (
                      <article
                        key={`${item.date}-${item.day_label}`}
                        className="detail-card ai-plan__item"
                      >
                        <div className="ai-plan__item-header">
                          <div>
                            <span className="detail-card__label">
                              {item.day_label} · {item.date}
                            </span>
                            <strong>
                              {item.recommended ? "Recommended" : "Not recommended"}
                            </strong>
                          </div>
                          <label className="ai-plan__select">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(event) => {
                                const isSelected = event.target.checked;
                                updatePlanItem(index, {
                                  selected: isSelected,
                                  duration_seconds: isSelected
                                    ? isValidDuration(item.duration_seconds)
                                      ? item.duration_seconds
                                      : 5
                                    : item.recommended
                                      ? item.duration_seconds
                                      : 0,
                                });
                              }}
                            />
                            <span>Selected for scheduling</span>
                          </label>
                        </div>

                        <div className="ai-plan__item-grid">
                          <label className="ai-plan__field">
                            <span>Time</span>
                            <input
                              type="time"
                              value={item.time}
                              onChange={(event) => {
                                updatePlanItem(index, { time: event.target.value });
                              }}
                            />
                          </label>
                          <label className="ai-plan__field">
                            <span>Duration</span>
                            <select
                              value={durationValue}
                              onChange={(event) => {
                                updatePlanItem(index, {
                                  duration_seconds: Number(event.target.value),
                                });
                              }}
                              disabled={!item.selected}
                            >
                              <option value="" disabled>
                                Select duration
                              </option>
                              {VALID_DURATIONS.map((duration) => (
                                <option key={duration} value={duration}>
                                  {duration} seconds
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="ai-plan__meta">
                          <StatusBadge
                            label={
                              item.selected
                                ? "Will create scheduled watering command"
                                : item.recommended
                                  ? "Recommended"
                                  : "No watering"
                            }
                            tone={
                              item.selected
                                ? "success"
                                : item.recommended
                                  ? "neutral"
                                  : "warning"
                            }
                          />
                          <span className="ai-plan__duration-label">
                            {item.selected
                              ? `Duration: ${item.duration_seconds} seconds`
                              : "No watering"}
                          </span>
                        </div>

                        <p className="sensor-card__helper">{item.reason}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="state-card">
                  <p>No AI watering plan generated yet.</p>
                  <span className="state-card__hint">
                    Generate a weekly plan to review each watering recommendation
                    and add selected items to one-time schedules.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="ai-plan__created-schedules">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Cloud schedules</p>
                <h2>Active One-Time Cloud Schedules</h2>
              </div>
              <StatusBadge
                label={`${oneTimeSchedules.length} one-time`}
                tone={oneTimeSchedules.length > 0 ? "success" : "neutral"}
              />
            </div>

            {oneTimeSchedules.length > 0 ? (
              <div className="ai-plan__schedule-list">
                {oneTimeSchedules.map((schedule) => (
                  <article
                    key={schedule.schedule_id}
                    className="detail-card ai-plan__schedule-item"
                  >
                    <div className="ai-plan__schedule-header">
                      <div>
                        <span className="detail-card__label">{schedule.label}</span>
                        <strong>One-time</strong>
                      </div>
                      <StatusBadge
                        label={schedule.enabled ? "Enabled" : "Disabled"}
                        tone={schedule.enabled ? "success" : "neutral"}
                      />
                    </div>
                    <div className="ai-plan__schedule-grid">
                      <article className="detail-card">
                        <span className="detail-card__label">Date</span>
                        <strong>{schedule.date ?? "Unavailable"}</strong>
                      </article>
                      <article className="detail-card">
                        <span className="detail-card__label">Time</span>
                        <strong>{schedule.time}</strong>
                      </article>
                      <article className="detail-card">
                        <span className="detail-card__label">Duration</span>
                        <strong>{schedule.duration_seconds} seconds</strong>
                      </article>
                      <article className="detail-card">
                        <span className="detail-card__label">Timezone</span>
                        <strong>{schedule.timezone}</strong>
                      </article>
                      <article className="detail-card">
                        <span className="detail-card__label">Type</span>
                        <strong>One-time</strong>
                      </article>
                    </div>
                    <div className="ai-plan__schedule-actions">
                      <button
                        type="button"
                        className="action-button action-button--danger"
                        onClick={() => {
                          void handleDeleteSchedule(schedule);
                        }}
                        disabled={isDeletingScheduleId === schedule.schedule_id}
                      >
                        {isDeletingScheduleId === schedule.schedule_id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="state-card">
                <p>No one-time weekly schedules yet.</p>
                <span className="state-card__hint">
                  AI weekly recommendations added to the scheduler will appear here.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default WeeklyAiWateringPlan;
