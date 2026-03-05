import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';
import type { CardFontSize, ColorSortMode } from '../../types/user';

interface Notification {
  id: number;
  type: string;
  actorId: string;
  actorName: string;
  clueId: string;
  clueWord: string;
  createdAt: number;
  read: boolean;
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

export default function NavBar() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const fetch = () => api.getNotifications(user.id).then(setNotifications).catch(() => {});
    fetch();
    pollRef.current = setInterval(fetch, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showDropdown || showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown, showSettings]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleBellClick() {
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

  function handleNotificationClick(n: Notification) {
    setShowDropdown(false);
    if (n.type === 'profile_comment') {
      navigate('/profile');
    } else if (n.clueId) {
      navigate(`/guess/${n.clueId}`);
    }
  }

  function getNotificationText(n: Notification): string {
    if (n.type === 'new_solve') {
      return t.nav.newSolve.replace('{player}', n.actorName).replace('{clue}', n.clueWord || '');
    }
    if (n.type === 'new_comment') {
      return t.nav.newComment.replace('{player}', n.actorName).replace('{clue}', n.clueWord || '');
    }
    if (n.type === 'mention') {
      return t.nav.newMention.replace('{player}', n.actorName);
    }
    if (n.type === 'profile_comment') {
      return t.nav.newProfileComment.replace('{player}', n.actorName);
    }
    return n.type;
  }

  function handlePrefChange<K extends keyof NonNullable<typeof user>['preferences']>(key: K, value: NonNullable<typeof user>['preferences'][K]) {
    if (!user) return;
    const newPrefs = { ...user.preferences, [key]: value };
    updateUser({ preferences: newPrefs });
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
          <div className="relative" ref={dropdownRef}>
            <button
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

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
                  <span className="text-xs font-semibold text-gray-400 uppercase">{t.nav.notifications}</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-gray-500 hover:text-board-red transition-colors"
                    >
                      {t.nav.clearAll}
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">{t.nav.noNotifications}</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left px-3 py-1.5 border-b border-gray-700/30 hover:bg-gray-700/50 transition-colors flex items-baseline justify-between gap-2 ${!n.read ? 'bg-gray-700/20' : ''}`}
                      >
                        <span className="text-xs text-gray-200 truncate">{getNotificationText(n)}</span>
                        <span className="text-[0.65rem] text-gray-500 shrink-0">{formatTimeAgo(n.createdAt)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings gear */}
        {user && (
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => { setShowSettings((v) => !v); setShowDropdown(false); }}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title={t.nav.settings}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 min-w-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-bold">{t.settings.title}</span>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Font size */}
                <div className="mb-3">
                  <label className="text-gray-400 text-xs mb-1.5 block">{t.settings.cardFontSize}</label>
                  <div className="flex gap-1">
                    {(['sm', 'md', 'lg'] as CardFontSize[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => handlePrefChange('cardFontSize', sz)}
                        className={`w-8 h-8 rounded flex items-center justify-center font-bold transition-colors ${
                          sz === 'sm' ? 'text-[0.65rem]' : sz === 'md' ? 'text-xs' : 'text-sm'
                        } ${user.preferences.cardFontSize === sz ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                        title={t.settings[sz === 'sm' ? 'fontSmall' : sz === 'md' ? 'fontMedium' : 'fontLarge']}
                      >
                        A
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reveal duration */}
                <div className="mb-3">
                  <label className="text-gray-400 text-xs mb-1.5 block">{t.settings.revealDuration}</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const steps = [500, 1000, 1500, 2000];
                        const idx = steps.indexOf(user.preferences.revealDuration);
                        if (idx > 0) handlePrefChange('revealDuration', steps[idx - 1]);
                      }}
                      disabled={user.preferences.revealDuration <= 500}
                      className="w-7 h-7 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-30 transition-colors text-sm font-bold flex items-center justify-center"
                    >
                      ▼
                    </button>
                    <span className="text-white text-sm font-semibold min-w-[3.5rem] text-center">
                      {(user.preferences.revealDuration / 1000).toFixed(1)} {t.settings.sec}
                    </span>
                    <button
                      onClick={() => {
                        const steps = [500, 1000, 1500, 2000];
                        const idx = steps.indexOf(user.preferences.revealDuration);
                        if (idx < steps.length - 1) handlePrefChange('revealDuration', steps[idx + 1]);
                      }}
                      disabled={user.preferences.revealDuration >= 2000}
                      className="w-7 h-7 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white disabled:opacity-30 transition-colors text-sm font-bold flex items-center justify-center"
                    >
                      ▲
                    </button>
                  </div>
                </div>

                {/* Color sort mode */}
                <div className="mb-3">
                  <label className="text-gray-400 text-xs mb-1.5 block">{t.settings.colorSort}</label>
                  <div className="flex gap-1">
                    {(['rows', 'columns'] as ColorSortMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => handlePrefChange('colorSortMode', m)}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${user.preferences.colorSortMode === m ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                        title={m === 'rows' ? t.settings.sortRows : t.settings.sortColumns}
                      >
                        {m === 'rows' ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="1" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.9" />
                            <rect x="1" y="6" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
                            <rect x="1" y="11" width="14" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">{t.settings.animations}</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handlePrefChange('animationEnabled', true)}
                      className={`px-3 h-8 rounded text-xs font-semibold transition-colors ${user.preferences.animationEnabled ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                    >
                      {t.settings.on}
                    </button>
                    <button
                      onClick={() => handlePrefChange('animationEnabled', false)}
                      className={`px-3 h-8 rounded text-xs font-semibold transition-colors ${!user.preferences.animationEnabled ? 'bg-board-blue text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                    >
                      {t.settings.off}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-board-blue hover:text-blue-300 transition-colors font-semibold"
          >
            {user.displayName}
          </button>
        )}
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
      </div>
    </nav>
  );
}
