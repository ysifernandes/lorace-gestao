import { GAME_STATE_VERSION } from '../types/game.types';
import type { GameState } from '../types/game.types';
import { validateState } from '../engine/invariants';
import type { StorageAdapter } from './storage';
import { createDefaultAdapter } from './storage';

export const SAVE_KEY = 'invasao-colapso:save:v1';

interface SaveEnvelope {
  version: number;
  savedAt: number;
  state: GameState;
}

/**
 * Repositório de partidas. A interface é assíncrona-friendly por design:
 * trocar por API remota depois não muda os chamadores.
 */
export class GameRepository {
  constructor(private readonly adapter: StorageAdapter = createDefaultAdapter()) {}

  /** O armazenamento funciona neste navegador. */
  get available(): boolean {
    return this.adapter.available;
  }

  /**
   * Existe uma partida salva que dá para retomar?
   *
   * Diferente de `available`: ali a pergunta é se o navegador guarda dados;
   * aqui é se há partida de verdade. O menu usa ESTA para decidir se mostra
   * CONTINUAR — senão o botão aparece sempre e não leva a lugar nenhum.
   */
  get hasSave(): boolean {
    const saved = this.load();
    return saved !== null && saved.status !== 'FINISHED';
  }

  save(state: GameState): void {
    const envelope: SaveEnvelope = {
      version: GAME_STATE_VERSION,
      savedAt: Date.now(),
      state,
    };
    this.adapter.write(SAVE_KEY, JSON.stringify(envelope));
  }

  /** Carrega uma partida salva. Devolve null se não houver, estiver corrompida ou for de outra versão. */
  load(): GameState | null {
    const raw = this.adapter.read(SAVE_KEY);
    if (!raw) return null;
    try {
      const envelope = JSON.parse(raw) as SaveEnvelope;
      if (!envelope?.state) return null;
      const migrated = migrate(envelope);
      if (!migrated) return null;
      if (validateState(migrated).length > 0) return null;
      return migrated;
    } catch {
      return null;
    }
  }

  clear(): void {
    this.adapter.remove(SAVE_KEY);
  }
}

/** Ponto de extensão para migrações entre versões de save. */
function migrate(envelope: SaveEnvelope): GameState | null {
  if (envelope.version === GAME_STATE_VERSION) return envelope.state;
  return null;
}
