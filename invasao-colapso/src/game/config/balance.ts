import type { TurnPhase } from '../types/turn.types';

/**
 * CONFIGURAÇÃO CENTRAL DE BALANCEAMENTO
 *
 * Todo número que define equilíbrio de jogo mora aqui. Nenhum outro arquivo
 * deve conter valores mágicos — ajustar o jogo é editar só este arquivo.
 *
 * Valores marcados como PROVISÓRIO aguardam definição do criador.
 */
export interface BalanceConfig {
  territory: {
    /** Soldados que precisam permanecer em um território de origem. */
    minGarrison: number;
  };
  reinforcements: {
    /** Piso de reforços por turno. PROVISÓRIO. */
    minimum: number;
    /** 1 reforço extra a cada N territórios controlados. PROVISÓRIO. */
    territoriesPerExtraTroop: number;
  };
  dice: {
    defaultSides: number;
    maxSides: number;
  };
  cards: {
    sequestro: {
      /** Máximo de soldados capturados por uso. REGRA OFICIAL. */
      maxTargets: number;
      maxUses: number;
    };
    vacina: {
      /** Faces do dado da contramedida. REGRA OFICIAL. */
      diceSides: number;
    };
  };
  abilities: {
    sobrevivencia: {
      /** Ativa quando o jogador controla ATÉ este número de territórios. PROVISÓRIO. */
      maxTerritories: number;
      /** Reforço extra concedido. PROVISÓRIO. */
      bonusTroops: number;
    };
    operacaoAerea: {
      /** Usos por partida. PROVISÓRIO. */
      usesPerGame: number;
      /** Usos por turno. PROVISÓRIO. */
      usesPerTurn: number;
      /** Turnos de recarga entre usos (0 = sem recarga). PROVISÓRIO. */
      cooldownTurns: number;
      /** Soldados que precisam ficar na origem. PROVISÓRIO. */
      minLeftBehind: number;
      /** Fases em que pode ser acionada. PROVISÓRIO. */
      allowedPhases: TurnPhase[];
    };
  };
  effects: {
    /** Quantos efeitos já resolvidos ficam no histórico para depuração. */
    historySize: number;
    /** Trava de segurança contra efeitos que gerem efeitos infinitamente. */
    maxResolutionsPerCycle: number;
  };
}

export const BALANCE: BalanceConfig = {
  territory: {
    minGarrison: 1,
  },
  reinforcements: {
    minimum: 3,
    territoriesPerExtraTroop: 2,
  },
  dice: {
    defaultSides: 6,
    maxSides: 20,
  },
  cards: {
    sequestro: {
      maxTargets: 7,
      maxUses: 1,
    },
    vacina: {
      diceSides: 6,
    },
  },
  abilities: {
    sobrevivencia: {
      maxTerritories: 3,
      bonusTroops: 1,
    },
    operacaoAerea: {
      usesPerGame: 2,
      usesPerTurn: 1,
      cooldownTurns: 0,
      minLeftBehind: 1,
      allowedPhases: ['MOVIMENTACAO'],
    },
  },
  effects: {
    historySize: 20,
    maxResolutionsPerCycle: 64,
  },
};
