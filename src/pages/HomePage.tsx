import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import type { UserStats } from '../types/user';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, saveSessionState } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (user) {
      api.getUserStats(user.id).then(setStats);
      saveSessionState('/', null);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="flex flex-col items-center justify-center px-4 pt-10">
        <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">{t.app.title}</h1>
        <p className="text-gray-400 mb-10">{t.app.subtitle}</p>

        <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
          <button
            onClick={() => navigate('/setup')}
            className="w-full py-3 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors"
          >
            {t.home.startGame}
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
          >
            {t.nav.leaderboard}
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
          >
            {t.nav.profile}
          </button>
          <button
            onClick={() => navigate('/tutorial')}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
          >
            {t.tutorial.title}
          </button>
        </div>

        {stats && (stats.cluesGiven > 0 || stats.cluesSolved > 0) && (
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stats.cluesGiven}</p>
              <p className="text-xs text-gray-500">{t.home.cluesGiven}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.cluesSolved}</p>
              <p className="text-xs text-gray-500">{t.home.cluesSolved}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
