require('dotenv').config();
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import authRoutes from './routes/authRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import eventRoutes from './routes/eventRoutes';
import noteRoutes from './routes/noteRoutes';
import planRoutes from './routes/planRoutes';
import syncRoutes from './routes/syncRoutes';
import { authenticateToken } from './middleware/authMiddleware';
import { errorHandler } from './utils/errorHandler';

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 8080;

// Database connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'jiffynote_db',
  user: process.env.DB_USER || 'jiffynote_user',
  password: process.env.DB_PASSWORD || 'secure_password',
  max: 10,
  idleTimeoutMillis: 30000
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err: unknown) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attachments', authenticateToken, attachmentRoutes);
app.use('/api/events', authenticateToken, eventRoutes);
app.use('/api/notes', authenticateToken, noteRoutes);
app.use('/api/plans', authenticateToken, planRoutes);
app.use('/api/sync', authenticateToken, syncRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`JiffyNote Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end().then(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

export default app;
