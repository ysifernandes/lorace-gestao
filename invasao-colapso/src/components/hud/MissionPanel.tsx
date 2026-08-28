import type { GameState } from '../../game/types/game.types';
import { missionOf } from '../../game/engine/selectors';
import { Modal } from '../ui/Modal';

export interface MissionPanelProps {
  state: GameState;
  onClose: () => void;
}

/**
 * MISSÃO SECRETA — visível apenas para o jogador do turno.
 * Nenhum outro jogador consegue abrir este painel: ele sempre lê a missão
 * de `state.turn.currentPlayerId`.
 */
export function MissionPanel({ state, onClose }: MissionPanelProps) {
  const mission = missionOf(state, state.turn.currentPlayerId);
  const player = state.players[state.turn.currentPlayerId as string];

  return (
    <Modal title="Objetivo secreto" onClose={onClose}>
      {mission ? (
        <div className="mission">
          <p className="mission__owner">Somente {player?.name} pode ver isto.</p>
          <span className="mission__cat">{mission.category}</span>
          <h3 className="mission__name">{mission.name}</h3>
          <p className="mission__desc">{mission.description}</p>
          <p className="mission__progress">
            Progresso: <b>{mission.progress}</b>
          </p>
          {mission.substituted ? (
            <p className="mission__note">
              O objetivo original tornou-se impossível e foi substituído automaticamente.
            </p>
          ) : null}
          {mission.completed ? <p className="mission__done">Objetivo cumprido.</p> : null}
        </div>
      ) : (
        <p>Este jogador não recebeu objetivo.</p>
      )}
    </Modal>
  );
}
