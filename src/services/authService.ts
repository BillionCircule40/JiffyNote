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
    try {
      const username = credentials.username.trim();
      const email = credentials.email.trim();
      const password = credentials.password.trim();

      if (!username || !email || !password) {
        return { success: false, error: 'Username, email and password are required.' };
      }

      const users = readStoredUsers();
      const usernameMatch = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
      const emailMatch = users.find((user) => user.email.toLowerCase() === email.toLowerCase());

      if (usernameMatch) {
        return { success: false, error: 'Username already exists.' };
      }

      if (emailMatch) {
        return { success: false, error: 'Email already exists.' };
      }

      const user: StoredUser = {
        id: crypto.randomUUID(),
        username,
        email,
        passwordHash: await hashPassword(password),
        created_at: new Date().toISOString(),
      };

      const nextUsers = [...users, user];
      writeStoredUsers(nextUsers);
      const publicUser = this.sanitizeUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
      return { success: true, user: publicUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed.' };
    }
  }

  async login(credentials: UserLogin): Promise<AuthResult> {
    try {
      const username = credentials.username.trim();
      const password = credentials.password.trim();

      if (!username || !password) {
        return { success: false, error: 'Username and password are required.' };
      }

      const users = readStoredUsers();
      const user = users.find(
        (storedUser) =>
          storedUser.username.toLowerCase() === username.toLowerCase() ||
          storedUser.email.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        return { success: false, error: 'Invalid username or password.' };
      }

      const passwordHash = await hashPassword(password);
      if (passwordHash !== user.passwordHash) {
        return { success: false, error: 'Invalid username or password.' };
      }

      const publicUser = this.sanitizeUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
      return { success: true, user: publicUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed.' };
    }
  }

  logout(): boolean {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
      return true;
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserCredentials>): Promise<AuthResult> {
    try {
      const users = readStoredUsers();
      const index = users.findIndex((user) => user.id === userId);

      if (index === -1) {
        return { success: false, error: 'User not found.' };
      }

      const currentUser = users[index];
      if (!currentUser) {
        return { success: false, error: 'User not found.' };
      }

      const nextUser: StoredUser = { ...currentUser };

      if (updates.username) {
        const username = updates.username.trim();
        if (users.some((user) => user.id !== userId && user.username.toLowerCase() === username.toLowerCase())) {
          return { success: false, error: 'Username already exists.' };
        }
        nextUser.username = username;
      }

      if (updates.email) {
        const email = updates.email.trim();
        if (users.some((user) => user.id !== userId && user.email.toLowerCase() === email.toLowerCase())) {
          return { success: false, error: 'Email already exists.' };
        }
        nextUser.email = email;
      }

      if (updates.password) {
        nextUser.passwordHash = await hashPassword(updates.password);
      }

      users[index] = nextUser;
      writeStoredUsers(users);

      const publicUser = this.sanitizeUser(nextUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));
      return { success: true, user: publicUser };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Profile update failed.' };
    }
  }
}

const authService = new AuthService();
export default authService;
