"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNotes = exports.deleteNote = exports.updateNote = exports.createNote = exports.getNotesBySection = exports.getNoteById = exports.getNotesByUserId = void 0;
const index_1 = require("../index");
const getNotesByUserId = async (userId) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows;
    }
    catch (error) {
        console.error('Error getting notes by user ID:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getNotesByUserId = getNotesByUserId;
const getNoteById = async (noteId, userId) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error getting note by ID:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getNoteById = getNoteById;
const getNotesBySection = async (userId, section) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM notes WHERE user_id = $1 AND section = $2 ORDER BY created_at DESC', [userId, section]);
        return result.rows;
    }
    catch (error) {
        console.error('Error getting notes by section:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getNotesBySection = getNotesBySection;
const createNote = async (noteData) => {
    const client = await index_1.pool.connect();
    try {
        const { user_id, title, content, is_reminder, reminder_type, section } = noteData;
        const result = await client.query(`INSERT INTO notes 
       (user_id, title, content, is_reminder, reminder_type, section)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [user_id, title, content, is_reminder || false, reminder_type || null, section || 'general']);
        return result.rows[0];
    }
    catch (error) {
        console.error('Error creating note:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createNote = createNote;
const updateNote = async (noteId, noteData) => {
    const client = await index_1.pool.connect();
    try {
        const { title, content, is_reminder, reminder_type, section } = noteData;
        const result = await client.query(`UPDATE notes 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           is_reminder = COALESCE($3, is_reminder),
           reminder_type = COALESCE($4, reminder_type),
           section = COALESCE($5, section),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`, [title, content, is_reminder, reminder_type, section, noteId]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error updating note:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.updateNote = updateNote;
const deleteNote = async (noteId) => {
    const client = await index_1.pool.connect();
    try {
        await client.query('DELETE FROM notes WHERE id = $1', [noteId]);
        return true;
    }
    catch (error) {
        console.error('Error deleting note:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.deleteNote = deleteNote;
const searchNotes = async (userId, searchTerm) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query(`SELECT * FROM notes 
       WHERE user_id = $1 
       AND (title ILIKE $2 OR content ILIKE $2)
       ORDER BY created_at DESC`, [userId, `%${searchTerm}%`]);
        return result.rows;
    }
    catch (error) {
        console.error('Error searching notes:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.searchNotes = searchNotes;
//# sourceMappingURL=noteService.js.map