import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import FeedbackModal from '../components/shared/FeedbackModal';
import type { UserStats } from '../types/user';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, saveSessionState } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (user) {
      // Client-side cache: skip API call if fresh stats exist in sessionStorage
      const cacheKey = `codenames_stats_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < 120000) { // 2-minute TTL
            setStats(data);
            saveSessionState('/', null);
            return;
          }
        } catch { /* ignore */ }
      }
      api.getUserStats(user.id).then((data) => {
        setStats(data);
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      });
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
          <button
            onClick={() => navigate('/faq')}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
          >
            {t.home.faq}
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
          >
            {t.home.feedback}
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

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
