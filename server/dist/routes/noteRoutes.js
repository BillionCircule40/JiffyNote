"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const noteService_1 = require("../services/noteService");
const router = (0, express_1.Router)();
// Get all notes for a user
router.get('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const notes = await (0, noteService_1.getNotesByUserId)(req.user.id);
        return res.json(notes);
    }
    catch (error) {
        console.error('Error getting notes:', error);
        return res.status(500).json({ error: 'Failed to get notes' });
    }
});
// Get notes by section
router.get('/section/:section', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const section = req.params?.section;
        if (!section) {
            return res.status(400).json({ error: 'Section is required' });
        }
        const notes = await (0, noteService_1.getNotesBySection)(req.user.id, section);
        return res.json(notes);
    }
    catch (error) {
        console.error('Error getting notes by section:', error);
        return res.status(500).json({ error: 'Failed to get notes by section' });
    }
});
// Get note by ID
router.get('/:noteId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const noteId = req.params?.noteId;
        if (!noteId) {
            return res.status(400).json({ error: 'Note ID is required' });
        }
        const note = await (0, noteService_1.getNoteById)(noteId, req.user.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        return res.json(note);
    }
    catch (error) {
        console.error('Error getting note:', error);
        return res.status(500).json({ error: 'Failed to get note' });
    }
});
// Search notes
router.get('/search', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Search query required' });
        }
        const notes = await (0, noteService_1.searchNotes)(req.user.id, q);
        return res.json(notes);
    }
    catch (error) {
        console.error('Error searching notes:', error);
        return res.status(500).json({ error: 'Failed to search notes' });
    }
});
// Create new note
router.post('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const noteData = {
            user_id: req.user.id,
            ...req.body
        };
        const newNote = await (0, noteService_1.createNote)(noteData);
        return res.status(201).json(newNote);
    }
    catch (error) {
        console.error('Error creating note:', error);
        return res.status(500).json({ error: 'Failed to create note' });
    }
});
// Update note
router.put('/:noteId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const noteId = req.params?.noteId;
        if (!noteId) {
            return res.status(400).json({ error: 'Note ID is required' });
        }
        const note = await (0, noteService_1.getNoteById)(noteId, req.user.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        const updatedNote = await (0, noteService_1.updateNote)(noteId, req.body);
        return res.json(updatedNote);
    }
    catch (error) {
        console.error('Error updating note:', error);
        return res.status(500).json({ error: 'Failed to update note' });
    }
});
// Delete note
router.delete('/:noteId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const noteId = req.params?.noteId;
        if (!noteId) {
            return res.status(400).json({ error: 'Note ID is required' });
        }
        const success = await (0, noteService_1.deleteNote)(noteId);
        if (!success) {
            return res.status(404).json({ error: 'Note not found' });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting note:', error);
        return res.status(500).json({ error: 'Failed to delete note' });
    }
});
exports.default = router;
//# sourceMappingURL=noteRoutes.js.map