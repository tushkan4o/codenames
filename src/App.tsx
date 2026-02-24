import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import ClueGivingPage from './pages/ClueGivingPage';
import GuessingPage from './pages/GuessingPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/setup" element={<RequireAuth><SetupPage /></RequireAuth>} />
          <Route path="/give-clue/:seed" element={<RequireAuth><ClueGivingPage /></RequireAuth>} />
          <Route path="/guess/:clueId" element={<RequireAuth><GuessingPage /></RequireAuth>} />
          <Route path="/results/:clueId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/profile/:userId" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
