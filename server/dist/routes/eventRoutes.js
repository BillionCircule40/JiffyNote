"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventService_1 = require("../services/eventService");
const router = (0, express_1.Router)();
// Get all events for a user
router.get('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const events = await (0, eventService_1.getEventsByUserId)(req.user.id);
        return res.json(events);
    }
    catch (error) {
        console.error('Error getting events:', error);
        return res.status(500).json({ error: 'Failed to get events' });
    }
});
// Get event by ID
router.get('/:eventId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const eventId = req.params?.eventId;
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }
        const event = await (0, eventService_1.getEventById)(eventId, req.user.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        return res.json(event);
    }
    catch (error) {
        console.error('Error getting event:', error);
        return res.status(500).json({ error: 'Failed to get event' });
    }
});
// Create new event
router.post('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const eventData = {
            user_id: req.user.id,
            ...req.body
        };
        const newEvent = await (0, eventService_1.createEvent)(eventData);
        return res.status(201).json(newEvent);
    }
    catch (error) {
        console.error('Error creating event:', error);
        return res.status(500).json({ error: 'Failed to create event' });
    }
});
// Update event
router.put('/:eventId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const eventId = req.params?.eventId;
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }
        const event = await (0, eventService_1.getEventById)(eventId, req.user.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const updatedEvent = await (0, eventService_1.updateEvent)(eventId, req.body);
        return res.json(updatedEvent);
    }
    catch (error) {
        console.error('Error updating event:', error);
        return res.status(500).json({ error: 'Failed to update event' });
    }
});
// Delete event
router.delete('/:eventId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const eventId = req.params?.eventId;
        if (!eventId) {
            return res.status(400).json({ error: 'Event ID is required' });
        }
        const event = await (0, eventService_1.getEventById)(eventId, req.user.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        await (0, eventService_1.deleteEvent)(eventId);
        return res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting event:', error);
        return res.status(500).json({ error: 'Failed to delete event' });
    }
});
exports.default = router;
//# sourceMappingURL=eventRoutes.js.map