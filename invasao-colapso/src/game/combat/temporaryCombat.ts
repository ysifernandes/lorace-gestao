import type { GameState } from '../types/game.types';
import { eliminateSoldier, soldiersInTerritory } from '../soldiers/soldier';

/**
 * ⚠️ RESOLUÇÃO TEMPORÁRIA DE COMBATE — ETAPA 2 ⚠️
 *
 * Existe apenas para permitir testar conquista e ocupação enquanto o
 * sistema real de dados não chega (Etapa 3). Não contém nenhuma regra
 * definitiva de batalha: elimina os defensores e devolve o resultado.
 *
 * Todo o resto do jogo (conquista, ocupação, cartas) é definitivo e não
 * depende deste arquivo — remover este módulo não quebra nada além do
 * botão DEV que o chama.
 */
export interface TemporaryCombatOutcome {
  eliminatedDefenders: number;
  attackerWins: boolean;
}

export function devResolveAttackAsVictory(draft: GameState): TemporaryCombatOutcome {
  const attack = draft.pendingAttack;
  if (!attack || attack.status !== 'DECLARED') {
    throw new Error('Não há ataque declarado para resolver.');
  }
  const defenders = soldiersInTerritory(draft, attack.toTerritoryId);
  for (const defender of defenders) eliminateSoldier(draft, defender.id);
  return { eliminatedDefenders: defenders.length, attackerWins: true };
}
