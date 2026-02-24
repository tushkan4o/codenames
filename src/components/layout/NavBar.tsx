import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import type { Language } from '../../types/game';

export default function NavBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
      <button
        onClick={() => navigate('/')}
        className="text-lg font-bold text-white hover:text-blue-400 transition-colors"
      >
        CODENAMES
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/leaderboard')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {t.nav.leaderboard}
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {t.nav.profile}
        </button>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 focus:outline-none"
        >
          <option value="en">EN</option>
          <option value="ru">RU</option>
        </select>

        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {user.displayName}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="text-gray-600 hover:text-red-400 transition-colors"
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
