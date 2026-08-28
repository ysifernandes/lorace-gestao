import type { AbilityDefinition } from './ability.types';
import type { EffectDescriptor } from '../effects/effect.types';
import type { TerritoryId } from '../types/ids';
import type { AnimationSpec } from '../types/animation.types';
import { HUMANOS_ID } from '../factions/humanos';
import {
  ALIENIGENAS_ID,
  GOBLINS_ID,
  MAGOS_ID,
  VAMPIROS_ID,
  ZUMBIS_ID,
} from '../factions/roster';
import { TECNOLOGOS_ID } from '../factions/tecnologos';
import { territoriesOf } from '../map/territory';
import { neighborsOf } from '../map/adjacency';
import { BALANCE } from '../config/balance';

/**
 * HABILIDADES DAS SEIS FACÇÕES.
 *
 * Passivas e habilidades transcritas das REFERÊNCIAS VISUAIS OFICIAIS.
 * As passivas cujo efeito é uma regra contínua (Infestação, Evolução,
 * Saque Rápido, Produção em Série, Regeneração, Conhecimento Arcano) vivem em
 * `faction.rules` e são lidas pelo motor; aqui elas existem para aparecer na
 * interface e no painel DEV, sem produzir efeito duplicado.
 */

const PULSE: AnimationSpec = {
  id: 'anim.ability.pulse',
  name: 'Habilidade de facção',
  beats: [
    { kind: 'HIGHLIGHT', durationMs: 200 },
    { kind: 'ENERGY_BURST', durationMs: 420 },
  ],
};

/** Passiva puramente descritiva: a regra vive em `faction.rules`. */
function passive(params: {
  id: string;
  factionId: AbilityDefinition['factionId'];
  name: string;
  description: string;
  title: string;
}): AbilityDefinition {
  return {
    id: params.id,
    factionId: params.factionId,
    name: params.name,
    description: params.description,
    kind: 'PASSIVE',
    triggers: ['TURN_STARTED'],
    conditions: [{ type: 'IS_CURRENT_PLAYER' }],
    usage: { scope: 'PER_TURN', perTurn: 1 },
    // A regra contínua é aplicada pelo motor a partir de `faction.rules`.
    produceEffects: () => [],
    feedback: { title: params.title },
    provisional: true,
  };
}

// ---------------------------------------------------------------- HUMANOS
export const ENGENHARIA_TATICA_ID = 'ability.humanos.engenharia-tatica';
export const LOGISTICA_ADAPTATIVA_ID = 'ability.humanos.logistica-adaptativa';

export const ENGENHARIA_TATICA = passive({
  id: ENGENHARIA_TATICA_ID,
  factionId: HUMANOS_ID,
  name: 'Engenharia Tática',
  description:
    'Posições humanas são construídas para durar: territórios seus com 4 ou ' +
    'mais soldados fazem o atacante rolar 1 dado a menos.',
  title: 'ENGENHARIA TÁTICA',
});

/**
 * LOGÍSTICA ADAPTATIVA — habilidade ativa dos Humanos.
 * "Uma vez por turno, escolha um território seu: receba 2 tropas."
 */
export const LOGISTICA_ADAPTATIVA: AbilityDefinition = {
  id: LOGISTICA_ADAPTATIVA_ID,
  factionId: HUMANOS_ID,
  name: 'Logística Adaptativa',
  description: 'Uma vez por turno, escolha um território seu e receba 2 tropas nele.',
  kind: 'ACTIVE',
  triggers: ['ABILITY_ACTIVATED'],
  conditions: [{ type: 'IS_CURRENT_PLAYER' }, { type: 'NO_PENDING_OCCUPATION' }],
  usage: { scope: 'PER_TURN', perTurn: 1 },
  validateParams: (context) => {
    const territoryId = context.params?.territoryId as TerritoryId | undefined;
    if (!territoryId) return { ok: false, error: 'Escolha um território seu.' };
    const territory = context.state.territories[territoryId as string];
    if (!territory) return { ok: false, error: 'Território inexistente.' };
    if (territory.controllerId !== context.playerId) {
      return { ok: false, error: `${territory.name} não é seu.` };
    }
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => {
    const territoryId = context.params?.territoryId as TerritoryId;
    return [{ kind: 'ADD_TROOPS', territoryId, amount: 2, ownerId: context.playerId }];
  },
  feedback: { title: 'LOGÍSTICA ADAPTATIVA', detail: () => '+2 TROPAS' },
  animation: PULSE,
  provisional: true,
};

// ------------------------------------------------------------ ALIENÍGENAS
export const EVOLUCAO_BIOLOGICA_ID = 'ability.alienigenas.evolucao-biologica';
export const TELEPATIA_COLETIVA_ID = 'ability.alienigenas.telepatia-coletiva';

export const EVOLUCAO_BIOLOGICA = passive({
  id: EVOLUCAO_BIOLOGICA_ID,
  factionId: ALIENIGENAS_ID,
  name: 'Evolução Biológica',
  description: 'Suas unidades evoluem: ao conquistar um território, você ganha 1 soldado extra nele.',
  title: 'EVOLUÇÃO BIOLÓGICA',
});

/**
 * TELEPATIA COLETIVA — revela os exércitos em até 2 territórios adjacentes
 * ao alvo. Informação, não dano: não altera o tabuleiro.
 */
export const TELEPATIA_COLETIVA: AbilityDefinition = {
  id: TELEPATIA_COLETIVA_ID,
  factionId: ALIENIGENAS_ID,
  name: 'Telepatia Coletiva',
  description: 'Revele os exércitos em até 2 territórios adjacentes ao alvo escolhido.',
  kind: 'ACTIVE',
  triggers: ['ABILITY_ACTIVATED'],
  conditions: [{ type: 'IS_CURRENT_PLAYER' }],
  usage: { scope: 'PER_TURN', perTurn: 1 },
  validateParams: (context) => {
    const territoryId = context.params?.territoryId as TerritoryId | undefined;
    if (!territoryId) return { ok: false, error: 'Escolha um território alvo.' };
    if (!context.state.territories[territoryId as string]) {
      return { ok: false, error: 'Território inexistente.' };
    }
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => [
    { kind: 'REVEAL_INFO', playerId: context.playerId, scope: 'NEIGHBORS' },
  ],
  feedback: {
    title: 'TELEPATIA COLETIVA',
    detail: (context) => {
      const territoryId = context.params?.territoryId as TerritoryId | undefined;
      if (!territoryId) return '';
      const around = neighborsOf(context.state, territoryId)
        .slice(0, 2)
        .map((t) => `${t.name}: ${t.garrison.length}`);
      return around.join(' · ');
    },
  },
  animation: PULSE,
  provisional: true,
};

// ------------------------------------------------------------------ ZUMBIS
export const INFESTACAO_ID = 'ability.zumbis.infestacao';
export const CONTAMINACAO_ID = 'ability.zumbis.contaminacao';

export const INFESTACAO = passive({
  id: INFESTACAO_ID,
  factionId: ZUMBIS_ID,
  name: 'Infestação',
  description: 'Ao conquistar um território, receba +1 soldado adicional (máximo +3 por turno).',
  title: 'INFESTAÇÃO',
});

/**
 * CONTAMINAÇÃO — "no início do seu turno, escolha 1 território inimigo
 * adjacente: ele perde 1 soldado".
 */
export const CONTAMINACAO: AbilityDefinition = {
  id: CONTAMINACAO_ID,
  factionId: ZUMBIS_ID,
  name: 'Contaminação',
  description: 'Escolha 1 território inimigo adjacente a um território seu: ele perde 1 soldado.',
  kind: 'ACTIVE',
  triggers: ['ABILITY_ACTIVATED'],
  conditions: [{ type: 'IS_CURRENT_PLAYER' }, { type: 'PHASE_IS', phases: ['REFORCO'] }],
  usage: { scope: 'PER_TURN', perTurn: 1 },
  validateParams: (context) => {
    const territoryId = context.params?.territoryId as TerritoryId | undefined;
    if (!territoryId) return { ok: false, error: 'Escolha um território inimigo adjacente.' };
    const target = context.state.territories[territoryId as string];
    if (!target) return { ok: false, error: 'Território inexistente.' };
    if (!target.controllerId || target.controllerId === context.playerId) {
      return { ok: false, error: 'O alvo precisa ser inimigo.' };
    }
    const adjacent = territoriesOf(context.state, context.playerId).some((own) =>
      own.neighbors.includes(territoryId),
    );
    if (!adjacent) return { ok: false, error: 'O alvo precisa ser adjacente a um território seu.' };
    if (target.garrison.length <= BALANCE.territory.minGarrison) {
      return { ok: false, error: 'O alvo já está no mínimo de guarnição.' };
    }
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => [
    { kind: 'REMOVE_TROOPS', territoryId: context.params?.territoryId as TerritoryId, amount: 1 },
  ],
  feedback: { title: 'CONTAMINAÇÃO', detail: () => '−1 SOLDADO INIMIGO' },
  animation: PULSE,
  provisional: true,
};

// ---------------------------------------------------------------- VAMPIROS
export const REGENERACAO_ID = 'ability.vampiros.regeneracao';
export const ENXAME_NOTURNO_ID = 'ability.vampiros.enxame-noturno';

export const REGENERACAO = passive({
  id: REGENERACAO_ID,
  factionId: VAMPIROS_ID,
  name: 'Regeneração',
  description:
    'Ao final do seu turno, até 2 territórios seus que perderam soldados nesta ' +
    'rodada recuperam 1 soldado cada.',
  title: 'REGENERAÇÃO',
});

/**
 * ENXAME NOTURNO — drena o inimigo e alimenta o próprio exército.
 * Diferente da Contaminação: aqui o soldado perdido pelo inimigo vira ganho.
 */
export const ENXAME_NOTURNO: AbilityDefinition = {
  id: ENXAME_NOTURNO_ID,
  factionId: VAMPIROS_ID,
  name: 'Enxame Noturno',
  description:
    'Escolha um território inimigo adjacente: ele perde 1 soldado e você ganha 1 ' +
    'no seu território vizinho.',
  kind: 'ACTIVE',
  triggers: ['ABILITY_ACTIVATED'],
  conditions: [{ type: 'IS_CURRENT_PLAYER' }, { type: 'NO_PENDING_OCCUPATION' }],
  usage: { scope: 'PER_TURN', perTurn: 1 },
  validateParams: (context) => {
    const territoryId = context.params?.territoryId as TerritoryId | undefined;
    if (!territoryId) return { ok: false, error: 'Escolha um território inimigo adjacente.' };
    const target = context.state.territories[territoryId as string];
    if (!target) return { ok: false, error: 'Território inexistente.' };
    if (!target.controllerId || target.controllerId === context.playerId) {
      return { ok: false, error: 'O alvo precisa ser inimigo.' };
    }
    if (target.garrison.length <= BALANCE.territory.minGarrison) {
      return { ok: false, error: 'O alvo já está no mínimo de guarnição.' };
    }
    const source = territoriesOf(context.state, context.playerId).find((own) =>
      own.neighbors.includes(territoryId),
    );
    if (!source) return { ok: false, error: 'O alvo precisa ser adjacente a um território seu.' };
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => {
    const territoryId = context.params?.territoryId as TerritoryId;
    const source = territoriesOf(context.state, context.playerId).find((own) =>
      own.neighbors.includes(territoryId),
    )!;
    return [
      { kind: 'REMOVE_TROOPS', territoryId, amount: 1 },
      { kind: 'ADD_TROOPS', territoryId: source.id, amount: 1, ownerId: context.playerId },
    ];
  },
  feedback: { title: 'ENXAME NOTURNO', detail: () => '−1 INIMIGO · +1 SEU' },
  animation: PULSE,
  provisional: true,
};

// ------------------------------------------------------------------- MAGOS
export const CONHECIMENTO_ARCANO_ID = 'ability.magos.conhecimento-arcano';
export const TELETRANSPORTE_ARCANO_ID = 'ability.magos.teletransporte-arcano';

export const CONHECIMENTO_ARCANO = passive({
  id: CONHECIMENTO_ARCANO_ID,
  factionId: MAGOS_ID,
  name: 'Conhecimento Arcano',
  description: 'Você compra 1 carta adicional por turno.',
  title: 'CONHECIMENTO ARCANO',
});

/**
 * TELETRANSPORTE ARCANO — "move até 4 soldados entre territórios que você
 * controla, ignorando fronteiras".
 */
export const TELETRANSPORTE_ARCANO: AbilityDefinition = {
  id: TELETRANSPORTE_ARCANO_ID,
  factionId: MAGOS_ID,
  name: 'Teletransporte Arcano',
  description:
    'Mova até 4 soldados entre dois territórios que você controla, ignorando fronteiras.',
  kind: 'ACTIVE',
  triggers: ['ABILITY_ACTIVATED'],
  conditions: [
    { type: 'IS_CURRENT_PLAYER' },
    { type: 'PHASE_IS', phases: ['MOVIMENTACAO'] },
    { type: 'NO_PENDING_OCCUPATION' },
  ],
  usage: { scope: 'PER_TURN', perTurn: 1 },
  validateParams: (context) => {
    const from = context.params?.from as TerritoryId | undefined;
    const to = context.params?.to as TerritoryId | undefined;
    const amount = Number(context.params?.amount ?? 0);
    if (!from || !to) return { ok: false, error: 'Escolha origem e destino.' };
    if (from === to) return { ok: false, error: 'Origem e destino precisam ser diferentes.' };
    const origin = context.state.territories[from as string];
    const target = context.state.territories[to as string];
    if (!origin || !target) return { ok: false, error: 'Território inexistente.' };
    if (origin.controllerId !== context.playerId || target.controllerId !== context.playerId) {
      return { ok: false, error: 'Os dois territórios precisam ser seus.' };
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 4) {
      return { ok: false, error: 'Mova de 1 a 4 soldados.' };
    }
    if (origin.garrison.length - amount < BALANCE.territory.minGarrison) {
      return { ok: false, error: 'É obrigatório deixar ao menos 1 soldado na origem.' };
    }
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => [
    {
      kind: 'MOVE_TROOPS',
      from: context.params?.from as TerritoryId,
      to: context.params?.to as TerritoryId,
      amount: Number(context.params?.amount ?? 1),
      ignoreAdjacency: true,
      minLeftBehind: BALANCE.territory.minGarrison,
    },
  ],
  feedback: {
    title: 'TELETRANSPORTE ARCANO',
    detail: (context) => `${context.params?.amount ?? 0} SOLDADO(S)`,
  },
  animation: PULSE,
  provisional: true,
};

// ----------------------------------------------------------------- GOBLINS
export const SAQUE_RAPIDO_ID = 'ability.goblins.saque-rapido';
export const EMBOSCADA_ID = 'ability.goblins.emboscada';

export const SAQUE_RAPIDO = passive({
  id: SAQUE_RAPIDO_ID,
  factionId: GOBLINS_ID,
  name: 'Saque Rápido',
  description: 'Ao conquistar um território, compre 1 carta.',
  title: 'SAQUE RÁPIDO',
});

/**
 * EMBOSCADA — "antes do combate, posicione até 3 goblins ocultos no território
 * alvo". Traduzido para a mecânica existente: o território alvo é minado, e
 * quem atacá-lo perde soldados na primeira rodada.
 */
export const EMBOSCADA: AbilityDefinition = {
  id: EMBOSCADA_ID,
  factionId: GOBLINS_ID,
  name: 'Emboscada',
  description:
    'Prepare até 3 goblins ocultos em um território seu: quem o atacar rola 1 dado a menos ' +
    'até o seu próximo turno.',
  kind: 'ACTIVE',
  triggers: ['ABILITY_ACTIVATED'],
  conditions: [{ type: 'IS_CURRENT_PLAYER' }],
  usage: { scope: 'PER_TURN', perTurn: 1 },
  validateParams: (context) => {
    const territoryId = context.params?.territoryId as TerritoryId | undefined;
    if (!territoryId) return { ok: false, error: 'Escolha um território seu.' };
    const territory = context.state.territories[territoryId as string];
    if (!territory) return { ok: false, error: 'Território inexistente.' };
    if (territory.controllerId !== context.playerId) {
      return { ok: false, error: `${territory.name} não é seu.` };
    }
    return { ok: true };
  },
  produceEffects: (context): EffectDescriptor[] => [
    {
      kind: 'PROTECT_TERRITORY',
      territoryId: context.params?.territoryId as TerritoryId,
      turns: 1,
      ownerId: context.playerId,
      source: EMBOSCADA_ID,
      attackerDiceReduction: 1,
    },
  ],
  feedback: { title: 'EMBOSCADA', detail: () => 'ATACANTE COM 1 DADO A MENOS' },
  animation: PULSE,
  provisional: true,
};

// -------------------------------------------------------------- TECNÓLOGOS
export const PRODUCAO_EM_SERIE_ID = 'ability.tecnologos.producao-em-serie';

export const PRODUCAO_EM_SERIE = passive({
  id: PRODUCAO_EM_SERIE_ID,
  factionId: TECNOLOGOS_ID,
  name: 'Produção em Série',
  description: 'Suas fábricas produzem 1 tropa extra por turno em um território de fronteira.',
  title: 'PRODUÇÃO EM SÉRIE',
});

export const ROSTER_ABILITIES: AbilityDefinition[] = [
  ENGENHARIA_TATICA,
  LOGISTICA_ADAPTATIVA,
  EVOLUCAO_BIOLOGICA,
  TELEPATIA_COLETIVA,
  INFESTACAO,
  CONTAMINACAO,
  REGENERACAO,
  ENXAME_NOTURNO,
  CONHECIMENTO_ARCANO,
  TELETRANSPORTE_ARCANO,
  SAQUE_RAPIDO,
  EMBOSCADA,
  PRODUCAO_EM_SERIE,
];
