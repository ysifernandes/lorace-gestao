import type { GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import type { TurnPhase } from '../types/turn.types';
import { PHASE_LABELS } from './phases';
import { canDrawNow } from '../deck/deck';
import { transportStatus } from '../engine/selectors';

/**
 * INSTRUÇÃO CONTEXTUAL — o que fazer AGORA.
 *
 * Camada de leitura pura sobre o estado: nenhuma regra nova. Diz, em uma
 * frase, qual é a ação principal do momento e se dá para avançar.
 */

export interface PhaseGuide {
  /** Nome da fase, como na barra. */
  phase: TurnPhase;
  title: string;
  /** Uma frase: o que o jogador precisa fazer. */
  instruction: string;
  /** Rótulo da AÇÃO PRINCIPAL do momento. */
  primaryLabel: string;
  /** Motivo pelo qual ainda não dá para avançar (null = pode avançar). */
  blockedBecause: string | null;
  /** true quando a fase não exige nada e a saída é só avançar. */
  optional: boolean;
}

export function phaseGuide(state: GameState, playerId: PlayerId): PhaseGuide {
  const phase = state.turn.phase;
  const title = PHASE_LABELS[phase];

  if (state.pendingOccupation) {
    return {
      phase,
      title: 'Ocupação obrigatória',
      instruction: `Escolha quantos soldados ocupam o território conquistado (mínimo ${state.pendingOccupation.min}).`,
      primaryLabel: 'Ocupar',
      blockedBecause: 'Ocupe o território conquistado antes de continuar.',
      optional: false,
    };
  }

  if (state.pendingAttack?.status === 'DECLARED') {
    const rolled = state.pendingAttack.rounds.length > 0;
    return {
      phase,
      title: 'Batalha em andamento',
      instruction: rolled
        ? 'Role de novo contra o mesmo território ou recue — ainda é o mesmo ataque.'
        : 'Role os dados. A primeira rodada é obrigatória.',
      primaryLabel: 'Rolar dados',
      blockedBecause: 'Termine a batalha antes de mudar de fase.',
      optional: false,
    };
  }

  switch (phase) {
    case 'REFORCO': {
      const pending = state.turn.pendingReinforcements;
      return {
        phase,
        title,
        instruction:
          pending > 0
            ? `Coloque ${pending} tropa(s) em territórios seus.`
            : 'Reforços distribuídos. Pode avançar.',
        primaryLabel: pending > 0 ? 'Distribuir' : 'Ir para o ataque',
        blockedBecause: pending > 0 ? `Ainda faltam ${pending} reforço(s).` : null,
        optional: false,
      };
    }

    case 'ATAQUE_COMUM':
      return {
        phase,
        title,
        instruction: state.turn.commonAttackUsed
          ? 'Seu Ataque Comum deste turno já foi utilizado.'
          : 'Toque em um território seu e escolha ATACAR.',
        primaryLabel: state.turn.commonAttackUsed ? 'Ir para o especial' : 'Escolher origem',
        blockedBecause: null,
        optional: true,
      };

    case 'ATAQUE_ESPECIAL': {
      const transport = transportStatus(state, playerId);
      return {
        phase,
        title,
        instruction: state.turn.specialAttackUsed
          ? 'Ataque Especial já usado neste turno.'
          : transport.blocked
            ? 'O Ataque Especial está bloqueado nesta rodada.'
            : transport.charges <= 0 && !transport.free
              ? 'Sem carga de Transporte. Ela recarrega sozinha.'
              : 'Escolha a origem e um alvo a exatamente 2 de distância.',
        primaryLabel: 'Ir para a movimentação',
        blockedBecause: null,
        optional: true,
      };
    }

    case 'MOVIMENTACAO': {
      const left = state.turn.movesAllowed - state.turn.movesUsed;
      return {
        phase,
        title,
        instruction:
          left > 0
            ? `Reposicione tropas entre territórios seus. ${left} movimentação(ões) restante(s).`
            : 'Movimentações esgotadas neste turno.',
        primaryLabel: 'Ir para as cartas',
        blockedBecause: null,
        optional: true,
      };
    }

    case 'CARTAS': {
      const draw = canDrawNow(state, playerId);
      return {
        phase,
        title,
        instruction: draw.ok
          ? `Você pode comprar 1 carta (${draw.reason.toLowerCase()}).`
          : draw.reason,
        primaryLabel: draw.ok ? 'Comprar carta' : 'Encerrar turno',
        blockedBecause: null,
        optional: true,
      };
    }

    case 'FIM_TURNO':
      return {
        phase,
        title,
        instruction: 'Turno concluído. Passe a vez.',
        primaryLabel: 'Passar a vez',
        blockedBecause: null,
        optional: false,
      };

    default:
      return {
        phase,
        title,
        instruction: '',
        primaryLabel: 'Avançar',
        blockedBecause: null,
        optional: true,
      };
  }
}
