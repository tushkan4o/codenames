import { useReducer, useCallback } from 'react';
import type { TutorialMode, TutorialScenario, TutorialStep } from './types';
import { captainScenarios, scoutScenarios } from './scenarios';

interface TutorialState {
  mode: TutorialMode | null;
  scenarioIndex: number;
  stepIndex: number;
  selectedTargets: number[];
  selectedNulls: number[];
  pickedIndices: number[];
  clueText: string;
  clueNumber: number;
  showColors: boolean;
  scenarioComplete: boolean;
}

type Action =
  | { type: 'SELECT_MODE'; mode: TutorialMode }
  | { type: 'SELECT_SCENARIO'; index: number }
  | { type: 'ADVANCE_STEP' }
  | { type: 'CLICK_CARD'; cardIndex: number }
  | { type: 'TYPE_CLUE'; text: string }
  | { type: 'SET_NUMBER'; number: number }
  | { type: 'SUBMIT' }
  | { type: 'CLICK_BUTTON'; buttonId: string }
  | { type: 'ACKNOWLEDGE' }
  | { type: 'RESET' }
  | { type: 'GO_BACK' }
  | { type: 'NEXT_SCENARIO' }
  | { type: 'PREV_STEP' };

const initialState: TutorialState = {
  mode: null,
  scenarioIndex: 0,
  stepIndex: 0,
  selectedTargets: [],
  selectedNulls: [],
  pickedIndices: [],
  clueText: '',
  clueNumber: 0,
  showColors: false,
  scenarioComplete: false,
};

function getScenarios(mode: TutorialMode | null): TutorialScenario[] {
  if (mode === 'captain') return captainScenarios;
  if (mode === 'scout') return scoutScenarios;
  return [];
}

function getScenario(state: TutorialState): TutorialScenario | null {
  const scenarios = getScenarios(state.mode);
  return scenarios[state.scenarioIndex] ?? null;
}

function getStep(state: TutorialState): TutorialStep | null {
  const scenario = getScenario(state);
  if (!scenario) return null;
  return scenario.steps[state.stepIndex] ?? null;
}

function applyBoardOverrides(state: TutorialState, step: TutorialStep | null): TutorialState {
  if (!step?.boardOverrides) return state;
  const o = step.boardOverrides;
  return {
    ...state,
    selectedTargets: o.selectedTargets ?? state.selectedTargets,
    selectedNulls: o.selectedNulls ?? state.selectedNulls,
    pickedIndices: o.pickedIndices ?? state.pickedIndices,
    showColors: o.showColors ?? state.showColors,
    clueText: o.clueText ?? state.clueText,
    clueNumber: o.clueNumber ?? state.clueNumber,
  };
}

function advanceStep(state: TutorialState): TutorialState {
  const scenario = getScenario(state);
  if (!scenario) return state;

  const nextStepIndex = state.stepIndex + 1;
  if (nextStepIndex >= scenario.steps.length) {
    return { ...state, scenarioComplete: true };
  }

  const nextStep = scenario.steps[nextStepIndex];
  const newState = { ...state, stepIndex: nextStepIndex };
  return applyBoardOverrides(newState, nextStep);
}

function resetBoardState(state: TutorialState): TutorialState {
  return {
    ...state,
    stepIndex: 0,
    selectedTargets: [],
    selectedNulls: [],
    pickedIndices: [],
    clueText: '',
    clueNumber: 0,
    showColors: false,
    scenarioComplete: false,
  };
}

function rewindToStep(state: TutorialState, targetIndex: number): TutorialState {
  const scenario = getScenario(state);
  if (!scenario || targetIndex < 0) return state;
  let newState = { ...resetBoardState(state), stepIndex: targetIndex };
  for (let i = 0; i <= targetIndex; i++) {
    newState = applyBoardOverrides(newState, scenario.steps[i]);
  }
  newState.stepIndex = targetIndex;
  return newState;
}

function reducer(state: TutorialState, action: Action): TutorialState {
  switch (action.type) {
    case 'SELECT_MODE':
      return { ...initialState, mode: action.mode };

    case 'SELECT_SCENARIO': {
      const newState = { ...resetBoardState(state), scenarioIndex: action.index };
      const scenario = getScenario(newState);
      const firstStep = scenario?.steps[0] ?? null;
      return applyBoardOverrides(newState, firstStep);
    }

    case 'ACKNOWLEDGE': {
      const step = getStep(state);
      if (!step || (step.action.type !== 'acknowledge' && step.action.type !== 'auto')) return state;
      return advanceStep(state);
    }

    case 'CLICK_CARD': {
      const step = getStep(state);
      if (!step) return state;

      if (step.action.type === 'click-card') {
        if (action.cardIndex !== step.action.cardIndex) return state;
        return advanceStep(state);
      }

      if (step.action.type === 'click-cards') {
        const expected = step.action.cardIndices;
        const alreadySelected = state.mode === 'captain' ? state.selectedTargets : state.pickedIndices;
        if (!expected.includes(action.cardIndex)) return state;
        if (alreadySelected.includes(action.cardIndex)) return state;

        const newSelected = [...alreadySelected, action.cardIndex];
        const newState = state.mode === 'captain'
          ? { ...state, selectedTargets: newSelected }
          : { ...state, pickedIndices: newSelected };

        // All expected cards selected?
        if (expected.every(i => newSelected.includes(i))) {
          return advanceStep(newState);
        }
        return newState;
      }

      return state;
    }

    case 'TYPE_CLUE': {
      const step = getStep(state);
      if (!step || step.action.type !== 'type-clue') return state;
      const newState = { ...state, clueText: action.text };
      if (action.text.toUpperCase() === step.action.word.toUpperCase()) {
        return advanceStep(newState);
      }
      return newState;
    }

    case 'SET_NUMBER': {
      const step = getStep(state);
      if (!step || step.action.type !== 'set-number') return state;
      const newState = { ...state, clueNumber: action.number };
      if (action.number === step.action.number) {
        return advanceStep(newState);
      }
      return newState;
    }

    case 'SUBMIT': {
      const step = getStep(state);
      if (!step || step.action.type !== 'submit') return state;
      return advanceStep(state);
    }

    case 'CLICK_BUTTON': {
      const step = getStep(state);
      if (!step || step.action.type !== 'click-button') return state;
      if (action.buttonId !== step.action.buttonId) return state;
      return advanceStep(state);
    }

    case 'NEXT_SCENARIO': {
      const scenarios = getScenarios(state.mode);
      const nextIdx = state.scenarioIndex + 1;
      if (nextIdx >= scenarios.length) {
        return { ...initialState, mode: state.mode };
      }
      const newState = { ...resetBoardState(state), scenarioIndex: nextIdx };
      const scenario = getScenario(newState);
      const firstStep = scenario?.steps[0] ?? null;
      return applyBoardOverrides(newState, firstStep);
    }

    case 'PREV_STEP': {
      if (state.stepIndex <= 0) return state;
      return rewindToStep(state, state.stepIndex - 1);
    }

    case 'GO_BACK':
      if (state.scenarioComplete || state.stepIndex > 0) {
        return { ...initialState, mode: state.mode };
      }
      return initialState;

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useTutorialMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const currentScenarios = getScenarios(state.mode);
  const currentScenario = getScenario(state);
  const currentStep = getStep(state);
  const isActive = currentScenario !== null && !state.scenarioComplete;

  return {
    state,
    currentScenarios,
    currentScenario,
    currentStep,
    isActive,

    selectMode: useCallback((mode: TutorialMode) => dispatch({ type: 'SELECT_MODE', mode }), []),
    selectScenario: useCallback((index: number) => dispatch({ type: 'SELECT_SCENARIO', index }), []),
    handleCardClick: useCallback((cardIndex: number) => dispatch({ type: 'CLICK_CARD', cardIndex }), []),
    handleClueInput: useCallback((text: string) => dispatch({ type: 'TYPE_CLUE', text }), []),
    handleSubmit: useCallback(() => dispatch({ type: 'SUBMIT' }), []),
    handleButtonClick: useCallback((buttonId: string) => dispatch({ type: 'CLICK_BUTTON', buttonId }), []),
    handleAcknowledge: useCallback(() => dispatch({ type: 'ACKNOWLEDGE' }), []),
    nextScenario: useCallback(() => dispatch({ type: 'NEXT_SCENARIO' }), []),
    prevStep: useCallback(() => dispatch({ type: 'PREV_STEP' }), []),
    goBack: useCallback(() => dispatch({ type: 'GO_BACK' }), []),
    reset: useCallback(() => dispatch({ type: 'RESET' }), []),
  };
}
