import type { AbilityDefinition } from '../ability.types';
import type { EffectDescriptor } from '../../effects/effect.types';
import type { TerritoryId } from '../../types/ids';
import { HUMANOS_ID } from '../../factions/humanos';
import { BALANCE } from '../../config/balance';
import { OPERACAO_AEREA_ANIMATION } from '../animations/ability.animations';
import { soldiersInTerritory } from '../../soldiers/soldier';

export const OPERACAO_AEREA_ID = 'ability.humanos.operacao-aerea';

export interface OperacaoAereaParams {
  from: TerritoryId;
  to: TerritoryId;
  amount: number;
}

/** Lê e valida os parâmetros informados pelo jogador. */
function readParams(params: Record<string, unknown> | undefined): OperacaoAereaParams | null {
  if (!params) return null;
  const { from, to, amount } = params as Partial<OperacaoAereaParams>;
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  if (typeof amount !== 'number') return null;
  return { from: from as TerritoryId, to: to as TerritoryId, amount };
}

/**
 * OPERAÇÃO AÉREA — ativa dos Humanos.
 *
 * Ponte aérea: move tropas entre dois territórios Humanos mesmo sem
 * fronteira comum. É o poder que traduz "tecnologia + controle tático".
 *
 * ⚠️ EXPERIMENTAL: limites vêm de `BALANCE.abilities.operacaoAerea`.
 */
export const OPERACAO_AEREA: AbilityDefinition = {
  id: OPERACAO_AEREA_ID,
  factionId: HUMANOS_ID,
  name: 'Operação Aérea',
  description:
    'Transporta tropas entre dois territórios seus, mesmo que não sejam vizinhos. ' +
    `A origem mantém ao menos ${BALANCE.abilities.operacaoAerea.minLeftBehind} soldado(s).`,
  kind: 'ACTIVE',
  // Ativa: não dispara por evento, é acionada pelo jogador.
  triggers: [],
  conditions: [
    { type: 'IS_CURRENT_PLAYER' },
    { type: 'PHASE_IS', phases: BALANCE.abilities.operacaoAerea.allowedPhases },
    { type: 'NO_PENDING_OCCUPATION' },
  ],
  usage: {
    scope: 'PER_GAME',
    charges: BALANCE.abilities.operacaoAerea.usesPerGame,
    perTurn: BALANCE.abilities.operacaoAerea.usesPerTurn,
    cooldownTurns: BALANCE.abilities.operacaoAerea.cooldownTurns,
  },
  validateParams: (context) => {
    const params = readParams(context.params);
    if (!params) return { ok: false, error: 'Informe origem, destino e quantidade.' };
    const { state, playerId } = context;
    const from = state.territories[params.from as string];
    const to = state.territories[params.to as string];
    if (!from || !to) return { ok: false, error: 'Território inexistente.' };
    if (from.id === to.id) return { ok: false, error: 'Origem e destino são o mesmo território.' };
    if (from.controllerId !== playerId) {
      return { ok: false, error: 'A origem precisa ser um território seu.' };
    }
    if (to.controllerId !== playerId) {
      return { ok: false, error: 'O destino precisa ser um território seu.' };
    }
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      return { ok: false, error: 'Quantidade inválida.' };
    }
    const available = soldiersInTerritory(state, from.id).length;
    const minLeft = BALANCE.abilities.operacaoAerea.minLeftBehind;
    if (available - params.amount < minLeft) {
      return {
        ok: false,
        error: `É obrigatório deixar ao menos ${minLeft} soldado(s) em ${from.name}.`,
      };
    }
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => {
    const params = readParams(context.params);
    if (!params) return [];
    return [
      {
        kind: 'MOVE_TROOPS',
        from: params.from,
        to: params.to,
        amount: params.amount,
        // É exatamente o que a habilidade compra: ignorar a fronteira.
        ignoreAdjacency: true,
        minLeftBehind: BALANCE.abilities.operacaoAerea.minLeftBehind,
      },
    ];
  },
  feedback: {
    title: 'OPERAÇÃO AÉREA',
    detail: (context) => {
      const params = readParams(context.params);
      if (!params) return '';
      const from = context.state.territories[params.from as string]?.name ?? '???';
      const to = context.state.territories[params.to as string]?.name ?? '???';
      return `${from} → ${to} · ${params.amount} soldado(s)`;
    },
  },
  animation: OPERACAO_AEREA_ANIMATION,
  provisional: true,
};
