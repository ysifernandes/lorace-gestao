import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_ORIGIN,
  TUTORIAL_TARGET,
  TUTORIAL_MOVE_TO,
  advanceTutorial,
  createTutorialGame,
  listTutorialSteps,
  rebaseStep,
  skipTutorial,
  startTutorial,
  stepSatisfied,
  tutorialProgress,
  tutorialStepAt,
} from '../tutorial';
import type { TutorialSession } from '../tutorial';
import { applyAction } from '../engine/gameEngine';
import { PLAYER_IDS } from '../engine/setup';
import { validateState } from '../engine/invariants';
import { dice, must } from './helpers';
import type { GameState } from '../types/game.types';
import { isAdjacent } from '../map/adjacency';

/**
 * TUTORIAL — testes de roteiro.
 *
 * O tutorial não pode ensinar uma regra que o motor não tem. Cada passo é
 * percorrido executando AÇÕES REAIS, e o estado é validado a cada troca.
 */

/** Executa o roteiro inteiro, jogando de verdade em cada passo `DO`. */
function playThroughTutorial(): { state: GameState; session: TutorialSession; visited: string[] } {
  let { state, session } = startTutorial();
  const visited: string[] = [];

  for (let guard = 0; guard < 60 && !session.finished; guard += 1) {
    const step = tutorialStepAt(session.stepIndex);
    if (!step) break;
    if (visited[visited.length - 1] !== step.id) visited.push(step.id);

    if (step.advance.kind === 'DO' && !stepSatisfied(session, state)) {
      state = actFor(step.id, state);
      expect(validateState(state)).toEqual([]);
      continue;
    }
    const next = advanceTutorial(session, state);
    state = next.state;
    session = next.session;
  }
  return { state, session, visited };
}

/** A jogada que um jogador faria em cada passo do roteiro. */
function actFor(stepId: string, state: GameState): GameState {
  switch (stepId) {
    case 'reforco':
      return must(state, { type: 'ADD_SOLDIERS', territoryId: TUTORIAL_ORIGIN, amount: 1 });
    case 'reforco-fim': {
      let current = state;
      if (current.turn.pendingReinforcements > 0) {
        current = must(current, {
          type: 'ADD_SOLDIERS',
          territoryId: TUTORIAL_ORIGIN,
          amount: current.turn.pendingReinforcements,
        });
      }
      return must(current, { type: 'ADVANCE_PHASE' });
    }
    case 'ataque':
      return must(state, {
        type: 'DECLARE_ATTACK',
        from: TUTORIAL_ORIGIN,
        to: TUTORIAL_TARGET,
      });
    case 'dados':
      return must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    case 'continuar': {
      // O alvo tinha 3 defensores; uma rodada 6-6-6 × 1-1-1 já zera.
      let current = state;
      if (current.pendingOccupation) {
        current = must(current, { type: 'OCCUPY_TERRITORY', amount: 2 });
      } else if (current.pendingAttack) {
        current = must(current, { type: 'CANCEL_ATTACK' });
      }
      return current;
    }
    case 'movimento': {
      let current = state;
      while (current.turn.phase !== 'MOVIMENTACAO') {
        current = must(current, { type: 'ADVANCE_PHASE' });
      }
      return must(current, {
        type: 'MOVE_SOLDIERS',
        from: TUTORIAL_ORIGIN,
        to: TUTORIAL_MOVE_TO,
        amount: 1,
      });
    }
    case 'fim': {
      let current = state;
      for (let i = 0; i < 10 && current.turn.turnsPlayed <= 1; i += 1) {
        const result = applyAction(current, { type: 'ADVANCE_PHASE' });
        if (!result.ok) break;
        current = result.state;
      }
      return current;
    }
    default:
      return state;
  }
}

describe('Tutorial — roteiro e dados', () => {
  it('U01 · o roteiro é dado declarado, sem id repetido', () => {
    const steps = listTutorialSteps();
    expect(steps.length).toBeGreaterThanOrEqual(12);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
      // Passo que exige ação precisa saber reconhecer que a ação aconteceu.
      if (step.advance.kind === 'DO') expect(typeof step.done).toBe('function');
    }
  });

  it('U02 · a partida do tutorial é válida e controlada', () => {
    const state = createTutorialGame();
    expect(validateState(state)).toEqual([]);
    expect(Object.keys(state.players)).toHaveLength(3); // 2 jogadores + Remanescentes
    expect(state.turn.phase).toBe('REFORCO');
    // A origem e o alvo do roteiro precisam existir e ser vizinhos de fato.
    expect(isAdjacent(state, TUTORIAL_ORIGIN, TUTORIAL_TARGET)).toBe(true);
    expect(isAdjacent(state, TUTORIAL_ORIGIN, TUTORIAL_MOVE_TO)).toBe(true);
    // O alvo é inimigo; a origem é sua.
    expect(state.territories[TUTORIAL_ORIGIN as string].controllerId).toBe(PLAYER_IDS.p1);
    expect(state.territories[TUTORIAL_TARGET as string].controllerId).toBe(PLAYER_IDS.p2);
  });

  it('U03 · passo de leitura nunca avança sozinho', () => {
    const { state, session } = startTutorial();
    expect(tutorialStepAt(0)?.advance.kind).toBe('CONFIRM');
    expect(stepSatisfied(session, state)).toBe(false);
  });

  it('U04 · o roteiro inteiro é percorrido jogando de verdade', () => {
    const { state, session, visited } = playThroughTutorial();
    expect(session.finished).toBe(true);
    expect(validateState(state)).toEqual([]);
    // Todos os passos foram visitados, na ordem declarada.
    expect(visited).toEqual(listTutorialSteps().map((s) => s.id));
  });

  it('U05 · reforço: o passo só é cumprido quando o jogador distribui', () => {
    const { state, session } = startTutorial();
    const reinforce = advanceTutorial(session, state); // sai de "mapa"
    expect(tutorialStepAt(reinforce.session.stepIndex)?.id).toBe('reforco');
    expect(stepSatisfied(reinforce.session, reinforce.state)).toBe(false);
    const after = must(reinforce.state, {
      type: 'ADD_SOLDIERS',
      territoryId: TUTORIAL_ORIGIN,
      amount: 1,
    });
    expect(stepSatisfied(reinforce.session, after)).toBe(true);
  });

  it('U06 · ataque: o passo exige batalha declarada de verdade', () => {
    let { state, session } = startTutorial();
    for (let guard = 0; guard < 40 && tutorialStepAt(session.stepIndex)?.id !== 'ataque'; guard += 1) {
      if (stepSatisfied(session, state) || tutorialStepAt(session.stepIndex)?.advance.kind === 'CONFIRM') {
        const next = advanceTutorial(session, state);
        state = next.state;
        session = next.session;
      } else {
        state = actFor(tutorialStepAt(session.stepIndex)!.id, state);
      }
    }
    expect(stepSatisfied(session, state)).toBe(false);
    const declared = must(state, {
      type: 'DECLARE_ATTACK',
      from: TUTORIAL_ORIGIN,
      to: TUTORIAL_TARGET,
    });
    expect(stepSatisfied(session, declared)).toBe(true);
  });

  it('U07 · dados: o passo só fecha depois de uma rodada real', () => {
    const { state } = startTutorial();
    const session: TutorialSession = {
      stepIndex: listTutorialSteps().findIndex((s) => s.id === 'dados'),
      stepStartedWith: state,
      finished: false,
    };
    expect(stepSatisfied(session, state)).toBe(false);
  });

  it('U08 · pular tutorial encerra sem alterar o estado do jogo', () => {
    const { state, session } = startTutorial();
    const skipped = skipTutorial(session);
    expect(skipped.finished).toBe(true);
    expect(tutorialProgress(skipped).finished).toBe(true);
    expect(validateState(state)).toEqual([]);
  });

  it('U09 · rebase reancora o passo sem perder o progresso', () => {
    const { state, session } = startTutorial();
    const moved = must(state, { type: 'ADD_SOLDIERS', territoryId: TUTORIAL_ORIGIN, amount: 1 });
    const rebased = rebaseStep(session, moved);
    expect(rebased.stepIndex).toBe(session.stepIndex);
    expect(rebased.stepStartedWith).toBe(moved);
  });

  it('U10 · a carta do passo de cartas é realmente entregue pela preparação', () => {
    let { state, session } = startTutorial();
    const cardsIndex = listTutorialSteps().findIndex((s) => s.id === 'cartas');
    // Avança até o passo anterior e deixa o `prepare` do passo de cartas rodar.
    session = { ...session, stepIndex: cardsIndex - 1, stepStartedWith: state };
    const before = state.players[PLAYER_IDS.p1 as string].handCardIds.length;
    const next = advanceTutorial(session, state);
    expect(tutorialStepAt(next.session.stepIndex)?.id).toBe('cartas');
    expect(next.state.players[PLAYER_IDS.p1 as string].handCardIds.length).toBe(before + 1);
    expect(validateState(next.state)).toEqual([]);
  });
});
