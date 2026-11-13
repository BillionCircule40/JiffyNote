import { pool } from '../index';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color: string;
  priority: number;
  is_repeating: boolean;
  repeat_options?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color?: string;
  priority?: number;
  is_repeating?: boolean;
  repeat_options?: any;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  color?: string;
  priority?: number;
  is_repeating?: boolean;
  repeat_options?: any;
}

export const getEventsByUserId = async (userId: string): Promise<CalendarEvent[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_time',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting events by user ID:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getEventById = async (eventId: string, userId: string): Promise<CalendarEvent | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
      [eventId, userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const createEvent = async (eventData: CreateEventInput): Promise<CalendarEvent> => {
  const client = await pool.connect();
  try {
    const { user_id, title, description, start_time, end_time, color, priority, is_repeating, repeat_options } = eventData;
    const result = await client.query(
      `INSERT INTO calendar_events 
       (user_id, title, description, start_time, end_time, color, priority, is_repeating, repeat_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [user_id, title, description || null, start_time, end_time, color || '#039be5', priority || 1, is_repeating || false, repeat_options || null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const updateEvent = async (eventId: string, eventData: UpdateEventInput): Promise<CalendarEvent | null> => {
  const client = await pool.connect();
  try {
    const { title, description, start_time, end_time, color, priority, is_repeating, repeat_options } = eventData;
    const result = await client.query(
      `UPDATE calendar_events 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           start_time = COALESCE($3, start_time),
           end_time = COALESCE($4, end_time),
           color = COALESCE($5, color),
           priority = COALESCE($6, priority),
           is_repeating = COALESCE($7, is_repeating),
           repeat_options = COALESCE($8, repeat_options),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [title, description, start_time, end_time, color, priority, is_repeating, repeat_options, eventId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteEvent = async (eventId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);
    return true;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getUpcomingEvents = async (userId: string, days: number = 7): Promise<CalendarEvent[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM calendar_events 
       WHERE user_id = $1 
       AND start_time >= CURRENT_TIMESTAMP 
       AND start_time <= CURRENT_TIMESTAMP + INTERVAL '${days} days'
       ORDER BY start_time`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    throw error;
  } finally {
    client.release();
  }
};
