import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfileModal } from '../../context/ProfileModalContext';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../lib/api';
import { canPlayRanked, buildRankedLockMessage } from '../../lib/rankedAccess';
import BoardReviewModal from '../game/BoardReviewModal';
import type { Clue, GuessResult } from '../../types/game';
import type { UserStats } from '../../types/user';

const ACTIVE_GUESS_KEY = 'codenames_active_guess';



type Tab = 'given' | 'solved' | 'comments';
type SortDir = 'asc' | 'desc';
type GivenSortField = 'number' | 'attempts' | 'avgScore' | 'date';
type SolvedSortField = 'number' | 'attempts' | 'avgScore' | 'myScore' | 'date';
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
  const [unfinishedModal, setUnfinishedModal] = useState<{ savedClueId: string; targetClueId: string } | null>(null);

  const [givenSort, setGivenSort] = useState<GivenSortField | null>('date');
  const [givenDir, setGivenDir] = useState<SortDir>('desc');
  const [solvedSort, setSolvedSort] = useState<SolvedSortField | null>('date');
  const [solvedDir, setSolvedDir] = useState<SortDir>('desc');

  const [expandedGivenId, setExpandedGivenId] = useState<string | null>(null);
  const [expandedSolvedKey, setExpandedSolvedKey] = useState<string | null>(null);

  // Profile comments (wall)
  const [profileComments, setProfileComments] = useState<{ id: number; authorId: string; displayName: string; content: string; createdAt: number; replyToId: number | null; replyToDisplayName: string | null; replyToContent: string | null }[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentReplyTo, setCommentReplyTo] = useState<{ id: number; displayName: string; content: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);



  // Load profile data only when profileId changes (not on user/settings updates)
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
    setProfileComments([]);

    api.getUserStats(profileId).then(setStats);
    api.getProfileComments(profileId).then(setProfileComments).catch(() => {});
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
  }, [profileId]);

  // Load current user's solved clue IDs separately (for "solve" button state on other profiles)
  useEffect(() => {
    if (user) {
      api.getResultsByUser(user.id).then((results) => {
        setMySolvedClueIds(new Set(results.map((r) => r.clueId)));
      });
    }
  }, [user?.id]);

  const sortedGiven = useMemo(() => {
    let filtered = cluesGiven;
    if (rankedFilter === 'ranked') filtered = filtered.filter((c) => c.ranked !== false);
    else if (rankedFilter === 'casual') filtered = filtered.filter((c) => c.ranked === false);
    if (solvedFilter === 'solved') filtered = filtered.filter((c) => mySolvedClueIds.has(c.id));
    else if (solvedFilter === 'unsolved') filtered = filtered.filter((c) => !mySolvedClueIds.has(c.id));
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let diff = 0;
      if (!givenSort || givenSort === 'date') diff = b.createdAt - a.createdAt;
      else if (givenSort === 'number') diff = b.number - a.number;
      else if (givenSort === 'attempts') diff = (clueStatsMap[b.id]?.attempts ?? 0) - (clueStatsMap[a.id]?.attempts ?? 0);
      else if (givenSort === 'avgScore') diff = (clueStatsMap[b.id]?.avgScore ?? 0) - (clueStatsMap[a.id]?.avgScore ?? 0);
      return givenDir === 'desc' ? diff : -diff;
    });
    return sorted;
  }, [cluesGiven, givenSort, givenDir, clueStatsMap, rankedFilter, solvedFilter, mySolvedClueIds]);

  const sortedSolved = useMemo(() => {
    let filtered = solvedEntries;
    if (rankedFilter === 'ranked') filtered = filtered.filter((e) => e.clue?.ranked !== false);
    else if (rankedFilter === 'casual') filtered = filtered.filter((e) => e.clue?.ranked === false);
    if (solvedFilter === 'solved') filtered = filtered.filter((e) => canViewClue(e.result.clueId, e.clue?.userId));
    else if (solvedFilter === 'unsolved') filtered = filtered.filter((e) => !canViewClue(e.result.clueId, e.clue?.userId));
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let diff = 0;
      if (!solvedSort || solvedSort === 'date') diff = b.result.timestamp - a.result.timestamp;
      else if (solvedSort === 'number') diff = (b.clue?.number ?? 0) - (a.clue?.number ?? 0);
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
  }, [solvedEntries, solvedSort, solvedDir, clueStatsMap, rankedFilter, solvedFilter, mySolvedClueIds, isOwnProfile, user]);

  function handleGivenAction(clue: Clue) {
    const solved = mySolvedClueIds.has(clue.id);
    const isOwn = clue.userId === user?.id;
    if (solved || isOwn || isOwnProfile) {
      setModalClue(clue);
      setModalResult(undefined);
    } else {
      // Check for unfinished game
      try {
        const saved = localStorage.getItem(ACTIVE_GUESS_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.clueId && state.pickedIndices?.length > 0 && state.clueId !== clue.id) {
            setUnfinishedModal({ savedClueId: state.clueId, targetClueId: clue.id });
            return;
          }
        }
      } catch { /* ignore */ }
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
      // Check for unfinished game
      try {
        const saved = localStorage.getItem(ACTIVE_GUESS_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state.clueId && state.pickedIndices?.length > 0 && state.clueId !== entry.clue.id) {
            setUnfinishedModal({ savedClueId: state.clueId, targetClueId: entry.clue.id });
            return;
          }
        }
      } catch { /* ignore */ }
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

  async function handleSendProfileComment() {
    if (!user || !commentText.trim() || commentSending) return;
    setCommentSending(true);
    try {
      const result = await api.addProfileComment(profileId, user.id, commentText.trim(), commentReplyTo?.id);
      setProfileComments((prev) => [{
        id: result.id,
        authorId: user.id,
        displayName: user.displayName,
        content: commentText.trim(),
        createdAt: Date.now(),
        replyToId: commentReplyTo?.id ?? null,
        replyToDisplayName: commentReplyTo?.displayName ?? null,
        replyToContent: commentReplyTo?.content ?? null,
      }, ...prev]);
      setCommentText('');
      setCommentReplyTo(null);
    } catch (err) {
      console.error('Failed to add profile comment:', err);
    } finally {
      setCommentSending(false);
    }
  }

  async function handleDeleteProfileComment(commentId: number) {
    if (!user?.isAdmin) return;
    try {
      await api.deleteProfileComment(commentId, user.id);
      setProfileComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete profile comment:', err);
    }
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
        {/* Header: nickname left, stats right */}
        <div className="flex items-start justify-between mb-3 pr-6">
          <h1 className="text-xl font-extrabold text-white truncate">{stats?.displayName || profileId}</h1>
          {stats && (
            <div className="text-right shrink-0 ml-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{t.profile.statsTitle}</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400"><span className="text-white font-bold">{stats.cluesGiven}</span> {t.profile.cluesGivenShort}</span>
                <span className="text-gray-400"><span className="text-white font-bold">{stats.cluesSolved}</span> {t.profile.cluesSolvedShort}</span>
                <span className="text-gray-400"><span className="text-white font-bold">{stats.avgScore}</span> {t.profile.avgShort}</span>
              </div>
            </div>
          )}
        </div>

        {user?.isAdmin && !isOwnProfile && (
          <div className="flex justify-center mb-3">
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
          <button
            onClick={() => setTab('comments')}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${tab === 'comments' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.profile.commentsTab}
            {profileComments.length > 0 && <span className="ml-1 text-xs opacity-70">({profileComments.length})</span>}
          </button>
        </div>

        {/* ===== GIVEN TAB ===== */}
        {tab === 'given' && (
          cluesGiven.length === 0 ? (
            <p className="text-center text-gray-500">{t.profile.noCluesGiven}</p>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
              <div className="sticky top-0 z-10 bg-board-bg grid grid-cols-[1fr_3.5rem_2rem_2rem] sm:grid-cols-[1fr_9rem_3.5rem_2rem_2rem] gap-x-2 px-4 py-1 items-center">
                <span className={thClass} onClick={() => toggleGivenSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={givenSort} dir={givenDir} /></span>
                <span className={`${thClass} text-center hidden sm:block`} onClick={() => toggleGivenSort('date')}>{t.profile.sortDate}<SortArrow field="date" activeField={givenSort} dir={givenDir} /></span>
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
                      className={`bg-gray-800/60 border rounded-lg px-4 py-2.5 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                    >
                      <div className="grid grid-cols-[1fr_3.5rem_2rem_2rem] sm:grid-cols-[1fr_9rem_3.5rem_2rem_2rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {clue.word} <span className="text-amber-400 font-semibold">{clue.number}</span>
                          {clue.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                        </span>
                        <span className="text-xs text-gray-500 text-center hidden sm:block">{clue.createdAt > 0 ? formatDate(clue.createdAt) : '—'}</span>
                        <span className="text-sm text-gray-400 text-center">{cStats && cStats.attempts > 0 ? cStats.avgScore.toFixed(1) : '—'}</span>
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
                            <button onClick={() => openProfile(clue.userId)} className="text-board-blue hover:text-blue-300 transition-colors font-semibold">{clue.userDisplayName || clue.userId}</button>
                          </span>
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{cStats?.attempts ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.avgScoreLabel}:</span> <span className="text-white font-semibold">{cStats && cStats.attempts > 0 ? cStats.avgScore.toFixed(1) : '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.ratingsCount}:</span> <span className="text-white font-semibold">{cStats?.ratingsCount ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.admin.avgRating}:</span> <span className="text-white font-semibold">{cStats && cStats.ratingsCount > 0 ? cStats.avgRating.toFixed(1) : '—'}</span></span>
                          <div className="col-span-2 flex items-center gap-2 justify-end mt-1">
                            {canView ? (
                              <button
                                onClick={() => handleGivenAction(clue)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {t.profile.viewBoard}
                              </button>
                            ) : clue.disabled ? null : clue.ranked !== false && !canPlayRanked(user) ? (
                              <span className="text-gray-500 text-xs italic">{buildRankedLockMessage(user)}</span>
                            ) : (
                              <button
                                onClick={() => handleGivenAction(clue)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {t.profile.solve}
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
              <div className="sticky top-0 z-10 bg-board-bg grid grid-cols-[1fr_3rem_2rem_2rem] sm:grid-cols-[1fr_9rem_3rem_3.5rem_2rem_2rem] gap-x-2 px-4 py-1 items-center">
                <span className={thClass} onClick={() => toggleSolvedSort('number')}>{t.leaderboard.clueWord}<SortArrow field="number" activeField={solvedSort} dir={solvedDir} /></span>
                <span className={`${thClass} text-center hidden sm:block`} onClick={() => toggleSolvedSort('date')}>{t.profile.sortDate}<SortArrow field="date" activeField={solvedSort} dir={solvedDir} /></span>
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
                      className={`bg-gray-800/60 border rounded-lg px-4 py-2.5 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                    >
                      <div className="grid grid-cols-[1fr_3rem_2rem_2rem] sm:grid-cols-[1fr_9rem_3rem_3.5rem_2rem_2rem] gap-x-2 items-center">
                        <span className="font-bold text-white uppercase text-sm truncate">
                          {entry.clue?.word ?? entry.result.clueId.slice(0, 12)}
                          <span className="ml-1 text-amber-400 font-semibold">{entry.clue?.number ?? entry.result.totalTargets}</span>
                        </span>
                        <span className="text-xs text-gray-500 text-center hidden sm:block">{entry.result.timestamp > 0 ? formatDate(entry.result.timestamp) : '—'}</span>
                        <span className="text-sm font-bold text-white text-center">
                          {entry.result.score ?? 0}
                          <span className="text-gray-500 font-normal ml-0.5 text-xs">({entry.result.correctCount}/{entry.result.totalTargets})</span>
                        </span>
                        <span className="text-sm text-gray-400 text-center hidden sm:block">{cStats && cStats.attempts > 0 ? cStats.avgScore.toFixed(1) : '—'}</span>
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
                              <button onClick={() => openProfile(entry.clue!.userId)} className="text-board-blue hover:text-blue-300 transition-colors font-semibold">{entry.clue!.userDisplayName || entry.clue.userId}</button>
                            </span>
                          ) : <span />}
                          <span><span className="text-gray-400">{t.profile.solveCount}:</span> <span className="text-white font-semibold">{cStats?.attempts ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.avgScoreLabel}:</span> <span className="text-white font-semibold">{cStats && cStats.attempts > 0 ? cStats.avgScore.toFixed(1) : '—'}</span></span>
                          <span><span className="text-gray-400">{t.results.ratingsCount}:</span> <span className="text-white font-semibold">{cStats?.ratingsCount ?? '—'}</span></span>
                          <span><span className="text-gray-400">{t.admin.avgRating}:</span> <span className="text-white font-semibold">{cStats && cStats.ratingsCount > 0 ? cStats.avgRating.toFixed(1) : '—'}</span></span>
                          <div className="col-span-2 flex items-center gap-2 justify-end mt-1">
                            {canView ? (
                              <button
                                onClick={() => handleSolvedAction(entry)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {t.profile.viewBoard}
                              </button>
                            ) : entry.clue?.disabled ? null : entry.clue?.ranked !== false && !canPlayRanked(user) ? (
                              <span className="text-gray-500 text-xs italic">{buildRankedLockMessage(user)}</span>
                            ) : (
                              <button
                                onClick={() => handleSolvedAction(entry)}
                                className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                              >
                                {t.profile.solve}
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
        {/* ===== COMMENTS TAB ===== */}
        {tab === 'comments' && (
          <div className="flex-1 min-h-0 flex flex-col">
            {user && (
              <div className="mb-3">
                {commentReplyTo && (
                  <div className="flex items-center gap-2 mb-1 px-3 py-1 bg-gray-700/40 border-l-2 border-board-blue rounded text-xs">
                    <span className="text-gray-400 truncate flex-1">
                      <span className="text-board-blue font-semibold">{commentReplyTo.displayName}</span>
                      <span className="text-gray-500">: {commentReplyTo.content.slice(0, 60)}{commentReplyTo.content.length > 60 ? '...' : ''}</span>
                    </span>
                    <button onClick={() => setCommentReplyTo(null)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && commentReplyTo) { setCommentReplyTo(null); return; }
                      if (e.key === 'Enter' && commentText.trim() && !commentSending) {
                        handleSendProfileComment();
                      }
                    }}
                    placeholder={commentReplyTo ? t.results.replyPlaceholder : t.results.commentPlaceholder}
                    className="flex-1 px-3 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:border-board-blue focus:outline-none"
                    maxLength={500}
                  />
                  <button
                    onClick={handleSendProfileComment}
                    disabled={!commentText.trim() || commentSending}
                    className="px-3 py-1.5 rounded bg-board-blue hover:brightness-110 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {t.results.commentSend}
                  </button>
                </div>
              </div>
            )}
            {profileComments.length === 0 ? (
              <p className="text-center text-gray-500">{t.results.noComments}</p>
            ) : (
              <div className="overflow-y-auto flex-1 min-h-0 space-y-2" style={{ scrollbarGutter: 'stable' }}>
                {profileComments.map((c) => (
                  <div key={c.id} className="text-sm group">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{formatDate(c.createdAt)}</span>
                      {user && (
                        <button
                          onClick={() => { setCommentReplyTo({ id: c.id, displayName: c.displayName, content: c.content }); commentInputRef.current?.focus(); }}
                          className="text-gray-600 hover:text-board-blue text-[0.65rem] font-semibold sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        >
                          {t.results.reply}
                        </button>
                      )}
                      {user?.isAdmin && (
                        <button
                          onClick={() => handleDeleteProfileComment(c.id)}
                          className="text-gray-600 hover:text-board-red text-xs font-bold sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          title="Удалить"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                    {c.replyToId && c.replyToDisplayName && (
                      <div className="ml-1 mb-0.5 pl-2 border-l-2 border-gray-600/50 text-[0.65rem] text-gray-500 truncate">
                        <span className="font-semibold">{c.replyToDisplayName}</span>: {c.replyToContent?.slice(0, 50)}{(c.replyToContent?.length ?? 0) > 50 ? '...' : ''}
                      </div>
                    )}
                    <div className="break-words overflow-hidden">
                      <button
                        onClick={() => openProfile(c.authorId)}
                        className="text-board-blue font-semibold hover:text-blue-300 transition-colors"
                      >
                        {c.displayName}
                      </button>
                      <span className="text-gray-300">: {c.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {unfinishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setUnfinishedModal(null)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-sm mb-4">У вас есть незавершённая игра</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setUnfinishedModal(null)}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => { const id = unfinishedModal.savedClueId; setUnfinishedModal(null); closeProfile(); navigate(`/guess/${id}`); }}
                className="px-5 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-semibold transition-colors"
              >
                Дорешать
              </button>
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
