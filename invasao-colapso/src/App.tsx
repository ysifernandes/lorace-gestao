import { GameProvider } from './app/GameProvider';
import { GameShell } from './pages/GameShell';
import './styles/global.css';

export default function App() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}
