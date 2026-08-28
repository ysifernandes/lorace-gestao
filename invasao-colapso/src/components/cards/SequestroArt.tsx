/**
 * Arte provisória da carta SEQUESTRO, desenhada em SVG dentro da própria
 * interface — nada de "imagem aqui". Conceito: operação noturna, helicóptero
 * militar, holofote varrendo o território inimigo.
 *
 * A base da carta permanece predominantemente BRANCA, conforme a direção
 * definida anteriormente; a cena noturna vive dentro da janela de arte.
 */
export function SequestroArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`card-art${compact ? ' is-compact' : ''}`}
      viewBox="0 0 300 180"
      role="img"
      aria-label="Helicóptero militar em operação noturna sobre território inimigo"
    >
      <defs>
        <linearGradient id="seq-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1526" />
          <stop offset="60%" stopColor="#132238" />
          <stop offset="100%" stopColor="#1d3149" />
        </linearGradient>
        <linearGradient id="seq-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="seq-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26384d" />
          <stop offset="100%" stopColor="#0d1725" />
        </linearGradient>
        <clipPath id="seq-clip">
          <rect x="0" y="0" width="300" height="180" rx="4" />
        </clipPath>
      </defs>

      <g clipPath="url(#seq-clip)">
        <rect width="300" height="180" fill="url(#seq-sky)" />

        {/* Estrelas esparsas */}
        {[
          [28, 24], [70, 16], [112, 34], [190, 20], [236, 40], [268, 18], [154, 12],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" fill="#cfe0ff" opacity="0.65" />
        ))}

        {/* Skyline em ruínas */}
        <path
          d="M0 128 L18 128 L18 96 L34 96 L34 112 L52 112 L52 84 L64 84 L64 74 L78 74 L78 118
             L96 118 L96 100 L118 100 L118 122 L140 122 L140 92 L152 92 L152 106 L172 106
             L172 128 L196 128 L196 88 L210 88 L210 104 L232 104 L232 120 L256 120 L256 98
             L272 98 L272 126 L300 126 L300 180 L0 180 Z"
          fill="url(#seq-ground)"
        />

        {/* Holofote */}
        <path d="M214 62 L262 168 L150 168 Z" fill="url(#seq-beam)" />
        <ellipse cx="206" cy="166" rx="56" ry="9" fill="#ffe9a8" opacity="0.22" />

        {/* Soldados capturados dentro do facho */}
        {[176, 198, 220].map((x, i) => (
          <g key={x} opacity={0.9 - i * 0.12}>
            <circle cx={x} cy={150} r="3.4" fill="#0a1220" />
            <path
              d={`M${x - 4} 168 L${x - 3} 155 L${x + 3} 155 L${x + 4} 168 Z`}
              fill="#0a1220"
            />
          </g>
        ))}

        {/* Helicóptero */}
        <g className="card-art__heli">
          <ellipse cx="206" cy="54" rx="30" ry="13" fill="#101a29" stroke="#8fb4ff" strokeWidth="1.4" />
          <path d="M236 54 L272 47 L272 53 L240 58 Z" fill="#101a29" stroke="#8fb4ff" strokeWidth="1.2" />
          <path d="M268 40 L280 40 L280 58 L272 58 Z" fill="#101a29" stroke="#8fb4ff" strokeWidth="1.2" />
          <circle cx="196" cy="52" r="5" fill="#8fb4ff" opacity="0.55" />
          <path d="M186 66 L226 66" stroke="#8fb4ff" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M192 66 L190 74 M220 66 L222 74" stroke="#8fb4ff" strokeWidth="1.6" strokeLinecap="round" />
          {/* Cabo de içamento */}
          <path d="M206 66 L206 142" stroke="#8fb4ff" strokeWidth="1" opacity="0.6" />
          {/* Rotor */}
          <g className="card-art__rotor">
            <path d="M150 38 L262 38" stroke="#dce8ff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
            <path d="M186 32 L226 44" stroke="#dce8ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
          </g>
        </g>

        {/* Poeira levantada */}
        <ellipse cx="206" cy="172" rx="74" ry="10" fill="#ffffff" opacity="0.06" />
      </g>
      <rect x="0.5" y="0.5" width="299" height="179" rx="4" fill="none" stroke="#0f1724" strokeOpacity="0.5" />
    </svg>
  );
}
