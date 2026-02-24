import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { mockApi } from '../mock/mockApi';
import NavBar from '../components/layout/NavBar';

export default function ResultsPage() {
  const { clueId } = useParams<{ clueId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<{ attempts: number; avgScore: number } | null>(null);

  useEffect(() => {
    async function load() {
      if (!clueId) return;
      const s = await mockApi.getClueStats(clueId);
      setStats(s);
    }
    load();
  }, [clueId]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="flex flex-col items-center justify-center px-4 pt-20 gap-6">
        <h1 className="text-3xl font-bold text-white">{t.results.title}</h1>

        {stats ? (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">Total attempts</p>
            <p className="text-3xl font-bold text-white">{stats.attempts}</p>
            <p className="text-gray-400 text-sm mt-4">{t.leaderboard.avgScore}</p>
            <p className="text-3xl font-bold text-white">
              {stats.attempts > 0 ? stats.avgScore : 'N/A'}
            </p>
          </div>
        ) : (
          <p className="text-gray-400">{t.game.loading}</p>
        )}

        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
        >
          {t.results.backHome}
        </button>
      </div>
    </div>
  );
}
