import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { mockApi } from '../mock/mockApi';
import NavBar from '../components/layout/NavBar';
import type { Clue, GuessResult } from '../types/game';
import type { UserStats } from '../types/user';

type Tab = 'given' | 'solved';

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();

  const profileId = paramUserId || user?.id || '';
  const [stats, setStats] = useState<UserStats | null>(null);
  const [cluesGiven, setCluesGiven] = useState<Clue[]>([]);
  const [resultsSolved, setResultsSolved] = useState<GuessResult[]>([]);
  const [tab, setTab] = useState<Tab>('given');

  useEffect(() => {
    if (!profileId) return;
    mockApi.getUserStats(profileId).then(setStats);
    mockApi.getCluesByUser(profileId).then(setCluesGiven);
    mockApi.getResultsByUser(profileId).then(setResultsSolved);
  }, [profileId]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-bold text-white mb-1 text-center">{t.profile.title}</h1>
        <p className="text-center text-gray-400 mb-6">{profileId}</p>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <p className="text-2xl font-bold text-white">{stats.cluesGiven}</p>
              <p className="text-xs text-gray-400">{t.profile.cluesGiven}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <p className="text-2xl font-bold text-white">{stats.cluesSolved}</p>
              <p className="text-xs text-gray-400">{t.profile.cluesSolved}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <p className="text-2xl font-bold text-yellow-400">{stats.avgScore}</p>
              <p className="text-xs text-gray-400">{t.leaderboard.avgScore}</p>
            </div>
          </div>
        )}

        {/* History tabs */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setTab('given')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'given'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.profile.givenTab}
          </button>
          <button
            onClick={() => setTab('solved')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'solved'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.profile.solvedTab}
          </button>
        </div>

        {tab === 'given' && (
          cluesGiven.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesGiven}</p>
          ) : (
            <div className="space-y-3">
              {cluesGiven.map((clue) => (
                <div
                  key={clue.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white uppercase">{clue.word}</span>
                    <span className="ml-2 text-yellow-400 font-bold">{clue.number}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      {clue.boardSize} &middot; {clue.wordPack} &middot;{' '}
                      {new Date(clue.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {clue.targetIndices.length} targets
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'solved' && (
          resultsSolved.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesSolved}</p>
          ) : (
            <div className="space-y-3">
              {resultsSolved.map((result, i) => (
                <div
                  key={i}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm text-gray-300">Clue: {result.clueId.slice(0, 20)}...</span>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.guessedIndices.length} words picked &middot;{' '}
                      {new Date(result.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-yellow-400">{result.score ?? 0}</span>
                    <p className="text-xs text-gray-500">
                      {result.correctCount}/{result.totalTargets}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
