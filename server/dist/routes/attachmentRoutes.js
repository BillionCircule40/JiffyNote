"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attachmentService_1 = require("../services/attachmentService");
const router = (0, express_1.Router)();
// Get attachments by event ID
router.get('/event/:eventId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { eventId } = req.params || {};
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }
        const attachments = await (0, attachmentService_1.getEventNoteAttachmentsByEventId)(eventId);
        return res.json(attachments);
    }
    catch (error) {
        console.error('Error getting event attachments:', error);
        return res.status(500).json({ error: 'Failed to get event attachments' });
    }
});
// Get attachments by note ID
router.get('/note/:noteId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { noteId } = req.params || {};
        if (!noteId) {
            return res.status(400).json({ error: 'Note ID is required' });
        }
        const attachments = await (0, attachmentService_1.getEventNoteAttachmentsByNoteId)(noteId);
        return res.json(attachments);
    }
    catch (error) {
        console.error('Error getting note attachments:', error);
        return res.status(500).json({ error: 'Failed to get note attachments' });
    }
});
// Create attachment
router.post('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { eventId, noteId } = req.body;
        if (!eventId || !noteId) {
            return res.status(400).json({ error: 'Event ID and Note ID are required' });
        }
        await (0, attachmentService_1.createEventNoteAttachment)(eventId, noteId);
        return res.status(201).json({ success: true });
    }
    catch (error) {
        console.error('Error creating attachment:', error);
        return res.status(500).json({ error: 'Failed to create attachment' });
    }
});
// Delete attachment
router.delete('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { eventId, noteId } = req.body;
        if (!eventId || !noteId) {
            return res.status(400).json({ error: 'Event ID and Note ID are required' });
        }
        await (0, attachmentService_1.deleteEventNoteAttachment)(eventId, noteId);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting attachment:', error);
        return res.status(500).json({ error: 'Failed to delete attachment' });
    }
});
// Delete all attachments by event ID
router.delete('/event/:eventId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const eventId = req.params?.eventId;
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }
        await (0, attachmentService_1.deleteAttachmentsByEventId)(eventId);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting event attachments:', error);
        return res.status(500).json({ error: 'Failed to delete event attachments' });
    }
});
// Delete all attachments by note ID
router.delete('/note/:noteId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const noteId = req.params?.noteId;
        if (!noteId) {
            return res.status(400).json({ error: 'Note ID is required' });
        }
        await (0, attachmentService_1.deleteAttachmentsByNoteId)(noteId);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting note attachments:', error);
        return res.status(500).json({ error: 'Failed to delete note attachments' });
    }
});
exports.default = router;
//# sourceMappingURL=attachmentRoutes.js.map