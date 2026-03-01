import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import BoardReviewModal from '../components/game/BoardReviewModal';
import type { Clue, GuessResult } from '../types/game';
import type { UserStats } from '../types/user';

type Tab = 'given' | 'solved';
type SortField = 'date' | 'attempts' | 'score';

interface SolvedEntry {
  result: GuessResult;
  clue: Clue | null;
}

interface ClueStats {
  attempts: number;
  avgScore: number;
}

const PAGE_SIZE = 5;

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
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
  const [confirmDeleteClue, setConfirmDeleteClue] = useState<string | null>(null);

  // Stats per clue (solve count + avg score)
  const [clueStatsMap, setClueStatsMap] = useState<Record<string, ClueStats>>({});

  // Pagination
  const [givenPage, setGivenPage] = useState(0);
  const [solvedPage, setSolvedPage] = useState(0);

  // Sorting
  const [givenSort, setGivenSort] = useState<SortField>('date');
  const [solvedSort, setSolvedSort] = useState<SortField>('date');

  useEffect(() => {
    if (!profileId) return;
    api.getUserStats(profileId).then(setStats);
    api.getCluesByUser(profileId).then((clues) => {
      setCluesGiven(clues);
      // Fetch stats for each clue
      clues.forEach((clue) => {
        api.getClueStats(clue.id).then((s) => {
          setClueStatsMap((prev) => ({ ...prev, [clue.id]: { attempts: s.attempts, avgScore: s.avgScore } }));
        });
      });
    });
    api.getResultsByUser(profileId).then(async (results) => {
      const entries = await Promise.all(
        results.map(async (result) => {
          const clue = await api.getClueById(result.clueId, true);
          return { result, clue };
        }),
      );
      setSolvedEntries(entries);
      // Fetch stats for solved clues too
      entries.forEach((entry) => {
        if (entry.clue && !clueStatsMap[entry.clue.id]) {
          api.getClueStats(entry.clue.id).then((s) => {
            setClueStatsMap((prev) => ({ ...prev, [entry.clue!.id]: { attempts: s.attempts, avgScore: s.avgScore } }));
          });
        }
      });
    });
    if (user) {
      api.getResultsByUser(user.id).then((results) => {
        setMySolvedClueIds(new Set(results.map((r) => r.clueId)));
      });
    }
  }, [profileId, user]);

  // Sorted + paginated given clues
  const sortedGiven = useMemo(() => {
    const sorted = [...cluesGiven];
    if (givenSort === 'date') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (givenSort === 'attempts') sorted.sort((a, b) => (clueStatsMap[b.id]?.attempts ?? 0) - (clueStatsMap[a.id]?.attempts ?? 0));
    else if (givenSort === 'score') sorted.sort((a, b) => (clueStatsMap[b.id]?.avgScore ?? 0) - (clueStatsMap[a.id]?.avgScore ?? 0));
    return sorted;
  }, [cluesGiven, givenSort, clueStatsMap]);

  const givenPageCount = Math.ceil(sortedGiven.length / PAGE_SIZE);
  const pagedGiven = sortedGiven.slice(givenPage * PAGE_SIZE, (givenPage + 1) * PAGE_SIZE);

  // Sorted + paginated solved entries
  const sortedSolved = useMemo(() => {
    const sorted = [...solvedEntries];
    if (solvedSort === 'date') sorted.sort((a, b) => b.result.timestamp - a.result.timestamp);
    else if (solvedSort === 'attempts') {
      sorted.sort((a, b) => {
        const aAttempts = a.clue ? (clueStatsMap[a.clue.id]?.attempts ?? 0) : 0;
        const bAttempts = b.clue ? (clueStatsMap[b.clue.id]?.attempts ?? 0) : 0;
        return bAttempts - aAttempts;
      });
    } else if (solvedSort === 'score') sorted.sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0));
    return sorted;
  }, [solvedEntries, solvedSort, clueStatsMap]);

  const solvedPageCount = Math.ceil(sortedSolved.length / PAGE_SIZE);
  const pagedSolved = sortedSolved.slice(solvedPage * PAGE_SIZE, (solvedPage + 1) * PAGE_SIZE);

  function canRevealClue(clue: Clue): boolean {
    if (isOwnProfile) return true;
    if (clue.userId === user?.id) return true;
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

  async function handleAdminDeleteUser() {
    if (!user?.isAdmin || !profileId) return;
    await api.adminDeleteUser(user.id, profileId);
    navigate('/');
  }

  async function handleAdminDeleteClue(clueId: string) {
    if (!user?.isAdmin) return;
    await api.adminDeleteClue(user.id, clueId);
    setCluesGiven((prev) => prev.filter((c) => c.id !== clueId));
    setConfirmDeleteClue(null);
  }

  function shouldShowBadge(clue: Clue): boolean {
    if (isOwnProfile) return false;
    if (clue.userId === user?.id) return false;
    return true;
  }

  function handleGivenSortChange(field: SortField) {
    setGivenSort(field);
    setGivenPage(0);
  }

  function handleSolvedSortChange(field: SortField) {
    setSolvedSort(field);
    setSolvedPage(0);
  }

  const sortBtnClass = (active: boolean) =>
    `px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
      active ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-500 hover:text-white'
    }`;

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-extrabold text-white mb-1 text-center">{t.profile.title}</h1>
        <p className="text-center text-gray-400 mb-6">{profileId}</p>

        {user?.isAdmin && !isOwnProfile && (
          <div className="flex justify-center mb-6">
            {confirmDeleteUser ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">{t.admin.confirmDeleteUser}</span>
                <button onClick={handleAdminDeleteUser} className="px-3 py-1 text-sm font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                <button onClick={() => setConfirmDeleteUser(false)} className="px-3 py-1 text-sm font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteUser(true)} className="px-4 py-2 text-sm font-bold text-white bg-board-red/80 hover:bg-board-red rounded-lg transition-colors">{t.admin.deleteUser}</button>
            )}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700/30">
              <p className="text-2xl font-bold text-white">{stats.cluesGiven}</p>
              <p className="text-xs text-gray-400">{t.profile.cluesGiven}</p>
            </div>
            <div className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700/30">
              <p className="text-2xl font-bold text-white">{stats.cluesSolved}</p>
              <p className="text-xs text-gray-400">{t.profile.cluesSolved}</p>
            </div>
            <div className="bg-gray-800/60 rounded-lg p-4 text-center border border-gray-700/30">
              <p className="text-2xl font-bold text-white">{stats.avgScore}</p>
              <p className="text-xs text-gray-400">{t.leaderboard.avgScore}</p>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => { setTab('given'); setGivenPage(0); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${tab === 'given' ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.profile.givenTab}
          </button>
          <button
            onClick={() => { setTab('solved'); setSolvedPage(0); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${tab === 'solved' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.profile.solvedTab}
          </button>
        </div>

        {/* Sorting */}
        <div className="flex justify-center gap-1 mb-3">
          {(['date', 'attempts', 'score'] as SortField[]).map((f) => (
            <button
              key={f}
              onClick={() => tab === 'given' ? handleGivenSortChange(f) : handleSolvedSortChange(f)}
              className={sortBtnClass((tab === 'given' ? givenSort : solvedSort) === f)}
            >
              {f === 'date' ? t.profile.sortDate : f === 'attempts' ? t.profile.sortAttempts : t.profile.sortScore}
            </button>
          ))}
        </div>

        {tab === 'given' && (
          cluesGiven.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesGiven}</p>
          ) : (
            <>
              <div className="space-y-3">
                {pagedGiven.map((clue) => {
                  const canOpen = canRevealClue(clue);
                  const badge = shouldShowBadge(clue);
                  const solved = mySolvedClueIds.has(clue.id);
                  const cStats = clueStatsMap[clue.id];
                  return (
                    <div
                      key={clue.id}
                      onClick={() => openGivenModal(clue)}
                      className={`bg-gray-800/60 rounded-lg p-4 border border-gray-700/30 flex items-center justify-between transition-colors ${canOpen ? 'cursor-pointer hover:border-gray-600' : ''}`}
                    >
                      <div>
                        <span className="font-bold text-white uppercase">{clue.word}</span>
                        <span className="ml-2 text-white font-bold">{clue.number}</span>
                        <p className="text-xs text-gray-500 mt-1">
                          {clue.boardSize} &middot; {new Date(clue.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {badge ? (
                          solved ? (
                            <span className="text-xs font-semibold text-board-blue bg-board-blue/10 px-2 py-0.5 rounded">{t.profile.solved}</span>
                          ) : (
                            <>
                              <span className="text-xs font-semibold text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">{t.profile.notSolved}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/guess/${clue.id}`); }}
                                className="text-xs font-bold text-board-blue bg-board-blue/10 px-2.5 py-0.5 rounded hover:bg-board-blue/20 transition-colors"
                              >
                                {t.profile.tryIt}
                              </button>
                            </>
                          )
                        ) : null}
                        {cStats && (
                          <div className="text-right ml-1">
                            <p className="text-xs text-gray-500">{t.profile.solveCount}: {cStats.attempts}</p>
                            <p className="text-xs text-gray-500">{t.leaderboard.avgScore}: {cStats.avgScore}</p>
                          </div>
                        )}
                        {user?.isAdmin && (
                          confirmDeleteClue === clue.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); handleAdminDeleteClue(clue.id); }} className="px-2 py-0.5 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClue(null); }} className="px-2 py-0.5 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteClue(clue.id); }}
                              className="px-1.5 py-0.5 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors"
                              title={t.admin.deleteClue}
                            >
                              &times;
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {givenPageCount > 1 && (
                <Pagination page={givenPage} pageCount={givenPageCount} onChange={setGivenPage} />
              )}
            </>
          )
        )}

        {tab === 'solved' && (
          solvedEntries.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesSolved}</p>
          ) : (
            <>
              <div className="space-y-3">
                {pagedSolved.map((entry, i) => {
                  const canOpen = entry.clue ? canRevealClue(entry.clue) : false;
                  const cStats = entry.clue ? clueStatsMap[entry.clue.id] : undefined;
                  return (
                    <div
                      key={i}
                      onClick={() => canOpen ? openSolvedModal(entry) : undefined}
                      className={`bg-gray-800/60 rounded-lg p-4 border border-gray-700/30 flex items-center justify-between transition-colors ${canOpen ? 'cursor-pointer hover:border-gray-600' : ''}`}
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
                          {new Date(entry.result.timestamp).toLocaleDateString()}
                          {entry.clue && (
                            <>
                              {' '}&middot;{' '}
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${entry.clue!.userId}`); }}
                                className="text-board-blue hover:text-blue-300 transition-colors"
                              >
                                {entry.clue.userId}
                              </button>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {cStats && (
                          <div className="text-right mr-1">
                            <p className="text-xs text-gray-500">{t.profile.solveCount}: {cStats.attempts}</p>
                            <p className="text-xs text-gray-500">{t.leaderboard.avgScore}: {cStats.avgScore}</p>
                          </div>
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
              {solvedPageCount > 1 && (
                <Pagination page={solvedPage} pageCount={solvedPageCount} onChange={setSolvedPage} />
              )}
            </>
          )
        )}
      </div>

      {modalClue && (
        <BoardReviewModal clue={modalClue} result={modalResult} onClose={closeModal} />
      )}
    </div>
  );
}

function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  return (
    <div className="flex justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-sm font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors"
      >
        &lsaquo;
      </button>
      <span className="text-gray-500 text-sm py-1">{page + 1} / {pageCount}</span>
      <button
        onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className="px-3 py-1 rounded bg-gray-800 text-gray-400 text-sm font-bold disabled:opacity-30 hover:bg-gray-700 transition-colors"
      >
        &rsaquo;
      </button>
    </div>
  );
}
