import { Router, Request, Response } from 'express';
import { 
  getNotesByUserId, 
  getNotesBySection,
  getNoteById, 
  createNote, 
  updateNote, 
  deleteNote,
  searchNotes 
} from '../services/noteService';

const router: Router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

// Get all notes for a user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notes = await getNotesByUserId(req.user.id);
    return res.json(notes);
  } catch (error) {
    console.error('Error getting notes:', error);
    return res.status(500).json({ error: 'Failed to get notes' });
  }
});

// Get notes by section
router.get('/section/:section', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const section = req.params?.section;
    if (!section) {
      return res.status(400).json({ error: 'Section is required' });
    }

    const notes = await getNotesBySection(req.user.id, section);
    return res.json(notes);
  } catch (error) {
    console.error('Error getting notes by section:', error);
    return res.status(500).json({ error: 'Failed to get notes by section' });
  }
});

// Get note by ID
router.get('/:noteId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteId = req.params?.noteId;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const note = await getNoteById(noteId, req.user.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json(note);
  } catch (error) {
    console.error('Error getting note:', error);
    return res.status(500).json({ error: 'Failed to get note' });
  }
});

// Search notes
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const notes = await searchNotes(req.user.id, q);
    return res.json(notes);
  } catch (error) {
    console.error('Error searching notes:', error);
    return res.status(500).json({ error: 'Failed to search notes' });
  }
});

// Create new note
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteData = {
      user_id: req.user.id,
      ...req.body
    };

    const newNote = await createNote(noteData);
    return res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    return res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:noteId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteId = req.params?.noteId;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const note = await getNoteById(noteId, req.user.id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedNote = await updateNote(noteId, req.body);
    return res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:noteId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const noteId = req.params?.noteId;
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const success = await deleteNote(noteId);

    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
