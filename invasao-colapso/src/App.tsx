import { GameProvider } from './app/GameProvider';
import { GameShell } from './pages/GameShell';
import './styles/global.css';
import './styles/prototype.css';

export default function App() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}
