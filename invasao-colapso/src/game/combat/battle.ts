import type { BattleRound, GameState, PendingAttack } from '../types/game.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import type { Rng } from '../rng/rng';
import { defaultRng } from '../rng/rng';
import { rollDie } from './dice';
import { BALANCE } from '../config/balance';
import { getTerritory } from '../map/territory';
import { soldiersInTerritory } from '../soldiers/soldier';
import { isLinkKind } from '../map/regions';
import { activeModifiersFor } from '../engine/modifiers';

/**
 * COMBATE OFICIAL — REGRAS APROVADAS PELO CRIADOR.
 *
 * Atacante: até 3 dados; precisa deixar ao menos 1 soldado na origem.
 *   2 tropas → 1 dado · 3 tropas → 2 dados · 4 ou mais → 3 dados.
 * Defensor: até 3 dados; não precisa deixar tropa fora da defesa.
 *   1 defensor → 1 dado · 2 → 2 dados · 3 ou mais → 3 dados.
 * Comparação: ordenar do maior para o menor, comparar par a par, só os
 *   pares existentes.
 * EMPATE = DEFENSOR VENCE. Cada comparação perdida elimina 1 soldado.
 *
 * Uma batalha pode ter várias rodadas contra o MESMO território e continua
 * sendo UM ÚNICO ataque.
 */

/** Dados do atacante a partir do total de tropas no território de origem. */
export function attackerDiceFor(troopsInOrigin: number, cap = BALANCE.dice.maxAttackDice): number {
  const usable = troopsInOrigin - BALANCE.territory.minGarrison;
  if (usable <= 0) return 0;
  return Math.max(0, Math.min(usable, cap, BALANCE.dice.maxAttackDice));
}

/** Dados do defensor a partir do total de defensores. */
export function defenderDiceFor(defenders: number, cap = BALANCE.dice.maxDefenseDice): number {
  if (defenders <= 0) return 0;
  return Math.max(0, Math.min(defenders, cap, BALANCE.dice.maxDefenseDice));
}

/**
 * Compara dois conjuntos de dados pela regra oficial.
 * Devolve as comparações e as perdas de cada lado.
 */
export function compareDice(
  attackerDice: number[],
  defenderDice: number[],
  options: { ignoreFirstDefenderLoss?: boolean } = {},
): Pick<BattleRound, 'comparisons' | 'attackerLosses' | 'defenderLosses'> {
  const a = [...attackerDice].sort((x, y) => y - x);
  const d = [...defenderDice].sort((x, y) => y - x);
  const pairs = Math.min(a.length, d.length);
  const comparisons: BattleRound['comparisons'] = [];
  let attackerLosses = 0;
  let defenderLosses = 0;
  let forgiven = false;

  for (let i = 0; i < pairs; i += 1) {
    // EMPATE = DEFENSOR VENCE: só o estritamente maior do atacante ganha.
    const attackerWins = a[i] > d[i];
    comparisons.push({
      attacker: a[i],
      defender: d[i],
      winner: attackerWins ? 'ATTACKER' : 'DEFENDER',
    });
    if (attackerWins) {
      if (options.ignoreFirstDefenderLoss && !forgiven) {
        forgiven = true; // Cepa Resistente: ignora a primeira comparação perdida.
        continue;
      }
      defenderLosses += 1;
    } else {
      attackerLosses += 1;
    }
  }

  return { comparisons, attackerLosses, defenderLosses };
}

/** Teto de dados do atacante nesta fronteira: um Poço limita a 2. */
export function attackerCapFor(state: GameState, from: TerritoryId, to: TerritoryId): number {
  let cap = BALANCE.dice.maxAttackDice;
  if (isLinkKind(from, to, 'POCO')) cap = Math.min(cap, BALANCE.dice.pocoAttackDice);
  for (const modifier of activeModifiersFor(state, to)) {
    if (modifier.attackerDiceReduction) cap -= modifier.attackerDiceReduction;
  }
  return Math.max(1, cap);
}

export interface BattlePlan {
  attackerTroops: number;
  defenderTroops: number;
  attackerDice: number;
  defenderDice: number;
  attackerCap: number;
}

/** Quantos dados cada lado rolaria agora. Usado pelo painel de batalha. */
export function planBattle(state: GameState, attack: PendingAttack): BattlePlan {
  const origin = getTerritory(state, attack.fromTerritoryId);
  const target = getTerritory(state, attack.toTerritoryId);
  const attackerTroops =
    attack.kind === 'SPECIAL'
      ? attack.attackingSoldierIds.filter((id) => state.soldiers[id as string]?.alive).length
      : origin.garrison.length;
  const defenderTroops = target.garrison.length;
  const attackerDice =
    attack.kind === 'SPECIAL'
      ? Math.max(0, Math.min(attackerTroops, attack.attackerDiceCap))
      : attackerDiceFor(attackerTroops, attack.attackerDiceCap);
  return {
    attackerTroops,
    defenderTroops,
    attackerDice,
    defenderDice: defenderDiceFor(defenderTroops, attack.defenderDiceCap),
    attackerCap: attack.attackerDiceCap,
  };
}

export interface BattleRoundOutcome {
  round: BattleRound;
  /** Soldados eliminados de cada lado (ids), para a animação. */
  attackerCasualties: string[];
  defenderCasualties: string[];
  defenderWiped: boolean;
  attackerExhausted: boolean;
}

/**
 * Rola UMA rodada de dados dentro da batalha em andamento.
 * Não conquista nem encerra: quem decide isso é o motor.
 */
export function rollBattleRound(
  draft: GameState,
  attack: PendingAttack,
  rng: Rng = defaultRng,
): BattleRoundOutcome {
  const plan = planBattle(draft, attack);
  if (plan.attackerDice <= 0) {
    throw new Error('O atacante não tem tropas suficientes para rolar dados.');
  }
  if (plan.defenderDice <= 0) {
    throw new Error('Não há defensores para rolar dados.');
  }

  const attackerDice = Array.from({ length: plan.attackerDice }, () => rollDie(6, rng).value);
  const defenderDice = Array.from({ length: plan.defenderDice }, () => rollDie(6, rng).value);

  // Relançamento do dado mais baixo (Moral Elevado / Terreno Conhecido).
  const pending = attack.rerolls ?? [];
  for (const side of [...pending]) {
    const dice = side === 'ATTACKER' ? attackerDice : defenderDice;
    if (dice.length === 0) continue;
    let lowest = 0;
    for (let i = 1; i < dice.length; i += 1) if (dice[i] < dice[lowest]) lowest = i;
    dice[lowest] = rollDie(6, rng).value;
    pending.splice(pending.indexOf(side), 1);
  }
  attack.rerolls = pending;

  const shielded = activeModifiersFor(draft, attack.toTerritoryId).some(
    (m) => m.ignoreFirstLossPerRound,
  );
  const compared = compareDice(attackerDice, defenderDice, {
    ignoreFirstDefenderLoss: shielded,
  });

  const round: BattleRound = {
    index: attack.rounds.length + 1,
    attackerDice,
    defenderDice,
    ...compared,
  };

  return {
    round,
    attackerCasualties: [],
    defenderCasualties: [],
    defenderWiped: false,
    attackerExhausted: false,
  };
}

/** Soldados atacantes ainda vivos e envolvidos na batalha. */
export function livingAttackers(state: GameState, attack: PendingAttack): string[] {
  return attack.attackingSoldierIds.filter((id) => state.soldiers[id as string]?.alive);
}

/** O atacante pode continuar rolando? */
export function canContinueBattle(state: GameState, attack: PendingAttack): boolean {
  const target = getTerritory(state, attack.toTerritoryId);
  if (target.garrison.length === 0) return false;
  const plan = planBattle(state, attack);
  return plan.attackerDice > 0;
}

/** Quem defende o território alvo neste instante. */
export function defenderOf(state: GameState, territoryId: TerritoryId): PlayerId | null {
  return getTerritory(state, territoryId).controllerId;
}

export function defendersCount(state: GameState, territoryId: TerritoryId): number {
  return soldiersInTerritory(state, territoryId).length;
}
