import { useState } from 'react';
import { useGame } from '../hooks/useGame';
import { isValidRoomCode } from '../net/protocol';

/**
 * JOGAR ONLINE — criar sala ou entrar com um código.
 *
 * O código é curto e sem letras ambíguas (nada de O/0, I/1) porque ele vai
 * ser ditado por voz ou mandado por mensagem.
 */
export function OnlineScreen() {
  const { goHome, createRoom, joinRoom, netStatus } = useGame();
  const [name, setName] = useState('Comandante');
  const [code, setCode] = useState('');
  const [players, setPlayers] = useState(4);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const codeOk = isValidRoomCode(code);

  async function attempt(action: () => Promise<void>) {
    setBusy(true);
    setProblem(null);
    try {
      await action();
    } catch {
      setProblem(
        'Não foi possível falar com o servidor. Confira se ele está rodando (npm run server).',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="online">
      <header className="setup__head">
        <button type="button" className="btn btn--ghost" onClick={goHome}>
          ← Voltar
        </button>
        <h1>Jogar online</h1>
      </header>

      <label className="field">
        <span className="field__label">Seu nome de guerra</span>
        <input
          className="field__input"
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <div className="online__grid">
        <section className="online__card">
          <h2>Criar sala</h2>
          <p className="setup__hint">
            Você vira o host, recebe um código de 6 caracteres e manda para quem vai jogar.
          </p>
          <label className="field">
            <span className="field__label">Máximo de jogadores</span>
            <div className="chooser">
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`chip${players === count ? ' chip--on' : ''}`}
                  onClick={() => setPlayers(count)}
                  aria-pressed={players === count}
                >
                  {count}
                </button>
              ))}
            </div>
          </label>
          <button
            type="button"
            className="btn btn--primary btn--xl"
            disabled={busy}
            onClick={() => attempt(() => createRoom(name, players))}
          >
            Criar sala
          </button>
        </section>

        <section className="online__card">
          <h2>Entrar em sala</h2>
          <p className="setup__hint">Digite o código que o host mandou.</p>
          <label className="field">
            <span className="field__label">Código da sala</span>
            <input
              className="field__input field__input--code"
              value={code}
              placeholder="K7P4Q2"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          {code.length === 6 && !codeOk ? (
            <p className="online__problem">Esse código não parece válido.</p>
          ) : null}
          <button
            type="button"
            className="btn btn--primary btn--xl"
            disabled={busy || !codeOk}
            onClick={() => attempt(() => joinRoom(code, name))}
          >
            Entrar
          </button>
        </section>
      </div>

      {problem ? <p className="online__problem">{problem}</p> : null}
      <p className="online__status">
        Conexão: <strong>{netStatus === 'OPEN' ? 'conectado' : netStatus.toLowerCase()}</strong>
      </p>
    </div>
  );
}
