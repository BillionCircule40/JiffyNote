"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const router = (0, express_1.Router)();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);
const isDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const validateSnapshot = (body) => {
    if (!body || typeof body !== 'object')
        return false;
    const payload = body;
    if (payload.mode !== 'merge' && payload.mode !== 'replace')
        return false;
    if (!Array.isArray(payload.events) || !Array.isArray(payload.notes))
        return false;
    const validEvents = payload.events.every((value) => {
        if (!value || typeof value !== 'object')
            return false;
        const event = value;
        return isUuid(event.id) && typeof event.title === 'string' && isDate(event.start) && isDate(event.end);
    });
    const validNotes = payload.notes.every((value) => {
        if (!value || typeof value !== 'object')
            return false;
        const note = value;
        return isUuid(note.id) && typeof note.title === 'string' && typeof note.content === 'string';
    });
    return validEvents && validNotes;
};
const replaceSnapshot = async (client, userId, events, notes, removeMissing) => {
    if (removeMissing) {
        await client.query(`DELETE FROM event_note_attachments
       WHERE event_id IN (SELECT id FROM calendar_events WHERE user_id = $1)`, [userId]);
        await client.query('DELETE FROM calendar_events WHERE user_id = $1 AND NOT (id = ANY($2::uuid[]))', [userId, events.map((event) => event.id)]);
        await client.query('DELETE FROM notes WHERE user_id = $1 AND NOT (id = ANY($2::uuid[]))', [userId, notes.map((note) => note.id)]);
    }
    for (const note of notes) {
        await client.query(`INSERT INTO notes (id, user_id, title, content, created_at, updated_at, section)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP), COALESCE($6::timestamptz, CURRENT_TIMESTAMP), $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         updated_at = EXCLUDED.updated_at,
         section = EXCLUDED.section
       WHERE notes.user_id = EXCLUDED.user_id`, [note.id, userId, note.title, note.content, note.created_at ?? null, note.updated_at ?? null, note.section ?? 'general']);
    }
    for (const event of events) {
        const repeatSettings = event.repeat ?? null;
        await client.query(`INSERT INTO calendar_events
         (id, user_id, title, start_time, end_time, color, priority, is_repeating, repeat_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         color = EXCLUDED.color,
         priority = EXCLUDED.priority,
         is_repeating = EXCLUDED.is_repeating,
         repeat_options = EXCLUDED.repeat_options,
         updated_at = CURRENT_TIMESTAMP
       WHERE calendar_events.user_id = EXCLUDED.user_id`, [event.id, userId, event.title, event.start, event.end, event.color ?? '#039be5', event.priority ?? 5, Boolean(repeatSettings?.enabled), JSON.stringify(repeatSettings)]);
        for (const noteId of event.noteIds ?? []) {
            if (!isUuid(noteId))
                continue;
            await client.query(`INSERT INTO event_note_attachments (event_id, note_id)
         SELECT $1, $2
         WHERE EXISTS (SELECT 1 FROM calendar_events WHERE id = $1 AND user_id = $3)
           AND EXISTS (SELECT 1 FROM notes WHERE id = $2 AND user_id = $3)
         ON CONFLICT (event_id, note_id) DO NOTHING`, [event.id, noteId, userId]);
        }
    }
};
const readSnapshot = async (client, userId) => {
    const [eventResult, noteResult, attachmentResult] = await Promise.all([
        client.query(`SELECT id, title, start_time, end_time, color, priority, is_repeating, repeat_options
       FROM calendar_events WHERE user_id = $1 ORDER BY start_time`, [userId]),
        client.query(`SELECT id, title, content, created_at, updated_at, section
       FROM notes WHERE user_id = $1 ORDER BY created_at`, [userId]),
        client.query(`SELECT a.event_id, a.note_id
       FROM event_note_attachments a
       JOIN calendar_events e ON e.id = a.event_id
       JOIN notes n ON n.id = a.note_id
       WHERE e.user_id = $1 AND n.user_id = $1`, [userId]),
    ]);
    return {
        events: eventResult.rows,
        notes: noteResult.rows,
        attachments: attachmentResult.rows,
    };
};
router.get('/snapshot', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const client = await index_1.pool.connect();
        try {
            return res.json(await readSnapshot(client, req.user.id));
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Unable to read account data:', error);
        return res.status(500).json({ error: 'Unable to load account data' });
    }
});
router.put('/snapshot', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!validateSnapshot(req.body)) {
        return res.status(400).json({ error: 'Invalid account data snapshot' });
    }
    const client = await index_1.pool.connect();
    try {
        await client.query('BEGIN');
        await replaceSnapshot(client, req.user.id, req.body.events, req.body.notes, req.body.mode === 'replace');
        const snapshot = await readSnapshot(client, req.user.id);
        await client.query('COMMIT');
        return res.json(snapshot);
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Unable to sync account data:', error);
        return res.status(500).json({ error: 'Unable to sync account data' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
//# sourceMappingURL=syncRoutes.js.map