import { describe, expect, it } from 'vitest';
import { DEFAULT_DICE_TIMING, planDiceRoll, plannedLosses } from '../../view/diceRoll';
import { compareDice } from '../combat/battle';
import { dice, garrison, jumpTo, must, mustFail, newGame, MAP_IDS, PLAYER_IDS } from './helpers';

/**
 * DADOS VISUAIS — a animação representa, nunca decide.
 *
 * Estes testes existem para impedir a regressão mais perigosa do jogo:
 * a apresentação divergir do resultado oficial do motor.
 */

const ORIGEM = MAP_IDS.complexoArtico;
const ALVO = MAP_IDS.portoFerro;

describe('Dados visuais — a animação representa o motor', () => {
  it('D01 · o plano termina exatamente nos valores recebidos', () => {
    const plan = planDiceRoll([6, 4, 2], [5, 4, 3]);
    expect(plan.attacker.map((d) => d.value)).toEqual([6, 4, 2]);
    expect(plan.defender.map((d) => d.value)).toEqual([5, 4, 3]);
  });

  it('D02 · a quantidade de dados desenhados é a quantidade rolada', () => {
    expect(planDiceRoll([6], [5, 4]).attacker).toHaveLength(1);
    expect(planDiceRoll([6], [5, 4]).defender).toHaveLength(2);
    expect(planDiceRoll([6, 3, 3], [2]).attacker).toHaveLength(3);
  });

  it('D03 · só compara os pares existentes', () => {
    expect(planDiceRoll([6, 4, 2], [5]).comparisons).toHaveLength(1);
    expect(planDiceRoll([6], [5, 4, 3]).comparisons).toHaveLength(1);
    expect(planDiceRoll([6, 4], [5, 4, 3]).comparisons).toHaveLength(2);
  });

  it('D04 · a comparação é do maior para o menor, e empate favorece o defensor', () => {
    const plan = planDiceRoll([2, 6, 4], [4, 5, 3]);
    expect(plan.comparisons.map((c) => [c.attacker, c.defender])).toEqual([
      [6, 5],
      [4, 4],
      [2, 3],
    ]);
    expect(plan.comparisons.map((c) => c.winner)).toEqual(['ATTACKER', 'DEFENDER', 'DEFENDER']);
    expect(plan.comparisons[1].tie).toBe(true);
  });

  it('D05 · as perdas do plano batem com as do motor, dado a dado', () => {
    const casos: [number[], number[]][] = [
      [[6, 4, 2], [5, 4, 3]],
      [[1, 1, 1], [6, 6, 6]],
      [[6, 6, 6], [1, 1, 1]],
      [[3, 3], [3, 3]],
      [[5], [5, 5, 5]],
      [[6, 2], [4]],
    ];
    for (const [atacante, defensor] of casos) {
      const doMotor = compareDice(atacante, defensor);
      const doPlano = plannedLosses(planDiceRoll(atacante, defensor));
      expect(doPlano).toEqual({
        attacker: doMotor.attackerLosses,
        defender: doMotor.defenderLosses,
      });
    }
  });

  it('D06 · a linha do tempo é coerente: entra, gira, para, compara, baixas', () => {
    const plan = planDiceRoll([6, 4, 2], [5, 4, 3]);
    for (const die of [...plan.attacker, ...plan.defender]) {
      expect(die.settleAtMs).toBeGreaterThan(die.enterDelayMs);
      expect(die.spinMs).toBeGreaterThanOrEqual(DEFAULT_DICE_TIMING.spinMs);
    }
    // Nenhuma comparação antes do último dado parar.
    for (const comparison of plan.comparisons) {
      expect(comparison.atMs).toBeGreaterThan(plan.allSettledAtMs);
    }
    // Baixas só depois da última comparação.
    const last = plan.comparisons[plan.comparisons.length - 1];
    expect(plan.casualtiesAtMs).toBeGreaterThan(last.atMs);
    expect(plan.totalMs).toBeGreaterThan(plan.casualtiesAtMs);
  });

  it('D07 · mesma semente e mesmos valores produzem a MESMA coreografia', () => {
    const a = planDiceRoll([6, 4, 2], [5, 4, 3], { seed: 42 });
    const b = planDiceRoll([6, 4, 2], [5, 4, 3], { seed: 42 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('D08 · o motor decide primeiro: o plano é montado a partir da rodada real', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: ORIGEM, amount: 6, ownerId: PLAYER_IDS.p1 });
    const defensoresAntes = garrison(state, ALVO);
    state = must(state, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 4, 2, 5, 4, 3) });

    const round = state.pendingAttack?.rounds.at(-1)!;
    expect(round.attackerDice).toEqual([6, 4, 2]);
    expect(round.defenderDice).toEqual([5, 4, 3]);

    // O plano é construído DEPOIS, a partir do que o motor já decidiu.
    const plan = planDiceRoll(round.attackerDice, round.defenderDice);
    expect(plannedLosses(plan)).toEqual({
      attacker: round.attackerLosses,
      defender: round.defenderLosses,
    });
    // E as baixas do motor já foram aplicadas ao mapa, uma única vez.
    expect(garrison(state, ALVO)).toBe(defensoresAntes - round.defenderLosses);
  });

  it('D09 · reentrada: não dá para avançar de fase com batalha em andamento', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: ORIGEM, amount: 6, ownerId: PLAYER_IDS.p1 });
    state = must(state, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO });
    expect(mustFail(state, { type: 'ADVANCE_PHASE' })).toMatch(/batalha|ataque/i);
  });

  it('D10 · reentrada: um segundo ataque no mesmo turno é recusado', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: ORIGEM, amount: 8, ownerId: PLAYER_IDS.p1 });
    state = must(state, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 4, 2, 5, 4, 3) });
    state = must(state, { type: 'CANCEL_ATTACK' });
    expect(
      mustFail(state, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO }),
    ).toMatch(/1 Ataque Comum por turno/);
  });

  it('D11 · as baixas de uma rodada são aplicadas uma única vez', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: ORIGEM, amount: 6, ownerId: PLAYER_IDS.p1 });
    const antes = garrison(state, ALVO);
    state = must(state, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 4, 2, 1, 1, 1) });
    const round = state.pendingAttack?.rounds.at(-1)!;
    expect(round.defenderLosses).toBe(3);
    expect(garrison(state, ALVO)).toBe(Math.max(0, antes - 3));
    // O registro guarda exatamente uma rodada — nada foi contado em dobro.
    expect(state.pendingAttack?.rounds ?? []).toHaveLength(1);
  });
});
