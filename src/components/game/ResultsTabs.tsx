import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/useTranslation';
import RevealOverlay from './RevealOverlay';
import ClueRating from './ClueRating';
import CommentThread from './CommentThread';
import type { CardState } from '../../types/game';
import type { AttemptDetail } from './ClueStatsPanel';
import { pluralAttempts } from './ClueStatsPanel';
import { useProfileModal } from '../../context/ProfileModalContext';

type ResultTab = 'info' | 'score' | 'comments';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const panelClass = 'bg-gray-800/60 rounded-b-lg px-4 py-3';

interface ResultsTabsProps {
  clueId: string;
  spymasterUserId: string;
  clueUserId: string;
  // Score tab
  cards?: CardState[];
  guessedIndices?: number[];
  targetIndices?: number[];
  score?: number;
  // Callbacks
  onShowAttemptPicks?: (indices: number[]) => void;
  // Rating
  onRate?: (rating: number) => void;
  onReport?: (reason: string) => void;
  initialRating?: number | null;
  // Demo mode (tutorial) — skip API calls, show static data
  demoMode?: boolean;
}

export default function ResultsTabs({
  clueId, spymasterUserId, clueUserId,
  cards, guessedIndices, targetIndices, score,
  onShowAttemptPicks, onRate, onReport, initialRating,
  demoMode,
}: ResultsTabsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openProfile } = useProfileModal();
  const [activeTab, setActiveTab] = useState<ResultTab>(demoMode ? 'score' : 'info');

  // Stats data (shared between info and solutions)
  const [stats, setStats] = useState<{
    attempts: number;
    avgScore: number;
    details?: AttemptDetail[];
    createdAt?: number;
  } | null>(demoMode ? { attempts: 0, avgScore: 0 } : null);

  // Solutions tab sort
  const [attemptSort, setAttemptSort] = useState<'timestamp' | 'score' | null>('timestamp');
  const [attemptDir, setAttemptDir] = useState<'asc' | 'desc'>('asc');
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!demoMode) {
      api.getClueStats(clueId).then(setStats);
    }
  }, [clueId, demoMode]);

  const hasScore = cards && guessedIndices && guessedIndices.length > 0 && targetIndices && score !== undefined;
  const isOwnClue = !demoMode && user && clueUserId === user.id;
  const showRating = demoMode || (user && !isOwnClue);

  const tabs: { key: ResultTab; label: string }[] = [
    { key: 'info', label: t.results.tabInfo },
    ...(hasScore ? [{ key: 'score' as ResultTab, label: t.results.tabScore }] : []),
    { key: 'comments', label: t.results.tabComments },
  ];

  const sortedDetails = stats?.details ? [...stats.details].sort((a, b) => {
    if (!attemptSort) return 0;
    const diff = attemptSort === 'score' ? b.score - a.score : a.timestamp - b.timestamp;
    return attemptDir === 'desc' ? -diff : diff;
  }) : [];

  function handleAttemptClick(detail: AttemptDetail, idx: number) {
    if (selectedAttemptIdx === idx) {
      setSelectedAttemptIdx(null);
      onShowAttemptPicks?.([]);
    } else {
      setSelectedAttemptIdx(idx);
      onShowAttemptPicks?.(detail.guessedIndices);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-3">
      {/* Horizontal tab strip — flush with content panel */}
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedAttemptIdx(null); onShowAttemptPicks?.([]); }}
            className={`flex-1 px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap first:rounded-tl-lg last:rounded-tr-lg ${
              activeTab === tab.key
                ? 'bg-board-blue text-white'
                : 'bg-gray-800/60 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content — consistent panel styling */}
      {activeTab === 'info' && (
        <div className={`${panelClass} text-sm`}>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-gray-400">{t.results.clueBy}</span>
            {demoMode ? (
              <span className="text-board-blue font-semibold">{spymasterUserId}</span>
            ) : (
              <button onClick={() => openProfile(clueUserId)} className="text-board-blue hover:text-blue-300 font-semibold transition-colors">{spymasterUserId}</button>
            )}
            {stats?.createdAt ? (
              <span className="text-gray-500 text-xs">{formatDate(stats.createdAt)}</span>
            ) : null}
          </div>
          {stats && stats.attempts > 0 ? (
            <div className="flex gap-4 mt-2">
              <span className="text-gray-400">{stats.attempts} {pluralAttempts(stats.attempts)}</span>
              <span>
                <span className="text-gray-400">{t.results.avgScoreLabel}: </span>
                <span className="text-white font-semibold">{stats.avgScore}</span>
              </span>
            </div>
          ) : stats ? (
            <p className="text-gray-500 mt-2">{t.results.firstSolve}</p>
          ) : null}
          {sortedDetails.length > 0 && (
            <div className="mt-3 overflow-y-auto max-h-[220px]">
              <div className="space-y-0">
                {sortedDetails.map((detail, idx) => (
                  <div
                    key={`${detail.userId}-${detail.timestamp}`}
                    onClick={() => handleAttemptClick(detail, idx)}
                    className={`flex items-center justify-between py-1.5 px-1 cursor-pointer transition-colors rounded text-xs ${
                      selectedAttemptIdx === idx ? 'bg-board-blue/15' : 'hover:bg-gray-700/30'
                    }`}
                  >
                    <span className="text-gray-300 truncate max-w-[10rem]">
                      {detail.displayName || detail.userId}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-gray-500 cursor-pointer hover:text-gray-400 transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (attemptSort === 'score') setAttemptDir((d) => d === 'desc' ? 'asc' : 'desc');
                          else { setAttemptSort('score'); setAttemptDir('desc'); }
                          setSelectedAttemptIdx(null); onShowAttemptPicks?.([]);
                        }}
                      >
                        <span className="text-white font-semibold">{detail.score}</span>
                      </span>
                      <span
                        className="text-gray-600 cursor-pointer hover:text-gray-500 transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (attemptSort === 'timestamp') setAttemptDir((d) => d === 'asc' ? 'desc' : 'asc');
                          else { setAttemptSort('timestamp'); setAttemptDir('asc'); }
                          setSelectedAttemptIdx(null); onShowAttemptPicks?.([]);
                        }}
                      >
                        {formatDate(detail.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'score' && hasScore && (
        <div className={panelClass}>
          <div className="text-center mb-3">
            <p className="text-gray-500 text-xs uppercase tracking-wider">{t.results.score}</p>
            <span className="text-4xl font-extrabold text-white">{score}</span>
          </div>
          <RevealOverlay
            cards={cards}
            guessedIndices={guessedIndices}
            targetIndices={targetIndices}
            score={score}
            compact
          />
        </div>
      )}

      {activeTab === 'comments' && (
        <div className={panelClass}>
          {demoMode ? (
            <p className="text-sm text-gray-500 text-center py-4">{t.results.noComments}</p>
          ) : (
            <CommentThread clueId={clueId} />
          )}
        </div>
      )}

      {/* Rating (other's clues) or Share-only (own clues) */}
      {showRating ? (
        <ClueRating
          clueId={clueId}
          initialRating={initialRating}
          onRate={onRate || (() => {})}
          onReport={onReport || (() => {})}
          disabled={demoMode}
        />
      ) : user ? (
        <ClueRating
          clueId={clueId}
          shareOnly
          onRate={() => {}}
          onReport={() => {}}
        />
      ) : null}
    </div>
  );
}
