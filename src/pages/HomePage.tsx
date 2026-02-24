import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { mockApi } from '../mock/mockApi';
import NavBar from '../components/layout/NavBar';
import type { UserStats } from '../types/user';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (user) {
      mockApi.getUserStats(user.id).then(setStats);
    }
  }, [user]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">{t.app.title}</h1>
        <p className="text-gray-400 mb-10">{t.app.subtitle}</p>

        <button
          onClick={() => navigate('/setup')}
          className="px-12 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl transition-colors mb-8"
        >
          {t.home.startGame}
        </button>

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
