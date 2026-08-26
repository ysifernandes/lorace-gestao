/**
 * Definições SVG reutilizadas pelo tabuleiro: texturas de terreno, brilhos,
 * hachuras de território inimigo e o grão que dá aparência de mapa tático.
 */
export function BoardDefs() {
  return (
    <defs>
      {/* Fundo: profundidade do terreno */}
      <radialGradient id="ic-terrain" cx="42%" cy="34%" r="82%">
        <stop offset="0%" stopColor="#1a2436" />
        <stop offset="55%" stopColor="#111827" />
        <stop offset="100%" stopColor="#080c14" />
      </radialGradient>

      {/* Grade tática */}
      <pattern id="ic-grid" width="46" height="46" patternUnits="userSpaceOnUse">
        <path d="M46 0H0V46" fill="none" stroke="#243046" strokeWidth="1" />
      </pattern>

      {/* Hachura diagonal — territórios hostis */}
      <pattern id="ic-hostile" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="10" height="10" fill="transparent" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="3" />
      </pattern>

      {/* Malha fina — territórios controlados pelo jogador */}
      <pattern id="ic-friendly" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#ffffff" fillOpacity="0.08" />
      </pattern>

      {/* Brilho de seleção */}
      <filter id="ic-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="7" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="ic-soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" />
      </filter>

      {/* Grão de papel/varredura */}
      <filter id="ic-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </defs>
  );
}
