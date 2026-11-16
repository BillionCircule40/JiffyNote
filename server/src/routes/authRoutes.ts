import { Router, Request, Response } from 'express';
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  hasAccountFieldConflict,
  updateUserAccount,
} from '../services/userService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/authMiddleware';

const router: Router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const hasPostgresCredentialError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '28P01';

const authFailure = (error: unknown, action: string, res: Response) => {
  console.error(`${action} error:`, error);
  if (hasPostgresCredentialError(error)) {
    return res.status(503).json({ error: 'Database credentials are not accepted. Check the PostgreSQL password configured for the API.' });
  }
  return res.status(500).json({ error: `${action} failed` });
};

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (await hasAccountFieldConflict('username', username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    if (await hasAccountFieldConflict('email', email)) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await createUser({
      username,
      email,
      password_hash
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at
      },
      token
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'Username or email is already in use' });
    }
    return authFailure(error, 'Registration', res);
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await getUserByEmail(email) ?? await getUserByUsername(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    return authFailure(error, 'Login', res);
  }
});

router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, password } = req.body as {
      currentPassword?: string;
      password?: string;
    };
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : undefined;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    if (username !== undefined && !username) {
      return res.status(400).json({ error: 'Username cannot be empty' });
    }
    if (email !== undefined && !email) {
      return res.status(400).json({ error: 'Email cannot be empty' });
    }
    if (password !== undefined && password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (username === undefined && email === undefined && password === undefined) {
      return res.status(400).json({ error: 'No account changes were provided' });
    }

    const existingUser = await getUserById(userId);
    if (!existingUser || !(await bcrypt.compare(currentPassword, existingUser.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (username !== undefined && await hasAccountFieldConflict('username', username, userId)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    if (email !== undefined && await hasAccountFieldConflict('email', email, userId)) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const updates: { username?: string; email?: string; password_hash?: string } = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (password !== undefined) updates.password_hash = await bcrypt.hash(password, 10);

    const updatedUser = await updateUserAccount(userId, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    return res.json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        created_at: updatedUser.created_at,
      },
      token,
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'Username or email is already in use' });
    }
    return authFailure(error, 'Profile update', res);
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
