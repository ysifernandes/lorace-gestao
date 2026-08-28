/**
 * ⚠️ MOCKS DO PROTÓTIPO VISUAL (ETAPA 6A) ⚠️
 *
 * Existem só para a experiência ser VISÍVEL antes das etapas que os tornam
 * reais. Nada aqui é regra de jogo: o motor não importa este arquivo.
 *
 * - Deck e descarte: a Etapa 5 (sistema de cartas/deck) ainda não foi feita.
 * - Dados de batalha: a Etapa 3 (combate e dados) ainda não foi feita, então
 *   as faces mostradas são PREVISÃO VISUAL da intenção de ataque, não o
 *   resultado real — quem resolve o combate continua sendo o motor.
 *
 * Apagar este arquivo e seus usos remove o protótipo sem afetar as regras.
 */

/** MOCK: contagem do deck exibida no HUD. */
export const MOCK_DECK_COUNT = 12;

/** MOCK: contagem da pilha de descarte exibida no HUD. */
export const MOCK_DISCARD_COUNT = 3;

/**
 * MOCK VISUAL: quantos dados cada lado exibiria em uma batalha.
 * Convenção provisória — a Etapa 3 define a regra real.
 */
export function mockDicePlan(attackerTroops: number, defenderTroops: number) {
  return {
    attacker: Math.max(1, Math.min(3, attackerTroops - 1)),
    defender: Math.max(1, Math.min(2, defenderTroops)),
  };
}

/** MOCK: faces sorteadas apenas para a prévia da batalha. */
export function mockDiceFaces(count: number): number[] {
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
}
