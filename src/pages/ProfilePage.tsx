import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import BoardReviewModal from '../components/game/BoardReviewModal';
import type { Clue, GuessResult } from '../types/game';
import type { UserStats } from '../types/user';

type Tab = 'given' | 'solved';

interface SolvedEntry {
  result: GuessResult;
  clue: Clue | null;
}

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const profileId = paramUserId || user?.id || '';
  const isOwnProfile = profileId === user?.id;
  const [stats, setStats] = useState<UserStats | null>(null);
  const [cluesGiven, setCluesGiven] = useState<Clue[]>([]);
  const [solvedEntries, setSolvedEntries] = useState<SolvedEntry[]>([]);
  const [mySolvedClueIds, setMySolvedClueIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('given');
  const [modalClue, setModalClue] = useState<Clue | null>(null);
  const [modalResult, setModalResult] = useState<GuessResult | undefined>(undefined);

  useEffect(() => {
    if (!profileId) return;
    api.getUserStats(profileId).then(setStats);
    api.getCluesByUser(profileId).then(setCluesGiven);
    api.getResultsByUser(profileId).then(async (results) => {
      const entries = await Promise.all(
        results.map(async (result) => {
          const clue = await api.getClueById(result.clueId);
          return { result, clue };
        }),
      );
      setSolvedEntries(entries);
    });
    // Load current user's solved clue IDs
    if (user) {
      api.getResultsByUser(user.id).then((results) => {
        setMySolvedClueIds(new Set(results.map((r) => r.clueId)));
      });
    }
  }, [profileId, user]);

  function canRevealClue(clue: Clue): boolean {
    if (isOwnProfile) return true;
    if (clue.userId === user?.id) return true; // my own clue on someone else's profile
    return mySolvedClueIds.has(clue.id);
  }

  function openGivenModal(clue: Clue) {
    if (!canRevealClue(clue)) return;
    setModalClue(clue);
    setModalResult(undefined);
  }

  function openSolvedModal(entry: SolvedEntry) {
    if (!entry.clue) return;
    if (!canRevealClue(entry.clue)) return;
    setModalClue(entry.clue);
    setModalResult(entry.result);
  }

  function closeModal() {
    setModalClue(null);
    setModalResult(undefined);
  }

  function handleTry(e: React.MouseEvent, clueId: string) {
    e.stopPropagation();
    navigate(`/guess/${clueId}`);
  }

  // Show solved/not-solved badges when the clue can be attempted by the current user
  function shouldShowBadge(clue: Clue): boolean {
    if (isOwnProfile) return false;
    if (clue.userId === user?.id) return false; // can't solve own clue
    return true;
  }

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
              <p className="text-2xl font-bold text-white">{stats.avgScore}</p>
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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.profile.givenTab}
          </button>
          <button
            onClick={() => setTab('solved')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
              tab === 'solved'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.profile.solvedTab}
          </button>
        </div>

        {/* Given tab */}
        {tab === 'given' && (
          cluesGiven.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesGiven}</p>
          ) : (
            <div className="space-y-3">
              {cluesGiven.map((clue) => {
                const canOpen = canRevealClue(clue);
                const badge = shouldShowBadge(clue);
                const solved = mySolvedClueIds.has(clue.id);
                return (
                  <div
                    key={clue.id}
                    onClick={() => openGivenModal(clue)}
                    className={`bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between transition-colors ${
                      canOpen ? 'cursor-pointer hover:border-gray-500' : ''
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white uppercase">{clue.word}</span>
                      <span className="ml-2 text-white font-bold">{clue.number}</span>
                      <p className="text-xs text-gray-500 mt-1">
                        {clue.boardSize} &middot; {clue.wordPack} &middot;{' '}
                        {new Date(clue.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {badge ? (
                        solved ? (
                          <span className="text-xs font-semibold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                            {t.profile.solved}
                          </span>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                              {t.profile.notSolved}
                            </span>
                            <button
                              onClick={(e) => handleTry(e, clue.id)}
                              className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2.5 py-0.5 rounded hover:bg-blue-800/40 transition-colors"
                            >
                              {t.profile.tryIt}
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">
                          {clue.targetIndices.length} targets
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Solved tab */}
        {tab === 'solved' && (
          solvedEntries.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesSolved}</p>
          ) : (
            <div className="space-y-3">
              {solvedEntries.map((entry, i) => {
                const clueId = entry.clue?.id ?? entry.result.clueId;
                const canOpen = entry.clue ? canRevealClue(entry.clue) : false;
                const badge = entry.clue ? shouldShowBadge(entry.clue) : false;
                const solved = mySolvedClueIds.has(clueId);
                return (
                  <div
                    key={i}
                    onClick={() => openSolvedModal(entry)}
                    className={`bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between transition-colors ${
                      canOpen ? 'cursor-pointer hover:border-gray-500' : ''
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white uppercase">
                        {entry.clue?.word ?? entry.result.clueId.slice(0, 20)}
                      </span>
                      <span className="ml-2 text-white font-bold">
                        {entry.clue?.number ?? entry.result.totalTargets}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.clue?.boardSize ?? entry.result.boardSize ?? '?'} &middot;{' '}
                        {entry.clue?.wordPack ?? '?'} &middot;{' '}
                        {new Date(entry.result.timestamp).toLocaleDateString()}
                        {entry.clue && (
                          <span className="text-blue-400"> &middot; {entry.clue.userId}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {badge && !solved && (
                        <>
                          <span className="text-xs font-semibold text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                            {t.profile.notSolved}
                          </span>
                          <button
                            onClick={(e) => handleTry(e, clueId)}
                            className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2.5 py-0.5 rounded hover:bg-blue-800/40 transition-colors"
                          >
                            {t.profile.tryIt}
                          </button>
                        </>
                      )}
                      {badge && solved && (
                        <span className="text-xs font-semibold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                          {t.profile.solved}
                        </span>
                      )}
                      <div className="text-right">
                        <span className="text-xl font-bold text-white">{entry.result.score ?? 0}</span>
                        <p className="text-xs text-gray-500">
                          {entry.result.correctCount}/{entry.result.totalTargets}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Board review modal */}
      {modalClue && (
        <BoardReviewModal
          clue={modalClue}
          result={modalResult}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
