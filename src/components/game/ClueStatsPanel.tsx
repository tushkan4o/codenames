import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../i18n/useTranslation';
import { useProfileModal } from '../../context/ProfileModalContext';

export interface AttemptDetail {
  userId: string;
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
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function pluralAttempts(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'попыток';
  if (last === 1) return 'попытка';
  if (last >= 2 && last <= 4) return 'попытки';
  return 'попыток';
}

export default function ClueStatsPanel({ clueId, spymasterUserId, onShowAttemptPicks, onDeleteAttempt, onOpenAttempts }: ClueStatsPanelProps) {
  const { t } = useTranslation();
  const { openProfile } = useProfileModal();
  const [stats, setStats] = useState<{
    attempts: number;
    avgScore: number;
    details?: AttemptDetail[];
    createdAt?: number;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);

  useEffect(() => {
    api.getClueStats(clueId).then(setStats);
  }, [clueId]);

  if (!stats) return null;

  function handleAttemptClick(idx: number) {
    if (selectedAttemptIdx === idx) {
      setSelectedAttemptIdx(null);
      onShowAttemptPicks?.([]); // clear
    } else {
      setSelectedAttemptIdx(idx);
      const detail = stats!.details?.[idx];
      if (detail) onShowAttemptPicks?.(detail.guessedIndices);
    }
  }

  return (
    <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 text-sm">
      {/* Spymaster */}
      <div className="mb-2">
        <span className="text-gray-400">{t.results.clueBy} </span>
        <button
          onClick={() => openProfile(spymasterUserId)}
          className="text-blue-400 font-semibold hover:text-blue-300 transition-colors"
        >
          {spymasterUserId}
        </button>
      </div>

      {/* Creation date */}
      {stats.createdAt ? (
        <div className="text-gray-500 text-xs mb-3">
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
          {expanded && stats.details && stats.details.length > 0 && (
            <div className="mt-3 border-t border-gray-700/50 pt-3">
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="text-gray-500 border-b border-gray-700/50">
                      <th className="text-left py-1 pr-2 font-medium">{t.admin.player}</th>
                      <th className="text-center py-1 px-2 font-medium">{t.results.score}</th>
                      <th className="text-center py-1 pl-2 font-medium">{t.admin.clueDate}</th>
                      {onDeleteAttempt && <th className="w-5"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.details.map((detail, idx) => (
                      <tr
                        key={idx}
                        onClick={() => handleAttemptClick(idx)}
                        className={`cursor-pointer transition-colors ${
                          selectedAttemptIdx === idx
                            ? 'bg-board-blue/20'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <td className="py-1.5 pr-2 text-left">
                          <button
                            onClick={(e) => { e.stopPropagation(); openProfile(detail.userId); }}
                            className="text-blue-400 hover:text-blue-300 transition-colors truncate max-w-[10rem] block text-left"
                          >
                            {detail.userId}
                          </button>
                        </td>
                        <td className="py-1.5 px-2 text-center text-white font-semibold">{detail.score}</td>
                        <td className="py-1.5 pl-2 text-center text-gray-500">{formatDate(detail.timestamp)}</td>
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
