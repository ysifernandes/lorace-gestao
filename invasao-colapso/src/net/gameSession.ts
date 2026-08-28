import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import type { PlayerId } from '../game/types/ids';
import { applyAction } from '../game/engine/gameEngine';
import { defaultRng } from '../game/rng/rng';
import type { Rng } from '../game/rng/rng';
import type { DiceBroadcast, GameSnapshot } from './protocol';
import { FACEDOWN_CARD_ID } from '../game/cards/facedown.card';

/**
 * SESSÃO AUTORITATIVA DA PARTIDA.
 *
 * Roda o MESMO motor de regras do modo local (`applyAction`) — não existe
 * `combatOnline.ts` com regras duplicadas. O que esta classe acrescenta é:
 *
 *  1. validação de quem pode agir (é a sua vez? o assento é seu?);
 *  2. lista de ações que um cliente TEM PERMISSÃO de pedir;
 *  3. filtro de informação privada antes de enviar o estado;
 *  4. autoridade sobre os dados: o resultado nasce aqui, nunca no navegador.
 *
 * É pura: não conhece socket. O transporte a usa; os testes também.
 */

/** Ações que um cliente pode pedir. Tudo que não está aqui é recusado. */
const ALLOWED_INTENTS: ReadonlySet<GameAction['type']> = new Set([
  'ADVANCE_PHASE',
  'END_TURN',
  'ADD_SOLDIERS',
  'AUTO_REINFORCE',
  'MOVE_SOLDIERS',
  'DECLARE_ATTACK',
  'DECLARE_SPECIAL_ATTACK',
  'ROLL_BATTLE_ROUND',
  'RESOLVE_ATTACK',
  'CANCEL_ATTACK',
  'OCCUPY_TERRITORY',
  'DRAW_CARD',
  'DISCARD_CARD',
  'PLAY_CARD',
  'DISTRIBUTE_RESERVES',
  'RESOLVE_COLLAPSE',
  'ACTIVATE_ABILITY',
]);

/** Ações que não exigem ser o jogador da vez (reação de defesa). */
const OUT_OF_TURN_INTENTS: ReadonlySet<GameAction['type']> = new Set(['PLAY_CARD']);

export interface IntentResult {
  ok: boolean;
  error?: string;
  /** Preenchido quando a ação foi uma rolagem de dados. */
  dice?: DiceBroadcast;
}

export class GameSession {
  private state: GameState;
  private revision = 0;
  private readonly rng: Rng;
  private diceSeed = 1;

  constructor(initial: GameState, rng: Rng = defaultRng) {
    this.state = initial;
    this.rng = rng;
  }

  getRevision(): number {
    return this.revision;
  }

  /** Estado bruto — SÓ para o servidor. Nunca vai para a rede assim. */
  rawState(): GameState {
    return this.state;
  }

  /**
   * Recebe uma intenção de um assento e a executa se — e só se — as regras
   * permitirem. O cliente não decide nada: ele pede.
   */
  submit(seatPlayerId: PlayerId, action: GameAction): IntentResult {
    if (!ALLOWED_INTENTS.has(action.type)) {
      return { ok: false, error: 'Ação não permitida pelo servidor.' };
    }
    if (this.state.status === 'FINISHED') {
      return { ok: false, error: 'A partida já terminou.' };
    }
    if (
      !OUT_OF_TURN_INTENTS.has(action.type) &&
      this.state.turn.currentPlayerId !== seatPlayerId
    ) {
      return { ok: false, error: 'Não é a sua vez.' };
    }

    const isRoll = action.type === 'ROLL_BATTLE_ROUND';
    const roundsBefore = this.state.pendingAttack?.rounds.length ?? 0;

    // A AUTORIDADE ROLA: o rng é do servidor, não do cliente.
    const result = applyAction(this.state, action, { rng: this.rng });
    if (!result.ok) return { ok: false, error: result.error };

    this.state = result.state;
    this.revision += 1;

    if (isRoll) {
      const round = this.state.pendingAttack?.rounds.at(-1);
      // A batalha pode ter fechado na mesma ação (conquista/exaustão); nesse
      // caso o resultado veio no `data` da ação.
      const data = result.data as { round?: typeof round } | undefined;
      const officialRound = round && this.state.pendingAttack ? round : data?.round;
      if (officialRound && (this.state.pendingAttack?.rounds.length ?? 0) !== roundsBefore) {
        this.diceSeed += 1;
        return {
          ok: true,
          dice: {
            attackerDice: officialRound.attackerDice,
            defenderDice: officialRound.defenderDice,
            attackerLosses: officialRound.attackerLosses,
            defenderLosses: officialRound.defenderLosses,
            seed: this.diceSeed,
            round: officialRound.index,
          },
        };
      }
      if (data?.round) {
        this.diceSeed += 1;
        return {
          ok: true,
          dice: {
            attackerDice: data.round.attackerDice,
            defenderDice: data.round.defenderDice,
            attackerLosses: data.round.attackerLosses,
            defenderLosses: data.round.defenderLosses,
            seed: this.diceSeed,
            round: data.round.index,
          },
        };
      }
    }
    return { ok: true };
  }

  /**
   * Snapshot para UM jogador, com a informação privada dos outros removida.
   * O servidor sabe tudo; cada cliente recebe só o que a regra permite.
   */
  snapshotFor(viewer: PlayerId): GameSnapshot {
    return {
      revision: this.revision,
      state: redactFor(this.state, viewer),
      youAre: viewer,
    };
  }
}

/**
 * Remove do estado o que este jogador não pode ver.
 *
 * - MISSÃO SECRETA dos outros: some enquanto não for revelada.
 * - MÃO DE CARTAS dos outros: vira contagem, sem identidade.
 *
 * Feito por cópia: o estado autoritativo do servidor não é tocado.
 */
export function redactFor(state: GameState, viewer: PlayerId): GameState {
  const copy = structuredClone(state) as GameState;

  for (const [playerId, mission] of Object.entries(copy.missions)) {
    if (playerId === (viewer as string)) continue;
    if (mission.revealed) continue;
    delete copy.missions[playerId];
  }

  for (const player of Object.values(copy.players)) {
    if ((player.id as string) === (viewer as string)) continue;
    const hidden = player.handCardIds.map((_, index) => `hidden:${player.id}:${index}`);
    // A carta some do estado do cliente…
    for (const cardId of player.handCardIds) delete copy.cards[cardId as string];
    // …e é substituída por uma CARTA VIRADA: presença sem identidade. Assim a
    // contagem continua pública e o estado segue íntegro no cliente.
    player.handCardIds.forEach((_, index) => {
      const instanceId = hidden[index];
      copy.cards[instanceId] = {
        instanceId: instanceId as never,
        definitionId: FACEDOWN_CARD_ID,
        ownerId: player.id,
        state: 'IN_HAND',
        usesRemaining: 1,
        usedMode: null,
        history: [],
      };
    });
    player.handCardIds = hidden as never;
  }

  return copy;
}
