import { cardDefinitionId } from '../types/ids';
import type { CardDefinition } from '../types/card.types';

/**
 * CARTA VIRADA — o que o adversário vê da sua mão.
 *
 * No multijogador, a identidade das cartas alheias não sai do servidor. Mas a
 * CONTAGEM é pública: todo mundo vê quantas cartas cada um tem. Para que o
 * estado censurado continue íntegro (e o verificador de invariantes continue
 * valendo no cliente), cada carta escondida vira uma instância desta
 * definição — presença sem identidade.
 *
 * Ela NÃO entra no Baralho do Colapso e nunca é distribuída.
 */
export const FACEDOWN_CARD_ID = cardDefinitionId('card.oculta');

export const FACEDOWN_CARD: CardDefinition = {
  id: FACEDOWN_CARD_ID,
  name: 'Carta virada',
  factionId: null,
  category: 'SUPORTE',
  playType: 'TATICA',
  description: 'Uma carta na mão de outro jogador. Você não pode ver qual é.',
  maxUses: 1,
  // Nunca jogável: não é a sua carta.
  conditions: [{ type: 'NEVER' }],
  primaryEffect: {
    id: 'effect.oculta',
    name: 'Carta virada',
    description: 'Sem efeito: esta carta não é sua.',
    conditions: [],
    animation: { id: 'anim.oculta', name: 'Carta virada', beats: [] },
  },
  alternateEffect: null,
  art: { key: 'card.oculta', emoji: '🂠', palette: ['#111823', '#3a4a63'] },
};
