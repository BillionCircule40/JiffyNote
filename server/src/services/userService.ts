import { pool } from '../index';

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password_hash: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
}

export const getUserById = async (id: string): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const createUser = async (userData: CreateUserInput): Promise<User> => {
  const client = await pool.connect();
  try {
    const { username, email, password_hash } = userData;
    const result = await client.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, password_hash]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const updateUser = async (id: string, userData: UpdateUserInput): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const { username, email } = userData;
    const result = await client.query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, username, email, created_at`,
      [username, email, id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  } finally {
    client.release();
  }
};
