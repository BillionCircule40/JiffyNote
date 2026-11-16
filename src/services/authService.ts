import { apiRequest, AUTH_TOKEN_KEY } from './apiService';

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
  token?: string;
  error?: string;
}

interface StoredUser extends User {
  passwordHash: string;
}

const USERS_KEY = 'jiffynote.auth.users';
const CURRENT_USER_KEY = 'jiffynote.auth.currentUser';

const readStoredUsers = (): StoredUser[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
};

const writeStoredUsers = (users: StoredUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const localAuthFallbackEnabled = process.env.NODE_ENV === 'development'
  || process.env.REACT_APP_ENABLE_LOCAL_AUTH === 'true';

const shouldUseLocalAuth = (error: unknown): boolean =>
  localAuthFallbackEnabled && error instanceof TypeError;

const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return password;
  }

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

class AuthService {
  private sanitizeUser(user: StoredUser): User {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async register(credentials: UserCredentials): Promise<AuthResult> {
    const username = credentials.username.trim();
    const email = credentials.email.trim();
    const password = credentials.password;

    if (!username || !email || !password) {
      return { success: false, error: 'Username, email and password are required.' };
    }

    try {
      const result = await apiRequest<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      }, false);
      this.saveSession(result.user, result.token);
      return { success: true, user: result.user, token: result.token };
    } catch (error) {
      console.error('Registration error:', error);
      if (shouldUseLocalAuth(error)) {
        return this.registerLocally({ username, email, password });
      }
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed.' };
    }
  }

  async login(credentials: UserLogin): Promise<AuthResult> {
    const username = credentials.username.trim();
    const password = credentials.password;

    if (!username || !password) {
      return { success: false, error: 'Username and password are required.' };
    }

    try {
      const result = await apiRequest<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: username, password }),
      }, false);
      this.saveSession(result.user, result.token);
      return { success: true, user: result.user, token: result.token };
    } catch (error) {
      console.error('Login error:', error);
      if (shouldUseLocalAuth(error)) {
        return this.loginLocally({ username, password });
      }
      return { success: false, error: error instanceof Error ? error.message : 'Login failed.' };
    }
  }

  private async registerLocally(credentials: UserCredentials): Promise<AuthResult> {
    try {
      const users = readStoredUsers();
      const username = credentials.username.trim();
      const email = credentials.email.trim().toLowerCase();

      if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, error: 'Username already exists.' };
      }
      if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'Email already exists.' };
      }

      const user: StoredUser = {
        id: crypto.randomUUID(),
        username,
        email,
        passwordHash: await hashPassword(credentials.password),
        created_at: new Date().toISOString(),
      };
      writeStoredUsers([...users, user]);
      const publicUser = this.sanitizeUser(user);
      this.saveSession(publicUser, `local:${user.id}`);
      return { success: true, user: publicUser, token: `local:${user.id}` };
    } catch (error) {
      console.error('Local registration error:', error);
      return { success: false, error: 'Local account could not be saved in this browser.' };
    }
  }

  private async loginLocally(credentials: UserLogin): Promise<AuthResult> {
    try {
      const search = credentials.username.toLowerCase();
      const user = readStoredUsers().find((storedUser) =>
        storedUser.username.toLowerCase() === search || storedUser.email.toLowerCase() === search
      );

      if (!user || await hashPassword(credentials.password) !== user.passwordHash) {
        return { success: false, error: 'No matching local account. Connect the database or create a local account.' };
      }

      const publicUser = this.sanitizeUser(user);
      this.saveSession(publicUser, `local:${user.id}`);
      return { success: true, user: publicUser, token: `local:${user.id}` };
    } catch (error) {
      console.error('Local login error:', error);
      return { success: false, error: 'Local login failed.' };
    }
  }

  logout(): boolean {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return true;
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        localStorage.removeItem(CURRENT_USER_KEY);
        return null;
      }
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private saveSession(user: User, token: string): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  isLocalSession(): boolean {
    return localStorage.getItem(AUTH_TOKEN_KEY)?.startsWith('local:') ?? false;
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserCredentials>,
    currentPassword: string,
  ): Promise<AuthResult> {
    try {
      if (!currentPassword) {
        return { success: false, error: 'Enter your current password to save account changes.' };
      }

      if (updates.password && updates.password.length < 8) {
        return { success: false, error: 'New passwords must be at least 8 characters.' };
      }

      if (!this.isLocalSession()) {
        const result = await apiRequest<{ user: User; token: string }>('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ ...updates, currentPassword }),
        });
        this.saveSession(result.user, result.token);
        return { success: true, user: result.user, token: result.token };
      }

      const users = readStoredUsers();
      const index = users.findIndex((user) => user.id === userId);

      if (index === -1) {
        return { success: false, error: 'User not found.' };
      }

      const currentUser = users[index];
      if (!currentUser) {
        return { success: false, error: 'User not found.' };
      }

      if (await hashPassword(currentPassword) !== currentUser.passwordHash) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      const nextUser: StoredUser = { ...currentUser };

      if (updates.username) {
        const username = updates.username.trim();
        if (!username) {
          return { success: false, error: 'Username cannot be empty.' };
        }
        if (users.some((user) => user.id !== userId && user.username.toLowerCase() === username.toLowerCase())) {
          return { success: false, error: 'Username already exists.' };
        }
        nextUser.username = username;
      }

      if (updates.email) {
        const email = updates.email.trim().toLowerCase();
        if (!email) {
          return { success: false, error: 'Email cannot be empty.' };
        }
        if (users.some((user) => user.id !== userId && user.email.toLowerCase() === email.toLowerCase())) {
          return { success: false, error: 'Email already exists.' };
        }
        nextUser.email = email.toLowerCase();
      }

      if (updates.password) {
        nextUser.passwordHash = await hashPassword(updates.password);
      }

      users[index] = nextUser;
      writeStoredUsers(users);

      const publicUser = this.sanitizeUser(nextUser);
      this.saveSession(publicUser, `local:${userId}`);
      return { success: true, user: publicUser };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Profile update failed.' };
    }
  }
}

const authService = new AuthService();
export default authService;
