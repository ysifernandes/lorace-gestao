/**
 * Contrato de armazenamento. Hoje: localStorage.
 * Amanhã: backend/banco — basta outro adapter, sem tocar no jogo.
 */
export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
  readonly available: boolean;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private data = new Map<string, string>();
  readonly available = true;
  read(key: string) {
    return this.data.get(key) ?? null;
  }
  write(key: string, value: string) {
    this.data.set(key, value);
  }
  remove(key: string) {
    this.data.delete(key);
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly available: boolean;
  constructor() {
    this.available = LocalStorageAdapter.probe();
  }
  private static probe(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const probeKey = '__ic_probe__';
      localStorage.setItem(probeKey, '1');
      localStorage.removeItem(probeKey);
      return true;
    } catch {
      return false;
    }
  }
  read(key: string) {
    try {
      return this.available ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  write(key: string, value: string) {
    try {
      if (this.available) localStorage.setItem(key, value);
    } catch {
      /* cota cheia ou modo privado: persistência é best-effort */
    }
  }
  remove(key: string) {
    try {
      if (this.available) localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  }
}

export function createDefaultAdapter(): StorageAdapter {
  const local = new LocalStorageAdapter();
  return local.available ? local : new MemoryStorageAdapter();
}
