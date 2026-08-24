import type { GameState } from '../types/game.types';

/**
 * Verificador de integridade. Usado nos testes para provar que nenhuma
 * operação duplica, perde ou desalinha soldados.
 */
export function validateState(state: GameState): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();

  for (const territory of Object.values(state.territories)) {
    for (const soldierId of territory.garrison) {
      const key = soldierId as string;
      if (seen.has(key)) {
        problems.push(
          `Soldado ${key} duplicado: presente em ${seen.get(key)} e em ${territory.id}.`,
        );
      }
      seen.set(key, territory.id as string);
      const soldier = state.soldiers[key];
      if (!soldier) {
        problems.push(`Guarnição de ${territory.id} referencia soldado inexistente ${key}.`);
        continue;
      }
      if (!soldier.alive) problems.push(`Soldado eliminado ${key} ainda ocupa ${territory.id}.`);
      if (soldier.location.kind !== 'TERRITORY') {
        problems.push(`Soldado ${key} está em ${soldier.location.kind} mas consta na guarnição.`);
      } else if (soldier.location.territoryId !== territory.id) {
        problems.push(
          `Soldado ${key} aponta para ${soldier.location.territoryId} mas está em ${territory.id}.`,
        );
      }
    }
  }

  for (const soldier of Object.values(state.soldiers)) {
    if (soldier.location.kind === 'TERRITORY') {
      const territory = state.territories[soldier.location.territoryId as string];
      if (!territory) {
        problems.push(`Soldado ${soldier.id} aponta para território inexistente.`);
      } else if (!territory.garrison.includes(soldier.id)) {
        problems.push(`Soldado ${soldier.id} não consta na guarnição de ${territory.id}.`);
      }
      if (!soldier.alive) problems.push(`Soldado ${soldier.id} morto com localização de território.`);
    }
    if (soldier.location.kind === 'ELIMINATED' && soldier.alive) {
      problems.push(`Soldado ${soldier.id} marcado como vivo mas eliminado.`);
    }
    if (!state.players[soldier.ownerId as string]) {
      problems.push(`Soldado ${soldier.id} pertence a jogador inexistente ${soldier.ownerId}.`);
    }
  }

  for (const player of Object.values(state.players)) {
    for (const cardId of player.handCardIds) {
      const card = state.cards[cardId as string];
      if (!card) {
        problems.push(`Mão de ${player.id} referencia carta inexistente ${cardId}.`);
        continue;
      }
      if (card.ownerId !== player.id) problems.push(`Carta ${cardId} está na mão do jogador errado.`);
      if (card.state === 'CONSUMED') problems.push(`Carta consumida ${cardId} ainda está na mão.`);
    }
    for (const territoryId of player.territoryIds) {
      const territory = state.territories[territoryId as string];
      if (!territory) {
        problems.push(`Jogador ${player.id} lista território inexistente ${territoryId}.`);
      } else if (territory.controllerId !== player.id) {
        problems.push(`Território ${territoryId} não é controlado por ${player.id}.`);
      }
    }
  }

  for (const [key, runtime] of Object.entries(state.abilityStates)) {
    if (!state.players[runtime.playerId as string]) {
      problems.push(`Habilidade ${key} pertence a jogador inexistente.`);
    }
    if (runtime.chargesRemaining < -1) {
      problems.push(`Habilidade ${key} com cargas negativas (${runtime.chargesRemaining}).`);
    }
    if (runtime.usesThisTurn < 0) {
      problems.push(`Habilidade ${key} com usos negativos no turno.`);
    }
  }

  // A fila só pode conter o que ainda não foi resolvido.
  for (const entry of state.effectQueue) {
    if (entry.status !== 'PENDING') {
      problems.push(`Efeito ${entry.id} já processado (${entry.status}) ainda está na fila.`);
    }
  }

  return problems;
}

export function assertValid(state: GameState, context = 'estado'): void {
  const problems = validateState(state);
  if (problems.length > 0) {
    throw new Error(`Integridade violada (${context}):\n- ${problems.join('\n- ')}`);
  }
}
