import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../lib/api';
import { generateBoard } from '../lib/boardGenerator';
import { BOARD_CONFIGS, BOARD_CONFIG_LEGACY_5x5 } from '../types/game';
import type { AdminClue, Report, RatingStats } from '../lib/api';
import type { BoardSize, BoardConfig } from '../types/game';
import NavBar from '../components/layout/NavBar';

type SortField = 'createdAt' | 'reportCount' | 'word' | 'userId';
type SortDir = 'asc' | 'desc';

interface ClueStats {
  attempts: number;
  avgScore: number;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SortArrow({ field, activeField, dir }: { field: string; activeField: string; dir: SortDir }) {
  if (field !== activeField) return <span className="ml-0.5 invisible text-[0.5em]">{'\u25BC'}</span>;
  return <span className="ml-0.5 text-gray-400 text-[0.5em]">{dir === 'desc' ? '\u25BC' : '\u25B2'}</span>;
}

const glowColorsAdmin: Record<string, string> = {
  red: 'shadow-[0_0_10px_3px_rgba(239,83,80,0.5)]',
  blue: 'shadow-[0_0_10px_3px_rgba(66,165,245,0.5)]',
  neutral: 'shadow-[0_0_8px_2px_rgba(255,255,255,0.15)]',
  assassin: 'shadow-[0_0_8px_2px_rgba(0,0,0,0.4)]',
};

function MiniBoard({ clue, pickPercents }: { clue: AdminClue; pickPercents?: Record<number, number> }) {
  const config: BoardConfig = clue.boardSize && BOARD_CONFIGS[clue.boardSize as BoardSize]
    ? BOARD_CONFIGS[clue.boardSize as BoardSize]
    : BOARD_CONFIG_LEGACY_5x5;
  const board = useMemo(
    () => generateBoard(clue.boardSeed, config, clue.wordPack || 'ru'),
    [clue.boardSeed, config, clue.wordPack],
  );

  const targetSet = new Set(clue.targetIndices || []);
  const nullSet = new Set(clue.nullIndices || []);
  const hasHighlight = targetSet.size > 0 || nullSet.size > 0;

  const colorMap: Record<string, string> = {
    red: 'bg-board-red text-gray-900',
    blue: 'bg-board-blue text-gray-900',
    neutral: 'bg-board-neutral text-gray-900',
    assassin: 'bg-board-assassin text-gray-400',
  };

  return (
    <div className={`grid ${config.cols === 4 ? 'grid-cols-4' : 'grid-cols-5'} gap-1`}>
      {board.cards.map((card, idx) => {
        const isTarget = targetSet.has(idx);
        const isNull = nullSet.has(idx);
        const isHighlighted = isTarget || isNull;
        const pct = pickPercents?.[idx];

        return (
          <div
            key={idx}
            className={`${colorMap[card.color]} rounded px-1 flex items-center justify-center font-card font-bold uppercase text-[0.75rem] leading-tight relative transition-opacity duration-300 ${
              hasHighlight && !isHighlighted ? 'opacity-50' : ''
            } ${isTarget ? `${glowColorsAdmin[card.color] || ''} brightness-110` : ''}`}
            style={{ height: '2.2rem' }}
            title={card.word}
          >
            <span className="text-center truncate">{card.word}</span>
            {pct !== undefined && pct > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-0.5 rounded-sm bg-orange-500/90 text-white text-[0.45rem] font-bold leading-none py-px">
                {pct}%
              </span>
            )}
            {isNull && hasHighlight && (
              <span
                className="absolute inset-0 flex items-center justify-center text-board-red text-[1.1rem] leading-none pointer-events-none"
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, opacity: 0.85 }}
              >
                ✗
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [clues, setClues] = useState<AdminClue[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, ClueStats>>({});
  const [ratings, setRatings] = useState<Record<string, RatingStats>>({});
  const [reports, setReports] = useState<Record<string, Report[]>>({});
  const [pickPercentsMap, setPickPercentsMap] = useState<Record<string, Record<number, number>>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    api.adminGetAllClues(user.id).then(setClues);
  }, [user, navigate]);

  if (!user?.isAdmin) return null;

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  async function toggleExpand(clueId: string) {
    if (expandedId === clueId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(clueId);

    if (!stats[clueId]) {
      api.getClueStats(clueId).then((s) => {
        setStats((prev) => ({ ...prev, [clueId]: s }));
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

  async function handleDelete(clueId: string) {
    await api.adminDeleteClue(user!.id, clueId);
    setClues((prev) => prev.filter((c) => c.id !== clueId));
    setConfirmDeleteId(null);
    setExpandedId(null);
    setDeletedMessage(clueId);
    setTimeout(() => setDeletedMessage(null), 2000);
  }

  const filtered = clues.filter((c) =>
    c.userId.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'createdAt') diff = b.createdAt - a.createdAt;
    else if (sortField === 'reportCount') diff = b.reportCount - a.reportCount;
    else if (sortField === 'word') diff = a.word.localeCompare(b.word);
    else if (sortField === 'userId') diff = a.userId.localeCompare(b.userId);
    return sortDir === 'desc' ? diff : -diff;
  });

  const thClass = 'py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-white transition-colors select-none';

  return (
    <div className="min-h-screen">
      <NavBar showBack />
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <h1 className="text-2xl font-extrabold text-white mb-6 text-center">
          {t.admin.title}
        </h1>

        {deletedMessage && (
          <div className="mb-4 text-center text-green-400 text-sm font-semibold">
            {t.admin.deleted}
          </div>
        )}

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
        <div className="hidden md:grid grid-cols-[1fr_0.5fr_1fr_0.6fr_1.2fr_0.5fr_2rem] gap-2 px-4 py-2">
          <span className={thClass} onClick={() => toggleSort('word')}>{t.admin.clueWord}<SortArrow field="word" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`}>{t.admin.clueNumber}</span>
          <span className={thClass} onClick={() => toggleSort('userId')}>{t.admin.clueAuthor}<SortArrow field="userId" activeField={sortField} dir={sortDir} /></span>
          <span className={`${thClass} text-center`}>{t.admin.clueSize}</span>
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
                <div className="grid grid-cols-2 md:grid-cols-[1fr_0.5fr_1fr_0.6fr_1.2fr_0.5fr_2rem] gap-2 items-center">
                  <span className="font-bold text-white uppercase text-sm">
                    {clue.word}
                  </span>
                  <span className="text-white font-bold text-sm text-center">{clue.number}</span>
                  <span className="text-gray-400 text-sm truncate">
                    {clue.userId}
                  </span>
                  <span className="text-gray-400 text-sm text-center">{clue.boardSize}</span>
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
                    {/* Left: stats + ratings + reports */}
                    <div className="flex-1 space-y-4 min-w-0">
                      {/* Stats */}
                      <div>
                        <h3 className="text-sm font-bold text-white mb-2">
                          {t.admin.stats}
                        </h3>
                        {stats[clue.id] ? (
                          <div className="flex gap-6">
                            <div>
                              <span className="text-xs text-gray-400">{t.admin.attempts}</span>
                              <p className="text-white font-bold">{stats[clue.id].attempts}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">{t.admin.avgScore}</span>
                              <p className="text-white font-bold">{stats[clue.id].avgScore}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">...</p>
                        )}
                      </div>

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
                      <MiniBoard clue={clue} pickPercents={pickPercentsMap[clue.id]} />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {clue.word} {clue.number}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirm delete modal */}
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
                onClick={() => handleDelete(confirmDeleteId)}
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
