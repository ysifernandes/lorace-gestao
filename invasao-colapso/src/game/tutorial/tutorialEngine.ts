import type { GameState } from '../types/game.types';
import type { TutorialProgress, TutorialStep } from './tutorial.types';
import { TUTORIAL_STEPS, createTutorialGame } from './tutorial.steps';

/**
 * CONTROLADOR DO TUTORIAL — puro.
 *
 * Guarda apenas: em que passo estamos e como o estado estava quando o passo
 * começou. Quem executa as regras continua sendo o motor; o tutorial só
 * observa o estado e decide se pode avançar.
 */

export interface TutorialSession {
  stepIndex: number;
  /** Estado no instante em que o passo atual começou. */
  stepStartedWith: GameState;
  finished: boolean;
}

export function listTutorialSteps(): TutorialStep[] {
  return TUTORIAL_STEPS;
}

export function tutorialStepAt(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] ?? null;
}

/** Começa o tutorial e devolve a partida controlada junto da sessão. */
export function startTutorial(): { state: GameState; session: TutorialSession } {
  let state = createTutorialGame();
  const first = TUTORIAL_STEPS[0];
  if (first?.prepare) state = first.prepare(state);
  return {
    state,
    session: { stepIndex: 0, stepStartedWith: state, finished: false },
  };
}

/** O passo atual já foi cumprido? */
export function stepSatisfied(session: TutorialSession, state: GameState): boolean {
  const step = tutorialStepAt(session.stepIndex);
  if (!step) return true;
  // Passos de leitura só avançam pelo botão; nunca sozinhos.
  if (step.advance.kind === 'CONFIRM') return false;
  return step.done ? step.done(state, session.stepStartedWith) : true;
}

/**
 * Avança para o próximo passo, rodando o `prepare` dele.
 * Devolve o novo estado (pode ter sido preparado) e a nova sessão.
 */
export function advanceTutorial(
  session: TutorialSession,
  state: GameState,
): { state: GameState; session: TutorialSession } {
  const nextIndex = session.stepIndex + 1;
  if (nextIndex >= TUTORIAL_STEPS.length) {
    return { state, session: { ...session, finished: true } };
  }
  const next = TUTORIAL_STEPS[nextIndex];
  const prepared = next.prepare ? next.prepare(state) : state;
  return {
    state: prepared,
    session: { stepIndex: nextIndex, stepStartedWith: prepared, finished: false },
  };
}

/** Reinicia a contagem do passo atual — usado ao reabrir o tutorial. */
export function rebaseStep(session: TutorialSession, state: GameState): TutorialSession {
  return { ...session, stepStartedWith: state };
}

export function tutorialProgress(session: TutorialSession): TutorialProgress {
  return {
    index: session.stepIndex,
    total: TUTORIAL_STEPS.length,
    finished: session.finished,
  };
}

/** Pular o tutorial inteiro: marca como concluído sem tocar no estado. */
export function skipTutorial(session: TutorialSession): TutorialSession {
  return { ...session, stepIndex: TUTORIAL_STEPS.length - 1, finished: true };
}
