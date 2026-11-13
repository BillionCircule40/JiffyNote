"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userService_1 = require("../services/userService");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Check if user already exists
        const existingUser = await (0, userService_1.getUserByEmail)(email);
        if (existingUser) {
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
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
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
        const user = await (0, userService_1.getUserByEmail)(email);
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
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
});
// Get current user profile
router.get('/profile', async (req, res) => {
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