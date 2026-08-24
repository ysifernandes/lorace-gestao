import { useCallback, useState } from 'react';
import type { TerritoryId } from '../game/types/ids';

/** Modos de interação do mapa. Só um fica ativo por vez. */
export type MapMode =
  | { kind: 'IDLE' }
  | { kind: 'MOVE'; from: TerritoryId }
  | { kind: 'ATTACK'; from: TerritoryId }
  | { kind: 'SEQUESTRO' };

export function useMapInteraction() {
  const [selected, setSelected] = useState<TerritoryId | null>(null);
  const [mode, setMode] = useState<MapMode>({ kind: 'IDLE' });

  const reset = useCallback(() => {
    setSelected(null);
    setMode({ kind: 'IDLE' });
  }, []);

  return { selected, setSelected, mode, setMode, reset };
}
