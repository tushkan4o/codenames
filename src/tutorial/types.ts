import type { CardState } from '../types/game';

export type TutorialMode = 'captain' | 'scout';

export type StepAction =
  | { type: 'acknowledge' }
  | { type: 'click-card'; cardIndex: number }
  | { type: 'click-cards'; cardIndices: number[] }
  | { type: 'type-clue'; word: string }
  | { type: 'set-number'; number: number }
  | { type: 'submit' }
  | { type: 'click-button'; buttonId: string }
  | { type: 'auto'; delayMs: number };

export type HighlightTarget =
  | { type: 'none' }
  | { type: 'card'; cardIndex: number }
  | { type: 'cards'; cardIndices: number[] }
  | { type: 'element'; selector: string }
  | { type: 'board' };

export interface TutorialBoardState {
  selectedTargets: number[];
  selectedNulls: number[];
  pickedIndices: number[];
  showColors: boolean;
  clueText: string;
  clueNumber: number;
}

export interface TutorialStep {
  id: string;
  textKey: string;
  highlight: HighlightTarget;
  action: StepAction;
  tooltipPosition?: 'top' | 'bottom' | 'center';
  boardOverrides?: Partial<TutorialBoardState>;
}

export interface TutorialScenario {
  id: string;
  mode: TutorialMode;
  titleKey: string;
  descKey: string;
  columns: 4 | 5;
  cards: CardState[];
  clue?: { word: string; number: number };
  clueTargetIndices?: number[];
  steps: TutorialStep[];
}
