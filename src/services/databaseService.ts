import { Client, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database configuration
interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

// Event interfaces
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface EventDraft {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color: string;
}

// Note interfaces
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_reminder: boolean;
  reminder_type: 'now' | 'later' | 'todo' | null;
  section: 'now' | 'later' | 'todo' | 'general';
}

export interface NoteDraft {
  id?: string;
  title: string;
  content: string;
  is_reminder?: boolean;
  reminder_type?: 'now' | 'later' | 'todo' | null;
  section?: 'now' | 'later' | 'todo' | 'general';
}

// Event-Note attachment interfaces
export interface EventNoteAttachment {
  id: string;
  event_id: string;
  note_id: string;
  created_at: string;
}

// Database connection class
class DatabaseService {
  private client: Client;
  private connected: boolean = false;

  constructor(config: DBConfig) {
    this.client = new Client(config);
  }

  // Connect to database
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      console.log('Connected to PostgreSQL database successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  // Disconnect from database
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
      console.log('Database connection closed');
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.connected;
  }

  // Get database client
  getClient(): Client {
    return this.client;
  }

  // ==================== CALENDAR EVENTS ====================

  // Get all events for a user
  async getEventsByUserId(userId: string): Promise<CalendarEvent[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<CalendarEvent> = await this.client.query(
        'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_time',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  // Get event by ID
  async getEventById(eventId: string, userId: string): Promise<CalendarEvent | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<CalendarEvent> = await this.client.query(
        'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
        [eventId, userId]
      );
      return result.rows[0] ?? null;
    } catch (error) {
      console.error('Error getting event by ID:', error);
      throw error;
    }
  }

  // Create new event
  async createEvent(event: EventDraft, userId: string): Promise<CalendarEvent> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const result: QueryResult<CalendarEvent> = await this.client.query(
        `INSERT INTO calendar_events 
         (id, user_id, title, description, start_time, end_time, color, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, userId, event.title, event.description || null, event.start_time, event.end_time, event.color, now, now]
      );
      const createdEvent = result.rows[0];
      if (!createdEvent) {
        throw new Error('Failed to create calendar event');
      }
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId: string, event: Partial<EventDraft>): Promise<CalendarEvent | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<CalendarEvent> = await this.client.query(
        `UPDATE calendar_events 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             start_time = COALESCE($3, start_time),
             end_time = COALESCE($4, end_time),
             color = COALESCE($5, color),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [event.title, event.description, event.start_time, event.end_time, event.color, eventId]
      );
      return result.rows[0] ?? null;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Notes Table
  // Note: Added 'section' column for note organization (Now/Later/Todo/General)
  
  // Get all notes for a user
  async getNotesByUserId(userId: string): Promise<Note[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<Note> = await this.client.query(
        'SELECT id, user_id, title, content, created_at, updated_at, is_reminder, reminder_type, section FROM notes WHERE user_id = $1 ORDER BY created_at',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  }

  // Get note by ID
  async getNoteById(noteId: string, userId: string): Promise<Note | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<Note> = await this.client.query(
        'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
        [noteId, userId]
      );
      return result.rows[0] ?? null;
    } catch (error) {
      console.error('Error getting note by ID:', error);
      throw error;
    }
  }

  // Create new note
  async createNote(note: NoteDraft, userId: string): Promise<Note> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const result: QueryResult<Note> = await this.client.query(
        `INSERT INTO notes 
         (id, user_id, title, content, created_at, updated_at, is_reminder, reminder_type, section)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, userId, note.title, note.content, now, now, note.is_reminder || false, note.reminder_type, note.section || 'general']
      );
      const createdNote = result.rows[0];
      if (!createdNote) {
        throw new Error('Failed to create note');
      }
      return createdNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  // Update note
  async updateNote(noteId: string, note: Partial<NoteDraft>): Promise<Note | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<Note> = await this.client.query(        `UPDATE notes 
         SET title = COALESCE($1, title),
             content = COALESCE($2, content),
             is_reminder = COALESCE($3, is_reminder),
             reminder_type = COALESCE($4, reminder_type),
             section = COALESCE($5, section),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [note.title, note.content, note.is_reminder, note.reminder_type, note.section, noteId]
      );
      return result.rows[0] ?? null;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  // Delete note
  async deleteNote(noteId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.query('DELETE FROM notes WHERE id = $1', [noteId]);
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  // ==================== EVENT-NOTE ATTACHMENTS ====================

  // Get all attachments for an event
  async getEventAttachments(eventId: string): Promise<EventNoteAttachment[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<EventNoteAttachment> = await this.client.query(
        'SELECT * FROM event_note_attachments WHERE event_id = $1',
        [eventId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting event attachments:', error);
      throw error;
    }
  }

  // Attach note to event
  async attachNoteToEvent(eventId: string, noteId: string): Promise<EventNoteAttachment> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const result: QueryResult<EventNoteAttachment> = await this.client.query(
        `INSERT INTO event_note_attachments 
         (id, event_id, note_id, created_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, eventId, noteId, now]
      );
      const attachment = result.rows[0];
      if (!attachment) {
        throw new Error('Failed to attach note to event');
      }
      return attachment;
    } catch (error) {
      console.error('Error attaching note to event:', error);
      throw error;
    }
  }

  // Detach note from event
  async detachNoteFromEvent(eventId: string, noteId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.query(
        'DELETE FROM event_note_attachments WHERE event_id = $1 AND note_id = $2',
        [eventId, noteId]
      );
      return true;
    } catch (error) {
      console.error('Error detaching note from event:', error);
      throw error;
    }
  }

  // ==================== USER AUTHENTICATION ====================

  // Get user by username
  async getUserByUsername(username: string): Promise<any | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<any> = await this.client.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      const existingUser = result.rows[0];
      return existingUser ?? null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<any | null> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result: QueryResult<any> = await this.client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      const existingUser = result.rows[0];
      return existingUser ?? null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // Create new user
  async createUser(username: string, email: string, passwordHash: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const result: QueryResult<any> = await this.client.query(
        `INSERT INTO users 
         (id, username, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, email, created_at`,
        [id, username, email, passwordHash, now, now]
      );
      const createdUser = result.rows[0];
      if (!createdUser) {
        throw new Error('Failed to create user');
      }
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'jiffynote_db',
  user: process.env.POSTGRES_USER || 'jiffynote_user',
  password: process.env.POSTGRES_PASSWORD || 'secure_password'
});

export default databaseService;
