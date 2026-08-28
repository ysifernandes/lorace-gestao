import type { GameAction } from '../game/engine/actions';
import type { FactionId } from '../game/types/ids';
import type { RealtimeTransport, TransportStatus } from './transport';
import { PROTOCOL_VERSION } from './protocol';
import type {
  DiceBroadcast,
  GameSnapshot,
  LobbyView,
  RoomCode,
  SeatId,
  ServerMessage,
} from './protocol';

/**
 * CLIENTE MULTIJOGADOR.
 *
 * Fica FORA do React: os componentes assinam eventos. O cliente nunca
 * calcula regra — ele envia intenção e aplica o que a autoridade devolve.
 *
 * O snapshot só é aceito se a revisão for maior que a última vista: pacote
 * atrasado nunca faz o tabuleiro voltar no tempo.
 */

export interface MultiplayerEvents {
  lobby: (lobby: LobbyView) => void;
  snapshot: (snapshot: GameSnapshot) => void;
  dice: (dice: DiceBroadcast) => void;
  rejected: (reason: string) => void;
  error: (message: string) => void;
  status: (status: TransportStatus) => void;
  starting: (countdownMs: number) => void;
  playerLeft: (seatId: SeatId, reconnecting: boolean) => void;
}

const RESUME_KEY = 'invasao-colapso:resume:v1';

interface ResumeData {
  code: RoomCode;
  token: string;
  name: string;
}

export function readResume(): ResumeData | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumeData) : null;
  } catch {
    return null;
  }
}

export function clearResume(): void {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    /* armazenamento indisponível */
  }
}

function writeResume(data: ResumeData): void {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify(data));
  } catch {
    /* armazenamento indisponível */
  }
}

export class MultiplayerClient {
  private listeners: { [K in keyof MultiplayerEvents]: MultiplayerEvents[K][] } = {
    lobby: [],
    snapshot: [],
    dice: [],
    rejected: [],
    error: [],
    status: [],
    starting: [],
    playerLeft: [],
  };
  private lastRevision = -1;
  seatId: SeatId | null = null;
  roomCode: RoomCode | null = null;
  private name = 'Comandante';

  constructor(private readonly transport: RealtimeTransport) {
    transport.onMessage((message) => this.receive(message));
    transport.onStatus((status) => {
      this.emit('status', status);
      // Reconectou sozinho: reentra na sala com o token e pede o estado.
      if (status === 'OPEN' && this.roomCode) this.rejoin();
    });
  }

  on<K extends keyof MultiplayerEvents>(event: K, handler: MultiplayerEvents[K]): () => void {
    this.listeners[event].push(handler);
    return () => {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler) as never;
    };
  }

  private emit<K extends keyof MultiplayerEvents>(
    event: K,
    ...args: Parameters<MultiplayerEvents[K]>
  ): void {
    for (const handler of this.listeners[event]) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    this.transport.send({ type: 'HELLO', protocol: PROTOCOL_VERSION, name: this.name });
  }

  createRoom(name: string, maxPlayers: number): void {
    this.name = name;
    this.transport.send({ type: 'CREATE_ROOM', name, maxPlayers });
  }

  joinRoom(code: RoomCode, name: string): void {
    this.name = name;
    this.roomCode = code.toUpperCase();
    this.transport.send({ type: 'JOIN_ROOM', code: this.roomCode, name });
  }

  /** Reentra usando o token guardado — é isto que sobrevive ao F5. */
  rejoin(): void {
    const resume = readResume();
    if (!resume) return;
    this.roomCode = resume.code;
    this.name = resume.name;
    this.transport.send({
      type: 'JOIN_ROOM',
      code: resume.code,
      name: resume.name,
      resumeToken: resume.token,
    });
  }

  pickFaction(factionId: FactionId | null): void {
    this.transport.send({ type: 'PICK_FACTION', factionId });
  }

  setReady(ready: boolean): void {
    this.transport.send({ type: 'SET_READY', ready });
  }

  kick(seatId: SeatId): void {
    this.transport.send({ type: 'KICK', seatId });
  }

  startMatch(): void {
    this.transport.send({ type: 'START_MATCH' });
  }

  /** Envia a INTENÇÃO. Quem decide se vale é o servidor. */
  intent(action: GameAction): void {
    this.transport.send({ type: 'INTENT', action });
  }

  requestSnapshot(): void {
    this.transport.send({ type: 'REQUEST_SNAPSHOT' });
  }

  leave(): void {
    this.transport.send({ type: 'LEAVE' });
    clearResume();
    this.roomCode = null;
    this.seatId = null;
    this.lastRevision = -1;
  }

  close(): void {
    this.transport.close();
  }

  private receive(message: ServerMessage): void {
    switch (message.type) {
      case 'WELCOME':
        this.seatId = message.seatId;
        if (this.roomCode) {
          writeResume({ code: this.roomCode, token: message.resumeToken, name: this.name });
        }
        break;
      case 'ROOM':
        this.roomCode = message.lobby.code;
        writeResumeFromLobby(message.lobby, this.name);
        this.emit('lobby', message.lobby);
        break;
      case 'MATCH_STARTING':
        this.emit('starting', message.countdownMs);
        break;
      case 'SNAPSHOT':
        // Pacote atrasado nunca faz o tabuleiro voltar no tempo.
        if (message.snapshot.revision < this.lastRevision) return;
        this.lastRevision = message.snapshot.revision;
        this.emit('snapshot', message.snapshot);
        break;
      case 'DICE':
        this.emit('dice', message.dice);
        break;
      case 'REJECTED':
        this.emit('rejected', message.reason);
        break;
      case 'PLAYER_LEFT':
        this.emit('playerLeft', message.seatId, message.reconnecting);
        break;
      case 'ERROR':
        this.emit('error', message.message);
        break;
      default:
        break;
    }
  }
}

/** Mantém o código da sala no armazenamento mesmo quando o token não mudou. */
function writeResumeFromLobby(lobby: LobbyView, name: string): void {
  const current = readResume();
  if (!current) return;
  if (current.code === lobby.code && current.name === name) return;
  writeResume({ ...current, code: lobby.code, name });
}
