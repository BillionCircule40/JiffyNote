import bcrypt from 'bcrypt';
import databaseService from './databaseService';

// Password configuration
const SALT_ROUNDS = 10;

// User interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface UserCredentials {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Authentication service class
class AuthService {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // Compare password with hash
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Register new user
  async register(credentials: UserCredentials): Promise<AuthResult> {
    try {
      // Check if username already exists
      const existingUser = await databaseService.getUserByUsername(credentials.username);
      if (existingUser) {
        return { success: false, error: 'Username already exists' };
      }

      // Check if email already exists
      const existingEmail = await databaseService.getUserByEmail(credentials.email);
      if (existingEmail) {
        return { success: false, error: 'Email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(credentials.password);

      // Create user
      const user = await databaseService.createUser(
        credentials.username,
        credentials.email,
        passwordHash
      );

      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  // Login user
  async login(credentials: UserLogin): Promise<AuthResult> {
    try {
      // Get user by username
      const user = await databaseService.getUserByUsername(credentials.username);
      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(
        credentials.password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Return user (without password hash)
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await databaseService.getClient().query(
        'SELECT id, username, email, created_at FROM users WHERE id = $1',
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await databaseService.getClient().query(
        'SELECT id, username, email, created_at FROM users WHERE username = $1',
        [username]
      );
      const user = result.rows[0];
      return user ?? null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await databaseService.getClient().query(
        'SELECT id, username, email, created_at FROM users WHERE email = $1',
        [email]
      );
      const user = result.rows[0];
      return user ?? null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserCredentials>): Promise<AuthResult> {
    try {
      // Check if username is being changed and if it's already taken
      if (updates.username) {
        const existingUser = await databaseService.getUserByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          return { success: false, error: 'Username already exists' };
        }
      }

      // Check if email is being changed and if it's already taken
      if (updates.email) {
        const existingEmail = await databaseService.getUserByEmail(updates.email);
        if (existingEmail && existingEmail.id !== userId) {
          return { success: false, error: 'Email already exists' };
        }
      }

      // If password is being updated, hash it
      if (updates.password) {
        const passwordHash = await this.hashPassword(updates.password);
        await databaseService.getClient().query(
          'UPDATE users SET username = $1, email = $2, password_hash = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          [updates.username, updates.email, passwordHash, userId]
        );
      } else {
        await databaseService.getClient().query(
          'UPDATE users SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [updates.username, updates.email, userId]
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Update failed' };
    }
  }

  // Delete user
  async deleteUser(userId: string): Promise<AuthResult> {
    try {
      await databaseService.getClient().query('DELETE FROM users WHERE id = $1', [userId]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: 'Deletion failed' };
    }
  }
}

// Export singleton instance
const authService = new AuthService();

export default authService;
