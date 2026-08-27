import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import { applyAction, forcedDiceRng } from '../game/engine/gameEngine';
import { createGame } from '../game/engine/setup';
import type { NewGameOptions } from '../game/engine/setup';
import { GameRepository } from '../game/persistence/gameRepository';

export type Screen = 'HOME' | 'SETUP' | 'GAME';

export interface GameContextValue {
  state: GameState;
  screen: Screen;
  goHome: () => void;
  goSetup: () => void;
  startGame: (options: NewGameOptions) => void;
  continueGame: () => void;
  /** Executa uma ação. Retorna false e publica o erro quando a regra recusa. */
  dispatch: (action: GameAction) => boolean;
  lastResult: unknown;
  error: string | null;
  notice: string | null;
  clearError: () => void;
  saveAvailable: boolean;
  /** DEV: dados fixos para a próxima rolagem. */
  forcedDice: number[] | null;
  setForcedDice: (values: number[] | null) => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

const repository = new GameRepository();
const SCREEN_KEY = 'invasao-colapso:screen:v2';

function readScreen(): Screen {
  try {
    const value = localStorage.getItem(SCREEN_KEY);
    return value === 'GAME' ? 'GAME' : 'HOME';
  } catch {
    return 'HOME';
  }
}

function writeScreen(screen: Screen): void {
  try {
    localStorage.setItem(SCREEN_KEY, screen);
  } catch {
    /* armazenamento indisponível: a sessão ainda funciona */
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const saved = useMemo(() => repository.load(), []);
  const [state, setState] = useState<GameState>(() => saved ?? createGame({ playerCount: 4 }));
  const [screen, setScreen] = useState<Screen>(() => (saved ? readScreen() : 'HOME'));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [forcedDice, setForcedDice] = useState<number[] | null>(null);
  const errorTimer = useRef<number | undefined>(undefined);
  const noticeTimer = useRef<number | undefined>(undefined);

  // Persistência: cada mudança de estado é salva localmente.
  useEffect(() => {
    if (screen === 'GAME') repository.save(state);
  }, [state, screen]);

  useEffect(() => {
    writeScreen(screen);
  }, [screen]);

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

  const dispatch = useCallback(
    (action: GameAction) => {
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
    [forcedDice, publishError, publishNotice],
  );

  const startGame = useCallback((options: NewGameOptions) => {
    const fresh = createGame(options);
    setState(fresh);
    repository.save(fresh);
    setScreen('GAME');
  }, []);

  const continueGame = useCallback(() => {
    const loaded = repository.load();
    if (!loaded) {
      publishError('Não há partida salva.');
      return;
    }
    setState(loaded);
    setScreen('GAME');
  }, [publishError]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      screen,
      goHome: () => setScreen('HOME'),
      goSetup: () => setScreen('SETUP'),
      startGame,
      continueGame,
      dispatch,
      lastResult,
      error,
      notice,
      clearError: () => setError(null),
      saveAvailable: repository.available,
      forcedDice,
      setForcedDice,
    }),
    [state, screen, startGame, continueGame, dispatch, lastResult, error, notice, forcedDice],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
