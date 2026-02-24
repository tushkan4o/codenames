import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { BoardState, Clue, GameMode, GamePhase } from '../types/game';

interface State {
  mode: GameMode;
  board: BoardState | null;
  currentClue: Clue | null;
  guessedIndices: number[];
  selectedTargets: number[];
  phase: GamePhase;
}

type Action =
  | { type: 'INIT_BOARD'; board: BoardState; mode: GameMode }
  | { type: 'SET_CLUE'; clue: Clue }
  | { type: 'TOGGLE_GUESS'; index: number }
  | { type: 'TOGGLE_TARGET'; index: number }
  | { type: 'FINISH'; }
  | { type: 'REVEAL_ALL' }
  | { type: 'RESET' };

const initialState: State = {
  mode: 'clue-giving',
  board: null,
  currentClue: null,
  guessedIndices: [],
  selectedTargets: [],
  phase: 'playing',
};

function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT_BOARD':
      return {
        ...initialState,
        board: action.board,
        mode: action.mode,
      };
    case 'SET_CLUE':
      return { ...state, currentClue: action.clue };
    case 'TOGGLE_GUESS': {
      const idx = action.index;
      const guessed = state.guessedIndices.includes(idx)
        ? state.guessedIndices.filter((i) => i !== idx)
        : [...state.guessedIndices, idx];
      return { ...state, guessedIndices: guessed };
    }
    case 'TOGGLE_TARGET': {
      const idx = action.index;
      const targets = state.selectedTargets.includes(idx)
        ? state.selectedTargets.filter((i) => i !== idx)
        : [...state.selectedTargets, idx];
      return { ...state, selectedTargets: targets };
    }
    case 'FINISH':
      return { ...state, phase: 'finished' };
    case 'REVEAL_ALL': {
      if (!state.board) return state;
      const revealedCards = state.board.cards.map((c) => ({ ...c, revealed: true }));
      return {
        ...state,
        board: { ...state.board, cards: revealedCards },
        phase: 'finished',
      };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
