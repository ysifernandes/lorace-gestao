import { MOCK_DECK_COUNT, MOCK_DISCARD_COUNT } from '../../mocks/prototype.mocks';

/**
 * Deck e descarte. ⚠️ Contagens são MOCK: o sistema de deck é a Etapa 5.
 */
export function DeckZone() {
  return (
    <aside className="deck-zone" aria-label="Deck e descarte">
      <div className="deck-zone__pile deck-zone__pile--deck">
        <span className="deck-zone__stack" aria-hidden="true" />
        <span className="deck-zone__stack" aria-hidden="true" />
        <span className="deck-zone__face">
          <strong>{MOCK_DECK_COUNT}</strong>
          <span>Deck</span>
        </span>
      </div>
      <div className="deck-zone__pile deck-zone__pile--discard">
        <span className="deck-zone__face is-discard">
          <strong>{MOCK_DISCARD_COUNT}</strong>
          <span>Descarte</span>
        </span>
      </div>
    </aside>
  );
}
