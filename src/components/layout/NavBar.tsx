import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';
import type { CardFontSize, ColorSortMode } from '../../types/user';

interface ScoreInfo { score: number; correctCount: number; totalTargets: number }

interface Notification {
  id: number;
  type: string;
  actorId: string;
  actorName: string;
  clueId: string;
  clueWord: string;
  scoreInfo: ScoreInfo | null;
  createdAt: number;
  read: boolean;
}

interface GroupedNotification {
  key: string;
  clueId: string;
  clueWord: string;
  types: Set<string>;
  count: number;
  latestAt: number;
  read: boolean;
  actorName: string;
  scoreInfo: ScoreInfo | null;
}

interface LinkedAccount {
  provider: string;
  providerName: string;
  email: string | null;
  linkedAt: number;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  return `${days} д`;
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

const REVEAL_STEPS = [500, 1000, 1500, 2000];
const SUBMIT_STEPS = [0, 1000, 2000, 3000];
const SUBMIT_LABELS: Record<number, string> = { 0: '0', 1000: '1', 2000: '2', 3000: '3' };

export default function NavBar() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const gearBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Settings state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [unlinkConfirm, setUnlinkConfirm] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Dropdown position state
  const [bellPos, setBellPos] = useState<{ top: number; right: number; left?: number } | null>(null);
  const [gearPos, setGearPos] = useState<{ top: number; right: number; left?: number } | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by clue
  const groupedNotifications = useMemo(() => {
    const map = new Map<string, GroupedNotification>();
    for (const n of notifications) {
      const key = n.type === 'profile_comment' ? 'profile' : n.type === 'new_clue' ? `new_clue-${n.actorId}` : (n.clueId || `single-${n.id}`);
      const existing = map.get(key);
      if (existing) {
        existing.types.add(n.type);
        existing.count++;
        if (n.createdAt > existing.latestAt) {
          existing.latestAt = n.createdAt;
          existing.actorName = n.actorName;
        }
        if (!n.read) existing.read = false;
      } else {
        map.set(key, {
          key,
          clueId: n.clueId,
          clueWord: n.clueWord,
          types: new Set([n.type]),
          count: 1,
          latestAt: n.createdAt,
          read: n.read,
          actorName: n.actorName,
          scoreInfo: n.scoreInfo,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt);
  }, [notifications]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const fetch = () => api.getNotifications(user.id).then(setNotifications).catch(() => {});
    fetch();
    pollRef.current = setInterval(fetch, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user?.id]);

  // Fetch linked accounts when settings opens
  useEffect(() => {
    if (showSettings && user) {
      api.getOAuthAccounts(user.id).then(setLinkedAccounts).catch(() => {});
    }
  }, [showSettings, user?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(target) && bellBtnRef.current && !bellBtnRef.current.contains(target)) {
        setShowDropdown(false);
      }
      if (showSettings && settingsRef.current && !settingsRef.current.contains(target) && gearBtnRef.current && !gearBtnRef.current.contains(target)) {
        setShowSettings(false);
      }
    }
    if (showDropdown || showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown, showSettings]);

  function computePos(btnRef: React.RefObject<HTMLButtonElement | null>) {
    if (!btnRef.current) return null;
    const rect = btnRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      // On mobile: position below navbar, horizontally centered with padding
      return { top: rect.bottom + 8, right: 16, left: 16 };
    }
    return { top: rect.bottom + 8, right: window.innerWidth - rect.right, left: undefined };
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleBellClick() {
    if (!showDropdown) setBellPos(computePos(bellBtnRef));
    setShowDropdown((v) => !v);
    setShowSettings(false);
    if (!showDropdown && user && unreadCount > 0) {
      await api.markNotificationsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  async function handleClearAll() {
    if (!user) return;
    await api.clearNotifications(user.id);
    setNotifications([]);
    setShowDropdown(false);
  }

  function handleNotificationClick(g: GroupedNotification) {
    setShowDropdown(false);
    if (g.key === 'profile') {
      navigate('/profile');
    } else if (g.clueId) {
      navigate(`/guess/${g.clueId}`);
    }
  }

  function getGroupedText(g: GroupedNotification): string {
    // Single notification — use original format
    if (g.count === 1) {
      if (g.types.has('new_solve')) {
        if (g.scoreInfo) {
          const s = g.scoreInfo;
          return t.nav.newSolveWithScore.replace('{player}', g.actorName).replace('{clue}', g.clueWord || '').replace('{score}', `${s.score}(${s.correctCount}/${s.totalTargets})`);
        }
        return t.nav.newSolve.replace('{player}', g.actorName).replace('{clue}', g.clueWord || '');
      }
      if (g.types.has('new_clue')) return t.nav.newClue.replace('{player}', g.actorName).replace('{clue}', g.clueWord || '');
      if (g.types.has('new_comment')) return t.nav.newComment.replace('{player}', g.actorName).replace('{clue}', g.clueWord || '');
      if (g.types.has('mention')) return t.nav.newMention.replace('{player}', g.actorName);
      if (g.types.has('profile_comment')) return t.nav.newProfileComment.replace('{player}', g.actorName);
      return g.actorName;
    }
    // Grouped — profile comments
    if (g.key === 'profile') return `${t.nav.groupProfileComments} (${g.count})`;
    // Grouped — new clues from subscribed player
    if (g.types.size === 1 && g.types.has('new_clue')) return `${t.nav.groupNewClues.replace('{player}', g.actorName)} (${g.count})`;
    // Grouped — clue-based
    const hasSolves = g.types.has('new_solve');
    const hasComments = g.types.has('new_comment') || g.types.has('mention');
    let text: string;
    if (hasSolves && hasComments) text = t.nav.groupSolvesAndComments.replace('{clue}', g.clueWord || '');
    else if (hasSolves) text = t.nav.groupSolves.replace('{clue}', g.clueWord || '');
    else if (g.types.has('mention')) text = t.nav.groupMentions.replace('{clue}', g.clueWord || '');
    else text = t.nav.groupComments.replace('{clue}', g.clueWord || '');
    return `${text} (${g.count})`;
  }

  function handlePrefChange<K extends keyof NonNullable<typeof user>['preferences']>(key: K, value: NonNullable<typeof user>['preferences'][K]) {
    if (!user) return;
    const newPrefs = { ...user.preferences, [key]: value };
    updateUser({ preferences: newPrefs });
  }

  function handleGearClick() {
    if (!showSettings) setGearPos(computePos(gearBtnRef));
    setShowSettings((v) => !v);
    setShowDropdown(false);
  }

  async function handleLinkOAuth(provider: string) {
    if (!user) return;
    const { url } = await api.getOAuthUrl(provider, user.id);
    window.location.href = url;
  }

  async function handleUnlinkOAuth(provider: string) {
    if (!user) return;
    await api.unlinkOAuth(user.id, provider);
    setLinkedAccounts((prev) => prev.filter((a) => a.provider !== provider));
    setUnlinkConfirm(null);
  }

  async function handleRename() {
    if (!user) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) { setNameError(t.login.errorShort); return; }
    if (trimmed.length > 20) { setNameError(t.login.errorLong); return; }
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) { setNameError(t.login.errorChars); return; }
    setNameSaving(true);
    try {
      await api.renameUser(user.id, trimmed);
      updateUser({ displayName: trimmed });
      setEditingName(false);
      setNameError('');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Error');
    } finally {
      setNameSaving(false);
    }
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800/50 backdrop-blur-sm">
      <button
        onClick={() => navigate('/')}
        className="text-lg font-extrabold text-white hover:text-board-blue transition-colors tracking-tight"
      >
        CODENAMES
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        {user?.isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors font-semibold"
          >
            {t.nav.admin}
          </button>
        )}

        {/* Notification bell */}
        {user && (
          <>
            <button
              ref={bellBtnRef}
              onClick={handleBellClick}
              className="relative text-gray-400 hover:text-white transition-colors p-1"
              title={t.nav.notifications}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-board-red text-white text-[0.6rem] font-bold rounded-full min-w-[1rem] h-4 flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showDropdown && bellPos && createPortal(
              <div
                ref={dropdownRef}
                className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden sm:w-80 sm:max-w-sm"
                style={{ top: bellPos.top, right: bellPos.right, left: bellPos.left }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
                  <span className="text-xs font-semibold text-gray-400 uppercase">{t.nav.notifications}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowDropdown(false); navigate('/notifications'); }}
                      className="text-xs text-gray-500 hover:text-board-blue transition-colors"
                    >
                      {t.nav.viewAll}
                    </button>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-xs text-gray-500 hover:text-board-red transition-colors"
                      >
                        {t.nav.clearAll}
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {groupedNotifications.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">{t.nav.noNotifications}</p>
                  ) : (
                    groupedNotifications.map((g) => (
                      <button
                        key={g.key}
                        onClick={() => handleNotificationClick(g)}
                        className={`w-full text-left px-3 py-1.5 border-b border-gray-700/30 hover:bg-gray-700/50 transition-colors flex items-baseline justify-between gap-2 ${!g.read ? 'bg-gray-700/20' : ''}`}
                      >
                        <span className="text-xs text-gray-200 truncate">{getGroupedText(g)}</span>
                        <span className="text-[0.65rem] text-gray-500 shrink-0">{formatTimeAgo(g.latestAt)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>,
              document.body,
            )}
          </>
        )}

        {/* Settings gear */}
        {user && (
          <>
            <button
              ref={gearBtnRef}
              onClick={handleGearClick}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title={t.nav.settings}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            {showSettings && gearPos && createPortal(
              <div
                ref={settingsRef}
                className="fixed z-[9999] bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 sm:min-w-[280px] max-h-[80vh] overflow-y-auto"
                style={{ top: gearPos.top, right: gearPos.right, left: gearPos.left }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-bold">{t.settings.title}</span>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* === General === */}
                <div className="mb-3">
                  <h3 className="text-[0.65rem] font-bold text-gray-500 uppercase mb-1.5">{t.settings.general}</h3>
                  <div className="space-y-2">
                    {/* Nickname */}
                    {user.hasOAuth ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300">{t.settings.nickname}</span>
                          {editingName ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newName}
                                onChange={(e) => { setNewName(e.target.value); setNameError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditingName(false); setNameError(''); } }}
                                autoFocus
                                className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-600 text-white text-xs font-bold focus:outline-none focus:border-board-blue w-28"
                              />
                              <button onClick={handleRename} disabled={nameSaving} className="text-board-blue hover:text-blue-300 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                              </button>
                              <button onClick={() => { setEditingName(false); setNameError(''); }} className="text-gray-400 hover:text-white transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingName(true); setNewName(user.displayName); }}
                              className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                            >
                              {user.displayName}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                          )}
                        </div>
                        {nameError && <p className="text-board-red text-[0.65rem]">{nameError}</p>}
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">{t.settings.nickname}</span>
                        <span className="text-xs text-gray-500">{user.displayName}</span>
                      </div>
                    )}
                    {/* Font size */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{t.settings.cardFontSize}</span>
                      <div className="flex gap-1">
                        {(['sm', 'md', 'lg'] as CardFontSize[]).map((sz) => (
                          <button
                            key={sz}
                            onClick={() => handlePrefChange('cardFontSize', sz)}
                            className={`w-7 h-7 rounded flex items-center justify-center font-bold transition-colors ${
                              sz === 'sm' ? 'text-[0.65rem]' : sz === 'md' ? 'text-xs' : 'text-sm'
                            } ${user.preferences.cardFontSize === sz ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                            title={t.settings[sz === 'sm' ? 'fontSmall' : sz === 'md' ? 'fontMedium' : 'fontLarge']}
                          >
                            A
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* === Game Modes === */}
                <div className="mb-3">
                  <h3 className="text-[0.65rem] font-bold text-gray-500 uppercase mb-1.5">{t.settings.gameModes}</h3>
                  <div className="space-y-2">
                    {/* Reveal duration */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{t.settings.revealDuration}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const idx = REVEAL_STEPS.indexOf(user.preferences.revealDuration);
                            if (idx > 0) handlePrefChange('revealDuration', REVEAL_STEPS[idx - 1]);
                          }}
                          disabled={user.preferences.revealDuration <= 500}
                          className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-30 transition-colors text-xs font-bold flex items-center justify-center"
                        >
                          ▼
                        </button>
                        <span className="text-white text-xs font-semibold min-w-[2.5rem] text-center">
                          {(user.preferences.revealDuration / 1000).toFixed(1)} {t.settings.sec}
                        </span>
                        <button
                          onClick={() => {
                            const idx = REVEAL_STEPS.indexOf(user.preferences.revealDuration);
                            if (idx < REVEAL_STEPS.length - 1) handlePrefChange('revealDuration', REVEAL_STEPS[idx + 1]);
                          }}
                          disabled={user.preferences.revealDuration >= 2000}
                          className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-30 transition-colors text-xs font-bold flex items-center justify-center"
                        >
                          ▲
                        </button>
                      </div>
                    </div>

                    {/* Submit delay */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{t.settings.submitDelay}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const idx = SUBMIT_STEPS.indexOf(user.preferences.submitDelay);
                            if (idx > 0) handlePrefChange('submitDelay', SUBMIT_STEPS[idx - 1]);
                          }}
                          disabled={user.preferences.submitDelay <= 0}
                          className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-30 transition-colors text-xs font-bold flex items-center justify-center"
                        >
                          ▼
                        </button>
                        <span className="text-white text-xs font-semibold min-w-[2.5rem] text-center">
                          {SUBMIT_LABELS[user.preferences.submitDelay] || (user.preferences.submitDelay / 1000).toFixed(0)} {t.settings.sec}
                        </span>
                        <button
                          onClick={() => {
                            const idx = SUBMIT_STEPS.indexOf(user.preferences.submitDelay);
                            if (idx < SUBMIT_STEPS.length - 1) handlePrefChange('submitDelay', SUBMIT_STEPS[idx + 1]);
                          }}
                          disabled={user.preferences.submitDelay >= 3000}
                          className="w-6 h-6 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-30 transition-colors text-xs font-bold flex items-center justify-center"
                        >
                          ▲
                        </button>
                      </div>
                    </div>

                    {/* Color sort mode */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{t.settings.colorSort}</span>
                      <div className="flex gap-1">
                        {(['rows', 'columns'] as ColorSortMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => handlePrefChange('colorSortMode', m)}
                            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${user.preferences.colorSortMode === m ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                            title={m === 'rows' ? t.settings.sortRows : t.settings.sortColumns}
                          >
                            {m === 'rows' ? (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <rect x="1" y="1" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.9" />
                                <rect x="1" y="6" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
                                <rect x="1" y="11" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <rect x="1" y="1" width="3" height="14" rx="0.5" fill="currentColor" opacity="0.9" />
                                <rect x="6" y="1" width="3" height="14" rx="0.5" fill="currentColor" opacity="0.5" />
                                <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" opacity="0.3" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animations */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">{t.settings.animations}</span>
                      <button
                        onClick={() => handlePrefChange('animationEnabled', !user.preferences.animationEnabled)}
                        className={`px-2.5 h-7 rounded text-xs font-semibold transition-colors ${user.preferences.animationEnabled ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400'}`}
                      >
                        {user.preferences.animationEnabled ? t.settings.on : t.settings.off}
                      </button>
                    </div>
                  </div>
                </div>

                {/* === Linked Accounts === */}
                <div>
                  <h3 className="text-[0.65rem] font-bold text-gray-500 uppercase mb-1.5">{t.oauth.linkedAccounts}</h3>
                  <div className="space-y-1.5">
                    {(['google', 'discord'] as const).map((provider) => {
                      const account = linkedAccounts.find((a) => a.provider === provider);
                      const Icon = provider === 'google' ? GoogleIcon : DiscordIcon;
                      return (
                        <div key={provider} className="flex items-center justify-between bg-gray-900/60 border border-gray-700/30 rounded-lg px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon size={16} />
                            <span className="font-semibold text-xs text-white">{provider === 'google' ? 'Google' : 'Discord'}</span>
                            {account && <span className="text-[0.65rem] text-gray-500 truncate">{account.providerName || account.email || t.oauth.linked}</span>}
                          </div>
                          {account ? (
                            unlinkConfirm === provider ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleUnlinkOAuth(provider)} className="px-1.5 py-0.5 text-[0.65rem] font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                                <button onClick={() => setUnlinkConfirm(null)} className="px-1.5 py-0.5 text-[0.65rem] font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                              </div>
                            ) : (
                              <button onClick={() => setUnlinkConfirm(provider)} className="px-2 py-0.5 text-[0.65rem] font-bold text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                                {t.oauth.unlink}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleLinkOAuth(provider)}
                              className="px-2 py-0.5 text-[0.65rem] font-bold text-white bg-board-blue hover:brightness-110 rounded transition-colors"
                            >
                              {t.oauth.link}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>,
              document.body,
            )}
          </>
        )}

        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-board-blue hover:text-blue-300 transition-colors font-semibold"
          >
            {user.displayName}
          </button>
        )}
        {user && (
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-board-red transition-colors"
            title={t.nav.logout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </nav>
  );
}
