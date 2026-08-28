import { describe, expect, it } from 'vitest';
import { createGame } from '../engine/setup';
import type { GameState } from '../types/game.types';
import type { FactionId, TerritoryId } from '../types/ids';
import { dice, garrison, jumpTo, must, mustFail, MAP_IDS, PLAYER_IDS } from './helpers';
import { HUMANOS_ID } from '../factions/humanos';
import {
  ALIENIGENAS_ID,
  GOBLINS_ID,
  MAGOS_ID,
  VAMPIROS_ID,
  ZUMBIS_ID,
  ROSTER,
} from '../factions/roster';
import { HUMANOS } from '../factions/humanos';
import { getFaction, playableFactions } from '../factions/faction.registry';
import { attackerCapFor } from '../combat/battle';
import { reinforcementBreakdown } from '../turns/turnMachine';
import { addTerritoryModifier } from '../engine/modifiers';
import { assertValid } from '../engine/invariants';

/**
 * REGRAS DAS SEIS FACÇÕES DA REFERÊNCIA OFICIAL.
 *
 * Cada passiva vive em `faction.rules` e é lida pelo motor — não há
 * `if (facção === X)` espalhado. Estes testes provam que o motor realmente
 * lê cada campo, e não apenas que o campo existe no registro.
 */

/** Partida determinística com a facção escolhida no assento 1. */
function gameWith(seat1: FactionId, seat2: FactionId = HUMANOS_ID): GameState {
  return createGame({
    gameId: 'test-faccoes',
    createdAt: 0,
    playerCount: 2,
    deterministic: true,
    players: [{ factionId: seat1 }, { factionId: seat2 }],
  });
}

/** Origem do jogador 1 e alvo inimigo adjacente, na distribuição determinística. */
const ORIGEM = MAP_IDS.complexoArtico;
const ALVO = MAP_IDS.portoFerro;

/** Leva a partida até a conquista de ALVO, sem ocupar ainda. */
function conquistar(state: GameState): GameState {
  let current = jumpTo(state, 'ATAQUE_COMUM');
  current = must(current, {
    type: 'ADD_SOLDIERS',
    territoryId: ORIGEM,
    amount: 8,
    ownerId: PLAYER_IDS.p1,
  });
  current = must(current, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO });
  current = must(current, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
  return current;
}

describe('Facções — passivas declarativas lidas pelo motor', () => {
  it('F01 · o roster oficial tem as seis facções na ordem do criador', () => {
    const oficiais = [HUMANOS, ...ROSTER].map((f) => f.name);
    expect(oficiais).toEqual([
      'Humanos',
      'Alienígenas',
      'Zumbis',
      'Vampiros',
      'Magos',
      'Goblins',
    ]);
  });

  it('F02 · cada facção tem cor exclusiva e os Goblins NÃO usam verde', () => {
    const cores = [HUMANOS, ...ROSTER].map((f) => f.color.toUpperCase());
    expect(new Set(cores).size).toBe(cores.length);

    const goblins = getFaction(GOBLINS_ID);
    const zumbis = getFaction(ZUMBIS_ID);
    expect(goblins.color.toUpperCase()).not.toBe(zumbis.color.toUpperCase());

    // Verde = canal G dominante. A cor de equipe dos Goblins é amarela.
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const [gr, gg, gb] = rgb(goblins.color);
    expect(gg).toBeGreaterThan(0); // amarelo tem verde na mistura…
    expect(gr).toBeGreaterThanOrEqual(gg - 20); // …mas o vermelho acompanha
    expect(gb).toBeLessThan(gg); // e o azul é baixo → amarelo, não verde
    const [, zg, zb] = rgb(zumbis.color);
    expect(zg - zb).toBeGreaterThan(80); // o verde dos Zumbis é inequívoco
  });

  it('F03 · Alienígenas: mutação dá 1 soldado extra na conquista', () => {
    let state = conquistar(gameWith(ALIENIGENAS_ID));
    // A mutação nasce no momento da conquista, antes da ocupação.
    expect(garrison(state, ALVO)).toBe(1);
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 2 });
    // 2 ocupantes + 1 de mutação.
    expect(garrison(state, ALVO)).toBe(3);
    expect(state.log.some((l) => l.message.includes('Evolução Biológica'))).toBe(true);
  });

  it('F04 · Zumbis: conversão respeita o teto por turno', () => {
    let state = conquistar(gameWith(ZUMBIS_ID));
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 2 });
    expect(state.turn.conversionsThisTurn).toBe(1);
    expect(getFaction(ZUMBIS_ID).rules.conquestConversionPerTurn).toBe(3);
    expect(state.log.some((l) => l.message.includes('Infestação'))).toBe(true);
  });

  it('F05 · Goblins: Saque Rápido compra 1 carta ao conquistar', () => {
    const base = gameWith(GOBLINS_ID);
    const antes = base.players[PLAYER_IDS.p1 as string].handCardIds.length;
    const state = conquistar(base);
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds.length).toBe(antes + 1);
    expect(state.log.some((l) => l.message.includes('Saque Rápido'))).toBe(true);
  });

  it('F06 · Magos: Conhecimento Arcano permite 2 compras no mesmo turno', () => {
    let state = conquistar(gameWith(MAGOS_ID));
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 2 });
    while (state.turn.phase !== 'CARTAS') state = must(state, { type: 'ADVANCE_PHASE' });
    const antes = state.players[PLAYER_IDS.p1 as string].handCardIds.length;
    state = must(state, { type: 'DRAW_CARD' });
    state = must(state, { type: 'DRAW_CARD' });
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds.length).toBe(antes + 2);
    expect(mustFail(state, { type: 'DRAW_CARD' })).toMatch(/máximo de cartas/);
  });

  it('F07 · Humanos: NÃO herdam a compra extra dos Magos', () => {
    let state = conquistar(gameWith(HUMANOS_ID));
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 2 });
    while (state.turn.phase !== 'CARTAS') state = must(state, { type: 'ADVANCE_PHASE' });
    state = must(state, { type: 'DRAW_CARD' });
    expect(mustFail(state, { type: 'DRAW_CARD' })).toMatch(/máximo de cartas/);
  });

  it('F08 · Vampiros: Regeneração repõe 1 soldado nos territórios feridos', () => {
    let state = jumpTo(gameWith(VAMPIROS_ID), 'MOVIMENTACAO');
    // Fere dois territórios (2 soldados, abaixo do limiar de "ferido").
    const draft = structuredClone(state);
    const meus = Object.values(draft.territories).filter(
      (t) => t.controllerId === PLAYER_IDS.p1 && t.garrison.length === 3,
    );
    const alvo = meus[0];
    const vizinho = meus[1];
    for (const territory of [alvo, vizinho]) {
      const baixa = territory.garrison.pop()!;
      draft.soldiers[baixa as string].alive = false;
      draft.soldiers[baixa as string].location = { kind: 'ELIMINATED' };
    }
    assertValid(draft, 'territórios feridos');
    state = draft;
    const antes = garrison(state, alvo.id) + garrison(state, vizinho.id);
    expect(antes).toBe(4);
    state = must(state, { type: 'END_TURN' });
    expect(garrison(state, alvo.id) + garrison(state, vizinho.id)).toBe(antes + 2);
    expect(state.log.some((l) => l.message.includes('Regeneração'))).toBe(true);
  });

  it('F09 · Vampiros: não recebem bônus de Ponto de Interesse', () => {
    const vampiros = gameWith(VAMPIROS_ID);
    const humanos = gameWith(HUMANOS_ID);
    // Entrega o mesmo Ponto de Interesse de reforço aos dois assentos 1.
    const poi = MAP_IDS.capitalContinental;
    const entregar = (state: GameState): GameState => {
      const draft = structuredClone(state);
      const territory = draft.territories[poi as string];
      const anterior = territory.controllerId!;
      draft.players[anterior as string].territoryIds = draft.players[
        anterior as string
      ].territoryIds.filter((id) => id !== poi);
      territory.controllerId = PLAYER_IDS.p1;
      draft.players[PLAYER_IDS.p1 as string].territoryIds.push(poi as TerritoryId);
      for (const soldierId of territory.garrison) {
        draft.soldiers[soldierId as string].ownerId = PLAYER_IDS.p1;
        draft.soldiers[soldierId as string].factionId =
          draft.players[PLAYER_IDS.p1 as string].factionId;
      }
      assertValid(draft, 'entrega de POI');
      return draft;
    };
    expect(reinforcementBreakdown(entregar(humanos), PLAYER_IDS.p1).poiBonus).toBe(1);
    expect(reinforcementBreakdown(entregar(vampiros), PLAYER_IDS.p1).poiBonus).toBe(0);
  });

  it('F10 · Humanos: Engenharia Tática tira 1 dado de quem ataca posição fortificada', () => {
    // Assento 2 é Humanos; ALVO é dele.
    let state = jumpTo(gameWith(ALIENIGENAS_ID, HUMANOS_ID), 'ATAQUE_COMUM');
    expect(attackerCapFor(state, ORIGEM, ALVO)).toBe(3);
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: ALVO,
      amount: 1,
      ownerId: PLAYER_IDS.p2,
    });
    expect(garrison(state, ALVO)).toBe(4);
    expect(attackerCapFor(state, ORIGEM, ALVO)).toBe(2);
  });

  it('F11 · Armadilha Explosiva: quem conquista o território minado perde soldados', () => {
    let state = jumpTo(gameWith(ALIENIGENAS_ID), 'ATAQUE_COMUM');
    const draft = structuredClone(state);
    addTerritoryModifier(draft, {
      territoryId: ALVO,
      ownerId: PLAYER_IDS.p2,
      untilRound: draft.turn.number + 3,
      trapDamage: 2,
      source: 'card.armadilha-explosiva',
    });
    state = draft;
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: ORIGEM,
      amount: 8,
      ownerId: PLAYER_IDS.p1,
    });
    state = must(state, { type: 'DECLARE_ATTACK', from: ORIGEM, to: ALVO });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 3 });
    // 3 ocupantes + 1 de mutação − 2 da armadilha.
    expect(garrison(state, ALVO)).toBe(2);
    expect(state.log.some((l) => l.message.includes('Armadilha'))).toBe(true);
  });

  it('F12 · Tecnólogos existem, mas fora do roster oficial', () => {
    const tecnologos = playableFactions().find((f) => f.name === 'Tecnólogos');
    expect(tecnologos).toBeDefined();
    expect(tecnologos?.status).toBe('TEST_ONLY');
    expect([HUMANOS, ...ROSTER].map((f) => f.name)).not.toContain('Tecnólogos');
  });
});
