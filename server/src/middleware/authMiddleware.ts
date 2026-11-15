import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username?: string;
        email?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === 'string' || typeof payload === 'number' || !payload.id) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }

    const user: NonNullable<Request['user']> = { id: payload.id };
    if (typeof payload.username === 'string') {
      user.username = payload.username;
    }
    if (typeof payload.email === 'string') {
      user.email = payload.email;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};