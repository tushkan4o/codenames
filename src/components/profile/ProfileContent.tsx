import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfileModal } from '../../context/ProfileModalContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';
import BoardReviewModal from '../game/BoardReviewModal';
import type { Clue, GuessResult } from '../../types/game';
import type { UserStats } from '../../types/user';

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

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

interface ProfileContentProps {
  profileId: string;
}

export default function ProfileContent({ profileId }: ProfileContentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openProfile } = useProfileModal();
  const { t } = useTranslation();

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
  const [clueStatsMap, setClueStatsMap] = useState<Record<string, ClueStats>>({});
  const [rankedFilter, setRankedFilter] = useState<RankedFilter>('all');
  const [confirmDeleteSolved, setConfirmDeleteSolved] = useState<string | null>(null);

  const [givenSort, setGivenSort] = useState<GivenSortField>('number');
  const [givenDir, setGivenDir] = useState<SortDir>('desc');
  const [solvedSort, setSolvedSort] = useState<SolvedSortField>('number');
  const [solvedDir, setSolvedDir] = useState<SortDir>('desc');

  const [expandedGivenId, setExpandedGivenId] = useState<string | null>(null);
  const [expandedSolvedKey, setExpandedSolvedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    // Reset state when profileId changes
    setStats(null);
    setCluesGiven([]);
    setSolvedEntries([]);
    setClueStatsMap({});
    setTab('given');
    setExpandedGivenId(null);
    setExpandedSolvedKey(null);
    setModalClue(null);
    setConfirmDeleteClue(null);
    setConfirmDeleteSolved(null);

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

  function handleGivenAction(clue: Clue) {
    const solved = mySolvedClueIds.has(clue.id);
    const isOwn = clue.userId === user?.id;
    if (solved || isOwn || isOwnProfile) {
      setModalClue(clue);
      setModalResult(undefined);
    } else {
      navigate(`/guess/${clue.id}`);
    }
  }

  function handleSolvedAction(entry: SolvedEntry) {
    if (!entry.clue) return;
    const canView = isOwnProfile || mySolvedClueIds.has(entry.result.clueId) || entry.clue.userId === user?.id;
    if (canView) {
      setModalClue(entry.clue);
      setModalResult(entry.result);
    } else {
      navigate(`/guess/${entry.clue.id}`);
    }
  }

  function canViewClue(clueId: string, clueUserId?: string) {
    return isOwnProfile || mySolvedClueIds.has(clueId) || clueUserId === user?.id;
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

  const thClass = 'py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none';

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
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
          ) : (<>
            <div className="hidden sm:grid grid-cols-[1fr_3.5rem_4.5rem] gap-x-2 px-4 py-1 items-center">
              <span className={thClass} onClick={() => toggleGivenSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={givenSort} dir={givenDir} /></span>
              <span className={`${thClass} text-center`} onClick={() => toggleGivenSort('avgScore')}>{t.profile.rating}<SortArrow field="avgScore" activeField={givenSort} dir={givenDir} /></span>
              <span className={`${thClass} text-center`} onClick={cycleRankedFilter} title={rankedFilter === 'all' ? 'Все' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные'}>
                {rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
              </span>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {sortedGiven.map((clue) => {
                const isOwn = clue.userId === user?.id;
                const solved = mySolvedClueIds.has(clue.id);
                const cStats = clueStatsMap[clue.id];
                const isExpanded = expandedGivenId === clue.id;
                const canView = solved || isOwn || isOwnProfile;
                return (
                  <div key={clue.id}>
                    <div
                      onClick={() => setExpandedGivenId(isExpanded ? null : clue.id)}
                      className={`bg-gray-800/60 border rounded-lg px-4 py-2 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                    >
                      <div className="grid grid-cols-[1fr_3.5rem_4.5rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {clue.word} <span className="text-gray-500 font-semibold">{clue.number}</span>
                          {clue.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                        </span>
                        <span className="text-sm text-gray-400 text-center">{cStats ? cStats.avgScore.toFixed(1) : '—'}</span>
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="text-sm">{clue.ranked !== false ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                          {isOwnProfile ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleDisabled(clue); }}
                              className={`text-sm font-bold transition-colors ${clue.disabled ? 'text-board-red hover:text-red-300' : 'text-board-blue hover:text-blue-300'}`}
                              title={clue.disabled ? 'Активировать' : 'Деактивировать'}
                            >
                              {clue.disabled ? '✗' : '✓'}
                            </button>
                          ) : canView ? (
                            <span className="text-board-blue text-sm">✓</span>
                          ) : (
                            <span className="text-gray-500 text-sm">–</span>
                          )}
                          {user?.isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedGivenId(clue.id); setConfirmDeleteClue(clue.id); }}
                              className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                              title={t.admin.deleteClue}
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{cStats?.attempts ?? '—'}</span></span>
                          {clue.createdAt > 0 && <span className="text-gray-500">{formatDate(clue.createdAt)}</span>}
                          <button
                            onClick={() => handleGivenAction(clue)}
                            className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                          >
                            {canView ? t.profile.viewBoard : t.profile.solve}
                          </button>
                        </div>
                        {user?.isAdmin && confirmDeleteClue === clue.id && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-700/30">
                            <span className="text-sm text-board-red">{t.admin.confirmDeleteClue}</span>
                            <button onClick={() => handleAdminDeleteClue(clue.id)} className="px-2 py-1 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                            <button onClick={() => setConfirmDeleteClue(null)} className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)
        )}

        {tab === 'solved' && (
          solvedEntries.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesSolved}</p>
          ) : (<>
            <div className="hidden sm:grid grid-cols-[1fr_3rem_3.5rem_4.5rem] gap-x-2 px-4 py-1 items-center">
              <span className={thClass} onClick={() => toggleSolvedSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={solvedSort} dir={solvedDir} /></span>
              <span className={`${thClass} text-center`} onClick={() => toggleSolvedSort('myScore')}>{t.profile.sortScore}<SortArrow field="myScore" activeField={solvedSort} dir={solvedDir} /></span>
              <span className={`${thClass} text-center`} onClick={() => toggleSolvedSort('avgScore')}>{t.profile.rating}<SortArrow field="avgScore" activeField={solvedSort} dir={solvedDir} /></span>
              <span className={`${thClass} text-center`} onClick={cycleRankedFilter} title={rankedFilter === 'all' ? 'Все' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные'}>
                {rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
              </span>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {sortedSolved.map((entry, i) => {
                const solvedKey = `${entry.result.clueId}-${entry.result.timestamp}`;
                const isExpanded = expandedSolvedKey === solvedKey;
                const canView = canViewClue(entry.result.clueId, entry.clue?.userId);
                const cStats = entry.clue ? clueStatsMap[entry.clue.id] : null;
                return (
                  <div key={i}>
                    <div
                      onClick={() => setExpandedSolvedKey(isExpanded ? null : solvedKey)}
                      className={`bg-gray-800/60 border rounded-lg px-4 py-2 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                    >
                      <div className="grid grid-cols-[1fr_3rem_3.5rem_4.5rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {entry.clue?.word ?? entry.result.clueId.slice(0, 12)}
                          <span className="ml-1 text-gray-500 font-semibold">{entry.clue?.number ?? entry.result.totalTargets}</span>
                        </span>
                        <span className="text-sm font-bold text-white text-center">
                          {entry.result.score ?? 0}
                          <span className="text-gray-500 font-normal ml-0.5 text-xs">({entry.result.correctCount}/{entry.result.totalTargets})</span>
                        </span>
                        <span className="text-sm text-gray-400 text-center">{cStats ? cStats.avgScore.toFixed(1) : '—'}</span>
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="text-sm">{entry.clue?.ranked !== false ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                          {canView ? (
                            <span className="text-board-blue text-sm">✓</span>
                          ) : (
                            <span className="text-gray-500 text-sm">–</span>
                          )}
                          {user?.isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedSolvedKey(solvedKey); setConfirmDeleteSolved(solvedKey); }}
                              className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                              title={t.admin.confirmDeleteResult}
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          {entry.clue && (
                            <span>
                              <span className="text-gray-400">{t.leaderboard.author}: </span>
                              <button onClick={() => openProfile(entry.clue!.userId)} className="text-board-blue hover:text-blue-300 transition-colors font-semibold">{entry.clue.userId}</button>
                            </span>
                          )}
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{cStats?.attempts ?? '—'}</span></span>
                          {entry.result.timestamp > 0 && <span className="text-gray-500">{formatDate(entry.result.timestamp)}</span>}
                          <button
                            onClick={() => handleSolvedAction(entry)}
                            className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                          >
                            {canView ? t.profile.viewBoard : t.profile.solve}
                          </button>
                        </div>
                        {user?.isAdmin && confirmDeleteSolved === solvedKey && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-700/30">
                            <span className="text-sm text-board-red">{t.admin.confirmDeleteResult}</span>
                            <button onClick={() => handleAdminDeleteResult(entry.result.clueId)} className="px-2 py-1 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                            <button onClick={() => setConfirmDeleteSolved(null)} className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>)
        )}
      </div>

      {modalClue && (
        <BoardReviewModal clue={modalClue} result={modalResult} onClose={() => { setModalClue(null); setModalResult(undefined); }} />
      )}
    </>
  );
}
