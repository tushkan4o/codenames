import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { mockApi } from '../mock/mockApi';
import NavBar from '../components/layout/NavBar';

type Tab = 'spymasters' | 'guessers';

interface SpymasterEntry {
  userId: string;
  cluesGiven: number;
  avgWordsPerClue: number;
  avgScoreOnClues: number;
}

interface GuesserEntry {
  userId: string;
  cluesSolved: number;
  avgWordsPicked: number;
  avgScore: number;
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('spymasters');
  const [spymasters, setSpymasters] = useState<SpymasterEntry[]>([]);
  const [guessers, setGuessers] = useState<GuesserEntry[]>([]);

  useEffect(() => {
    mockApi.getLeaderboard().then((data) => {
      setSpymasters(data.spymasters);
      setGuessers(data.guessers);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">{t.leaderboard.title}</h1>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setTab('spymasters')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'spymasters'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.leaderboard.spymasters}
          </button>
          <button
            onClick={() => setTab('guessers')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'guessers'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.leaderboard.guessers}
          </button>
        </div>

        {tab === 'spymasters' && (
          spymasters.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="py-2 text-left">{t.leaderboard.rank}</th>
                  <th className="py-2 text-left">{t.leaderboard.player}</th>
                  <th className="py-2 text-right">{t.leaderboard.cluesGiven}</th>
                  <th className="py-2 text-right">{t.leaderboard.avgWordsPerClue}</th>
                  <th className="py-2 text-right">{t.leaderboard.avgScoreOnClues}</th>
                </tr>
              </thead>
              <tbody>
                {spymasters.map((s, i) => (
                  <tr key={s.userId} className="border-b border-gray-800 text-gray-300">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 font-semibold">{s.userId}</td>
                    <td className="py-2 text-right">{s.cluesGiven}</td>
                    <td className="py-2 text-right">{s.avgWordsPerClue}</td>
                    <td className="py-2 text-right">{s.avgScoreOnClues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'guessers' && (
          guessers.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="py-2 text-left">{t.leaderboard.rank}</th>
                  <th className="py-2 text-left">{t.leaderboard.player}</th>
                  <th className="py-2 text-right">{t.leaderboard.cluesSolved}</th>
                  <th className="py-2 text-right">{t.leaderboard.avgWordsPicked}</th>
                  <th className="py-2 text-right">{t.leaderboard.avgScore}</th>
                </tr>
              </thead>
              <tbody>
                {guessers.map((g, i) => (
                  <tr key={g.userId} className="border-b border-gray-800 text-gray-300">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 font-semibold">{g.userId}</td>
                    <td className="py-2 text-right">{g.cluesSolved}</td>
                    <td className="py-2 text-right">{g.avgWordsPicked}</td>
                    <td className="py-2 text-right">{g.avgScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
