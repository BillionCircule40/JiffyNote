"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const planService_1 = require("../services/planService");
const router = (0, express_1.Router)();
const isValidPlan = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const plan = value;
    return typeof plan.id === 'string'
        && typeof plan.title === 'string'
        && typeof plan.description === 'string'
        && typeof plan.color === 'string'
        && Array.isArray(plan.events)
        && plan.events.every((event) => Boolean(event)
            && typeof event.id === 'string'
            && typeof event.title === 'string'
            && Number.isInteger(event.dayOfWeek)
            && event.dayOfWeek >= 0
            && event.dayOfWeek <= 6
            && (event.daysOfWeek === undefined || (Array.isArray(event.daysOfWeek)
                && event.daysOfWeek.length > 0
                && event.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)))
            && typeof event.startTime === 'string'
            && typeof event.endTime === 'string'
            && typeof event.color === 'string'
            && (event.noteIds === undefined || (Array.isArray(event.noteIds) && event.noteIds.every((noteId) => typeof noteId === 'string'))));
};
router.get('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.json(await (0, planService_1.getPlansByUserId)(req.user.id));
    }
    catch (error) {
        console.error('Error getting plans:', error);
        return res.status(500).json({ error: 'Failed to get plans' });
    }
});
router.put('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!Array.isArray(req.body) || !req.body.every(isValidPlan)) {
            return res.status(400).json({ error: 'A valid plans array is required' });
        }
        return res.json(await (0, planService_1.replacePlansForUser)(req.user.id, req.body));
    }
    catch (error) {
        console.error('Error saving plans:', error);
        return res.status(500).json({ error: 'Failed to save plans' });
    }
});
exports.default = router;
//# sourceMappingURL=planRoutes.js.map