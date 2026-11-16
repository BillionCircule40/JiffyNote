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
    const result = await client.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
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
    const result = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const hasAccountFieldConflict = async (
  field: 'username' | 'email',
  value: string,
  excludeUserId?: string,
): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM users
       WHERE LOWER(${field}) = LOWER($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1`,
      [value, excludeUserId ?? null],
    );
    return result.rowCount !== 0;
  } finally {
    client.release();
  }
};

export const updateUserAccount = async (
  id: string,
  updates: { username?: string; email?: string; password_hash?: string },
): Promise<User | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           password_hash = COALESCE($3, password_hash),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, username, email, created_at`,
      [updates.username ?? null, updates.email ?? null, updates.password_hash ?? null, id],
    );
    return result.rows[0] ?? null;
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
