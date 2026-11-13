"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserByEmail = exports.getUserByUsername = exports.getUserById = void 0;
const index_1 = require("../index");
const getUserById = async (id) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getUserById = getUserById;
const getUserByUsername = async (username) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error getting user by username:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getUserByUsername = getUserByUsername;
const getUserByEmail = async (email) => {
    const client = await index_1.pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error getting user by email:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.getUserByEmail = getUserByEmail;
const createUser = async (userData) => {
    const client = await index_1.pool.connect();
    try {
        const { username, email, password_hash } = userData;
        const result = await client.query(`INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`, [username, email, password_hash]);
        return result.rows[0];
    }
    catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createUser = createUser;
const updateUser = async (id, userData) => {
    const client = await index_1.pool.connect();
    try {
        const { username, email } = userData;
        const result = await client.query(`UPDATE users 
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, created_at`, [username, email, id]);
        return result.rows[0] || null;
    }
    catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.updateUser = updateUser;
const deleteUser = async (id) => {
    const client = await index_1.pool.connect();
    try {
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        return true;
    }
    catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=userService.js.map