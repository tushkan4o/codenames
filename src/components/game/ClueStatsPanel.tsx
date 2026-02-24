import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockApi } from '../../mock/mockApi';
import { useTranslation } from '../../i18n/useTranslation';

interface ClueStatsPanelProps {
  clueId: string;
  spymasterUserId: string;
}

export default function ClueStatsPanel({ clueId, spymasterUserId }: ClueStatsPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ attempts: number; avgScore: number; scores: number[] } | null>(null);

  useEffect(() => {
    mockApi.getClueStats(clueId).then(setStats);
  }, [clueId]);

  if (!stats) return null;

  // Build simple score distribution: count occurrences of each score value
  const distribution = new Map<number, number>();
  for (const s of stats.scores) {
    distribution.set(s, (distribution.get(s) ?? 0) + 1);
  }
  const sortedScores = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 text-sm">
      {/* Spymaster */}
      <div className="mb-3">
        <span className="text-gray-400">{t.results.clueBy} </span>
        <button
          onClick={() => navigate(`/profile/${spymasterUserId}`)}
          className="text-blue-400 font-semibold hover:text-blue-300 transition-colors"
        >
          {spymasterUserId}
        </button>
      </div>

      {/* Stats summary */}
      {stats.attempts === 0 ? (
        <p className="text-blue-400 font-semibold">{t.results.firstSolve}</p>
      ) : (
        <>
          <div className="flex gap-4 mb-3">
            <div>
              <span className="text-gray-400">{stats.attempts} </span>
              <span className="text-gray-500">{t.results.attempts}</span>
            </div>
            <div>
              <span className="text-gray-400">{t.results.avgScoreLabel}: </span>
              <span className="text-white font-semibold">{stats.avgScore}</span>
            </div>
          </div>

          {/* Score distribution bars */}
          {sortedScores.length > 1 && (
            <div className="space-y-1">
              {sortedScores.map(([score, count]) => (
                <div key={score} className="flex items-center gap-2">
                  <span className="w-4 text-right text-gray-400 text-xs">{score}</span>
                  <div className="flex-1 h-3 bg-gray-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500/70 rounded"
                      style={{ width: `${(count / stats.attempts) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-left text-gray-500 text-xs">{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
