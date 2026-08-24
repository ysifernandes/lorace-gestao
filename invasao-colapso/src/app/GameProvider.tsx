import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState } from '../game/types/game.types';
import type { GameAction } from '../game/engine/actions';
import { applyAction } from '../game/engine/gameEngine';
import { createGame } from '../game/engine/setup';
import { GameRepository } from '../game/persistence/gameRepository';

export interface GameContextValue {
  state: GameState;
  /** Executa uma ação. Retorna false e publica o erro quando a regra recusa. */
  dispatch: (action: GameAction) => boolean;
  /** Última ação bem-sucedida devolveu dados (ex.: resultado do dado). */
  lastResult: unknown;
  error: string | null;
  notice: string | null;
  clearError: () => void;
  saveAvailable: boolean;
}

export const GameContext = createContext<GameContextValue | null>(null);

const repository = new GameRepository();

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => repository.load() ?? createGame());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const errorTimer = useRef<number | undefined>(undefined);
  const noticeTimer = useRef<number | undefined>(undefined);

  // Persistência: cada mudança de estado é salva localmente.
  useEffect(() => {
    repository.save(state);
  }, [state]);

  const clearError = useCallback(() => setError(null), []);

  const dispatch = useCallback((action: GameAction) => {
    let accepted = false;
    setState((current) => {
      const result = applyAction(current, action);
      if (!result.ok) {
        setError(result.error);
        setNotice(null);
        return current;
      }
      accepted = true;
      setError(null);
      setLastResult(result.data ?? null);
      setNotice(result.state.log[0]?.message ?? null);
      if (action.type === 'NEW_GAME') repository.clear();
      return result.state;
    });
    return accepted;
  }, []);

  // As mensagens somem sozinhas — importante no celular, onde não há hover
  // e nada deve ficar permanentemente sobre o mapa.
  useEffect(() => {
    if (!error) return;
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(errorTimer.current);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(noticeTimer.current);
  }, [notice]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      lastResult,
      error,
      notice,
      clearError,
      saveAvailable: repository.available,
    }),
    [state, dispatch, lastResult, error, notice, clearError],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
