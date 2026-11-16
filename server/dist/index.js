"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const attachmentRoutes_1 = __importDefault(require("./routes/attachmentRoutes"));
const eventRoutes_1 = __importDefault(require("./routes/eventRoutes"));
const noteRoutes_1 = __importDefault(require("./routes/noteRoutes"));
const planRoutes_1 = __importDefault(require("./routes/planRoutes"));
const syncRoutes_1 = __importDefault(require("./routes/syncRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const errorHandler_1 = require("./utils/errorHandler");
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
// Database connection pool
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'jiffynote_db',
    user: process.env.DB_USER || 'jiffynote_user',
    password: process.env.DB_PASSWORD || 'secure_password',
    max: 10,
    idleTimeoutMillis: 30000
});
// Test database connection
exports.pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Middleware
const configuredCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const isLocalOrigin = !!origin
            && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (!origin || origin === configuredCorsOrigin || isLocalOrigin) {
            callback(null, true);
            return;
        }
        callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/attachments', authMiddleware_1.authenticateToken, attachmentRoutes_1.default);
app.use('/api/events', authMiddleware_1.authenticateToken, eventRoutes_1.default);
app.use('/api/notes', authMiddleware_1.authenticateToken, noteRoutes_1.default);
app.use('/api/plans', authMiddleware_1.authenticateToken, planRoutes_1.default);
app.use('/api/sync', authMiddleware_1.authenticateToken, syncRoutes_1.default);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
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
        exports.pool.end().then(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map