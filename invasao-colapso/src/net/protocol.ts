import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import type { FactionId, PlayerId } from '../game/types/ids';

/**
 * PROTOCOLO DO MULTIPLAYER.
 *
 * Princípio: o CLIENTE NÃO É A AUTORIDADE DAS REGRAS. Ele envia INTENÇÕES
 * ("quero atacar X a partir de Y") e recebe ESTADO. Nenhuma mensagem daqui
 * carrega resultado de dado, tropa ou vitória decidido pelo navegador.
 */

export const PROTOCOL_VERSION = 1;

export type RoomCode = string;
export type SeatId = string;

export interface LobbyPlayer {
  seatId: SeatId;
  name: string;
  factionId: FactionId | null;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  /** Latência medida no último ping, em ms. */
  pingMs: number | null;
}

export interface LobbyView {
  code: RoomCode;
  players: LobbyPlayer[];
  maxPlayers: number;
  started: boolean;
  hostSeatId: SeatId;
}

/**
 * Estado enviado a UM jogador específico.
 *
 * As missões dos OUTROS jogadores são removidas antes de sair do servidor:
 * o servidor sabe, o dono recebe, os demais não. O mesmo vale para a mão de
 * cartas alheia.
 */
export interface GameSnapshot {
  /** Número que só cresce; o cliente descarta snapshot antigo. */
  revision: number;
  state: GameState;
  /** Assento que este cliente controla. */
  youAre: PlayerId;
}

/** Coreografia de dados decidida pela autoridade e replicada a todos. */
export interface DiceBroadcast {
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  /** Semente da coreografia: todos animam igual. */
  seed: number;
  round: number;
}

// ------------------------------------------------------------ cliente → servidor
export type ClientMessage =
  | { type: 'HELLO'; protocol: number; name: string; resumeToken?: string }
  | { type: 'CREATE_ROOM'; name: string; maxPlayers: number }
  | { type: 'JOIN_ROOM'; code: RoomCode; name: string; resumeToken?: string }
  | { type: 'PICK_FACTION'; factionId: FactionId | null }
  | { type: 'SET_READY'; ready: boolean }
  | { type: 'KICK'; seatId: SeatId }
  | { type: 'START_MATCH' }
  | { type: 'INTENT'; action: GameAction }
  | { type: 'REQUEST_SNAPSHOT' }
  | { type: 'LEAVE' }
  | { type: 'PING'; sentAt: number };

// ------------------------------------------------------------ servidor → cliente
export type ServerMessage
  = { type: 'WELCOME'; seatId: SeatId; resumeToken: string; protocol: number }
  | { type: 'ROOM'; lobby: LobbyView }
  | { type: 'MATCH_STARTING'; countdownMs: number }
  | { type: 'SNAPSHOT'; snapshot: GameSnapshot }
  | { type: 'DICE'; dice: DiceBroadcast }
  | { type: 'REJECTED'; reason: string; action?: GameAction['type'] }
  | { type: 'PLAYER_LEFT'; seatId: SeatId; reconnecting: boolean }
  | { type: 'ERROR'; code: ServerErrorCode; message: string }
  | { type: 'PONG'; sentAt: number };

export type ServerErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_STARTED'
  | 'VERSION_MISMATCH'
  | 'NOT_HOST'
  | 'NOT_YOUR_TURN'
  | 'FACTION_TAKEN'
  | 'BAD_REQUEST';

export const SERVER_ERROR_TEXT: Record<ServerErrorCode, string> = {
  ROOM_NOT_FOUND: 'Sala não encontrada. Confira o código.',
  ROOM_FULL: 'A sala já está cheia.',
  ALREADY_STARTED: 'Esta partida já começou.',
  VERSION_MISMATCH: 'Sua versão do jogo é diferente da do host. Atualize a página.',
  NOT_HOST: 'Só o host pode fazer isso.',
  NOT_YOUR_TURN: 'Não é a sua vez.',
  FACTION_TAKEN: 'Outro jogador já escolheu essa facção.',
  BAD_REQUEST: 'Pedido inválido.',
};

/** Código de sala: 6 caracteres sem ambiguidade visual (sem O/0, I/1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(random: () => number = Math.random): RoomCode {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code.toUpperCase());
}
