"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userService_1 = require("../services/userService");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const hasPostgresCredentialError = (error) => typeof error === 'object' && error !== null && 'code' in error && error.code === '28P01';
const authFailure = (error, action, res) => {
    console.error(`${action} error:`, error);
    if (hasPostgresCredentialError(error)) {
        return res.status(503).json({ error: 'Database credentials are not accepted. Check the PostgreSQL password configured for the API.' });
    }
    return res.status(500).json({ error: `${action} failed` });
};
// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const { password } = req.body;
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (await (0, userService_1.hasAccountFieldConflict)('username', username)) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        if (await (0, userService_1.hasAccountFieldConflict)('email', email)) {
            return res.status(409).json({ error: 'Email already in use' });
        }
        // Hash password
        const password_hash = await bcrypt_1.default.hash(password, 10);
        // Create user
        const newUser = await (0, userService_1.createUser)({
            username,
            email,
            password_hash
        });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, username: newUser.username, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                created_at: newUser.created_at
            },
            token
        });
    }
    catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'Username or email is already in use' });
        }
        return authFailure(error, 'Registration', res);
    }
});
// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const user = await (0, userService_1.getUserByEmail)(email) ?? await (0, userService_1.getUserByUsername)(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at
            },
            token
        });
    }
    catch (error) {
        return authFailure(error, 'Login', res);
    }
});
router.put('/profile', authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, password } = req.body;
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
        const existingUser = await (0, userService_1.getUserById)(userId);
        if (!existingUser || !(await bcrypt_1.default.compare(currentPassword, existingUser.password_hash))) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        if (username !== undefined && await (0, userService_1.hasAccountFieldConflict)('username', username, userId)) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        if (email !== undefined && await (0, userService_1.hasAccountFieldConflict)('email', email, userId)) {
            return res.status(409).json({ error: 'Email already in use' });
        }
        const updates = {};
        if (username !== undefined)
            updates.username = username;
        if (email !== undefined)
            updates.email = email;
        if (password !== undefined)
            updates.password_hash = await bcrypt_1.default.hash(password, 10);
        const updatedUser = await (0, userService_1.updateUserAccount)(userId, updates);
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        const token = jsonwebtoken_1.default.sign({ id: updatedUser.id, username: updatedUser.username, email: updatedUser.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                created_at: updatedUser.created_at,
            },
            token,
        });
    }
    catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            return res.status(409).json({ error: 'Username or email is already in use' });
        }
        return authFailure(error, 'Profile update', res);
    }
});
// Get current user profile
router.get('/profile', authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await (0, userService_1.getUserById)(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at
        });
    }
    catch (error) {
        console.error('Profile error:', error);
        return res.status(500).json({ error: 'Failed to get profile' });
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map