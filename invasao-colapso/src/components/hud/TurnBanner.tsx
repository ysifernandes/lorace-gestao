import type { PhaseGuide } from '../../game/turns/phaseGuide';
import type { FactionDefinition } from '../../game/types/faction.types';

/**
 * SUA VEZ — o elemento mais importante da tela.
 *
 * Responde a duas perguntas antes de qualquer outra coisa: de quem é a vez e
 * o que fazer agora. Tudo o mais na HUD é secundário a isto.
 */
export interface TurnBannerProps {
  playerName: string;
  faction: FactionDefinition;
  guide: PhaseGuide;
  /** false quando é a vez de outra pessoa (online). */
  yours: boolean;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onHelp: () => void;
}

export function TurnBanner({
  playerName,
  faction,
  guide,
  yours,
  onPrimary,
  primaryDisabled,
  onHelp,
}: TurnBannerProps) {
  return (
    <section
      className={`turnbanner${yours ? ' turnbanner--yours' : ''}`}
      style={{ '--fc': faction.color } as React.CSSProperties}
      aria-live="polite"
    >
      <div className="turnbanner__who">
        <span className="turnbanner__emblem" aria-hidden="true">
          {faction.symbol}
        </span>
        <div>
          <strong className="turnbanner__turn">{yours ? 'SUA VEZ' : `VEZ DE ${playerName}`}</strong>
          <span className="turnbanner__phase">{guide.title.toUpperCase()}</span>
        </div>
      </div>

      <p className="turnbanner__instruction">{guide.instruction}</p>

      <div className="turnbanner__actions">
        <button
          type="button"
          className="btn btn--icon turnbanner__help"
          onClick={onHelp}
          aria-label="Ajuda sobre esta fase"
          title="O que é esta fase?"
        >
          ?
        </button>
        <button
          type="button"
          className="btn btn--primary turnbanner__primary"
          onClick={onPrimary}
          disabled={primaryDisabled || !yours}
          title={guide.blockedBecause ?? guide.primaryLabel}
        >
          {guide.primaryLabel}
        </button>
      </div>

      {guide.blockedBecause ? (
        <p className="turnbanner__blocked" role="status">
          {guide.blockedBecause}
        </p>
      ) : null}
    </section>
  );
}
