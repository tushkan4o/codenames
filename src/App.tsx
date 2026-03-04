import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
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
      <GameProvider>
        <ProfileModal />
        <OAuthHandler />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/register" element={<OAuthRegisterPage />} />
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/setup" element={<RequireAuth><SetupPage /></RequireAuth>} />
          <Route path="/give-clue/:seed" element={<RequireAuth><ClueGivingPage /></RequireAuth>} />
          <Route path="/guess/:clueId" element={<RequireAuth><GuessingPage /></RequireAuth>} />
          <Route path="/results/:clueId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/profile/:userId" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
