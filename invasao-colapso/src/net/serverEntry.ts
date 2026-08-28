import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import { RoomService } from './roomService';
import type { Room, Seat } from './roomService';
import { PROTOCOL_VERSION, SERVER_ERROR_TEXT } from './protocol';
import type { ClientMessage, ServerErrorCode, ServerMessage } from './protocol';

/**
 * SERVIDOR AUTORITATIVO — INVASÃO: COLAPSO.
 *
 * Camada de transporte fina em volta de RoomService e GameSession. Toda
 * regra de jogo vive no motor compartilhado; aqui só entra e sai mensagem.
 *
 *   node dist-server/server.mjs        (porta 8787 por padrão)
 */

const PORT = Number(process.env.PORT ?? 8787);
const rooms = new RoomService();

interface Client {
  socket: WebSocket;
  seat: Seat | null;
  room: Room | null;
}

const clients = new Map<WebSocket, Client>();

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function fail(socket: WebSocket, code: ServerErrorCode): void {
  send(socket, { type: 'ERROR', code, message: SERVER_ERROR_TEXT[code] });
}

function clientsOf(room: Room): Client[] {
  return [...clients.values()].filter((c) => c.room?.code === room.code);
}

function broadcastLobby(room: Room): void {
  const lobby = rooms.lobbyView(room);
  for (const client of clientsOf(room)) send(client.socket, { type: 'ROOM', lobby });
}

/** Cada cliente recebe o SEU snapshot, já sem a informação privada alheia. */
function broadcastSnapshots(room: Room): void {
  if (!room.session) return;
  for (const client of clientsOf(room)) {
    if (!client.seat?.playerId) continue;
    send(client.socket, {
      type: 'SNAPSHOT',
      snapshot: room.session.snapshotFor(client.seat.playerId),
    });
  }
}

function handle(socket: WebSocket, message: ClientMessage): void {
  const client = clients.get(socket);
  if (!client) return;

  switch (message.type) {
    case 'HELLO': {
      if (message.protocol !== PROTOCOL_VERSION) return fail(socket, 'VERSION_MISMATCH');
      return;
    }

    case 'CREATE_ROOM': {
      const { room, seat } = rooms.createRoom(message.name, message.maxPlayers);
      client.room = room;
      client.seat = seat;
      send(socket, {
        type: 'WELCOME',
        seatId: seat.seatId,
        resumeToken: seat.resumeToken,
        protocol: PROTOCOL_VERSION,
      });
      broadcastLobby(room);
      return;
    }

    case 'JOIN_ROOM': {
      const result = rooms.join(message.code, message.name, message.resumeToken);
      if (!result.ok) return fail(socket, result.error);
      client.room = result.room;
      client.seat = result.seat;
      send(socket, {
        type: 'WELCOME',
        seatId: result.seat.seatId,
        resumeToken: result.seat.resumeToken,
        protocol: PROTOCOL_VERSION,
      });
      broadcastLobby(result.room);
      // Reconexão no meio da partida: manda o estado atual na hora.
      if (result.room.session && result.seat.playerId) {
        send(socket, {
          type: 'SNAPSHOT',
          snapshot: result.room.session.snapshotFor(result.seat.playerId),
        });
      }
      return;
    }

    case 'PICK_FACTION': {
      if (!client.room || !client.seat) return fail(socket, 'BAD_REQUEST');
      const ok = rooms.pickFaction(client.room, client.seat.seatId, message.factionId);
      if (!ok) return fail(socket, 'FACTION_TAKEN');
      broadcastLobby(client.room);
      return;
    }

    case 'SET_READY': {
      if (!client.room || !client.seat) return fail(socket, 'BAD_REQUEST');
      rooms.setReady(client.room, client.seat.seatId, message.ready);
      broadcastLobby(client.room);
      return;
    }

    case 'KICK': {
      if (!client.room || !client.seat) return fail(socket, 'BAD_REQUEST');
      if (!rooms.kick(client.room, client.seat.seatId, message.seatId)) {
        return fail(socket, 'NOT_HOST');
      }
      const kicked = clientsOf(client.room).find((c) => c.seat?.seatId === message.seatId);
      if (kicked) {
        kicked.room = null;
        kicked.seat = null;
        send(kicked.socket, { type: 'PLAYER_LEFT', seatId: message.seatId, reconnecting: false });
      }
      broadcastLobby(client.room);
      return;
    }

    case 'START_MATCH': {
      if (!client.room || !client.seat) return fail(socket, 'BAD_REQUEST');
      const started = rooms.start(client.room, client.seat.seatId);
      if (!started.ok) {
        return send(socket, { type: 'REJECTED', reason: started.error ?? 'Não foi possível iniciar.' });
      }
      for (const other of clientsOf(client.room)) {
        send(other.socket, { type: 'MATCH_STARTING', countdownMs: 3000 });
      }
      broadcastLobby(client.room);
      broadcastSnapshots(client.room);
      return;
    }

    case 'INTENT': {
      if (!client.room?.session || !client.seat?.playerId) return fail(socket, 'BAD_REQUEST');
      const result = client.room.session.submit(client.seat.playerId, message.action);
      if (!result.ok) {
        return send(socket, {
          type: 'REJECTED',
          reason: result.error ?? 'Ação recusada.',
          action: message.action.type,
        });
      }
      // Os dados saem ANTES do estado: todo mundo vê a mesma rolagem.
      if (result.dice) {
        for (const other of clientsOf(client.room)) {
          send(other.socket, { type: 'DICE', dice: result.dice });
        }
      }
      broadcastSnapshots(client.room);
      return;
    }

    case 'REQUEST_SNAPSHOT': {
      if (!client.room?.session || !client.seat?.playerId) return;
      send(socket, {
        type: 'SNAPSHOT',
        snapshot: client.room.session.snapshotFor(client.seat.playerId),
      });
      return;
    }

    case 'PING':
      return send(socket, { type: 'PONG', sentAt: message.sentAt });

    case 'LEAVE': {
      if (client.room && client.seat) {
        const room = client.room;
        rooms.markDisconnected(room, client.seat.seatId);
        broadcastLobby(room);
      }
      client.room = null;
      client.seat = null;
      return;
    }

    default:
      return fail(socket, 'BAD_REQUEST');
  }
}

const server = new WebSocketServer({ port: PORT });

server.on('connection', (socket: WebSocket) => {
  clients.set(socket, { socket, seat: null, room: null });

  socket.on('message', (raw: unknown) => {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      return fail(socket, 'BAD_REQUEST');
    }
    try {
      handle(socket, parsed);
    } catch (error) {
      send(socket, {
        type: 'ERROR',
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Erro no servidor.',
      });
    }
  });

  socket.on('close', () => {
    const client = clients.get(socket);
    if (client?.room && client.seat) {
      const room = client.room;
      const seatId = client.seat.seatId;
      const midMatch = room.session !== null;
      rooms.markDisconnected(room, seatId);
      for (const other of clientsOf(room)) {
        send(other.socket, { type: 'PLAYER_LEFT', seatId, reconnecting: midMatch });
      }
      broadcastLobby(room);
    }
    clients.delete(socket);
    rooms.dropEmptyRooms();
  });
});

// eslint-disable-next-line no-console
console.log(`[INVASÃO: COLAPSO] servidor autoritativo em ws://localhost:${PORT}`);
