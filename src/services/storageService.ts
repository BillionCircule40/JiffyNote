import databaseService, { CalendarEvent as DBCalendarEvent, EventDraft as DBEventDraft } from './databaseService';
import { CalendarEvent, EventDraft } from '../calendar/types';
import { Note, NoteDraft } from './noteTypes';

// Storage service that can work with both localStorage and PostgreSQL
class StorageService {
  private useDatabase: boolean = false;

  constructor() {
    // Check if database configuration is available AND we're not in a browser environment
    const isBrowser = typeof window !== 'undefined';
    const host = process.env.POSTGRES_HOST;
    this.useDatabase = !isBrowser && !!host && host !== 'localhost';
  }

  // ==================== EVENT OPERATIONS ====================

  // Convert DB CalendarEvent to App CalendarEvent
  private convertDBEventToApp(dbEvent: DBCalendarEvent): CalendarEvent {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      start: dbEvent.start_time,
      end: dbEvent.end_time,
      color: dbEvent.color
    };
  }

  // Convert App EventDraft to DB EventDraft
  private convertAppEventToDB(appEvent: EventDraft): DBEventDraft {
    return {
      title: appEvent.title,
      start_time: appEvent.start.toISOString(),
      end_time: appEvent.end.toISOString(),
      color: appEvent.color
    };
  }

  // Convert Partial<App EventDraft> to Partial<DB EventDraft>
  private convertPartialAppEventToDB(event: Partial<EventDraft>): Partial<DBEventDraft> {
    const result: Partial<DBEventDraft> = {};
    if (event.title !== undefined) result.title = event.title;
    if (event.start !== undefined) result.start_time = event.start.toISOString();
    if (event.end !== undefined) result.end_time = event.end.toISOString();
    if (event.color !== undefined) result.color = event.color;
    return result;
  }

  // Get all events
  async getEvents(userId?: string): Promise<CalendarEvent[]> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        const dbEvents = await databaseService.getEventsByUserId(userId);
        return dbEvents.map(event => this.convertDBEventToApp(event));
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.getEventsFromLocalStorage();
      }
    }
    return this.getEventsFromLocalStorage();
  }

  // Get event by ID
  async getEventById(eventId: string, userId?: string): Promise<CalendarEvent | null> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        const dbEvent = await databaseService.getEventById(eventId, userId);
        return dbEvent ? this.convertDBEventToApp(dbEvent) : null;
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.getEventByIdFromLocalStorage(eventId);
      }
    }
    return this.getEventByIdFromLocalStorage(eventId);
  }

  // Create event
  async createEvent(event: EventDraft, userId?: string): Promise<CalendarEvent> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        const dbEvent = await databaseService.createEvent(this.convertAppEventToDB(event), userId);
        return this.convertDBEventToApp(dbEvent);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.createEventInLocalStorage(event);
      }
    }
    return this.createEventInLocalStorage(event);
  }

  // Update event
  async updateEvent(eventId: string, event: Partial<EventDraft>, userId?: string): Promise<CalendarEvent | null> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        const dbResult = await databaseService.updateEvent(eventId, this.convertPartialAppEventToDB(event));
        return dbResult ? this.convertDBEventToApp(dbResult) : null;
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.updateEventInLocalStorage(eventId, event);
      }
    }
    return this.updateEventInLocalStorage(eventId, event);
  }

  // Delete event
  async deleteEvent(eventId: string, userId?: string): Promise<boolean> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        return await databaseService.deleteEvent(eventId);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.deleteEventFromLocalStorage(eventId);
      }
    }
    return this.deleteEventFromLocalStorage(eventId);
  }

  // ==================== NOTE OPERATIONS ====================

  // Get all notes
  async getNotes(userId?: string): Promise<Note[]> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        return await databaseService.getNotesByUserId(userId);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.getNotesFromLocalStorage();
      }
    }
    return this.getNotesFromLocalStorage();
  }

  // Get note by ID
  async getNoteById(noteId: string, userId?: string): Promise<Note | null> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        return await databaseService.getNoteById(noteId, userId);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.getNoteByIdFromLocalStorage(noteId);
      }
    }
    return this.getNoteByIdFromLocalStorage(noteId);
  }

  // Create note
  async createNote(note: NoteDraft, userId?: string): Promise<Note> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        return await databaseService.createNote(note, userId);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.createNoteInLocalStorage(note);
      }
    }
    return this.createNoteInLocalStorage(note);
  }

  // Update note
  async updateNote(noteId: string, note: Partial<NoteDraft>, userId?: string): Promise<Note | null> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        return await databaseService.updateNote(noteId, note);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.updateNoteInLocalStorage(noteId, note);
      }
    }
    return this.updateNoteInLocalStorage(noteId, note);
  }

  // Delete note
  async deleteNote(noteId: string, userId?: string): Promise<boolean> {
    if (this.useDatabase && userId) {
      try {
        await databaseService.connect();
        return await databaseService.deleteNote(noteId);
      } catch (error) {
        console.error('Database error, falling back to localStorage:', error);
        return this.deleteNoteFromLocalStorage(noteId);
      }
    }
    return this.deleteNoteFromLocalStorage(noteId);
  }

  // ==================== LOCAL STORAGE OPERATIONS ====================

  private getEventsFromLocalStorage(): CalendarEvent[] {
    try {
      const raw = localStorage.getItem('jiffynote.events');
      return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
    } catch {
      return [];
    }
  }

  private getEventByIdFromLocalStorage(eventId: string): CalendarEvent | null {
    const events = this.getEventsFromLocalStorage();
    return events.find(e => e.id === eventId) ?? null;
  }

  private createEventInLocalStorage(event: EventDraft): CalendarEvent {
    const events = this.getEventsFromLocalStorage();
    const newEvent: CalendarEvent = {
      id: event.id ?? crypto.randomUUID(),
      title: event.title.trim() || '(No title)',
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      color: event.color
    };
    localStorage.setItem('jiffynote.events', JSON.stringify([...events, newEvent]));
    return newEvent;
  }

  private updateEventInLocalStorage(eventId: string, event: Partial<EventDraft>): CalendarEvent | null {
    const events = this.getEventsFromLocalStorage();
    const index = events.findIndex(e => e.id === eventId);
    if (index === -1) return null;

    const eventAtPosition = events[index];
    if (!eventAtPosition) return null;

    const updatedEvent: CalendarEvent = {
      id: eventAtPosition.id,
      title: event.title ?? eventAtPosition.title,
      start: event.start ? event.start.toISOString() : eventAtPosition.start,
      end: event.end ? event.end.toISOString() : eventAtPosition.end,
      color: event.color ?? eventAtPosition.color
    };

    events[index] = updatedEvent;
    localStorage.setItem('jiffynote.events', JSON.stringify(events));
    return updatedEvent;
  }

  private deleteEventFromLocalStorage(eventId: string): boolean {
    const events = this.getEventsFromLocalStorage();
    const filtered = events.filter(e => e.id !== eventId);
    localStorage.setItem('jiffynote.events', JSON.stringify(filtered));
    return true;
  }

  private getNotesFromLocalStorage(): Note[] {
    try {
      const raw = localStorage.getItem('jiffynote.notes');
      const parsed = raw ? (JSON.parse(raw) as Note[]) : [];
      return parsed.map(note => ({
        ...note,
        section: note.section || 'general'
      }));
    } catch {
      return [];
    }
  }

  private getNoteByIdFromLocalStorage(noteId: string): Note | null {
    const notes = this.getNotesFromLocalStorage();
    return notes.find(n => n.id === noteId) ?? null;
  }

  private createNoteInLocalStorage(note: NoteDraft): Note {
    const notes = this.getNotesFromLocalStorage();
    const newNote: Note = {
      id: note.id ?? crypto.randomUUID(),
      title: note.title.trim() || '(No title)',
      content: note.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_reminder: note.is_reminder || false,
      reminder_type: note.reminder_type || null,
      section: note.section || 'general'
    };
    localStorage.setItem('jiffynote.notes', JSON.stringify([...notes, newNote]));
    return newNote;
  }

  private updateNoteInLocalStorage(noteId: string, note: Partial<NoteDraft>): Note | null {
    const notes = this.getNotesFromLocalStorage();
    const index = notes.findIndex(n => n.id === noteId);
    if (index === -1) return null;

    const noteAtPosition = notes[index];
    if (!noteAtPosition) return null;

    const updatedNote: Note = {
      id: noteAtPosition.id,
      title: note.title ?? noteAtPosition.title,
      content: note.content ?? noteAtPosition.content,
      created_at: noteAtPosition.created_at,
      updated_at: new Date().toISOString(),
      is_reminder: note.is_reminder ?? noteAtPosition.is_reminder,
      reminder_type: note.reminder_type ?? noteAtPosition.reminder_type,
      section: note.section ?? noteAtPosition.section
    };

    notes[index] = updatedNote;
    localStorage.setItem('jiffynote.notes', JSON.stringify(notes));
    return updatedNote;
  }

  private deleteNoteFromLocalStorage(noteId: string): boolean {
    const notes = this.getNotesFromLocalStorage();
    const filtered = notes.filter(n => n.id !== noteId);
    localStorage.setItem('jiffynote.notes', JSON.stringify(filtered));
    return true;
  }

  // ==================== AUTHENTICATION ====================

  // Get user by username
  async getUserByUsername(username: string): Promise<any | null> {
    if (this.useDatabase) {
      try {
        await databaseService.connect();
        return await databaseService.getUserByUsername(username);
      } catch (error) {
        console.error('Database error:', error);
        return null;
      }
    }
    return null;
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<any | null> {
    if (this.useDatabase) {
      try {
        await databaseService.connect();
        return await databaseService.getUserByEmail(email);
      } catch (error) {
        console.error('Database error:', error);
        return null;
      }
    }
    return null;
  }

  // Create user
  async createUser(username: string, email: string, passwordHash: string): Promise<any> {
    if (this.useDatabase) {
      try {
        await databaseService.connect();
        return await databaseService.createUser(username, email, passwordHash);
      } catch (error) {
        console.error('Database error:', error);
        throw error;
      }
    }
    throw new Error('Database not available for user creation');
  }
}

// Export singleton instance
const storageService = new StorageService();
export default storageService;
