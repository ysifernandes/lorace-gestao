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
    /** Piso de reforços por turno. REGRA DO GAME DESIGN. */
    minimum: number;
    /** 1 reforço extra a cada N territórios controlados. */
    territoriesPerExtraTroop: number;
  };
  setup: {
    /** Soldados iniciais por território controlado. */
    troopsPerTerritory: number;
    /** Soldado extra por assento após o primeiro (compensação de ordem). */
    seatCompensation: number;
    /** Guarnição de cada território Remanescente (neutro). */
    neutralGarrison: number;
    /** Territórios por jogador conforme a quantidade de participantes. */
    territoriesPerPlayer: Record<number, number>;
  };
  dice: {
    defaultSides: number;
    maxSides: number;
    /** REGRA OFICIAL: atacante usa no máximo 3 dados. */
    maxAttackDice: number;
    /** REGRA OFICIAL: defensor usa no máximo 3 dados. */
    maxDefenseDice: number;
    /** Ataque através de um Poço fica limitado a 2 dados. */
    pocoAttackDice: number;
  };
  movement: {
    /** Movimentações por turno (padrão). */
    perTurn: number;
    /** Limite de soldados pela Rota Costeira. */
    coastalRouteLimit: number;
  };
  transport: {
    /** Cargas com que cada jogador começa a partida. */
    startingCharges: number;
    /** Estoque máximo de cargas. */
    maxCharges: number;
    /** Recarga automática a cada N rodadas. */
    rechargeEveryRounds: number;
    /** Recarga acelerada com o Pátio de Cargas. */
    rechargeWithDepotRounds: number;
    /** Estoque máximo com o Pátio de Cargas. */
    maxChargesWithDepot: number;
    /** Soldados enviados no máximo por Ataque Especial. */
    maxSoldiers: number;
    /** Distância exata alcançada. */
    range: number;
  };
  deck: {
    /** Limite da mão ao final do turno (a carta assinatura não conta). */
    handLimit: number;
    /** Turnos seguidos sem carta que garantem uma compra de compensação. */
    compensationAfterTurns: number;
  };
  collapse: {
    /** Chance base ao final de cada rodada. */
    baseChance: number;
    /** Acréscimo por rodada sem evento. */
    pressureStep: number;
    /** Teto da chance. */
    maxChance: number;
    /** Rodadas de silêncio garantido após um evento. */
    cooldownRounds: number;
    /** Primeira rodada em que um evento pode ocorrer. */
    firstRound: number;
    /** Máximo de eventos por partida. */
    maxPerGame: number;
  };
  victory: {
    /** Rodada em que a partida termina por critério de desempate. */
    roundLimit: number;
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
    territoriesPerExtraTroop: 3,
  },
  setup: {
    troopsPerTerritory: 3,
    seatCompensation: 1,
    neutralGarrison: 2,
    territoriesPerPlayer: { 2: 10, 3: 10, 4: 7, 5: 6, 6: 5 },
  },
  dice: {
    defaultSides: 6,
    maxSides: 20,
    maxAttackDice: 3,
    maxDefenseDice: 3,
    pocoAttackDice: 2,
  },
  movement: {
    perTurn: 1,
    coastalRouteLimit: 3,
  },
  transport: {
    startingCharges: 1,
    maxCharges: 1,
    rechargeEveryRounds: 4,
    rechargeWithDepotRounds: 3,
    maxChargesWithDepot: 2,
    maxSoldiers: 3,
    range: 2,
  },
  deck: {
    handLimit: 5,
    compensationAfterTurns: 3,
  },
  collapse: {
    baseChance: 0.12,
    pressureStep: 0.08,
    maxChance: 0.6,
    cooldownRounds: 2,
    firstRound: 3,
    maxPerGame: 6,
  },
  victory: {
    roundLimit: 25,
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
