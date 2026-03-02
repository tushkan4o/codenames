import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import { generateBoard } from '../lib/boardGenerator';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../types/game';
import type { AdminClue, AdminUser, AdminResult, Report, RatingStats } from '../lib/api';
import type { BoardSize } from '../types/game';
import NavBar from '../components/layout/NavBar';
import Board from '../components/board/Board';
import ClueStatsPanel from '../components/game/ClueStatsPanel';

type AdminTab = 'clues' | 'users' | 'results';
type SortField = 'createdAt' | 'reportCount' | 'word' | 'userId';
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

function AdminBoard({ clue, pickPercents, viewingAttemptPicks }: { clue: AdminClue; pickPercents?: Record<number, number>; viewingAttemptPicks?: number[] | null }) {
  const config = clue.boardSize && BOARD_CONFIGS[clue.boardSize as BoardSize]
    ? BOARD_CONFIGS[clue.boardSize as BoardSize]
    : BOARD_CONFIG_LEGACY_5x5;
  const board = useMemo(
    () => generateBoard(clue.boardSeed, config, clue.wordPack || 'ru'),
    [clue.boardSeed, config, clue.wordPack],
  );

  const displayCards = board.cards.map((card) => ({ ...card, revealed: true }));
  const hasAttemptPicks = viewingAttemptPicks && viewingAttemptPicks.length > 0;

  return (
    <Board
      cards={displayCards}
      columns={config.cols}
      showColors={true}
      selectedIndices={clue.targetIndices}
      targetIndices={clue.targetIndices}
      nullIndices={clue.nullIndices || []}
      disabled={true}
      pickOrder={hasAttemptPicks ? viewingAttemptPicks : undefined}
      highlightTargets={true}
      pickPercents={!hasAttemptPicks ? pickPercents : undefined}
    />
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [adminTab, setAdminTab] = useState<AdminTab>('clues');
  const [clues, setClues] = useState<AdminClue[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [results, setResults] = useState<AdminResult[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, RatingStats>>({});
  const [reports, setReports] = useState<Record<string, Report[]>>({});
  const [pickPercentsMap, setPickPercentsMap] = useState<Record<string, Record<number, number>>>({});
  const [viewingAttemptPicks, setViewingAttemptPicks] = useState<Record<string, number[] | null>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteResult, setConfirmDeleteResult] = useState<{ clueId: string; userId: string; timestamp: number } | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [userSort, setUserSort] = useState<UserSortField>('lastActivity');
  const [userDir, setUserDir] = useState<SortDir>('desc');
  const [userSearch, setUserSearch] = useState('');

  const [resultSort, setResultSort] = useState<ResultSortField>('timestamp');
  const [resultDir, setResultDir] = useState<SortDir>('desc');
  const [resultSearch, setResultSearch] = useState('');

  // Track stats refresh key per clue to force ClueStatsPanel reload
  const [statsRefreshKey, setStatsRefreshKey] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    api.adminGetAllClues(user.id).then(setClues);
    api.adminGetUsers(user.id).then(setUsers);
    api.adminGetAllResults(user.id).then(setResults);
  }, [user, navigate]);

  if (!user?.isAdmin) return null;

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function toggleUserSort(field: UserSortField) {
    if (userSort === field) setUserDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setUserSort(field); setUserDir('desc'); }
  }

  function toggleResultSort(field: ResultSortField) {
    if (resultSort === field) setResultDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setResultSort(field); setResultDir('desc'); }
  }

  async function toggleExpand(clueId: string) {
    if (expandedId === clueId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(clueId);

    if (!pickPercentsMap[clueId]) {
      api.getClueStats(clueId).then((s) => {
        if (s.attempts > 0) {
          const pcts: Record<number, number> = {};
          const counts = (s as { pickCounts?: Record<number, number> }).pickCounts || {};
          for (const [idx, cnt] of Object.entries(counts)) {
            pcts[Number(idx)] = Math.round((cnt as number / s.attempts) * 100);
          }
          setPickPercentsMap((prev) => ({ ...prev, [clueId]: pcts }));
        }
      });
    }
    if (!ratings[clueId]) {
      api.adminGetRatings(user!.id, clueId).then((r) => {
        setRatings((prev) => ({ ...prev, [clueId]: r }));
      });
    }
    if (!reports[clueId]) {
      const clueReports = await api.adminGetReports(user!.id, clueId);
      setReports((prev) => ({ ...prev, [clueId]: clueReports }));
    }
  }

  async function handleDeleteClue(clueId: string) {
    await api.adminDeleteClue(user!.id, clueId);
    setClues((prev) => prev.filter((c) => c.id !== clueId));
    setResults((prev) => prev.filter((r) => r.clueId !== clueId));
    setConfirmDeleteId(null);
    setExpandedId(null);
    showDeleted();
  }

  async function handleDeleteResult(clueId: string, userId: string, timestamp: number) {
    await api.adminDeleteResult(user!.id, clueId, userId, timestamp);
    setResults((prev) => prev.filter((r) => !(r.clueId === clueId && r.userId === userId && r.timestamp === timestamp)));
    setConfirmDeleteResult(null);
    // Refresh pick percents and stats for the affected clue
    setPickPercentsMap((prev) => { const next = { ...prev }; delete next[clueId]; return next; });
    setStatsRefreshKey((prev) => ({ ...prev, [clueId]: (prev[clueId] || 0) + 1 }));
    api.getClueStats(clueId).then((s) => {
      if (s.attempts > 0) {
        const pcts: Record<number, number> = {};
        const counts = (s as { pickCounts?: Record<number, number> }).pickCounts || {};
        for (const [idx, cnt] of Object.entries(counts)) {
          pcts[Number(idx)] = Math.round((cnt as number / s.attempts) * 100);
        }
        setPickPercentsMap((prev) => ({ ...prev, [clueId]: pcts }));
      }
    });
    showDeleted();
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

  const filteredResults = results.filter((r) => {
    const q = resultSearch.toLowerCase();
    if (!q) return true;
    return r.userId.toLowerCase().includes(q) || (r.clueWord || '').toLowerCase().includes(q);
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    let diff = 0;
    if (resultSort === 'timestamp') diff = b.timestamp - a.timestamp;
    else if (resultSort === 'score') diff = b.score - a.score;
    else if (resultSort === 'userId') diff = a.userId.localeCompare(b.userId);
    else if (resultSort === 'clueWord') diff = (a.clueWord || '').localeCompare(b.clueWord || '');
    return resultDir === 'desc' ? diff : -diff;
  });

  const thClass = 'py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none';

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">
          {t.admin.title}
        </h1>

        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setAdminTab('clues')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${adminTab === 'clues' ? 'bg-board-red text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.cluesTab} ({clues.length})
          </button>
          <button
            onClick={() => setAdminTab('results')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${adminTab === 'results' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.resultsTab} ({results.length})
          </button>
          <button
            onClick={() => setAdminTab('users')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${adminTab === 'users' ? 'bg-board-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {t.admin.usersTab} ({users.length})
          </button>
        </div>

        {deletedMessage && (
          <div className="mb-4 text-center text-green-400 text-sm font-semibold">
            {t.admin.deleted}
          </div>
        )}

        {/* ======== CLUES TAB ======== */}
        {adminTab === 'clues' && (<>
        <div className="mb-4">
          <input
            type="text"
            placeholder={t.admin.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </div>

        <div className="text-sm text-gray-400 mb-2">
          {t.admin.allClues} ({filtered.length})
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1.2fr_1fr_2rem_1.2fr_0.5fr_2rem] gap-2 px-4 py-2">
          <span className={thClass} onClick={() => toggleSort('word')}>{t.admin.clueWord}<SortArrow field="word" activeField={sortField} dir={sortDir} /></span>
          <span className={thClass} onClick={() => toggleSort('userId')}>{t.admin.clueAuthor}<SortArrow field="userId" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`} title="Рейтинговая">★</span>
          <span className={thClass} onClick={() => toggleSort('createdAt')}>{t.admin.clueDate}<SortArrow field="createdAt" activeField={sortField} dir={sortDir} /></span>
          <span className={thClass} onClick={() => toggleSort('reportCount')}>{t.admin.reportsCount}<SortArrow field="reportCount" activeField={sortField} dir={sortDir} /></span>
          <span></span>
        </div>

        <div className="space-y-1">
          {sorted.map((clue) => (
            <div key={clue.id}>
              {/* Row */}
              <div
                onClick={() => toggleExpand(clue.id)}
                className={`bg-gray-800/60 border rounded-lg px-4 py-2 cursor-pointer transition-colors hover:border-gray-600 ${
                  expandedId === clue.id
                    ? 'border-gray-500'
                    : 'border-gray-700/30'
                }`}
              >
                <div className="grid grid-cols-2 md:grid-cols-[1.2fr_1fr_2rem_1.2fr_0.5fr_2rem] gap-2 items-center">
                  <span className="font-bold text-white uppercase text-sm">
                    {clue.word} <span className="text-gray-500 font-semibold">{clue.number}</span>
                    {clue.disabled && <span className="ml-1 text-[0.6rem] text-board-red font-bold">OFF</span>}
                  </span>
                  <span className="text-gray-400 text-sm truncate">
                    {clue.userId}
                  </span>
                  <span className="text-sm text-center">{clue.ranked ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}</span>
                  <span className="text-gray-400 text-sm">
                    {formatDateTime(clue.createdAt)}
                  </span>
                  <span
                    className={`text-sm font-semibold text-center ${
                      clue.reportCount > 0 ? 'text-board-red' : 'text-gray-500'
                    }`}
                  >
                    {clue.reportCount}
                  </span>
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

              {/* Expanded detail */}
              {expandedId === clue.id && (
                <div className="mt-1 mx-2 bg-gray-800/60 border border-gray-700/30 rounded-lg p-4">
                  <div className="flex gap-6 flex-col md:flex-row">
                    {/* Left: ClueStatsPanel + ratings + reports */}
                    <div className="flex-1 space-y-4 min-w-0">
                      {/* Stats via ClueStatsPanel */}
                      <ClueStatsPanel
                        key={statsRefreshKey[clue.id] || 0}
                        clueId={clue.id}
                        spymasterUserId={clue.userId}
                        onShowAttemptPicks={(indices) => setViewingAttemptPicks((prev) => ({ ...prev, [clue.id]: indices.length > 0 ? indices : null }))}
                        onDeleteAttempt={(attemptUserId, timestamp) => setConfirmDeleteResult({ clueId: clue.id, userId: attemptUserId, timestamp })}
                      />

                      {/* Ratings */}
                      <div>
                        <h3 className="text-sm font-bold text-white mb-2">
                          {t.admin.ratings}
                        </h3>
                        {ratings[clue.id] ? (
                          ratings[clue.id].total === 0 ? (
                            <p className="text-gray-500 text-sm">{t.admin.noRatings}</p>
                          ) : (
                            <div>
                              <div className="flex gap-3 mb-1">
                                {[1, 2, 3, 4, 5].map((r) => (
                                  <div key={r} className="text-center">
                                    <span className="text-xs text-gray-400">{r}</span>
                                    <p className="text-white font-bold text-sm">{ratings[clue.id].counts[r] || 0}</p>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-gray-400">
                                {t.admin.avgRating}: <span className="text-white font-bold">{ratings[clue.id].avg}</span>
                                {' '}({ratings[clue.id].total})
                              </p>
                            </div>
                          )
                        ) : (
                          <p className="text-gray-500 text-sm">...</p>
                        )}
                      </div>

                      {/* Reports */}
                      <div>
                        <h3 className="text-sm font-bold text-white mb-2">
                          {t.admin.reports}
                        </h3>
                        {reports[clue.id] ? (
                          reports[clue.id].length === 0 ? (
                            <p className="text-gray-500 text-sm">{t.admin.noReports}</p>
                          ) : (
                            <div className="space-y-2">
                              {reports[clue.id].map((report) => (
                                <div key={report.id} className="bg-gray-900/50 rounded p-3 text-sm">
                                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>{t.admin.reportBy}: {report.userId}</span>
                                    <span>{formatDateTime(report.createdAt)}</span>
                                  </div>
                                  <p className="text-gray-300">{t.admin.reportReason}: {report.reason}</p>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <p className="text-gray-500 text-sm">...</p>
                        )}
                      </div>
                    </div>

                    {/* Right: game board preview */}
                    <div className="md:w-[600px] shrink-0">
                      <AdminBoard clue={clue} pickPercents={pickPercentsMap[clue.id]} viewingAttemptPicks={viewingAttemptPicks[clue.id]} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        </>)}

        {/* ======== RESULTS TAB ======== */}
        {adminTab === 'results' && (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder={t.admin.searchResults}
                value={resultSearch}
                onChange={(e) => setResultSearch(e.target.value)}
                className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              />
            </div>

            <div className="text-sm text-gray-400 mb-2">
              {t.admin.allResults} ({filteredResults.length})
            </div>

            <table className="w-full table-fixed">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className={`${thClass} text-left w-[25%]`} onClick={() => toggleResultSort('clueWord')}>
                    {t.admin.clueWord}<SortArrow field="clueWord" activeField={resultSort} dir={resultDir} />
                  </th>
                  <th className={`${thClass} text-left w-[20%]`} onClick={() => toggleResultSort('userId')}>
                    {t.admin.player}<SortArrow field="userId" activeField={resultSort} dir={resultDir} />
                  </th>
                  <th className={`${thClass} text-center w-[15%]`} onClick={() => toggleResultSort('score')}>
                    {t.admin.score}<SortArrow field="score" activeField={resultSort} dir={resultDir} />
                  </th>
                  <th className={`${thClass} text-center w-[4%]`} title="Рейтинговая">★</th>
                  <th className={`${thClass} text-right w-[22%]`} onClick={() => toggleResultSort('timestamp')}>
                    {t.admin.clueDate}<SortArrow field="timestamp" activeField={resultSort} dir={resultDir} />
                  </th>
                  <th className={`${thClass} text-center w-[4%]`}></th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, i) => (
                  <tr
                    key={`${r.clueId}-${r.userId}-${r.timestamp}-${i}`}
                    className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40"
                  >
                    <td className="py-2 text-sm truncate">
                      <span className="font-bold text-white uppercase">{r.clueWord || r.clueId.slice(0, 12)}</span>
                      {r.clueNumber != null && <span className="ml-1 text-gray-500 font-semibold">{r.clueNumber}</span>}
                    </td>
                    <td className="py-2 text-sm truncate">
                      <button
                        onClick={() => navigate(`/profile/${r.userId}`)}
                        className="text-board-blue hover:text-blue-300 transition-colors"
                      >
                        {r.userId}
                      </button>
                    </td>
                    <td className="py-2 text-sm text-center font-bold text-white">
                      {r.score}
                      <span className="text-gray-500 font-normal ml-0.5 text-xs">
                        ({r.correctCount}/{r.totalTargets})
                      </span>
                    </td>
                    <td className="py-2 text-sm text-center">
                      {r.ranked ? <span className="text-amber-400">★</span> : <span className="text-gray-600">☆</span>}
                    </td>
                    <td className="py-2 text-sm text-right text-gray-400">
                      {formatDateTime(r.timestamp)}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => setConfirmDeleteResult({ clueId: r.clueId, userId: r.userId, timestamp: r.timestamp })}
                        className="text-gray-500 hover:text-board-red text-lg font-bold transition-colors leading-none"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ======== USERS TAB ======== */}
        {adminTab === 'users' && (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск по имени..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-gray-800/60 border border-gray-700/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              />
            </div>

            <div className="text-sm text-gray-400 mb-2">
              {t.admin.userCount}: {filteredUsers.length}
            </div>

            <table className="w-full table-fixed">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700/50">
                  <th className={`${thClass} text-left w-[22%]`} onClick={() => toggleUserSort('displayName')}>
                    {t.leaderboard.player}<SortArrow field="displayName" activeField={userSort} dir={userDir} />
                  </th>
                  <th className={`${thClass} text-right w-[13%]`} onClick={() => toggleUserSort('cluesGiven')}>
                    {t.admin.given}<SortArrow field="cluesGiven" activeField={userSort} dir={userDir} />
                  </th>
                  <th className={`${thClass} text-right w-[13%]`} onClick={() => toggleUserSort('cluesSolved')}>
                    {t.admin.solved}<SortArrow field="cluesSolved" activeField={userSort} dir={userDir} />
                  </th>
                  <th className={`${thClass} text-right w-[14%]`} onClick={() => toggleUserSort('avgScore')}>
                    {t.admin.avgScore}<SortArrow field="avgScore" activeField={userSort} dir={userDir} />
                  </th>
                  <th className={`${thClass} text-right w-[19%]`} onClick={() => toggleUserSort('createdAt')}>
                    {t.admin.registered}<SortArrow field="createdAt" activeField={userSort} dir={userDir} />
                  </th>
                  <th className={`${thClass} text-right w-[19%]`} onClick={() => toggleUserSort('lastActivity')}>
                    {t.admin.lastActive}<SortArrow field="lastActivity" activeField={userSort} dir={userDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-800/50 text-gray-300 hover:bg-gray-800/40 cursor-pointer"
                    onClick={() => navigate(`/profile/${u.id}`)}
                  >
                    <td className="py-2 text-sm truncate">
                      <span className="font-semibold text-white">{u.displayName}</span>
                      {u.isAdmin && <span className="ml-1 text-[0.6rem] text-board-blue font-bold">ADM</span>}
                    </td>
                    <td className="py-2 text-sm text-right">{u.cluesGiven}</td>
                    <td className="py-2 text-sm text-right">{u.cluesSolved}</td>
                    <td className="py-2 text-sm text-right">{u.avgScore > 0 ? u.avgScore.toFixed(1) : '—'}</td>
                    <td className="py-2 text-sm text-right text-gray-500">{formatDateTime(u.createdAt)}</td>
                    <td className="py-2 text-sm text-right text-gray-400">{formatDateTime(u.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Confirm delete clue modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700/30 rounded-lg p-6 max-w-sm mx-4">
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

      {/* Confirm delete result modal */}
      {confirmDeleteResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700/30 rounded-lg p-6 max-w-sm mx-4">
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
