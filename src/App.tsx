import React, { useEffect, useState } from 'react';
import Header from './calendar/Header';
import Sidebar from './calendar/Sidebar';
import TimeGridView from './calendar/TimeGridView';
import MonthView from './calendar/MonthView';
import EventModal from './calendar/EventModal';
import NotesView from './components/NotesView';
import { CalendarEvent, EventDraft, EVENT_COLORS, ViewMode } from './calendar/types';
import { addDays, addMonths, startOfWeek } from './calendar/dateUtils';
import { ThemeProvider } from './context/ThemeContext';

const STORAGE_KEY = 'jiffynote.events';
const NOTES_STORAGE_KEY = 'jiffynote.notes';

// Events live in the browser for now; swap these two for DataBaseQueries later.
function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
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
  //is_reminder: boolean;
  //reminder_type: 'now' | 'later' | 'todo';
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
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

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'notes'>('calendar');

  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveNotes(notes), [notes]);

  const navigate = (direction: -1 | 1) => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, direction));
    else setCurrentDate(addDays(currentDate, direction * (view === 'week' ? 7 : 1)));
  };

  const openNewEvent = (start: Date) => {
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setDraft({ title: '', start, end, color: EVENT_COLORS[0] ?? '#039be5' });
  };

  const openExistingEvent = (event: CalendarEvent) => {
    setDraft({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      color: event.color,
    });
  };

  const saveDraft = (d: EventDraft) => {
    const saved: CalendarEvent = {
      id: d.id ?? crypto.randomUUID(),
      title: d.title.trim() || '(No title)',
      start: d.start.toISOString(),
      end: d.end.toISOString(),
      color: d.color,
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

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const quickCreateNote = () => {
    const newNote: Omit<Note, 'id' | 'created_at' | 'updated_at'> = {
      title: '',
      content: '',
      //date: new Date().toISOString(),
      //has_reminder: false,
      //reminder_type: null,
      //reminder_time: null,
    };
    addNote(newNote);
  };

  const handleToggleAccountMenu = () => {
    // Handle account menu toggle logic here
    console.log('Account menu toggled');
  };

  const visibleDays =
    view === 'day'
      ? [currentDate]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));

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
        />
        <div className="app-body">
          {sidebarOpen && (
            <Sidebar
              selectedDate={currentDate}
              onSelectDate={setCurrentDate}
              onCreateEvent={quickCreate}
              onCreateNote={quickCreateNote}
              onTabChange={setActiveTab}
              activeTab={activeTab}
            />
          )}
          {activeTab === 'notes' ? (
            <NotesView notes={notes} onAddNote={addNote} onUpdateNote={updateNote} onDeleteNote={deleteNote} />
          ) : (
            <main className="calendar-main">
              {view === 'month' ? (
                <MonthView
                  currentDate={currentDate}
                  events={events}
                  onDayClick={(day) => {
                    const start = new Date(day);
                    start.setHours(9, 0, 0, 0);
                    openNewEvent(start);
                  }}
                  onEventClick={openExistingEvent}
                />
              ) : (
                <TimeGridView
                  days={visibleDays}
                  events={events}
                  onSlotClick={openNewEvent}
                  onEventClick={openExistingEvent}
                />
              )}
            </main>
          )}
        </div>
        {draft && (
          <EventModal
            draft={draft}
            onSave={saveDraft}
            onDelete={deleteEvent}
            onClose={() => setDraft(null)}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
