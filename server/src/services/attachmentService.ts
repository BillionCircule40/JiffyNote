import { pool } from '../index';

export const getEventNoteAttachmentsByEventId = async (eventId: string): Promise<any[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT ena.*, n.title as note_title, n.content as note_content
       FROM event_note_attachments ena
       JOIN notes n ON ena.note_id = n.id
       WHERE ena.event_id = $1`,
      [eventId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting event-note attachments:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getEventNoteAttachmentsByNoteId = async (noteId: string): Promise<any[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT ena.*, ce.title as event_title, ce.start_time, ce.end_time
       FROM event_note_attachments ena
       JOIN calendar_events ce ON ena.event_id = ce.id
       WHERE ena.note_id = $1`,
      [noteId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting event-note attachments by note:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const createEventNoteAttachment = async (eventId: string, noteId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO event_note_attachments (event_id, note_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, note_id) DO NOTHING`,
      [eventId, noteId]
    );
    return true;
  } catch (error) {
    console.error('Error creating event-note attachment:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteEventNoteAttachment = async (eventId: string, noteId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query(
      'DELETE FROM event_note_attachments WHERE event_id = $1 AND note_id = $2',
      [eventId, noteId]
    );
    return true;
  } catch (error) {
    console.error('Error deleting event-note attachment:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteAttachmentsByEventId = async (eventId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM event_note_attachments WHERE event_id = $1', [eventId]);
    return true;
  } catch (error) {
    console.error('Error deleting event-note attachments:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteAttachmentsByNoteId = async (noteId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM event_note_attachments WHERE note_id = $1', [noteId]);
    return true;
  } catch (error) {
    console.error('Error deleting event-note attachments:', error);
    throw error;
  } finally {
    client.release();
  }
};
