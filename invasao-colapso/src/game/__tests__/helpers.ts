import { createGame } from '../engine/setup';
import { applyAction } from '../engine/gameEngine';
import type { GameAction, ActionResult } from '../engine/actions';
import type { EngineOptions } from '../engine/gameEngine';
import type { GameState } from '../types/game.types';
import { assertValid } from '../engine/invariants';
import { PLAYER_IDS } from '../../data/players.seed';
import { TERRITORY_IDS } from '../../data/territories.seed';
import type { CardInstanceId, PlayerId, TerritoryId } from '../types/ids';
import type { Rng } from '../rng/rng';

export { PLAYER_IDS, TERRITORY_IDS };

export function newGame(): GameState {
  return createGame({ gameId: 'test-game', createdAt: 0 });
}

/** Aplica uma ação exigindo sucesso e revalidando a integridade do estado. */
export function must(
  state: GameState,
  action: GameAction,
  options?: { rng?: Rng },
): GameState {
  const result = applyAction(state, action, options as EngineOptions);
  if (!result.ok) throw new Error(`Ação ${action.type} falhou: ${result.error}`);
  assertValid(result.state, action.type);
  return result.state;
}

/** Aplica uma ação exigindo FALHA (validações negativas). */
export function mustFail(state: GameState, action: GameAction, options?: { rng?: Rng }): string {
  const result = applyAction(state, action, options as EngineOptions) as ActionResult;
  if (result.ok) throw new Error(`Ação ${action.type} deveria ter falhado, mas passou.`);
  assertValid(result.state, `${action.type} (falha)`);
  return result.error;
}

export function run(state: GameState, action: GameAction, options?: { rng?: Rng }): ActionResult {
  return applyAction(state, action, options as EngineOptions);
}

/** Avança até a fase pedida, respeitando a máquina de estados. */
export function goToPhase(state: GameState, phase: string): GameState {
  let current = state;
  for (let i = 0; i < 12; i += 1) {
    if (current.turn.phase === phase) return current;
    current = must(current, { type: 'ADVANCE_PHASE' });
  }
  throw new Error(`Não foi possível chegar à fase ${phase}.`);
}

export function garrison(state: GameState, id: TerritoryId): number {
  return state.territories[id as string].garrison.length;
}

export function firstCardOf(state: GameState, player: PlayerId): CardInstanceId {
  const card = state.players[player as string].handCardIds[0];
  if (!card) throw new Error(`Jogador ${player} não tem cartas na mão.`);
  return card;
}

export function enemySoldierIds(state: GameState, territory: TerritoryId): string[] {
  return state.territories[territory as string].garrison.map(String);
}

export function aliveCount(state: GameState): number {
  return Object.values(state.soldiers).filter((s) => s.alive).length;
}
