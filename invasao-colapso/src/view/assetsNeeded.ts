/**
 * ASSETS QUE PRECISAM SER CRIADOS.
 *
 * Protocolo do criador: quando uma referência visual exige um asset que
 * ainda não existe, NÃO se inventa um asset definitivo de baixa qualidade.
 * Cria-se um placeholder claramente identificado e registra-se aqui.
 *
 * Tudo que está nesta lista está hoje sendo desenhado por código (vetor
 * procedural) e é PLACEHOLDER — nenhum item aqui é arte final.
 */

export interface AssetNeed {
  /** Nome de arquivo sugerido, dentro de `public/assets/`. */
  file: string;
  /** O que o asset representa. */
  purpose: string;
  /** De qual referência oficial ele vem. */
  reference: string;
  /** O que está sendo desenhado no lugar dele agora. */
  placeholder: string;
}

export const ASSETS_NEEDED: AssetNeed[] = [
  {
    file: 'map/continente-colapso.webp',
    purpose: 'Mapa-base pintado do continente (relevo, água, ruínas, atmosfera)',
    reference: 'Imagem de referência do mapa (30 territórios em 6 regiões)',
    placeholder: 'Massas de terra vetoriais geradas por casco convexo em boardArt.ts',
  },
  {
    file: 'map/territorio-{id}.webp',
    purpose: 'Recorte pintado de cada um dos 30 territórios',
    reference: 'Imagem de referência do mapa',
    placeholder: 'Polígono irregular determinístico gerado a partir do id',
  },
  {
    file: 'units/{faccao}-soldado.glb',
    purpose: 'Miniatura 3D do soldado de cada facção (LOD alto)',
    reference: 'Direção de arte: “jogo de estratégia AAA em miniatura”',
    placeholder: 'Silhueta vetorial por facção em factionArt.ts',
  },
  {
    file: 'units/{faccao}-soldado.webp',
    purpose: 'Sprite do soldado de cada facção (LOD médio e baixo)',
    reference: 'Referência “ESCOLHA SEU EXÉRCITO”',
    placeholder: 'Silhueta vetorial por facção em factionArt.ts',
  },
  {
    file: 'factions/{faccao}-emblema.svg',
    purpose: 'Emblema/bandeira oficial de cada facção',
    reference: 'Referência “ESCOLHA SEU EXÉRCITO”',
    placeholder: 'Emoji declarado em `faction.symbol`',
  },
  {
    file: 'factions/{faccao}-retrato.webp',
    purpose: 'Retrato da facção na tela de seleção de exército',
    reference: 'Referência “ESCOLHA SEU EXÉRCITO”',
    placeholder: 'Bloco de cor com emblema e matriz de balanceamento',
  },
  {
    file: 'cards/{carta}.webp',
    purpose: 'Arte de cada carta assinatura e de cada carta neutra',
    reference: 'Referência “CARTAS ESPECIAIS DAS FACÇÕES”',
    placeholder: 'Gradiente da paleta da carta + emoji',
  },
  {
    file: 'poi/{poi}.webp',
    purpose: 'Ícone pintado dos 6 Pontos de Interesse',
    reference: 'Imagem de referência do mapa',
    placeholder: 'Losango vetorial com símbolo',
  },
  {
    file: 'vfx/colapso-{evento}.webm',
    purpose: 'Vídeo curto de impacto para os Eventos do Colapso de maior intensidade',
    reference: 'Direção de arte pós-Colapso, cinematográfica',
    placeholder: 'Sequência CSS de alerta → revelação',
  },
  {
    file: 'audio/{trilha,sfx}/*.ogg',
    purpose: 'Trilha e efeitos (dados, conquista, evento, vitória)',
    reference: 'Direção de arte cinematográfica',
    placeholder: 'Nenhum — o jogo está mudo',
  },
];

/** Formato curto para relatório e painel DEV. */
export function assetNeedLines(): string[] {
  return ASSETS_NEEDED.map((a) => `ASSET_NEEDED: ${a.file} — ${a.purpose}`);
}
