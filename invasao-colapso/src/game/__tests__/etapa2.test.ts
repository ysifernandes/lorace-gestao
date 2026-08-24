import { describe, expect, it } from 'vitest';
import {
  PLAYER_IDS,
  TERRITORY_IDS,
  aliveCount,
  firstCardOf,
  garrison,
  goToPhase,
  must,
  mustFail,
  newGame,
  run,
} from './helpers';
import { validateState } from '../engine/invariants';
import {
  findAsymmetricEdges,
  isAdjacent,
  maxMovableFrom,
  validAttackTargets,
  validMoveTargets,
} from '../map/adjacency';
import { reserveSoldiers } from '../engine/selectors';
import { eliminateSoldier } from '../soldiers/soldier';
import { scriptedRng } from '../rng/rng';
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import { HUMANOS_ID } from '../factions/humanos';
import type { GameState } from '../types/game.types';
import type { SoldierId } from '../types/ids';

/** Ataque humano pronto para ser vencido (fase COMBATE, ataque declarado). */
function attackReady(amount = 4): GameState {
  let state = goToPhase(newGame(), 'COMBATE');
  state = must(state, {
    type: 'ADD_SOLDIERS',
    territoryId: TERRITORY_IDS.distritoCentral,
    amount: 6,
  });
  state = must(state, {
    type: 'DECLARE_ATTACK',
    from: TERRITORY_IDS.distritoCentral,
    to: TERRITORY_IDS.ruinasLeste,
    amount,
  });
  return state;
}

describe('ETAPA 2 — Mapa', () => {
  it('T01/T02 — o mapa carrega com os 12 territórios e coordenadas', () => {
    const state = newGame();
    expect(TERRITORY_SEEDS).toHaveLength(12);
    expect(Object.keys(state.territories)).toHaveLength(12);
    for (const seed of TERRITORY_SEEDS) {
      const territory = state.territories[seed.id as string];
      expect(territory).toBeDefined();
      expect(territory.name).toBe(seed.name);
      expect(territory.position).toEqual(seed.position);
      expect(territory.neighbors.length).toBeGreaterThan(0);
    }
  });

  it('T03 — a seleção enxerga alvos válidos de movimento e de ataque', () => {
    const state = newGame();
    const moveTargets = validMoveTargets(state, TERRITORY_IDS.distritoCentral).map((t) => t.id);
    const attackTargets = validAttackTargets(state, TERRITORY_IDS.distritoCentral).map((t) => t.id);
    expect(moveTargets).toContain(TERRITORY_IDS.zonaNorte);
    expect(moveTargets).toContain(TERRITORY_IDS.zonaSul);
    expect(attackTargets).toContain(TERRITORY_IDS.ruinasLeste);
    expect(attackTargets).toContain(TERRITORY_IDS.regiaoIndustrial);
    // Nenhum alvo aparece nas duas listas.
    expect(moveTargets.filter((id) => attackTargets.includes(id))).toEqual([]);
  });

  it('T04 — cada território mostra o controlador correto', () => {
    const state = newGame();
    expect(state.territories[TERRITORY_IDS.distritoCentral as string].controllerId)
      .toBe(PLAYER_IDS.p1);
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId)
      .toBe(PLAYER_IDS.p2);
    expect(state.players[PLAYER_IDS.p1 as string].territoryIds).toHaveLength(6);
    expect(state.players[PLAYER_IDS.p2 as string].territoryIds).toHaveLength(6);
  });

  it('T05 — a contagem de tropas por território bate com o registro de soldados', () => {
    const state = newGame();
    let sum = 0;
    for (const territory of Object.values(state.territories)) {
      const real = Object.values(state.soldiers).filter(
        (s) => s.alive && s.location.kind === 'TERRITORY' && s.location.territoryId === territory.id,
      ).length;
      expect(territory.garrison.length).toBe(real);
      expect(territory.garrison.length).toBe(3);
      sum += territory.garrison.length;
    }
    expect(sum).toBe(aliveCount(state));
  });
});

describe('ETAPA 2 — Adjacência', () => {
  it('T06 — território adjacente é permitido', () => {
    const state = newGame();
    expect(isAdjacent(state, TERRITORY_IDS.distritoCentral, TERRITORY_IDS.zonaNorte)).toBe(true);
    expect(isAdjacent(state, TERRITORY_IDS.distritoCentral, TERRITORY_IDS.ruinasLeste)).toBe(true);
  });

  it('T07 — território não adjacente é bloqueado nas duas direções', () => {
    const state = newGame();
    expect(isAdjacent(state, TERRITORY_IDS.setorMilitar, TERRITORY_IDS.fronteiraVermelha)).toBe(false);
    expect(isAdjacent(state, TERRITORY_IDS.portoAbandonado, TERRITORY_IDS.zonaContaminada)).toBe(false);
  });

  it('o grafo de fronteiras é simétrico (mapa bem declarado)', () => {
    expect(findAsymmetricEdges(newGame())).toEqual([]);
  });
});

describe('ETAPA 2 — Movimentação', () => {
  it('T08 — move 1 soldado entre territórios aliados adjacentes', () => {
    let state = goToPhase(newGame(), 'MOVIMENTACAO');
    const total = aliveCount(state);
    state = must(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.zonaSul,
      amount: 1,
    });
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(2);
    expect(garrison(state, TERRITORY_IDS.zonaSul)).toBe(4);
    expect(aliveCount(state)).toBe(total);
    expect(validateState(state)).toEqual([]);
  });

  it('T09 — move múltiplos soldados', () => {
    let state = goToPhase(newGame(), 'MOVIMENTACAO');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 5,
    });
    expect(maxMovableFrom(state, TERRITORY_IDS.distritoCentral)).toBe(7);
    state = must(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.zonaNorte,
      amount: 7,
    });
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(1);
    expect(garrison(state, TERRITORY_IDS.zonaNorte)).toBe(10);
  });

  it('T10 — impede mover todas as tropas (origem nunca fica vazia)', () => {
    const state = goToPhase(newGame(), 'MOVIMENTACAO');
    const error = mustFail(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.zonaNorte,
      amount: 3,
    });
    expect(error).toMatch(/máximo movível|ao menos 1/i);
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(3);
  });

  it('T11 — impede quantidade maior que a existente, zero e negativa', () => {
    const state = goToPhase(newGame(), 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaNorte,
        amount: 99,
      }),
    ).toMatch(/máximo movível/i);
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaNorte,
        amount: 0,
      }),
    ).toMatch(/inválida/i);
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaNorte,
        amount: -3,
      }),
    ).toMatch(/inválida/i);
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaNorte,
        amount: 1.5,
      }),
    ).toMatch(/inválida/i);
  });

  it('T12 — impede movimentar tropas de território inimigo', () => {
    const state = goToPhase(newGame(), 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.ruinasLeste,
        to: TERRITORY_IDS.regiaoIndustrial,
        amount: 1,
      }),
    ).toMatch(/suas próprias tropas/i);
  });

  it('T13 — impede movimentar para destino inimigo ou não adjacente', () => {
    const state = goToPhase(newGame(), 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.ruinasLeste,
        amount: 1,
      }),
    ).toMatch(/mesmo jogador/i);
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.setorMilitar,
        to: TERRITORY_IDS.zonaSul,
        amount: 1,
      }),
    ).toMatch(/não são vizinhos/i);
  });
});

describe('ETAPA 2 — Ataque', () => {
  it('T14/T15 — seleciona atacante e defensor inimigo adjacente', () => {
    const state = attackReady(4);
    expect(state.pendingAttack).not.toBeNull();
    expect(state.pendingAttack?.fromTerritoryId).toBe(TERRITORY_IDS.distritoCentral);
    expect(state.pendingAttack?.toTerritoryId).toBe(TERRITORY_IDS.ruinasLeste);
    expect(state.pendingAttack?.attackingSoldierIds).toHaveLength(4);
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].status).toBe('CONTESTED');
  });

  it('T16 — impede atacar território aliado', () => {
    const state = goToPhase(newGame(), 'COMBATE');
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaNorte,
        amount: 1,
      }),
    ).toMatch(/inimigo/i);
  });

  it('T17 — impede atacar território não adjacente', () => {
    const state = goToPhase(newGame(), 'COMBATE');
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.baseOcidental,
        to: TERRITORY_IDS.zonaContaminada,
        amount: 1,
      }),
    ).toMatch(/fronteira/i);
  });

  it('impede atacar deixando a origem vazia e impede ataque duplo', () => {
    let state = goToPhase(newGame(), 'COMBATE');
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.ruinasLeste,
        amount: 3,
      }),
    ).toMatch(/ao menos 1/i);
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
      amount: 2,
    });
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.regiaoIndustrial,
        amount: 1,
      }),
    ).toMatch(/já existe um ataque/i);
  });
});

describe('ETAPA 2 — Conquista e ocupação', () => {
  it('T18/T19 — elimina defensores e muda o controlador', () => {
    let state = attackReady(4);
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId).toBe(PLAYER_IDS.p2);
    state = must(state, { type: 'DEV_WIN_ATTACK' });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(0);
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId).toBe(PLAYER_IDS.p1);
    expect(state.players[PLAYER_IDS.p1 as string].territoryIds).toContain(TERRITORY_IDS.ruinasLeste);
    expect(state.players[PLAYER_IDS.p2 as string].territoryIds).not.toContain(TERRITORY_IDS.ruinasLeste);
  });

  it('T20 — exige ocupação antes de seguir o jogo', () => {
    const state = must(attackReady(4), { type: 'DEV_WIN_ATTACK' });
    expect(state.pendingOccupation).not.toBeNull();
    expect(state.pendingOccupation?.min).toBe(1);
    expect(mustFail(state, { type: 'ADVANCE_PHASE' })).toMatch(/ocupe o território/i);
    expect(mustFail(state, { type: 'END_TURN' })).toMatch(/ocupe o território/i);
    expect(mustFail(state, { type: 'OCCUPY_TERRITORY', amount: 0 })).toMatch(/não pode ficar vazio/i);
    expect(mustFail(state, { type: 'OCCUPY_TERRITORY', amount: -1 })).toMatch(/não pode ficar vazio/i);
  });

  it('T21 — transfere tropas para o território conquistado', () => {
    let state = must(attackReady(4), { type: 'DEV_WIN_ATTACK' });
    const originBefore = garrison(state, TERRITORY_IDS.distritoCentral);
    const total = aliveCount(state);
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 3 });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(3);
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(originBefore - 3);
    expect(aliveCount(state)).toBe(total);
    expect(state.pendingOccupation).toBeNull();
    expect(state.pendingAttack).toBeNull();
    expect(validateState(state)).toEqual([]);
    // Todas as tropas do território conquistado pertencem ao conquistador.
    for (const id of state.territories[TERRITORY_IDS.ruinasLeste as string].garrison) {
      expect(state.soldiers[id as string].ownerId).toBe(PLAYER_IDS.p1);
      expect(state.soldiers[id as string].factionId).toBe(HUMANOS_ID);
    }
  });

  it('T22 — garante mínimo de 1 tropa nos dois lados', () => {
    const state = must(attackReady(4), { type: 'DEV_WIN_ATTACK' });
    // Só as tropas que atacaram podem ocupar: 4 atacantes = máximo 4.
    const max = state.pendingOccupation?.max ?? 0;
    const originBefore = garrison(state, TERRITORY_IDS.distritoCentral);
    expect(max).toBe(4);
    expect(originBefore).toBeGreaterThan(max);
    expect(mustFail(state, { type: 'OCCUPY_TERRITORY', amount: max + 1 }))
      .toMatch(/máximo permitido/i);
    const occupied = must(state, { type: 'OCCUPY_TERRITORY', amount: max });
    expect(garrison(occupied, TERRITORY_IDS.distritoCentral)).toBe(originBefore - max);
    expect(garrison(occupied, TERRITORY_IDS.distritoCentral)).toBeGreaterThanOrEqual(1);
    expect(garrison(occupied, TERRITORY_IDS.ruinasLeste)).toBe(max);

    // E com exatamente 1 atacante sobrevivente, a origem ainda fica com 1.
    let tight = goToPhase(newGame(), 'COMBATE');
    tight = must(tight, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
      amount: 2,
    });
    tight = must(tight, { type: 'DEV_WIN_ATTACK' });
    tight = must(tight, { type: 'OCCUPY_TERRITORY', amount: 2 });
    expect(garrison(tight, TERRITORY_IDS.distritoCentral)).toBe(1);
    expect(garrison(tight, TERRITORY_IDS.ruinasLeste)).toBe(2);
  });

  it('ataque sem atacantes vivos não conquista nada', () => {
    let state = goToPhase(newGame(), 'COMBATE');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 3,
    });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
      amount: 2,
    });
    // Elimina os atacantes pela via oficial e confirma que a vitória é recusada.
    const wiped = structuredClone(state);
    for (const id of wiped.pendingAttack?.attackingSoldierIds ?? []) {
      eliminateSoldier(wiped, id);
    }
    expect(validateState(wiped)).toEqual([]);
    expect(mustFail(wiped, { type: 'DEV_WIN_ATTACK' })).toMatch(/atacantes foram eliminados/i);
  });
});

describe('ETAPA 2 — Integração das cartas com o mapa', () => {
  it('T23/T24/T25 — Sequestro captura pelo mapa, no máximo 7, e converte', () => {
    let state = goToPhase(newGame(), 'ACAO');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.ruinasLeste,
      amount: 6,
      ownerId: PLAYER_IDS.p2,
    });
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const garrisonIds = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison;

    // 8 é recusado.
    expect(
      mustFail(state, {
        type: 'PLAY_CARD',
        cardInstanceId: card,
        mode: 'PRIMARY',
        targetSoldierIds: garrisonIds.slice(0, 8),
      }),
    ).toMatch(/no máximo 7/i);

    // 7 é aceito e o mapa reflete imediatamente.
    const targets = garrisonIds.slice(0, 7);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(2);
    expect(reserveSoldiers(state, PLAYER_IDS.p1)).toHaveLength(7);
    for (const id of targets) {
      expect(state.soldiers[id as string].factionId).toBe(HUMANOS_ID);
    }
    expect(state.cards[card as string].state).toBe('CONSUMED');
  });

  it('T26 — redistribuição só aceita territórios do próprio jogador', () => {
    let state = goToPhase(newGame(), 'ACAO');
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 2);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(
      mustFail(state, {
        type: 'DISTRIBUTE_RESERVES',
        assignments: [{ territoryId: TERRITORY_IDS.regiaoIndustrial, amount: 2 }],
      }),
    ).toMatch(/não é controlado/i);
    state = must(state, {
      type: 'DISTRIBUTE_RESERVES',
      assignments: [
        { territoryId: TERRITORY_IDS.setorMilitar, amount: 1 },
        { territoryId: TERRITORY_IDS.portoAbandonado, amount: 1 },
      ],
    });
    expect(garrison(state, TERRITORY_IDS.setorMilitar)).toBe(4);
    expect(garrison(state, TERRITORY_IDS.portoAbandonado)).toBe(4);
    expect(reserveSoldiers(state, PLAYER_IDS.p1)).toHaveLength(0);
    expect(validateState(state)).toEqual([]);
  });

  it('T27/T28 — Vacina atualiza o mapa durante o ataque e consome a carta', () => {
    let state = newGame();
    state = must(state, { type: 'END_TURN' });
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.regiaoIndustrial,
      amount: 8,
    });
    state = goToPhase(state, 'COMBATE');
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.regiaoIndustrial,
      to: TERRITORY_IDS.zonaSul,
      amount: 5,
    });
    const before = garrison(state, TERRITORY_IDS.regiaoIndustrial);
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const result = run(
      state,
      { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' },
      { rng: scriptedRng([2 / 6]) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { diceValue: number; eliminatedCount: number };
    expect(data.diceValue).toBe(3);
    expect(data.eliminatedCount).toBe(3);
    // O mapa reflete a baixa imediatamente, no território de origem do ataque.
    expect(garrison(result.state, TERRITORY_IDS.regiaoIndustrial)).toBe(before - 3);
    expect(result.state.cards[card as string].state).toBe('CONSUMED');
    expect(validateState(result.state)).toEqual([]);
  });

  it('Vacina que elimina todos os atacantes encerra o ataque', () => {
    let state = newGame();
    state = must(state, { type: 'END_TURN' });
    state = goToPhase(state, 'COMBATE');
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.regiaoIndustrial,
      to: TERRITORY_IDS.zonaSul,
      amount: 2,
    });
    const result = run(
      state,
      {
        type: 'PLAY_CARD',
        cardInstanceId: firstCardOf(state, PLAYER_IDS.p1),
        mode: 'ALTERNATE',
      },
      { rng: scriptedRng([5 / 6]) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pendingAttack).toBeNull();
    expect(result.state.territories[TERRITORY_IDS.zonaSul as string].status).toBe('STABLE');
    expect(garrison(result.state, TERRITORY_IDS.regiaoIndustrial)).toBe(1);
  });
});

describe('ETAPA 2 — Painel DEV', () => {
  it('remove tropas sem deixar contagem negativa', () => {
    let state = newGame();
    state = must(state, {
      type: 'REMOVE_SOLDIERS',
      territoryId: TERRITORY_IDS.zonaNorte,
      amount: 99,
    });
    expect(garrison(state, TERRITORY_IDS.zonaNorte)).toBe(0);
    expect(mustFail(state, {
      type: 'REMOVE_SOLDIERS',
      territoryId: TERRITORY_IDS.zonaNorte,
      amount: 1,
    })).toMatch(/não possui tropas/i);
    expect(validateState(state)).toEqual([]);
  });

  it('troca o controlador de um território e as tropas o acompanham', () => {
    let state = newGame();
    state = must(state, {
      type: 'SET_CONTROLLER',
      territoryId: TERRITORY_IDS.ruinasLeste,
      playerId: PLAYER_IDS.p1,
    });
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId).toBe(PLAYER_IDS.p1);
    for (const id of state.territories[TERRITORY_IDS.ruinasLeste as string].garrison) {
      expect(state.soldiers[id as string].factionId).toBe(HUMANOS_ID);
    }
    expect(validateState(state)).toEqual([]);
  });

  it('troca o jogador atual, mas não no meio de um combate', () => {
    let state = newGame();
    state = must(state, { type: 'SET_CURRENT_PLAYER', playerId: PLAYER_IDS.p2 });
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p2);
    const attacking = must(attackReady(4), { type: 'DEV_WIN_ATTACK' });
    expect(mustFail(attacking, { type: 'SET_CURRENT_PLAYER', playerId: PLAYER_IDS.p2 }))
      .toMatch(/combate em andamento/i);
  });

  it('o Sequestro não sobrevive a um reset de partida', () => {
    let state = goToPhase(newGame(), 'ACAO');
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string]
      .garrison.slice(0, 1) as SoldierId[];
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    const fresh = must(state, { type: 'NEW_GAME' });
    expect(fresh.pendingDistribution).toBeNull();
    expect(fresh.animationQueue).toEqual([]);
    expect(aliveCount(fresh)).toBe(36);
  });
});
