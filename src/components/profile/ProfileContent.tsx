import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfileModal } from '../../context/ProfileModalContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';
import BoardReviewModal from '../game/BoardReviewModal';
import type { Clue, GuessResult } from '../../types/game';
import type { UserStats } from '../../types/user';

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

type Tab = 'given' | 'solved';
type SortDir = 'asc' | 'desc';
type GivenSortField = 'number' | 'attempts' | 'avgScore';
type SolvedSortField = 'number' | 'attempts' | 'avgScore' | 'myScore';
type RankedFilter = 'all' | 'ranked' | 'casual';
type SolvedFilter = 'all' | 'solved' | 'unsolved';

interface SolvedEntry {
  result: GuessResult;
  clue: Clue | null;
}

interface ClueStats {
  attempts: number;
  avgScore: number;
  ratingsCount: number;
  avgRating: number;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string | null; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

interface ProfileContentProps {
  profileId: string;
}

export default function ProfileContent({ profileId }: ProfileContentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openProfile, closeProfile } = useProfileModal();
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
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>('all');
  const [confirmDeleteSolved, setConfirmDeleteSolved] = useState<string | null>(null);

  const [givenSort, setGivenSort] = useState<GivenSortField | null>(null);
  const [givenDir, setGivenDir] = useState<SortDir>('desc');
  const [solvedSort, setSolvedSort] = useState<SolvedSortField | null>(null);
  const [solvedDir, setSolvedDir] = useState<SortDir>('desc');

  const [expandedGivenId, setExpandedGivenId] = useState<string | null>(null);
  const [expandedSolvedKey, setExpandedSolvedKey] = useState<string | null>(null);

  // OAuth linked accounts
  const [linkedAccounts, setLinkedAccounts] = useState<{ provider: string; providerName: string; email: string | null; linkedAt: number }[]>([]);
  const [unlinkConfirm, setUnlinkConfirm] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!profileId) return;
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
          setClueStatsMap((prev) => ({ ...prev, [clue.id]: { attempts: s.attempts, avgScore: s.avgScore, ratingsCount: s.ratingsCount ?? 0, avgRating: s.avgRating ?? 0 } }));
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
            setClueStatsMap((prev) => ({ ...prev, [entry.clue!.id]: { attempts: s.attempts, avgScore: s.avgScore, ratingsCount: s.ratingsCount ?? 0, avgRating: s.avgRating ?? 0 } }));
          });
        }
      });
    });
    if (user) {
      api.getResultsByUser(user.id).then((results) => {
        setMySolvedClueIds(new Set(results.map((r) => r.clueId)));
      });
    }
    if (isOwnProfile) {
      api.getOAuthAccounts(profileId).then(setLinkedAccounts).catch((err) => {
        console.error('Failed to fetch OAuth accounts:', err);
      });
    }
  }, [profileId, user]);

  const sortedGiven = useMemo(() => {
    let filtered = cluesGiven;
    if (rankedFilter === 'ranked') filtered = filtered.filter((c) => c.ranked !== false);
    else if (rankedFilter === 'casual') filtered = filtered.filter((c) => c.ranked === false);
    if (solvedFilter === 'solved') filtered = filtered.filter((c) => mySolvedClueIds.has(c.id));
    else if (solvedFilter === 'unsolved') filtered = filtered.filter((c) => !mySolvedClueIds.has(c.id));
    const sorted = [...filtered];
    if (!givenSort) {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      sorted.sort((a, b) => {
        let diff = 0;
        if (givenSort === 'number') diff = b.number - a.number;
        else if (givenSort === 'attempts') diff = (clueStatsMap[b.id]?.attempts ?? 0) - (clueStatsMap[a.id]?.attempts ?? 0);
        else if (givenSort === 'avgScore') diff = (clueStatsMap[b.id]?.avgScore ?? 0) - (clueStatsMap[a.id]?.avgScore ?? 0);
        return givenDir === 'desc' ? diff : -diff;
      });
    }
    return sorted;
  }, [cluesGiven, givenSort, givenDir, clueStatsMap, rankedFilter, solvedFilter, mySolvedClueIds]);

  const sortedSolved = useMemo(() => {
    let filtered = solvedEntries;
    if (rankedFilter === 'ranked') filtered = filtered.filter((e) => e.clue?.ranked !== false);
    else if (rankedFilter === 'casual') filtered = filtered.filter((e) => e.clue?.ranked === false);
    if (solvedFilter === 'solved') filtered = filtered.filter((e) => canViewClue(e.result.clueId, e.clue?.userId));
    else if (solvedFilter === 'unsolved') filtered = filtered.filter((e) => !canViewClue(e.result.clueId, e.clue?.userId));
    const sorted = [...filtered];
    if (!solvedSort) {
      sorted.sort((a, b) => b.result.timestamp - a.result.timestamp);
    } else {
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
    }
    return sorted;
  }, [solvedEntries, solvedSort, solvedDir, clueStatsMap, rankedFilter, solvedFilter, mySolvedClueIds, isOwnProfile, user]);

  function handleGivenAction(clue: Clue) {
    const solved = mySolvedClueIds.has(clue.id);
    const isOwn = clue.userId === user?.id;
    if (solved || isOwn || isOwnProfile) {
      setModalClue(clue);
      setModalResult(undefined);
    } else {
      closeProfile();
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
      closeProfile();
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

  function cycleSolvedFilter() {
    setSolvedFilter((f) => f === 'all' ? 'solved' : f === 'solved' ? 'unsolved' : 'all');
  }

  async function handleAdminDeleteResult(clueId: string) {
    if (!user?.isAdmin) return;
    const entry = solvedEntries.find((e) => e.result.clueId === clueId);
    if (!entry) return;
    await api.adminDeleteResult(user.id, entry.result.clueId, entry.result.userId, entry.result.timestamp);
    setSolvedEntries((prev) => prev.filter((e) => e.result.clueId !== clueId || e.result.userId !== entry.result.userId || e.result.timestamp !== entry.result.timestamp));
    setConfirmDeleteSolved(null);
  }

  async function handleLinkOAuth(provider: string) {
    if (!user) return;
    const { url } = await api.getOAuthUrl(provider, user.id);
    window.location.href = url;
  }

  async function handleUnlinkOAuth(provider: string) {
    if (!user) return;
    await api.unlinkOAuth(user.id, provider);
    setLinkedAccounts((prev) => prev.filter((a) => a.provider !== provider));
    setUnlinkConfirm(null);
  }

  function toggleGivenSort(field: GivenSortField) {
    if (givenSort === field) {
      if (givenDir === 'desc') setGivenDir('asc');
      else { setGivenSort(null); setGivenDir('desc'); }
    } else { setGivenSort(field); setGivenDir('desc'); }
  }

  function toggleSolvedSort(field: SolvedSortField) {
    if (solvedSort === field) {
      if (solvedDir === 'desc') setSolvedDir('asc');
      else { setSolvedSort(null); setSolvedDir('desc'); }
    } else { setSolvedSort(field); setSolvedDir('desc'); }
  }

  const thClass = 'py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none';

  const starIcon = rankedFilter === 'all' ? '★' : rankedFilter === 'ranked' ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>;
  const checkIcon = solvedFilter === 'all' ? '✓' : solvedFilter === 'solved' ? <span className="text-board-blue">✓</span> : <span className="text-gray-600">✓</span>;
  const starTitle = rankedFilter === 'all' ? 'Все' : rankedFilter === 'ranked' ? 'Рейтинговые' : 'Обычные';
  const checkTitle = solvedFilter === 'all' ? 'Все' : solvedFilter === 'solved' ? 'Решённые' : 'Нерешённые';

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-2xl font-extrabold text-white">{t.profile.title}</h1>
          {isOwnProfile && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              title={t.oauth.settings}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
          )}
        </div>
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

        {/* ===== GIVEN TAB ===== */}
        {tab === 'given' && (
          cluesGiven.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesGiven}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
              <div className="sticky top-0 z-10 bg-board-bg grid grid-cols-[1fr_3.5rem_2rem_2rem] gap-x-2 px-4 py-1 items-center">
                <span className={thClass} onClick={() => toggleGivenSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={givenSort} dir={givenDir} /></span>
                <span className={`${thClass} text-center`} onClick={() => toggleGivenSort('avgScore')}>{t.profile.rating}<SortArrow field="avgScore" activeField={givenSort} dir={givenDir} /></span>
                <span className={`${thClass} text-center`} onClick={cycleRankedFilter} title={starTitle}>{starIcon}</span>
                <span className={`${thClass} text-center`} onClick={cycleSolvedFilter} title={checkTitle}>{checkIcon}</span>
              </div>
              <div className="space-y-1">
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
                      <div className="grid grid-cols-[1fr_3.5rem_2rem_2rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {clue.word} <span className="text-gray-500 font-semibold">{clue.number}</span>
                          {clue.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                        </span>
                        <span className="text-sm text-gray-400 text-center">{cStats ? cStats.avgScore.toFixed(1) : '—'}</span>
                        <span className="text-sm text-center">{clue.ranked !== false ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                        <span className="text-sm text-center">
                          {isOwnProfile ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleDisabled(clue); }}
                              className={`font-bold transition-colors ${clue.disabled ? 'text-board-red hover:text-red-300' : 'text-board-blue hover:text-blue-300'}`}
                              title={clue.disabled ? 'Активировать' : 'Деактивировать'}
                            >
                              {clue.disabled ? '✗' : '✓'}
                            </button>
                          ) : canView ? (
                            <span className="text-board-blue">✓</span>
                          ) : (
                            <span className="text-gray-500">–</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {clue.createdAt > 0 && <span className="text-gray-500">{formatDate(clue.createdAt)}</span>}
                          {!clue.createdAt && <span />}
                          <span>
                            <span className="text-gray-400">{t.leaderboard.author}: </span>
                            <button onClick={() => openProfile(clue.userId)} className="text-board-blue hover:text-blue-300 transition-colors font-semibold">{clue.userId}</button>
                          </span>
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{cStats?.attempts ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.avgScoreLabel}:</span> <span className="text-white font-semibold">{cStats ? cStats.avgScore.toFixed(1) : '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.ratingsCount}:</span> <span className="text-white font-semibold">{cStats?.ratingsCount ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.admin.avgRating}:</span> <span className="text-white font-semibold">{cStats && cStats.ratingsCount > 0 ? cStats.avgRating.toFixed(1) : '—'}</span></span>
                          <div className="col-span-2 flex items-center gap-2 justify-end mt-1">
                            {(!clue.disabled || canView) && (
                              <button
                                onClick={() => handleGivenAction(clue)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {canView ? t.profile.viewBoard : t.profile.solve}
                              </button>
                            )}
                            {user?.isAdmin && confirmDeleteClue !== clue.id && (
                              <button
                                onClick={() => setConfirmDeleteClue(clue.id)}
                                className="px-2 py-1 rounded bg-board-red/60 hover:bg-board-red text-white text-sm font-bold transition-colors"
                                title={t.admin.deleteClue}
                              >
                                &times;
                              </button>
                            )}
                          </div>
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
            </div>
          )
        )}

        {/* ===== SOLVED TAB ===== */}
        {tab === 'solved' && (
          solvedEntries.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesSolved}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
              <div className="sticky top-0 z-10 bg-board-bg grid grid-cols-[1fr_3rem_2rem_2rem] sm:grid-cols-[1fr_3rem_3.5rem_2rem_2rem] gap-x-2 px-4 py-1 items-center">
                <span className={thClass} onClick={() => toggleSolvedSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={solvedSort} dir={solvedDir} /></span>
                <span className={`${thClass} text-center`} onClick={() => toggleSolvedSort('myScore')}>{t.profile.sortScore}<SortArrow field="myScore" activeField={solvedSort} dir={solvedDir} /></span>
                <span className={`${thClass} text-center hidden sm:block`} onClick={() => toggleSolvedSort('avgScore')}>{t.profile.rating}<SortArrow field="avgScore" activeField={solvedSort} dir={solvedDir} /></span>
                <span className={`${thClass} text-center`} onClick={cycleRankedFilter} title={starTitle}>{starIcon}</span>
                <span className={`${thClass} text-center`} onClick={cycleSolvedFilter} title={checkTitle}>{checkIcon}</span>
              </div>
              <div className="space-y-1">
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
                      <div className="grid grid-cols-[1fr_3rem_2rem_2rem] sm:grid-cols-[1fr_3rem_3.5rem_2rem_2rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {entry.clue?.word ?? entry.result.clueId.slice(0, 12)}
                          <span className="ml-1 text-gray-500 font-semibold">{entry.clue?.number ?? entry.result.totalTargets}</span>
                        </span>
                        <span className="text-sm font-bold text-white text-center">
                          {entry.result.score ?? 0}
                          <span className="text-gray-500 font-normal ml-0.5 text-xs">({entry.result.correctCount}/{entry.result.totalTargets})</span>
                        </span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{cStats ? cStats.avgScore.toFixed(1) : '—'}</span>
                        <span className="text-sm text-center">{entry.clue?.ranked !== false ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                        <span className="text-sm text-center">
                          {canView ? (
                            <span className="text-board-blue">✓</span>
                          ) : (
                            <span className="text-gray-500">–</span>
                          )}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {entry.result.timestamp > 0 && <span className="text-gray-500">{formatDate(entry.result.timestamp)}</span>}
                          {!entry.result.timestamp && <span />}
                          {entry.clue ? (
                            <span>
                              <span className="text-gray-400">{t.leaderboard.author}: </span>
                              <button onClick={() => openProfile(entry.clue!.userId)} className="text-board-blue hover:text-blue-300 transition-colors font-semibold">{entry.clue.userId}</button>
                            </span>
                          ) : <span />}
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{cStats?.attempts ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.avgScoreLabel}:</span> <span className="text-white font-semibold">{cStats ? cStats.avgScore.toFixed(1) : '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.ratingsCount}:</span> <span className="text-white font-semibold">{cStats?.ratingsCount ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.admin.avgRating}:</span> <span className="text-white font-semibold">{cStats && cStats.ratingsCount > 0 ? cStats.avgRating.toFixed(1) : '—'}</span></span>
                          <div className="col-span-2 flex items-center gap-2 justify-end mt-1">
                            {(!entry.clue?.disabled || canView) && (
                              <button
                                onClick={() => handleSolvedAction(entry)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {canView ? t.profile.viewBoard : t.profile.solve}
                              </button>
                            )}
                            {user?.isAdmin && confirmDeleteSolved !== solvedKey && (
                              <button
                                onClick={() => setConfirmDeleteSolved(solvedKey)}
                                className="px-2 py-1 rounded bg-board-red/60 hover:bg-board-red text-white text-sm font-bold transition-colors"
                                title={t.admin.confirmDeleteResult}
                              >
                                &times;
                              </button>
                            )}
                          </div>
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
            </div>
          )
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowSettings(false); setUnlinkConfirm(null); }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{t.oauth.settings}</h2>
              <button onClick={() => { setShowSettings(false); setUnlinkConfirm(null); }} className="text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">{t.oauth.linkedAccounts}</h3>
            <div className="space-y-2">
              {(['google', 'discord'] as const).map((provider) => {
                const account = linkedAccounts.find((a) => a.provider === provider);
                const Icon = provider === 'google' ? GoogleIcon : DiscordIcon;
                return (
                  <div key={provider} className="flex items-center justify-between bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={20} />
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-white">{provider === 'google' ? 'Google' : 'Discord'}</span>
                        {account && (
                          <p className="text-xs text-gray-500 truncate">
                            {account.providerName || account.email || t.oauth.linked}
                          </p>
                        )}
                      </div>
                    </div>
                    {account ? (
                      unlinkConfirm === provider ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleUnlinkOAuth(provider)} className="px-2 py-1 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                          <button onClick={() => setUnlinkConfirm(null)} className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                        </div>
                      ) : (
                        <button onClick={() => setUnlinkConfirm(provider)} className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                          {t.oauth.unlink}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleLinkOAuth(provider)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-board-blue hover:brightness-110 rounded transition-colors whitespace-nowrap"
                      >
                        {t.oauth.link}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modalClue && (
        <BoardReviewModal clue={modalClue} result={modalResult} onClose={() => { setModalClue(null); setModalResult(undefined); }} />
      )}
    </>
  );
}
