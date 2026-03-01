import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import type { BoardSize } from '../types/game';

type Tab = 'spymasters' | 'guessers';
type SizeFilter = 'all' | BoardSize;

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
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('spymasters');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [spymasters, setSpymasters] = useState<SpymasterEntry[]>([]);
  const [guessers, setGuessers] = useState<GuesserEntry[]>([]);

  const loadData = useCallback(async (size: SizeFilter) => {
    const boardSize = size === 'all' ? undefined : size;
    const data = await api.getLeaderboard(boardSize);
    setSpymasters(data.spymasters);
    setGuessers(data.guessers);
  }, []);

  useEffect(() => {
    loadData(sizeFilter);
  }, [sizeFilter, loadData]);
  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">{t.leaderboard.title}</h1>

        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setTab('spymasters')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'spymasters'
                ? 'bg-board-blue text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.leaderboard.spymasters}
          </button>
          <button
            onClick={() => setTab('guessers')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'guessers'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.leaderboard.guessers}
          </button>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {(['all', '4x4', '5x5'] as SizeFilter[]).map((size) => (
            <button
              key={size}
              onClick={() => setSizeFilter(size)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                sizeFilter === size
                  ? 'bg-board-blue text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {size === 'all' ? t.leaderboard.allSizes : size.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === 'spymasters' && (
          spymasters.length === 0 ? (
            <p className="text-center text-gray-500">{t.leaderboard.noData}</p>
          ) : (
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className="py-2 text-left w-[8%]">{t.leaderboard.rank}</th>
                  <th className="py-2 text-left w-[30%]">{t.leaderboard.player}</th>
                  <th className="py-2 text-right w-[18%]">{t.leaderboard.cluesGiven}</th>
                  <th className="py-2 text-right w-[22%]">{t.leaderboard.avgWordsPerClue}</th>
                  <th className="py-2 text-right w-[22%]">{t.leaderboard.avgScoreOnClues}</th>
                </tr>
              </thead>
              <tbody>
                {spymasters.map((s, i) => (
                  <tr key={s.userId} className="border-b border-gray-800/50 text-gray-300">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 font-semibold truncate">
                      <button onClick={() => navigate(`/profile/${s.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{s.userId}</button>
                    </td>
                    <td className="py-2 text-right">{s.cluesGiven}</td>
                    <td className="py-2 text-right">{s.avgWordsPerClue.toFixed(2)}</td>
                    <td className="py-2 text-right">{s.avgScoreOnClues.toFixed(2)}</td>
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
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className="py-2 text-left w-[8%]">{t.leaderboard.rank}</th>
                  <th className="py-2 text-left w-[30%]">{t.leaderboard.player}</th>
                  <th className="py-2 text-right w-[18%]">{t.leaderboard.cluesSolved}</th>
                  <th className="py-2 text-right w-[22%]">{t.leaderboard.avgWordsPicked}</th>
                  <th className="py-2 text-right w-[22%]">{t.leaderboard.avgScore}</th>
                </tr>
              </thead>
              <tbody>
                {guessers.map((g, i) => (
                  <tr key={g.userId} className="border-b border-gray-800/50 text-gray-300">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 font-semibold truncate">
                      <button onClick={() => navigate(`/profile/${g.userId}`)} className="text-board-blue hover:text-blue-300 transition-colors">{g.userId}</button>
                    </td>
                    <td className="py-2 text-right">{g.cluesSolved}</td>
                    <td className="py-2 text-right">{g.avgWordsPicked.toFixed(2)}</td>
                    <td className="py-2 text-right">{g.avgScore.toFixed(2)}</td>
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
