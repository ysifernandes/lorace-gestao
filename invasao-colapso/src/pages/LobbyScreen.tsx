import { useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { getFaction } from '../game/factions/faction.registry';
import { FACTION_PRIORITY } from '../game/engine/setup';
import type { FactionId } from '../game/types/ids';

/**
 * LOBBY — SALA DE GUERRA.
 *
 * Cada jogador ocupa uma posição com emblema, cor e estado. Facção escolhida
 * por um some para os outros: a atualização vem do servidor, em tempo real.
 */
export function LobbyScreen() {
  const { lobby, net, pickFaction, setReady, startOnlineMatch, leaveRoom, netStatus } = useGame();

  const roster = useMemo(() => FACTION_PRIORITY.map((id) => getFaction(id)), []);
  const me = lobby?.players.find((p) => p.seatId === net?.seatId) ?? null;
  const isHost = me?.isHost ?? false;
  const taken = new Set(
    (lobby?.players ?? [])
      .filter((p) => p.seatId !== me?.seatId && p.factionId)
      .map((p) => p.factionId as string),
  );
  const everyoneReady =
    (lobby?.players.length ?? 0) >= 2 && (lobby?.players ?? []).every((p) => p.ready);

  if (!lobby) {
    return (
      <div className="lobby lobby--waiting">
        <p>Conectando à sala… ({netStatus.toLowerCase()})</p>
        <button type="button" className="btn btn--ghost" onClick={leaveRoom}>
          Cancelar
        </button>
      </div>
    );
  }

  const slots = Array.from({ length: lobby.maxPlayers }, (_, index) => lobby.players[index] ?? null);

  return (
    <div className="lobby">
      <header className="lobby__head">
        <button type="button" className="btn btn--ghost" onClick={leaveRoom}>
          ← Sair da sala
        </button>
        <div className="lobby__code">
          <span className="lobby__code-label">Código da sala</span>
          <strong className="lobby__code-value">{lobby.code}</strong>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => navigator.clipboard?.writeText(lobby.code)}
          >
            Copiar
          </button>
        </div>
      </header>

      <section className="lobby__slots" aria-label="Jogadores na sala">
        {slots.map((player, index) => {
          const faction = player?.factionId ? getFaction(player.factionId) : null;
          return (
            <article
              key={player?.seatId ?? `vazio-${index}`}
              className={`warslot${player ? '' : ' warslot--empty'}${
                player?.ready ? ' warslot--ready' : ''
              }`}
              style={{ '--fc': faction?.color ?? '#3a4a63' } as React.CSSProperties}
            >
              <div className="warslot__emblem">{faction?.symbol ?? '—'}</div>
              <div className="warslot__body">
                <strong className="warslot__name">
                  {player?.name ?? 'Aguardando…'}
                  {player?.isHost ? <span className="warslot__host">HOST</span> : null}
                </strong>
                <span className="warslot__faction">{faction?.name ?? 'sem exército'}</span>
              </div>
              <div className="warslot__status">
                {!player ? (
                  <span className="warslot__tag">vazio</span>
                ) : !player.connected ? (
                  <span className="warslot__tag warslot__tag--off">reconectando…</span>
                ) : player.ready ? (
                  <span className="warslot__tag warslot__tag--ready">pronto</span>
                ) : (
                  <span className="warslot__tag">escolhendo</span>
                )}
                {isHost && player && !player.isHost ? (
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => net?.kick(player.seatId)}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="lobby__pick">
        <h2>Seu exército</h2>
        <div className="lobby__factions">
          {roster.map((faction) => {
            const indisponivel = taken.has(faction.id as string);
            const escolhida = me?.factionId === faction.id;
            return (
              <button
                key={faction.id as string}
                type="button"
                className={`faction-pill${escolhida ? ' faction-pill--on' : ''}${
                  indisponivel ? ' faction-pill--taken' : ''
                }`}
                style={{ '--fc': faction.color } as React.CSSProperties}
                disabled={indisponivel}
                onClick={() => pickFaction(escolhida ? null : (faction.id as FactionId))}
                aria-pressed={escolhida}
              >
                <span className="faction-pill__symbol">{faction.symbol}</span>
                <span className="faction-pill__name">{faction.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="lobby__foot">
        <button
          type="button"
          className={`btn btn--xl ${me?.ready ? 'btn--ghost' : 'btn--primary'}`}
          disabled={!me?.factionId}
          onClick={() => setReady(!me?.ready)}
        >
          {me?.ready ? 'Cancelar pronto' : 'Estou pronto'}
        </button>
        {isHost ? (
          <button
            type="button"
            className="btn btn--primary btn--xl"
            disabled={!everyoneReady}
            onClick={startOnlineMatch}
            title={everyoneReady ? 'Começar' : 'Todos precisam estar prontos'}
          >
            Iniciar invasão
          </button>
        ) : (
          <p className="lobby__waiting">Aguardando o host iniciar…</p>
        )}
      </footer>
    </div>
  );
}
