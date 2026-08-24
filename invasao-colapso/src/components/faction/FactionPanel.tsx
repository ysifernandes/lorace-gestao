import type { GameState } from '../../game/types/game.types';
import type { PlayerId } from '../../game/types/ids';
import { getFaction } from '../../game/factions/faction.registry';
import { abilityViews, signatureCards } from '../../game/engine/selectors';
import type { AbilityView } from '../../game/engine/selectors';

export interface FactionPanelProps {
  state: GameState;
  playerId: PlayerId;
  onActivate: (abilityId: string) => void;
}

const STATUS_LABEL: Record<AbilityView['status'], string> = {
  DISPONIVEL: 'Disponível',
  INDISPONIVEL: 'Bloqueada',
  ESGOTADA: 'Usada',
  DESATIVADA: 'Desativada (DEV)',
};

/** Painel de identidade: quem é a facção, o que ela sabe fazer e o que resta. */
export function FactionPanel({ state, playerId, onActivate }: FactionPanelProps) {
  const player = state.players[playerId as string];
  if (!player) return null;
  const faction = getFaction(player.factionId);
  const abilities = abilityViews(state, playerId);
  const cards = signatureCards(state, playerId);

  return (
    <section className="panel panel--faction" aria-label={`Facção ${faction.name}`}>
      <header className="faction__header" style={{ borderColor: faction.color }}>
        <span className="faction__symbol" aria-hidden="true">
          {faction.symbol}
        </span>
        <div>
          <h2 className="faction__name" style={{ color: faction.color }}>
            {faction.name}
          </h2>
          <p className="faction__subtitle">{faction.subtitle}</p>
        </div>
      </header>

      <p className="faction__style">
        <span className="faction__style-label">Estilo</span>
        {faction.strategy.pillars.join(' · ')}
      </p>

      <h3 className="faction__section">Habilidades</h3>
      {abilities.length === 0 ? (
        <p className="panel__empty">Esta facção ainda não possui habilidades.</p>
      ) : (
        <ul className="abilities">
          {abilities.map((view) => (
            <li key={view.definition.id} className={`ability is-${view.status.toLowerCase()}`}>
              <div className="ability__head">
                <strong className="ability__name">{view.definition.name}</strong>
                <span className="ability__kind">
                  {view.definition.kind === 'ACTIVE' ? 'Ativa' : 'Passiva'}
                </span>
              </div>
              <p className="ability__text">{view.definition.description}</p>
              <div className="ability__foot">
                <span className={`ability__status is-${view.status.toLowerCase()}`}>
                  {STATUS_LABEL[view.status]}
                </span>
                {view.chargesRemaining >= 0 && (
                  <span className="ability__charges">
                    {view.chargesRemaining} uso{view.chargesRemaining === 1 ? '' : 's'} restante
                    {view.chargesRemaining === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {view.reason && <p className="ability__reason">{view.reason}</p>}
              {view.definition.kind === 'ACTIVE' && (
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  disabled={view.status !== 'DISPONIVEL'}
                  onClick={() => onActivate(view.definition.id)}
                >
                  Acionar {view.definition.name}
                </button>
              )}
              {view.definition.provisional && (
                <p className="ability__provisional">Regra provisória — sujeita a ajuste.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="faction__section">Cartas exclusivas</h3>
      <ul className="signature-cards">
        {cards.map(({ definition, inHand, consumed }) => (
          <li key={definition.id as string}>
            <span className="signature-cards__art" aria-hidden="true">
              {definition.art.emoji}
            </span>
            <div>
              <strong>{definition.name}</strong>
              <span className="signature-cards__status">
                {inHand > 0 ? `${inHand} na mão` : consumed > 0 ? 'Consumida' : 'Indisponível'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
