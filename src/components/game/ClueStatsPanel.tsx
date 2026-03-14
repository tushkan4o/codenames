import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../i18n/useTranslation';

export interface AttemptDetail {
  userId: string;
  displayName?: string;
  score: number;
  timestamp: number;
  guessedIndices: number[];
}

interface ClueStatsPanelProps {
  clueId: string;
  spymasterUserId: string;
  onShowAttemptPicks?: (guessedIndices: number[]) => void;
  onDeleteAttempt?: (userId: string, timestamp: number) => void;
  onOpenAttempts?: (details: AttemptDetail[]) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function pluralAttempts(n: number): string {
  return pluralSolves(n);
}

export function pluralSolves(n: number): string {
  if (n === 0) return 'решений';
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'решений';
  if (last === 1) return 'решение';
  if (last >= 2 && last <= 4) return 'решения';
  return 'решений';
}

type AttemptSort = 'timestamp' | 'score';
type AttemptSortDir = 'asc' | 'desc';

export default function ClueStatsPanel({ clueId, spymasterUserId, onShowAttemptPicks, onDeleteAttempt, onOpenAttempts }: ClueStatsPanelProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{
    attempts: number;
    avgScore: number;
    details?: AttemptDetail[];
    createdAt?: number;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);
  const [attemptSort, setAttemptSort] = useState<AttemptSort>('timestamp');
  const [attemptSortDir, setAttemptSortDir] = useState<AttemptSortDir>('asc');

  useEffect(() => {
    api.getClueStats(clueId).then(setStats);
  }, [clueId]);

  if (!stats) return null;

  function toggleAttemptSort(field: AttemptSort) {
    if (attemptSort === field) setAttemptSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setAttemptSort(field); setAttemptSortDir('desc'); }
  }

  const sortedDetails = stats?.details ? [...stats.details].sort((a, b) => {
    const diff = attemptSort === 'score' ? b.score - a.score : a.timestamp - b.timestamp;
    return attemptSortDir === 'desc' ? -diff : diff;
  }) : [];

  function handleAttemptClick(detail: AttemptDetail) {
    const key = `${detail.userId}-${detail.timestamp}`;
    if (selectedAttemptIdx !== null && sortedDetails[selectedAttemptIdx] &&
        `${sortedDetails[selectedAttemptIdx].userId}-${sortedDetails[selectedAttemptIdx].timestamp}` === key) {
      setSelectedAttemptIdx(null);
      onShowAttemptPicks?.([]);
    } else {
      const idx = sortedDetails.findIndex((d) => `${d.userId}-${d.timestamp}` === key);
      setSelectedAttemptIdx(idx);
      onShowAttemptPicks?.(detail.guessedIndices);
    }
  }

  return (
    <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 text-sm">
      {/* Spymaster */}
      <div className="mb-2">
        <span className="text-gray-400">{t.results.clueBy} </span>
        <span className="text-white font-semibold">{spymasterUserId}</span>
      </div>

      {/* Creation date */}
      {stats.createdAt ? (
        <div className="text-gray-500 text-xs mb-3 font-mono">
          {formatDate(stats.createdAt)}
        </div>
      ) : null}

      {/* Stats summary */}
      {stats.attempts === 0 ? (
        <p className="text-blue-400 font-semibold">{t.results.firstSolve}</p>
      ) : (
        <>
          <div className="flex gap-4 mb-1">
            <div>
              <button
                onClick={() => {
                  if (onOpenAttempts && stats!.details) {
                    onOpenAttempts(stats!.details);
                  } else {
                    setExpanded((e) => !e);
                  }
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {stats.attempts} {pluralAttempts(stats.attempts)}
              </button>
            </div>
            <div>
              <span className="text-gray-400">{t.results.avgScoreLabel}: </span>
              <span className="text-white font-semibold">{stats.avgScore}</span>
            </div>
          </div>

          {/* Expanded per-attempt details */}
          {expanded && sortedDetails.length > 0 && (
            <div className="mt-3 border-t border-gray-700/50 pt-3">
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="text-gray-500 border-b border-gray-700/50">
                      <th className="text-left py-1 pr-2 font-medium">{t.admin.player}</th>
                      <th
                        className="text-center py-1 px-2 font-medium cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => toggleAttemptSort('score')}
                      >
                        {t.results.score}
                        <span className="ml-0.5 text-[0.5em]">{attemptSort === 'score' ? (attemptSortDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</span>
                      </th>
                      <th
                        className="text-center py-1 pl-2 font-medium cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => toggleAttemptSort('timestamp')}
                      >
                        {t.admin.clueDate}
                        <span className="ml-0.5 text-[0.5em]">{attemptSort === 'timestamp' ? (attemptSortDir === 'desc' ? '\u25BC' : '\u25B2') : ''}</span>
                      </th>
                      {onDeleteAttempt && <th className="w-5"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDetails.map((detail, idx) => (
                      <tr
                        key={`${detail.userId}-${detail.timestamp}`}
                        onClick={() => handleAttemptClick(detail)}
                        className={`cursor-pointer transition-colors ${
                          selectedAttemptIdx === idx
                            ? 'bg-board-blue/20'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <td className="py-1.5 pr-2 text-left text-gray-300 truncate max-w-[10rem]">
                          {detail.displayName || detail.userId}
                        </td>
                        <td className="py-1.5 px-2 text-center text-white font-semibold">{detail.score}</td>
                        <td className="py-1.5 pl-2 text-center text-gray-500 font-mono">{formatDate(detail.timestamp)}</td>
                        {onDeleteAttempt && (
                          <td className="py-1.5 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteAttempt(detail.userId, detail.timestamp); }}
                              className="text-gray-600 hover:text-board-red text-sm font-bold transition-colors"
                              title="Удалить"
                            >
                              &times;
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
