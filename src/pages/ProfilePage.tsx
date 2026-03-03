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
type SortDir = 'asc' | 'desc';
type GivenSortField = 'number' | 'attempts' | 'avgScore';
type SolvedSortField = 'number' | 'attempts' | 'avgScore' | 'myScore';
type RankedFilter = 'all' | 'ranked' | 'casual';

interface SolvedEntry {
  result: GuessResult;
  clue: Clue | null;
}

interface ClueStats {
  attempts: number;
  avgScore: number;
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
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
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(false);
  const [confirmDeleteClue, setConfirmDeleteClue] = useState<string | null>(null);
  const [confirmTryClueId, setConfirmTryClueId] = useState<string | null>(null);
  const [clueStatsMap, setClueStatsMap] = useState<Record<string, ClueStats>>({});
  const [rankedFilter, setRankedFilter] = useState<RankedFilter>('all');
  const [confirmDeleteSolved, setConfirmDeleteSolved] = useState<string | null>(null);

  // Sorting with direction (like leaderboard)
  const [givenSort, setGivenSort] = useState<GivenSortField>('number');
  const [givenDir, setGivenDir] = useState<SortDir>('desc');
  const [solvedSort, setSolvedSort] = useState<SolvedSortField>('number');
  const [solvedDir, setSolvedDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (!profileId) return;
    api.getUserStats(profileId).then(setStats);
    api.getCluesByUser(profileId).then((clues) => {
      setCluesGiven(clues);
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
      entries.forEach((entry) => {
        if (entry.clue) {
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

  // Sorted given clues
  const sortedGiven = useMemo(() => {
    let filtered = cluesGiven;
    if (rankedFilter === 'ranked') filtered = filtered.filter((c) => c.ranked !== false);
    else if (rankedFilter === 'casual') filtered = filtered.filter((c) => c.ranked === false);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let diff = 0;
      if (givenSort === 'number') diff = b.number - a.number;
      else if (givenSort === 'attempts') diff = (clueStatsMap[b.id]?.attempts ?? 0) - (clueStatsMap[a.id]?.attempts ?? 0);
      else if (givenSort === 'avgScore') diff = (clueStatsMap[b.id]?.avgScore ?? 0) - (clueStatsMap[a.id]?.avgScore ?? 0);
      return givenDir === 'desc' ? diff : -diff;
    });
    return sorted;
  }, [cluesGiven, givenSort, givenDir, clueStatsMap, rankedFilter]);

  // Sorted solved entries
  const sortedSolved = useMemo(() => {
    let filtered = solvedEntries;
    if (rankedFilter === 'ranked') filtered = filtered.filter((e) => e.clue?.ranked !== false);
    else if (rankedFilter === 'casual') filtered = filtered.filter((e) => e.clue?.ranked === false);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let diff = 0;
      if (solvedSort === 'number') diff = (b.clue?.number ?? 0) - (a.clue?.number ?? 0);
      else if (solvedSort === 'attempts') {
        const aAttempts = a.clue ? (clueStatsMap[a.clue.id]?.attempts ?? 0) : 0;
        const bAttempts = b.clue ? (clueStatsMap[b.clue.id]?.attempts ?? 0) : 0;
        diff = bAttempts - aAttempts;
      } else if (solvedSort === 'avgScore') {
        const aScore = a.clue ? (clueStatsMap[a.clue.id]?.avgScore ?? 0) : 0;
        const bScore = b.clue ? (clueStatsMap[b.clue.id]?.avgScore ?? 0) : 0;
        diff = bScore - aScore;
      } else if (solvedSort === 'myScore') diff = (b.result.score ?? 0) - (a.result.score ?? 0);
      return solvedDir === 'desc' ? diff : -diff;
    });
    return sorted;
  }, [solvedEntries, solvedSort, solvedDir, clueStatsMap, rankedFilter]);

  function handleGivenRowClick(clue: Clue) {
    const solved = mySolvedClueIds.has(clue.id);
    const isOwn = clue.userId === user?.id;
    if (solved || isOwn || isOwnProfile) {
      setModalClue(clue);
      setModalResult(undefined);
    } else {
      setConfirmTryClueId(clue.id);
    }
  }

  function handleSolvedRowClick(entry: SolvedEntry) {
    if (!entry.clue) return;
    const canView = isOwnProfile || mySolvedClueIds.has(entry.result.clueId) || entry.clue.userId === user?.id;
    if (canView) {
      setModalClue(entry.clue);
      setModalResult(entry.result);
    } else {
      setConfirmTryClueId(entry.clue.id);
    }
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

  async function handleToggleDisabled(clue: Clue) {
    if (!user) return;
    const newDisabled = !clue.disabled;
    try {
      await api.toggleClueDisabled(clue.id, user.id, newDisabled);
      setCluesGiven((prev) => prev.map((c) => c.id === clue.id ? { ...c, disabled: newDisabled } : c));
    } catch (err) {
      console.error('Failed to toggle disabled:', err);
    }
  }

  function cycleRankedFilter() {
    setRankedFilter((f) => f === 'all' ? 'ranked' : f === 'ranked' ? 'casual' : 'all');
  }

  async function handleAdminDeleteResult(clueId: string) {
    if (!user?.isAdmin) return;
    const entry = solvedEntries.find((e) => e.result.clueId === clueId);
    if (!entry) return;
    await api.adminDeleteResult(user.id, entry.result.clueId, entry.result.userId, entry.result.timestamp);
    setSolvedEntries((prev) => prev.filter((e) => e.result.clueId !== clueId || e.result.userId !== entry.result.userId || e.result.timestamp !== entry.result.timestamp));
    setConfirmDeleteSolved(null);
  }

  function toggleGivenSort(field: GivenSortField) {
    if (givenSort === field) setGivenDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setGivenSort(field); setGivenDir('desc'); }
  }

  function toggleSolvedSort(field: SolvedSortField) {
    if (solvedSort === field) setSolvedDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSolvedSort(field); setSolvedDir('desc'); }
  }

  const thBase = 'py-2 text-xs sm:text-sm';
  const thSort = `${thBase} cursor-pointer hover:text-white transition-colors select-none`;
  const td = 'py-2 text-xs sm:text-sm';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar showBack />
      <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col flex-1 min-h-0 w-full">
        <h1 className="text-2xl font-extrabold text-white mb-1 text-center">{t.profile.title}</h1>
        <p className="text-center text-gray-400 mb-4">{profileId}</p>

        {user?.isAdmin && !isOwnProfile && (
          <div className="flex justify-center mb-6">
            {confirmDeleteUser ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">{t.admin.confirmDeleteUser.replace('{name}', profileId)}</span>
                <button onClick={handleAdminDeleteUser} className="px-3 py-1 text-sm font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                <button onClick={() => setConfirmDeleteUser(false)} className="px-3 py-1 text-sm font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteUser(true)} className="px-4 py-2 text-sm font-bold text-white bg-board-red/80 hover:bg-board-red rounded-lg transition-colors">{t.admin.deleteUser}</button>
            )}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
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
            onClick={() => setTab('given')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${tab === 'given' ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.profile.givenTab}
          </button>
          <button
            onClick={() => setTab('solved')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${tab === 'solved' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.profile.solvedTab}
          </button>
        </div>

        {tab === 'given' && (
          cluesGiven.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesGiven}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-board-bg z-10">
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thSort} text-left ${user?.isAdmin ? 'w-[36%]' : 'w-[40%]'}`} onClick={() => toggleGivenSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={givenSort} dir={givenDir} /></th>
                    <th className={`${thSort} text-center w-[15%]`} onClick={() => toggleGivenSort('attempts')}>{t.profile.solveCount}<SortArrow field="attempts" activeField={givenSort} dir={givenDir} /></th>
                    <th className={`${thSort} text-center w-[15%]`} onClick={() => toggleGivenSort('avgScore')}>{t.leaderboard.avgScore}<SortArrow field="avgScore" activeField={givenSort} dir={givenDir} /></th>
                    <th className={`${thBase} text-center w-[6%] cursor-pointer hover:text-white transition-colors select-none`} onClick={cycleRankedFilter} title={rankedFilter === 'all' ? 'Все' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные'}>
                      {rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
                    </th>
                    <th className={`${thBase} text-center w-[6%]`}></th>
                    {user?.isAdmin && <th className={`${thBase} text-center w-[6%]`}></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedGiven.map((clue) => {
                    const isOwn = clue.userId === user?.id;
                    const solved = mySolvedClueIds.has(clue.id);
                    const cStats = clueStatsMap[clue.id];
                    return (
                      <tr
                        key={clue.id}
                        onClick={() => handleGivenRowClick(clue)}
                        className="border-b border-gray-800/50 text-gray-300 cursor-pointer hover:bg-gray-800/40 transition-colors"
                      >
                        <td className={`${td} truncate`}>
                          <span className="font-bold text-white uppercase">{clue.word}</span>
                          <span className="ml-1 text-gray-500 font-semibold">{clue.number}</span>
                        </td>
                        <td className={`${td} text-center`}>
                          {cStats?.attempts ?? '—'}
                        </td>
                        <td className={`${td} text-center`}>
                          {cStats ? cStats.avgScore.toFixed(1) : '—'}
                        </td>
                        <td className={`${td} text-center`}>
                          {clue.ranked !== false ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
                        </td>
                        <td className={`${td} text-center`}>
                          {isOwnProfile ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleDisabled(clue); }}
                              className={`text-sm font-bold transition-colors ${clue.disabled ? 'text-board-red hover:text-red-300' : 'text-board-blue hover:text-blue-300'}`}
                              title={clue.disabled ? 'Активировать' : 'Деактивировать'}
                            >
                              {clue.disabled ? '✗' : '✓'}
                            </button>
                          ) : (solved || isOwn) ? (
                            <span className="text-board-blue text-sm">✓</span>
                          ) : (
                            <span className="text-gray-500 text-sm">–</span>
                          )}
                        </td>
                        {user?.isAdmin && (
                          <td className={`${td} text-center`}>
                            {confirmDeleteClue === clue.id ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleAdminDeleteClue(clue.id); }} className="px-1.5 py-0.5 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClue(null); }} className="px-1.5 py-0.5 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteClue(clue.id); }}
                                className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                                title={t.admin.deleteClue}
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'solved' && (
          solvedEntries.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesSolved}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-board-bg z-10">
                  <tr className="text-gray-400 border-b border-gray-700/50">
                    <th className={`${thSort} text-left ${user?.isAdmin ? 'w-[26%]' : 'w-[30%]'}`} onClick={() => toggleSolvedSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={solvedSort} dir={solvedDir} /></th>
                    <th className={`${thBase} text-left w-[18%]`}>{t.leaderboard.author}</th>
                    <th className={`${thSort} text-center w-[12%]`} onClick={() => toggleSolvedSort('attempts')}>{t.profile.solveCount}<SortArrow field="attempts" activeField={solvedSort} dir={solvedDir} /></th>
                    <th className={`${thSort} text-center w-[12%]`} onClick={() => toggleSolvedSort('avgScore')}>{t.leaderboard.avgScore}<SortArrow field="avgScore" activeField={solvedSort} dir={solvedDir} /></th>
                    <th className={`${thSort} text-center w-[12%]`} onClick={() => toggleSolvedSort('myScore')}>{t.profile.sortScore}<SortArrow field="myScore" activeField={solvedSort} dir={solvedDir} /></th>
                    <th className={`${thBase} text-center w-[5%] cursor-pointer hover:text-white transition-colors select-none`} onClick={cycleRankedFilter} title={rankedFilter === 'all' ? 'Все' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные'}>
                      {rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
                    </th>
                    <th className={`${thBase} text-center w-[5%]`}></th>
                    {user?.isAdmin && <th className={`${thBase} text-center w-[5%]`}></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedSolved.map((entry, i) => {
                    return (
                      <tr
                        key={i}
                        onClick={() => handleSolvedRowClick(entry)}
                        className="border-b border-gray-800/50 text-gray-300 cursor-pointer hover:bg-gray-800/40 transition-colors"
                      >
                        <td className={`${td} truncate`}>
                          <span className="font-bold text-white uppercase">
                            {entry.clue?.word ?? entry.result.clueId.slice(0, 12)}
                          </span>
                          <span className="ml-1 text-gray-500 font-semibold">
                            {entry.clue?.number ?? entry.result.totalTargets}
                          </span>
                        </td>
                        <td className={`${td} truncate`}>
                          {entry.clue && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${entry.clue!.userId}`); }}
                              className="text-board-blue hover:text-blue-300 transition-colors"
                            >
                              {entry.clue.userId}
                            </button>
                          )}
                        </td>
                        <td className={`${td} text-center`}>
                          {entry.clue ? (clueStatsMap[entry.clue.id]?.attempts ?? '—') : '—'}
                        </td>
                        <td className={`${td} text-center`}>
                          {entry.clue ? (clueStatsMap[entry.clue.id]?.avgScore?.toFixed(1) ?? '—') : '—'}
                        </td>
                        <td className={`${td} text-center font-bold text-white`}>
                          {entry.result.score ?? 0}
                          <span className="text-gray-500 font-normal ml-0.5 text-xs">
                            ({entry.result.correctCount}/{entry.result.totalTargets})
                          </span>
                        </td>
                        <td className={`${td} text-center`}>
                          {entry.clue?.ranked !== false ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
                        </td>
                        <td className={`${td} text-center`}>
                          {(isOwnProfile || mySolvedClueIds.has(entry.result.clueId) || entry.clue?.userId === user?.id) ? (
                            <span className="text-board-blue text-sm">✓</span>
                          ) : (
                            <span className="text-gray-500 text-sm">–</span>
                          )}
                        </td>
                        {user?.isAdmin && (
                          <td className={`${td} text-center`}>
                            {confirmDeleteSolved === `${entry.result.clueId}-${entry.result.timestamp}` ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={(e) => { e.stopPropagation(); handleAdminDeleteResult(entry.result.clueId); }} className="px-1.5 py-0.5 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSolved(null); }} className="px-1.5 py-0.5 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteSolved(`${entry.result.clueId}-${entry.result.timestamp}`); }}
                                className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                                title={t.admin.confirmDeleteResult}
                              >
                                &times;
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {confirmTryClueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmTryClueId(null)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-xs text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmTryClueId(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white mb-4">{t.profile.tryIt}?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { navigate(`/guess/${confirmTryClueId}`); setConfirmTryClueId(null); }} className="px-4 py-2 text-sm font-bold text-white bg-board-blue hover:bg-blue-600 rounded-lg transition-colors">✓</button>
              <button onClick={() => setConfirmTryClueId(null)} className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">✗</button>
            </div>
          </div>
        </div>
      )}

      {modalClue && (
        <BoardReviewModal clue={modalClue} result={modalResult} onClose={() => { setModalClue(null); setModalResult(undefined); }} />
      )}
    </div>
  );
}
