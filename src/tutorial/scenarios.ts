import type { CardState } from '../types/game';
import type { TutorialScenario } from './types';

function card(word: string, color: CardState['color'], position: number): CardState {
  return { word, color, revealed: false, position };
}

// ─── Captain Scenario 1: Basics (4x4) ───────────────────────────
// Board layout (4x4):
//  КОШКА(r)   ЛОДКА(b)   СОЛНЦЕ(r)  ШПИОН(a)
//  МОЛОКО(n)  СОБАКА(r)  РЕКА(b)    ЗАМОК(r)
//  ГИТАРА(b)  ТИГР(r)    ОБЛАКО(n)  МОСТ(b)
//  ДЕРЕВО(r)  ПИЦЦА(n)   КАМЕНЬ(n)  ПТИЦА(b)

const captain1Cards: CardState[] = [
  card('КОШКА', 'red', 0),    card('ЛОДКА', 'blue', 1),   card('СОЛНЦЕ', 'red', 2),   card('ШПИОН', 'assassin', 3),
  card('МОЛОКО', 'neutral', 4), card('СОБАКА', 'red', 5),  card('РЕКА', 'blue', 6),    card('ЗАМОК', 'red', 7),
  card('ГИТАРА', 'blue', 8),  card('ТИГР', 'red', 9),     card('ОБЛАКО', 'neutral', 10), card('МОСТ', 'blue', 11),
  card('ДЕРЕВО', 'red', 12),  card('ПИЦЦА', 'neutral', 13), card('КАМЕНЬ', 'neutral', 14), card('ПТИЦА', 'blue', 15),
];

const captain1: TutorialScenario = {
  id: 'captain1',
  mode: 'captain',
  titleKey: 'captain1Title',
  descKey: 'captain1Desc',
  columns: 4,
  cards: captain1Cards,
  steps: [
    {
      id: 'c1-welcome',
      textKey: 'captain1Step1',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
    },
    {
      id: 'c1-explain-colors',
      textKey: 'captain1Step2',
      highlight: { type: 'board' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'bottom',
    },
    {
      id: 'c1-select-targets',
      textKey: 'captain1Step3',
      highlight: { type: 'cards', cardIndices: [0, 5, 9] },
      action: { type: 'click-cards', cardIndices: [0, 5, 9] },
      tooltipPosition: 'top',
    },
    {
      id: 'c1-type-clue',
      textKey: 'captain1Step4',
      highlight: { type: 'element', selector: '[data-tutorial-id="clue-input"]' },
      action: { type: 'type-clue', word: 'ЖИВОТНОЕ' },
      tooltipPosition: 'top',
      boardOverrides: { selectedTargets: [0, 5, 9] },
    },
    {
      id: 'c1-submit',
      textKey: 'captain1Step5',
      highlight: { type: 'element', selector: '[data-tutorial-id="clue-submit"]' },
      action: { type: 'submit' },
      tooltipPosition: 'top',
    },
    {
      id: 'c1-done',
      textKey: 'captain1Step6',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
    },
  ],
};

// ─── Captain Scenario 2: Advanced (5x5) ─────────────────────────
// Board layout (5x5):
//  ЗИМА(r)    КНИГА(b)   ОКЕАН(r)   СВЕТ(n)    МЫШЬ(b)
//  ЛЕД(r)    РАКЕТА(b)  СНЕГ(r)    ПУСТЫНЯ(n) ГОРОД(b)
//  МЕТЕЛЬ(r)  МАСКА(a)   ХОЛОД(r)   ЗВЕЗДА(b)  РОЗА(n)
//  ЛЫЖИ(r)   КЛЮЧ(b)    КАБАН(r)   ВОЛНА(b)   ТАНЕЦ(n)
//  КАТОК(r)   ПЕСОК(n)   ШУБА(r)    ЗЕРКАЛО(b) КОФЕ(b)

const captain2Cards: CardState[] = [
  card('ЗИМА', 'red', 0),     card('КНИГА', 'blue', 1),    card('ОКЕАН', 'red', 2),     card('СВЕТ', 'neutral', 3),  card('МЫШЬ', 'blue', 4),
  card('ЛЕД', 'red', 5),     card('РАКЕТА', 'blue', 6),   card('СНЕГ', 'red', 7),      card('ПУСТЫНЯ', 'neutral', 8), card('ГОРОД', 'blue', 9),
  card('МЕТЕЛЬ', 'red', 10),  card('МАСКА', 'assassin', 11), card('ХОЛОД', 'red', 12),  card('ЗВЕЗДА', 'blue', 13),  card('РОЗА', 'neutral', 14),
  card('ЛЫЖИ', 'red', 15),   card('КЛЮЧ', 'blue', 16),    card('КАБАН', 'red', 17),    card('ВОЛНА', 'blue', 18),   card('ТАНЕЦ', 'neutral', 19),
  card('КАТОК', 'red', 20),   card('ПЕСОК', 'neutral', 21), card('ШУБА', 'red', 22),    card('ЗЕРКАЛО', 'blue', 23), card('КОФЕ', 'blue', 24),
];

const captain2: TutorialScenario = {
  id: 'captain2',
  mode: 'captain',
  titleKey: 'captain2Title',
  descKey: 'captain2Desc',
  columns: 5,
  cards: captain2Cards,
  steps: [
    {
      id: 'c2-intro',
      textKey: 'captain2Step1',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
    },
    {
      id: 'c2-many-words',
      textKey: 'captain2Step2',
      highlight: { type: 'cards', cardIndices: [0, 5, 7, 10, 12, 22] },
      action: { type: 'acknowledge' },
      tooltipPosition: 'top',
    },
    {
      id: 'c2-select-targets',
      textKey: 'captain2Step3',
      highlight: { type: 'cards', cardIndices: [0, 5, 7, 10, 12, 22] },
      action: { type: 'click-cards', cardIndices: [0, 5, 7, 10, 12, 22] },
      tooltipPosition: 'top',
    },
    {
      id: 'c2-type-clue',
      textKey: 'captain2Step4',
      highlight: { type: 'element', selector: '[data-tutorial-id="clue-input"]' },
      action: { type: 'type-clue', word: 'МОРОЗ' },
      tooltipPosition: 'top',
      boardOverrides: { selectedTargets: [0, 5, 7, 10, 12, 22] },
    },
    {
      id: 'c2-submit',
      textKey: 'captain2Step5',
      highlight: { type: 'element', selector: '[data-tutorial-id="clue-submit"]' },
      action: { type: 'submit' },
      tooltipPosition: 'top',
    },
    {
      id: 'c2-done',
      textKey: 'captain2Step6',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
    },
  ],
};

// ─── Scout Scenario 1: Basics (4x4) ─────────────────────────────
// Same board as captain1, but guesser doesn't see colors
const scout1: TutorialScenario = {
  id: 'scout1',
  mode: 'scout',
  titleKey: 'scout1Title',
  descKey: 'scout1Desc',
  columns: 4,
  cards: captain1Cards.map(c => ({ ...c })),
  clue: { word: 'ЖИВОТНОЕ', number: 3 },
  clueTargetIndices: [0, 5, 9],
  steps: [
    {
      id: 's1-welcome',
      textKey: 'scout1Step1',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
    },
    {
      id: 's1-see-clue',
      textKey: 'scout1Step2',
      highlight: { type: 'element', selector: '[data-tutorial-id="clue-display"]' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'bottom',
    },
    {
      id: 's1-pick-first',
      textKey: 'scout1Step3',
      highlight: { type: 'card', cardIndex: 0 },
      action: { type: 'click-card', cardIndex: 0 },
      tooltipPosition: 'top',
    },
    {
      id: 's1-pick-second',
      textKey: 'scout1Step4',
      highlight: { type: 'card', cardIndex: 5 },
      action: { type: 'click-card', cardIndex: 5 },
      tooltipPosition: 'top',
      boardOverrides: { pickedIndices: [0] },
    },
    {
      id: 's1-pick-third',
      textKey: 'scout1Step5',
      highlight: { type: 'card', cardIndex: 9 },
      action: { type: 'click-card', cardIndex: 9 },
      tooltipPosition: 'top',
      boardOverrides: { pickedIndices: [0, 5] },
    },
    {
      id: 's1-done',
      textKey: 'scout1Step6',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
      boardOverrides: { pickedIndices: [0, 5, 9], showColors: true },
    },
  ],
};

// ─── Scout Scenario 2: Wrong picks + full run (5x5) ─────────────
// Same board as captain2
// Clue: "МОРОЗ 6" — player makes a blue mistake, then picks remaining reds
const scout2: TutorialScenario = {
  id: 'scout2',
  mode: 'scout',
  titleKey: 'scout2Title',
  descKey: 'scout2Desc',
  columns: 5,
  cards: captain2Cards.map(c => ({ ...c })),
  clue: { word: 'МОРОЗ', number: 6 },
  clueTargetIndices: [0, 5, 7, 10, 12, 22],
  steps: [
    {
      id: 's2-intro',
      textKey: 'scout2Step1',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
    },
    {
      id: 's2-pick-correct1',
      textKey: 'scout2Step2',
      highlight: { type: 'card', cardIndex: 0 },
      action: { type: 'click-card', cardIndex: 0 },
      tooltipPosition: 'top',
    },
    {
      id: 's2-pick-correct2',
      textKey: 'scout2Step3',
      highlight: { type: 'card', cardIndex: 5 },
      action: { type: 'click-card', cardIndex: 5 },
      tooltipPosition: 'top',
      boardOverrides: { pickedIndices: [0] },
    },
    {
      id: 's2-pick-wrong',
      textKey: 'scout2Step4',
      highlight: { type: 'card', cardIndex: 1 },
      action: { type: 'click-card', cardIndex: 1 },
      tooltipPosition: 'top',
      boardOverrides: { pickedIndices: [0, 5] },
    },
    {
      id: 's2-explain-mistake',
      textKey: 'scout2Step5',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
      boardOverrides: { pickedIndices: [0, 5, 1] },
    },
    {
      id: 's2-pick-correct3',
      textKey: 'scout2Step6',
      highlight: { type: 'card', cardIndex: 7 },
      action: { type: 'click-card', cardIndex: 7 },
      tooltipPosition: 'top',
    },
    {
      id: 's2-pick-correct4',
      textKey: 'scout2Step7',
      highlight: { type: 'card', cardIndex: 10 },
      action: { type: 'click-card', cardIndex: 10 },
      tooltipPosition: 'top',
      boardOverrides: { pickedIndices: [0, 5, 1, 7] },
    },
    {
      id: 's2-pick-correct5',
      textKey: 'scout2Step8',
      highlight: { type: 'card', cardIndex: 15 },
      action: { type: 'click-card', cardIndex: 15 },
      tooltipPosition: 'top',
      boardOverrides: { pickedIndices: [0, 5, 1, 7, 10] },
    },
    {
      id: 's2-explain-rules',
      textKey: 'scout2Step9',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
      boardOverrides: { pickedIndices: [0, 5, 1, 7, 10, 15] },
    },
    {
      id: 's2-end-turn',
      textKey: 'scout2Step10',
      highlight: { type: 'element', selector: '[data-tutorial-id="end-turn"]' },
      action: { type: 'click-button', buttonId: 'end-turn' },
      tooltipPosition: 'top',
    },
    {
      id: 's2-done',
      textKey: 'scout2Step11',
      highlight: { type: 'none' },
      action: { type: 'acknowledge' },
      tooltipPosition: 'center',
      boardOverrides: { pickedIndices: [0, 5, 1, 7, 10, 15], showColors: true },
    },
  ],
};

export const captainScenarios: TutorialScenario[] = [captain1, captain2];
export const scoutScenarios: TutorialScenario[] = [scout1, scout2];
export const allScenarios: TutorialScenario[] = [...captainScenarios, ...scoutScenarios];
