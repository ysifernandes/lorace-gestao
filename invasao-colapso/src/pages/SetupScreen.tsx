import { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { getFaction, playableFactions } from '../game/factions/faction.registry';
import { FACTION_PRIORITY, startingTroopsFor, territoriesPerPlayer, neutralTerritoryCount } from '../game/engine/setup';
import type { FactionId } from '../game/types/ids';

const COUNTS = [2, 3, 4, 5, 6];

export function SetupScreen() {
  const { startGame, goHome } = useGame();
  const [playerCount, setPlayerCount] = useState(4);
  const [picks, setPicks] = useState<(FactionId | null)[]>(() => Array(6).fill(null));
  const roster = playableFactions();

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
          <h2>Facções</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={autoFill}>
            Preencher automaticamente
          </button>
        </div>
        <p className="setup__hint">
          Deixe em branco para o jogo distribuir. Pela regra de preparação, quem joga por último
          escolhe primeiro.
        </p>
        <div className="setup__seats">
          {Array.from({ length: playerCount }, (_, seat) => {
            const current = picks[seat];
            return (
              <div className="seat" key={seat}>
                <div className="seat__label">Jogador {seat + 1}</div>
                <div className="seat__factions">
                  {roster.map((faction) => {
                    const taken = chosen.includes(faction.id) && current !== faction.id;
                    return (
                      <button
                        key={faction.id as string}
                        type="button"
                        className={`faction-pill${current === faction.id ? ' faction-pill--on' : ''}${
                          taken ? ' faction-pill--taken' : ''
                        }`}
                        style={{ '--fc': faction.color } as React.CSSProperties}
                        onClick={() => pickFaction(seat, faction.id)}
                        aria-pressed={current === faction.id}
                        title={faction.subtitle}
                      >
                        <span className="faction-pill__symbol">{faction.symbol}</span>
                        <span className="faction-pill__name">{faction.name}</span>
                        {faction.provisional ? (
                          <span className="faction-pill__flag">provisória</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {current ? (
                  <p className="seat__detail">{getFaction(current).description}</p>
                ) : null}
              </div>
            );
          })}
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
