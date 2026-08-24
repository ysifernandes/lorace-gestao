import { useState } from 'react';
import { GAME_TITLE } from '../../data/lore';
import { playableFactions, upcomingFactions } from '../../game/factions/faction.registry';
import { abilitiesOfFaction } from '../../game/abilities/ability.registry';
import { getCardDefinition } from '../../game/cards/card.registry';
import type { FactionDefinition } from '../../game/types/faction.types';
import type { FactionId } from '../../game/types/ids';

export interface FactionSelectScreenProps {
  onSelect: (factionId: FactionId) => void;
}

/** Facções oficiais e jogáveis pelo jogador nesta etapa. */
function selectableFactions(): FactionDefinition[] {
  return playableFactions().filter((faction) => faction.status === 'ACTIVE');
}

export function FactionSelectScreen({ onSelect }: FactionSelectScreenProps) {
  const available = selectableFactions();
  const [focused, setFocused] = useState<FactionId>(available[0]?.id);
  const faction = available.find((f) => f.id === focused) ?? available[0];
  const upcoming = upcomingFactions();

  if (!faction) return null;

  const abilities = abilitiesOfFaction(faction.id).filter((a) => a.factionId === faction.id);
  const signature = faction.signatureCardIds.map((id) => getCardDefinition(id as never));

  return (
    <div className="select-screen">
      <header className="select-screen__header">
        <h1 className="select-screen__game">{GAME_TITLE}</h1>
        <p className="select-screen__title">Escolha seu exército</p>
      </header>

      <div className="select-screen__body">
        <article className="faction-card" style={{ borderColor: faction.color }}>
          <div className="faction-card__banner" style={{ background: faction.color }}>
            <span aria-hidden="true">{faction.symbol}</span>
          </div>
          <h2 className="faction-card__name">{faction.name}</h2>
          <p className="faction-card__subtitle">{faction.subtitle}</p>
          <p className="faction-card__description">{faction.description}</p>

          <dl className="faction-card__facts">
            <div>
              <dt>Estilo estratégico</dt>
              <dd>{faction.strategy.pillars.join(' · ')}</dd>
            </div>
            <div>
              <dt>Dificuldade</dt>
              <dd>{'◆'.repeat(faction.strategy.difficulty)}</dd>
            </div>
          </dl>

          <div className="faction-card__block">
            <h3>Habilidades</h3>
            <ul>
              {abilities.map((ability) => (
                <li key={ability.id}>
                  <strong>{ability.name}</strong>
                  <span>{ability.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="faction-card__block">
            <h3>Carta especial</h3>
            <ul>
              {signature.map((card) => (
                <li key={card.id as string}>
                  <strong>
                    {card.art.emoji} {card.name}
                  </strong>
                  <span>{card.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn btn--primary btn--block btn--large"
            onClick={() => onSelect(faction.id)}
          >
            Selecionar {faction.name}
          </button>
        </article>

        <aside className="select-screen__roster" aria-label="Outras facções">
          <h3>Outros exércitos</h3>
          <ul className="roster">
            {available
              .filter((option) => option.id !== faction.id)
              .map((option) => (
                <li key={option.id as string}>
                  <button type="button" className="roster__item" onClick={() => setFocused(option.id)}>
                    <span aria-hidden="true">{option.symbol}</span>
                    {option.name}
                  </button>
                </li>
              ))}
            {upcoming.map((slot) => (
              <li key={slot.id as string}>
                <div className="roster__item is-locked" aria-disabled="true">
                  <span aria-hidden="true">❓</span>
                  <div>
                    <strong>???</strong>
                    <span className="roster__note">Em desenvolvimento</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
