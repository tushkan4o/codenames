import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';

interface NavBarProps {
  showBack?: boolean;
}

export default function NavBar({ showBack }: NavBarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-gray-800/50 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <button
          onClick={() => navigate('/')}
          className="text-lg font-extrabold text-white hover:text-board-blue transition-colors tracking-tight"
        >
          CODENAMES
        </button>
      </div>

      <div className="flex items-center gap-3">
        {user?.isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors font-semibold"
          >
            {t.nav.admin}
          </button>
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
