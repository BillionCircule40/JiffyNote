import React, { useEffect, useState } from 'react';
import Header from './calendar/Header';
import Sidebar from './calendar/Sidebar';
import TimeGridView from './calendar/TimeGridView';
import MonthView from './calendar/MonthView';
import YearView from './calendar/YearView';
import EventModal from './calendar/EventModal';
import NotesView from './components/NotesView';
import NoteEditor from './components/NoteEditor';
import PlannerView, { type PlannerEvent, type PlannerPlan, type PlannerPlanDraft } from './components/PlannerView';
import AuthPage from './pages/AuthPage';
import SettingsPage from './pages/SettingsPage';
import { CalendarEvent, EventDraft, EVENT_COLORS, ViewMode } from './calendar/types';
import { addDays, addMonths, startOfWeek } from './calendar/dateUtils';
import { ThemeProvider } from './context/ThemeContext';
import authService, { User } from './services/authService';
import { getDefaultRepeatSettings, resetPrioritySelection } from './services/eventService';

const STORAGE_KEY = 'jiffynote.events';
const NOTES_STORAGE_KEY = 'jiffynote.notes';
const PLANNER_STORAGE_KEY = 'jiffynote.plans';

// Events live in the browser for now; swap these two for DataBaseQueries later.
function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
    return parsed.map((event) => ({
      ...event,
      priority: typeof event.priority === 'number' ? event.priority : 5,
    }));
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // storage unavailable (private mode etc.) - events stay in memory only
  }
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  section: 'now' | 'later' | 'todo' | 'general';
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Note[]) : [];
    // Ensure all notes have section property (default to 'general')
    return parsed.map(note => ({
      ...note,
      section: note.section || 'general'
    }));
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // storage unavailable (private mode etc.) - notes stay in memory only
  }
}

function loadPlans(): PlannerPlan[] {
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlannerPlan[]) : [];
  } catch {
    return [];
  }
}

function savePlans(plans: PlannerPlan[]): void {
  try {
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // storage unavailable (private mode etc.) - plans stay in memory only
  }
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [plans, setPlans] = useState<PlannerPlan[]>(loadPlans);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ id?: string; title: string; content: string; date: string; section: 'now' | 'later' | 'todo' | 'general' } | null>(null);
  const [plannerDraft, setPlannerDraft] = useState<PlannerPlanDraft | null>(null);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'notes' | 'planner'>('calendar');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [priorityRange, setPriorityRange] = useState<number[]>(resetPrioritySelection());

  useEffect(() => {
    const savedUser = authService.getCurrentUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveNotes(notes), [notes]);
  useEffect(() => savePlans(plans), [plans]);

  useEffect(() => {
    if (!plans.length) {
      setSelectedPlannerId(null);
      return;
    }

    const nextPlan = plans.find((plan) => plan.id === selectedPlannerId);
    if (!selectedPlannerId || !nextPlan) {
      const firstPlan = plans[0];
      if (firstPlan) {
        setSelectedPlannerId(firstPlan.id);
      }
    }
  }, [plans, selectedPlannerId]);

  const handleAuthenticated = (user: User) => {
    setCurrentUser(user);
    setSettingsOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setSettingsOpen(false);
  };

  // Drag and drop handlers for events
  const handleEventDragStart = (eventId: string) => {
    setDraggedEventId(eventId);
  };

  const handleEventDrop = (e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();
    if (draggedEventId) {
      const event = events.find(ev => ev.id === draggedEventId);
      if (event) {
        const originalStart = new Date(event.start);
        const originalEnd = new Date(event.end);
        
        // Calculate time difference
        const newStart = new Date(targetDate);
        newStart.setHours(targetHour, originalStart.getMinutes(), 0, 0);
        
        // Calculate duration in minutes
        const durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / 60000;
        
        // Calculate new end time maintaining duration
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
        
        // Update event with new time
        const updatedEvent = {
          ...event,
          start: newStart.toISOString(),
          end: newEnd.toISOString()
        };
        
        setEvents(prev => prev.map(ev => ev.id === draggedEventId ? updatedEvent : ev));
      }
      setDraggedEventId(null);
    }
  };

  const handleEventHorizontalDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedEventId) {
      const event = events.find(ev => ev.id === draggedEventId);
      if (event) {
        const originalStart = new Date(event.start);
        const originalEnd = new Date(event.end);
        
        // Get the time from the original event
        const hours = originalStart.getHours();
        const minutes = originalStart.getMinutes();
        
        // Create new dates with the target date but same time
        const newStart = new Date(targetDate);
        newStart.setHours(hours, minutes, 0, 0);
        
        const newEnd = new Date(newStart.getTime() + (originalEnd.getTime() - originalStart.getTime()));
        
        // Update event with new date
        const updatedEvent = {
          ...event,
          start: newStart.toISOString(),
          end: newEnd.toISOString()
        };
        
        setEvents(prev => prev.map(ev => ev.id === draggedEventId ? updatedEvent : ev));
      }
      setDraggedEventId(null);
    }
  };

  const navigate = (direction: -1 | 1) => {
    if (view === 'year') setCurrentDate(addMonths(currentDate, direction * 12));
    else if (view === 'month') setCurrentDate(addMonths(currentDate, direction));
    else setCurrentDate(addDays(currentDate, direction * (view === 'week' ? 7 : 1)));
  };

  const openNewEvent = (start: Date) => {
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({
      title: '',
      start,
      end,
      color: EVENT_COLORS[0] ?? '#039be5',
      priority: 5,
      repeat: getDefaultRepeatSettings(),
      noteIds: [],
    });
  };

  const openExistingEvent = (event: CalendarEvent) => {
    setDraft({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      color: event.color,
      priority: typeof event.priority === 'number' ? event.priority : 5,
      repeat: event.repeat ?? getDefaultRepeatSettings(),
      noteIds: event.noteIds ?? [],
    });
  };

  const saveDraft = (d: EventDraft) => {
    const saved: CalendarEvent = {
      id: d.id ?? crypto.randomUUID(),
      title: d.title.trim() || '(No title)',
      start: d.start.toISOString(),
      end: d.end.toISOString(),
      color: d.color,
      priority: d.priority ?? 5,
      repeat: d.repeat ?? getDefaultRepeatSettings(),
      noteIds: d.noteIds ?? [],
    };
    setEvents((prev) => [...prev.filter((e) => e.id !== saved.id), saved]);
    setDraft(null);
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDraft(null);
  };

  const quickCreate = () => {
    const start = new Date(currentDate);
    start.setHours(new Date().getHours() + 1, 0, 0, 0);
    openNewEvent(start);
  };

  const addNote = (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      section: note.section || 'general' // Default to provided section or 'general'
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
      )
    );
  };

  const moveNoteToSection = (noteId: string, newSection: 'now' | 'later' | 'todo' | 'general') => {
    updateNote(noteId, { section: newSection });
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const quickCreateNote = () => {
    setNoteDraft({
      title: '',
      content: '',
      date: new Date().toISOString().slice(0, 16),
      section: 'general' // Default section
    });
  };

  const openNoteEditor = (note?: Note) => {
    if (note) {
      setNoteDraft({
        id: note.id,
        title: note.title,
        content: note.content,
        date: note.updated_at.slice(0, 16),
        section: note.section
      });
    } else {
      setNoteDraft({
        title: '',
        content: '',
        date: new Date().toISOString().slice(0, 16),
        section: 'general'
      });
    }
  };

  const saveNoteDraft = (draftData: { id?: string; title: string; content: string; date: string; section: 'now' | 'later' | 'todo' | 'general' }) => {
    if (draftData.id) {
      // Update existing note
      updateNote(draftData.id, {
        title: draftData.title.trim() || '(No title)',
        content: draftData.content,
        section: draftData.section,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Create new note
      addNote({
        title: draftData.title.trim() || '(No title)',
        content: draftData.content,
        section: draftData.section
      });
    }
    setNoteDraft(null);
  };

  const deleteNoteDraft = (id: string) => {
    deleteNote(id);
    setNoteDraft(null);
  };

  const openNewPlan = () => {
    setPlannerDraft({
      title: '',
      description: '',
      color: EVENT_COLORS[0] ?? '#039be5',
    });
  };

  const savePlannerEvent = (event: PlannerEvent) => {
    if (!selectedPlannerId) {
      return;
    }

    setPlans((prev) =>
      prev.map((item) =>
        item.id === selectedPlannerId
          ? {
              ...item,
              events: [
                ...item.events.filter((existing) => existing.id !== event.id),
                event,
              ],
            }
          : item
      )
    );
  };

  const movePlannerEvent = (eventId: string, dayOfWeek: number) => {
    if (!selectedPlannerId) {
      return;
    }

    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== selectedPlannerId) {
          return plan;
        }

        return {
          ...plan,
          events: plan.events.map((event) =>
            event.id === eventId ? { ...event, dayOfWeek } : event
          ),
        };
      })
    );
  };

  const savePlannerDraft = (draftPlan: PlannerPlanDraft) => {
    const nextPlan: PlannerPlan = {
      id: draftPlan.id ?? crypto.randomUUID(),
      title: draftPlan.title.trim() || 'Untitled Plan',
      description: draftPlan.description.trim(),
      color: draftPlan.color,
      events: plans.find((plan) => plan.id === draftPlan.id)?.events ?? [],
    };

    setPlans((prev) => {
      const existing = prev.filter((plan) => plan.id !== nextPlan.id);
      return [...existing, nextPlan];
    });
    setSelectedPlannerId(nextPlan.id);
    setPlannerDraft(null);
  };

  const deletePlannerPlan = (id: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== id));
    if (selectedPlannerId === id) {
      setSelectedPlannerId(null);
    }
    setPlannerDraft(null);
  };

  const deletePlannerEvent = (id: string) => {
    if (!selectedPlannerId) {
      return;
    }

    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === selectedPlannerId
          ? { ...plan, events: plan.events.filter((event) => event.id !== id) }
          : plan
      )
    );
  };

  // Drag and drop handlers for notes
  const handleDragStart = (noteId: string) => {
    setDraggedNoteId(noteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, sectionId: 'now' | 'later' | 'todo' | 'general') => {
    e.preventDefault();
    if (draggedNoteId) {
      moveNoteToSection(draggedNoteId, sectionId);
      setDraggedNoteId(null);
    }
  };

  const handleToggleAccountMenu = () => {
    // Handle account menu toggle logic here
    console.log('Account menu toggled');
  };

  const visibleDays =
    view === 'day'
      ? [currentDate]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));

  const visibleEvents = events.filter((event) => {
    const priority = typeof event.priority === 'number' ? event.priority : 5;
    return priorityRange.includes(priority);
  });

  if (!currentUser) {
    return (
      <ThemeProvider>
        <AuthPage onAuthenticated={handleAuthenticated} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="app">
        <Header
          currentDate={currentDate}
          view={view}
          onToday={() => setCurrentDate(new Date())}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onViewChange={setView}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onToggleAccountMenu={handleToggleAccountMenu}
          priorityRange={priorityRange}
          onPriorityRangeChange={setPriorityRange}
          currentUser={currentUser}
          onOpenSettings={() => setSettingsOpen(true)}
          onLogout={handleLogout}
        />
        <div className="app-body">
          {sidebarOpen && (
            <Sidebar
              selectedDate={currentDate}
              onSelectDate={setCurrentDate}
              onCreateEvent={quickCreate}
              onCreateNote={quickCreateNote}
              onCreatePlanner={openNewPlan}
              onTabChange={setActiveTab}
              activeTab={activeTab}
            />
          )}
          {activeTab === 'notes' ? (
            <NotesView 
              notes={notes} 
              onCreateNote={quickCreateNote} 
              onEditNote={(id) => {
                const note = notes.find(n => n.id === id);
                openNoteEditor(note);
              }} 
              onDeleteNote={deleteNote}
              onAttachNote={(noteId) => {
                if (!draft) {
                  return;
                }

                setDraft((current) => current ? {
                  ...current,
                  noteIds: [...new Set([...(current.noteIds ?? []), noteId])],
                } : current);
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ) : activeTab === 'planner' ? (
            <PlannerView
              plans={plans}
              selectedPlanId={selectedPlannerId}
              onSelectPlan={setSelectedPlannerId}
              onSaveEvent={savePlannerEvent}
              onSavePlan={() => savePlans(plans)}
              onDeletePlan={deletePlannerPlan}
              onDeleteEvent={deletePlannerEvent}
              onMoveEvent={movePlannerEvent}
            />
          ) : (
            <main className="calendar-main">
              {view === 'year' ? (
                <YearView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onMonthClick={(month: Date) => {
                    setCurrentDate(month);
                    setView('month');
                  }}
                  onDayClick={(day: Date) => {
                    setCurrentDate(day);
                    setView('day');
                  }}
                />
              ) : view === 'month' ? (
                <MonthView
                  currentDate={currentDate}
                  events={visibleEvents}
                  onDayClick={(day) => {
                    setCurrentDate(day);
                    setView('day');
                  }}
                  onEventClick={openExistingEvent}
                />
              ) : (
                <TimeGridView
                  days={visibleDays}
                  events={visibleEvents}
                  onSlotClick={openNewEvent}
                  onEventClick={openExistingEvent}
                  onEventDragStart={handleEventDragStart}
                  onEventDrop={handleEventDrop}
                  onEventHorizontalDrop={handleEventHorizontalDrop}
                />
              )}
            </main>
          )}
        </div>
        {draft && (
          <EventModal
            draft={draft}
            availableNotes={notes}
            onSave={saveDraft}
            onDelete={deleteEvent}
            onClose={() => setDraft(null)}
          />
        )}
        {noteDraft && (
          <NoteEditor
            note={noteDraft}
            onSave={saveNoteDraft}
            onDelete={deleteNoteDraft}
            onClose={() => setNoteDraft(null)}
          />
        )}
        {settingsOpen && (
          <SettingsPage
            currentUser={currentUser}
            onClose={() => setSettingsOpen(false)}
            onLogout={handleLogout}
          />
        )}
        {plannerDraft && (
          <div className="planner-modal-backdrop" onClick={() => setPlannerDraft(null)}>
            <div className="planner-modal" onClick={(event) => event.stopPropagation()}>
              <div className="planner-modal-header">
                <h2>{plannerDraft.id ? 'Edit plan' : 'Create plan'}</h2>
                <button type="button" className="planner-close-btn" onClick={() => setPlannerDraft(null)}>
                  ×
                </button>
              </div>

              <div className="planner-form-grid">
                <label>
                  <span>Title</span>
                  <input
                    value={plannerDraft.title}
                    onChange={(event) => setPlannerDraft({ ...plannerDraft, title: event.target.value })}
                  />
                </label>

                <label>
                  <span>Color</span>
                  <input
                    type="color"
                    value={plannerDraft.color}
                    onChange={(event) => setPlannerDraft({ ...plannerDraft, color: event.target.value })}
                  />
                </label>

                <label className="planner-full-width">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={plannerDraft.description}
                    onChange={(event) => setPlannerDraft({ ...plannerDraft, description: event.target.value })}
                  />
                </label>
              </div>

              <div className="planner-actions-row">
                <div className="planner-modal-buttons">
                  {plannerDraft.id && (
                    <button
                      type="button"
                      className="planner-delete-btn"
                      onClick={() => deletePlannerPlan(plannerDraft.id!)}
                    >
                      Delete
                    </button>
                  )}
                  <button type="button" className="outline-btn" onClick={() => setPlannerDraft(null)}>
                    Cancel
                  </button>
                  <button type="button" className="create-btn" onClick={() => savePlannerDraft(plannerDraft)}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
