import { useEffect } from 'react';
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

export default function App() {
  return (
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
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
