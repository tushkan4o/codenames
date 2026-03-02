import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTranslation } from '../../i18n/useTranslation';

interface AttemptDetail {
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
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export default function ClueStatsPanel({ clueId, spymasterUserId, onShowAttemptPicks, onDeleteAttempt }: ClueStatsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
          onClick={() => navigate(`/profile/${spymasterUserId}`)}
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
                onClick={() => setExpanded((e) => !e)}
                className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {stats.attempts} {t.results.attempts}
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
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {stats.details.map((detail, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleAttemptClick(idx)}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                      selectedAttemptIdx === idx
                        ? 'bg-board-blue/20 border border-board-blue/30'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-gray-500 w-[5.5rem] shrink-0">{formatDate(detail.timestamp)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${detail.userId}`); }}
                      className="text-blue-400 hover:text-blue-300 transition-colors truncate flex-1 text-left"
                    >
                      {detail.userId}
                    </button>
                    <span className="text-white font-semibold w-6 text-right shrink-0">{detail.score}</span>
                    {onDeleteAttempt && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteAttempt(detail.userId, detail.timestamp); }}
                        className="text-gray-600 hover:text-board-red text-sm font-bold transition-colors shrink-0 ml-1"
                        title="Удалить"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
