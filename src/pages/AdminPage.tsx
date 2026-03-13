import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { useProfileModal } from '../context/ProfileModalContext';
import { api } from '../lib/api';
import type { AdminClue, AdminUser, AdminResult, AdminFeedback } from '../lib/api';
import NavBar from '../components/layout/NavBar';
import BoardReviewModal from '../components/game/BoardReviewModal';
import type { Clue, GuessResult } from '../types/game';

type AdminTab = 'clues' | 'users' | 'results' | 'feedback';
type SortField = 'createdAt' | 'reportCount' | 'word' | 'userId' | 'attempts' | 'avgScore';
type UserSortField = 'lastActivity' | 'createdAt' | 'cluesGiven' | 'cluesSolved' | 'avgScore' | 'displayName';
type ResultSortField = 'timestamp' | 'score' | 'userId' | 'clueWord';
type SortDir = 'asc' | 'desc';

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { openProfile } = useProfileModal();

  const [adminTab, setAdminTab] = useState<AdminTab | null>(null);
  const [clues, setClues] = useState<AdminClue[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [results, setResults] = useState<AdminResult[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<AdminFeedback[]>([]);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteResult, setConfirmDeleteResult] = useState<{ clueId: string; userId: string; timestamp: number } | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [renamingUserId, setRenamingUserId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [userSort, setUserSort] = useState<UserSortField>('lastActivity');
  const [userDir, setUserDir] = useState<SortDir>('desc');
  const [userSearch, setUserSearch] = useState('');

  const [resultSort, setResultSort] = useState<ResultSortField>('timestamp');
  const [resultDir, setResultDir] = useState<SortDir>('desc');
  const [resultSearch, setResultSearch] = useState('');

  // Display limits (show 100 rows at a time, client-side)
  const [cluesLimit, setCluesLimit] = useState(100);
  const [usersLimit, setUsersLimit] = useState(100);
  const [feedbackLimit, setFeedbackLimit] = useState(100);

  const [resultModalClue, setResultModalClue] = useState<Clue | null>(null);
  const [resultModalResult, setResultModalResult] = useState<GuessResult | undefined>(undefined);

  // Lazy loading: track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<AdminTab>>(new Set());
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcStatus, setRecalcStatus] = useState<string | null>(null);

  // Results pagination state
  const [resultsCursor, setResultsCursor] = useState<string | null>(null);
  const [resultsHasMore, setResultsHasMore] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [resultsOffset, setResultsOffset] = useState(0);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.isAdmin && adminTab) loadTabData(adminTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab]);

  function loadTabData(tab: AdminTab) {
    if (!user?.isAdmin || loadedTabs.has(tab)) return;
    setLoadedTabs((prev) => new Set(prev).add(tab));
    if (tab === 'clues') api.adminGetAllClues(user.id).then(setClues);
    else if (tab === 'users') api.adminGetUsers(user.id).then(setUsers);
    else if (tab === 'results') fetchResults(true);
    else if (tab === 'feedback') api.adminGetFeedback(user.id).then(setFeedbackItems);
  }

  // Store mutable refs for pagination state used in loadMore
  const resultsCursorRef = useRef(resultsCursor);
  const resultsOffsetRef = useRef(resultsOffset);
  const resultsLoadingRef = useRef(resultsLoading);
  resultsCursorRef.current = resultsCursor;
  resultsOffsetRef.current = resultsOffset;
  resultsLoadingRef.current = resultsLoading;

  const fetchResults = useCallback(async (reset = false) => {
    if (!user?.isAdmin || resultsLoadingRef.current) return;
    setResultsLoading(true);
    try {
      const isTimestampSort = resultSort === 'timestamp';
      const cursor = reset ? undefined : (isTimestampSort && !resultSearch.trim() ? resultsCursorRef.current ?? undefined : undefined);
      const offset = reset ? 0 : (!isTimestampSort || resultSearch.trim() ? resultsOffsetRef.current : 0);
      const data = await api.adminGetResults(user.id, {
        limit: 100,
        cursor,
        search: resultSearch.trim() || undefined,
        sortField: resultSort,
        sortDir: resultDir,
        offset,
      });
      if (reset) {
        setResults(data.items);
      } else {
        setResults((prev) => [...prev, ...data.items]);
      }
      setResultsHasMore(data.hasMore);
      setResultsCursor(data.nextCursor);
      setResultsOffset(reset ? data.items.length : resultsOffsetRef.current + data.items.length);
      if (data.total != null) setResultsTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setResultsLoading(false);
    }
  }, [user, resultSort, resultDir, resultSearch]);

  async function handleRecalcAll() {
    setRecalcLoading(true);
    setRecalcStatus(null);
    try {
      await api.recalcAll();
      setRecalcStatus('ok');
    } catch {
      setRecalcStatus('error');
    } finally {
      setRecalcLoading(false);
      setTimeout(() => setRecalcStatus(null), 3000);
    }
  }

  if (!user?.isAdmin) return null;

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
    setCluesLimit(100);
  }

  function toggleUserSort(field: UserSortField) {
    if (userSort === field) setUserDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setUserSort(field); setUserDir('desc'); }
    setUsersLimit(100);
  }

  function toggleResultSort(field: ResultSortField) {
    if (resultSort === field) setResultDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setResultSort(field); setResultDir('desc'); }
    // Reset will be triggered by useEffect below
  }

  // Re-fetch results when sort changes
  useEffect(() => {
    if (!loadedTabs.has('results') || !user?.isAdmin) return;
    fetchResultsReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultSort, resultDir]);

  function handleResultSearchChange(value: string) {
    setResultSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchResultsReset();
    }, 300);
  }

  function fetchResultsReset() {
    if (!user?.isAdmin) return;
    setResultsLoading(true);
    setResultsCursor(null);
    setResultsOffset(0);
    api.adminGetResults(user.id, {
      limit: 100,
      search: resultSearch.trim() || undefined,
      sortField: resultSort,
      sortDir: resultDir,
    }).then((data) => {
      setResults(data.items);
      setResultsHasMore(data.hasMore);
      setResultsCursor(data.nextCursor);
      setResultsOffset(data.items.length);
      if (data.total != null) setResultsTotal(data.total);
    }).catch((err) => {
      console.error('Failed to fetch results:', err);
    }).finally(() => {
      setResultsLoading(false);
    });
  }

  function handleResultsScroll() {
    const el = resultsContainerRef.current;
    if (!el || resultsLoading || !resultsHasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      fetchResults(false);
    }
  }

  async function handleViewClue(clue: AdminClue) {
    const fullClue = await api.getClueById(clue.id, true);
    if (!fullClue) return;
    setResultModalClue(fullClue);
    setResultModalResult(undefined);
  }

  async function handleToggleClueDisabled(clueId: string, currentDisabled: boolean) {
    if (!user) return;
    try {
      await api.toggleClueDisabled(clueId, user.id, !currentDisabled);
      setClues((prev) => prev.map((c) => c.id === clueId ? { ...c, disabled: !currentDisabled } : c));
    } catch (err) { console.error('Failed to toggle clue disabled:', err); }
  }

  async function handleToggleResultDisabled(r: AdminResult) {
    if (!user) return;
    const newDisabled = !r.disabled;
    try {
      await api.toggleResultDisabled(r.clueId, r.userId, r.timestamp, newDisabled, user.id);
      setResults((prev) => prev.map((res) =>
        res.clueId === r.clueId && res.userId === r.userId && res.timestamp === r.timestamp
          ? { ...res, disabled: newDisabled } : res
      ));
    } catch (err) { console.error('Failed to toggle result disabled:', err); }
  }

  async function handleDeleteClue(clueId: string) {
    await api.adminDeleteClue(user!.id, clueId);
    setClues((prev) => prev.filter((c) => c.id !== clueId));
    setResults((prev) => prev.filter((r) => r.clueId !== clueId));
    setConfirmDeleteId(null);
    showDeleted();
  }

  async function handleDeleteResult(clueId: string, userId: string, timestamp: number) {
    await api.adminDeleteResult(user!.id, clueId, userId, timestamp);
    setResults((prev) => prev.filter((r) => !(r.clueId === clueId && r.userId === userId && r.timestamp === timestamp)));
    setConfirmDeleteResult(null);
    showDeleted();
  }

  async function handleViewResult(r: AdminResult) {
    const clue = await api.getClueById(r.clueId, true);
    if (!clue) return;
    setResultModalClue(clue);
    setResultModalResult({
      clueId: r.clueId,
      userId: r.userId,
      score: r.score,
      correctCount: r.correctCount,
      totalTargets: r.totalTargets,
      timestamp: r.timestamp,
      guessedIndices: r.guessedIndices || [],
      boardSize: r.boardSize as any,
    });
  }

  async function handleDeleteUser(userId: string) {
    await api.adminDeleteUser(user!.id, userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setClues((prev) => prev.filter((c) => c.userId !== userId));
    setResults((prev) => prev.filter((r) => r.userId !== userId));
    setConfirmDeleteUserId(null);
    showDeleted();
  }

  async function handleAdminRename(userId: string) {
    if (!user) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length < 2) { setRenameError('Мин. 2 символа'); return; }
    if (trimmed.length > 20) { setRenameError('Макс. 20 символов'); return; }
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9 \-()[\]]+$/.test(trimmed)) { setRenameError('Недопустимые символы'); return; }
    setRenameSaving(true);
    try {
      await api.adminRenameUser(user.id, userId, trimmed);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, displayName: trimmed } : u));
      setRenamingUserId(null);
      setRenameError('');
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Error');
    } finally {
      setRenameSaving(false);
    }
  }

  function showDeleted() {
    setDeletedMessage('deleted');
    setTimeout(() => setDeletedMessage(null), 2000);
  }

  const filtered = clues.filter((c) =>
    c.userId.toLowerCase().includes(search.toLowerCase()) ||
    c.word.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'createdAt') diff = b.createdAt - a.createdAt;
    else if (sortField === 'reportCount') diff = b.reportCount - a.reportCount;
    else if (sortField === 'word') diff = a.word.localeCompare(b.word);
    else if (sortField === 'userId') diff = a.userId.localeCompare(b.userId);
    else if (sortField === 'attempts') diff = b.attempts - a.attempts;
    else if (sortField === 'avgScore') diff = b.avgScore - a.avgScore;
    return sortDir === 'desc' ? diff : -diff;
  });

  const filteredUsers = users.filter((u) =>
    u.id.toLowerCase().includes(userSearch.toLowerCase()) || u.displayName.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let diff = 0;
    if (userSort === 'lastActivity') diff = b.lastActivity - a.lastActivity;
    else if (userSort === 'createdAt') diff = b.createdAt - a.createdAt;
    else if (userSort === 'cluesGiven') diff = b.cluesGiven - a.cluesGiven;
    else if (userSort === 'cluesSolved') diff = b.cluesSolved - a.cluesSolved;
    else if (userSort === 'avgScore') diff = b.avgScore - a.avgScore;
    else if (userSort === 'displayName') diff = a.displayName.localeCompare(b.displayName);
    return userDir === 'desc' ? diff : -diff;
  });


  const thClass = 'py-1 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none';

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 pt-4 flex flex-col flex-1 min-h-0 w-full relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-6 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-base sm:text-lg font-extrabold text-white">{t.admin.title}</span>
          <button
            onClick={handleRecalcAll}
            disabled={recalcLoading}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-bold text-xs transition-colors ${
              recalcStatus === 'ok' ? 'bg-green-700 text-white' :
              recalcStatus === 'error' ? 'bg-board-red text-white' :
              recalcLoading ? 'bg-gray-700 text-gray-400' :
              'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            {recalcLoading ? '...' : recalcStatus === 'ok' ? 'OK' : recalcStatus === 'error' ? 'ERR' : 'Recalc'}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 mb-4">
          <button
            onClick={() => setAdminTab('clues')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${adminTab === 'clues' ? 'bg-board-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.cluesTab} ({clues.length})
          </button>
          <button
            onClick={() => setAdminTab('results')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${adminTab === 'results' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.resultsTab} ({resultsTotal || results.length})
          </button>
          <button
            onClick={() => setAdminTab('users')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${adminTab === 'users' ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.usersTab} ({users.length})
          </button>
          <button
            onClick={() => setAdminTab('feedback')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors ${adminTab === 'feedback' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.feedbackTab} ({feedbackItems.length})
          </button>
        </div>

        {deletedMessage && (
          <div className="mb-4 text-center text-green-400 text-sm font-semibold">
            {t.admin.deleted}
          </div>
        )}

        {/* ======== CLUES TAB ======== */}
        {adminTab === 'clues' && (<div className="flex flex-col flex-1 min-h-0">
        <div className="mb-4">
          <input
            type="text"
            placeholder={t.admin.search}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCluesLimit(100); }}
            className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="text-sm text-gray-400 mb-2">
          {t.admin.allClues} ({filtered.length})
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_2rem_4.5rem_4rem_1fr_3rem_2rem_2rem] gap-2 px-4 py-1 items-center">
          <span className={thClass} onClick={() => toggleSort('word')}>{t.admin.clueWord}<SortArrow field="word" activeField={sortField} dir={sortDir} /></span>
          <span className={thClass} onClick={() => toggleSort('userId')}>{t.admin.clueAuthor}<SortArrow field="userId" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`} title="Рейтинговая">★</span>
          <span className={`${thClass} text-center`} onClick={() => toggleSort('attempts')}>{t.admin.attempts}<SortArrow field="attempts" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`} onClick={() => toggleSort('avgScore')}>{t.admin.avgScore}<SortArrow field="avgScore" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`} onClick={() => toggleSort('createdAt')}>{t.admin.clueDate}<SortArrow field="createdAt" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`} onClick={() => toggleSort('reportCount')}>{t.admin.reportsCount}<SortArrow field="reportCount" activeField={sortField} dir={sortDir} /></span>
          <span></span>
          <span></span>
        </div>

        <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
          {sorted.slice(0, cluesLimit).map((clue) => (
            <div key={clue.id}>
              <div
                onClick={() => handleViewClue(clue)}
                className="bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-1.5 cursor-pointer transition-colors hover:border-gray-600"
              >
                <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.5fr_1fr_2rem_4.5rem_4rem_1fr_3rem_2rem_2rem] gap-x-2 items-center">
                  <span className="font-bold text-white uppercase text-sm truncate">
                    {clue.word} <span className="text-amber-400 font-semibold">{clue.number}</span>
                    {clue.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                    {clue.redCount != null && (
                      <span className="ml-1 text-[0.6rem] text-purple-400 font-bold" title={`${clue.redCount}/${clue.blueCount}/${clue.assassinCount}`}>
                        {clue.redCount}/{clue.blueCount}/{clue.assassinCount}
                      </span>
                    )}
                    <span className="md:hidden text-xs text-gray-500 font-normal normal-case ml-1">— {clue.displayName}</span>
                  </span>
                  <span className="hidden md:block text-sm truncate">
                    <button
                      onClick={(e) => { e.stopPropagation(); openProfile(clue.userId); }}
                      className="text-board-blue hover:text-blue-300 transition-colors"
                    >
                      {clue.displayName}
                    </button>
                  </span>
                  <span className="hidden md:block text-sm text-center">{clue.ranked ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                  <span className="hidden md:block text-sm text-center text-gray-400">{clue.attempts || '—'}</span>
                  <span className="hidden md:block text-sm text-center text-gray-400">{clue.avgScore > 0 ? clue.avgScore.toFixed(1) : '—'}</span>
                  <span className="hidden md:block text-gray-400 text-sm text-center">
                    {formatDateTime(clue.createdAt)}
                  </span>
                  <span
                    className={`hidden md:block text-sm font-semibold text-center ${
                      clue.reportCount > 0 ? 'text-board-red' : 'text-gray-500'
                    }`}
                  >
                    {clue.reportCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleClueDisabled(clue.id, clue.disabled);
                    }}
                    className={`text-sm font-bold transition-colors leading-none ${clue.disabled ? 'text-board-red hover:text-red-300' : 'text-board-blue hover:text-blue-300'}`}
                    title={clue.disabled ? 'Включить' : 'Выключить'}
                  >
                    {clue.disabled ? '✗' : '✓'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(clue.id);
                    }}
                    className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                    title={t.admin.deleteClue}
                  >
                    &times;
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sorted.length > cluesLimit && (
            <button
              onClick={() => setCluesLimit((l) => l + 100)}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Показать ещё ({sorted.length - cluesLimit})
            </button>
          )}
        </div>
        </div>)}

        {/* ======== RESULTS TAB ======== */}
        {adminTab === 'results' && (<div className="flex flex-col flex-1 min-h-0">
          <div className="mb-4">
            <input
              type="text"
              placeholder={t.admin.searchResults}
              value={resultSearch}
              onChange={(e) => handleResultSearchChange(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="text-sm text-gray-400 mb-2">
            {t.admin.allResults} ({results.length}{resultsTotal > 0 ? ` / ${resultsTotal}` : ''})
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_4.5rem_2rem_1fr_2rem_2rem] gap-2 px-4 py-1 items-center">
            <span className={thClass} onClick={() => toggleResultSort('clueWord')}>{t.admin.clueWord}<SortArrow field="clueWord" activeField={resultSort} dir={resultDir} /></span>
            <span className={thClass} onClick={() => toggleResultSort('userId')}>{t.admin.player}<SortArrow field="userId" activeField={resultSort} dir={resultDir} /></span>
            <span className={`${thClass} text-center`} onClick={() => toggleResultSort('score')}>{t.admin.score}<SortArrow field="score" activeField={resultSort} dir={resultDir} /></span>
            <span className={`${thClass} text-center`} title="Рейтинговая">★</span>
            <span className={`${thClass} text-center`} onClick={() => toggleResultSort('timestamp')}>{t.admin.clueDate}<SortArrow field="timestamp" activeField={resultSort} dir={resultDir} /></span>
            <span></span>
            <span></span>
          </div>

          <div ref={resultsContainerRef} onScroll={handleResultsScroll} className="space-y-1 overflow-y-auto flex-1 min-h-0">
            {results.map((r, i) => (
              <div
                key={`${r.clueId}-${r.userId}-${r.timestamp}-${i}`}
                onClick={() => handleViewResult(r)}
                className="bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-1.5 cursor-pointer transition-colors hover:border-gray-600"
              >
                <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.5fr_1fr_4.5rem_2rem_1fr_2rem_2rem] gap-x-2 items-center">
                  <span className="font-bold text-white uppercase text-sm truncate">
                    {r.clueWord || r.clueId.slice(0, 12)}
                    {r.clueNumber != null && <span className="ml-1 text-amber-400 font-semibold">{r.clueNumber}</span>}
                    {r.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                    <span className="md:hidden text-xs text-gray-500 font-normal normal-case ml-1">— {r.userId}</span>
                  </span>
                  <span className="hidden md:block text-sm truncate">
                    <button
                      onClick={(e) => { e.stopPropagation(); openProfile(r.userId); }}
                      className="text-board-blue hover:text-blue-300 transition-colors"
                    >
                      {r.userId}
                    </button>
                  </span>
                  <span className="hidden md:block text-sm text-center font-bold text-white">
                    {r.score}
                    <span className="text-gray-500 font-normal ml-0.5 text-xs">({r.correctCount}/{r.totalTargets})</span>
                  </span>
                  <span className="hidden md:block text-sm text-center">{r.ranked ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                  <span className="hidden md:block text-gray-400 text-sm text-center">{formatDateTime(r.timestamp)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleResultDisabled(r);
                    }}
                    className={`text-sm font-bold transition-colors leading-none ${r.disabled ? 'text-board-red hover:text-red-300' : 'text-board-blue hover:text-blue-300'}`}
                    title={r.disabled ? 'Включить' : 'Выключить'}
                  >
                    {r.disabled ? '✗' : '✓'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteResult({ clueId: r.clueId, userId: r.userId, timestamp: r.timestamp }); }}
                    className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
            {resultsLoading && (
              <div className="text-center py-3 text-gray-500 text-sm">Загрузка...</div>
            )}
            {!resultsLoading && resultsHasMore && (
              <button
                onClick={() => fetchResults(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Загрузить ещё
              </button>
            )}
          </div>
        </div>)}

        {/* ======== USERS TAB ======== */}
        {adminTab === 'users' && (<div className="flex flex-col flex-1 min-h-0">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUsersLimit(100); }}
              className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="text-sm text-gray-400 mb-2">
            {t.admin.userCount}: {filteredUsers.length}
          </div>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_4.5rem_4.5rem_4rem_1fr_1fr_2rem] gap-2 px-4 py-1 items-center">
            <span className={thClass} onClick={() => toggleUserSort('displayName')}>{t.leaderboard.player}<SortArrow field="displayName" activeField={userSort} dir={userDir} /></span>
            <span className={`${thClass} text-center`} onClick={() => toggleUserSort('cluesGiven')}>{t.admin.given}<SortArrow field="cluesGiven" activeField={userSort} dir={userDir} /></span>
            <span className={`${thClass} text-center`} onClick={() => toggleUserSort('cluesSolved')}>{t.admin.solved}<SortArrow field="cluesSolved" activeField={userSort} dir={userDir} /></span>
            <span className={`${thClass} text-center`} onClick={() => toggleUserSort('avgScore')}>{t.admin.avgScore}<SortArrow field="avgScore" activeField={userSort} dir={userDir} /></span>
            <span className={`${thClass} text-center`} onClick={() => toggleUserSort('createdAt')}>{t.admin.registered}<SortArrow field="createdAt" activeField={userSort} dir={userDir} /></span>
            <span className={`${thClass} text-center`} onClick={() => toggleUserSort('lastActivity')}>{t.admin.lastActive}<SortArrow field="lastActivity" activeField={userSort} dir={userDir} /></span>
            <span></span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
            {sortedUsers.slice(0, usersLimit).map((u) => {
              const isExpanded = expandedUserId === u.id;
              return (
                <div key={u.id}>
                  <div
                    onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                    className={`bg-gray-800/60 border rounded-lg px-4 py-1.5 cursor-pointer transition-colors hover:border-gray-600 ${isExpanded ? 'border-gray-500' : 'border-gray-700/30'}`}
                  >
                    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_4.5rem_4.5rem_4rem_1fr_1fr_2rem] gap-x-2 items-center">
                      <span className="text-sm truncate">
                        <span className="font-semibold text-white">{u.displayName}</span>
                        {u.isAdmin && <span className="ml-1 text-[0.6rem] text-board-blue font-bold">ADM</span>}
                        <span className="md:hidden text-xs text-gray-500 font-normal ml-1">({u.cluesGiven}/{u.cluesSolved})</span>
                      </span>
                      <span className="hidden md:block text-sm text-center text-gray-300">{u.cluesGiven}</span>
                      <span className="hidden md:block text-sm text-center text-gray-300">{u.cluesSolved}</span>
                      <span className="hidden md:block text-sm text-center text-gray-300">{u.avgScore > 0 ? u.avgScore.toFixed(1) : '—'}</span>
                      <span className="hidden md:block text-sm text-center text-gray-500">{formatDateTime(u.createdAt)}</span>
                      <span className="hidden md:block text-sm text-center text-gray-400">{formatDateTime(u.lastActivity)}</span>
                      {!u.isAdmin ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedUserId(u.id); setConfirmDeleteUserId(u.id); }}
                          className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                          title={t.admin.deleteUser}
                        >
                          &times;
                        </button>
                      ) : <span></span>}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <span><span className="text-gray-400">{t.admin.registered}:</span> <span className="text-white">{formatDateTime(u.createdAt)}</span></span>
                        <span><span className="text-gray-400">{t.admin.lastActive}:</span> <span className="text-white">{formatDateTime(u.lastActivity)}</span></span>
                        <button
                          onClick={() => openProfile(u.id)}
                          className="px-3 py-1 rounded-lg bg-board-blue hover:brightness-110 text-white text-sm font-semibold transition-colors"
                        >
                          {t.admin.viewProfile}
                        </button>
                        {renamingUserId === u.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => { setRenameValue(e.target.value); setRenameError(''); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAdminRename(u.id); if (e.key === 'Escape') { setRenamingUserId(null); setRenameError(''); } }}
                              autoFocus
                              className="px-2 py-1 rounded bg-gray-900 border border-gray-600 text-white text-sm font-bold focus:outline-none focus:border-board-blue w-36"
                              maxLength={20}
                            />
                            <button onClick={() => handleAdminRename(u.id)} disabled={renameSaving} className="text-board-blue hover:text-blue-300 transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                            </button>
                            <button onClick={() => { setRenamingUserId(null); setRenameError(''); }} className="text-gray-400 hover:text-white transition-colors">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setRenamingUserId(u.id); setRenameValue(u.displayName); setRenameError(''); }}
                            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-sm font-semibold transition-colors flex items-center gap-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            Переименовать
                          </button>
                        )}
                      </div>
                      {renameError && renamingUserId === u.id && (
                        <p className="text-board-red text-xs mt-1">{renameError}</p>
                      )}

                      {/* OAuth providers */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">OAuth:</span>
                        {u.oauthProviders.length > 0 ? (
                          u.oauthProviders.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded bg-gray-700 text-white text-xs font-semibold">
                              {p === 'google' ? 'Google' : p === 'discord' ? 'Discord' : p}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </div>

                      {/* Ranked/casual stats */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-900/50 rounded-lg p-2.5">
                          <p className="text-gray-400 text-xs font-semibold mb-1.5">Обычные</p>
                          <div className="flex gap-4">
                            <span><span className="text-gray-500">{t.admin.given}:</span> <span className="text-white font-semibold">{u.casualCluesGiven}</span></span>
                            <span><span className="text-gray-500">{t.admin.solved}:</span> <span className="text-white font-semibold">{u.casualCluesSolved}</span></span>
                          </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-2.5">
                          <p className="text-amber-500/70 text-xs font-semibold mb-1.5">★ Рейтинговые</p>
                          <div className="flex gap-4">
                            <span><span className="text-gray-500">{t.admin.given}:</span> <span className="text-white font-semibold">{u.rankedCluesGiven}</span></span>
                            <span><span className="text-gray-500">{t.admin.solved}:</span> <span className="text-white font-semibold">{u.rankedCluesSolved}</span></span>
                          </div>
                        </div>
                      </div>

                      {confirmDeleteUserId === u.id && (
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-700/30">
                          <span className="text-sm text-board-red">{t.admin.confirmDeleteUser.replace('{name}', u.displayName)}</span>
                          <button onClick={() => handleDeleteUser(u.id)} className="px-2 py-1 text-xs font-bold text-white bg-board-red/80 hover:bg-board-red rounded transition-colors">{t.admin.confirm}</button>
                          <button onClick={() => setConfirmDeleteUserId(null)} className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-700 hover:bg-gray-600 rounded transition-colors">{t.admin.cancel}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {sortedUsers.length > usersLimit && (
              <button
                onClick={() => setUsersLimit((l) => l + 100)}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Показать ещё ({sortedUsers.length - usersLimit})
              </button>
            )}
          </div>
        </div>)}

        {/* ======== FEEDBACK TAB ======== */}
        {adminTab === 'feedback' && (<div className="flex flex-col flex-1 min-h-0">
          <div className="text-sm text-gray-400 mb-2">
            {t.admin.feedbackTab} ({feedbackItems.length})
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
            {feedbackItems.length === 0 && (
              <p className="text-gray-500 text-sm">{t.admin.noFeedback}</p>
            )}
            {feedbackItems.slice(0, feedbackLimit).map((item) => (
              <div key={item.id} className="bg-gray-800/60 border border-gray-700/30 rounded-lg p-4">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>
                    {t.admin.feedbackFrom}:{' '}
                    <button
                      onClick={() => openProfile(item.userId)}
                      className="text-board-blue hover:text-blue-300 transition-colors"
                    >
                      {item.displayName}
                    </button>
                  </span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="text-gray-200 text-sm whitespace-pre-wrap mb-2">{item.message}</p>
                {item.screenshots && item.screenshots.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {item.screenshots.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-24 h-24 object-cover rounded border border-gray-600 hover:border-gray-400 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {feedbackItems.length > feedbackLimit && (
              <button
                onClick={() => setFeedbackLimit((l) => l + 100)}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Показать ещё ({feedbackItems.length - feedbackLimit})
              </button>
            )}
          </div>
        </div>)}
      </div>

      {/* Confirm delete clue modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-gray-800 border border-gray-700/30 rounded-lg p-6 max-w-sm mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmDeleteId(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white font-bold mb-4">
              {t.admin.confirmDeleteClue}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
              >
                {t.admin.cancel}
              </button>
              <button
                onClick={() => handleDeleteClue(confirmDeleteId)}
                className="bg-board-red hover:bg-board-red/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
              >
                {t.admin.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result board modal */}
      {resultModalClue && (
        <BoardReviewModal
          clue={resultModalClue}
          result={resultModalResult}
          onClose={() => { setResultModalClue(null); setResultModalResult(undefined); }}
        />
      )}

      {/* Confirm delete result modal */}
      {confirmDeleteResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDeleteResult(null)}>
          <div className="bg-gray-800 border border-gray-700/30 rounded-lg p-6 max-w-sm mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setConfirmDeleteResult(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white text-xl leading-none transition-colors">&times;</button>
            <p className="text-white font-bold mb-4">
              {t.admin.confirmDeleteResult}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteResult(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
              >
                {t.admin.cancel}
              </button>
              <button
                onClick={() => handleDeleteResult(confirmDeleteResult.clueId, confirmDeleteResult.userId, confirmDeleteResult.timestamp)}
                className="bg-board-red hover:bg-board-red/80 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
              >
                {t.admin.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
