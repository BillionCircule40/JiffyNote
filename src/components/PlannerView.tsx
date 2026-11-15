import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { formatHour, startOfWeek } from '../calendar/dateUtils';

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
  currentDate: Date;
  onSelectPlan: (id: string) => void;
  onSaveEvent: (event: PlannerEvent) => void;
  onSavePlan: (plan: PlannerPlan) => void;
  onJoinPlan: (plan: PlannerPlan, weekDate: Date) => void;
  onDeletePlan: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onMoveEvent: (eventId: string, dayOfWeek: number) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const toDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getEventMinutes = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const PlannerView: React.FC<PlannerViewProps> = ({
  plans,
  selectedPlanId,
  currentDate,
  onSelectPlan,
  onSaveEvent,
  onSavePlan,
  onJoinPlan,
  onDeletePlan,
  onDeleteEvent,
  onMoveEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState<PlannerEvent | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannerPlan | null>(null);
  const [joinWeekDate, setJoinWeekDate] = useState('');
  const [joinMenuOpen, setJoinMenuOpen] = useState(false);
  const timeGridBodyRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (timeGridBodyRef.current) {
      timeGridBodyRef.current.scrollTop = HOUR_HEIGHT * 8;
    }
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

  const openNewEventAtSlot = (dayOfWeek: number, click: React.MouseEvent<HTMLDivElement>) => {
    const column = click.currentTarget;
    const minutesFromMidnight = Math.max(0, (click.clientY - column.getBoundingClientRect().top) / HOUR_HEIGHT * 60);
    const snappedStart = Math.min(22 * 60 + 30, Math.floor(minutesFromMidnight / 30) * 30);
    const startHour = String(Math.floor(snappedStart / 60)).padStart(2, '0');
    const startMinute = String(snappedStart % 60).padStart(2, '0');
    const endMinutes = snappedStart + 60;
    const endHour = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endMinute = String(endMinutes % 60).padStart(2, '0');
    openEventEditor(dayOfWeek, {
      id: crypto.randomUUID(),
      title: '',
      dayOfWeek,
      startTime: `${startHour}:${startMinute}`,
      endTime: `${endHour}:${endMinute}`,
      color: selectedPlan?.color ?? '#039be5',
    });
  };

  const openJoinMenu = () => {
    setJoinWeekDate(toDateInput(startOfWeek(currentDate)));
    setJoinMenuOpen(true);
  };

  const submitJoinPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlan || !joinWeekDate) {
      return;
    }
    const [year = 0, month = 1, day = 1] = joinWeekDate.split('-').map(Number);
    onJoinPlan(selectedPlan, new Date(year, month - 1, day));
    setJoinMenuOpen(false);
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
                <button
                  type="button"
                  className="planner-plan-title-button"
                  onClick={() => {
                    onSelectPlan(plan.id);
                    setEditingPlan({ ...plan, events: Array.isArray(plan.events) ? plan.events : [] });
                  }}
                >
                  <span className="planner-plan-name">{plan.title}</span>
                  <span className="planner-plan-description">{plan.description || 'No description'}</span>
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
            <button type="button" className="outline-btn" onClick={openJoinMenu} disabled={!selectedPlan}>
              Join
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
          <div className="planner-week-grid" ref={timeGridBodyRef}>
            <div className="planner-time-grid-header">
              <div className="planner-time-gutter" />
              {DAY_NAMES.map((dayName, dayIndex) => (
                <div className="planner-day-header" key={dayName}>
                  <span>{dayName}</span>
                  <button type="button" className="planner-add-day-event" onClick={() => openEventEditor(dayIndex)} aria-label={`Add event on ${dayName}`}>+</button>
                </div>
              ))}
            </div>
            <div className="planner-time-grid-body">
              <div className="planner-time-gutter">
                {HOURS.map((hour) => (
                  <div className="planner-hour-label" key={hour} style={{ height: HOUR_HEIGHT }}>
                    <span>{formatHour(hour)}</span>
                  </div>
                ))}
              </div>
              {DAY_NAMES.map((dayName, dayIndex) => {
                const dayEvents = (Array.isArray(selectedPlan.events) ? selectedPlan.events : [])
                  .filter((event) => event.dayOfWeek === dayIndex)
                  .sort((first, second) => first.startTime.localeCompare(second.startTime));

                return (
                  <div
                    key={dayName}
                    className="planner-day-column"
                    style={{ height: HOUR_HEIGHT * 24 }}
                    onClick={(click) => openNewEventAtSlot(dayIndex, click)}
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
                    {HOURS.map((hour) => (
                      <div className="planner-hour-cell" key={hour} style={{ height: HOUR_HEIGHT }} />
                    ))}
                    {dayEvents.map((event) => {
                      const startMinutes = getEventMinutes(event.startTime);
                      const duration = Math.max(15, getEventMinutes(event.endTime) - startMinutes);
                      return (
                        <article
                          key={event.id}
                          className="planner-event-card"
                          draggable
                          onDragStart={(drag) => {
                            drag.stopPropagation();
                            setDraggedEventId(event.id);
                          }}
                          onDragEnd={() => setDraggedEventId(null)}
                          onClick={(click) => {
                            click.stopPropagation();
                            openEventEditor(dayIndex, event);
                          }}
                          style={{
                            top: (startMinutes / 60) * HOUR_HEIGHT + 2,
                            height: Math.max(20, (duration / 60) * HOUR_HEIGHT - 4),
                            borderLeftColor: event.color,
                          }}
                        >
                          <div className="planner-event-head">
                            <strong>{event.title}</strong>
                            <button
                              type="button"
                              className="planner-event-delete"
                              onClick={(click) => {
                                click.stopPropagation();
                                onDeleteEvent(event.id);
                                setPlanSaved(false);
                              }}
                              aria-label={`Delete ${event.title}`}
                            >×</button>
                          </div>
                          <span className="planner-event-time">{event.startTime} – {event.endTime}</span>
                        </article>
                      );
                    })}
                  </div>
                );
              })}
            </div>
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
              <h3>{(Array.isArray(selectedPlan.events) ? selectedPlan.events : []).some((event) => event.id === eventDraft.id) ? 'Edit event' : 'Create event'}</h3>
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

      {editingPlan && (
        <div className="planner-event-backdrop" onClick={() => setEditingPlan(null)}>
          <form
            className="planner-event-editor planner-plan-editor"
            onSubmit={(event) => {
              event.preventDefault();
              onSavePlan(editingPlan);
              setEditingPlan(null);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="planner-event-editor-header">
              <h3>Plan details</h3>
              <button type="button" onClick={() => setEditingPlan(null)} aria-label="Close plan details">×</button>
            </div>
            <label>
              <span>Plan name</span>
              <input
                autoFocus
                value={editingPlan.title}
                onChange={(event) => setEditingPlan({ ...editingPlan, title: event.target.value })}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={4}
                value={editingPlan.description}
                onChange={(event) => setEditingPlan({ ...editingPlan, description: event.target.value })}
              />
            </label>
            <div className="planner-event-editor-actions planner-plan-editor-actions">
              <button type="button" className="outline-btn" onClick={() => setEditingPlan(null)}>Cancel</button>
              <button type="button" className="outline-btn" onClick={() => setEditingPlan(null)}>View plan</button>
              <button type="submit" className="create-btn">Save</button>
            </div>
          </form>
        </div>
      )}

      {joinMenuOpen && selectedPlan && (
        <div className="planner-event-backdrop" onClick={() => setJoinMenuOpen(false)}>
          <form className="planner-event-editor" onSubmit={submitJoinPlan} onClick={(event) => event.stopPropagation()}>
            <div className="planner-event-editor-header">
              <h3>Join plan to calendar</h3>
              <button type="button" onClick={() => setJoinMenuOpen(false)} aria-label="Close join menu">×</button>
            </div>
            <p className="planner-join-description">
              Add {Array.isArray(selectedPlan.events) ? selectedPlan.events.length : 0} plan events to one calendar week. The planner plan will remain unchanged.
            </p>
            <label>
              <span>Choose a date in the target week</span>
              <input
                type="date"
                required
                value={joinWeekDate}
                onChange={(event) => setJoinWeekDate(event.target.value)}
              />
            </label>
            <div className="planner-event-editor-actions">
              <button type="button" className="outline-btn" onClick={() => setJoinMenuOpen(false)}>Cancel</button>
              <button type="submit" className="create-btn" disabled={!Array.isArray(selectedPlan.events) || selectedPlan.events.length === 0}>Join week</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PlannerView;
