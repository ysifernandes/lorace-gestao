import { useEffect } from 'react';
import { audio } from '../../view/audio/audioBus';
import type { GameState } from '../../game/types/game.types';
import { getFaction } from '../../game/factions/faction.registry';
import { effectiveMissionOf } from '../../game/missions/missionEngine';
import { seatedPlayers } from '../../game/engine/selectors';
import { territoriesOf } from '../../game/map/territory';

export interface VictoryOverlayProps {
  state: GameState;
  onNewGame: () => void;
  onHome: () => void;
}

const REASON_LABEL: Record<string, string> = {
  MISSION: 'Objetivo secreto cumprido',
  DOMINATION: 'Dominação total',
  LAST_STANDING: 'Último em pé',
  ROUND_LIMIT: 'Limite de rodadas',
};

export function VictoryOverlay({ state, onNewGame, onHome }: VictoryOverlayProps) {
  const result = state.result;

  // Fanfarra ao fim da partida. O hook vem antes de qualquer saída antecipada.
  useEffect(() => {
    if (result) audio.play('victory');
  }, [result]);

  if (!result) return null;
  const winner = result.winnerId ? state.players[result.winnerId as string] : null;
  const faction = winner ? getFaction(winner.factionId) : null;

  return (
    <div className="victory" role="dialog" aria-modal="true" aria-label="Fim de partida">
      <div className="victory__card" style={{ '--fc': faction?.color ?? '#888' } as React.CSSProperties}>
        <p className="victory__eyebrow">Fim de partida · rodada {result.finishedAtRound}</p>
        <h2 className="victory__title">{winner ? winner.name : 'Sem vencedor'}</h2>
        <p className="victory__faction">
          {faction ? `${faction.symbol} ${faction.name}` : '—'}
        </p>
        <p className="victory__reason">{REASON_LABEL[result.reason] ?? result.reason}</p>
        <p className="victory__detail">{result.detail}</p>

        <h3 className="victory__subtitle">Objetivos revelados</h3>
        <ul className="victory__missions">
          {seatedPlayers(state).map((player) => {
            const mission = effectiveMissionOf(state, player.id);
            const entry = state.missions[player.id as string];
            return (
              <li key={player.id as string}>
                <span
                  className="dot"
                  style={{ '--fc': getFaction(player.factionId).color } as React.CSSProperties}
                />
                <b>{player.name}</b>
                <span>{mission?.name ?? '—'}</span>
                <em>
                  {entry?.completed
                    ? 'cumprido'
                    : `${territoriesOf(state, player.id).length} territórios`}
                </em>
              </li>
            );
          })}
        </ul>

        <div className="victory__actions">
          <button type="button" className="btn btn--primary btn--xl" onClick={onNewGame}>
            Nova partida
          </button>
          <button type="button" className="btn btn--ghost btn--xl" onClick={onHome}>
            Tela inicial
          </button>
        </div>
      </div>
    </div>
  );
}
