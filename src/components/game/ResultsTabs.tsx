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

function ScoreHistogram({ scores, playerScore }: { scores: number[]; playerScore?: number }) {
  if (scores.length === 0) return null;
  const maxVal = Math.max(...scores, playerScore ?? 0);
  const bins = Array.from({ length: maxVal + 1 }, (_, i) => scores.filter(s => s === i).length);
  const maxCount = Math.max(...bins, 1);
  const w = 200, h = 48, pad = { l: 0, r: 0, t: 2, b: 0 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const step = bins.length > 1 ? cw / (bins.length - 1) : cw;
  const gridRows = 4;

  // Build line points
  const pts = bins.map((c, i) => ({
    x: pad.l + (bins.length > 1 ? i * step : cw / 2),
    y: pad.t + ch - (c / maxCount) * ch,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${pad.t + ch} L${pts[0].x},${pad.t + ch} Z`;

  // Player score x position
  const playerX = playerScore !== undefined && playerScore <= maxVal
    ? pad.l + (bins.length > 1 ? playerScore * step : cw / 2) : null;

  return (
    <div className="mt-2 bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2">
      {/* Header labels */}
      <div className="flex justify-center gap-4 mb-1 text-[10px]">
        <span className="text-board-blue font-bold">{maxVal} <span className="font-normal text-gray-500">лучший</span></span>
        {playerScore !== undefined && (
          <span className="text-orange-400 font-bold">{playerScore} <span className="font-normal text-gray-500">ваш</span></span>
        )}
      </div>
      {/* SVG chart */}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
        {/* Grid lines */}
        {Array.from({ length: gridRows + 1 }, (_, i) => {
          const y = pad.t + (i / gridRows) * ch;
          return <line key={i} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#374151" strokeWidth="0.5" strokeOpacity="0.4" />;
        })}
        {/* Vertical grid lines */}
        {bins.map((_, i) => {
          const x = pad.l + (bins.length > 1 ? i * step : cw / 2);
          return <line key={i} x1={x} x2={x} y1={pad.t} y2={pad.t + ch} stroke="#374151" strokeWidth="0.5" strokeOpacity="0.3" />;
        })}
        {/* Area fill */}
        <path d={areaPath} fill="#3b82f6" fillOpacity="0.15" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Player score dashed line */}
        {playerX !== null && (
          <line x1={playerX} x2={playerX} y1={pad.t} y2={pad.t + ch}
            stroke="#fb923c" strokeWidth="1" strokeDasharray="3,2" strokeOpacity="0.8" />
        )}
      </svg>
      {/* X axis labels */}
      <div className="flex" style={{ padding: `0 ${pad.l}px` }}>
        {bins.map((_, i) => (
          <div key={i} className="text-center text-[8px] text-gray-600" style={{ flex: 1 }}>{i}</div>
        ))}
      </div>
    </div>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const panelClass = 'bg-gray-800/60 px-4 py-3';

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
    scores?: number[];
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
      <div className="bg-gray-800/40 rounded-xl overflow-hidden">
      {/* Tab strip — part of the frame */}
      <div className="flex bg-gray-800/60">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedAttemptIdx(null); onShowAttemptPicks?.([]); }}
            className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap focus:outline-none ${
              activeTab === tab.key
                ? 'bg-board-blue text-white rounded-lg'
                : 'text-gray-400 hover:text-white'
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
            <div className="mt-2 overflow-y-auto max-h-[220px]">
              {/* Header */}
              <div className="grid grid-cols-[1fr_2rem_7.5rem] gap-x-2 px-1 pb-1 text-[10px] text-gray-600">
                <span className="text-left">{t.admin.player}</span>
                <span
                  className="text-center cursor-pointer hover:text-gray-400 transition-colors select-none"
                  onClick={() => {
                    if (attemptSort === 'score') setAttemptDir((d) => d === 'desc' ? 'asc' : 'desc');
                    else { setAttemptSort('score'); setAttemptDir('desc'); }
                    setSelectedAttemptIdx(null); onShowAttemptPicks?.([]);
                  }}
                >
                  {t.results.score}{attemptSort === 'score' ? (attemptDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''}
                </span>
                <span
                  className="text-center cursor-pointer hover:text-gray-400 transition-colors select-none"
                  onClick={() => {
                    if (attemptSort === 'timestamp') setAttemptDir((d) => d === 'asc' ? 'desc' : 'asc');
                    else { setAttemptSort('timestamp'); setAttemptDir('asc'); }
                    setSelectedAttemptIdx(null); onShowAttemptPicks?.([]);
                  }}
                >
                  {t.admin.clueDate}{attemptSort === 'timestamp' ? (attemptDir === 'desc' ? ' \u25BC' : ' \u25B2') : ''}
                </span>
              </div>
              {/* Rows */}
              {sortedDetails.map((detail, idx) => (
                <div
                  key={`${detail.userId}-${detail.timestamp}`}
                  onClick={() => handleAttemptClick(detail, idx)}
                  className={`grid grid-cols-[1fr_2rem_7.5rem] gap-x-2 items-center py-0.5 px-1 cursor-pointer transition-colors rounded text-xs leading-tight ${
                    selectedAttemptIdx === idx ? 'bg-board-blue/15' : 'hover:bg-gray-700/30'
                  }`}
                >
                  <span className="text-gray-300 truncate">{detail.displayName || detail.userId}</span>
                  <span className="text-white font-semibold text-center">{detail.score}</span>
                  <span className="text-gray-600 text-center">{formatDate(detail.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
          {stats && stats.scores && stats.scores.length > 1 && (
            <ScoreHistogram scores={stats.scores} playerScore={isOwnClue ? undefined : score} />
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

      </div>{/* end unified frame */}

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
