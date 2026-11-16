import { pool } from '../index';

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

export interface CreateNoteInput {
  user_id: string;
  title: string;
  content: string;
  is_reminder?: boolean;
  reminder_type?: 'now' | 'later' | 'todo' | null;
  section?: 'now' | 'later' | 'todo' | 'general';
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  is_reminder?: boolean;
  reminder_type?: 'now' | 'later' | 'todo' | null;
  section?: 'now' | 'later' | 'todo' | 'general';
}

export const getNotesByUserId = async (userId: string): Promise<Note[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting notes by user ID:', error);
    throw error;
  } finally {
    client.release();
  }
};
export const getNoteById = async (noteId: string, userId: string): Promise<Note | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [noteId, userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting note by ID:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getNotesBySection = async (userId: string, section: string): Promise<Note[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM notes WHERE user_id = $1 AND section = $2 ORDER BY created_at DESC',
      [userId, section]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting notes by section:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const createNote = async (noteData: CreateNoteInput): Promise<Note> => {
  const client = await pool.connect();
  try {
    const { user_id, title, content, is_reminder, reminder_type, section } = noteData;
    const result = await client.query(
      `INSERT INTO notes 
       (user_id, title, content, is_reminder, reminder_type, section)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, title, content, is_reminder || false, reminder_type || null, section || 'general']
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const updateNote = async (noteId: string, noteData: UpdateNoteInput): Promise<Note | null> => {
  const client = await pool.connect();
  try {
    const { title, content, is_reminder, reminder_type, section } = noteData;
    const result = await client.query(
      `UPDATE notes 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           is_reminder = COALESCE($3, is_reminder),
           reminder_type = COALESCE($4, reminder_type),
           section = COALESCE($5, section),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title, content, is_reminder, reminder_type, section, noteId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteNote = async (noteId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM notes WHERE id = $1', [noteId]);
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const searchNotes = async (userId: string, searchTerm: string): Promise<Note[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM notes 
       WHERE user_id = $1 
       AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY created_at DESC`,
      [userId, `%${searchTerm}%`]
    );
    return result.rows;
  } catch (error) {
    console.error('Error searching notes:', error);
    throw error;
  } finally {
    client.release();
  }
};
