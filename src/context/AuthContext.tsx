import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types/user';
import { DEFAULT_PREFERENCES } from '../types/user';

const CURRENT_USER_KEY = 'codenames_current_user';
const CACHED_USER_KEY = 'codenames_cached_user';

interface AuthContextValue {
  user: User | null;
  login: (displayName: string, password?: string) => Promise<User>;
  loginWithOAuth: (dbUser: Record<string, unknown>) => User;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function dbUserToLocal(dbUser: Record<string, unknown>): User {
  return {
    id: dbUser.id as string,
    displayName: dbUser.display_name as string,
    createdAt: Number(dbUser.created_at),
    preferences: { ...DEFAULT_PREFERENCES, ...((dbUser.preferences as Record<string, unknown>) || {}) },
    isAdmin: (dbUser.is_admin as boolean) || false,
    hasOAuth: (dbUser.has_oauth as boolean) || false,
    casualCluesGiven: Number(dbUser.casual_clues_given) || 0,
    casualCluesSolved: Number(dbUser.casual_clues_solved) || 0,
    sessionVersion: Number(dbUser.session_version) || 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const userId = localStorage.getItem(CURRENT_USER_KEY);
    if (!userId) return null;
    const cached = localStorage.getItem(CACHED_USER_KEY);
    if (cached) {
      try {
        const u = JSON.parse(cached);
        if (u.preferences) u.preferences = { ...DEFAULT_PREFERENCES, ...u.preferences };
        return u;
      } catch { /* ignore */ }
    }
    return null;
  });

  async function login(displayName: string, password?: string): Promise<User> {
    const preferences = { ...DEFAULT_PREFERENCES };

    const res = await fetch('/api/auth/oauth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim(), preferences, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const dbUser = await res.json();
    const localUser = dbUserToLocal(dbUser);

    localStorage.setItem(CURRENT_USER_KEY, localUser.id);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(localUser));
    setUser(localUser);
    return localUser;
  }

  function loginWithOAuth(dbUser: Record<string, unknown>): User {
    const localUser = dbUserToLocal(dbUser);
    localStorage.setItem(CURRENT_USER_KEY, localUser.id);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(localUser));
    setUser(localUser);
    return localUser;
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    setUser(null);
  }

  function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(updated));
    setUser(updated);
    if (updates.preferences) {
      fetch('/api/auth/oauth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: user.displayName, preferences: updates.preferences, preferencesOnly: true }),
      });
    }
  }

  async function refreshUser() {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/oauth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: user.id, preferencesOnly: true }),
      });
      if (!res.ok) return;
      const dbUser = await res.json();
      const fresh = dbUserToLocal(dbUser);
      // Check session_version mismatch — another device logged in
      if (user.sessionVersion > 0 && fresh.sessionVersion > user.sessionVersion) {
        logout();
        localStorage.setItem('codenames_session_expired', 'true');
        return;
      }
      // Preserve current preferences (local may differ from DB)
      const merged = { ...fresh, preferences: user.preferences };
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(merged));
      setUser(merged);
    } catch { /* ignore refresh failures */ }
  }

  // Check session validity on tab focus
  const checkSession = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/game?route=session&userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (user.sessionVersion > 0 && data.sessionVersion > user.sessionVersion) {
        logout();
        localStorage.setItem('codenames_session_expired', 'true');
      }
    } catch { /* ignore */ }
  }, [user?.id, user?.sessionVersion]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{ user, login, loginWithOAuth, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
