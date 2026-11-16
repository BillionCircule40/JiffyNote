import { Request, Response, Router } from 'express';
import { getPlansByUserId, PlanRecord, replacePlansForUser } from '../services/planService';

const router: Router = Router();

const isValidPlan = (value: unknown): value is PlanRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const plan = value as Partial<PlanRecord>;
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

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json(await getPlansByUserId(req.user.id));
  } catch (error) {
    console.error('Error getting plans:', error);
    return res.status(500).json({ error: 'Failed to get plans' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(req.body) || !req.body.every(isValidPlan)) {
      return res.status(400).json({ error: 'A valid plans array is required' });
    }

    return res.json(await replacePlansForUser(req.user.id, req.body));
  } catch (error) {
    console.error('Error saving plans:', error);
    return res.status(500).json({ error: 'Failed to save plans' });
  }
});

export default router;