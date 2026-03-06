import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import type { CardState } from '../../types/game';
import RevealOverlay from '../game/RevealOverlay';

type ResultTab = 'info' | 'score' | 'comments';

interface TutorialResultsProps {
  cards: CardState[];
  guessedIndices: number[];
  targetIndices: number[];
  score: number;
}

const panelClass = 'bg-gray-800/60 rounded-b-lg px-4 py-3 border border-gray-700/40 border-t-0';

export default function TutorialResults({ cards, guessedIndices, targetIndices, score }: TutorialResultsProps) {
  const { t } = useTranslation();
  const tt = t.tutorial as Record<string, string>;
  const [activeTab, setActiveTab] = useState<ResultTab>('score');

  const tabs: { key: ResultTab; label: string }[] = [
    { key: 'info', label: t.results.tabInfo },
    { key: 'score', label: t.results.tabScore },
    { key: 'comments', label: t.results.tabComments },
  ];

  return (
    <div className="max-w-md mx-auto mt-3" data-tutorial-id="results-tabs">
      {/* Tab strip */}
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* Info tab */}
      {activeTab === 'info' && (
        <div className={`${panelClass} text-sm`}>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-gray-400">{t.results.clueBy}</span>
            <span className="text-board-blue font-semibold">{tt.demoCaptain || 'Капитан'}</span>
          </div>
          <p className="text-blue-400 font-semibold mt-2">{t.results.firstSolve}</p>
        </div>
      )}

      {/* Score tab */}
      {activeTab === 'score' && (
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

      {/* Comments tab */}
      {activeTab === 'comments' && (
        <div className={`${panelClass} text-sm text-gray-500 text-center py-6`}>
          {tt.demoNoComments || 'Комментариев пока нет'}
        </div>
      )}

      {/* Rating mock */}
      <div className="mt-2 flex items-center justify-between bg-gray-800/40 rounded-lg px-4 py-2.5 border border-gray-700/30">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-gray-600 text-lg cursor-default">★</span>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="text-gray-500 text-xs hover:text-gray-400 transition-colors" disabled>
            {t.rating.share}
          </button>
          <button className="text-gray-500 text-xs hover:text-gray-400 transition-colors" disabled>
            {t.rating.report}
          </button>
        </div>
      </div>
    </div>
  );
}
