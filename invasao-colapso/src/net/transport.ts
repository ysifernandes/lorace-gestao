import type { ClientMessage, ServerMessage } from './protocol';

/**
 * TRANSPORTE EM TEMPO REAL — interface.
 *
 * A camada de rede não conhece WebSocket diretamente: fala com esta
 * interface. Assim os testes rodam com um transporte em memória e o jogo
 * roda com socket de verdade, sem mudar uma linha do cliente.
 */
export interface RealtimeTransport {
  connect(): Promise<void>;
  send(message: ClientMessage): void;
  onMessage(handler: (message: ServerMessage) => void): void;
  onStatus(handler: (status: TransportStatus) => void): void;
  close(): void;
  readonly status: TransportStatus;
}

export type TransportStatus = 'IDLE' | 'CONNECTING' | 'OPEN' | 'CLOSED' | 'ERROR';

/** Transporte por WebSocket, com reconexão automática em recuo exponencial. */
export class WebSocketTransport implements RealtimeTransport {
  private socket: WebSocket | null = null;
  private messageHandler: ((message: ServerMessage) => void) | null = null;
  private statusHandler: ((status: TransportStatus) => void) | null = null;
  private attempts = 0;
  private closedByUs = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  status: TransportStatus = 'IDLE';

  constructor(private readonly url: string) {}

  private setStatus(status: TransportStatus): void {
    this.status = status;
    this.statusHandler?.(status);
  }

  connect(): Promise<void> {
    this.closedByUs = false;
    this.setStatus('CONNECTING');
    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(this.url);
        this.socket = socket;

        socket.onopen = () => {
          this.attempts = 0;
          this.setStatus('OPEN');
          resolve();
        };
        socket.onmessage = (event) => {
          try {
            this.messageHandler?.(JSON.parse(String(event.data)) as ServerMessage);
          } catch {
            /* mensagem malformada: ignorada, não derruba a partida */
          }
        };
        socket.onerror = () => {
          if (this.status === 'CONNECTING') reject(new Error('Não foi possível conectar.'));
          this.setStatus('ERROR');
        };
        socket.onclose = () => {
          this.setStatus('CLOSED');
          if (!this.closedByUs) this.scheduleRetry();
        };
      } catch (error) {
        this.setStatus('ERROR');
        reject(error);
      }
    });
  }

  /** Recuo exponencial: 1s, 2s, 4s, 8s, teto de 10s. */
  private scheduleRetry(): void {
    this.attempts += 1;
    const delay = Math.min(10_000, 2 ** Math.min(this.attempts, 4) * 500);
    this.retryTimer = setTimeout(() => {
      this.connect().catch(() => {
        /* a próxima tentativa já está agendada pelo onclose */
      });
    }, delay);
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  onMessage(handler: (message: ServerMessage) => void): void {
    this.messageHandler = handler;
  }

  onStatus(handler: (status: TransportStatus) => void): void {
    this.statusHandler = handler;
  }

  close(): void {
    this.closedByUs = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
    this.setStatus('CLOSED');
  }
}
