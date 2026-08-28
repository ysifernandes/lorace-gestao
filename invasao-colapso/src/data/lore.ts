/**
 * Universo do jogo. Etapa 1 guarda só o núcleo narrativo — o suficiente
 * para cartas, mapas e campanhas futuras se apoiarem em algo consistente.
 */
export interface LoreEntry {
  id: string;
  title: string;
  body: string;
  /** Ponto de ancoragem para campanhas futuras. */
  tags: string[];
}

export const GAME_TITLE = 'INVASÃO: COLAPSO';

export const LORE: LoreEntry[] = [
  {
    id: 'lore.colapso',
    title: 'O Colapso',
    body:
      'Não houve uma guerra declarada. Houve o Colapso: cadeias de suprimento romperam, ' +
      'redes caíram e, em poucas semanas, governos deixaram de responder por regiões inteiras. ' +
      'O território deixou de ser mapa e virou disputa.',
    tags: ['origem', 'mundo'],
  },
  {
    id: 'lore.faccoes',
    title: 'As Forças',
    body:
      'O que restou se organizou em facções. Cada uma sobrevive de um jeito: ' +
      'algumas por logística, outras por ocupação, outras por métodos que ninguém quer descrever. ' +
      'Todas precisam da mesma coisa — território, recursos e tropas.',
    tags: ['faccoes'],
  },
  {
    id: 'lore.operacoes',
    title: 'Operações',
    body:
      'Batalhas abertas custam caro. Por isso surgiram as Operações: golpes precisos, ' +
      'extrações aéreas, contramedidas médicas. Uma carta na mão certa vale mais que um batalhão.',
    tags: ['cartas', 'combate'],
  },
];
