import { describe, expect, it } from 'vitest';
import { GameSession, redactFor } from '../../net/gameSession';
import { RoomService, MIN_ROOM_PLAYERS } from '../../net/roomService';
import { generateRoomCode, isValidRoomCode } from '../../net/protocol';
import { createGame, PLAYER_IDS } from '../engine/setup';
import { seededRng } from '../rng/rng';
import { validateState } from '../engine/invariants';
import { HUMANOS_ID } from '../factions/humanos';
import { ALIENIGENAS_ID, GOBLINS_ID, ZUMBIS_ID } from '../factions/roster';
import { MAP_IDS } from './helpers';
import { FACEDOWN_CARD_ID } from '../cards/facedown.card';

/**
 * MULTIPLAYER — autoridade, privacidade e sincronização.
 *
 * O objetivo destes testes é provar que o navegador NÃO decide regra:
 * quem valida, rola dados e distribui estado é a sessão autoritativa.
 */

function twoPlayerSession() {
  const state = createGame({
    gameId: 'net',
    createdAt: 0,
    playerCount: 2,
    deterministic: true,
    players: [{ factionId: HUMANOS_ID }, { factionId: ZUMBIS_ID }],
  });
  return new GameSession(state, seededRng(4242));
}

describe('Multiplayer — salas e lobby', () => {
  it('N01 · código de sala tem 6 caracteres sem ambiguidade visual', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[OI01]/);
    }
  });

  it('N02 · criar sala, entrar e chegar a PRONTO', () => {
    const rooms = new RoomService();
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    const joined = rooms.join(room.code, 'Bruno');
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;

    expect(rooms.canStart(room).ok).toBe(false); // ninguém escolheu facção
    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.pickFaction(room, joined.seat.seatId, ZUMBIS_ID);
    rooms.setReady(room, host.seatId, true);
    rooms.setReady(room, joined.seat.seatId, true);

    expect(rooms.canStart(room).ok).toBe(true);
    expect(rooms.lobbyView(room).players).toHaveLength(2);
    expect(rooms.lobbyView(room).players[0].isHost).toBe(true);
  });

  it('N03 · duas pessoas não escolhem a mesma facção', () => {
    const rooms = new RoomService();
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    const joined = rooms.join(room.code, 'Bruno');
    if (!joined.ok) throw new Error('join falhou');

    expect(rooms.pickFaction(room, host.seatId, GOBLINS_ID)).toBe(true);
    expect(rooms.pickFaction(room, joined.seat.seatId, GOBLINS_ID)).toBe(false);
    expect(rooms.pickFaction(room, joined.seat.seatId, ALIENIGENAS_ID)).toBe(true);
  });

  it('N04 · sala inexistente, cheia e já iniciada são recusadas com motivo', () => {
    const rooms = new RoomService();
    expect(rooms.join('ZZZZZZ', 'Ana')).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });

    const { room, seat: host } = rooms.createRoom('Ana', 2);
    const bruno = rooms.join(room.code, 'Bruno');
    if (!bruno.ok) throw new Error('join falhou');
    expect(rooms.join(room.code, 'Caio')).toEqual({ ok: false, error: 'ROOM_FULL' });

    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.pickFaction(room, bruno.seat.seatId, ZUMBIS_ID);
    rooms.setReady(room, host.seatId, true);
    rooms.setReady(room, bruno.seat.seatId, true);
    expect(rooms.start(room, host.seatId).ok).toBe(true);
    expect(rooms.join(room.code, 'Caio')).toEqual({ ok: false, error: 'ALREADY_STARTED' });
  });

  it('N05 · só o host inicia, e só com todos prontos', () => {
    const rooms = new RoomService();
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    const bruno = rooms.join(room.code, 'Bruno');
    if (!bruno.ok) throw new Error('join falhou');

    expect(rooms.start(room, bruno.seat.seatId).ok).toBe(false);
    expect(rooms.start(room, host.seatId).ok).toBe(false); // ninguém pronto

    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.pickFaction(room, bruno.seat.seatId, ZUMBIS_ID);
    rooms.setReady(room, host.seatId, true);
    rooms.setReady(room, bruno.seat.seatId, true);
    expect(rooms.start(room, host.seatId).ok).toBe(true);
    expect(room.session).not.toBeNull();
    expect(room.seats[0].playerId).toBe(PLAYER_IDS.p1);
    expect(room.seats[1].playerId).toBe(PLAYER_IDS.p2);
  });

  it('N06 · abaixo do mínimo de jogadores a partida não começa', () => {
    const rooms = new RoomService();
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.setReady(room, host.seatId, true);
    const check = rooms.canStart(room);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain(String(MIN_ROOM_PLAYERS));
  });
});

describe('Multiplayer — autoridade das regras', () => {
  it('N07 · ação fora do turno é recusada pelo servidor', () => {
    const session = twoPlayerSession();
    const fora = session.submit(PLAYER_IDS.p2, { type: 'ADVANCE_PHASE' });
    expect(fora.ok).toBe(false);
    expect(fora.error).toMatch(/vez/i);
  });

  it('N08 · ação de DEV vinda do cliente é recusada', () => {
    const session = twoPlayerSession();
    const hack = session.submit(PLAYER_IDS.p1, {
      type: 'DEV_WIN_ATTACK',
    } as never);
    expect(hack.ok).toBe(false);
    expect(hack.error).toMatch(/não permitida/i);
  });

  it('N09 · ataque inválido é recusado mesmo vindo do jogador da vez', () => {
    const session = twoPlayerSession();
    // Territórios não vizinhos: a regra recusa, o servidor também.
    const result = session.submit(PLAYER_IDS.p1, {
      type: 'DECLARE_ATTACK',
      from: MAP_IDS.complexoArtico,
      to: MAP_IDS.nucleoColapso,
    });
    expect(result.ok).toBe(false);
  });

  it('N10 · a revisão só cresce quando a ação é aceita', () => {
    const session = twoPlayerSession();
    const antes = session.getRevision();
    session.submit(PLAYER_IDS.p2, { type: 'ADVANCE_PHASE' }); // recusada
    expect(session.getRevision()).toBe(antes);
    session.submit(PLAYER_IDS.p1, { type: 'AUTO_REINFORCE' }); // aceita
    expect(session.getRevision()).toBe(antes + 1);
  });

  it('N11 · os dados são decididos pelo servidor e enviados iguais a todos', () => {
    const session = twoPlayerSession();
    session.submit(PLAYER_IDS.p1, { type: 'AUTO_REINFORCE' });
    session.submit(PLAYER_IDS.p1, { type: 'ADVANCE_PHASE' });

    const state = session.rawState();
    const mine = Object.values(state.territories).find(
      (t) =>
        t.controllerId === PLAYER_IDS.p1 &&
        t.garrison.length >= 2 &&
        t.neighbors.some((n) => state.territories[n as string]?.controllerId === PLAYER_IDS.p2),
    );
    expect(mine).toBeDefined();
    const target = mine!.neighbors.find(
      (n) => state.territories[n as string]?.controllerId === PLAYER_IDS.p2,
    )!;

    expect(session.submit(PLAYER_IDS.p1, { type: 'DECLARE_ATTACK', from: mine!.id, to: target }).ok)
      .toBe(true);
    const roll = session.submit(PLAYER_IDS.p1, { type: 'ROLL_BATTLE_ROUND' });
    expect(roll.ok).toBe(true);
    expect(roll.dice).toBeDefined();
    expect(roll.dice!.attackerDice.length).toBeGreaterThan(0);
    expect(roll.dice!.defenderDice.length).toBeGreaterThan(0);
    for (const value of [...roll.dice!.attackerDice, ...roll.dice!.defenderDice]) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
    // O snapshot dos DOIS jogadores carrega a mesma rodada oficial.
    const daVezA = session.snapshotFor(PLAYER_IDS.p1).state.pendingAttack?.rounds.at(-1);
    const daVezB = session.snapshotFor(PLAYER_IDS.p2).state.pendingAttack?.rounds.at(-1);
    expect(daVezA?.attackerDice).toEqual(roll.dice!.attackerDice);
    expect(daVezB?.attackerDice).toEqual(roll.dice!.attackerDice);
    expect(daVezA?.defenderDice).toEqual(daVezB?.defenderDice);
  });

  it('N12 · dois snapshots seguidos do mesmo estado são idênticos', () => {
    const session = twoPlayerSession();
    const a = JSON.stringify(session.snapshotFor(PLAYER_IDS.p1));
    const b = JSON.stringify(session.snapshotFor(PLAYER_IDS.p1));
    expect(a).toBe(b);
  });
});

describe('Multiplayer — informação privada', () => {
  it('N13 · a missão secreta do outro jogador não sai do servidor', () => {
    const session = twoPlayerSession();
    const raw = session.rawState();
    expect(Object.keys(raw.missions).length).toBeGreaterThanOrEqual(2);

    const paraP1 = session.snapshotFor(PLAYER_IDS.p1).state;
    expect(paraP1.missions[PLAYER_IDS.p1 as string]).toBeDefined();
    expect(paraP1.missions[PLAYER_IDS.p2 as string]).toBeUndefined();

    const paraP2 = session.snapshotFor(PLAYER_IDS.p2).state;
    expect(paraP2.missions[PLAYER_IDS.p2 as string]).toBeDefined();
    expect(paraP2.missions[PLAYER_IDS.p1 as string]).toBeUndefined();
  });

  it('N14 · a mão do adversário vira contagem, sem identidade de carta', () => {
    const session = twoPlayerSession();
    const raw = session.rawState();
    const cartasDoP2 = raw.players[PLAYER_IDS.p2 as string].handCardIds;
    expect(cartasDoP2.length).toBeGreaterThan(0);

    const paraP1 = session.snapshotFor(PLAYER_IDS.p1).state;
    const vistasPorP1 = paraP1.players[PLAYER_IDS.p2 as string].handCardIds;
    // A contagem é pública…
    expect(vistasPorP1).toHaveLength(cartasDoP2.length);
    // …mas nenhuma identidade real atravessa: cada carta vira uma CARTA VIRADA.
    const definicoesReais = cartasDoP2.map(
      (id) => raw.cards[id as string].definitionId as string,
    );
    for (const id of vistasPorP1) {
      expect(String(id)).toMatch(/^hidden:/);
      const virada = paraP1.cards[id as string];
      expect(virada).toBeDefined();
      expect(virada.definitionId).toBe(FACEDOWN_CARD_ID);
      expect(definicoesReais).not.toContain(virada.definitionId as string);
    }
    // E o id real da carta do adversário não aparece em lugar nenhum.
    for (const id of cartasDoP2) expect(paraP1.cards[id as string]).toBeUndefined();
    // A própria mão continua completa.
    for (const id of paraP1.players[PLAYER_IDS.p1 as string].handCardIds) {
      expect(paraP1.cards[id as string]).toBeDefined();
    }
  });

  it('N15 · a censura não altera o estado autoritativo', () => {
    const session = twoPlayerSession();
    const antes = JSON.stringify(session.rawState());
    redactFor(session.rawState(), PLAYER_IDS.p1);
    redactFor(session.rawState(), PLAYER_IDS.p2);
    expect(JSON.stringify(session.rawState())).toBe(antes);
  });

  it('N16 · a missão revelada (fim de partida) passa a ser pública', () => {
    const session = twoPlayerSession();
    const raw = session.rawState();
    raw.missions[PLAYER_IDS.p2 as string].revealed = true;
    const paraP1 = redactFor(raw, PLAYER_IDS.p1);
    expect(paraP1.missions[PLAYER_IDS.p2 as string]).toBeDefined();
  });
});

describe('Multiplayer — queda e reconexão', () => {
  it('N17 · antes de começar, quem cai libera o lugar', () => {
    const rooms = new RoomService();
    const { room } = rooms.createRoom('Ana', 6);
    const bruno = rooms.join(room.code, 'Bruno');
    if (!bruno.ok) throw new Error('join falhou');
    expect(room.seats).toHaveLength(2);
    rooms.markDisconnected(room, bruno.seat.seatId);
    expect(room.seats).toHaveLength(1);
  });

  it('N18 · com a partida rolando, a queda NÃO destrói a sala', () => {
    const rooms = new RoomService();
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    const bruno = rooms.join(room.code, 'Bruno');
    if (!bruno.ok) throw new Error('join falhou');
    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.pickFaction(room, bruno.seat.seatId, ZUMBIS_ID);
    rooms.setReady(room, host.seatId, true);
    rooms.setReady(room, bruno.seat.seatId, true);
    rooms.start(room, host.seatId);

    rooms.markDisconnected(room, bruno.seat.seatId);
    expect(room.seats).toHaveLength(2);
    expect(room.seats[1].connected).toBe(false);
    expect(rooms.lobbyView(room).players[1].connected).toBe(false);

    // Reconexão com o token devolve o MESMO assento, com a partida intacta.
    const back = rooms.join(room.code, 'Bruno', bruno.seat.resumeToken);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.resumed).toBe(true);
    expect(back.seat.seatId).toBe(bruno.seat.seatId);
    expect(back.seat.playerId).toBe(PLAYER_IDS.p2);
    expect(back.seat.connected).toBe(true);
  });

  it('N19 · ao voltar, o jogador recebe o estado atualizado', () => {
    const rooms = new RoomService();
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    const bruno = rooms.join(room.code, 'Bruno');
    if (!bruno.ok) throw new Error('join falhou');
    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.pickFaction(room, bruno.seat.seatId, ZUMBIS_ID);
    rooms.setReady(room, host.seatId, true);
    rooms.setReady(room, bruno.seat.seatId, true);
    rooms.start(room, host.seatId);

    const session = room.session!;
    const antes = session.getRevision();
    // A ordem de jogo é sorteada na preparação: age quem realmente é da vez.
    const daVez = session.rawState().turn.currentPlayerId;
    expect(session.submit(daVez, { type: 'AUTO_REINFORCE' }).ok).toBe(true);
    rooms.markDisconnected(room, bruno.seat.seatId);
    const back = rooms.join(room.code, 'Bruno', bruno.seat.resumeToken);
    if (!back.ok) throw new Error('reconexão falhou');

    const snapshot = session.snapshotFor(back.seat.playerId!);
    expect(snapshot.revision).toBeGreaterThan(antes);
    expect(validateState(snapshot.state)).toEqual([]);
  });

  it('N20 · a janela de reconexão é medida, não adivinhada', () => {
    let agora = 1_000_000;
    const rooms = new RoomService({ now: () => agora });
    const { room, seat: host } = rooms.createRoom('Ana', 6);
    const bruno = rooms.join(room.code, 'Bruno');
    if (!bruno.ok) throw new Error('join falhou');
    rooms.pickFaction(room, host.seatId, HUMANOS_ID);
    rooms.pickFaction(room, bruno.seat.seatId, ZUMBIS_ID);
    rooms.setReady(room, host.seatId, true);
    rooms.setReady(room, bruno.seat.seatId, true);
    rooms.start(room, host.seatId);

    rooms.markDisconnected(room, bruno.seat.seatId);
    expect(rooms.expiredSeats(room)).toHaveLength(0);
    agora += 121_000;
    expect(rooms.expiredSeats(room).map((s) => s.seatId)).toEqual([bruno.seat.seatId]);
    // A regra do que fazer com quem abandonou NÃO é inventada aqui:
    // a partida segue e o assento fica marcado para decisão do criador.
    expect(room.session).not.toBeNull();
  });
});
