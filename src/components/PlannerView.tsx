import React, { FormEvent, useEffect, useMemo, useState } from 'react';

export type PlannerRecurrence = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface PlannerEvent {
  id: string;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  color: string;
}

export interface PlannerPlan {
  id: string;
  title: string;
  description: string;
  color: string;
  events: PlannerEvent[];
  recurrence?: PlannerRecurrence;
}

export interface PlannerPlanDraft {
  id?: string;
  title: string;
  description: string;
  color: string;
}

interface PlannerViewProps {
  plans: PlannerPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
  onSaveEvent: (event: PlannerEvent) => void;
  onSavePlan: (plan: PlannerPlan) => void;
  onDeletePlan: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onMoveEvent: (eventId: string, dayOfWeek: number) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PlannerView: React.FC<PlannerViewProps> = ({
  plans,
  selectedPlanId,
  onSelectPlan,
  onSaveEvent,
  onSavePlan,
  onDeletePlan,
  onDeleteEvent,
  onMoveEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<PlannerEvent | null>(null);
  const [planSaved, setPlanSaved] = useState(false);

  const filteredPlans = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return plans;
    }

    return plans.filter((plan) => {
      const haystack = `${plan.title} ${plan.description}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [plans, searchTerm]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;

  useEffect(() => {
    setPlanSaved(false);
  }, [selectedPlan?.id]);

  const openEventEditor = (dayOfWeek = new Date().getDay(), event?: PlannerEvent) => {
    setEventDraft(event ?? {
      id: crypto.randomUUID(),
      title: '',
      dayOfWeek,
      startTime: '09:00',
      endTime: '10:00',
      color: selectedPlan?.color ?? '#039be5',
    });
  };

  const saveEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventDraft || eventDraft.endTime <= eventDraft.startTime) {
      return;
    }

    onSaveEvent({ ...eventDraft, title: eventDraft.title.trim() || 'Untitled event' });
    setEventDraft(null);
    setPlanSaved(false);
  };

  return (
    <div className="planner-shell">
      <aside className="planner-menu">
        <div className="planner-menu-header">
          <input
            type="search"
            className="planner-search"
            placeholder="Search plans"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="planner-plan-list">
          {filteredPlans.length > 0 ? (
            filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className={`planner-plan-item ${selectedPlan?.id === plan.id ? 'active' : ''}`}
                style={{ borderLeft: `4px solid ${plan.color}` }}
              >
                <button type="button" className="planner-plan-title-button" onClick={() => onSelectPlan(plan.id)}>
                  <span>{plan.title}</span>
                  <small>{plan.events.length} item{plan.events.length === 1 ? '' : 's'}</small>
                </button>
                <button
                  type="button"
                  className="planner-plan-delete"
                  onClick={() => onDeletePlan(plan.id)}
                  aria-label={`Delete ${plan.title}`}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <div className="planner-empty-plan-list">No plans match this search.</div>
          )}
        </div>
      </aside>

      <main className="planner-board">
        <div className="planner-board-header">
          <div>
            <span className="planner-label">Planner</span>
            <h2>{selectedPlan?.title ?? 'No plan selected'}</h2>
          </div>
          <div className="planner-board-actions">
            <button type="button" className="outline-btn" onClick={() => openEventEditor()} disabled={!selectedPlan}>
              + Event
            </button>
            {selectedPlan && (
              <button
                type="button"
                className={`save-plan-btn${planSaved ? ' saved' : ''}`}
                onClick={() => {
                  onSavePlan(selectedPlan);
                  setPlanSaved(true);
                }}
                aria-label="Save plan"
                title="Save plan"
              >
                <span aria-hidden="true">{planSaved ? '✓' : '▣'}</span>
                {planSaved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {selectedPlan ? (
          <div className="planner-week-grid">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const dayEvents = selectedPlan.events
                .filter((event) => event.dayOfWeek === dayIndex)
                .sort((first, second) => first.startTime.localeCompare(second.startTime));

              return (
                <div
                  key={dayName}
                  className="planner-day-column"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedEventId) {
                      onMoveEvent(draggedEventId, dayIndex);
                      setDraggedEventId(null);
                      setPlanSaved(false);
                    }
                  }}
                >
                  <div className="planner-day-header">
                    <span>{dayName}</span>
                    <button
                      type="button"
                      className="planner-add-day-event"
                      onClick={() => openEventEditor(dayIndex)}
                      aria-label={`Add event on ${dayName}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="planner-day-content">
                    {dayEvents.map((event) => (
                      <article
                        key={event.id}
                        className="planner-event-card"
                        draggable
                        onDragStart={() => setDraggedEventId(event.id)}
                        onDragEnd={() => setDraggedEventId(null)}
                        onClick={() => openEventEditor(dayIndex, event)}
                        style={{ borderLeftColor: event.color }}
                      >
                        <div className="planner-event-head">
                          <strong>{event.title}</strong>
                          <button
                            type="button"
                            className="planner-event-delete"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              onDeleteEvent(event.id);
                              setPlanSaved(false);
                            }}
                            aria-label={`Delete ${event.title}`}
                          >
                            ×
                          </button>
                        </div>
                        <span className="planner-event-time">{event.startTime} – {event.endTime}</span>
                      </article>
                    ))}
                    <button type="button" className="planner-empty-slot" onClick={() => openEventEditor(dayIndex)}>
                      + Add event
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="planner-empty-state">
            <p>Select a plan or use Create in the sidebar to start planning.</p>
          </div>
        )}
      </main>

      {eventDraft && selectedPlan && (
        <div className="planner-event-backdrop" onClick={() => setEventDraft(null)}>
          <form className="planner-event-editor" onSubmit={saveEvent} onClick={(event) => event.stopPropagation()}>
            <div className="planner-event-editor-header">
              <h3>{selectedPlan.events.some((event) => event.id === eventDraft.id) ? 'Edit event' : 'Create event'}</h3>
              <button type="button" onClick={() => setEventDraft(null)} aria-label="Close event editor">×</button>
            </div>
            <label>
              <span>Title</span>
              <input
                autoFocus
                value={eventDraft.title}
                onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })}
                placeholder="Event title"
              />
            </label>
            <label>
              <span>Day</span>
              <select
                value={eventDraft.dayOfWeek}
                onChange={(event) => setEventDraft({ ...eventDraft, dayOfWeek: Number(event.target.value) })}
              >
                {DAY_NAMES.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
            <div className="planner-event-time-fields">
              <label>
                <span>Start</span>
                <input
                  type="time"
                  value={eventDraft.startTime}
                  onChange={(event) => setEventDraft({ ...eventDraft, startTime: event.target.value })}
                />
              </label>
              <label>
                <span>End</span>
                <input
                  type="time"
                  value={eventDraft.endTime}
                  onChange={(event) => setEventDraft({ ...eventDraft, endTime: event.target.value })}
                />
              </label>
            </div>
            {eventDraft.endTime <= eventDraft.startTime && (
              <p className="planner-event-error">End time must be after start time.</p>
            )}
            <label className="planner-event-color-field">
              <span>Color</span>
              <input
                type="color"
                value={eventDraft.color}
                onChange={(event) => setEventDraft({ ...eventDraft, color: event.target.value })}
              />
            </label>
            <div className="planner-event-editor-actions">
              <button type="button" className="outline-btn" onClick={() => setEventDraft(null)}>Cancel</button>
              <button type="submit" className="create-btn" disabled={eventDraft.endTime <= eventDraft.startTime}>Save event</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PlannerView;
