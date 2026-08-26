import type { CardInstance, CardMode } from '../../game/types/card.types';
import type { GameState } from '../../game/types/game.types';
import { CARD_CATEGORY_LABELS, getCardDefinition } from '../../game/cards/card.registry';
import { canUseCard } from '../../game/cards/cardRules';
import { getFaction } from '../../game/factions/faction.registry';
import { SEQUESTRO_CARD_ID } from '../../game/cards/sequestro.card';
import { SequestroArt } from './SequestroArt';

export interface CardPreviewProps {
  state: GameState;
  card: CardInstance;
  onUse: (mode: CardMode) => void;
  onClose: () => void;
}

/** Carta ampliada: arte grande, efeito principal e efeito alternativo. */
export function CardPreview({ state, card, onUse, onClose }: CardPreviewProps) {
  const definition = getCardDefinition(card.definitionId);
  const faction = definition.factionId ? getFaction(definition.factionId) : null;
  const isSequestro = definition.id === SEQUESTRO_CARD_ID;
  const isTest = (definition.id as string).startsWith('card.teste.');
  const rawPrimary = canUseCard(state, card.instanceId, 'PRIMARY');
  const primary = isTest
    ? { allowed: false, reason: 'Carta de teste — efeito ainda não definido.' }
    : rawPrimary;
  const alternate = definition.alternateEffect
    ? canUseCard(state, card.instanceId, 'ALTERNATE')
    : { allowed: false, reason: 'Esta carta não possui efeito alternativo.' };

  return (
    <div className="preview-backdrop modal-backdrop" role="dialog" aria-modal="true" aria-label={definition.name}>
      <div className="preview modal">
        <article className="preview__card">
          <header
            className="preview__banner"
            style={{ background: faction?.color ?? '#4d5769' }}
          >
            <span>{faction?.name ?? 'Neutra'}</span>
            <span className="preview__kind">
              {isSequestro
                ? 'Carta Especial'
                : isTest
                  ? 'Carta de teste'
                  : CARD_CATEGORY_LABELS[definition.category]}
            </span>
          </header>

          <div className="preview__art">
            {isSequestro ? (
              <SequestroArt />
            ) : (
              <div className="preview__art-fallback" style={{ background: definition.art.palette[0] }}>
                <span aria-hidden="true">{definition.art.emoji}</span>
              </div>
            )}
          </div>

          <div className="preview__text">
            <h2 className="preview__name modal__title">{definition.name}</h2>
            <p className="preview__meta">
              {faction?.name ?? 'Neutra'} — {isSequestro ? 'Carta Especial' : 'Carta de teste'}
            </p>

            <section className="preview__effect">
              <h3>Efeito</h3>
              <p>{definition.primaryEffect.description}</p>
            </section>

            {definition.alternateEffect && (
              <section className="preview__effect preview__effect--alt">
                <h3>Efeito alternativo — {definition.alternateEffect.name}</h3>
                <p>{definition.alternateEffect.description}</p>
              </section>
            )}

            <p className="preview__warning">
              Usar um dos efeitos consome a carta. O outro deixa de estar disponível.
            </p>
          </div>
        </article>

        <footer className="preview__actions modal__footer">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!primary.allowed}
            onClick={() => onUse('PRIMARY')}
            title={primary.allowed ? undefined : primary.reason}
          >
            Usar {definition.name}
          </button>
          {definition.alternateEffect && (
            <button
              type="button"
              className="btn btn--defense"
              disabled={!alternate.allowed}
              onClick={() => onUse('ALTERNATE')}
              title={alternate.allowed ? undefined : alternate.reason}
            >
              Uso defensivo
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
        </footer>

        {!primary.allowed && <p className="preview__blocked">{primary.reason}</p>}
      </div>
    </div>
  );
}
