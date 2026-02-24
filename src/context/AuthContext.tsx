import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types/user';
import { DEFAULT_PREFERENCES } from '../types/user';

const USERS_KEY = 'codenames_users';
const CURRENT_USER_KEY = 'codenames_current_user';

function getStoredUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

interface AuthContextValue {
  user: User | null;
  login: (displayName: string) => User;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const userId = localStorage.getItem(CURRENT_USER_KEY);
    if (!userId) return null;
    const users = getStoredUsers();
    return users.find((u) => u.id === userId) ?? null;
  });

  function login(displayName: string): User {
    const id = displayName.trim().toLowerCase();
    const users = getStoredUsers();
    let existing = users.find((u) => u.id === id);

    if (!existing) {
      existing = {
        id,
        displayName: displayName.trim(),
        createdAt: Date.now(),
        preferences: { ...DEFAULT_PREFERENCES },
      };
      users.push(existing);
      saveUsers(users);
    }

    localStorage.setItem(CURRENT_USER_KEY, id);
    setUser(existing);
    return existing;
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }

  function updateUser(updates: Partial<User>) {
    if (!user) return;
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) return;
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    saveUsers(users);
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
