import type { CardInstance } from '../../game/types/card.types';
import type { GameState } from '../../game/types/game.types';
import { CARD_CATEGORY_LABELS, getCardDefinition } from '../../game/cards/card.registry';
import { canUseCard } from '../../game/cards/cardRules';
import { getFaction } from '../../game/factions/faction.registry';
import { SEQUESTRO_CARD_ID } from '../../game/cards/sequestro.card';
import { SequestroArt } from './SequestroArt';

export interface GameCardProps {
  state: GameState;
  card: CardInstance;
  onOpen: (card: CardInstance) => void;
  index: number;
}

/** Arte genérica para cartas sem ilustração própria (as de teste). */
function PlaceholderArt({ emoji, palette }: { emoji: string; palette: [string, string] }) {
  return (
    <svg className="card-art" viewBox="0 0 300 180" role="img" aria-label="Arte provisória">
      <defs>
        <linearGradient id={`ph-${emoji}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <rect width="300" height="180" rx="4" fill={`url(#ph-${emoji})`} />
      <g opacity="0.18" stroke="#ffffff" strokeWidth="1">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M${-40 + i * 46} 180 L${40 + i * 46} 0`} />
        ))}
      </g>
      <text x="150" y="104" textAnchor="middle" fontSize="52">
        {emoji}
      </text>
      <rect x="0.5" y="0.5" width="299" height="179" rx="4" fill="none" stroke="#0f1724" strokeOpacity="0.4" />
    </svg>
  );
}

/**
 * Carta na mão. Base predominantemente branca, faixa da facção no topo e
 * selo de carta especial — leitura de card game, não de "card de frontend".
 */
export function GameCard({ state, card, onOpen, index }: GameCardProps) {
  const definition = getCardDefinition(card.definitionId);
  const faction = definition.factionId ? getFaction(definition.factionId) : null;
  const isSequestro = definition.id === SEQUESTRO_CARD_ID;
  const primary = canUseCard(state, card.instanceId, 'PRIMARY');
  const alternate = definition.alternateEffect
    ? canUseCard(state, card.instanceId, 'ALTERNATE')
    : { allowed: false };
    // Carta de teste não tem efeito: não pode se anunciar como jogável.
  const usable = (primary.allowed || alternate.allowed);

  return (
    <li className="hand__slot" style={{ ['--i' as string]: index }}>
      <button
        type="button"
        className={`card game-card${usable ? ' is-usable' : ''}${isSequestro ? ' is-signature' : ''}`}
        onClick={() => onOpen(card)}
        aria-label={`Carta ${definition.name}`}
      >
        <span
          className="game-card__banner"
          style={{ background: faction?.color ?? '#4d5769' }}
        >
          <span className="game-card__faction">{faction?.name ?? 'Neutra'}</span>
          {isSequestro && <span className="game-card__seal" aria-hidden="true">★</span>}
        </span>

        <span className="game-card__art">
          {isSequestro ? (
            <SequestroArt compact />
          ) : (
            <PlaceholderArt emoji={definition.art.emoji} palette={definition.art.palette} />
          )}
        </span>

        <span className="game-card__body">
          <strong className="game-card__name card__name">{definition.name}</strong>
          <span className="game-card__category card__category">
            {CARD_CATEGORY_LABELS[definition.category]} · {definition.playType.toLowerCase()}
          </span>
          <span className="game-card__effect">{definition.description}</span>
        </span>

        <span className={`game-card__state card__flag${usable ? ' is-on' : ''}`}>
          {usable ? 'Jogável' : 'Indisponível'}
        </span>
      </button>
    </li>
  );
}
