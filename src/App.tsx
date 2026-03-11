import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { GameProvider } from './context/GameContext';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import ProfileModal from './components/profile/ProfileModal';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import ClueGivingPage from './pages/ClueGivingPage';
import GuessingPage from './pages/GuessingPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import OAuthRegisterPage from './pages/OAuthRegisterPage';
import TutorialPage from './pages/TutorialPage';
import FaqPage from './pages/FaqPage';
import NotificationsPage from './pages/NotificationsPage';

function EvictionBanner() {
  const { evicted, user } = useAuth();
  if (!evicted || !user) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 max-w-sm text-center">
        <p className="text-amber-400 text-lg font-bold mb-2">Сессия активна в другом месте</p>
        <p className="text-gray-300 text-sm mb-6">Другая вкладка или устройство перехватили вашу сессию.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold transition-colors"
        >
          Переподключиться
        </button>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoamingRedirectHandler() {
  const { pendingRedirect, clearPendingRedirect } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingRedirect) return;
    clearPendingRedirect();
    navigate(pendingRedirect, { replace: true });
  }, [pendingRedirect, clearPendingRedirect, navigate]);

  return null;
}

function OAuthHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithOAuth } = useAuth();

  useEffect(() => {
    const oauthType = searchParams.get('oauth');
    const token = searchParams.get('token');

    if (!oauthType) return;

    if (oauthType === 'success' && token) {
      // Existing user — resolve token to get user data
      api.resolveOAuthToken(token).then((dbUser) => {
        loginWithOAuth(dbUser);
        setSearchParams({}, { replace: true });
        navigate('/', { replace: true });
      }).catch(() => {
        setSearchParams({}, { replace: true });
        navigate('/login?oauth=error', { replace: true });
      });
    } else if (oauthType === 'linked' || oauthType === 'already_linked') {
      // Profile link success
      setSearchParams({}, { replace: true });
      navigate('/profile', { replace: true });
    } else if (oauthType === 'error') {
      console.error('OAuth error');
      setSearchParams({}, { replace: true });
      navigate('/login', { replace: true });
    } else {
      // Unknown
      setSearchParams({}, { replace: true });
    }
  }, []);

  return null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; info: string }> {
  state: { error: Error | null; info: string } = { error: null, info: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack || '' });
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-board-bg flex items-center justify-center p-6">
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full text-center">
            <p className="text-board-red text-lg font-bold mb-2">Произошла ошибка</p>
            <p className="text-gray-300 text-sm mb-4">Попробуйте обновить страницу. Если ошибка повторяется, очистите данные сайта.</p>
            <div className="bg-gray-900/60 rounded-lg p-3 mb-4 text-left overflow-auto max-h-48">
              <p className="text-red-400 text-xs font-mono break-all">{this.state.error.message}</p>
              {this.state.info && (
                <pre className="text-gray-500 text-[0.65rem] font-mono mt-2 whitespace-pre-wrap">{this.state.info}</pre>
              )}
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold text-sm transition-colors"
              >
                Обновить
              </button>
              <button
                onClick={() => {
                  Object.keys(localStorage).filter((k) => k.startsWith('codenames_')).forEach((k) => localStorage.removeItem(k));
                  window.location.href = '/login';
                }}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold text-sm transition-colors"
              >
                Очистить данные
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Analytics />
        <GameProvider>
          <EvictionBanner />
          <ProfileModal />
          <OAuthHandler />
          <RoamingRedirectHandler />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/oauth/register" element={<OAuthRegisterPage />} />
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/setup" element={<RequireAuth><SetupPage /></RequireAuth>} />
            <Route path="/give-clue" element={<RequireAuth><ClueGivingPage /></RequireAuth>} />
            <Route path="/guess/:clueId" element={<RequireAuth><GuessingPage /></RequireAuth>} />
            <Route path="/results/:clueId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
            <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/profile/:userId" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/faq" element={<RequireAuth><FaqPage /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          </Routes>
        </GameProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
