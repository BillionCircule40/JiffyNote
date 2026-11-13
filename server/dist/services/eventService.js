"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingEvents = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEventById = exports.getEventsByUserId = void 0;
const index_1 = require("../index");
const getEventsByUserId = async (userId) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY start_time', [userId]);
        return result.rows;
    }
    catch (error) {
        console.error('Error getting events by user ID:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getEventsByUserId = getEventsByUserId;
const getEventById = async (eventId, userId) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2', [eventId, userId]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error getting event by ID:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getEventById = getEventById;
const createEvent = async (eventData) => {
    const client = await index_1.pool.connect();
    try {
        const { user_id, title, description, start_time, end_time, color, priority, is_repeating, repeat_options } = eventData;
        const result = await client.query(`INSERT INTO calendar_events 
       (user_id, title, description, start_time, end_time, color, priority, is_repeating, repeat_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [user_id, title, description || null, start_time, end_time, color || '#039be5', priority || 1, is_repeating || false, repeat_options || null]);
        return result.rows[0];
    }
    catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createEvent = createEvent;
const updateEvent = async (eventId, eventData) => {
    const client = await index_1.pool.connect();
    try {
        const { title, description, start_time, end_time, color, priority, is_repeating, repeat_options } = eventData;
        const result = await client.query(`UPDATE calendar_events 
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
       RETURNING *`, [title, description, start_time, end_time, color, priority, is_repeating, repeat_options, eventId]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.updateEvent = updateEvent;
const deleteEvent = async (eventId) => {
    const client = await index_1.pool.connect();
    try {
        await client.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);
        return true;
    }
    catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.deleteEvent = deleteEvent;
const getUpcomingEvents = async (userId, days = 7) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query(`SELECT * FROM calendar_events 
       WHERE user_id = $1 
       AND start_time >= CURRENT_TIMESTAMP 
       AND start_time <= CURRENT_TIMESTAMP + INTERVAL '${days} days'
       ORDER BY start_time`, [userId]);
        return result.rows;
    }
    catch (error) {
        console.error('Error getting upcoming events:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getUpcomingEvents = getUpcomingEvents;
//# sourceMappingURL=eventService.js.map