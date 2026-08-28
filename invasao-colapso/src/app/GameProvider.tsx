import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import { applyAction, forcedDiceRng } from '../game/engine/gameEngine';
import { createGame } from '../game/engine/setup';
import type { NewGameOptions } from '../game/engine/setup';
import { GameRepository } from '../game/persistence/gameRepository';
import {
  advanceTutorial,
  skipTutorial,
  startTutorial,
  stepSatisfied,
  tutorialStepAt,
} from '../game/tutorial';
import type { TutorialSession, TutorialStep } from '../game/tutorial';
import { MultiplayerClient, readResume } from '../net/multiplayerClient';
import { WebSocketTransport } from '../net/transport';
import type { TransportStatus } from '../net/transport';
import type { DiceBroadcast, LobbyView } from '../net/protocol';
import type { FactionId, PlayerId } from '../game/types/ids';
import { audio } from '../view/audio/audioBus';

export type Screen = 'HOME' | 'SETUP' | 'GAME' | 'ONLINE' | 'LOBBY' | 'HOWTO';
export type GameMode = 'LOCAL' | 'TUTORIAL' | 'ONLINE';

export interface GameContextValue {
  state: GameState;
  screen: Screen;
  mode: GameMode;
  /** Assento que ESTA tela controla. No local, é sempre o jogador da vez. */
  viewerId: PlayerId;
  /** true quando esta tela pode agir agora. */
  canAct: boolean;
  goHome: () => void;
  goSetup: () => void;
  goOnline: () => void;
  goHowTo: () => void;
  startGame: (options: NewGameOptions) => void;
  startTutorialGame: () => void;
  continueGame: () => void;
  dispatch: (action: GameAction) => boolean;
  lastResult: unknown;
  error: string | null;
  notice: string | null;
  clearError: () => void;
  saveAvailable: boolean;
  forcedDice: number[] | null;
  setForcedDice: (values: number[] | null) => void;

  tutorial: TutorialSession | null;
  tutorialStep: TutorialStep | null;
  tutorialReady: boolean;
  advanceTutorialStep: () => void;
  endTutorial: () => void;

  net: MultiplayerClient | null;
  lobby: LobbyView | null;
  netStatus: TransportStatus;
  lastDice: DiceBroadcast | null;
  connectOnline: () => Promise<MultiplayerClient>;
  createRoom: (name: string, maxPlayers: number) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  pickFaction: (factionId: FactionId | null) => void;
  setReady: (ready: boolean) => void;
  startOnlineMatch: () => void;
  leaveRoom: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

const repository = new GameRepository();
const SCREEN_KEY = 'invasao-colapso:screen:v2';
const TUTORIAL_DONE_KEY = 'invasao-colapso:tutorial-done:v1';

/** Endereço do servidor: mesma máquina por padrão, sobreponível por ?server=. */
function serverUrl(): string {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('server');
    if (fromQuery) return fromQuery;
    const host = window.location.hostname || 'localhost';
    return `ws://${host}:8787`;
  } catch {
    return 'ws://localhost:8787';
  }
}

function readScreen(): Screen {
  try {
    return localStorage.getItem(SCREEN_KEY) === 'GAME' ? 'GAME' : 'HOME';
  } catch {
    return 'HOME';
  }
}

function writeScreen(screen: Screen): void {
  try {
    localStorage.setItem(SCREEN_KEY, screen);
  } catch {
    /* armazenamento indisponível */
  }
}

export function tutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markTutorialCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_DONE_KEY, '1');
  } catch {
    /* armazenamento indisponível */
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(() => repository.load(), []);
  const [state, setState] = useState<GameState>(() => saved ?? createGame({ playerCount: 4 }));
  const [screen, setScreen] = useState<Screen>(() => (saved ? readScreen() : 'HOME'));
  const [mode, setMode] = useState<GameMode>('LOCAL');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [forcedDice, setForcedDice] = useState<number[] | null>(null);
  const [tutorial, setTutorial] = useState<TutorialSession | null>(null);
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [netStatus, setNetStatus] = useState<TransportStatus>('IDLE');
  const [lastDice, setLastDice] = useState<DiceBroadcast | null>(null);
  const [onlineSeat, setOnlineSeat] = useState<PlayerId | null>(null);
  const netRef = useRef<MultiplayerClient | null>(null);
  const errorTimer = useRef<number | undefined>(undefined);
  const noticeTimer = useRef<number | undefined>(undefined);

  // Persistência local. A partida online é autoritativa no servidor: o que
  // sobrevive ao F5 lá é o token de reconexão, não o estado.
  useEffect(() => {
    if (screen === 'GAME' && mode === 'LOCAL') repository.save(state);
  }, [state, screen, mode]);

  useEffect(() => {
    writeScreen(screen);
  }, [screen]);

  // O navegador só deixa tocar som depois de um gesto do usuário. Destrava
  // no primeiro toque/tecla e nunca mais precisa disso.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(errorTimer.current);
      window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const publishError = useCallback((message: string) => {
    setError(message);
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 4200);
  }, []);

  const publishNotice = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  }, []);

  /**
   * ONLINE: `dispatch` NÃO aplica regra — manda a intenção e espera o
   * snapshot da autoridade. LOCAL e TUTORIAL: roda o motor aqui mesmo.
   */
  const dispatch = useCallback(
    (action: GameAction) => {
      if (mode === 'ONLINE') {
        netRef.current?.intent(action);
        return true;
      }
      let ok = false;
      setState((current) => {
        const result = applyAction(current, action, {
          rng: forcedDice ? forcedDiceRng(forcedDice) : undefined,
        });
        if (!result.ok) {
          publishError(result.error);
          return current;
        }
        ok = true;
        setLastResult(result.data ?? null);
        if (result.info) publishNotice(result.info);
        return result.state;
      });
      return ok;
    },
    [mode, forcedDice, publishError, publishNotice],
  );

  const startGame = useCallback((options: NewGameOptions) => {
    const fresh = createGame(options);
    setMode('LOCAL');
    setTutorial(null);
    setState(fresh);
    repository.save(fresh);
    setScreen('GAME');
  }, []);

  const startTutorialGame = useCallback(() => {
    const { state: fresh, session } = startTutorial();
    setMode('TUTORIAL');
    setState(fresh);
    setTutorial(session);
    setScreen('GAME');
  }, []);

  const continueGame = useCallback(() => {
    const loaded = repository.load();
    if (!loaded) {
      publishError('Não há partida salva.');
      return;
    }
    setMode('LOCAL');
    setTutorial(null);
    setState(loaded);
    setScreen('GAME');
  }, [publishError]);

  const tutorialStep = tutorial ? tutorialStepAt(tutorial.stepIndex) : null;
  const tutorialReady = tutorial ? stepSatisfied(tutorial, state) : false;

  const advanceTutorialStep = useCallback(() => {
    if (!tutorial) return;
    const next = advanceTutorial(tutorial, state);
    if (next.state !== state) setState(next.state);
    if (next.session.finished) markTutorialCompleted();
    setTutorial(next.session);
  }, [tutorial, state]);

  const endTutorial = useCallback(() => {
    setTutorial((session) => (session ? skipTutorial(session) : session));
    markTutorialCompleted();
    setMode('LOCAL');
    setScreen('HOME');
  }, []);

  const connectOnline = useCallback(async () => {
    if (netRef.current) return netRef.current;
    const client = new MultiplayerClient(new WebSocketTransport(serverUrl()));
    client.on('status', setNetStatus);
    client.on('lobby', setLobby);
    client.on('dice', setLastDice);
    client.on('rejected', publishError);
    client.on('error', publishError);
    client.on('snapshot', (snapshot) => {
      setState(snapshot.state);
      setOnlineSeat(snapshot.youAre);
      setMode('ONLINE');
      setScreen('GAME');
    });
    client.on('starting', () => publishNotice('A invasão vai começar…'));
    client.on('playerLeft', (_seatId, reconnecting) => {
      publishNotice(reconnecting ? 'Jogador reconectando…' : 'Um jogador saiu da sala.');
    });
    netRef.current = client;
    await client.connect();
    return client;
  }, [publishError, publishNotice]);

  const createRoom = useCallback(
    async (name: string, maxPlayers: number) => {
      const client = await connectOnline();
      client.createRoom(name, maxPlayers);
      setScreen('LOBBY');
    },
    [connectOnline],
  );

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      const client = await connectOnline();
      client.joinRoom(code, name);
      setScreen('LOBBY');
    },
    [connectOnline],
  );

  const pickFaction = useCallback((factionId: FactionId | null) => {
    netRef.current?.pickFaction(factionId);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    netRef.current?.setReady(ready);
  }, []);

  const startOnlineMatch = useCallback(() => {
    netRef.current?.startMatch();
  }, []);

  const leaveRoom = useCallback(() => {
    netRef.current?.leave();
    netRef.current?.close();
    netRef.current = null;
    setLobby(null);
    setOnlineSeat(null);
    setMode('LOCAL');
    setScreen('HOME');
  }, []);

  /**
   * RECONEXÃO NO F5.
   *
   * Recarregar a página não pode destruir a partida online. Se existe token
   * guardado, o cliente reabre a conexão e reentra na sala; o servidor
   * devolve o assento e o estado atual.
   */
  const reconnectTried = useRef(false);
  useEffect(() => {
    if (reconnectTried.current) return;
    reconnectTried.current = true;
    const resume = readResume();
    if (!resume) return;
    setScreen('LOBBY');
    connectOnline()
      .then((client) => client.rejoin())
      .catch(() => {
        // Servidor fora do ar: volta ao menu sem travar o jogo.
        setScreen('HOME');
      });
  }, [connectOnline]);

  // Recalculado a cada render de menu: uma partida encerrada não é "salva".
  const saveAvailable = screen === 'HOME' ? repository.hasSave : repository.available;
  const viewerId = mode === 'ONLINE' && onlineSeat ? onlineSeat : state.turn.currentPlayerId;
  const canAct = mode !== 'ONLINE' || state.turn.currentPlayerId === viewerId;

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      screen,
      mode,
      viewerId,
      canAct,
      goHome: () => setScreen('HOME'),
      goSetup: () => setScreen('SETUP'),
      goOnline: () => setScreen('ONLINE'),
      goHowTo: () => setScreen('HOWTO'),
      startGame,
      startTutorialGame,
      continueGame,
      dispatch,
      lastResult,
      error,
      notice,
      clearError: () => setError(null),
      saveAvailable,
      forcedDice,
      setForcedDice,
      tutorial,
      tutorialStep,
      tutorialReady,
      advanceTutorialStep,
      endTutorial,
      net: netRef.current,
      lobby,
      netStatus,
      lastDice,
      connectOnline,
      createRoom,
      joinRoom,
      pickFaction,
      setReady,
      startOnlineMatch,
      leaveRoom,
    }),
    [
      state, screen, mode, viewerId, canAct, saveAvailable, startGame, startTutorialGame, continueGame,
      dispatch, lastResult, error, notice, forcedDice, tutorial, tutorialStep, tutorialReady,
      advanceTutorialStep, endTutorial, lobby, netStatus, lastDice, connectOnline, createRoom,
      joinRoom, pickFaction, setReady, startOnlineMatch, leaveRoom,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
