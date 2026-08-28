import type { GameLogEntry, GameState } from '../types/game.types';

const MAX_LOG_ENTRIES = 200;

export function pushLog(draft: GameState, level: GameLogEntry['level'], message: string): void {
  draft.counters.log += 1;
  draft.log.unshift({
    id: `log-${draft.counters.log}`,
    turn: draft.turn.number,
    message,
    level,
  });
  if (draft.log.length > MAX_LOG_ENTRIES) draft.log.length = MAX_LOG_ENTRIES;
}
