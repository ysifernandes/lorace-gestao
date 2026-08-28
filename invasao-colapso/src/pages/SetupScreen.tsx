import { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { getFaction } from '../game/factions/faction.registry';
import { tryGetAbility } from '../game/abilities/ability.registry';
import { listCardDefinitions } from '../game/cards/card.registry';
import { FACTION_PRIORITY, startingTroopsFor, territoriesPerPlayer, neutralTerritoryCount } from '../game/engine/setup';
import type { FactionId } from '../game/types/ids';

const COUNTS = [2, 3, 4, 5, 6];

const BALANCE_LABELS: { key: 'ataque' | 'defesa' | 'mobilidade' | 'cartas' | 'recuperacao'; label: string }[] = [
  { key: 'ataque', label: 'Ataque' },
  { key: 'defesa', label: 'Defesa' },
  { key: 'mobilidade', label: 'Mobilidade' },
  { key: 'cartas', label: 'Cartas' },
  { key: 'recuperacao', label: 'Recuperação' },
];

function abilityName(id: string | undefined): string | null {
  if (!id) return null;
  return tryGetAbility(id)?.name ?? null;
}

function signatureName(factionId: string): string | null {
  const card = listCardDefinitions().find((c) => (c.factionId as string | null) === factionId);
  return card?.name ?? null;
}

export function SetupScreen() {
  const { startGame, goHome } = useGame();
  const [playerCount, setPlayerCount] = useState(4);
  const [picks, setPicks] = useState<(FactionId | null)[]>(() => Array(6).fill(null));
  const [seat, setSeat] = useState(0);
  // ROSTER OFICIAL: as seis facções definidas pelo criador, nesta ordem.
  // Tecnólogos (conflito de referência registrado) fica fora da seleção e
  // continua acessível pelo painel DEV até o criador decidir.
  const roster = FACTION_PRIORITY.map((id) => getFaction(id));

  const chosen = picks.slice(0, playerCount).filter(Boolean) as FactionId[];

  function pickFaction(seat: number, factionId: FactionId) {
    setPicks((current) => {
      const next = [...current];
      // Uma facção por jogador: escolher uma já usada troca os dois assentos.
      const previousSeat = next.findIndex((id) => id === factionId);
      if (previousSeat >= 0 && previousSeat !== seat) next[previousSeat] = next[seat];
      next[seat] = factionId;
      return next;
    });
  }

  function autoFill() {
    setPicks(FACTION_PRIORITY.slice(0, 6).map((id) => id));
  }

  function start() {
    const players = Array.from({ length: playerCount }, (_, seat) => ({
      name: `Jogador ${seat + 1}`,
      factionId: picks[seat] ?? undefined,
    }));
    startGame({ playerCount, players });
  }

  return (
    <div className="setup">
      <header className="setup__head">
        <button type="button" className="btn btn--ghost" onClick={goHome}>
          ← Voltar
        </button>
        <h1>Configuração da partida</h1>
      </header>

      <section className="setup__block">
        <h2>Quantidade de jogadores</h2>
        <div className="chooser">
          {COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              className={`chip${playerCount === count ? ' chip--on' : ''}`}
              onClick={() => setPlayerCount(count)}
              aria-pressed={playerCount === count}
            >
              {count} jogadores
            </button>
          ))}
        </div>
        <p className="setup__hint">
          {territoriesPerPlayer(playerCount)} territórios e{' '}
          {startingTroopsFor(playerCount, 1)}–{startingTroopsFor(playerCount, playerCount)} tropas
          por jogador ·{' '}
          {neutralTerritoryCount(playerCount) > 0
            ? `${neutralTerritoryCount(playerCount)} território(s) Remanescente(s) neutro(s)`
            : 'sem territórios neutros'}
        </p>
      </section>

      <section className="setup__block">
        <div className="setup__block-head">
          <h2>Escolha seu exército</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={autoFill}>
            Preencher automaticamente
          </button>
        </div>
        <p className="setup__hint">
          Uma facção por jogador. Pela regra de preparação, quem joga por último escolhe primeiro.
        </p>

        <div className="seat-tabs" role="tablist">
          {Array.from({ length: playerCount }, (_, index) => {
            const pick = picks[index];
            const faction = pick ? getFaction(pick) : null;
            return (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={seat === index}
                className={`seat-tab${seat === index ? ' is-on' : ''}`}
                style={{ '--fc': faction?.color ?? 'var(--line-strong)' } as React.CSSProperties}
                onClick={() => setSeat(index)}
              >
                <span className="seat-tab__dot" />
                <span className="seat-tab__label">Jogador {index + 1}</span>
                <span className="seat-tab__faction">{faction?.name ?? 'a definir'}</span>
              </button>
            );
          })}
        </div>

        <div className="seat">
          <div className="seat__label">Jogador {seat + 1} · escolha o exército</div>
          <div className="seat__factions army-grid">
            {roster.map((faction) => {
              const current = picks[seat];
              const taken = chosen.includes(faction.id) && current !== faction.id;
              const balance = faction.rules.balance;
              return (
                <button
                  key={faction.id as string}
                  type="button"
                  className={`faction-pill army-card${current === faction.id ? ' faction-pill--on' : ''}${
                    taken ? ' faction-pill--taken' : ''
                  }`}
                  style={{ '--fc': faction.color } as React.CSSProperties}
                  onClick={() => pickFaction(seat, faction.id)}
                  aria-pressed={current === faction.id}
                  title={faction.subtitle}
                >
                  <span className="army-card__head">
                    <span className="army-card__emblem">{faction.symbol}</span>
                    <span className="army-card__title">
                      <span className="faction-pill__name">{faction.name}</span>
                      <span className="army-card__subtitle">{faction.subtitle}</span>
                    </span>
                  </span>

                  {balance ? (
                    <span className="army-card__balance">
                      {BALANCE_LABELS.map((row) => (
                        <span className="army-card__bar" key={row.key}>
                          <span className="army-card__bar-label">{row.label}</span>
                          <span className="army-card__bar-track">
                            <span
                              className="army-card__bar-fill"
                              style={{ width: `${(balance[row.key] / 5) * 100}%` }}
                            />
                          </span>
                        </span>
                      ))}
                    </span>
                  ) : null}

                  <span className="army-card__lines">
                    <span>
                      <b>Passiva:</b> {abilityName(faction.passiveAbilityIds[0]) ?? '—'}
                    </span>
                    <span>
                      <b>Habilidade:</b> {abilityName(faction.activeAbilityIds[0]) ?? '—'}
                    </span>
                    <span>
                      <b>Carta:</b> {signatureName(faction.id as string) ?? '—'}
                    </span>
                  </span>

                  {faction.provisional ? (
                    <span className="faction-pill__flag">provisória</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {picks[seat] ? (
            <p className="seat__detail">{getFaction(picks[seat]!).description}</p>
          ) : null}
        </div>
      </section>

      <div className="setup__footer">
        <button type="button" className="btn btn--primary btn--xl" onClick={start}>
          Iniciar partida
        </button>
      </div>
    </div>
  );
}
