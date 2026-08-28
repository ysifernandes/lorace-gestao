import type { GameState } from '../types/game.types';
import type { TutorialStep } from './tutorial.types';
import { applyAction } from '../engine/gameEngine';
import type { GameAction } from '../engine/actions';
import { createGame, PLAYER_IDS } from '../engine/setup';
import { TERRITORY_IDS } from '../../data/territories.seed';
import { HUMANOS_ID } from '../factions/humanos';
import { ZUMBIS_ID } from '../factions/roster';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { territoriesOf } from '../map/territory';

/**
 * PRIMEIRA BATALHA — o tutorial jogável.
 *
 * Situação controlada e determinística: Humanos (você) contra Zumbis, no
 * mesmo mapa oficial de 30 territórios. Nenhuma regra é alterada — o
 * tutorial só escolhe QUANDO falar e O QUE destacar.
 */

/** Origem e alvo fixos do ataque ensinado. São vizinhos na distribuição. */
export const TUTORIAL_ORIGIN = TERRITORY_IDS.complexoArtico;
export const TUTORIAL_TARGET = TERRITORY_IDS.portoFerro;
/** Território seu, vizinho da origem — destino da movimentação ensinada. */
export const TUTORIAL_MOVE_TO = TERRITORY_IDS.cidadeFantasma;

/** Aplica ações ignorando as que a regra recusar (preparação, não jogada). */
function run(state: GameState, actions: GameAction[]): GameState {
  let current = state;
  for (const action of actions) {
    const result = applyAction(current, action);
    if (result.ok) current = result.state;
  }
  return current;
}

/** Partida controlada do tutorial: você é Humanos no assento 1. */
export function createTutorialGame(): GameState {
  const base = createGame({
    gameId: 'tutorial',
    createdAt: 0,
    playerCount: 2,
    deterministic: true,
    players: [{ factionId: HUMANOS_ID, name: 'Você' }, { factionId: ZUMBIS_ID }],
  });
  // Guarnição preparada: força suficiente para o ataque ensinado dar certo
  // sem precisar de sorte, mas sem alterar nenhuma regra.
  return run(base, [
    { type: 'ADD_SOLDIERS', territoryId: TUTORIAL_ORIGIN, amount: 6, ownerId: PLAYER_IDS.p1 },
  ]);
}

const TROOPS_OF = (state: GameState, id: typeof TUTORIAL_ORIGIN): number =>
  state.territories[id as string]?.garrison.length ?? 0;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'mapa',
    title: 'O mundo depois do Colapso',
    body:
      'O continente está dividido em 6 regiões e 30 territórios. Controlar territórios ' +
      'aumenta seu exército; controlar uma região inteira dá reforço extra todo turno.',
    rule: 'Território conquistado nunca fica vazio: ao menos 1 soldado ocupa.',
    focus: { kind: 'REGION', regionId: 'fronteira-norte' },
    advance: { kind: 'CONFIRM', label: 'Entendi' },
  },
  {
    id: 'reforco',
    title: 'Reforços',
    body:
      'Todo turno começa com reforços. Toque em um território SEU e escolha quantos ' +
      'soldados colocar nele.',
    rule: 'Reforço = máx(3, territórios ÷ 3) + bônus de região e de Ponto de Interesse.',
    focus: { kind: 'TERRITORIES', territoryIds: [TUTORIAL_ORIGIN] },
    advance: { kind: 'DO', hint: 'Distribua pelo menos 1 reforço no mapa.' },
    phase: 'REFORCO',
    done: (state, atStart) =>
      state.turn.pendingReinforcements < atStart.turn.pendingReinforcements,
  },
  {
    id: 'reforco-fim',
    title: 'Termine a distribuição',
    body: 'Coloque todos os reforços restantes. Só depois é possível avançar de fase.',
    focus: { kind: 'UI', anchor: 'PRIMARY_ACTION' },
    advance: { kind: 'DO', hint: 'Zere os reforços e avance para o Ataque Comum.' },
    done: (state) => state.turn.phase === 'ATAQUE_COMUM',
  },
  {
    id: 'ataque',
    title: 'Ataque Comum',
    body:
      'Você tem 1 Ataque Comum por turno. Toque no seu território destacado, escolha ' +
      'ATACAR e depois toque no território inimigo iluminado.',
    rule: 'REGRA OFICIAL: 1 Ataque Comum por turno.',
    focus: { kind: 'TERRITORIES', territoryIds: [TUTORIAL_ORIGIN, TUTORIAL_TARGET] },
    advance: { kind: 'DO', hint: 'Declare o ataque contra o território destacado.' },
    phase: 'ATAQUE_COMUM',
    done: (state) => state.pendingAttack?.status === 'DECLARED',
  },
  {
    id: 'dados',
    title: 'Os dados',
    body:
      'O atacante rola até 3 dados e precisa deixar 1 soldado na origem. O defensor ' +
      'rola até 3 dados e não precisa deixar ninguém de fora. Role para ver.',
    rule: '2 tropas → 1 dado · 3 tropas → 2 dados · 4 ou mais → 3 dados.',
    focus: { kind: 'UI', anchor: 'ROLL_BUTTON' },
    advance: { kind: 'DO', hint: 'Toque em ROLAR DADOS.' },
    done: (state) => (state.pendingAttack?.rounds.length ?? 0) > 0,
  },
  {
    id: 'empate',
    title: 'Empate favorece o defensor',
    body:
      'Os dados são ordenados do maior para o menor e comparados par a par. Cada ' +
      'comparação perdida elimina 1 soldado. Quando dá empate, quem vence é o DEFENSOR.',
    rule: 'REGRA OFICIAL: empate = defensor vence.',
    focus: { kind: 'UI', anchor: 'BATTLE_PANEL' },
    advance: { kind: 'CONFIRM', label: 'Entendi' },
  },
  {
    id: 'continuar',
    title: 'Continuar ou recuar',
    body:
      'Você pode rolar de novo contra o MESMO território quantas vezes quiser: ainda ' +
      'conta como UM único ataque. Ou pode recuar e guardar o que sobrou.',
    rule: 'Várias rodadas de dados contra o mesmo alvo = 1 Ataque Comum.',
    focus: { kind: 'UI', anchor: 'BATTLE_PANEL' },
    advance: { kind: 'DO', hint: 'Continue rolando, ocupe o território ou recue.' },
    done: (state) => state.pendingAttack === null && state.pendingOccupation === null,
  },
  {
    id: 'especial',
    title: 'Ataque Especial',
    body:
      'Além do Ataque Comum, você pode fazer até 1 Ataque Especial por turno: o ' +
      'Transporte leva soldados a um alvo a exatamente 2 de distância. Ele gasta carga.',
    rule: 'São coisas separadas: 1 Ataque Comum + até 1 Ataque Especial.',
    focus: { kind: 'UI', anchor: 'PHASE_BAR' },
    advance: { kind: 'CONFIRM', label: 'Entendi' },
  },
  {
    id: 'movimento',
    title: 'Reorganize o exército',
    body:
      'Na fase de movimentação você reposiciona tropas entre territórios seus que ' +
      'façam fronteira. Toque na origem e depois no destino destacado.',
    focus: { kind: 'TERRITORIES', territoryIds: [TUTORIAL_ORIGIN, TUTORIAL_MOVE_TO] },
    advance: { kind: 'DO', hint: 'Faça uma movimentação.' },
    phase: 'MOVIMENTACAO',
    done: (state) => state.turn.movesUsed > 0,
  },
  {
    id: 'cartas',
    title: 'Cartas',
    body:
      'Você recebeu a carta assinatura dos Humanos. Toque nela para ampliar: o cartão ' +
      'mostra o efeito e quando pode ser usada. Dá para fechar sem gastar.',
    focus: { kind: 'UI', anchor: 'HAND' },
    advance: { kind: 'DO', hint: 'Abra a carta da sua mão.' },
    prepare: (state) =>
      run(state, [
        { type: 'GRANT_CARD', playerId: PLAYER_IDS.p1, definitionId: SEQUESTRO_CARD_ID },
      ]),
    done: () => true,
  },
  {
    id: 'missao',
    title: 'Sua missão é secreta',
    body:
      'Cada jogador recebe um objetivo secreto. Os outros não veem o seu. Cumprir a ' +
      'missão vence a partida na hora — consulte quando quiser pelo botão MISSÃO.',
    rule: 'A missão só é revelada a todos quando a partida termina.',
    focus: { kind: 'UI', anchor: 'MISSION_BUTTON' },
    advance: { kind: 'CONFIRM', label: 'Entendi' },
  },
  {
    id: 'colapso',
    title: 'Eventos do Colapso',
    body:
      'O mundo age sozinho. A qualquer rodada o Colapso pode disparar e mudar o campo ' +
      'de batalha para todo mundo ao mesmo tempo.',
    rule: 'Os 30 Eventos do Colapso são cartas do jogo, não improviso.',
    focus: { kind: 'UI', anchor: 'MAP' },
    advance: { kind: 'CONFIRM', label: 'Ver acontecer' },
  },
  {
    id: 'fim',
    title: 'Encerre o turno',
    body:
      'É isso: reforço, ataque, especial, movimentação e cartas. Encerre o turno para ' +
      'passar a vez — e boa sorte, comandante.',
    focus: { kind: 'UI', anchor: 'PRIMARY_ACTION' },
    advance: { kind: 'DO', hint: 'Avance até o fim do turno.' },
    done: (state, atStart) => state.turn.turnsPlayed > atStart.turn.turnsPlayed,
  },
];

/** Territórios do jogador do tutorial — usado para validar o roteiro. */
export function tutorialPlayerTerritories(state: GameState) {
  return territoriesOf(state, PLAYER_IDS.p1);
}

export { TROOPS_OF as tutorialTroopsOf };
