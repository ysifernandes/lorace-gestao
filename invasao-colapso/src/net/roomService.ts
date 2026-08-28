import type { FactionId, PlayerId } from '../game/types/ids';
import { createGame, PLAYER_IDS } from '../game/engine/setup';
import { GameSession } from './gameSession';
import { generateRoomCode } from './protocol';
import type { LobbyPlayer, LobbyView, RoomCode, SeatId } from './protocol';

/**
 * SALAS E LOBBY — autoridade do servidor, sem socket.
 *
 * Guarda quem está na sala, quem escolheu qual facção e quem já está pronto.
 * Quando o host inicia, cria a `GameSession` que passa a mandar nas regras.
 */

export interface Seat {
  seatId: SeatId;
  resumeToken: string;
  name: string;
  factionId: FactionId | null;
  ready: boolean;
  connected: boolean;
  /** Assento do motor (player-1..player-6), atribuído ao iniciar. */
  playerId: PlayerId | null;
  /** Momento em que caiu, para a janela de reconexão. */
  disconnectedAt: number | null;
}

export interface Room {
  code: RoomCode;
  hostSeatId: SeatId;
  maxPlayers: number;
  seats: Seat[];
  session: GameSession | null;
  createdAt: number;
}

export const MAX_ROOM_PLAYERS = 6;
export const MIN_ROOM_PLAYERS = 2;
/** Janela de reconexão antes de considerar abandono. */
export const RECONNECT_WINDOW_MS = 120_000;

let seatCounter = 0;

function nextId(prefix: string): string {
  seatCounter += 1;
  return `${prefix}-${seatCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class RoomService {
  private rooms = new Map<RoomCode, Room>();
  private readonly now: () => number;
  private readonly random: () => number;

  constructor(options: { now?: () => number; random?: () => number } = {}) {
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }

  createRoom(hostName: string, maxPlayers: number): { room: Room; seat: Seat } {
    let code = generateRoomCode(this.random);
    while (this.rooms.has(code)) code = generateRoomCode(this.random);

    const seat = this.makeSeat(hostName);
    const room: Room = {
      code,
      hostSeatId: seat.seatId,
      maxPlayers: Math.max(MIN_ROOM_PLAYERS, Math.min(MAX_ROOM_PLAYERS, maxPlayers)),
      seats: [seat],
      session: null,
      createdAt: this.now(),
    };
    this.rooms.set(code, room);
    return { room, seat };
  }

  getRoom(code: RoomCode): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  listRooms(): Room[] {
    return [...this.rooms.values()];
  }

  private makeSeat(name: string): Seat {
    return {
      seatId: nextId('seat'),
      resumeToken: nextId('tok'),
      name: name.trim().slice(0, 24) || 'Comandante',
      factionId: null,
      ready: false,
      connected: true,
      playerId: null,
      disconnectedAt: null,
    };
  }

  /**
   * Entra na sala. Se `resumeToken` bater com um assento que caiu, RECONECTA
   * aquele assento em vez de criar um novo — inclusive com a partida rolando.
   */
  join(
    code: RoomCode,
    name: string,
    resumeToken?: string,
  ): { ok: true; room: Room; seat: Seat; resumed: boolean } | { ok: false; error: JoinError } {
    const room = this.getRoom(code);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };

    if (resumeToken) {
      const existing = room.seats.find((s) => s.resumeToken === resumeToken);
      if (existing) {
        existing.connected = true;
        existing.disconnectedAt = null;
        return { ok: true, room, seat: existing, resumed: true };
      }
    }

    if (room.session) return { ok: false, error: 'ALREADY_STARTED' };
    if (room.seats.length >= room.maxPlayers) return { ok: false, error: 'ROOM_FULL' };

    const seat = this.makeSeat(name);
    room.seats.push(seat);
    return { ok: true, room, seat, resumed: false };
  }

  pickFaction(room: Room, seatId: SeatId, factionId: FactionId | null): boolean {
    if (room.session) return false;
    // Facção única por partida: se outro assento já pegou, recusa.
    if (factionId && room.seats.some((s) => s.seatId !== seatId && s.factionId === factionId)) {
      return false;
    }
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (!seat) return false;
    seat.factionId = factionId;
    // Trocar de facção derruba o "pronto": ninguém fica pronto sem exército.
    if (!factionId) seat.ready = false;
    return true;
  }

  setReady(room: Room, seatId: SeatId, ready: boolean): boolean {
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (!seat || room.session) return false;
    if (ready && !seat.factionId) return false;
    seat.ready = ready;
    return true;
  }

  kick(room: Room, requesterId: SeatId, targetId: SeatId): boolean {
    if (room.session) return false; // depois de começar, ninguém é removido assim
    if (room.hostSeatId !== requesterId) return false;
    if (requesterId === targetId) return false;
    const index = room.seats.findIndex((s) => s.seatId === targetId);
    if (index < 0) return false;
    room.seats.splice(index, 1);
    return true;
  }

  canStart(room: Room): { ok: boolean; reason?: string } {
    if (room.session) return { ok: false, reason: 'A partida já começou.' };
    if (room.seats.length < MIN_ROOM_PLAYERS) {
      return { ok: false, reason: `São necessários ao menos ${MIN_ROOM_PLAYERS} jogadores.` };
    }
    if (!room.seats.every((s) => s.factionId)) {
      return { ok: false, reason: 'Todos precisam escolher um exército.' };
    }
    if (!room.seats.every((s) => s.ready)) {
      return { ok: false, reason: 'Nem todos estão prontos.' };
    }
    return { ok: true };
  }

  /** Inicia a partida: cria a sessão autoritativa e amarra assento ↔ jogador. */
  start(room: Room, requesterId: SeatId): { ok: boolean; error?: string } {
    if (room.hostSeatId !== requesterId) return { ok: false, error: 'Só o host inicia a partida.' };
    const check = this.canStart(room);
    if (!check.ok) return { ok: false, error: check.reason };

    const seats = [...room.seats];
    const state = createGame({
      playerCount: seats.length,
      players: seats.map((seat) => ({ factionId: seat.factionId!, name: seat.name })),
    });
    const order = [
      PLAYER_IDS.p1,
      PLAYER_IDS.p2,
      PLAYER_IDS.p3,
      PLAYER_IDS.p4,
      PLAYER_IDS.p5,
      PLAYER_IDS.p6,
    ];
    seats.forEach((seat, index) => {
      seat.playerId = order[index];
    });
    room.session = new GameSession(state);
    return { ok: true };
  }

  markDisconnected(room: Room, seatId: SeatId): void {
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (!seat) return;
    seat.connected = false;
    seat.disconnectedAt = this.now();
    // Antes de começar, quem sai libera o lugar. Depois, o assento é guardado
    // para a reconexão — a partida não é destruída por uma queda de conexão.
    if (!room.session) {
      room.seats = room.seats.filter((s) => s.seatId !== seatId);
      if (room.hostSeatId === seatId && room.seats.length > 0) {
        room.hostSeatId = room.seats[0].seatId;
      }
    }
  }

  /** Assentos cuja janela de reconexão expirou. Não decide regra de vitória. */
  expiredSeats(room: Room): Seat[] {
    const cutoff = this.now() - RECONNECT_WINDOW_MS;
    return room.seats.filter(
      (s) => !s.connected && s.disconnectedAt !== null && s.disconnectedAt < cutoff,
    );
  }

  dropEmptyRooms(): void {
    for (const [code, room] of this.rooms) {
      if (room.seats.length === 0) this.rooms.delete(code);
    }
  }

  lobbyView(room: Room): LobbyView {
    return {
      code: room.code,
      maxPlayers: room.maxPlayers,
      started: room.session !== null,
      hostSeatId: room.hostSeatId,
      players: room.seats.map(
        (seat): LobbyPlayer => ({
          seatId: seat.seatId,
          name: seat.name,
          factionId: seat.factionId,
          ready: seat.ready,
          connected: seat.connected,
          isHost: seat.seatId === room.hostSeatId,
          pingMs: null,
        }),
      ),
    };
  }
}

export type JoinError = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ALREADY_STARTED';
