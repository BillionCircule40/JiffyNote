import { Router, Request, Response } from 'express';
import { 
  getEventsByUserId, 
  getEventById, 
  createEvent, 
  updateEvent, 
  deleteEvent 
} from '../services/eventService';

const router: Router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

// Get all events for a user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const events = await getEventsByUserId(req.user.id);
    return res.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    return res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get event by ID
router.get('/:eventId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eventId = req.params?.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const event = await getEventById(eventId, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json(event);
  } catch (error) {
    console.error('Error getting event:', error);
    return res.status(500).json({ error: 'Failed to get event' });
  }
});

// Create new event
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eventData = {
      user_id: req.user.id,
      ...req.body
    };

    const newEvent = await createEvent(eventData);
    return res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:eventId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eventId = req.params?.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const event = await getEventById(eventId, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await updateEvent(eventId, req.body);
    return res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:eventId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eventId = req.params?.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const event = await getEventById(eventId, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await deleteEvent(eventId);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
