import { useGame } from '../hooks/useGame';
import { GamePage } from './GamePage';
import { FactionSelectScreen } from '../components/faction/FactionSelectScreen';

/** Decide entre a escolha do exército e a partida em andamento. */
export function GameShell() {
  const { started, startGame } = useGame();
  if (!started) return <FactionSelectScreen onSelect={() => startGame()} />;
  return <GamePage />;
}
