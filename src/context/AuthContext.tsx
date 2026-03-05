import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { User } from '../types/user';
import { DEFAULT_PREFERENCES } from '../types/user';

const CURRENT_USER_KEY = 'codenames_current_user';
const CACHED_USER_KEY = 'codenames_cached_user';
const SESSION_CHANNEL = 'codenames_session';
const TAB_SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface AuthContextValue {
  user: User | null;
  evicted: boolean;
  pendingRedirect: string | null;
  clearPendingRedirect: () => void;
  roamingState: Record<string, unknown> | null;
  clearRoamingState: () => void;
  login: (displayName: string, password?: string) => Promise<User>;
  loginWithOAuth: (dbUser: Record<string, unknown>) => User;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  saveSessionState: (url: string, state: Record<string, unknown> | null) => void;
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

interface ClaimResult {
  ok: boolean;
  savedUrl: string | null;
  savedState: Record<string, unknown> | null;
}

async function claimOnServer(userId: string): Promise<ClaimResult> {
  try {
    const res = await fetch('/api/game?route=claim-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sessionId: TAB_SESSION_ID }),
    });
    if (!res.ok) return { ok: false, savedUrl: null, savedState: null };
    return res.json();
  } catch {
    return { ok: false, savedUrl: null, savedState: null };
  }
}

async function checkOnServer(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/game?route=check-session&userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(TAB_SESSION_ID)}`);
    if (!res.ok) return true;
    const data = await res.json();
    return data.active !== false;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [evicted, setEvicted] = useState(false);
  // pendingRedirect: set when server has a different URL to redirect to
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  // roamingState: state from another device/tab, consumed by pages
  const [roamingState, setRoamingState] = useState<Record<string, unknown> | null>(null);

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

  const clearPendingRedirect = useCallback(() => setPendingRedirect(null), []);

  const clearRoamingState = useCallback(() => setRoamingState(null), []);

  /** Save current page URL + state to server (debounced) */
  const saveSessionState = useCallback((url: string, state: Record<string, unknown> | null) => {
    if (!user) return;
    if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    saveStateTimerRef.current = setTimeout(() => {
      saveStateTimerRef.current = null;
      fetch('/api/game?route=save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sessionId: TAB_SESSION_ID, url, state }),
      }).catch(() => {});
    }, 800);
  }, [user?.id]);

  /** Claim session for login flows (no roaming restore) */
  const claimSession = useCallback((userId: string) => {
    setEvicted(false);
    channelRef.current?.postMessage({ type: 'CLAIM', tabId: TAB_SESSION_ID });
    claimOnServer(userId).catch(() => {});
  }, []);

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
    claimSession(localUser.id);
    return localUser;
  }

  function loginWithOAuth(dbUser: Record<string, unknown>): User {
    const localUser = dbUserToLocal(dbUser);
    localStorage.setItem(CURRENT_USER_KEY, localUser.id);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(localUser));
    setUser(localUser);
    claimSession(localUser.id);
    return localUser;
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    setUser(null);
    setEvicted(false);
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
      const merged = { ...fresh, preferences: user.preferences };
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(merged));
      setUser(merged);
    } catch { /* ignore refresh failures */ }
  }

  // BroadcastChannel: instant same-browser eviction
  useEffect(() => {
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (e) => {
      if (e.data?.type === 'CLAIM' && e.data.tabId !== TAB_SESSION_ID) {
        setEvicted(true);
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // On mount with cached user: claim session + check for roaming state
  useEffect(() => {
    if (!user) return;
    setEvicted(false);
    channelRef.current?.postMessage({ type: 'CLAIM', tabId: TAB_SESSION_ID });

    claimOnServer(user.id).then((result) => {
      if (!result.savedUrl || result.savedUrl === '/') return;
      // Store the roaming state for pages to consume
      setRoamingState(result.savedState);
      // If URL differs, trigger a redirect
      const currentPath = window.location.pathname + window.location.search;
      if (result.savedUrl !== currentPath) {
        setPendingRedirect(result.savedUrl);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll server for cross-device eviction detection
  useEffect(() => {
    if (!user) return;

    const pollServer = async () => {
      if (evicted) return;
      const active = await checkOnServer(user.id);
      if (!active) setEvicted(true);
    };

    const interval = setInterval(pollServer, 5000);
    return () => clearInterval(interval);
  }, [user?.id, evicted]);

  return (
    <AuthContext.Provider value={{
      user, evicted, pendingRedirect, clearPendingRedirect,
      roamingState, clearRoamingState,
      login, loginWithOAuth, logout, updateUser, refreshUser,
      saveSessionState,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
