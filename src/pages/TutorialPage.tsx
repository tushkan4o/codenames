import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { useTutorialMachine } from '../tutorial/useTutorialMachine';
import { BOARD_CONFIGS } from '../types/game';
import type { CardState } from '../types/game';
import NavBar from '../components/layout/NavBar';
import Board from '../components/board/Board';
import ClueDisplay from '../components/clue/ClueDisplay';
import TutorialHighlight from '../components/tutorial/TutorialOverlay';
import ResultsTabs from '../components/game/ResultsTabs';
import { computeGuessScore } from '../lib/scoring';

const REVEAL_DURATION = 800;

export default function TutorialPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tt = t.tutorial as Record<string, string>;
  const machine = useTutorialMachine();
  const { state, currentScenario, currentStep, currentScenarios, isActive } = machine;

  // Border trace animation state (scout mode)
  const [revealingIndices, setRevealingIndices] = useState<Set<number>>(new Set());
  const revealTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Handle card click with reveal animation for scout mode
  const handleCardClick = useCallback((idx: number) => {
    if (!currentScenario || currentScenario.mode === 'captain') {
      machine.handleCardClick(idx);
      return;
    }

    // Scout mode: if card is currently revealing, cancel it
    if (revealingIndices.has(idx)) {
      clearTimeout(revealTimers.current[idx]);
      delete revealTimers.current[idx];
      setRevealingIndices(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      return;
    }

    // Already picked — ignore
    if (state.pickedIndices.includes(idx)) return;

    // Start border trace animation
    setRevealingIndices(prev => new Set(prev).add(idx));

    // After animation, commit the pick to the state machine
    revealTimers.current[idx] = setTimeout(() => {
      delete revealTimers.current[idx];
      setRevealingIndices(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
      machine.handleCardClick(idx);
    }, REVEAL_DURATION);
  }, [currentScenario, machine, revealingIndices, state.pickedIndices]);

  // Build cards with revealed state for picked cards (scout mode)
  const displayCards: CardState[] = useMemo(() => {
    if (!currentScenario) return [];
    if (currentScenario.mode === 'captain') return currentScenario.cards;
    // Scout: mark picked cards as revealed so their color shows
    return currentScenario.cards.map((card, idx) => {
      if (state.pickedIndices.includes(idx) || state.showColors) {
        return { ...card, revealed: true };
      }
      return card;
    });
  }, [currentScenario, state.pickedIndices, state.showColors]);

  // Tooltip text for current step
  const stepText = currentStep ? (tt[currentStep.textKey] || currentStep.textKey) : '';
  const isAcknowledge = currentStep?.action.type === 'acknowledge';
  const canGoBack = state.stepIndex > 0;

  // ─── Mode selection screen ───────────────────────────────
  if (state.mode === null) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex flex-col items-center justify-center px-4 pt-20 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-20 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">{t.app.title}</h1>
          <p className="text-gray-400 mb-10">{tt.title}</p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => machine.selectMode('captain')}
              className="w-full py-4 rounded-xl bg-board-red/80 hover:bg-board-red text-white font-bold text-lg transition-colors"
            >
              <div className="text-xl mb-0.5">{tt.captain}</div>
              <div className="text-sm font-normal opacity-80">{tt.captainDesc}</div>
            </button>
            <button
              onClick={() => machine.selectMode('scout')}
              className="w-full py-4 rounded-xl bg-board-blue/80 hover:bg-board-blue text-white font-bold text-lg transition-colors"
            >
              <div className="text-xl mb-0.5">{tt.scout}</div>
              <div className="text-sm font-normal opacity-80">{tt.scoutDesc}</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Scenario selection screen ───────────────────────────
  if (!isActive && !state.scenarioComplete) {
    const modeLabel = state.mode === 'captain' ? tt.captain : tt.scout;
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">{t.app.title}</h1>
          <p className="text-gray-400 mb-10">{tt.title}: {modeLabel}</p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {currentScenarios.map((scenario, idx) => (
              <button
                key={scenario.id}
                onClick={() => machine.selectScenario(idx)}
                className="w-full py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors text-left px-5"
              >
                <span className="text-gray-500 mr-2">{idx + 1}.</span>
                {tt[scenario.titleKey] || scenario.titleKey}
                <p className="text-sm font-normal text-gray-400 mt-0.5">
                  {tt[scenario.descKey] || scenario.descKey}
                  <span className="ml-2 text-xs text-gray-500">{scenario.columns}x{scenario.columns}</span>
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={() => machine.reset()}
            className="mt-6 px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold transition-colors"
          >
            {tt.back}
          </button>
        </div>
      </div>
    );
  }

  // ─── Scenario complete screen ────────────────────────────
  if (state.scenarioComplete && currentScenario) {
    const hasNext = state.scenarioIndex + 1 < currentScenarios.length;
    const otherMode = state.mode === 'captain' ? 'scout' : 'captain';
    const otherModeLabel = otherMode === 'captain' ? tt.captain : tt.scout;
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">{t.app.title}</h1>
          <p className="text-gray-400 mb-10">{tt.scenarioComplete}</p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {hasNext && (
              <button
                onClick={() => machine.nextScenario()}
                className="w-full py-3 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors"
              >
                {tt.nextScenario}
              </button>
            )}
            <button
              onClick={() => machine.selectMode(otherMode)}
              className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg transition-colors"
            >
              {tt.otherMode}: {otherModeLabel}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold text-lg transition-colors"
            >
              {tt.toHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active scenario: game view ──────────────────────────
  if (!currentScenario) return null;

  const isCaptain = currentScenario.mode === 'captain';
  const boardConfig = BOARD_CONFIGS[currentScenario.columns === 4 ? '4x4' : '5x5'];
  const clueTargets = currentScenario.clueTargetIndices || [];

  return (
    <div className="min-h-screen pb-8">
      <NavBar />

      {/* Sub-header */}
      <div className="flex items-center justify-center gap-3 pt-3 mb-3 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={`text-sm font-semibold ${isCaptain ? 'text-board-blue' : 'text-gray-400'}`}>
          {tt.title}: {isCaptain ? tt.captain : tt.scout}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border bg-gray-700/50 text-gray-400 border-gray-600/30">
          {boardConfig.size}
        </span>
      </div>

      {/* Clue display for scout mode */}
      {!isCaptain && currentScenario.clue && (
        <div className="flex justify-center mb-3">
          <div data-tutorial-id="clue-display">
            <ClueDisplay
              word={currentScenario.clue.word}
              number={currentScenario.clue.number}
              teamColor="red"
            />
          </div>
        </div>
      )}

      {/* Board */}
      <div data-tutorial-id="board">
        <Board
          cards={displayCards}
          columns={currentScenario.columns}
          showColors={isCaptain || state.showColors}
          selectedIndices={[]}
          targetIndices={isCaptain ? state.selectedTargets : (state.showColors ? clueTargets : [])}
          nullIndices={state.selectedNulls}
          onCardClick={handleCardClick}
          disabled={false}
          pickOrder={!isCaptain ? state.pickedIndices : undefined}
          highlightTargets={state.showColors && !isCaptain}
          revealingIndices={revealingIndices.size > 0 ? revealingIndices : undefined}
          revealDuration={REVEAL_DURATION}
        />
      </div>

      {/* Tutorial tooltip — inline below board */}
      {currentStep && stepText && (
        <div className="max-w-md mx-auto mt-3 px-4">
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">{stepText}</p>
            <div className="flex gap-2 mt-3">
              {canGoBack && (
                <button
                  onClick={() => machine.prevStep()}
                  className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold text-sm transition-colors"
                >
                  {tt.prev || tt.back}
                </button>
              )}
              {isAcknowledge && (
                <button
                  onClick={() => machine.handleAcknowledge()}
                  className="flex-1 py-2 rounded-lg bg-board-blue hover:brightness-110 text-white font-bold text-sm transition-colors"
                >
                  {tt.next}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Captain mode: clue input area */}
      {isCaptain && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="flex gap-2 items-center">
            <input
              data-tutorial-id="clue-input"
              type="text"
              value={state.clueText}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁ\-]/g, '');
                machine.handleClueInput(filtered);
              }}
              placeholder={t.clue.placeholder}
              className="px-3 h-11 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg focus:outline-none focus:border-board-blue w-44 sm:w-48 placeholder:text-gray-500"
            />
            <div className="h-11 px-3 rounded-lg bg-gray-800 border border-gray-600 text-white text-lg font-bold min-w-[2.5rem] flex items-center justify-center">
              {state.selectedTargets.length}
            </div>
            <button
              data-tutorial-id="clue-submit"
              onClick={() => machine.handleSubmit()}
              className="h-11 px-4 sm:px-5 rounded-lg font-bold bg-board-red hover:brightness-110 text-white transition-colors"
            >
              {t.clue.submit}
            </button>
          </div>
        </div>
      )}

      {/* Scout mode: end turn button */}
      {!isCaptain && state.pickedIndices.length > 0 && currentStep?.action.type === 'click-button' && (
        <div className="flex justify-center mt-4">
          <button
            data-tutorial-id="end-turn"
            onClick={() => machine.handleButtonClick('end-turn')}
            className="px-6 py-3 rounded-xl bg-board-blue hover:brightness-110 text-white font-bold text-lg transition-colors"
          >
            {t.game.endTurn}
          </button>
        </div>
      )}

      {/* Scout mode: results panel after reveal */}
      {!isCaptain && state.showColors && currentScenario && (() => {
        const demoScore = computeGuessScore(state.pickedIndices, currentScenario.cards);
        return (
          <ResultsTabs
            clueId="demo"
            spymasterUserId={tt.demoCaptain || 'Демо-капитан'}
            clueUserId="demo"
            cards={currentScenario.cards}
            guessedIndices={state.pickedIndices}
            targetIndices={clueTargets}
            score={demoScore}
            demoMode
          />
        );
      })()}

      {/* Highlight ring around target element */}
      {currentStep && (
        <TutorialHighlight step={currentStep} />
      )}
    </div>
  );
}
