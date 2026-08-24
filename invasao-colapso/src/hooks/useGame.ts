import { useContext } from 'react';
import { GameContext } from '../app/GameProvider';
import type { GameContextValue } from '../app/GameProvider';

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame precisa estar dentro de <GameProvider>.');
  return context;
}
