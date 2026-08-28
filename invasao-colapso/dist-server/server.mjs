// src/net/serverEntry.ts
import { WebSocketServer } from "ws";

// src/game/types/game.types.ts
var GAME_STATE_VERSION = 3;

// src/game/types/ids.ts
var factionId = (v) => v;
var playerId = (v) => v;
var territoryId = (v) => v;
var soldierId = (v) => v;
var cardDefinitionId = (v) => v;
var cardInstanceId = (v) => v;

// src/data/territories.seed.ts
var id = {
  fortalezaBoreal: territoryId("fortaleza-boreal"),
  planiciesGelidas: territoryId("planicies-gelidas"),
  complexoArtico: territoryId("complexo-artico"),
  portoFerro: territoryId("porto-de-ferro"),
  cidadeFantasma: territoryId("cidade-fantasma"),
  colinasTitanio: territoryId("colinas-de-titanio"),
  valeIndustrial: territoryId("vale-industrial"),
  capitalContinental: territoryId("capital-continental"),
  represaEstilhacada: territoryId("represa-estilhacada"),
  redutoComando: territoryId("reduto-do-comando"),
  desertoCinzas: territoryId("deserto-de-cinzas"),
  canionEcos: territoryId("canion-dos-ecos"),
  minaAbandonada: territoryId("mina-abandonada"),
  cidadeSubmersa: territoryId("cidade-submersa"),
  usinaNuclear: territoryId("usina-nuclear"),
  portoMercenario: territoryId("porto-mercenario"),
  arquipelagoNegro: territoryId("arquipelago-negro"),
  docaEnferrujada: territoryId("doca-enferrujada"),
  laboratorioMarinho: territoryId("laboratorio-marinho"),
  farolAbismo: territoryId("farol-do-abismo"),
  selvaDensa: territoryId("selva-densa"),
  temploAntigo: territoryId("templo-antigo"),
  pantanoToxico: territoryId("pantano-toxico"),
  vilaDesolada: territoryId("vila-desolada"),
  troncoGigante: territoryId("tronco-gigante"),
  crateraCentral: territoryId("cratera-central"),
  torreAnomalia: territoryId("torre-da-anomalia"),
  campoRuinas: territoryId("campo-de-ruinas"),
  santuarioProibido: territoryId("santuario-proibido"),
  nucleoColapso: territoryId("nucleo-do-colapso")
};
var TERRITORY_SEEDS = [
  {
    // 1
    id: id.fortalezaBoreal,
    name: "Fortaleza Boreal",
    region: "fronteira-norte",
    neighbors: [id.planiciesGelidas, id.cidadeFantasma, id.colinasTitanio],
    position: { x: 470, y: 115 },
    characteristic: "Muralha de gelo e concreto que nunca foi tomada."
  },
  {
    // 2
    id: id.planiciesGelidas,
    name: "Plan\xEDcies G\xE9lidas",
    region: "fronteira-norte",
    neighbors: [id.fortalezaBoreal, id.complexoArtico, id.cidadeFantasma, id.capitalContinental],
    position: { x: 665, y: 100 },
    characteristic: "Campo aberto sob nevasca permanente."
  },
  {
    // 3
    id: id.complexoArtico,
    name: "Complexo \xC1rtico",
    region: "fronteira-norte",
    neighbors: [id.planiciesGelidas, id.portoFerro, id.cidadeFantasma, id.represaEstilhacada],
    position: { x: 845, y: 110 },
    characteristic: "Esta\xE7\xE3o de pesquisa polar ainda alimentada por reatores."
  },
  {
    // 4
    id: id.portoFerro,
    name: "Porto de Ferro",
    region: "fronteira-norte",
    neighbors: [id.complexoArtico, id.redutoComando, id.desertoCinzas],
    position: { x: 1e3, y: 135 },
    characteristic: "Cais congelado com cargueiros presos no gelo."
  },
  {
    // 5
    id: id.cidadeFantasma,
    name: "Cidade Fantasma",
    region: "fronteira-norte",
    neighbors: [id.fortalezaBoreal, id.planiciesGelidas, id.complexoArtico, id.valeIndustrial],
    position: { x: 760, y: 195 },
    characteristic: "Metr\xF3pole evacuada em uma noite. Luzes ainda acesas."
  },
  {
    // 6
    id: id.colinasTitanio,
    name: "Colinas de Tit\xE2nio",
    region: "terras-centrais",
    neighbors: [id.fortalezaBoreal, id.valeIndustrial, id.capitalContinental, id.docaEnferrujada],
    position: { x: 470, y: 265 },
    characteristic: "Encostas de min\xE9rio exposto e guindastes parados."
  },
  {
    // 7
    id: id.valeIndustrial,
    name: "Vale Industrial",
    region: "terras-centrais",
    neighbors: [id.cidadeFantasma, id.colinasTitanio, id.capitalContinental, id.portoMercenario, id.selvaDensa],
    position: { x: 585, y: 305 },
    characteristic: "Chamin\xE9s que n\xE3o param de fumegar desde o Colapso."
  },
  {
    // 8
    id: id.capitalContinental,
    name: "Capital Continental",
    region: "terras-centrais",
    neighbors: [id.planiciesGelidas, id.valeIndustrial, id.represaEstilhacada, id.redutoComando, id.colinasTitanio, id.selvaDensa],
    position: { x: 725, y: 285 },
    characteristic: "O centro administrativo do velho mundo.",
    poi: { kind: "REINFORCEMENT", description: "+1 refor\xE7o por turno enquanto controlada" }
  },
  {
    // 9
    id: id.represaEstilhacada,
    name: "Represa Estilha\xE7ada",
    region: "terras-centrais",
    neighbors: [id.complexoArtico, id.capitalContinental, id.redutoComando, id.desertoCinzas],
    position: { x: 830, y: 250 },
    characteristic: "A barragem cedeu e o vale nunca mais secou."
  },
  {
    // 10
    id: id.redutoComando,
    name: "Reduto do Comando",
    region: "terras-centrais",
    neighbors: [id.portoFerro, id.capitalContinental, id.represaEstilhacada, id.desertoCinzas, id.crateraCentral],
    position: { x: 910, y: 315 },
    characteristic: "Bunker de comando com o mapa antigo ainda na mesa.",
    poi: { kind: "GARRISON", description: "+1 soldado aqui ao final do seu turno" }
  },
  {
    // 11
    id: id.desertoCinzas,
    name: "Deserto de Cinzas",
    region: "zona-devastada",
    neighbors: [id.portoFerro, id.redutoComando, id.represaEstilhacada, id.canionEcos, id.minaAbandonada],
    position: { x: 1065, y: 275 },
    characteristic: "Cinza fina at\xE9 o horizonte. Nada cresce, nada esconde."
  },
  {
    // 12
    id: id.canionEcos,
    name: "C\xE2nion dos Ecos",
    region: "zona-devastada",
    neighbors: [id.desertoCinzas, id.cidadeSubmersa, id.usinaNuclear],
    position: { x: 1230, y: 245 },
    characteristic: "Fenda profunda onde qualquer som volta tr\xEAs vezes."
  },
  {
    // 13
    id: id.minaAbandonada,
    name: "Mina Abandonada",
    region: "zona-devastada",
    neighbors: [id.desertoCinzas, id.cidadeSubmersa, id.usinaNuclear, id.crateraCentral],
    position: { x: 1085, y: 415 },
    characteristic: "Galerias que descem mais fundo do que os registros admitem."
  },
  {
    // 14
    id: id.cidadeSubmersa,
    name: "Cidade Submersa",
    region: "zona-devastada",
    neighbors: [id.canionEcos, id.minaAbandonada, id.usinaNuclear],
    position: { x: 1245, y: 370 },
    characteristic: "Torres saindo da \xE1gua. As luzes do subsolo ainda funcionam."
  },
  {
    // 15
    id: id.usinaNuclear,
    name: "Usina Nuclear",
    region: "zona-devastada",
    neighbors: [id.minaAbandonada, id.cidadeSubmersa, id.canionEcos, id.torreAnomalia, id.santuarioProibido],
    position: { x: 1195, y: 485 },
    characteristic: "Reator em opera\xE7\xE3o sem operadores h\xE1 doze anos.",
    poi: { kind: "TRANSPORT", description: "Transporte Especial recarrega mais r\xE1pido" }
  },
  {
    // 16
    id: id.portoMercenario,
    name: "Porto Mercen\xE1rio",
    region: "costa-sombria",
    neighbors: [id.valeIndustrial, id.arquipelagoNegro, id.docaEnferrujada, id.laboratorioMarinho],
    position: { x: 310, y: 440 },
    characteristic: "Ancoradouro sem bandeira. Tudo se compra."
  },
  {
    // 17
    id: id.arquipelagoNegro,
    name: "Arquip\xE9lago Negro",
    region: "costa-sombria",
    neighbors: [id.portoMercenario, id.laboratorioMarinho, id.farolAbismo],
    position: { x: 205, y: 545 },
    characteristic: "Ilhas de rocha vulc\xE2nica ligadas por passagens submersas."
  },
  {
    // 18
    id: id.docaEnferrujada,
    name: "Doca Enferrujada",
    region: "costa-sombria",
    neighbors: [id.colinasTitanio, id.portoMercenario, id.laboratorioMarinho],
    position: { x: 400, y: 430 },
    characteristic: "Estaleiro de navios de guerra desmontados."
  },
  {
    // 19
    id: id.laboratorioMarinho,
    name: "Laborat\xF3rio Marinho",
    region: "costa-sombria",
    neighbors: [id.portoMercenario, id.arquipelagoNegro, id.docaEnferrujada, id.farolAbismo],
    position: { x: 330, y: 560 },
    characteristic: "Complexo submerso com energia pr\xF3pria.",
    poi: { kind: "CARD_SWAP", description: "Troca 1 carta por turno na fase CARTAS" }
  },
  {
    // 20
    id: id.farolAbismo,
    name: "Farol do Abismo",
    region: "costa-sombria",
    neighbors: [id.laboratorioMarinho, id.arquipelagoNegro, id.vilaDesolada, id.pantanoToxico],
    position: { x: 385, y: 710 },
    characteristic: "O feixe ainda gira. Ningu\xE9m sabe quem o mant\xE9m."
  },
  {
    // 21
    id: id.selvaDensa,
    name: "Selva Densa",
    region: "floresta-corrompida",
    neighbors: [id.valeIndustrial, id.capitalContinental, id.temploAntigo, id.vilaDesolada, id.crateraCentral],
    position: { x: 665, y: 500 },
    characteristic: "Vegeta\xE7\xE3o que engoliu uma prov\xEDncia inteira."
  },
  {
    // 22
    id: id.temploAntigo,
    name: "Templo Antigo",
    region: "floresta-corrompida",
    neighbors: [id.selvaDensa, id.pantanoToxico, id.vilaDesolada, id.crateraCentral],
    position: { x: 695, y: 650 },
    characteristic: "Estrutura anterior ao Colapso, e talvez \xE0 humanidade."
  },
  {
    // 23
    id: id.pantanoToxico,
    name: "P\xE2ntano T\xF3xico",
    region: "floresta-corrompida",
    neighbors: [id.farolAbismo, id.temploAntigo, id.vilaDesolada, id.troncoGigante],
    position: { x: 545, y: 720 },
    characteristic: "\xC1gua parada que dissolve metal."
  },
  {
    // 24
    id: id.vilaDesolada,
    name: "Vila Desolada",
    region: "floresta-corrompida",
    neighbors: [id.farolAbismo, id.temploAntigo, id.pantanoToxico, id.troncoGigante, id.selvaDensa],
    position: { x: 600, y: 790 },
    characteristic: "Casas intactas, mesas postas, ningu\xE9m."
  },
  {
    // 25
    id: id.troncoGigante,
    name: "Tronco Gigante",
    region: "floresta-corrompida",
    neighbors: [id.pantanoToxico, id.vilaDesolada, id.nucleoColapso, id.campoRuinas],
    position: { x: 745, y: 830 },
    characteristic: "Uma \xFAnica \xE1rvore com altura de arranha-c\xE9u."
  },
  {
    // 26
    id: id.crateraCentral,
    name: "Cratera Central",
    region: "zona-impacto",
    neighbors: [id.redutoComando, id.minaAbandonada, id.selvaDensa, id.temploAntigo, id.torreAnomalia, id.campoRuinas],
    position: { x: 930, y: 580 },
    characteristic: "O ponto exato onde o continente rachou."
  },
  {
    // 27
    id: id.torreAnomalia,
    name: "Torre da Anomalia",
    region: "zona-impacto",
    neighbors: [id.usinaNuclear, id.crateraCentral, id.santuarioProibido, id.nucleoColapso],
    position: { x: 1120, y: 620 },
    characteristic: "Estrutura que n\xE3o estava l\xE1 antes do Colapso.",
    poi: { kind: "FORESIGHT", description: "Pr\xE9-alerta de Evento do Colapso" }
  },
  {
    // 28
    id: id.campoRuinas,
    name: "Campo de Ru\xEDnas",
    region: "zona-impacto",
    neighbors: [id.troncoGigante, id.crateraCentral, id.nucleoColapso],
    position: { x: 920, y: 725 },
    characteristic: "Escombros de uma cidade que ningu\xE9m consegue nomear."
  },
  {
    // 29
    id: id.santuarioProibido,
    name: "Santu\xE1rio Proibido",
    region: "zona-impacto",
    neighbors: [id.usinaNuclear, id.torreAnomalia, id.nucleoColapso],
    position: { x: 1210, y: 720 },
    characteristic: "\xC1rea interditada por um protocolo que ningu\xE9m pode cancelar."
  },
  {
    // 30
    id: id.nucleoColapso,
    name: "N\xFAcleo do Colapso",
    region: "zona-impacto",
    neighbors: [id.troncoGigante, id.campoRuinas, id.santuarioProibido, id.torreAnomalia],
    position: { x: 1055, y: 805 },
    characteristic: "A fonte. Ainda pulsa.",
    poi: { kind: "REINFORCEMENT", description: "+1 refor\xE7o por turno enquanto controlado" }
  }
];
var REGION_SEEDS = [
  {
    id: "fronteira-norte",
    name: "Fronteira Norte",
    bonus: 4,
    color: "#6fb2e8",
    description: "Gelo, a\xE7o e as \xFAltimas fortalezas que resistiram ao inverno.",
    territoryIds: [id.fortalezaBoreal, id.planiciesGelidas, id.complexoArtico, id.portoFerro, id.cidadeFantasma]
  },
  {
    id: "terras-centrais",
    name: "Terras Centrais",
    bonus: 4,
    color: "#5ec27a",
    description: "O cora\xE7\xE3o do continente. Tudo passa por aqui \u2014 e por isso tudo ataca aqui.",
    territoryIds: [id.colinasTitanio, id.valeIndustrial, id.capitalContinental, id.represaEstilhacada, id.redutoComando]
  },
  {
    id: "zona-devastada",
    name: "Zona Devastada",
    bonus: 2,
    color: "#e0913c",
    description: "Deserto de cinzas e instala\xE7\xF5es que nunca deveriam ter sido religadas.",
    territoryIds: [id.desertoCinzas, id.canionEcos, id.minaAbandonada, id.cidadeSubmersa, id.usinaNuclear]
  },
  {
    id: "costa-sombria",
    name: "Costa Sombria",
    bonus: 2,
    color: "#9b7de0",
    description: "Portos, arquip\xE9lagos e o que o mar trouxe de volta.",
    territoryIds: [id.portoMercenario, id.arquipelagoNegro, id.docaEnferrujada, id.laboratorioMarinho, id.farolAbismo]
  },
  {
    id: "floresta-corrompida",
    name: "Floresta Corrompida",
    bonus: 4,
    color: "#3fc9b0",
    description: "Selva que cresceu sobre o Colapso e absorveu o que encontrou.",
    territoryIds: [id.selvaDensa, id.temploAntigo, id.pantanoToxico, id.vilaDesolada, id.troncoGigante]
  },
  {
    id: "zona-impacto",
    name: "Zona de Impacto",
    bonus: 4,
    color: "#e05252",
    description: "O epicentro. A anomalia continua aberta e continua chamando.",
    territoryIds: [id.crateraCentral, id.torreAnomalia, id.campoRuinas, id.santuarioProibido, id.nucleoColapso]
  }
];
var SPECIAL_LINKS = [
  { kind: "MARITIMA", name: "Canal Mercen\xE1rio", a: id.portoMercenario, b: id.arquipelagoNegro },
  { kind: "MARITIMA", name: "Passagem Submersa", a: id.arquipelagoNegro, b: id.laboratorioMarinho },
  { kind: "MARITIMA", name: "Rota do Abismo", a: id.arquipelagoNegro, b: id.farolAbismo },
  { kind: "MARITIMA", name: "Fenda Inundada", a: id.canionEcos, b: id.cidadeSubmersa },
  { kind: "MARITIMA", name: "Enseada T\xF3xica", a: id.farolAbismo, b: id.pantanoToxico }
];

// src/game/factions/humanos.ts
var HUMANOS_ID = factionId("humanos");
var HUMANOS = {
  id: HUMANOS_ID,
  name: "Humanos",
  subtitle: "Adapta\xE7\xE3o \xB7 Tecnologia \xB7 Controle T\xE1tico",
  description: "Remanescentes das antigas estruturas civis e militares. Compensam a falta de n\xFAmeros com log\xEDstica, resgate e medicina de guerra.",
  lore: [
    "Quando as redes ca\xEDram, o que restou das for\xE7as armadas n\xE3o tentou retomar o mundo: tentou manter um per\xEDmetro. Bases, hospitais de campanha e comboios viraram o novo mapa.",
    "A doutrina humana nasceu dessa escassez. N\xE3o se ganha territ\xF3rio gastando gente \u2014 ganha-se chegando onde o inimigo n\xE3o esperava, e trazendo de volta quem outros dariam por perdido.",
    "Helic\xF3pteros s\xE3o o s\xEDmbolo dessa escolha. Enquanto houver rota a\xE9rea, nenhum territ\xF3rio humano est\xE1 realmente isolado."
  ],
  color: "#2f6fed",
  secondaryColor: "#8fb4ff",
  contrastColor: "#f5f9ff",
  symbol: "\u{1F6E1}\uFE0F",
  emblem: { key: "humanos.emblem", placeholder: "\u{1F6E1}\uFE0F" },
  image: { key: "humanos.portrait", placeholder: "\u{1F681}" },
  music: { key: "humanos.theme", placeholder: "tema-humanos" },
  sounds: {
    select: { key: "humanos.select", placeholder: "radio-check" },
    ability: { key: "humanos.ability", placeholder: "rotor" }
  },
  strategy: {
    pillars: ["Adapta\xE7\xE3o", "Tecnologia", "Controle T\xE1tico"],
    strengths: [
      "Mobilidade: alcan\xE7am territ\xF3rios sem fronteira comum",
      "Recupera\xE7\xE3o: convertem tropas inimigas em suas",
      "Resposta defensiva com contramedidas m\xE9dicas"
    ],
    weaknesses: [
      "Poucos recursos ativos por partida \u2014 dependem de escolher a hora certa",
      "Sem vantagem bruta de ataque ou defesa"
    ],
    difficulty: 2
  },
  startingSoldiersPerTerritory: 3,
  units: [
    {
      id: "humanos.infantry",
      name: "Infantaria",
      description: "Unidade padr\xE3o. Unidades especiais chegam em etapa futura."
    }
  ],
  passiveAbilityIds: ["ability.humanos.engenharia-tatica"],
  activeAbilityIds: ["ability.humanos.logistica-adaptativa"],
  signatureCardIds: ["card.sequestro"],
  commanders: [],
  // Aguardando definição do criador.
  visualEffects: ["searchlight", "rotor-dust", "medical-glow"],
  animationIds: ["anim.sequestro", "anim.vacina", "anim.sobrevivencia", "anim.operacao-aerea"],
  modifiers: {},
  rules: {
    // ENGENHARIA TÁTICA: tradução mecânica de "defesas mais resistentes".
    fortifiedFrom: 4,
    balance: { ataque: 3, defesa: 3, mobilidade: 4, cartas: 4, recuperacao: 4 }
  },
  status: "ACTIVE"
};

// src/game/factions/roster.ts
var ALIENIGENAS_ID = factionId("alienigenas");
var ZUMBIS_ID = factionId("zumbis");
var VAMPIROS_ID = factionId("vampiros");
var MAGOS_ID = factionId("magos");
var GOBLINS_ID = factionId("goblins");
var ALIENIGENAS = {
  id: ALIENIGENAS_ID,
  name: "Alien\xEDgenas",
  subtitle: "Evolu\xE7\xE3o \xB7 Supremacia \xB7 Tecnologia Avan\xE7ada",
  description: "N\xE3o vieram atr\xE1s de territ\xF3rio: vieram atr\xE1s de material gen\xE9tico. Cada conquista alimenta a pr\xF3xima muta\xE7\xE3o.",
  lore: [
    "As naves n\xE3o desceram no dia do Colapso. Desceram tr\xEAs semanas depois, quando a atmosfera parou de interferir \u2014 como se estivessem esperando.",
    "A tecnologia deles n\xE3o se parece com nada constru\xEDdo: parece cultivada. Naves com casco org\xE2nico, armas que respiram.",
    "Onde passam, o terreno fica limpo. Limpo demais."
  ],
  color: "#A855F7",
  secondaryColor: "#D8B4FE",
  contrastColor: "#1a0a2e",
  symbol: "\u{1F47D}",
  emblem: { key: "alienigenas.emblem", placeholder: "\u{1F47D}" },
  strategy: {
    pillars: ["Evolu\xE7\xE3o", "Supremacia", "Tecnologia Avan\xE7ada"],
    strengths: [
      "Evolu\xE7\xE3o Biol\xF3gica: cada conquista concede uma muta\xE7\xE3o tempor\xE1ria",
      "Telepatia Coletiva revela ex\xE9rcitos antes do ataque",
      "Invas\xE3o Orbital dizima um territ\xF3rio inteiro de uma vez"
    ],
    weaknesses: [
      "Fr\xE1geis fora da pr\xF3pria rede: perder territ\xF3rio custa tamb\xE9m uma carta",
      "Defesa apenas mediana"
    ],
    difficulty: 4
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: "alienigenas.drone", name: "Drone", description: "Unidade b\xE1sica de reconhecimento." },
    { id: "alienigenas.guerreiro", name: "Guerreiro", description: "Infantaria de assalto." },
    { id: "alienigenas.cacador", name: "Ca\xE7ador", description: "Unidade r\xE1pida de persegui\xE7\xE3o." },
    { id: "alienigenas.devorador", name: "Devorador", description: "Unidade pesada de absor\xE7\xE3o." },
    { id: "alienigenas.nave", name: "Nave", description: "Unidade a\xE9rea." },
    { id: "alienigenas.colosso", name: "Colosso", description: "Unidade de elite." }
  ],
  passiveAbilityIds: ["ability.alienigenas.evolucao-biologica"],
  activeAbilityIds: ["ability.alienigenas.telepatia-coletiva"],
  signatureCardIds: ["card.invasao-orbital"],
  commanders: [],
  visualEffects: ["orbital-beam", "mutation-glow"],
  animationIds: ["anim.invasao-orbital"],
  modifiers: {},
  rules: {
    conquestMutation: 1,
    discardOnTerritoryLost: true,
    balance: { ataque: 4, defesa: 3, mobilidade: 4, cartas: 4, recuperacao: 3 }
  },
  status: "ACTIVE",
  provisional: true
};
var ZUMBIS = {
  id: ZUMBIS_ID,
  name: "Zumbis",
  subtitle: "Infesta\xE7\xE3o \xB7 Massa \xB7 Impar\xE1vel",
  description: "N\xE3o h\xE1 comando, n\xE3o h\xE1 recuo, n\xE3o h\xE1 estrat\xE9gia declarada. H\xE1 press\xE3o \u2014 e cada territ\xF3rio tomado devolve mais corpos ao avan\xE7o.",
  lore: [
    "Os primeiros surgiram nos setores onde a conten\xE7\xE3o sanit\xE1ria continuou operando sem supervis\xE3o m\xE9dica. O protocolo mandava manter os corpos funcionando. Ele continua sendo executado.",
    "A infesta\xE7\xE3o n\xE3o conquista: ocupa. E o que ocupa, n\xE3o devolve.",
    "A fraqueza \xE9 a pr\xF3pria natureza: massa demais num lugar s\xF3 apodrece."
  ],
  color: "#7FD32E",
  secondaryColor: "#C6E86A",
  contrastColor: "#0f1a06",
  symbol: "\u{1F480}",
  emblem: { key: "zumbis.emblem", placeholder: "\u{1F480}" },
  strategy: {
    pillars: ["Infesta\xE7\xE3o", "Massa", "Impar\xE1vel"],
    strengths: [
      "Infesta\xE7\xE3o: cada conquista rende +1 soldado adicional",
      "Contamina\xE7\xE3o corr\xF3i territ\xF3rios inimigos sem gastar ataque",
      "Surto injeta 5 soldados de uma vez"
    ],
    weaknesses: [
      "Massa inst\xE1vel: pilhas grandes apodrecem sozinhas",
      "Mobilidade baixa \u2014 n\xE3o reposiciona a tempo"
    ],
    difficulty: 3
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: "zumbis.zumbi", name: "Zumbi", description: "Unidade b\xE1sica." },
    { id: "zumbis.rapido", name: "Zumbi R\xE1pido", description: "Unidade de investida." },
    { id: "zumbis.bruto", name: "Bruto", description: "Unidade pesada." },
    { id: "zumbis.devorador", name: "Devorador", description: "Unidade de consumo." },
    { id: "zumbis.contaminador", name: "Contaminador", description: "Unidade de suporte." },
    { id: "zumbis.abominacao", name: "Abomina\xE7\xE3o", description: "Unidade de elite." }
  ],
  passiveAbilityIds: ["ability.zumbis.infestacao"],
  activeAbilityIds: ["ability.zumbis.contaminacao"],
  signatureCardIds: ["card.surto"],
  commanders: [],
  visualEffects: ["spore-cloud", "infection-spread"],
  animationIds: ["anim.surto"],
  modifiers: {},
  rules: {
    conquestConversion: 1,
    conquestConversionPerTurn: 3,
    overcrowdThreshold: 9,
    balance: { ataque: 5, defesa: 4, mobilidade: 2, cartas: 3, recuperacao: 4 }
  },
  status: "ACTIVE",
  provisional: true
};
var VAMPIROS = {
  id: VAMPIROS_ID,
  name: "Vampiros",
  subtitle: "Aristocracia \xB7 Sangue \xB7 Noite",
  description: "Estavam aqui antes, escondidos sob a estrutura do velho mundo. Quando a luz caiu, deixaram de precisar se esconder.",
  lore: [
    'As casas nobres n\xE3o sobreviveram ao Colapso: elas o esperavam. Os arquivos antigos falam de contratos de terra assinados h\xE1 s\xE9culos, com cl\xE1usulas que s\xF3 valeriam "quando a rede silenciar".',
    "N\xE3o constroem. Ocupam o que j\xE1 existe e o tornam mais escuro.",
    "O que tomam pelo sangue, devolvem em soldados."
  ],
  color: "#D42A3A",
  secondaryColor: "#FF7B85",
  contrastColor: "#1c0507",
  symbol: "\u{1FA78}",
  emblem: { key: "vampiros.emblem", placeholder: "\u{1FA78}" },
  strategy: {
    pillars: ["Aristocracia Sombria", "Energia Sangu\xEDnea", "For\xE7as Noturnas"],
    strengths: [
      "Regenera\xE7\xE3o: territ\xF3rios feridos se recomp\xF5em ao final do turno",
      "Enxame Noturno drena o inimigo e alimenta o pr\xF3prio ex\xE9rcito",
      "Pacto de Sangue converte perdas alheias em ganho pr\xF3prio"
    ],
    weaknesses: [
      "Avers\xE3o \xE0 luz: n\xE3o recebem b\xF4nus de Ponto de Interesse",
      "Dependem de fronteira ativa \u2014 recuados, n\xE3o se alimentam"
    ],
    difficulty: 4
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: "vampiros.servo", name: "Servo", description: "Unidade b\xE1sica." },
    { id: "vampiros.carniceiro", name: "Carniceiro", description: "Infantaria pesada." },
    { id: "vampiros.morcego", name: "Enxame", description: "Unidade r\xE1pida." },
    { id: "vampiros.nobre", name: "Nobre", description: "Unidade de comando." },
    { id: "vampiros.carruagem", name: "Carruagem Negra", description: "Unidade de transporte." },
    { id: "vampiros.senhor", name: "Senhor da Noite", description: "Unidade de elite." }
  ],
  passiveAbilityIds: ["ability.vampiros.regeneracao"],
  activeAbilityIds: ["ability.vampiros.enxame-noturno"],
  signatureCardIds: ["card.pacto-de-sangue"],
  commanders: [],
  visualEffects: ["blood-mist", "night-veil"],
  animationIds: ["anim.pacto-de-sangue"],
  modifiers: {},
  rules: {
    regenerateWoundedTerritories: 2,
    ignorePoiBonus: true,
    balance: { ataque: 4, defesa: 4, mobilidade: 3, cartas: 3, recuperacao: 4 }
  },
  status: "ACTIVE",
  provisional: true
};
var MAGOS = {
  id: MAGOS_ID,
  name: "Magos",
  subtitle: "Arcano \xB7 Energia \xB7 Altera\xE7\xE3o",
  description: "N\xE3o \xE9 feiti\xE7aria antiga: \xE9 o que sobrou quando as leis f\xEDsicas soltaram. Eles aprenderam a ler a fratura e a apont\xE1-la.",
  lore: [
    "Chamaram de magia porque n\xE3o havia outra palavra. O Colapso deixou campos residuais que reorganizam mat\xE9ria \u2014 e algumas pessoas passaram a ressoar com eles.",
    "Runas, portais e c\xEDrculos n\xE3o s\xE3o tradi\xE7\xE3o: s\xE3o interface. A \xFAnica que funciona com o que a rede virou.",
    "Sabem mais do que atacam. \xC9 por isso que duram."
  ],
  color: "#E0952A",
  secondaryColor: "#FFD98A",
  contrastColor: "#1f1304",
  symbol: "\u{1F702}",
  emblem: { key: "magos.emblem", placeholder: "\u{1F702}" },
  strategy: {
    pillars: ["Arcano", "Energia", "Altera\xE7\xE3o"],
    strengths: [
      "Conhecimento Arcano: 1 carta adicional por turno",
      "Teletransporte Arcano move tropas ignorando fronteiras",
      "Ritual Maior atinge todos os ex\xE9rcitos de um territ\xF3rio"
    ],
    weaknesses: [
      "Inst\xE1veis: cada Evento do Colapso de AMEA\xC7A custa 1 soldado a mais",
      "Combate direto apenas mediano"
    ],
    difficulty: 5
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: "magos.acolito", name: "Ac\xF3lito", description: "Unidade b\xE1sica." },
    { id: "magos.feiticeiro", name: "Feiticeiro", description: "Unidade de ataque arcano." },
    { id: "magos.mago", name: "Mago", description: "Unidade de controle." },
    { id: "magos.elemental", name: "Elemental", description: "Unidade invocada." },
    { id: "magos.golem", name: "Golem Arcano", description: "Unidade pesada." },
    { id: "magos.dragao", name: "Drag\xE3o Arcano", description: "Unidade de elite." }
  ],
  passiveAbilityIds: ["ability.magos.conhecimento-arcano"],
  activeAbilityIds: ["ability.magos.teletransporte-arcano"],
  signatureCardIds: ["card.ritual-maior"],
  commanders: [],
  visualEffects: ["rune-circle", "arcane-portal"],
  animationIds: ["anim.ritual-maior"],
  modifiers: {},
  rules: {
    extraCardDrawPerTurn: 1,
    collapseFragility: true,
    balance: { ataque: 3, defesa: 3, mobilidade: 4, cartas: 5, recuperacao: 3 }
  },
  status: "ACTIVE",
  provisional: true
};
var GOBLINS = {
  id: GOBLINS_ID,
  name: "Goblins",
  subtitle: "Trapa\xE7a \xB7 Agilidade \xB7 Oportunismo",
  description: "N\xE3o t\xEAm ex\xE9rcito: t\xEAm oficina. Tudo que explode, rola ou dispara foi montado com sucata de outra guerra.",
  lore: [
    "Ningu\xE9m sabe de onde sa\xEDram em tal quantidade. A teoria mais aceita \xE9 que sempre estiveram l\xE1, esperando o mundo ficar bagun\xE7ado o bastante.",
    "Constroem catapultas com pe\xE7as de avi\xE3o e bombas com tanque de g\xE1s. Metade explode na hora errada. A outra metade ganha a batalha.",
    "Roubam antes de lutar. Muitas vezes, roubam em vez de lutar."
  ],
  // COR DA EQUIPE ≠ COR DA CRIATURA: a identificação Goblin é AMARELA.
  color: "#F7D02E",
  secondaryColor: "#FFF0A0",
  contrastColor: "#1f1a02",
  symbol: "\u{1F47A}",
  emblem: { key: "goblins.emblem", placeholder: "\u{1F47A}" },
  strategy: {
    pillars: ["Trapa\xE7a", "Agilidade", "Oportunismo"],
    strengths: [
      "Saque R\xE1pido: cada conquista rende uma carta",
      "Emboscada posiciona goblins ocultos antes do combate",
      "Armadilha Explosiva pune quem entrar no territ\xF3rio"
    ],
    weaknesses: [
      "Nunca recebem o b\xF4nus total de regi\xE3o completa (metade)",
      "Defesa fr\xE1gil: quantidade n\xE3o substitui posi\xE7\xE3o"
    ],
    difficulty: 3
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: "goblins.batedor", name: "Goblin Batedor", description: "Unidade de reconhecimento." },
    { id: "goblins.arqueiro", name: "Goblin Arqueiro", description: "Unidade de alcance." },
    { id: "goblins.sabotador", name: "Goblin Sabotador", description: "Unidade de sabotagem." },
    { id: "goblins.trapaceiro", name: "Goblin Trapaceiro", description: "Unidade de emboscada." },
    { id: "goblins.catapulta", name: "Goblin Catapulta", description: "Unidade de cerco." },
    { id: "goblins.balonista", name: "Goblin Balonista", description: "Unidade a\xE9rea." }
  ],
  passiveAbilityIds: ["ability.goblins.saque-rapido"],
  activeAbilityIds: ["ability.goblins.emboscada"],
  signatureCardIds: ["card.armadilha-explosiva"],
  commanders: [],
  visualEffects: ["scrap-sparks", "explosive-trap"],
  animationIds: ["anim.armadilha-explosiva"],
  modifiers: {},
  rules: {
    drawOnConquest: 1,
    regionBonusMultiplier: 0.5,
    freeSpecialAttack: true,
    balance: { ataque: 4, defesa: 2, mobilidade: 5, cartas: 4, recuperacao: 3 }
  },
  status: "ACTIVE",
  provisional: true
};
var REMANESCENTES_ID = factionId("remanescentes");
var REMANESCENTES = {
  id: REMANESCENTES_ID,
  name: "Remanescentes",
  subtitle: "Quem ficou quando todo mundo escolheu um lado",
  description: "Territ\xF3rios neutros. Defendem-se e nada mais.",
  lore: [],
  color: "#6b7280",
  secondaryColor: "#9ca3af",
  contrastColor: "#0f1115",
  symbol: "\u25C7",
  strategy: { pillars: ["Neutro"], strengths: [], weaknesses: [], difficulty: 1 },
  startingSoldiersPerTerritory: 2,
  units: [],
  passiveAbilityIds: [],
  activeAbilityIds: [],
  signatureCardIds: [],
  commanders: [],
  visualEffects: [],
  animationIds: [],
  modifiers: {},
  rules: {},
  status: "LOCKED"
};
var ROSTER = [ALIENIGENAS, ZUMBIS, VAMPIROS, MAGOS, GOBLINS];

// src/game/factions/tecnologos.ts
var TECNOLOGOS_ID = factionId("tecnologos");
var TECNOLOGOS = {
  id: TECNOLOGOS_ID,
  name: "Tecn\xF3logos",
  subtitle: "Engenharia \xB7 Automa\xE7\xE3o \xB7 Supremacia Industrial",
  description: "N\xE3o lutam: produzem. Cada turno sai da linha de montagem mais material do que o inimigo consegue destruir.",
  lore: [
    "Herdaram as f\xE1bricas autom\xE1ticas que continuaram rodando depois do Colapso e passaram a aliment\xE1-las de prop\xF3sito.",
    "Mechs, torres e drones saem do p\xE1tio prontos. O oper\xE1rio \xE9 o recurso mais escasso, n\xE3o a m\xE1quina."
  ],
  color: "#E03B3B",
  secondaryColor: "#FF8A8A",
  contrastColor: "#1c0606",
  symbol: "\u2699\uFE0F",
  emblem: { key: "tecnologos.emblem", placeholder: "\u2699\uFE0F" },
  strategy: {
    pillars: ["Engenharia", "Automa\xE7\xE3o", "Supremacia Industrial"],
    strengths: [
      "Produ\xE7\xE3o em S\xE9rie: 1 tropa extra por turno",
      "Protocolo de Guerra dobra o ataque de uma unidade por rodada",
      "Arsenal Avan\xE7ado despeja 3 unidades de apoio no campo"
    ],
    weaknesses: [
      "Arsenal Avan\xE7ado obriga a descartar 1 carta ao final do turno",
      "Mobilidade limitada: m\xE1quinas pesadas n\xE3o reposicionam"
    ],
    difficulty: 2
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: "tecnologos.operario", name: "Oper\xE1rio", description: "Unidade b\xE1sica." },
    { id: "tecnologos.sentinela", name: "Sentinela", description: "Unidade defensiva." },
    { id: "tecnologos.mech", name: "Mech", description: "Unidade pesada." },
    { id: "tecnologos.tanque", name: "Tanque", description: "Ve\xEDculo blindado." },
    { id: "tecnologos.torre", name: "Torre", description: "Estrutura de suporte." },
    { id: "tecnologos.aviao", name: "Avi\xE3o de Ataque", description: "Unidade a\xE9rea." }
  ],
  passiveAbilityIds: ["ability.tecnologos.producao-em-serie"],
  activeAbilityIds: [],
  signatureCardIds: ["card.arsenal-avancado"],
  commanders: [],
  visualEffects: ["assembly-sparks", "servo-glow"],
  animationIds: ["anim.arsenal-avancado"],
  modifiers: {},
  rules: {
    borderReinforceOnQuietTurn: 1,
    maxSoldiersPerMove: 3,
    balance: { ataque: 4, defesa: 5, mobilidade: 1, cartas: 4, recuperacao: 4 }
  },
  status: "TEST_ONLY",
  provisional: true
};

// src/game/factions/faction.registry.ts
var REGISTRY = new Map(
  [HUMANOS, ...ROSTER, TECNOLOGOS, REMANESCENTES].map((f) => [f.id, f])
);
function getFaction(id2) {
  const faction = REGISTRY.get(id2);
  if (!faction) throw new Error(`Fac\xE7\xE3o desconhecida: ${id2}`);
  return faction;
}
function tryGetFaction(id2) {
  return REGISTRY.get(id2);
}

// src/game/cards/signature.cards.ts
var SIGNATURE_ANIMATION = {
  id: "anim.signature",
  name: "Carta assinatura",
  beats: [
    { kind: "HIGHLIGHT", durationMs: 220 },
    { kind: "ENERGY_BURST", durationMs: 420 },
    { kind: "REVEAL", durationMs: 260 }
  ]
};
var SPECS = [
  {
    slug: "invasao-orbital",
    name: "Invas\xE3o Orbital",
    factionId: ALIENIGENAS_ID,
    playType: "OFENSIVA",
    category: "OPERACAO",
    description: "Escolha um territ\xF3rio inimigo. Todas as unidades naquele territ\xF3rio perdem at\xE9 3 soldados.",
    action: { type: "ORBITAL_STRIKE", amount: 3 },
    emoji: "\u{1F6F8}",
    palette: ["#1a0a2e", "#A855F7"],
    fromReference: true
  },
  {
    slug: "surto",
    name: "Surto",
    factionId: ZUMBIS_ID,
    playType: "TATICA",
    category: "SUPORTE",
    description: "Adicione instantaneamente 5 soldados, distribu\xEDdos como desejar em territ\xF3rios que voc\xEA controla.",
    action: { type: "GAIN_TROOPS", amount: 5 },
    emoji: "\u2623\uFE0F",
    palette: ["#0f1a06", "#7FD32E"],
    fromReference: true
  },
  {
    slug: "pacto-de-sangue",
    name: "Pacto de Sangue",
    factionId: VAMPIROS_ID,
    playType: "OFENSIVA",
    category: "OPERACAO",
    description: "Escolha um territ\xF3rio inimigo e role 1D6: ele perde essa quantidade de soldados e voc\xEA ganha metade (arredondada para baixo) em um territ\xF3rio seu vizinho.",
    action: { type: "BLOOD_PACT", diceSides: 6 },
    emoji: "\u{1FA78}",
    palette: ["#1c0507", "#D42A3A"],
    fromReference: false
  },
  {
    slug: "ritual-maior",
    name: "Ritual Maior",
    factionId: MAGOS_ID,
    playType: "OFENSIVA",
    category: "EVENTO",
    description: "Escolha um territ\xF3rio. Todos os jogadores naquele territ\xF3rio rolam 1D6 e perdem essa quantidade de soldados.",
    action: { type: "RITUAL", diceSides: 6 },
    emoji: "\u{1F702}",
    palette: ["#1f1304", "#E0952A"],
    fromReference: true
  },
  {
    slug: "armadilha-explosiva",
    name: "Armadilha Explosiva",
    factionId: GOBLINS_ID,
    playType: "DEFENSIVA",
    category: "DEFESA",
    description: "Escolha um territ\xF3rio. No in\xEDcio do turno do pr\xF3ximo jogador que entrar nele, ele sofre 3 de dano (perde 3 soldados).",
    action: { type: "TRAP", damage: 3, rounds: 3 },
    emoji: "\u{1F4A3}",
    palette: ["#1f1a02", "#F7D02E"],
    fromReference: true
  },
  {
    slug: "arsenal-avancado",
    name: "Arsenal Avan\xE7ado",
    factionId: TECNOLOGOS_ID,
    playType: "TATICA",
    category: "SUPORTE",
    description: "Adicione 3 unidades de apoio ao campo de batalha. Descarte 1 carta no final do turno.",
    action: { type: "GAIN_TROOPS", amount: 3, discardAtEndOfTurn: 1 },
    emoji: "\u2699\uFE0F",
    palette: ["#1c0606", "#E03B3B"],
    fromReference: true
  }
];
function build(spec) {
  return {
    id: cardDefinitionId(`card.${spec.slug}`),
    name: spec.name,
    factionId: spec.factionId,
    category: spec.category,
    playType: spec.playType,
    description: spec.description,
    maxUses: 1,
    conditions: spec.playType === "REATIVA" ? [{ type: "HAS_PENDING_ATTACK_AGAINST_OWNER" }] : [{ type: "IS_CURRENT_PLAYER" }, { type: "PHASE_IS", phases: ["CARTAS"] }],
    primaryEffect: {
      id: `effect.${spec.slug}`,
      name: spec.name,
      description: spec.description,
      conditions: [],
      action: spec.action,
      animation: SIGNATURE_ANIMATION
    },
    alternateEffect: null,
    art: { key: `card.${spec.slug}`, emoji: spec.emoji, palette: spec.palette }
  };
}
var SIGNATURE_CARDS = SPECS.map(build);
var SIGNATURE_BY_FACTION = {
  [ALIENIGENAS_ID]: "card.invasao-orbital",
  [ZUMBIS_ID]: "card.surto",
  [VAMPIROS_ID]: "card.pacto-de-sangue",
  [MAGOS_ID]: "card.ritual-maior",
  [GOBLINS_ID]: "card.armadilha-explosiva",
  [TECNOLOGOS_ID]: "card.arsenal-avancado"
};
var SIGNATURE_FROM_REFERENCE = SPECS.filter((s) => s.fromReference).map((s) => s.slug);

// src/game/cards/animations/sequestro.animation.ts
var SEQUESTRO_ANIMATION = {
  id: "anim.sequestro",
  name: "Extra\xE7\xE3o A\xE9rea",
  beats: [
    { kind: "HELICOPTER_ENTER", durationMs: 1200, sound: "heli_approach" },
    { kind: "ROTOR_SPIN", durationMs: 0, sound: "rotor_loop" },
    { kind: "SEARCHLIGHT", durationMs: 800 },
    { kind: "APPROACH_TERRITORY", durationMs: 900, sound: "heli_hover" },
    { kind: "DUST", durationMs: 600 },
    { kind: "SELECT_SOLDIERS", durationMs: 700 },
    { kind: "HOIST_SOLDIERS", durationMs: 1400, sound: "winch" },
    { kind: "PARTICLES", durationMs: 500 },
    { kind: "HELICOPTER_EXIT", durationMs: 1200, sound: "heli_departure" }
  ]
};

// src/game/cards/animations/vacina.animation.ts
var VACINA_ANIMATION = {
  id: "anim.vacina",
  name: "Contramedida Biol\xF3gica",
  beats: [
    { kind: "SHIELD_RAISE", durationMs: 700, sound: "shield_up" },
    { kind: "ENERGY_BURST", durationMs: 600, sound: "energy" },
    { kind: "VACCINE_INJECT", durationMs: 900, sound: "inject" },
    { kind: "DICE_APPEAR", durationMs: 400 },
    { kind: "DICE_ROLL", durationMs: 1200, sound: "dice_roll" },
    { kind: "DICE_RESULT", durationMs: 600 },
    { kind: "TROOPS_ELIMINATED", durationMs: 900, sound: "impact" }
  ]
};

// src/game/config/balance.ts
var BALANCE = {
  territory: {
    minGarrison: 1,
    woundedBelow: 3
  },
  reinforcements: {
    minimum: 3,
    territoriesPerExtraTroop: 3
  },
  setup: {
    troopsPerTerritory: 3,
    seatCompensation: 1,
    neutralGarrison: 2,
    territoriesPerPlayer: { 2: 10, 3: 10, 4: 7, 5: 6, 6: 5 }
  },
  dice: {
    defaultSides: 6,
    maxSides: 20,
    maxAttackDice: 3,
    maxDefenseDice: 3,
    maritimeAttackDice: 2
  },
  movement: {
    perTurn: 1,
    coastalRouteLimit: 3
  },
  transport: {
    startingCharges: 1,
    maxCharges: 1,
    rechargeEveryRounds: 4,
    rechargeWithDepotRounds: 3,
    maxChargesWithDepot: 2,
    maxSoldiers: 3,
    range: 2
  },
  deck: {
    handLimit: 5,
    compensationAfterTurns: 3
  },
  collapse: {
    baseChance: 0.12,
    pressureStep: 0.08,
    maxChance: 0.6,
    cooldownRounds: 2,
    firstRound: 3,
    maxPerGame: 6
  },
  victory: {
    roundLimit: 25
  },
  cards: {
    sequestro: {
      maxTargets: 7,
      maxUses: 1
    },
    vacina: {
      diceSides: 6
    }
  },
  abilities: {
    sobrevivencia: {
      maxTerritories: 3,
      bonusTroops: 1
    },
    operacaoAerea: {
      usesPerGame: 2,
      usesPerTurn: 1,
      cooldownTurns: 0,
      minLeftBehind: 1,
      allowedPhases: ["MOVIMENTACAO"]
    }
  },
  effects: {
    historySize: 20,
    maxResolutionsPerCycle: 64
  }
};

// src/game/cards/sequestro.card.ts
var SEQUESTRO_CARD_ID = cardDefinitionId("card.sequestro");
var SEQUESTRO_MAX_TARGETS = BALANCE.cards.sequestro.maxTargets;
var VACINA_DICE_SIDES = BALANCE.cards.vacina.diceSides;
var SEQUESTRO_CARD = {
  id: SEQUESTRO_CARD_ID,
  name: "Sequestro",
  factionId: HUMANOS_ID,
  category: "OPERACAO",
  playType: "OFENSIVA",
  description: "Opera\xE7\xE3o de extra\xE7\xE3o a\xE9rea humana. Pode ser usada para capturar tropas inimigas ou, defensivamente, como contramedida biol\xF3gica. Um uso consome a carta.",
  maxUses: BALANCE.cards.sequestro.maxUses,
  // Sem condição de "jogador do turno" no nível da carta: o uso defensivo
  // acontece justamente no turno do adversário. Cada efeito declara as suas.
  conditions: [],
  primaryEffect: {
    id: "effect.sequestro",
    name: "Sequestro",
    description: "Escolha at\xE9 7 soldados de um time advers\xE1rio. Eles deixam o territ\xF3rio inimigo, passam a integrar o ex\xE9rcito Humano e podem ser redistribu\xEDdos livremente entre os seus territ\xF3rios.",
    conditions: [
      { type: "IS_CURRENT_PLAYER" },
      { type: "PHASE_IS", phases: ["CARTAS"] },
      { type: "ENEMY_SOLDIERS_AVAILABLE", min: 1 }
    ],
    limits: { maxTargets: SEQUESTRO_MAX_TARGETS },
    action: { type: "SEQUESTRO" },
    animation: SEQUESTRO_ANIMATION
  },
  alternateEffect: {
    id: "effect.vacina",
    name: "Vacina / Contra-Ataque",
    description: "Ao ser atacado, ative a contramedida: role 1 dado de 6 faces. O resultado define quantos soldados atacantes s\xE3o destru\xEDdos (limitado ao total de atacantes).",
    conditions: [{ type: "HAS_PENDING_ATTACK_AGAINST_OWNER" }],
    limits: { diceSides: VACINA_DICE_SIDES },
    action: { type: "VACINA" },
    animation: VACINA_ANIMATION
  },
  art: {
    key: "sequestro",
    emoji: "\u{1F681}",
    palette: ["#1b2a4a", "#2f6fed"]
  }
};

// src/game/soldiers/soldier.ts
function nextSoldierId(draft) {
  draft.counters.soldier += 1;
  return soldierId(`sol-${draft.counters.soldier}`);
}
function createSoldier(draft, params) {
  const id2 = nextSoldierId(draft);
  const soldier = {
    id: id2,
    type: params.type ?? "INFANTRY",
    factionId: params.factionId,
    ownerId: params.ownerId,
    location: { kind: "TERRITORY", territoryId: params.territoryId },
    status: "READY",
    alive: true,
    origin: { factionId: params.factionId, ownerId: params.ownerId }
  };
  draft.soldiers[id2] = soldier;
  const territory = draft.territories[params.territoryId];
  if (!territory) throw new Error(`Territ\xF3rio inexistente: ${params.territoryId}`);
  territory.garrison.push(id2);
  return soldier;
}
function getSoldier(state, id2) {
  const soldier = state.soldiers[id2];
  if (!soldier) throw new Error(`Soldado inexistente: ${id2}`);
  return soldier;
}
function detach(draft, soldier) {
  if (soldier.location.kind === "TERRITORY") {
    const territory = draft.territories[soldier.location.territoryId];
    if (territory) {
      territory.garrison = territory.garrison.filter((sid) => sid !== soldier.id);
    }
  }
}
function placeInTerritory(draft, id2, target) {
  const soldier = getSoldier(draft, id2);
  if (!soldier.alive) throw new Error(`Soldado eliminado n\xE3o pode ser posicionado: ${id2}`);
  const territory = draft.territories[target];
  if (!territory) throw new Error(`Territ\xF3rio inexistente: ${target}`);
  detach(draft, soldier);
  soldier.location = { kind: "TERRITORY", territoryId: target };
  if (!territory.garrison.includes(id2)) territory.garrison.push(id2);
}
function moveToReserve(draft, id2, owner) {
  const soldier = getSoldier(draft, id2);
  detach(draft, soldier);
  soldier.location = { kind: "RESERVE", playerId: owner };
}
function eliminateSoldier(draft, id2) {
  const soldier = getSoldier(draft, id2);
  if (!soldier.alive) return;
  detach(draft, soldier);
  soldier.alive = false;
  soldier.status = "ELIMINATED";
  soldier.location = { kind: "ELIMINATED" };
  soldier.lostAtRound = draft.turn.number;
}
function captureSoldier(draft, id2, captor) {
  const soldier = getSoldier(draft, id2);
  moveToReserve(draft, id2, captor.playerId);
  soldier.factionId = captor.factionId;
  soldier.ownerId = captor.playerId;
  soldier.status = "CAPTURED";
}
function soldiersInTerritory(state, id2) {
  const territory = state.territories[id2];
  if (!territory) return [];
  return territory.garrison.map((sid) => getSoldier(state, sid)).filter((s) => s.alive);
}

// src/game/map/territory.ts
function getTerritory(state, id2) {
  const territory = state.territories[id2];
  if (!territory) throw new Error(`Territ\xF3rio inexistente: ${id2}`);
  return territory;
}
function listTerritories(state) {
  return Object.values(state.territories);
}
function territoriesOf(state, owner) {
  return listTerritories(state).filter((t) => t.controllerId === owner);
}
function syncPlayerTerritories(draft) {
  for (const player of Object.values(draft.players)) player.territoryIds = [];
  for (const territory of Object.values(draft.territories)) {
    if (!territory.controllerId) continue;
    const player = draft.players[territory.controllerId];
    if (player) player.territoryIds.push(territory.id);
  }
}

// src/game/types/turn.types.ts
var TURN_PHASES = [
  "REFORCO",
  "ATAQUE_COMUM",
  "ATAQUE_ESPECIAL",
  "MOVIMENTACAO",
  "CARTAS",
  "FIM_TURNO"
];

// src/game/turns/phases.ts
var PHASE_LABELS = {
  REFORCO: "Refor\xE7o",
  ATAQUE_COMUM: "Ataque Comum",
  ATAQUE_ESPECIAL: "Ataque Especial",
  MOVIMENTACAO: "Movimenta\xE7\xE3o",
  CARTAS: "Cartas",
  FIM_TURNO: "Finalizar Turno"
};
var PHASE_ORDER = TURN_PHASES;
function isLastPhase(phase) {
  return phase === PHASE_ORDER[PHASE_ORDER.length - 1];
}
function nextPhase(phase) {
  const index = PHASE_ORDER.indexOf(phase);
  if (index < 0) throw new Error(`Fase desconhecida: ${phase}`);
  return PHASE_ORDER[(index + 1) % PHASE_ORDER.length];
}

// src/game/abilities/animations/ability.animations.ts
var SOBREVIVENCIA_ANIMATION = {
  id: "anim.sobrevivencia",
  name: "Chamado de Refor\xE7o",
  beats: [
    { kind: "ENERGY_BURST", durationMs: 400, sound: "radio_static" },
    { kind: "SEARCHLIGHT", durationMs: 500 },
    { kind: "APPROACH_TERRITORY", durationMs: 900, sound: "convoy" },
    { kind: "DUST", durationMs: 500 },
    { kind: "PARTICLES", durationMs: 400 }
  ]
};
var OPERACAO_AEREA_ANIMATION = {
  id: "anim.operacao-aerea",
  name: "Ponte A\xE9rea",
  beats: [
    { kind: "SEARCHLIGHT", durationMs: 600, sound: "radio" },
    { kind: "HELICOPTER_ENTER", durationMs: 1100, sound: "heli_approach" },
    { kind: "ROTOR_SPIN", durationMs: 0, sound: "rotor_loop" },
    { kind: "HOIST_SOLDIERS", durationMs: 1e3, sound: "boarding" },
    { kind: "APPROACH_TERRITORY", durationMs: 1400, sound: "heli_cruise" },
    { kind: "DUST", durationMs: 500 },
    { kind: "HELICOPTER_EXIT", durationMs: 900, sound: "heli_departure" }
  ]
};

// src/game/abilities/humanos/sobrevivencia.ts
var SOBREVIVENCIA_ID = "ability.humanos.sobrevivencia";
var SOBREVIVENCIA = {
  id: SOBREVIVENCIA_ID,
  factionId: HUMANOS_ID,
  name: "Sobreviv\xEAncia",
  description: `Ao iniciar o turno controlando ${BALANCE.abilities.sobrevivencia.maxTerritories} territ\xF3rio(s) ou menos, recebe +${BALANCE.abilities.sobrevivencia.bonusTroops} refor\xE7o.`,
  kind: "PASSIVE",
  triggers: ["TURN_STARTED"],
  conditions: [
    { type: "IS_CURRENT_PLAYER" },
    { type: "TERRITORY_COUNT_AT_MOST", value: BALANCE.abilities.sobrevivencia.maxTerritories }
  ],
  // Passiva: sem cargas, mas o limite por turno impede bônus duplicado.
  usage: { scope: "PER_TURN", perTurn: 1 },
  produceEffects: (context) => [
    {
      kind: "GRANT_REINFORCEMENTS",
      playerId: context.playerId,
      amount: BALANCE.abilities.sobrevivencia.bonusTroops
    }
  ],
  feedback: {
    title: "SOBREVIV\xCANCIA ATIVADA",
    detail: () => `+${BALANCE.abilities.sobrevivencia.bonusTroops} REFOR\xC7O`
  },
  animation: SOBREVIVENCIA_ANIMATION,
  provisional: true
};

// src/game/abilities/humanos/operacaoAerea.ts
var OPERACAO_AEREA_ID = "ability.humanos.operacao-aerea";
function readParams(params) {
  if (!params) return null;
  const { from, to, amount } = params;
  if (typeof from !== "string" || typeof to !== "string") return null;
  if (typeof amount !== "number") return null;
  return { from, to, amount };
}
var OPERACAO_AEREA = {
  id: OPERACAO_AEREA_ID,
  factionId: HUMANOS_ID,
  name: "Opera\xE7\xE3o A\xE9rea",
  description: `Transporta tropas entre dois territ\xF3rios seus, mesmo que n\xE3o sejam vizinhos. A origem mant\xE9m ao menos ${BALANCE.abilities.operacaoAerea.minLeftBehind} soldado(s).`,
  kind: "ACTIVE",
  // Ativa: não dispara por evento, é acionada pelo jogador.
  triggers: [],
  conditions: [
    { type: "IS_CURRENT_PLAYER" },
    { type: "PHASE_IS", phases: BALANCE.abilities.operacaoAerea.allowedPhases },
    { type: "NO_PENDING_OCCUPATION" }
  ],
  usage: {
    scope: "PER_GAME",
    charges: BALANCE.abilities.operacaoAerea.usesPerGame,
    perTurn: BALANCE.abilities.operacaoAerea.usesPerTurn,
    cooldownTurns: BALANCE.abilities.operacaoAerea.cooldownTurns
  },
  validateParams: (context) => {
    const params = readParams(context.params);
    if (!params) return { ok: false, error: "Informe origem, destino e quantidade." };
    const { state, playerId: playerId2 } = context;
    const from = state.territories[params.from];
    const to = state.territories[params.to];
    if (!from || !to) return { ok: false, error: "Territ\xF3rio inexistente." };
    if (from.id === to.id) return { ok: false, error: "Origem e destino s\xE3o o mesmo territ\xF3rio." };
    if (from.controllerId !== playerId2) {
      return { ok: false, error: "A origem precisa ser um territ\xF3rio seu." };
    }
    if (to.controllerId !== playerId2) {
      return { ok: false, error: "O destino precisa ser um territ\xF3rio seu." };
    }
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      return { ok: false, error: "Quantidade inv\xE1lida." };
    }
    const available = soldiersInTerritory(state, from.id).length;
    const minLeft = BALANCE.abilities.operacaoAerea.minLeftBehind;
    if (available - params.amount < minLeft) {
      return {
        ok: false,
        error: `\xC9 obrigat\xF3rio deixar ao menos ${minLeft} soldado(s) em ${from.name}.`
      };
    }
    return { ok: true };
  },
  produceEffects: (context) => {
    const params = readParams(context.params);
    if (!params) return [];
    return [
      {
        kind: "MOVE_TROOPS",
        from: params.from,
        to: params.to,
        amount: params.amount,
        // É exatamente o que a habilidade compra: ignorar a fronteira.
        ignoreAdjacency: true,
        minLeftBehind: BALANCE.abilities.operacaoAerea.minLeftBehind
      }
    ];
  },
  feedback: {
    title: "OPERA\xC7\xC3O A\xC9REA",
    detail: (context) => {
      const params = readParams(context.params);
      if (!params) return "";
      const from = context.state.territories[params.from]?.name ?? "???";
      const to = context.state.territories[params.to]?.name ?? "???";
      return `${from} \u2192 ${to} \xB7 ${params.amount} soldado(s)`;
    }
  },
  animation: OPERACAO_AEREA_ANIMATION,
  provisional: true
};

// src/game/map/regions.ts
function listRegions() {
  return REGION_SEEDS;
}
function getRegion(id2) {
  const region = REGION_SEEDS.find((r) => r.id === id2);
  if (!region) throw new Error(`Regi\xE3o desconhecida: ${id2}`);
  return region;
}
function regionOfTerritory(id2) {
  return REGION_SEEDS.find((r) => r.territoryIds.includes(id2));
}
function completedRegions(state, player) {
  return REGION_SEEDS.filter(
    (region) => region.territoryIds.every((id2) => state.territories[id2]?.controllerId === player)
  );
}
function linkKey(a, b) {
  return [a, b].sort().join("::");
}
var SPECIAL_BY_KEY = new Map(
  SPECIAL_LINKS.map((link) => [linkKey(link.a, link.b), link])
);
function listSpecialLinks() {
  return SPECIAL_LINKS;
}
function specialLinkBetween(a, b) {
  return SPECIAL_BY_KEY.get(linkKey(a, b));
}
function isLinkKind(a, b, kind) {
  return specialLinkBetween(a, b)?.kind === kind;
}
function isLinkDisabled(state, a, b) {
  return state.disabledLinks.some((entry) => entry.key === linkKey(a, b));
}
function disableLink(draft, a, b, untilRound) {
  const key = linkKey(a, b);
  const existing = draft.disabledLinks.find((entry) => entry.key === key);
  if (existing) {
    existing.untilRound = Math.max(existing.untilRound, untilRound);
    return;
  }
  draft.disabledLinks.push({ key, a, b, untilRound });
}
function expireDisabledLinks(draft) {
  const restored = [];
  draft.disabledLinks = draft.disabledLinks.filter((entry) => {
    if (entry.untilRound > draft.turn.number) return true;
    const link = SPECIAL_BY_KEY.get(entry.key);
    if (link) restored.push(link);
    return false;
  });
  return restored;
}

// src/game/map/adjacency.ts
function neighborsOf(state, id2) {
  return getTerritory(state, id2).neighbors.filter((n) => !isLinkDisabled(state, id2, n)).map((n) => getTerritory(state, n));
}
function staticNeighborsOf(state, id2) {
  return getTerritory(state, id2).neighbors.map((n) => getTerritory(state, n));
}
function isAdjacent(state, from, to) {
  return getTerritory(state, from).neighbors.includes(to) && !isLinkDisabled(state, from, to);
}
function distanceBetween(state, from, to) {
  if (from === to) return 0;
  const seen = /* @__PURE__ */ new Set([from]);
  let frontier = [from];
  let distance = 0;
  while (frontier.length > 0 && distance < 8) {
    distance += 1;
    const next = [];
    for (const current of frontier) {
      for (const neighbor of neighborsOf(state, current)) {
        if (neighbor.id === to) return distance;
        if (seen.has(neighbor.id)) continue;
        seen.add(neighbor.id);
        next.push(neighbor.id);
      }
    }
    frontier = next;
  }
  return Infinity;
}

// src/game/abilities/roster.abilities.ts
var PULSE = {
  id: "anim.ability.pulse",
  name: "Habilidade de fac\xE7\xE3o",
  beats: [
    { kind: "HIGHLIGHT", durationMs: 200 },
    { kind: "ENERGY_BURST", durationMs: 420 }
  ]
};
function passive(params) {
  return {
    id: params.id,
    factionId: params.factionId,
    name: params.name,
    description: params.description,
    kind: "PASSIVE",
    triggers: ["TURN_STARTED"],
    conditions: [{ type: "IS_CURRENT_PLAYER" }],
    usage: { scope: "PER_TURN", perTurn: 1 },
    // A regra contínua é aplicada pelo motor a partir de `faction.rules`.
    produceEffects: () => [],
    feedback: { title: params.title },
    provisional: true
  };
}
var ENGENHARIA_TATICA_ID = "ability.humanos.engenharia-tatica";
var LOGISTICA_ADAPTATIVA_ID = "ability.humanos.logistica-adaptativa";
var ENGENHARIA_TATICA = passive({
  id: ENGENHARIA_TATICA_ID,
  factionId: HUMANOS_ID,
  name: "Engenharia T\xE1tica",
  description: "Posi\xE7\xF5es humanas s\xE3o constru\xEDdas para durar: territ\xF3rios seus com 4 ou mais soldados fazem o atacante rolar 1 dado a menos.",
  title: "ENGENHARIA T\xC1TICA"
});
var LOGISTICA_ADAPTATIVA = {
  id: LOGISTICA_ADAPTATIVA_ID,
  factionId: HUMANOS_ID,
  name: "Log\xEDstica Adaptativa",
  description: "Uma vez por turno, escolha um territ\xF3rio seu e receba 2 tropas nele.",
  kind: "ACTIVE",
  triggers: ["ABILITY_ACTIVATED"],
  conditions: [{ type: "IS_CURRENT_PLAYER" }, { type: "NO_PENDING_OCCUPATION" }],
  usage: { scope: "PER_TURN", perTurn: 1 },
  validateParams: (context) => {
    const territoryId2 = context.params?.territoryId;
    if (!territoryId2) return { ok: false, error: "Escolha um territ\xF3rio seu." };
    const territory = context.state.territories[territoryId2];
    if (!territory) return { ok: false, error: "Territ\xF3rio inexistente." };
    if (territory.controllerId !== context.playerId) {
      return { ok: false, error: `${territory.name} n\xE3o \xE9 seu.` };
    }
    return { ok: true };
  },
  produceEffects: (context) => {
    const territoryId2 = context.params?.territoryId;
    return [{ kind: "ADD_TROOPS", territoryId: territoryId2, amount: 2, ownerId: context.playerId }];
  },
  feedback: { title: "LOG\xCDSTICA ADAPTATIVA", detail: () => "+2 TROPAS" },
  animation: PULSE,
  provisional: true
};
var EVOLUCAO_BIOLOGICA_ID = "ability.alienigenas.evolucao-biologica";
var TELEPATIA_COLETIVA_ID = "ability.alienigenas.telepatia-coletiva";
var EVOLUCAO_BIOLOGICA = passive({
  id: EVOLUCAO_BIOLOGICA_ID,
  factionId: ALIENIGENAS_ID,
  name: "Evolu\xE7\xE3o Biol\xF3gica",
  description: "Suas unidades evoluem: ao conquistar um territ\xF3rio, voc\xEA ganha 1 soldado extra nele.",
  title: "EVOLU\xC7\xC3O BIOL\xD3GICA"
});
var TELEPATIA_COLETIVA = {
  id: TELEPATIA_COLETIVA_ID,
  factionId: ALIENIGENAS_ID,
  name: "Telepatia Coletiva",
  description: "Revele os ex\xE9rcitos em at\xE9 2 territ\xF3rios adjacentes ao alvo escolhido.",
  kind: "ACTIVE",
  triggers: ["ABILITY_ACTIVATED"],
  conditions: [{ type: "IS_CURRENT_PLAYER" }],
  usage: { scope: "PER_TURN", perTurn: 1 },
  validateParams: (context) => {
    const territoryId2 = context.params?.territoryId;
    if (!territoryId2) return { ok: false, error: "Escolha um territ\xF3rio alvo." };
    if (!context.state.territories[territoryId2]) {
      return { ok: false, error: "Territ\xF3rio inexistente." };
    }
    return { ok: true };
  },
  produceEffects: (context) => [
    { kind: "REVEAL_INFO", playerId: context.playerId, scope: "NEIGHBORS" }
  ],
  feedback: {
    title: "TELEPATIA COLETIVA",
    detail: (context) => {
      const territoryId2 = context.params?.territoryId;
      if (!territoryId2) return "";
      const around = neighborsOf(context.state, territoryId2).slice(0, 2).map((t) => `${t.name}: ${t.garrison.length}`);
      return around.join(" \xB7 ");
    }
  },
  animation: PULSE,
  provisional: true
};
var INFESTACAO_ID = "ability.zumbis.infestacao";
var CONTAMINACAO_ID = "ability.zumbis.contaminacao";
var INFESTACAO = passive({
  id: INFESTACAO_ID,
  factionId: ZUMBIS_ID,
  name: "Infesta\xE7\xE3o",
  description: "Ao conquistar um territ\xF3rio, receba +1 soldado adicional (m\xE1ximo +3 por turno).",
  title: "INFESTA\xC7\xC3O"
});
var CONTAMINACAO = {
  id: CONTAMINACAO_ID,
  factionId: ZUMBIS_ID,
  name: "Contamina\xE7\xE3o",
  description: "Escolha 1 territ\xF3rio inimigo adjacente a um territ\xF3rio seu: ele perde 1 soldado.",
  kind: "ACTIVE",
  triggers: ["ABILITY_ACTIVATED"],
  conditions: [{ type: "IS_CURRENT_PLAYER" }, { type: "PHASE_IS", phases: ["REFORCO"] }],
  usage: { scope: "PER_TURN", perTurn: 1 },
  validateParams: (context) => {
    const territoryId2 = context.params?.territoryId;
    if (!territoryId2) return { ok: false, error: "Escolha um territ\xF3rio inimigo adjacente." };
    const target = context.state.territories[territoryId2];
    if (!target) return { ok: false, error: "Territ\xF3rio inexistente." };
    if (!target.controllerId || target.controllerId === context.playerId) {
      return { ok: false, error: "O alvo precisa ser inimigo." };
    }
    const adjacent = territoriesOf(context.state, context.playerId).some(
      (own) => own.neighbors.includes(territoryId2)
    );
    if (!adjacent) return { ok: false, error: "O alvo precisa ser adjacente a um territ\xF3rio seu." };
    if (target.garrison.length <= BALANCE.territory.minGarrison) {
      return { ok: false, error: "O alvo j\xE1 est\xE1 no m\xEDnimo de guarni\xE7\xE3o." };
    }
    return { ok: true };
  },
  produceEffects: (context) => [
    { kind: "REMOVE_TROOPS", territoryId: context.params?.territoryId, amount: 1 }
  ],
  feedback: { title: "CONTAMINA\xC7\xC3O", detail: () => "\u22121 SOLDADO INIMIGO" },
  animation: PULSE,
  provisional: true
};
var REGENERACAO_ID = "ability.vampiros.regeneracao";
var ENXAME_NOTURNO_ID = "ability.vampiros.enxame-noturno";
var REGENERACAO = passive({
  id: REGENERACAO_ID,
  factionId: VAMPIROS_ID,
  name: "Regenera\xE7\xE3o",
  description: "Ao final do seu turno, at\xE9 2 territ\xF3rios seus que perderam soldados nesta rodada recuperam 1 soldado cada.",
  title: "REGENERA\xC7\xC3O"
});
var ENXAME_NOTURNO = {
  id: ENXAME_NOTURNO_ID,
  factionId: VAMPIROS_ID,
  name: "Enxame Noturno",
  description: "Escolha um territ\xF3rio inimigo adjacente: ele perde 1 soldado e voc\xEA ganha 1 no seu territ\xF3rio vizinho.",
  kind: "ACTIVE",
  triggers: ["ABILITY_ACTIVATED"],
  conditions: [{ type: "IS_CURRENT_PLAYER" }, { type: "NO_PENDING_OCCUPATION" }],
  usage: { scope: "PER_TURN", perTurn: 1 },
  validateParams: (context) => {
    const territoryId2 = context.params?.territoryId;
    if (!territoryId2) return { ok: false, error: "Escolha um territ\xF3rio inimigo adjacente." };
    const target = context.state.territories[territoryId2];
    if (!target) return { ok: false, error: "Territ\xF3rio inexistente." };
    if (!target.controllerId || target.controllerId === context.playerId) {
      return { ok: false, error: "O alvo precisa ser inimigo." };
    }
    if (target.garrison.length <= BALANCE.territory.minGarrison) {
      return { ok: false, error: "O alvo j\xE1 est\xE1 no m\xEDnimo de guarni\xE7\xE3o." };
    }
    const source = territoriesOf(context.state, context.playerId).find(
      (own) => own.neighbors.includes(territoryId2)
    );
    if (!source) return { ok: false, error: "O alvo precisa ser adjacente a um territ\xF3rio seu." };
    return { ok: true };
  },
  produceEffects: (context) => {
    const territoryId2 = context.params?.territoryId;
    const source = territoriesOf(context.state, context.playerId).find(
      (own) => own.neighbors.includes(territoryId2)
    );
    return [
      { kind: "REMOVE_TROOPS", territoryId: territoryId2, amount: 1 },
      { kind: "ADD_TROOPS", territoryId: source.id, amount: 1, ownerId: context.playerId }
    ];
  },
  feedback: { title: "ENXAME NOTURNO", detail: () => "\u22121 INIMIGO \xB7 +1 SEU" },
  animation: PULSE,
  provisional: true
};
var CONHECIMENTO_ARCANO_ID = "ability.magos.conhecimento-arcano";
var TELETRANSPORTE_ARCANO_ID = "ability.magos.teletransporte-arcano";
var CONHECIMENTO_ARCANO = passive({
  id: CONHECIMENTO_ARCANO_ID,
  factionId: MAGOS_ID,
  name: "Conhecimento Arcano",
  description: "Voc\xEA compra 1 carta adicional por turno.",
  title: "CONHECIMENTO ARCANO"
});
var TELETRANSPORTE_ARCANO = {
  id: TELETRANSPORTE_ARCANO_ID,
  factionId: MAGOS_ID,
  name: "Teletransporte Arcano",
  description: "Mova at\xE9 4 soldados entre dois territ\xF3rios que voc\xEA controla, ignorando fronteiras.",
  kind: "ACTIVE",
  triggers: ["ABILITY_ACTIVATED"],
  conditions: [
    { type: "IS_CURRENT_PLAYER" },
    { type: "PHASE_IS", phases: ["MOVIMENTACAO"] },
    { type: "NO_PENDING_OCCUPATION" }
  ],
  usage: { scope: "PER_TURN", perTurn: 1 },
  validateParams: (context) => {
    const from = context.params?.from;
    const to = context.params?.to;
    const amount = Number(context.params?.amount ?? 0);
    if (!from || !to) return { ok: false, error: "Escolha origem e destino." };
    if (from === to) return { ok: false, error: "Origem e destino precisam ser diferentes." };
    const origin = context.state.territories[from];
    const target = context.state.territories[to];
    if (!origin || !target) return { ok: false, error: "Territ\xF3rio inexistente." };
    if (origin.controllerId !== context.playerId || target.controllerId !== context.playerId) {
      return { ok: false, error: "Os dois territ\xF3rios precisam ser seus." };
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 4) {
      return { ok: false, error: "Mova de 1 a 4 soldados." };
    }
    if (origin.garrison.length - amount < BALANCE.territory.minGarrison) {
      return { ok: false, error: "\xC9 obrigat\xF3rio deixar ao menos 1 soldado na origem." };
    }
    return { ok: true };
  },
  produceEffects: (context) => [
    {
      kind: "MOVE_TROOPS",
      from: context.params?.from,
      to: context.params?.to,
      amount: Number(context.params?.amount ?? 1),
      ignoreAdjacency: true,
      minLeftBehind: BALANCE.territory.minGarrison
    }
  ],
  feedback: {
    title: "TELETRANSPORTE ARCANO",
    detail: (context) => `${context.params?.amount ?? 0} SOLDADO(S)`
  },
  animation: PULSE,
  provisional: true
};
var SAQUE_RAPIDO_ID = "ability.goblins.saque-rapido";
var EMBOSCADA_ID = "ability.goblins.emboscada";
var SAQUE_RAPIDO = passive({
  id: SAQUE_RAPIDO_ID,
  factionId: GOBLINS_ID,
  name: "Saque R\xE1pido",
  description: "Ao conquistar um territ\xF3rio, compre 1 carta.",
  title: "SAQUE R\xC1PIDO"
});
var EMBOSCADA = {
  id: EMBOSCADA_ID,
  factionId: GOBLINS_ID,
  name: "Emboscada",
  description: "Prepare at\xE9 3 goblins ocultos em um territ\xF3rio seu: quem o atacar rola 1 dado a menos at\xE9 o seu pr\xF3ximo turno.",
  kind: "ACTIVE",
  triggers: ["ABILITY_ACTIVATED"],
  conditions: [{ type: "IS_CURRENT_PLAYER" }],
  usage: { scope: "PER_TURN", perTurn: 1 },
  validateParams: (context) => {
    const territoryId2 = context.params?.territoryId;
    if (!territoryId2) return { ok: false, error: "Escolha um territ\xF3rio seu." };
    const territory = context.state.territories[territoryId2];
    if (!territory) return { ok: false, error: "Territ\xF3rio inexistente." };
    if (territory.controllerId !== context.playerId) {
      return { ok: false, error: `${territory.name} n\xE3o \xE9 seu.` };
    }
    return { ok: true };
  },
  produceEffects: (context) => [
    {
      kind: "PROTECT_TERRITORY",
      territoryId: context.params?.territoryId,
      turns: 1,
      ownerId: context.playerId,
      source: EMBOSCADA_ID,
      attackerDiceReduction: 1
    }
  ],
  feedback: { title: "EMBOSCADA", detail: () => "ATACANTE COM 1 DADO A MENOS" },
  animation: PULSE,
  provisional: true
};
var PRODUCAO_EM_SERIE_ID = "ability.tecnologos.producao-em-serie";
var PRODUCAO_EM_SERIE = passive({
  id: PRODUCAO_EM_SERIE_ID,
  factionId: TECNOLOGOS_ID,
  name: "Produ\xE7\xE3o em S\xE9rie",
  description: "Suas f\xE1bricas produzem 1 tropa extra por turno em um territ\xF3rio de fronteira.",
  title: "PRODU\xC7\xC3O EM S\xC9RIE"
});
var ROSTER_ABILITIES = [
  ENGENHARIA_TATICA,
  LOGISTICA_ADAPTATIVA,
  EVOLUCAO_BIOLOGICA,
  TELEPATIA_COLETIVA,
  INFESTACAO,
  CONTAMINACAO,
  REGENERACAO,
  ENXAME_NOTURNO,
  CONHECIMENTO_ARCANO,
  TELETRANSPORTE_ARCANO,
  SAQUE_RAPIDO,
  EMBOSCADA,
  PRODUCAO_EM_SERIE
];

// src/game/abilities/ability.registry.ts
var REGISTRY2 = new Map(
  [SOBREVIVENCIA, OPERACAO_AEREA, ...ROSTER_ABILITIES].map((ability) => [ability.id, ability])
);
function getAbility(id2) {
  const ability = REGISTRY2.get(id2);
  if (!ability) throw new Error(`Habilidade desconhecida: ${id2}`);
  return ability;
}
function tryGetAbility(id2) {
  return REGISTRY2.get(id2);
}
function listAbilities() {
  return [...REGISTRY2.values()];
}
function abilitiesOfFaction(factionId2) {
  return listAbilities().filter((a) => a.factionId === null || a.factionId === factionId2);
}

// src/game/cards/neutral.cards.ts
var SIMPLE_ANIMATION = {
  id: "anim.card.simple",
  name: "Uso de carta",
  beats: [{ kind: "HIGHLIGHT", durationMs: 240 }]
};
var SPECS2 = [
  {
    slug: "reconhecimento",
    name: "Reconhecimento",
    playType: "TATICA",
    category: "SUPORTE",
    description: "Veja a m\xE3o de um advers\xE1rio \xE0 sua escolha.",
    copies: 3,
    action: { type: "REVEAL_HAND" },
    emoji: "\u{1F52D}",
    palette: ["#2b3d52", "#63859f"]
  },
  {
    slug: "suprimentos",
    name: "Suprimentos",
    playType: "TATICA",
    category: "SUPORTE",
    description: "Receba 3 soldados e distribua livremente entre territ\xF3rios seus.",
    copies: 3,
    action: { type: "GAIN_TROOPS", amount: 3 },
    emoji: "\u{1F4E6}",
    palette: ["#3d4a2b", "#8aa456"]
  },
  {
    slug: "emboscada",
    name: "Emboscada",
    playType: "REATIVA",
    category: "DEFESA",
    description: "Ao ser atacado: o atacante perde 1 soldado antes da primeira rodada de dados.",
    copies: 2,
    action: { type: "AMBUSH", amount: 1 },
    emoji: "\u{1FAA4}",
    palette: ["#472b2b", "#a5604f"]
  },
  {
    slug: "barricada",
    name: "Barricada",
    playType: "DEFENSIVA",
    category: "DEFESA",
    description: "At\xE9 seu pr\xF3ximo turno, um territ\xF3rio seu n\xE3o pode ser alvo de Ataque Especial.",
    copies: 2,
    action: { type: "SHIELD", rounds: 1, blockSpecialAttack: true },
    emoji: "\u{1F9F1}",
    palette: ["#4a4136", "#a08a6c"]
  },
  {
    slug: "sabotagem",
    name: "Sabotagem",
    playType: "OFENSIVA",
    category: "OPERACAO",
    description: "Um territ\xF3rio inimigo perde 1 soldado (nunca abaixo de 1).",
    copies: 2,
    action: { type: "SABOTAGE", amount: 1 },
    emoji: "\u{1F4A5}",
    palette: ["#52252b", "#b0505c"]
  },
  {
    slug: "rota-alternativa",
    name: "Rota Alternativa",
    playType: "TATICA",
    category: "SUPORTE",
    description: "Realize uma movimenta\xE7\xE3o adicional neste turno.",
    copies: 2,
    action: { type: "EXTRA_MOVE", amount: 1 },
    emoji: "\u{1F9ED}",
    palette: ["#2c4448", "#5f9aa0"]
  },
  {
    slug: "interferencia",
    name: "Interfer\xEAncia",
    playType: "REATIVA",
    category: "DEFESA",
    description: "O pr\xF3ximo Ataque Comum contra voc\xEA nesta rodada usa no m\xE1ximo 2 dados.",
    copies: 2,
    action: { type: "DICE_CAP_INCOMING", value: 2 },
    emoji: "\u{1F4E1}",
    palette: ["#2f3350", "#6f76b5"]
  },
  {
    slug: "moral-elevado",
    name: "Moral Elevado",
    playType: "OFENSIVA",
    category: "OPERACAO",
    description: "Na batalha em que voc\xEA ataca: uma vez, relance o seu dado mais baixo.",
    copies: 2,
    action: { type: "REROLL_LOWEST", side: "ATTACKER" },
    emoji: "\u{1F396}\uFE0F",
    palette: ["#4d3a1f", "#c19341"]
  },
  {
    slug: "terreno-conhecido",
    name: "Terreno Conhecido",
    playType: "REATIVA",
    category: "DEFESA",
    description: "Na batalha em que voc\xEA defende: uma vez, relance o seu dado mais baixo.",
    copies: 2,
    action: { type: "REROLL_LOWEST", side: "DEFENDER" },
    emoji: "\u{1F5FA}\uFE0F",
    palette: ["#2e4034", "#6f9a72"]
  },
  {
    slug: "evacuacao",
    name: "Evacua\xE7\xE3o",
    playType: "TATICA",
    category: "SUPORTE",
    description: "Mova at\xE9 3 soldados de um territ\xF3rio seu para outro territ\xF3rio seu n\xE3o adjacente.",
    copies: 2,
    action: { type: "EVACUATE", amount: 3 },
    emoji: "\u{1F6A8}",
    palette: ["#3a2c47", "#8a6bad"]
  },
  {
    slug: "radio-pirata",
    name: "R\xE1dio Pirata",
    playType: "TATICA",
    category: "EVENTO",
    description: "Veja qual ser\xE1 o pr\xF3ximo Evento do Colapso a ser revelado.",
    copies: 1,
    action: { type: "PEEK_COLLAPSE" },
    emoji: "\u{1F4FB}",
    palette: ["#4a3520", "#c08a3e"]
  },
  {
    slug: "desercao",
    name: "Deser\xE7\xE3o",
    playType: "OFENSIVA",
    category: "OPERACAO",
    description: "Escolha um territ\xF3rio inimigo com 4 ou mais soldados: 1 soldado passa para um territ\xF3rio seu adjacente.",
    copies: 1,
    action: { type: "DEFECTION", minEnemyTroops: 4 },
    emoji: "\u{1F3F3}\uFE0F",
    palette: ["#3f3f3f", "#8f8f8f"]
  }
];
function build2(spec) {
  return {
    id: cardDefinitionId(`card.${spec.slug}`),
    name: spec.name,
    factionId: null,
    category: spec.category,
    playType: spec.playType,
    description: spec.description,
    maxUses: 1,
    conditions: spec.playType === "REATIVA" ? [{ type: "HAS_PENDING_ATTACK_AGAINST_OWNER" }] : [{ type: "IS_CURRENT_PLAYER" }, { type: "PHASE_IS", phases: ["CARTAS"] }],
    primaryEffect: {
      id: `effect.${spec.slug}`,
      name: spec.name,
      description: spec.description,
      conditions: [],
      action: spec.action,
      animation: SIMPLE_ANIMATION
    },
    alternateEffect: null,
    art: { key: `card.${spec.slug}`, emoji: spec.emoji, palette: spec.palette }
  };
}
var NEUTRAL_CARDS = SPECS2.map(build2);
var DECK_COMPOSITION = SPECS2.map(
  (spec) => ({ definitionId: cardDefinitionId(`card.${spec.slug}`), copies: spec.copies })
);
var DECK_SIZE = SPECS2.reduce((sum, spec) => sum + spec.copies, 0);

// src/game/cards/card.registry.ts
var REGISTRY3 = new Map(
  [SEQUESTRO_CARD, ...SIGNATURE_CARDS, ...NEUTRAL_CARDS].map((card) => [card.id, card])
);
function getCardDefinition(id2) {
  const card = REGISTRY3.get(id2);
  if (!card) throw new Error(`Carta desconhecida: ${id2}`);
  return card;
}

// src/game/rng/rng.ts
var defaultRng = {
  next: () => Math.random()
};
function seededRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a += 1831565813;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  };
}
function shuffle(items, rng = defaultRng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function pick(items, rng = defaultRng) {
  if (items.length === 0) throw new Error("pick: lista vazia.");
  return items[Math.min(items.length - 1, Math.floor(rng.next() * items.length))];
}
function rollInt(sides, rng = defaultRng) {
  return Math.min(sides, Math.floor(rng.next() * sides) + 1);
}

// src/data/collapseEvents.seed.ts
var COLLAPSE_EVENT_SEEDS = [
  // ---------- GLOBAIS ----------
  {
    id: "collapse.queda-de-tensao",
    name: "Queda de Tens\xE3o",
    categories: ["GLOBAL", "AMEACA"],
    description: "Nesta rodada ningu\xE9m pode usar Ataque Especial. Cargas n\xE3o s\xE3o perdidas.",
    flavor: "A rede cai por inteiro. Nada decola, nada parte.",
    target: "NONE",
    effect: { type: "BLOCK_SPECIAL_ATTACK" },
    duration: 1,
    priority: 10,
    intensity: 3
  },
  {
    id: "collapse.tempestade-de-po",
    name: "Tempestade de P\xF3",
    categories: ["GLOBAL", "AMEACA"],
    description: "Nesta rodada todo atacante rola 1 dado a menos (m\xEDnimo 1).",
    flavor: "A visibilidade cai a tr\xEAs metros em toda a bacia.",
    target: "NONE",
    effect: { type: "ATTACK_DICE_DELTA", delta: -1 },
    duration: 1,
    priority: 20,
    intensity: 4
  },
  {
    id: "collapse.janela-limpa",
    name: "Janela Limpa",
    categories: ["GLOBAL", "OPORTUNIDADE"],
    description: "Nesta rodada cada jogador realiza 1 movimenta\xE7\xE3o adicional.",
    flavor: "O c\xE9u abre. As rotas voltam a existir por algumas horas.",
    target: "NONE",
    effect: { type: "EXTRA_MOVE", amount: 1 },
    duration: 1,
    priority: 30,
    intensity: 2
  },
  {
    id: "collapse.ressuprimento",
    name: "Ressuprimento Autom\xE1tico",
    categories: ["GLOBAL", "OPORTUNIDADE"],
    description: "Cada jogador recebe +2 soldados no pr\xF3ximo refor\xE7o.",
    flavor: "Um dep\xF3sito autom\xE1tico acorda e come\xE7a a distribuir.",
    target: "NONE",
    effect: { type: "REINFORCE_ALL", amount: 2 },
    duration: 1,
    priority: 30,
    intensity: 2
  },
  {
    id: "collapse.censo-da-malha",
    name: "Censo da Malha",
    categories: ["GLOBAL"],
    description: "Quem tiver mais cartas na m\xE3o descarta 1.",
    flavor: "Um invent\xE1rio antigo roda sozinho e confisca o excedente.",
    target: "NONE",
    effect: { type: "DISCARD_LEADER" },
    duration: 0,
    priority: 40,
    intensity: 2
  },
  {
    id: "collapse.arquivo-aberto",
    name: "Arquivo Aberto",
    categories: ["GLOBAL", "OPORTUNIDADE"],
    description: "Cada jogador compra 1 carta do Baralho do Colapso.",
    flavor: "Um servidor esquecido despeja doze anos de registros.",
    target: "NONE",
    effect: { type: "DRAW_ALL", amount: 1 },
    duration: 0,
    priority: 40,
    intensity: 2
  },
  {
    id: "collapse.sobrecarga-defensiva",
    name: "Sobrecarga Defensiva",
    categories: ["GLOBAL", "AMEACA"],
    description: "Nesta rodada todo defensor rola no m\xE1ximo 2 dados.",
    flavor: "Os sistemas de alerta ficam surdos ao mesmo tempo.",
    target: "NONE",
    effect: { type: "DEFENSE_DICE_CAP", value: 2 },
    duration: 1,
    priority: 20,
    intensity: 4
  },
  {
    id: "collapse.corrida-logistica",
    name: "Corrida Log\xEDstica",
    categories: ["GLOBAL", "OPORTUNIDADE"],
    description: "Todos recuperam 1 carga de Transporte Especial.",
    flavor: "Combust\xEDvel de reserva aparece em todos os p\xE1tios ao mesmo tempo.",
    target: "NONE",
    effect: { type: "TRANSPORT_RECHARGE", amount: 1 },
    duration: 0,
    priority: 40,
    intensity: 2
  },
  {
    id: "collapse.greve-de-motores",
    name: "Greve de Motores",
    categories: ["GLOBAL", "AMEACA"],
    description: "Todos perdem as cargas de Transporte Especial acumuladas.",
    flavor: "Nenhum motor pega. Ningu\xE9m sabe explicar.",
    target: "NONE",
    effect: { type: "TRANSPORT_DRAIN" },
    duration: 0,
    priority: 40,
    intensity: 3,
    minRound: 5
  },
  {
    id: "collapse.atrito-de-fronteira",
    name: "Atrito de Fronteira",
    categories: ["GLOBAL", "AMEACA"],
    description: "Todo territ\xF3rio que faz fronteira com um inimigo perde 1 soldado (nunca abaixo de 1).",
    flavor: "A linha de contato inteira sangra ao mesmo tempo.",
    target: "NONE",
    effect: { type: "BORDER_ATTRITION", amount: 1 },
    duration: 0,
    priority: 20,
    intensity: 4,
    minRound: 4
  },
  // ---------- REGIONAIS ----------
  {
    id: "collapse.colapso-estrutural",
    name: "Colapso Estrutural",
    categories: ["REGIONAL", "AMEACA"],
    description: "Cada territ\xF3rio da regi\xE3o sorteada perde 1 soldado (nunca abaixo de 1).",
    flavor: "O ch\xE3o cede em v\xE1rios pontos ao mesmo tempo.",
    target: "REGION",
    effect: { type: "REGION_LOSE_TROOPS", amount: 1 },
    duration: 0,
    priority: 20,
    intensity: 3
  },
  {
    id: "collapse.quarentena",
    name: "Quarentena",
    categories: ["REGIONAL", "AMEACA"],
    description: "Nesta rodada nenhum territ\xF3rio da regi\xE3o sorteada pode atacar para fora nem ser atacado de fora.",
    flavor: "Barreiras autom\xE1ticas descem em todos os acessos da regi\xE3o.",
    target: "REGION",
    effect: { type: "REGION_QUARANTINE" },
    duration: 1,
    priority: 10,
    intensity: 3
  },
  {
    id: "collapse.reativacao-industrial",
    name: "Reativa\xE7\xE3o Industrial",
    categories: ["REGIONAL", "OPORTUNIDADE"],
    description: "Quem controlar mais territ\xF3rios na regi\xE3o sorteada recebe +3 soldados distribu\xEDdos nela.",
    flavor: "As esteiras voltam a girar e algu\xE9m est\xE1 l\xE1 para recolher.",
    target: "REGION",
    effect: { type: "REGION_REWARD", amount: 3 },
    duration: 0,
    priority: 30,
    intensity: 3
  },
  {
    id: "collapse.blecaute-regional",
    name: "Blecaute Regional",
    categories: ["REGIONAL", "AMEACA"],
    description: "O b\xF4nus de regi\xE3o completa da regi\xE3o sorteada n\xE3o \xE9 pago no pr\xF3ximo refor\xE7o.",
    flavor: "A regi\xE3o inteira sai do mapa energ\xE9tico.",
    target: "REGION",
    effect: { type: "REGION_BONUS_BLACKOUT" },
    duration: 1,
    priority: 30,
    intensity: 2
  },
  {
    id: "collapse.migracao",
    name: "Migra\xE7\xE3o",
    categories: ["REGIONAL"],
    description: "Cada jogador com territ\xF3rio na regi\xE3o sorteada move 1 soldado de cada um deles para um vizinho seu.",
    flavor: "Colunas inteiras se levantam e caminham sem ordem.",
    target: "REGION",
    effect: { type: "REGION_MIGRATION" },
    duration: 0,
    priority: 30,
    intensity: 2
  },
  {
    id: "collapse.lockdown",
    name: "Interdi\xE7\xE3o",
    categories: ["REGIONAL", "AMEACA"],
    description: "Territ\xF3rios da regi\xE3o sorteada n\xE3o recebem refor\xE7o nem movimenta\xE7\xE3o nesta rodada.",
    flavor: "Um protocolo de conten\xE7\xE3o antigo tranca a regi\xE3o.",
    target: "REGION",
    effect: { type: "REGION_REINFORCE_BLOCK" },
    duration: 1,
    priority: 20,
    intensity: 3
  },
  {
    id: "collapse.chuva-acida",
    name: "Chuva \xC1cida",
    categories: ["REGIONAL", "AMEACA"],
    description: "Cada territ\xF3rio da regi\xE3o sorteada perde 2 soldados (nunca abaixo de 1).",
    flavor: "A precipita\xE7\xE3o corr\xF3i tudo que est\xE1 exposto.",
    target: "REGION",
    effect: { type: "REGION_LOSE_TROOPS", amount: 2 },
    duration: 0,
    priority: 20,
    intensity: 5,
    minRound: 6
  },
  // ---------- TERRITORIAIS ----------
  {
    id: "collapse.incendio",
    name: "Inc\xEAndio",
    categories: ["TERRITORIAL", "AMEACA"],
    description: "O territ\xF3rio com mais soldados do mapa perde metade deles, arredondando para baixo.",
    flavor: "Onde h\xE1 mais gente, h\xE1 mais o que queimar.",
    target: "NONE",
    effect: { type: "LARGEST_TERRITORY_HALVED" },
    duration: 0,
    priority: 20,
    intensity: 5,
    requiresTerritoryWithTroops: 4
  },
  {
    id: "collapse.deposito-esquecido",
    name: "Dep\xF3sito Esquecido",
    categories: ["TERRITORIAL", "OPORTUNIDADE"],
    description: "O controlador do territ\xF3rio sorteado recebe +3 soldados nele e compra 1 carta.",
    flavor: "Uma porta blindada cede e revela doze anos de suprimento.",
    target: "TERRITORY",
    effect: { type: "TERRITORY_REWARD", troops: 3, cards: 1 },
    duration: 0,
    priority: 30,
    intensity: 3
  },
  {
    // Reancorado ao mapa de referência: não existem Poços, existem rotas marítimas.
    id: "collapse.desabamento-de-poco",
    name: "Fenda Submersa",
    categories: ["TERRITORIAL", "AMEACA"],
    description: "Uma das cinco rotas mar\xEDtimas deixa de existir por 2 rodadas.",
    flavor: "O leito cede e a passagem se fecha sobre si mesma.",
    target: "MARITIMA",
    effect: { type: "DISABLE_MARITIME" },
    duration: 2,
    priority: 10,
    intensity: 3
  },
  {
    id: "collapse.ponte-rompida",
    name: "Ponte Rompida",
    categories: ["TERRITORIAL", "AMEACA"],
    description: "Uma fronteira terrestre entre dois territ\xF3rios ocupados \xE9 cortada por 3 rodadas.",
    flavor: "A estrutura que ligava os dois lados finalmente desiste.",
    target: "NONE",
    effect: { type: "DISABLE_LAND_BORDER" },
    duration: 3,
    priority: 10,
    intensity: 3
  },
  {
    id: "collapse.mar-agitado",
    name: "Mar Agitado",
    categories: ["TERRITORIAL", "AMEACA"],
    description: "Todas as rotas mar\xEDtimas ficam intransit\xE1veis por 2 rodadas.",
    flavor: "O que sobrou do mar decide se mexer, e ningu\xE9m atravessa.",
    target: "NONE",
    effect: { type: "DISABLE_ALL_MARITIME" },
    duration: 2,
    priority: 10,
    intensity: 2
  },
  {
    id: "collapse.motim",
    name: "Motim",
    categories: ["TERRITORIAL", "AMEACA"],
    description: "Um territ\xF3rio com 6 ou mais soldados perde 2 e seu controlador descarta 1 carta.",
    flavor: "A guarni\xE7\xE3o inteira decide que j\xE1 bastou.",
    target: "TERRITORY",
    effect: { type: "TERRITORY_MUTINY", troops: 2 },
    duration: 0,
    priority: 20,
    intensity: 3,
    requiresTerritoryWithTroops: 6
  },
  {
    id: "collapse.blindagem-improvisada",
    name: "Blindagem Improvisada",
    categories: ["TERRITORIAL", "OPORTUNIDADE"],
    description: "O territ\xF3rio sorteado ganha uma blindagem: quem o atacar rola 1 dado a menos por 2 rodadas.",
    flavor: "Chapas soltas viram muro em uma noite.",
    target: "TERRITORY",
    effect: { type: "TERRITORY_SHIELD", attackerDiceReduction: 1 },
    duration: 2,
    priority: 30,
    intensity: 3
  },
  // ---------- ANOMALIAS ----------
  {
    id: "collapse.eco-da-malha",
    name: "Eco da Malha",
    categories: ["ANOMALIA"],
    description: "Todos passam a m\xE3o de cartas neutras para o jogador \xE0 esquerda.",
    flavor: "A rede repete uma transa\xE7\xE3o de doze anos atr\xE1s.",
    target: "NONE",
    effect: { type: "HAND_ROTATE" },
    duration: 0,
    priority: 40,
    intensity: 3,
    requiresPlayers: 3
  },
  {
    id: "collapse.nevoeiro-de-vidro",
    name: "Nevoeiro de Vidro",
    categories: ["ANOMALIA", "AMEACA"],
    description: "Nesta rodada ningu\xE9m v\xEA a contagem exata das tropas inimigas \u2014 apenas faixas.",
    flavor: "Part\xEDculas de vidro suspenso engolem a telemetria.",
    target: "NONE",
    effect: { type: "FOG_OF_WAR" },
    duration: 1,
    priority: 40,
    intensity: 3
  },
  {
    id: "collapse.recursao",
    name: "Recurs\xE3o",
    categories: ["ANOMALIA"],
    description: "O pr\xF3ximo Evento do Colapso ocorrer\xE1 na rodada seguinte, ignorando o cooldown.",
    flavor: "O sistema tenta se corrigir e chama a si mesmo.",
    target: "NONE",
    effect: { type: "FORCE_NEXT_EVENT" },
    duration: 0,
    priority: 50,
    intensity: 4
  },
  {
    id: "collapse.silencio",
    name: "Sil\xEAncio",
    categories: ["ANOMALIA", "OPORTUNIDADE"],
    description: "Nenhum evento ocorrer\xE1 pelas pr\xF3ximas 3 rodadas. Todos recuperam 1 carga de Transporte.",
    flavor: "Pela primeira vez em doze anos, a bacia inteira fica quieta.",
    target: "NONE",
    effect: { type: "SILENCE", rounds: 3 },
    duration: 0,
    priority: 50,
    intensity: 2
  },
  {
    id: "collapse.dreno",
    name: "Dreno",
    categories: ["ANOMALIA", "AMEACA"],
    description: "O jogador com mais territ\xF3rios perde 2 soldados.",
    flavor: "A anomalia procura sempre a maior concentra\xE7\xE3o.",
    target: "NONE",
    effect: { type: "PLAYER_LOSE_TROOPS", amount: 2 },
    duration: 0,
    priority: 30,
    intensity: 3,
    minRound: 5
  },
  {
    id: "collapse.sobra-de-energia",
    name: "Sobra de Energia",
    categories: ["ANOMALIA", "OPORTUNIDADE"],
    description: "O jogador com menos territ\xF3rios recebe +3 soldados no pr\xF3ximo refor\xE7o.",
    flavor: "A rede desvia pot\xEAncia para o ponto mais fraco do circuito.",
    target: "NONE",
    effect: { type: "REINFORCE_WEAKEST", amount: 3 },
    duration: 1,
    priority: 30,
    intensity: 2
  }
];
var COLLAPSE_EVENT_COUNT = COLLAPSE_EVENT_SEEDS.length;

// src/game/engine/modifiers.ts
function activeModifiersFor(state, territoryId2) {
  return state.territoryModifiers.filter(
    (m) => m.territoryId === territoryId2 && m.untilRound >= state.turn.number
  );
}
function addTerritoryModifier(draft, modifier) {
  draft.counters.effect += 1;
  const created = { id: `mod-${draft.counters.effect}`, ...modifier };
  draft.territoryModifiers.push(created);
  return created;
}
function expireTerritoryModifiers(draft) {
  const before = draft.territoryModifiers.length;
  draft.territoryModifiers = draft.territoryModifiers.filter(
    (m) => m.untilRound >= draft.turn.number
  );
  return before - draft.territoryModifiers.length;
}
function blocksSpecialAttack(state, territoryId2) {
  return activeModifiersFor(state, territoryId2).some((m) => m.blockSpecialAttack);
}
function blocksReinforce(state, territoryId2) {
  return activeModifiersFor(state, territoryId2).some((m) => m.blockReinforce);
}
function dropModifiersOf(draft, playerId2) {
  draft.territoryModifiers = draft.territoryModifiers.filter((m) => m.ownerId !== playerId2);
}

// src/game/engine/log.ts
var MAX_LOG_ENTRIES = 200;
function pushLog(draft, level, message) {
  draft.counters.log += 1;
  draft.log.unshift({
    id: `log-${draft.counters.log}`,
    turn: draft.turn.number,
    message,
    level
  });
  if (draft.log.length > MAX_LOG_ENTRIES) draft.log.length = MAX_LOG_ENTRIES;
}

// src/game/deck/deck.ts
function buildDeck(rng = defaultRng) {
  const cards = [];
  for (const entry of DECK_COMPOSITION) {
    for (let i = 0; i < entry.copies; i += 1) cards.push(entry.definitionId);
  }
  return shuffle(cards, rng);
}
function refillDeck(draft, rng) {
  if (draft.deck.length > 0 || draft.discard.length === 0) return;
  draft.deck = shuffle(draft.discard, rng);
  draft.discard = [];
}
function createCardInstance(draft, owner, definitionId) {
  const definition = getCardDefinition(definitionId);
  draft.counters.card += 1;
  const instance = {
    instanceId: cardInstanceId(`card-${draft.counters.card}`),
    definitionId: definition.id,
    ownerId: owner,
    state: "IN_HAND",
    usesRemaining: definition.maxUses,
    usedMode: null,
    history: []
  };
  draft.cards[instance.instanceId] = instance;
  draft.players[owner]?.handCardIds.push(instance.instanceId);
  return instance;
}
function drawCardFor(draft, playerId2, rng = defaultRng) {
  const player = draft.players[playerId2];
  if (!player || player.status !== "ACTIVE") return null;
  refillDeck(draft, rng);
  const definitionId = draft.deck.shift();
  if (!definitionId) return null;
  player.turnsWithoutCard = 0;
  return createCardInstance(draft, playerId2, definitionId);
}
function discardCard(draft, instanceId) {
  const card = draft.cards[instanceId];
  if (!card) return false;
  const owner = draft.players[card.ownerId];
  if (owner) owner.handCardIds = owner.handCardIds.filter((id2) => id2 !== instanceId);
  card.state = "DISCARDED";
  const definition = getCardDefinition(card.definitionId);
  if (definition.factionId === null) draft.discard.push(card.definitionId);
  return true;
}
function discardFromHand(draft, playerId2, amount) {
  const player = draft.players[playerId2];
  if (!player) return 0;
  let discarded = 0;
  for (const instanceId of [...player.handCardIds]) {
    if (discarded >= amount) break;
    const card = draft.cards[instanceId];
    if (!card) continue;
    if (getCardDefinition(card.definitionId).factionId !== null) continue;
    if (discardCard(draft, instanceId)) discarded += 1;
  }
  return discarded;
}
function neutralHandSize(state, playerId2) {
  const player = state.players[playerId2];
  if (!player) return 0;
  return player.handCardIds.filter((id2) => {
    const card = state.cards[id2];
    return card && getCardDefinition(card.definitionId).factionId === null;
  }).length;
}
function overHandLimit(state, playerId2) {
  return Math.max(0, neutralHandSize(state, playerId2) - BALANCE.deck.handLimit);
}
function enforceHandLimit(draft, playerId2) {
  const excess = overHandLimit(draft, playerId2);
  if (excess > 0) discardFromHand(draft, playerId2, excess);
  return excess;
}
function canDrawNow(state, playerId2) {
  const player = state.players[playerId2];
  if (!player) return { ok: false, reason: "Jogador inexistente." };
  if (state.turn.currentPlayerId !== playerId2) return { ok: false, reason: "N\xE3o \xE9 o seu turno." };
  if (state.turn.phase !== "CARTAS") return { ok: false, reason: "S\xF3 na fase CARTAS." };
  const extra = getFaction(player.factionId).rules.extraCardDrawPerTurn ?? 0;
  if (state.turn.cardsDrawn >= 1 + extra) {
    return { ok: false, reason: "Voc\xEA j\xE1 comprou o m\xE1ximo de cartas nesta fase." };
  }
  if (state.deck.length === 0 && state.discard.length === 0) {
    return { ok: false, reason: "O Baralho do Colapso acabou." };
  }
  if (state.turn.conquestsThisTurn > 0) return { ok: true, reason: "Conquistou neste turno." };
  if (player.turnsWithoutCard >= BALANCE.deck.compensationAfterTurns) {
    return { ok: true, reason: "Compra de compensa\xE7\xE3o." };
  }
  return {
    ok: false,
    reason: "\xC9 preciso conquistar um territ\xF3rio para comprar (ou esperar a compensa\xE7\xE3o)."
  };
}

// src/game/collapse/collapseEngine.ts
var BY_ID = new Map(COLLAPSE_EVENT_SEEDS.map((e) => [e.id, e]));
function getCollapseEvent(id2) {
  const event = BY_ID.get(id2);
  if (!event) throw new Error(`Evento do Colapso desconhecido: ${id2}`);
  return event;
}
function createCollapseState(rng = defaultRng) {
  return {
    bag: shuffle(COLLAPSE_EVENT_SEEDS.map((e) => e.id), rng),
    used: [],
    pressure: 0,
    cooldown: 0,
    triggered: 0,
    pending: null,
    active: [],
    history: [],
    forceNext: false
  };
}
function currentChance(state) {
  const { baseChance, pressureStep, maxChance } = BALANCE.collapse;
  return Math.min(maxChance, baseChance + pressureStep * state.collapse.pressure);
}
function canTriggerNow(state) {
  const c = state.collapse;
  if (state.status !== "IN_PROGRESS") return false;
  if (c.triggered >= BALANCE.collapse.maxPerGame) return false;
  if (state.turn.number < BALANCE.collapse.firstRound) return false;
  if (c.cooldown > 0) return false;
  return true;
}
function rollForCollapse(draft, rng = defaultRng) {
  const c = draft.collapse;
  if (!canTriggerNow(draft)) {
    if (c.cooldown > 0) c.cooldown -= 1;
    return null;
  }
  const forced = c.forceNext;
  const happens = forced || rng.next() < currentChance(draft);
  c.forceNext = false;
  if (!happens) {
    c.pressure += 1;
    return null;
  }
  const eventId = drawValidEvent(draft, rng);
  if (!eventId) {
    c.pressure += 1;
    return null;
  }
  c.pressure = 0;
  c.cooldown = BALANCE.collapse.cooldownRounds;
  return eventId;
}
function isEventValid(state, event) {
  if (event.minRound && state.turn.number < event.minRound) return false;
  if (event.requiresPlayers) {
    const active = Object.values(state.players).filter((p) => p.status === "ACTIVE").length;
    if (active < event.requiresPlayers) return false;
  }
  if (event.requiresTerritoryWithTroops) {
    const has = listTerritories(state).some(
      (t) => t.controllerId && t.garrison.length >= event.requiresTerritoryWithTroops
    );
    if (!has) return false;
  }
  return resolveTarget(state, event, defaultRng) !== "INVALID";
}
function drawValidEvent(draft, rng) {
  const c = draft.collapse;
  if (c.bag.length === 0) c.bag = shuffle(COLLAPSE_EVENT_SEEDS.map((e) => e.id), rng);
  for (let i = 0; i < c.bag.length; i += 1) {
    const candidate = c.bag[i];
    if (isEventValid(draft, getCollapseEvent(candidate))) {
      c.bag.splice(i, 1);
      return candidate;
    }
  }
  return null;
}
function resolveTarget(state, event, rng) {
  switch (event.target) {
    case "NONE":
      return {};
    case "REGION": {
      const candidates = listRegions().filter(
        (r) => r.territoryIds.some((id2) => state.territories[id2]?.controllerId)
      );
      if (candidates.length === 0) return "INVALID";
      return { regionId: pick(candidates, rng).id };
    }
    case "TERRITORY": {
      const min = event.requiresTerritoryWithTroops ?? 1;
      const candidates = listTerritories(state).filter(
        (t) => t.controllerId && t.garrison.length >= min
      );
      if (candidates.length === 0) return "INVALID";
      return { territoryId: pick(candidates, rng).id };
    }
    case "MARITIMA": {
      const routes = listSpecialLinks().filter((l) => l.kind === "MARITIMA");
      if (routes.length === 0) return "INVALID";
      const chosen = pick(routes, rng);
      return { territoryId: chosen.a };
    }
    case "PLAYER": {
      const active = Object.values(state.players).filter((p) => p.status === "ACTIVE");
      if (active.length === 0) return "INVALID";
      return { playerId: pick(active, rng).id };
    }
    default:
      return {};
  }
}
function armCollapse(draft, eventId, rng = defaultRng) {
  const event = getCollapseEvent(eventId);
  const target = resolveTarget(draft, event, rng);
  if (target === "INVALID") return;
  draft.collapse.pending = {
    eventId,
    targetRegionId: target.regionId,
    targetTerritoryId: target.territoryId,
    targetPlayerId: target.playerId
  };
}
function loseTroops(draft, territoryId2, amount, floor = 1) {
  const soldiers = soldiersInTerritory(draft, territoryId2);
  const removable = Math.max(0, Math.min(amount, soldiers.length - floor));
  for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
  return removable;
}
function addTroops(draft, territoryId2, amount) {
  const territory = draft.territories[territoryId2];
  if (!territory?.controllerId) return;
  const owner = draft.players[territory.controllerId];
  if (!owner) return;
  for (let i = 0; i < amount; i += 1) {
    createSoldier(draft, { factionId: owner.factionId, ownerId: owner.id, territoryId: territoryId2 });
  }
}
function applyPendingCollapse(draft, rng = defaultRng) {
  const pending = draft.collapse.pending;
  if (!pending) return null;
  const event = getCollapseEvent(pending.eventId);
  const summary = applyEffect(draft, event, pending, rng);
  if (event.duration > 0) {
    draft.counters.event += 1;
    const active = {
      id: `collapse-${draft.counters.event}`,
      eventId: event.id,
      untilRound: draft.turn.number + event.duration - 1,
      targetRegionId: pending.targetRegionId,
      targetTerritoryId: pending.targetTerritoryId,
      targetPlayerId: pending.targetPlayerId
    };
    draft.collapse.active.push(active);
  }
  draft.collapse.used.push(event.id);
  draft.collapse.triggered += 1;
  draft.collapse.history.unshift({ eventId: event.id, round: draft.turn.number, summary });
  draft.collapse.history = draft.collapse.history.slice(0, 12);
  draft.collapse.pending = null;
  pushLog(draft, "COLLAPSE", `EVENTO DO COLAPSO \u2014 ${event.name}: ${summary}`);
  if (event.categories.includes("AMEACA")) {
    for (const player of Object.values(draft.players)) {
      if (player.status !== "ACTIVE") continue;
      if (!getFaction(player.factionId).rules.collapseFragility) continue;
      const owned = territoriesOf(draft, player.id).sort(
        (a, b) => b.garrison.length - a.garrison.length
      );
      if (owned.length > 0 && loseTroops(draft, owned[0].id, 1) > 0) {
        pushLog(draft, "COLLAPSE", `${player.name} perde 1 soldado adicional pela instabilidade.`);
      }
    }
  }
  syncPlayerTerritories(draft);
  return { event, summary };
}
function applyEffect(draft, event, target, rng) {
  const spec = event.effect;
  const activePlayers2 = Object.values(draft.players).filter((p) => p.status === "ACTIVE");
  switch (spec.type) {
    // Efeitos que só existem enquanto o evento está ativo: o combate e as
    // fases consultam `collapse.active`, então aqui não há mutação.
    case "ATTACK_DICE_DELTA":
      return `atacantes rolam ${spec.delta} dado nesta rodada.`;
    case "DEFENSE_DICE_CAP":
      return `defensores limitados a ${spec.value} dados nesta rodada.`;
    case "BLOCK_SPECIAL_ATTACK":
      return "nenhum Ataque Especial nesta rodada.";
    case "EXTRA_MOVE":
      return `+${spec.amount} movimenta\xE7\xE3o para todos nesta rodada.`;
    case "FOG_OF_WAR":
      return "contagem de tropas inimigas oculta nesta rodada.";
    case "REGION_QUARANTINE":
      return `${regionName(target.targetRegionId)} isolada nesta rodada.`;
    case "REGION_BONUS_BLACKOUT":
      return `b\xF4nus de ${regionName(target.targetRegionId)} suspenso.`;
    case "REGION_REINFORCE_BLOCK":
      return `${regionName(target.targetRegionId)} sem refor\xE7o nem movimenta\xE7\xE3o.`;
    case "REINFORCE_ALL": {
      return `+${spec.amount} soldados no pr\xF3ximo refor\xE7o de todos.`;
    }
    case "REINFORCE_WEAKEST": {
      const weakest = [...activePlayers2].sort(
        (a, b) => territoriesOf(draft, a.id).length - territoriesOf(draft, b.id).length
      )[0];
      if (!weakest) return "sem alvo.";
      draft.collapse.pending = { ...target, targetPlayerId: weakest.id };
      return `${weakest.name} recebe +${spec.amount} no pr\xF3ximo refor\xE7o.`;
    }
    case "DRAW_ALL": {
      let drawn = 0;
      for (const player of activePlayers2) {
        for (let i = 0; i < spec.amount; i += 1) if (drawCardFor(draft, player.id)) drawn += 1;
      }
      return `${drawn} carta(s) compradas no total.`;
    }
    case "DISCARD_LEADER": {
      const max = Math.max(0, ...activePlayers2.map((p) => p.handCardIds.length));
      if (max === 0) return "ningu\xE9m tinha cartas.";
      const leaders = activePlayers2.filter((p) => p.handCardIds.length === max);
      for (const leader of leaders) discardFromHand(draft, leader.id, 1);
      return `${leaders.map((p) => p.name).join(", ")} descarta(m) 1 carta.`;
    }
    case "HAND_ROTATE": {
      if (activePlayers2.length < 2) return "sem jogadores suficientes.";
      const ordered = draft.turn.order.map((id2) => draft.players[id2]).filter((p) => p && p.status === "ACTIVE");
      const hands = ordered.map((p) => [...p.handCardIds]);
      ordered.forEach((player, index) => {
        const incoming = hands[(index + hands.length - 1) % hands.length];
        player.handCardIds = incoming;
        for (const cardId of incoming) {
          const card = draft.cards[cardId];
          if (card) card.ownerId = player.id;
        }
      });
      return "as m\xE3os giraram um assento.";
    }
    case "TRANSPORT_RECHARGE": {
      for (const player of activePlayers2) {
        player.transportCharges = Math.min(
          maxChargesFor(draft, player.id),
          player.transportCharges + spec.amount
        );
      }
      return `+${spec.amount} carga de Transporte para todos.`;
    }
    case "TRANSPORT_DRAIN": {
      for (const player of activePlayers2) player.transportCharges = 0;
      return "todas as cargas de Transporte foram perdidas.";
    }
    case "REGION_LOSE_TROOPS": {
      const region = target.targetRegionId;
      if (!region) return "sem regi\xE3o.";
      let total = 0;
      for (const id2 of regionTerritories(region)) total += loseTroops(draft, id2, spec.amount);
      return `${regionName(region)} perde ${total} soldado(s).`;
    }
    case "REGION_REWARD": {
      const region = target.targetRegionId;
      if (!region) return "sem regi\xE3o.";
      const counts = /* @__PURE__ */ new Map();
      for (const id2 of regionTerritories(region)) {
        const controller = draft.territories[id2]?.controllerId;
        if (!controller) continue;
        counts.set(controller, (counts.get(controller) ?? 0) + 1);
      }
      if (counts.size === 0) return `ningu\xE9m controla ${regionName(region)}.`;
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const owned = regionTerritories(region).filter(
        (id2) => draft.territories[id2]?.controllerId === best
      );
      for (let i = 0; i < spec.amount; i += 1) addTroops(draft, owned[i % owned.length], 1);
      return `${draft.players[best]?.name ?? "???"} recebe +${spec.amount} em ${regionName(region)}.`;
    }
    case "REGION_MIGRATION": {
      const region = target.targetRegionId;
      if (!region) return "sem regi\xE3o.";
      let moved = 0;
      for (const id2 of regionTerritories(region)) {
        const territory = draft.territories[id2];
        if (!territory?.controllerId || territory.garrison.length < 2) continue;
        const friendly = staticNeighborsOf(draft, territory.id).filter(
          (n) => n.controllerId === territory.controllerId
        );
        if (friendly.length === 0) continue;
        const soldierId2 = territory.garrison[territory.garrison.length - 1];
        territory.garrison = territory.garrison.filter((s) => s !== soldierId2);
        const destination = friendly[0];
        destination.garrison.push(soldierId2);
        const soldier = draft.soldiers[soldierId2];
        if (soldier) soldier.location = { kind: "TERRITORY", territoryId: destination.id };
        moved += 1;
      }
      return `${moved} soldado(s) migraram em ${regionName(region)}.`;
    }
    case "TERRITORY_REWARD": {
      const id2 = target.targetTerritoryId;
      if (!id2) return "sem territ\xF3rio.";
      const territory = draft.territories[id2];
      addTroops(draft, id2, spec.troops);
      if (territory?.controllerId) {
        for (let i = 0; i < spec.cards; i += 1) drawCardFor(draft, territory.controllerId);
      }
      return `${territory?.name}: +${spec.troops} soldados e ${spec.cards} carta.`;
    }
    case "TERRITORY_MUTINY": {
      const id2 = target.targetTerritoryId;
      if (!id2) return "sem territ\xF3rio.";
      const territory = draft.territories[id2];
      const lost = loseTroops(draft, id2, spec.troops);
      if (territory?.controllerId) discardFromHand(draft, territory.controllerId, 1);
      return `${territory?.name} perde ${lost} soldado(s) e 1 carta.`;
    }
    case "TERRITORY_SHIELD": {
      const id2 = target.targetTerritoryId;
      const territory = id2 ? draft.territories[id2] : void 0;
      if (!territory?.controllerId) return "sem territ\xF3rio.";
      addTerritoryModifier(draft, {
        territoryId: territory.id,
        ownerId: territory.controllerId,
        untilRound: draft.turn.number + event.duration,
        attackerDiceReduction: spec.attackerDiceReduction,
        source: event.id
      });
      return `${territory.name} recebe blindagem.`;
    }
    case "LARGEST_TERRITORY_HALVED": {
      const largest = listTerritories(draft).filter((t) => t.controllerId).sort((a, b) => b.garrison.length - a.garrison.length)[0];
      if (!largest) return "sem alvo.";
      const lost = loseTroops(draft, largest.id, Math.floor(largest.garrison.length / 2));
      return `${largest.name} perde ${lost} soldado(s).`;
    }
    case "BORDER_ATTRITION": {
      let total = 0;
      for (const territory of listTerritories(draft)) {
        if (!territory.controllerId) continue;
        const hasEnemy = staticNeighborsOf(draft, territory.id).some(
          (n) => n.controllerId && n.controllerId !== territory.controllerId
        );
        if (hasEnemy) total += loseTroops(draft, territory.id, spec.amount);
      }
      return `${total} soldado(s) perdidos nas fronteiras.`;
    }
    case "DISABLE_MARITIME": {
      const routes = listSpecialLinks().filter((l) => l.kind === "MARITIMA");
      if (routes.length === 0) return "sem rota mar\xEDtima.";
      const chosen = target.targetTerritoryId ? routes.find((l) => l.a === target.targetTerritoryId) ?? pick(routes, rng) : pick(routes, rng);
      disableLink(draft, chosen.a, chosen.b, draft.turn.number + event.duration);
      return `${chosen.name} interditada.`;
    }
    case "DISABLE_LAND_BORDER": {
      const candidates = listTerritories(draft).flatMap(
        (t) => staticNeighborsOf(draft, t.id).filter(
          (n) => t.id < n.id && t.controllerId && n.controllerId && !specialLinkBetween(t.id, n.id)
        ).map((n) => ({ a: t.id, b: n.id, name: `${t.name} \u2194 ${n.name}` }))
      );
      if (candidates.length === 0) return "sem fronteira eleg\xEDvel.";
      const chosen = pick(candidates, rng);
      disableLink(draft, chosen.a, chosen.b, draft.turn.number + event.duration);
      return `${chosen.name} rompida.`;
    }
    case "DISABLE_ALL_MARITIME": {
      const routes = listSpecialLinks().filter((l) => l.kind === "MARITIMA");
      for (const route of routes) {
        disableLink(draft, route.a, route.b, draft.turn.number + event.duration);
      }
      return `${routes.length} rota(s) mar\xEDtima(s) intransit\xE1vel(is).`;
    }
    case "FORCE_NEXT_EVENT": {
      draft.collapse.forceNext = true;
      draft.collapse.cooldown = 0;
      return "o pr\xF3ximo evento vir\xE1 na rodada seguinte.";
    }
    case "SILENCE": {
      draft.collapse.cooldown = spec.rounds;
      draft.collapse.pressure = 0;
      for (const player of activePlayers2) {
        player.transportCharges = Math.min(
          maxChargesFor(draft, player.id),
          player.transportCharges + 1
        );
      }
      return `${spec.rounds} rodadas de sil\xEAncio e +1 carga para todos.`;
    }
    case "PLAYER_LOSE_TROOPS": {
      const leader = [...activePlayers2].sort(
        (a, b) => territoriesOf(draft, b.id).length - territoriesOf(draft, a.id).length
      )[0];
      if (!leader) return "sem alvo.";
      const owned = territoriesOf(draft, leader.id).sort(
        (a, b) => b.garrison.length - a.garrison.length
      );
      let lost = 0;
      for (const territory of owned) {
        if (lost >= spec.amount) break;
        lost += loseTroops(draft, territory.id, spec.amount - lost);
      }
      return `${leader.name} perde ${lost} soldado(s).`;
    }
    case "PLAYER_GAIN_TROOPS": {
      const id2 = target.targetPlayerId;
      const player = id2 ? draft.players[id2] : void 0;
      if (!player) return "sem alvo.";
      const owned = territoriesOf(draft, player.id);
      for (let i = 0; i < spec.amount && owned.length > 0; i += 1) {
        addTroops(draft, owned[i % owned.length].id, 1);
      }
      return `${player.name} recebe +${spec.amount} soldado(s).`;
    }
    default: {
      const exhaustive = spec;
      void exhaustive;
      return "efeito sem resolvedor.";
    }
  }
}
function regionTerritories(regionId) {
  return listRegions().find((r) => r.id === regionId)?.territoryIds ?? [];
}
function regionName(regionId) {
  return listRegions().find((r) => r.id === regionId)?.name ?? "regi\xE3o";
}
function maxChargesFor(state, playerId2) {
  const hasDepot = listTerritories(state).some(
    (t) => t.controllerId === playerId2 && t.id === "usina-nuclear"
  );
  return hasDepot ? BALANCE.transport.maxChargesWithDepot : BALANCE.transport.maxCharges;
}
function activeEffectsOfType(state, type) {
  return state.collapse.active.map((active) => ({ active, event: getCollapseEvent(active.eventId) })).filter(({ event }) => event.effect.type === type);
}
function defenseDiceCap(state) {
  const caps = activeEffectsOfType(state, "DEFENSE_DICE_CAP").map(
    ({ event }) => event.effect.type === "DEFENSE_DICE_CAP" ? event.effect.value : BALANCE.dice.maxDefenseDice
  );
  return caps.length > 0 ? Math.min(...caps) : BALANCE.dice.maxDefenseDice;
}
function specialAttackBlocked(state) {
  return activeEffectsOfType(state, "BLOCK_SPECIAL_ATTACK").length > 0;
}
function extraMoves(state) {
  return activeEffectsOfType(state, "EXTRA_MOVE").reduce(
    (sum, { event }) => sum + (event.effect.type === "EXTRA_MOVE" ? event.effect.amount : 0),
    0
  );
}
function quarantinedRegions(state) {
  return activeEffectsOfType(state, "REGION_QUARANTINE").map(({ active }) => active.targetRegionId).filter((id2) => Boolean(id2));
}
function blackedOutRegions(state) {
  return activeEffectsOfType(state, "REGION_BONUS_BLACKOUT").map(({ active }) => active.targetRegionId).filter((id2) => Boolean(id2));
}
function collapseReinforcementBonus(state, playerId2) {
  let bonus = 0;
  for (const { active, event } of activeEffectsOfType(state, "REINFORCE_ALL")) {
    void active;
    if (event.effect.type === "REINFORCE_ALL") bonus += event.effect.amount;
  }
  for (const { active, event } of activeEffectsOfType(state, "REINFORCE_WEAKEST")) {
    if (active.targetPlayerId === playerId2 && event.effect.type === "REINFORCE_WEAKEST") {
      bonus += event.effect.amount;
    }
  }
  return bonus;
}
function crossesQuarantine(state, from, to) {
  const quarantined = quarantinedRegions(state);
  if (quarantined.length === 0) return false;
  for (const regionId of quarantined) {
    const ids = regionTerritories(regionId);
    const fromInside = ids.includes(from);
    const toInside = ids.includes(to);
    if (fromInside !== toInside) return true;
  }
  return false;
}
function expireCollapseEffects(draft) {
  const expired = [];
  draft.collapse.active = draft.collapse.active.filter((active) => {
    if (active.untilRound >= draft.turn.number) return true;
    expired.push(getCollapseEvent(active.eventId).name);
    return false;
  });
  for (const link of expireDisabledLinks(draft)) expired.push(link.name);
  expireTerritoryModifiers(draft);
  return expired;
}

// src/data/missions.seed.ts
var FALLBACK = "mission.fallback-16";
var MISSION_SEEDS = [
  // --- Expansão ---
  {
    id: "mission.territories-18",
    name: "Ocupa\xE7\xE3o Ampla",
    description: "Controle 18 territ\xF3rios ao mesmo tempo.",
    category: "EXPANSAO",
    condition: { type: "TERRITORY_COUNT", value: 18 },
    weight: 4
  },
  {
    id: "mission.territories-15-garrisoned",
    name: "Linha Guarnecida",
    description: "Controle 15 territ\xF3rios com no m\xEDnimo 2 soldados em cada um.",
    category: "EXPANSAO",
    condition: { type: "TERRITORY_COUNT", value: 15, minTroopsEach: 2 },
    weight: 4
  },
  {
    id: "mission.fallback-16",
    name: "Dom\xEDnio Suficiente",
    description: "Controle 16 territ\xF3rios ao mesmo tempo.",
    category: "EXPANSAO",
    condition: { type: "TERRITORY_COUNT", value: 16 },
    weight: 4
  },
  {
    id: "mission.territories-12-dispersed",
    name: "Doutrina de Dispers\xE3o",
    description: "Controle 12 territ\xF3rios sem que nenhum deles tenha mais de 5 soldados.",
    category: "DOUTRINA",
    condition: { type: "TERRITORY_COUNT", value: 12, maxTroopsEach: 5 },
    weight: 4
  },
  // --- Consolidação ---
  {
    id: "mission.regions-3",
    name: "Tr\xEDplice Dom\xEDnio",
    description: "Controle 3 regi\xF5es completas quaisquer.",
    category: "CONSOLIDACAO",
    condition: { type: "REGIONS_COMPLETE", count: 3 },
    weight: 5
  },
  {
    id: "mission.regions-2",
    name: "Dois Pilares",
    description: "Controle 2 regi\xF5es completas quaisquer.",
    category: "CONSOLIDACAO",
    condition: { type: "REGIONS_COMPLETE", count: 2 },
    weight: 3
  },
  {
    id: "mission.metropole-ferro",
    name: "Eixo Norte",
    description: "Controle as Terras Centrais e a Fronteira Norte, ambas completas.",
    category: "CONSOLIDACAO",
    condition: { type: "REGIONS_SPECIFIC", regionIds: ["terras-centrais", "fronteira-norte"] },
    weight: 5
  },
  {
    id: "mission.siderurgico-vitrea",
    name: "Eixo Sul",
    description: "Controle a Zona Devastada e a Zona de Impacto, ambas completas.",
    category: "CONSOLIDACAO",
    condition: { type: "REGIONS_SPECIFIC", regionIds: ["zona-devastada", "zona-impacto"] },
    weight: 5
  },
  {
    id: "mission.abrigos-plus-6",
    name: "Dom\xEDnio Costeiro",
    description: "Controle a Costa Sombria completa e mais 6 territ\xF3rios fora dela.",
    category: "CONSOLIDACAO",
    condition: { type: "REGION_PLUS_TERRITORIES", regionId: "costa-sombria", extra: 6 },
    weight: 4
  },
  {
    id: "mission.planicie-plus-poi",
    name: "Estrada e Sinal",
    description: "Controle a Floresta Corrompida completa e 4 Pontos de Interesse.",
    category: "CONSOLIDACAO",
    condition: { type: "REGION_PLUS_TERRITORIES", regionId: "floresta-corrompida", extra: 4 },
    weight: 5
  },
  {
    id: "mission.regions-non-adjacent",
    name: "Dom\xEDnio Partido",
    description: "Controle 2 regi\xF5es completas que n\xE3o fa\xE7am fronteira entre si.",
    category: "CONSOLIDACAO",
    condition: { type: "REGIONS_NON_ADJACENT", count: 2 },
    weight: 5
  },
  {
    id: "mission.hold-metropole",
    name: "Capital Firme",
    description: "Controle as Terras Centrais completas e mantenha por 2 rodadas seguidas.",
    category: "CONSOLIDACAO",
    condition: { type: "HOLD_REGION_ROUNDS", regionId: "terras-centrais", rounds: 2 },
    weight: 5
  },
  {
    id: "mission.hold-abrigos",
    name: "Mar\xE9 Firme",
    description: "Controle a Costa Sombria completa e mantenha por 2 rodadas seguidas.",
    category: "CONSOLIDACAO",
    condition: { type: "HOLD_REGION_ROUNDS", regionId: "costa-sombria", rounds: 2 },
    weight: 4
  },
  {
    id: "mission.metropole-4",
    name: "Cora\xE7\xE3o do Continente",
    description: "Controle 4 dos 5 territ\xF3rios das Terras Centrais.",
    category: "CONSOLIDACAO",
    condition: { type: "TERRITORIES_IN_REGION", regionId: "terras-centrais", count: 4 },
    weight: 3
  },
  // --- Posição ---
  {
    id: "mission.poi-4",
    name: "Rede de Controle",
    description: "Controle 4 dos 6 Pontos de Interesse ao mesmo tempo.",
    category: "POSICAO",
    condition: { type: "POI_CONTROL", count: 4 },
    weight: 4
  },
  {
    id: "mission.pocos-3",
    name: "Senhor das Rotas",
    description: "Controle os dois lados de 3 rotas mar\xEDtimas ao mesmo tempo.",
    category: "POSICAO",
    condition: { type: "POCO_BOTH_SIDES", count: 3 },
    weight: 4
  },
  {
    id: "mission.pocos-2",
    name: "Cabe\xE7a de Ponte",
    description: "Controle os dois lados de 2 rotas mar\xEDtimas ao mesmo tempo.",
    category: "POSICAO",
    condition: { type: "POCO_BOTH_SIDES", count: 2 },
    weight: 3
  },
  // --- Militar (com regra de substituição) ---
  {
    id: "mission.eliminate-humanos",
    name: "Silenciar o R\xE1dio",
    description: "Elimine a fac\xE7\xE3o Humanos da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_FACTION", factionId: HUMANOS_ID },
    weight: 4,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-alienigenas",
    name: "Derrubar as Naves",
    description: "Elimine a fac\xE7\xE3o Alien\xEDgenas da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_FACTION", factionId: ALIENIGENAS_ID },
    weight: 4,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-zumbis",
    name: "Conter a Infesta\xE7\xE3o",
    description: "Elimine a fac\xE7\xE3o Zumbis da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_FACTION", factionId: ZUMBIS_ID },
    weight: 4,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-magos",
    name: "Quebrar o C\xEDrculo",
    description: "Elimine a fac\xE7\xE3o Magos da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_FACTION", factionId: MAGOS_ID },
    weight: 4,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-vampiros",
    name: "Estaca no Cora\xE7\xE3o",
    description: "Elimine a fac\xE7\xE3o Vampiros da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_FACTION", factionId: VAMPIROS_ID },
    weight: 4,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-goblins",
    name: "Desmontar a Oficina",
    description: "Elimine a fac\xE7\xE3o Goblins da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_FACTION", factionId: GOBLINS_ID },
    weight: 4,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-any-2",
    name: "Dois Menos",
    description: "Elimine 2 fac\xE7\xF5es quaisquer da partida.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_ANY", count: 2 },
    weight: 5,
    fallbackId: FALLBACK
  },
  {
    id: "mission.eliminate-neighbor",
    name: "Flanco Limpo",
    description: "Elimine o jogador do assento imediatamente ap\xF3s o seu na ordem de turno.",
    category: "MILITAR",
    condition: { type: "ELIMINATE_NEIGHBOR_SEAT" },
    weight: 3,
    fallbackId: FALLBACK
  },
  {
    id: "mission.troops-25",
    name: "Ex\xE9rcito em P\xE9",
    description: "Tenha 25 soldados em campo e controle 10 territ\xF3rios.",
    category: "MILITAR",
    condition: { type: "TROOPS_AND_TERRITORIES", troops: 25, territories: 10 },
    weight: 3
  },
  // --- Ritmo e tempo ---
  {
    id: "mission.streak-5",
    name: "Avan\xE7o Cont\xEDnuo",
    description: "Conquiste ao menos 1 territ\xF3rio em 5 rodadas consecutivas.",
    category: "RITMO",
    condition: { type: "CONQUEST_STREAK", rounds: 5 },
    weight: 4
  },
  {
    id: "mission.each-region",
    name: "Bandeira em Toda Parte",
    description: "Ao longo da partida, conquiste um territ\xF3rio de cada uma das 6 regi\xF5es. N\xE3o precisa mant\xEA-los.",
    category: "RITMO",
    condition: { type: "CONQUER_EACH_REGION" },
    weight: 4
  },
  {
    id: "mission.most-at-12",
    name: "Primeiro na Contagem",
    description: "Tenha mais territ\xF3rios que qualquer outro jogador ao final da rodada 12.",
    category: "TEMPO",
    condition: { type: "MOST_TERRITORIES_AT_ROUND", round: 12 },
    weight: 3
  },
  {
    id: "mission.collapse-4",
    name: "Resistir ao Colapso",
    description: "Sobreviva a 4 Eventos do Colapso e controle 14 territ\xF3rios.",
    category: "TEMPO",
    condition: { type: "SURVIVE_COLLAPSE_AND_TERRITORIES", events: 4, territories: 14 },
    weight: 4
  }
];
var FALLBACK_MISSION_ID = FALLBACK;

// src/game/missions/missionEngine.ts
var BY_ID2 = new Map(MISSION_SEEDS.map((m) => [m.id, m]));
function getMission(id2) {
  const mission = BY_ID2.get(id2);
  if (!mission) throw new Error(`Miss\xE3o desconhecida: ${id2}`);
  return mission;
}
function effectiveMissionOf(state, playerId2) {
  const entry = state.missions[playerId2];
  if (!entry) return null;
  return getMission(entry.replacedBy ?? entry.missionId);
}
function isMissionValid(mission, context) {
  const c = mission.condition;
  switch (c.type) {
    case "ELIMINATE_FACTION":
      if (c.factionId === context.ownFactionId) return false;
      return context.factionIds.includes(c.factionId);
    case "ELIMINATE_ANY":
      return context.playerCount - 1 >= c.count;
    case "ELIMINATE_NEIGHBOR_SEAT":
      return context.playerCount >= 2;
    case "MOST_TERRITORIES_AT_ROUND":
      return context.playerCount >= 2;
    default:
      return true;
  }
}
function dealMissions(players, rng = defaultRng, initialState) {
  const factionIds = players.map((p) => p.factionId);
  const assignments = {};
  const discarded = /* @__PURE__ */ new Set();
  const pool = shuffle(MISSION_SEEDS.map((m) => m.id), rng);
  const taken = /* @__PURE__ */ new Set();
  const alreadyDone = (missionId, playerId2) => {
    if (!initialState) return false;
    const probe = {
      ...initialState,
      missions: {
        ...initialState.missions,
        [playerId2]: {
          missionId,
          playerId: playerId2,
          completed: false,
          revealed: false,
          tracking: { conquestRounds: [], regionsTouched: [], holdRounds: 0, collapseSurvived: 0 }
        }
      }
    };
    return checkMission(probe, playerId2).completed;
  };
  for (const player of players) {
    const context = {
      factionIds,
      ownFactionId: player.factionId,
      playerCount: players.length
    };
    let chosen = null;
    for (const candidate of pool) {
      if (taken.has(candidate)) continue;
      const mission = getMission(candidate);
      if (!isMissionValid(mission, context)) {
        discarded.add(candidate);
        continue;
      }
      if (alreadyDone(candidate, player.id)) {
        discarded.add(candidate);
        continue;
      }
      chosen = candidate;
      break;
    }
    const missionId = chosen ?? FALLBACK_MISSION_ID;
    taken.add(missionId);
    assignments[player.id] = {
      missionId,
      playerId: player.id,
      completed: false,
      revealed: false,
      tracking: { conquestRounds: [], regionsTouched: [], holdRounds: 0, collapseSurvived: 0 }
    };
  }
  return { assignments, discarded: [...discarded] };
}
var POI_IDS = TERRITORY_SEEDS.filter((t) => t.poi).map((t) => t.id);
var POCO_LINKS = listSpecialLinks().filter((l) => l.kind === "MARITIMA");
var NON_ADJACENT_REGION_PAIRS = (() => {
  const regions = listRegions();
  const pairs = [];
  for (let i = 0; i < regions.length; i += 1) {
    for (let j = i + 1; j < regions.length; j += 1) {
      const a = regions[i];
      const b = regions[j];
      const touches = a.territoryIds.some((tid) => {
        const seed = TERRITORY_SEEDS.find((t) => t.id === tid);
        return seed?.neighbors.some((n) => b.territoryIds.includes(n));
      });
      if (!touches) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
})();
function eliminatedFactionIds(state) {
  return Object.values(state.players).filter((p) => p.status === "ELIMINATED").map((p) => p.factionId);
}
function checkMission(state, playerId2) {
  const entry = state.missions[playerId2];
  const mission = effectiveMissionOf(state, playerId2);
  if (!entry || !mission) return { completed: false, progress: "\u2014" };
  const owned = territoriesOf(state, playerId2);
  const c = mission.condition;
  switch (c.type) {
    case "TERRITORY_COUNT": {
      const qualifying = owned.filter((t) => {
        if (c.minTroopsEach !== void 0 && t.garrison.length < c.minTroopsEach) return false;
        if (c.maxTroopsEach !== void 0 && t.garrison.length > c.maxTroopsEach) return false;
        return true;
      });
      return {
        completed: qualifying.length >= c.value,
        progress: `${qualifying.length}/${c.value} territ\xF3rios`
      };
    }
    case "REGIONS_COMPLETE": {
      const done = completedRegions(state, playerId2);
      return { completed: done.length >= c.count, progress: `${done.length}/${c.count} regi\xF5es` };
    }
    case "REGIONS_SPECIFIC": {
      const done = completedRegions(state, playerId2).map((r) => r.id);
      const have = c.regionIds.filter((id2) => done.includes(id2));
      return {
        completed: have.length === c.regionIds.length,
        progress: `${have.length}/${c.regionIds.length} regi\xF5es-alvo`
      };
    }
    case "REGION_PLUS_TERRITORIES": {
      const region = getRegion(c.regionId);
      const hasRegion = region.territoryIds.every(
        (id2) => state.territories[id2]?.controllerId === playerId2
      );
      const isPoiVariant = c.regionId === "floresta-corrompida";
      const extraCount = isPoiVariant ? POI_IDS.filter((id2) => state.territories[id2]?.controllerId === playerId2).length : owned.filter((t) => !region.territoryIds.includes(t.id)).length;
      return {
        completed: hasRegion && extraCount >= c.extra,
        progress: `${region.name}: ${hasRegion ? "ok" : "incompleta"} \xB7 extra ${extraCount}/${c.extra}`
      };
    }
    case "REGIONS_NON_ADJACENT": {
      const done = completedRegions(state, playerId2).map((r) => r.id);
      const valid = NON_ADJACENT_REGION_PAIRS.filter(
        ([a, b]) => done.includes(a) && done.includes(b)
      );
      return {
        completed: valid.length >= c.count - 1,
        progress: `${valid.length} par(es) sem fronteira comum`
      };
    }
    case "POI_CONTROL": {
      const have = POI_IDS.filter(
        (id2) => state.territories[id2]?.controllerId === playerId2
      ).length;
      return { completed: have >= c.count, progress: `${have}/${c.count} Pontos de Interesse` };
    }
    case "POCO_BOTH_SIDES": {
      const have = POCO_LINKS.filter(
        (link) => state.territories[link.a]?.controllerId === playerId2 && state.territories[link.b]?.controllerId === playerId2
      ).length;
      return { completed: have >= c.count, progress: `${have}/${c.count} rotas completas` };
    }
    case "ELIMINATE_FACTION": {
      const done = eliminatedFactionIds(state).includes(c.factionId);
      return { completed: done, progress: done ? "eliminada" : "ainda em jogo" };
    }
    case "ELIMINATE_ANY": {
      const count = eliminatedFactionIds(state).length;
      return { completed: count >= c.count, progress: `${count}/${c.count} fac\xE7\xF5es eliminadas` };
    }
    case "ELIMINATE_NEIGHBOR_SEAT": {
      const order = state.turn.order;
      const index = order.indexOf(playerId2);
      if (index < 0) return { completed: false, progress: "\u2014" };
      const neighbor = order[(index + 1) % order.length];
      const target = state.players[neighbor];
      const done = Boolean(target && target.status === "ELIMINATED");
      return {
        completed: done,
        progress: done ? "assento vizinho eliminado" : `alvo: ${target?.name ?? "\u2014"}`
      };
    }
    case "MOST_TERRITORIES_AT_ROUND": {
      if (state.turn.number < c.round) {
        return { completed: false, progress: `rodada ${state.turn.number}/${c.round}` };
      }
      const counts = Object.values(state.players).filter((p) => p.status === "ACTIVE").map((p) => ({ id: p.id, n: territoriesOf(state, p.id).length }));
      const mine = counts.find((x) => x.id === playerId2)?.n ?? 0;
      const best = Math.max(...counts.map((x) => x.n));
      const tied = counts.filter((x) => x.n === best).length > 1;
      return {
        completed: mine === best && !tied,
        progress: tied ? "empate na lideran\xE7a" : `${mine} contra ${best}`
      };
    }
    case "TROOPS_AND_TERRITORIES": {
      const troops = owned.reduce((sum, t) => sum + t.garrison.length, 0);
      return {
        completed: troops >= c.troops && owned.length >= c.territories,
        progress: `${troops}/${c.troops} soldados \xB7 ${owned.length}/${c.territories} territ\xF3rios`
      };
    }
    case "CONQUEST_STREAK": {
      const rounds = [...entry.tracking.conquestRounds].sort((a, b) => a - b);
      let best = 0;
      let run = 0;
      let previous = null;
      for (const round of rounds) {
        run = previous !== null && round === previous + 1 ? run + 1 : 1;
        previous = round;
        best = Math.max(best, run);
      }
      return { completed: best >= c.rounds, progress: `${best}/${c.rounds} rodadas seguidas` };
    }
    case "CONQUER_EACH_REGION": {
      const touched = new Set(entry.tracking.regionsTouched);
      return {
        completed: touched.size >= listRegions().length,
        progress: `${touched.size}/${listRegions().length} regi\xF5es`
      };
    }
    case "HOLD_REGION_ROUNDS": {
      return {
        completed: entry.tracking.holdRounds >= c.rounds,
        progress: `${entry.tracking.holdRounds}/${c.rounds} rodadas seguidas`
      };
    }
    case "SURVIVE_COLLAPSE_AND_TERRITORIES": {
      const survived = entry.tracking.collapseSurvived;
      return {
        completed: survived >= c.events && owned.length >= c.territories,
        progress: `${survived}/${c.events} eventos \xB7 ${owned.length}/${c.territories} territ\xF3rios`
      };
    }
    case "TERRITORIES_IN_REGION": {
      const region = getRegion(c.regionId);
      const have = region.territoryIds.filter(
        (id2) => state.territories[id2]?.controllerId === playerId2
      ).length;
      return { completed: have >= c.count, progress: `${have}/${c.count} em ${region.name}` };
    }
    default: {
      const exhaustive = c;
      void exhaustive;
      return { completed: false, progress: "condi\xE7\xE3o sem verificador" };
    }
  }
}
function trackConquest(draft, playerId2, territoryId2) {
  const entry = draft.missions[playerId2];
  if (!entry) return;
  if (!entry.tracking.conquestRounds.includes(draft.turn.number)) {
    entry.tracking.conquestRounds.push(draft.turn.number);
  }
  const region = regionOfTerritory(territoryId2);
  if (region && !entry.tracking.regionsTouched.includes(region.id)) {
    entry.tracking.regionsTouched.push(region.id);
  }
}
function trackRegionHold(draft, playerId2) {
  const entry = draft.missions[playerId2];
  const mission = effectiveMissionOf(draft, playerId2);
  if (!entry || !mission || mission.condition.type !== "HOLD_REGION_ROUNDS") return;
  const region = getRegion(mission.condition.regionId);
  const holds = region.territoryIds.every(
    (id2) => draft.territories[id2]?.controllerId === playerId2
  );
  entry.tracking.holdRounds = holds ? entry.tracking.holdRounds + 1 : 0;
}
function trackCollapseSurvived(draft) {
  for (const entry of Object.values(draft.missions)) {
    const player = draft.players[entry.playerId];
    if (player?.status === "ACTIVE") entry.tracking.collapseSurvived += 1;
  }
}
function applyMissionFallbacks(draft, eliminatedBy) {
  for (const entry of Object.values(draft.missions)) {
    if (entry.replacedBy) continue;
    const mission = getMission(entry.missionId);
    if (mission.condition.type !== "ELIMINATE_FACTION") continue;
    if (!mission.fallbackId) continue;
    const targetEliminated = eliminatedFactionIds(draft).includes(
      mission.condition.factionId
    );
    if (!targetEliminated) continue;
    if (eliminatedBy === entry.playerId) continue;
    entry.replacedBy = mission.fallbackId;
  }
}

// src/game/engine/selectors.ts
function reserveSoldiers(state, playerId2) {
  return Object.values(state.soldiers).filter(
    (s) => s.alive && s.location.kind === "RESERVE" && s.location.playerId === playerId2
  );
}
function troopsOf(state, playerId2) {
  return Object.values(state.soldiers).filter((s) => s.alive && s.ownerId === playerId2).length;
}

// src/game/abilities/conditions.ts
function evaluateCondition(state, playerId2, condition, payload = {}) {
  switch (condition.type) {
    case "IS_CURRENT_PLAYER":
      return state.turn.currentPlayerId === playerId2 ? { ok: true } : { ok: false, reason: "S\xF3 no seu turno." };
    case "PHASE_IS":
      return condition.phases.includes(state.turn.phase) ? { ok: true } : { ok: false, reason: `Dispon\xEDvel na fase ${condition.phases.join(" / ")}.` };
    case "TERRITORY_COUNT_AT_MOST": {
      const owned = territoriesOf(state, playerId2).length;
      return owned <= condition.value ? { ok: true } : { ok: false, reason: `Exige ${condition.value} territ\xF3rio(s) ou menos (voc\xEA tem ${owned}).` };
    }
    case "TERRITORY_COUNT_AT_LEAST": {
      const owned = territoriesOf(state, playerId2).length;
      return owned >= condition.value ? { ok: true } : { ok: false, reason: `Exige ao menos ${condition.value} territ\xF3rio(s).` };
    }
    case "TROOP_COUNT_AT_LEAST": {
      const troops = troopsOf(state, playerId2);
      return troops >= condition.value ? { ok: true } : { ok: false, reason: `Exige ao menos ${condition.value} tropa(s).` };
    }
    case "TROOP_COUNT_AT_MOST": {
      const troops = troopsOf(state, playerId2);
      return troops <= condition.value ? { ok: true } : { ok: false, reason: `Exige no m\xE1ximo ${condition.value} tropa(s).` };
    }
    case "HAS_PENDING_ATTACK_AGAINST_OWNER": {
      const attack = state.pendingAttack;
      return attack && attack.status === "DECLARED" && attack.defenderPlayerId === playerId2 ? { ok: true } : { ok: false, reason: "Exige um ataque declarado contra voc\xEA." };
    }
    case "CONTROLS_TERRITORY": {
      const territory = state.territories[condition.territoryId];
      return territory?.controllerId === playerId2 ? { ok: true } : { ok: false, reason: "Territ\xF3rio n\xE3o \xE9 seu." };
    }
    case "DICE_RESULT_AT_LEAST": {
      const value = typeof payload.diceValue === "number" ? payload.diceValue : -1;
      return value >= condition.value ? { ok: true } : { ok: false, reason: `Exige resultado de dado ${condition.value} ou mais.` };
    }
    case "NO_PENDING_OCCUPATION":
      return state.pendingOccupation ? { ok: false, reason: "Ocupe o territ\xF3rio conquistado antes." } : { ok: true };
    default:
      return { ok: true };
  }
}
function evaluateConditions(state, playerId2, conditions, payload = {}) {
  for (const condition of conditions) {
    const result = evaluateCondition(state, playerId2, condition, payload);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// src/game/abilities/abilityEngine.ts
function abilityKey(playerId2, abilityId) {
  return `${playerId2}::${abilityId}`;
}
function initialAbilityState(playerId2, ability) {
  const charges = ability.usage.scope === "PER_GAME" ? ability.usage.charges ?? 1 : -1;
  return {
    abilityId: ability.id,
    playerId: playerId2,
    enabled: true,
    chargesRemaining: charges,
    usesThisTurn: 0,
    availableFromTurn: 1,
    lastUsedTurn: null,
    timesUsed: 0
  };
}
function seedAbilityStates(draft, playerId2) {
  const player = draft.players[playerId2];
  if (!player) return;
  for (const ability of abilitiesOfFaction(player.factionId)) {
    const key = abilityKey(playerId2, ability.id);
    if (!draft.abilityStates[key]) {
      draft.abilityStates[key] = initialAbilityState(playerId2, ability);
    }
  }
}
function getAbilityState(state, playerId2, abilityId) {
  return state.abilityStates[abilityKey(playerId2, abilityId)];
}
function abilitiesOfPlayer(state, playerId2) {
  const player = state.players[playerId2];
  if (!player) return [];
  return abilitiesOfFaction(player.factionId).map((definition) => ({
    definition,
    runtime: state.abilityStates[abilityKey(playerId2, definition.id)]
  })).filter(
    (entry) => Boolean(entry.runtime)
  );
}
function checkUsage(state, runtime, ability) {
  if (!runtime.enabled) return { available: false, reason: "Habilidade desativada (DEV)." };
  if (runtime.chargesRemaining === 0) {
    return { available: false, reason: "Sem cargas restantes nesta partida." };
  }
  const perTurn = ability.usage.perTurn;
  if (perTurn !== void 0 && runtime.usesThisTurn >= perTurn) {
    return { available: false, reason: "Limite de usos neste turno atingido." };
  }
  if (state.turn.number < runtime.availableFromTurn) {
    return {
      available: false,
      reason: `Em recarga at\xE9 o turno ${runtime.availableFromTurn}.`
    };
  }
  return { available: true };
}
function checkAvailability(state, playerId2, abilityId, payload = {}) {
  const ability = tryGetAbility(abilityId);
  if (!ability) return { available: false, reason: "Habilidade desconhecida." };
  const runtime = getAbilityState(state, playerId2, abilityId);
  if (!runtime) return { available: false, reason: "Sua fac\xE7\xE3o n\xE3o possui esta habilidade." };
  const usage = checkUsage(state, runtime, ability);
  if (!usage.available) return usage;
  const conditions = evaluateConditions(state, playerId2, ability.conditions, payload);
  if (!conditions.ok) return { available: false, reason: conditions.reason };
  return { available: true };
}
function consumeUsage(draft, playerId2, ability) {
  const runtime = draft.abilityStates[abilityKey(playerId2, ability.id)];
  if (!runtime) return;
  if (runtime.chargesRemaining > 0) runtime.chargesRemaining -= 1;
  runtime.usesThisTurn += 1;
  runtime.timesUsed += 1;
  runtime.lastUsedTurn = draft.turn.number;
  const cooldown = ability.usage.cooldownTurns ?? 0;
  if (cooldown > 0) runtime.availableFromTurn = draft.turn.number + cooldown;
}
function resetTurnCounters(draft, playerId2) {
  for (const runtime of Object.values(draft.abilityStates)) {
    if (runtime.playerId === playerId2) runtime.usesThisTurn = 0;
  }
}
function abilitiesListeningTo(state, playerId2, kind) {
  return abilitiesOfPlayer(state, playerId2).map((entry) => entry.definition).filter((definition) => definition.triggers.includes(kind));
}
function buildContext(state, playerId2, kind, payload, params) {
  return { state, playerId: playerId2, event: { kind, payload }, params };
}

// src/game/turns/turnMachine.ts
function activePlayerOrder(state) {
  return state.turn.order.filter((id2) => state.players[id2]?.status === "ACTIVE");
}
function peekNextPlayerId(state) {
  const order = state.turn.order;
  const active = activePlayerOrder(state);
  if (active.length === 0) return state.turn.currentPlayerId;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(state.turn.currentIndex + step) % order.length];
    if (state.players[candidate]?.status === "ACTIVE") return candidate;
  }
  return state.turn.currentPlayerId;
}
function turnStartedKey(turnNumber, player) {
  return `TURN_STARTED:${turnNumber}:${player}`;
}
var POI_REINFORCEMENT_IDS = TERRITORY_SEEDS.filter(
  (t) => t.poi?.kind === "REINFORCEMENT"
).map((t) => t.id);
function reinforcementBreakdown(state, player) {
  const owned = territoriesOf(state, player).length;
  const { minimum, territoriesPerExtraTroop } = BALANCE.reinforcements;
  const base = Math.max(minimum, Math.floor(owned / territoriesPerExtraTroop));
  const faction = getFaction(state.players[player].factionId);
  const multiplier = faction.rules.regionBonusMultiplier ?? 1;
  const blackedOut = blackedOutRegions(state);
  const regions = completedRegions(state, player).filter((r) => !blackedOut.includes(r.id));
  const rawBonus = regions.reduce((sum, r) => sum + r.bonus, 0);
  const regionBonus = multiplier === 1 ? rawBonus : Math.floor(rawBonus * multiplier);
  const poiBonus = faction.rules.ignorePoiBonus ? 0 : POI_REINFORCEMENT_IDS.filter(
    (id2) => state.territories[id2]?.controllerId === player
  ).length;
  const collapseBonus = collapseReinforcementBonus(state, player);
  return {
    base,
    regionBonus,
    poiBonus,
    collapseBonus,
    total: base + regionBonus + poiBonus + collapseBonus,
    regions: regions.map((r) => r.name)
  };
}
function reinforcementsFor(state, player) {
  return reinforcementBreakdown(state, player).total;
}
function movesAllowedFor(state, player) {
  const faction = getFaction(state.players[player].factionId);
  return (faction.rules.movesPerTurn ?? BALANCE.movement.perTurn) + extraMoves(state);
}
function startTurnFor(draft, player) {
  draft.turn.currentPlayerId = player;
  draft.turn.currentIndex = draft.turn.order.indexOf(player);
  draft.turn.phase = "REFORCO";
  draft.turn.commonAttackUsed = false;
  draft.turn.specialAttackUsed = false;
  draft.turn.movesUsed = 0;
  draft.turn.movesAllowed = movesAllowedFor(draft, player);
  draft.turn.drewCard = false;
  draft.turn.cardsDrawn = 0;
  draft.turn.conversionsThisTurn = 0;
  draft.turn.conquestsThisTurn = 0;
  draft.turn.turnsPlayed += 1;
  draft.turn.pendingReinforcements = reinforcementsFor(draft, player);
  resetTurnCounters(draft, player);
  for (const soldier of Object.values(draft.soldiers)) {
    if (soldier.alive && soldier.ownerId === player && soldier.status === "MOVED") {
      soldier.status = "READY";
    }
  }
}
function endTurn(draft) {
  const previous = draft.turn.currentPlayerId;
  const next = peekNextPlayerId(draft);
  const roundEnded = draft.turn.order.indexOf(next) <= draft.turn.currentIndex;
  startTurnFor(draft, next);
  return { previous, next, roundEnded };
}
function advancePhase(draft) {
  if (isLastPhase(draft.turn.phase)) {
    const { roundEnded } = endTurn(draft);
    return { changedPlayer: true, roundEnded };
  }
  draft.turn.phase = nextPhase(draft.turn.phase);
  return { changedPlayer: false, roundEnded: false };
}

// src/game/effects/effect.types.ts
var EFFECT_PRIORITY = {
  /** Bloqueios resolvem antes de tudo: podem cancelar o resto. */
  BLOCK: 0,
  /** Reação defensiva do alvo. */
  DEFENSE_REACTION: 10,
  /** Habilidade de facção. */
  ABILITY: 20,
  /** Efeito de carta. */
  CARD: 30,
  /** Resolução de combate. */
  COMBAT: 40,
  /** Manutenção do sistema (reforços, limpeza). */
  SYSTEM: 50
};

// src/game/effects/effectResolvers.ts
function notImplemented(kind) {
  return { ok: false, reason: `Efeito ${kind} ainda n\xE3o implementado (etapa futura).` };
}
var RESOLVERS = {
  GRANT_REINFORCEMENTS(draft, effect) {
    if (effect.kind !== "GRANT_REINFORCEMENTS") return notImplemented("GRANT_REINFORCEMENTS");
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: "Quantidade de refor\xE7o inv\xE1lida." };
    }
    if (!draft.players[effect.playerId]) {
      return { ok: false, reason: "Jogador inexistente." };
    }
    if (draft.turn.currentPlayerId !== effect.playerId) {
      return { ok: false, reason: "Refor\xE7o s\xF3 se aplica ao jogador do turno." };
    }
    draft.turn.pendingReinforcements += effect.amount;
    return { ok: true, message: `+${effect.amount} refor\xE7o(s).` };
  },
  ADD_TROOPS(draft, effect) {
    if (effect.kind !== "ADD_TROOPS") return notImplemented("ADD_TROOPS");
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: "Quantidade inv\xE1lida." };
    }
    const territory = draft.territories[effect.territoryId];
    if (!territory) return { ok: false, reason: "Territ\xF3rio inexistente." };
    const ownerId = effect.ownerId ?? territory.controllerId;
    if (!ownerId) return { ok: false, reason: "Territ\xF3rio sem controlador." };
    const owner = draft.players[ownerId];
    if (!owner) return { ok: false, reason: "Jogador inexistente." };
    for (let i = 0; i < effect.amount; i += 1) {
      createSoldier(draft, {
        factionId: owner.factionId,
        ownerId: owner.id,
        territoryId: territory.id
      });
    }
    return { ok: true, message: `+${effect.amount} soldado(s) em ${territory.name}.` };
  },
  REMOVE_TROOPS(draft, effect) {
    if (effect.kind !== "REMOVE_TROOPS") return notImplemented("REMOVE_TROOPS");
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: "Quantidade inv\xE1lida." };
    }
    const territory = draft.territories[effect.territoryId];
    if (!territory) return { ok: false, reason: "Territ\xF3rio inexistente." };
    const present = soldiersInTerritory(draft, territory.id);
    const removable = Math.min(effect.amount, present.length);
    if (removable === 0) return { ok: false, reason: `${territory.name} n\xE3o possui tropas.` };
    for (const soldier of present.slice(0, removable)) eliminateSoldier(draft, soldier.id);
    return { ok: true, message: `-${removable} soldado(s) em ${territory.name}.` };
  },
  MOVE_TROOPS(draft, effect) {
    if (effect.kind !== "MOVE_TROOPS") return notImplemented("MOVE_TROOPS");
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: "Quantidade inv\xE1lida." };
    }
    const from = draft.territories[effect.from];
    const to = draft.territories[effect.to];
    if (!from || !to) return { ok: false, reason: "Territ\xF3rio inexistente." };
    if (from.id === to.id) return { ok: false, reason: "Origem e destino s\xE3o o mesmo territ\xF3rio." };
    if (!from.controllerId || from.controllerId !== to.controllerId) {
      return { ok: false, reason: "Origem e destino precisam ser do mesmo jogador." };
    }
    if (!effect.ignoreAdjacency && !isAdjacent(draft, from.id, to.id)) {
      return { ok: false, reason: `${from.name} e ${to.name} n\xE3o s\xE3o vizinhos.` };
    }
    const minLeft = effect.minLeftBehind ?? BALANCE.territory.minGarrison;
    const available = soldiersInTerritory(draft, from.id);
    if (available.length - effect.amount < minLeft) {
      return {
        ok: false,
        reason: `\xC9 obrigat\xF3rio deixar ao menos ${minLeft} soldado(s) em ${from.name}.`
      };
    }
    for (const soldier of available.slice(0, effect.amount)) {
      placeInTerritory(draft, soldier.id, to.id);
      draft.soldiers[soldier.id].status = "MOVED";
    }
    return { ok: true, message: `${effect.amount} soldado(s): ${from.name} \u2192 ${to.name}.` };
  },
  CONVERT_TROOPS(draft, effect) {
    if (effect.kind !== "CONVERT_TROOPS") return notImplemented("CONVERT_TROOPS");
    const captor = draft.players[effect.toPlayerId];
    if (!captor) return { ok: false, reason: "Jogador inexistente." };
    let converted = 0;
    for (const id2 of effect.soldierIds) {
      const soldier = draft.soldiers[id2];
      if (!soldier || !soldier.alive) continue;
      captureSoldier(draft, id2, { factionId: captor.factionId, playerId: captor.id });
      converted += 1;
    }
    if (converted === 0) return { ok: false, reason: "Nenhum soldado v\xE1lido para converter." };
    syncPlayerTerritories(draft);
    return { ok: true, message: `${converted} soldado(s) convertido(s) para ${captor.name}.` };
  }
};
function resolveEffect(draft, effect) {
  const resolver = RESOLVERS[effect.kind];
  if (!resolver) return notImplemented(effect.kind);
  try {
    return resolver(draft, effect);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Falha ao aplicar efeito." };
  }
}

// src/game/effects/effectQueue.ts
function enqueueEffect(draft, params) {
  draft.counters.effect += 1;
  const queued = {
    id: `eff-${draft.counters.effect}`,
    effect: params.effect,
    source: params.source,
    priority: params.priority ?? EFFECT_PRIORITY.SYSTEM,
    status: "PENDING",
    createdAtTurn: draft.turn.number
  };
  draft.effectQueue.push(queued);
  return queued;
}
function archive(draft, entry) {
  draft.effectHistory.unshift(entry);
  if (draft.effectHistory.length > BALANCE.effects.historySize) {
    draft.effectHistory.length = BALANCE.effects.historySize;
  }
}
function resolveEffectQueue(draft) {
  const resolved = [];
  const failed = [];
  let guard = 0;
  for (; ; ) {
    const pending = draft.effectQueue.filter((e) => e.status === "PENDING");
    if (pending.length === 0) break;
    guard += 1;
    if (guard > BALANCE.effects.maxResolutionsPerCycle) {
      for (const entry of pending) {
        entry.status = "SKIPPED";
        entry.result = "Limite de resolu\xE7\xE3o do ciclo atingido.";
      }
      pushLog(draft, "ERROR", "Fila de efeitos interrompida: limite de resolu\xE7\xE3o atingido.");
      break;
    }
    const indexed = pending.map((entry) => ({
      entry,
      index: draft.effectQueue.indexOf(entry)
    }));
    indexed.sort((a, b) => a.entry.priority - b.entry.priority || a.index - b.index);
    const next = indexed[0].entry;
    const outcome = resolveEffect(draft, next.effect);
    if (outcome.ok) {
      next.status = "RESOLVED";
      next.result = outcome.message;
      resolved.push(next);
    } else {
      next.status = "FAILED";
      next.result = outcome.reason;
      failed.push(next);
      pushLog(draft, "ERROR", `Efeito recusado (${next.effect.kind}): ${outcome.reason}`);
    }
  }
  const processed = draft.effectQueue.filter((e) => e.status !== "PENDING");
  for (const entry of processed) archive(draft, entry);
  draft.effectQueue = draft.effectQueue.filter((e) => e.status === "PENDING");
  return { resolved, failed };
}
function clearEffectQueue(draft) {
  const removed = draft.effectQueue.length;
  for (const entry of draft.effectQueue) {
    entry.status = "SKIPPED";
    entry.result = "Removido manualmente (DEV).";
    archive(draft, entry);
  }
  draft.effectQueue = [];
  return removed;
}

// src/game/events/gameEvents.ts
var MAX_EVENT_KEYS = 64;
function alreadyEmitted(state, dedupeKey) {
  return state.emittedEventKeys.includes(dedupeKey);
}
function rememberKey(draft, dedupeKey) {
  draft.emittedEventKeys.unshift(dedupeKey);
  if (draft.emittedEventKeys.length > MAX_EVENT_KEYS) {
    draft.emittedEventKeys.length = MAX_EVENT_KEYS;
  }
}
function audienceFor(state, payload) {
  if (payload.playerId) return [payload.playerId];
  return state.turn.order.filter((id2) => state.players[id2]?.status === "ACTIVE");
}
function fireAbility(draft, ability, playerId2, event) {
  const runtime = getAbilityState(draft, playerId2, ability.id);
  if (!runtime) return null;
  const usage = checkUsage(draft, runtime, ability);
  if (!usage.available) return null;
  const conditions = evaluateConditions(draft, playerId2, ability.conditions, event.payload);
  if (!conditions.ok) return null;
  const context = buildContext(draft, playerId2, event.kind, event.payload);
  const effects = ability.produceEffects(context);
  if (effects.length === 0) return null;
  consumeUsage(draft, playerId2, ability);
  for (const effect of effects) {
    enqueueEffect(draft, {
      effect,
      source: { kind: "ABILITY", id: ability.id, playerId: playerId2, label: ability.name },
      priority: ability.kind === "REACTIVE" ? EFFECT_PRIORITY.DEFENSE_REACTION : EFFECT_PRIORITY.ABILITY
    });
  }
  const detail = ability.feedback.detail?.(context) ?? "";
  return {
    abilityId: ability.id,
    playerId: playerId2,
    title: ability.feedback.title,
    detail,
    turn: draft.turn.number
  };
}
function emitGameEvent(draft, params) {
  const payload = params.payload ?? {};
  if (params.dedupeKey && alreadyEmitted(draft, params.dedupeKey)) {
    return { fired: [], skipped: true };
  }
  if (params.dedupeKey) rememberKey(draft, params.dedupeKey);
  draft.counters.event += 1;
  const event = {
    id: `evt-${draft.counters.event}`,
    kind: params.kind,
    payload,
    turn: draft.turn.number,
    dedupeKey: params.dedupeKey
  };
  const fired = [];
  for (const playerId2 of audienceFor(draft, payload)) {
    for (const ability of abilitiesListeningTo(draft, playerId2, event.kind)) {
      const record = fireAbility(draft, ability, playerId2, event);
      if (record) fired.push(record);
    }
  }
  const resolution = resolveEffectQueue(draft);
  for (const record of fired) {
    const applied = resolution.resolved.some((entry) => entry.source.id === record.abilityId);
    if (!applied) continue;
    pushLog(
      draft,
      "ABILITY",
      `${record.title}${record.detail ? ` \u2014 ${record.detail}` : ""}`
    );
    draft.abilityFeed.unshift(record);
    if (draft.abilityFeed.length > 10) draft.abilityFeed.length = 10;
  }
  return { fired, skipped: false };
}

// src/game/engine/setup.ts
var FACTION_PRIORITY = [
  HUMANOS_ID,
  ALIENIGENAS_ID,
  ZUMBIS_ID,
  VAMPIROS_ID,
  MAGOS_ID,
  GOBLINS_ID
];
var MAX_PLAYERS = 6;
var MIN_PLAYERS = 2;
var PLAYER_IDS = {
  p1: playerId("player-1"),
  p2: playerId("player-2"),
  p3: playerId("player-3"),
  p4: playerId("player-4"),
  p5: playerId("player-5"),
  p6: playerId("player-6")
};
var NEUTRAL_PLAYER_ID = playerId("remanescentes");
var SEAT_IDS = [
  PLAYER_IDS.p1,
  PLAYER_IDS.p2,
  PLAYER_IDS.p3,
  PLAYER_IDS.p4,
  PLAYER_IDS.p5,
  PLAYER_IDS.p6
];
function territoriesPerPlayer(playerCount) {
  return BALANCE.setup.territoriesPerPlayer[playerCount] ?? 5;
}
function startingTroopsFor(playerCount, seat) {
  const base = territoriesPerPlayer(playerCount) * BALANCE.setup.troopsPerTerritory;
  return base + BALANCE.setup.seatCompensation * (seat - 1);
}
function signatureCardOf(factionId2) {
  if (factionId2 === HUMANOS_ID) return SEQUESTRO_CARD_ID;
  const id2 = SIGNATURE_BY_FACTION[factionId2];
  return cardDefinitionId(id2 ?? SEQUESTRO_CARD_ID);
}
function createGame(options = {}) {
  const requested = options.players?.length ?? options.playerCount ?? 4;
  const playerCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, requested));
  const rng = options.rng ?? (options.deterministic ? seededRng(20260827) : defaultRng);
  const territories = {};
  for (const seed of TERRITORY_SEEDS) {
    territories[seed.id] = {
      id: seed.id,
      name: seed.name,
      controllerId: null,
      garrison: [],
      neighbors: [...seed.neighbors],
      status: "STABLE",
      region: seed.region,
      position: seed.position
    };
  }
  const seats = SEAT_IDS.slice(0, playerCount);
  const order = options.deterministic ? seats : shuffle(seats, rng);
  const availableFactions = FACTION_PRIORITY.filter(
    (id2) => !(options.players ?? []).some((p) => p.factionId === id2)
  );
  const reversed = [...order].reverse();
  const factionByPlayer = /* @__PURE__ */ new Map();
  let nextFaction = 0;
  for (const id2 of reversed) {
    const seatIndex = seats.indexOf(id2);
    const explicit = options.players?.[seatIndex]?.factionId;
    factionByPlayer.set(id2, explicit ?? availableFactions[nextFaction++]);
  }
  const players = {};
  order.forEach((id2, index) => {
    const seatIndex = seats.indexOf(id2);
    const setup = options.players?.[seatIndex];
    const factionId2 = factionByPlayer.get(id2);
    const faction = getFaction(factionId2);
    players[id2] = {
      id: id2,
      name: setup?.name ?? `Jogador ${index + 1}`,
      factionId: factionId2,
      kind: setup?.kind ?? "HUMAN",
      territoryIds: [],
      handCardIds: [],
      status: "ACTIVE",
      seat: index + 1,
      transportCharges: BALANCE.transport.startingCharges,
      turnsWithoutCard: 0,
      color: faction.color
    };
  });
  const perPlayer = territoriesPerPlayer(playerCount);
  const pool = options.deterministic ? TERRITORY_SEEDS.map((t) => t.id) : shuffle(TERRITORY_SEEDS.map((t) => t.id), rng);
  let cursor = 0;
  for (let round = 0; round < perPlayer; round += 1) {
    for (const id2 of order) {
      territories[pool[cursor++]].controllerId = id2;
    }
  }
  const neutralIds = pool.slice(cursor);
  const state = {
    version: GAME_STATE_VERSION,
    id: options.gameId ?? `game-${options.createdAt ?? Date.now()}`,
    createdAt: options.createdAt ?? Date.now(),
    status: "IN_PROGRESS",
    turn: {
      number: 1,
      turnsPlayed: 0,
      phase: "REFORCO",
      currentPlayerId: order[0],
      order,
      currentIndex: 0,
      pendingReinforcements: 0,
      commonAttackUsed: false,
      specialAttackUsed: false,
      movesUsed: 0,
      movesAllowed: BALANCE.movement.perTurn,
      drewCard: false,
      cardsDrawn: 0,
      conversionsThisTurn: 0,
      conquestsThisTurn: 0
    },
    players,
    territories,
    soldiers: {},
    cards: {},
    deck: buildDeck(rng),
    discard: [],
    pendingAttack: null,
    pendingOccupation: null,
    pendingDistribution: null,
    animationQueue: [],
    abilityStates: {},
    effectQueue: [],
    effectHistory: [],
    abilityFeed: [],
    emittedEventKeys: [],
    missions: {},
    collapse: createCollapseState(rng),
    disabledLinks: [],
    territoryModifiers: [],
    result: null,
    log: [],
    counters: { soldier: 0, card: 0, event: 0, log: 0, effect: 0 }
  };
  for (const id2 of order) {
    const player = players[id2];
    const owned = Object.values(territories).filter((t) => t.controllerId === id2);
    const total = startingTroopsFor(playerCount, player.seat);
    for (const territory of owned) {
      createSoldier(state, {
        factionId: player.factionId,
        ownerId: id2,
        territoryId: territory.id
      });
    }
    for (let i = 0; i < total - owned.length; i += 1) {
      createSoldier(state, {
        factionId: player.factionId,
        ownerId: id2,
        territoryId: owned[i % owned.length].id
      });
    }
  }
  if (neutralIds.length > 0) {
    state.players[NEUTRAL_PLAYER_ID] = {
      id: NEUTRAL_PLAYER_ID,
      name: "Remanescentes",
      factionId: REMANESCENTES_ID,
      kind: "AI",
      territoryIds: [],
      handCardIds: [],
      status: "NEUTRAL",
      seat: 0,
      transportCharges: 0,
      turnsWithoutCard: 0,
      color: getFaction(REMANESCENTES_ID).color
    };
    for (const id2 of neutralIds) {
      state.territories[id2].controllerId = NEUTRAL_PLAYER_ID;
      for (let i = 0; i < BALANCE.setup.neutralGarrison; i += 1) {
        createSoldier(state, {
          factionId: REMANESCENTES_ID,
          ownerId: NEUTRAL_PLAYER_ID,
          territoryId: id2
        });
      }
    }
  }
  for (const id2 of order) {
    createCardInstance(state, id2, signatureCardOf(players[id2].factionId));
  }
  syncPlayerTerritories(state);
  const deal = dealMissions(
    order.map((id2) => ({ id: id2, factionId: players[id2].factionId })),
    rng,
    state
  );
  state.missions = deal.assignments;
  syncPlayerTerritories(state);
  for (const id2 of order) seedAbilityStates(state, id2);
  state.turn.pendingReinforcements = reinforcementsFor(state, state.turn.currentPlayerId);
  pushLog(
    state,
    "INFO",
    `Partida iniciada com ${playerCount} jogadores. ${neutralIds.length} territ\xF3rio(s) Remanescente(s).`
  );
  emitGameEvent(state, {
    kind: "TURN_STARTED",
    payload: { playerId: state.turn.currentPlayerId },
    dedupeKey: turnStartedKey(state.turn.number, state.turn.currentPlayerId)
  });
  return state;
}
function grantCard(draft, owner, definitionId) {
  return createCardInstance(draft, owner, definitionId);
}

// src/game/combat/conquest.ts
function defendersAlive(state, territory) {
  return soldiersInTerritory(state, territory).length;
}
function conquerTerritory(draft, params) {
  const origin = getTerritory(draft, params.from);
  const target = getTerritory(draft, params.to);
  if (!origin.controllerId) throw new Error("Territ\xF3rio atacante sem controlador.");
  if (defendersAlive(draft, target.id) > 0) {
    throw new Error("Ainda existem defensores: o territ\xF3rio n\xE3o pode ser conquistado.");
  }
  target.controllerId = origin.controllerId;
  target.status = "STABLE";
  syncPlayerTerritories(draft);
  const attackers = soldiersInTerritory(draft, origin.id);
  const eligible = attackers.filter((s) => s.status === "ATTACKING");
  const max = Math.max(1, Math.min(eligible.length || attackers.length - 1, attackers.length - 1));
  const occupation = {
    attackerPlayerId: origin.controllerId,
    fromTerritoryId: origin.id,
    toTerritoryId: target.id,
    min: 1,
    max,
    eligibleSoldierIds: (eligible.length > 0 ? eligible : attackers).map((s) => s.id)
  };
  draft.pendingOccupation = occupation;
  return occupation;
}

// src/game/combat/dice.ts
function rollDie(sides = BALANCE.dice.defaultSides, rng = defaultRng) {
  if (!Number.isInteger(sides) || sides < 2 || sides > BALANCE.dice.maxSides) {
    throw new Error(`N\xFAmero de faces inv\xE1lido: ${sides}`);
  }
  const raw = rng.next();
  const normalized = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999) : 0;
  return { sides, value: Math.floor(normalized * sides) + 1 };
}

// src/game/combat/battle.ts
function attackerDiceFor(troopsInOrigin, cap = BALANCE.dice.maxAttackDice) {
  const usable = troopsInOrigin - BALANCE.territory.minGarrison;
  if (usable <= 0) return 0;
  return Math.max(0, Math.min(usable, cap, BALANCE.dice.maxAttackDice));
}
function defenderDiceFor(defenders, cap = BALANCE.dice.maxDefenseDice) {
  if (defenders <= 0) return 0;
  return Math.max(0, Math.min(defenders, cap, BALANCE.dice.maxDefenseDice));
}
function compareDice(attackerDice, defenderDice, options = {}) {
  const a = [...attackerDice].sort((x, y) => y - x);
  const d = [...defenderDice].sort((x, y) => y - x);
  const pairs = Math.min(a.length, d.length);
  const comparisons = [];
  let attackerLosses = 0;
  let defenderLosses = 0;
  let forgiven = false;
  for (let i = 0; i < pairs; i += 1) {
    const attackerWins = a[i] > d[i];
    comparisons.push({
      attacker: a[i],
      defender: d[i],
      winner: attackerWins ? "ATTACKER" : "DEFENDER"
    });
    if (attackerWins) {
      if (options.ignoreFirstDefenderLoss && !forgiven) {
        forgiven = true;
        continue;
      }
      defenderLosses += 1;
    } else {
      attackerLosses += 1;
    }
  }
  return { comparisons, attackerLosses, defenderLosses };
}
function attackerCapFor(state, from, to) {
  let cap = BALANCE.dice.maxAttackDice;
  if (isLinkKind(from, to, "MARITIMA")) cap = Math.min(cap, BALANCE.dice.maritimeAttackDice);
  for (const modifier of activeModifiersFor(state, to)) {
    if (modifier.attackerDiceReduction) cap -= modifier.attackerDiceReduction;
  }
  const target = state.territories[to];
  const defenderId = target?.controllerId;
  if (defenderId) {
    const defenderFaction = tryGetFaction(state.players[defenderId]?.factionId);
    const threshold = defenderFaction?.rules.fortifiedFrom;
    if (threshold && target.garrison.length >= threshold) cap -= 1;
  }
  return Math.max(1, cap);
}
function planBattle(state, attack) {
  const origin = getTerritory(state, attack.fromTerritoryId);
  const target = getTerritory(state, attack.toTerritoryId);
  const attackerTroops = attack.kind === "SPECIAL" ? attack.attackingSoldierIds.filter((id2) => state.soldiers[id2]?.alive).length : origin.garrison.length;
  const defenderTroops = target.garrison.length;
  const attackerDice = attack.kind === "SPECIAL" ? Math.max(0, Math.min(attackerTroops, attack.attackerDiceCap)) : attackerDiceFor(attackerTroops, attack.attackerDiceCap);
  return {
    attackerTroops,
    defenderTroops,
    attackerDice,
    defenderDice: defenderDiceFor(defenderTroops, attack.defenderDiceCap),
    attackerCap: attack.attackerDiceCap
  };
}
function rollBattleRound(draft, attack, rng = defaultRng) {
  const plan = planBattle(draft, attack);
  if (plan.attackerDice <= 0) {
    throw new Error("O atacante n\xE3o tem tropas suficientes para rolar dados.");
  }
  if (plan.defenderDice <= 0) {
    throw new Error("N\xE3o h\xE1 defensores para rolar dados.");
  }
  const attackerDice = Array.from({ length: plan.attackerDice }, () => rollDie(6, rng).value);
  const defenderDice = Array.from({ length: plan.defenderDice }, () => rollDie(6, rng).value);
  const pending = attack.rerolls ?? [];
  for (const side of [...pending]) {
    const dice = side === "ATTACKER" ? attackerDice : defenderDice;
    if (dice.length === 0) continue;
    let lowest = 0;
    for (let i = 1; i < dice.length; i += 1) if (dice[i] < dice[lowest]) lowest = i;
    dice[lowest] = rollDie(6, rng).value;
    pending.splice(pending.indexOf(side), 1);
  }
  attack.rerolls = pending;
  const shielded = activeModifiersFor(draft, attack.toTerritoryId).some(
    (m) => m.ignoreFirstLossPerRound
  );
  const compared = compareDice(attackerDice, defenderDice, {
    ignoreFirstDefenderLoss: shielded
  });
  const round = {
    index: attack.rounds.length + 1,
    attackerDice,
    defenderDice,
    ...compared
  };
  return {
    round,
    attackerCasualties: [],
    defenderCasualties: [],
    defenderWiped: false,
    attackerExhausted: false
  };
}
function livingAttackers(state, attack) {
  return attack.attackingSoldierIds.filter((id2) => state.soldiers[id2]?.alive);
}
function canContinueBattle(state, attack) {
  const target = getTerritory(state, attack.toTerritoryId);
  if (target.garrison.length === 0) return false;
  const plan = planBattle(state, attack);
  return plan.attackerDice > 0;
}

// src/game/cards/cardRules.ts
function getCardInstance(state, id2) {
  const card = state.cards[id2];
  if (!card) throw new Error(`Carta inexistente na partida: ${id2}`);
  return card;
}
function effectFor(definition, mode) {
  const effect = mode === "PRIMARY" ? definition.primaryEffect : definition.alternateEffect;
  if (!effect) throw new Error(`A carta ${definition.name} n\xE3o possui efeito ${mode}.`);
  return effect;
}
function checkCondition(state, card, condition) {
  switch (condition.type) {
    case "PHASE_IS":
      return condition.phases.includes(state.turn.phase) ? { allowed: true } : { allowed: false, reason: `S\xF3 pode ser usada na fase ${condition.phases.join(" / ")}.` };
    case "IS_CURRENT_PLAYER":
      return state.turn.currentPlayerId === card.ownerId ? { allowed: true } : { allowed: false, reason: "S\xF3 o jogador do turno pode usar esta carta." };
    case "HAS_PENDING_ATTACK_AGAINST_OWNER": {
      const attack = state.pendingAttack;
      const ok = !!attack && attack.status === "DECLARED" && attack.defenderPlayerId === card.ownerId;
      return ok ? { allowed: true } : { allowed: false, reason: "S\xF3 pode ser usada ao sofrer um ataque declarado." };
    }
    case "ENEMY_SOLDIERS_AVAILABLE": {
      const enemies = Object.values(state.soldiers).filter(
        (s) => s.alive && s.location.kind === "TERRITORY" && s.ownerId !== card.ownerId
      );
      return enemies.length >= condition.min ? { allowed: true } : { allowed: false, reason: "N\xE3o h\xE1 soldados inimigos em territ\xF3rio para capturar." };
    }
    default:
      return { allowed: true };
  }
}
function canUseCard(state, cardId, mode) {
  const card = getCardInstance(state, cardId);
  const definition = getCardDefinition(card.definitionId);
  if (card.state === "CONSUMED") {
    const used = card.usedMode === "PRIMARY" ? definition.primaryEffect.name : definition.alternateEffect?.name;
    return { allowed: false, reason: `Carta j\xE1 consumida (usada como ${used}).` };
  }
  if (card.state !== "IN_HAND") {
    return { allowed: false, reason: "A carta n\xE3o est\xE1 na m\xE3o do jogador." };
  }
  if (card.usesRemaining <= 0) {
    return { allowed: false, reason: "A carta n\xE3o possui usos restantes." };
  }
  if (card.usedMode !== null && card.usedMode !== mode) {
    return { allowed: false, reason: "Esta carta j\xE1 foi usada com o outro efeito." };
  }
  if (mode === "ALTERNATE" && !definition.alternateEffect) {
    return { allowed: false, reason: "Esta carta n\xE3o possui efeito alternativo." };
  }
  const conditions = [...definition.conditions, ...effectFor(definition, mode).conditions];
  for (const condition of conditions) {
    const result = checkCondition(state, card, condition);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}
function consumeCard(draft, cardId, mode) {
  const card = getCardInstance(draft, cardId);
  card.usesRemaining = Math.max(0, card.usesRemaining - 1);
  card.usedMode = mode;
  card.history.push({ mode, turn: draft.turn.number });
  if (card.usesRemaining === 0) {
    card.state = "CONSUMED";
    const owner = draft.players[card.ownerId];
    if (owner) owner.handCardIds = owner.handCardIds.filter((id2) => id2 !== card.instanceId);
  }
}

// src/game/events/animationEvents.ts
function emitAnimation(draft, spec, payload) {
  draft.counters.event += 1;
  const event = {
    id: `anim-${draft.counters.event}`,
    specId: spec.id,
    createdAtTurn: draft.turn.number,
    payload,
    status: "PENDING"
  };
  draft.animationQueue.push(event);
  return event;
}
function markAnimationPlayed(draft, eventId) {
  const event = draft.animationQueue.find((e) => e.id === eventId);
  if (event) event.status = "PLAYED";
}

// src/game/cards/effects/sequestro.effect.ts
function validateSequestroSelection(state, cardId, selection) {
  const card = getCardInstance(state, cardId);
  const unique = new Set(selection.map(String));
  if (unique.size !== selection.length) {
    return { ok: false, error: "Sele\xE7\xE3o cont\xE9m soldados repetidos." };
  }
  if (selection.length === 0) {
    return { ok: false, error: "Selecione ao menos 1 soldado inimigo." };
  }
  if (selection.length > SEQUESTRO_MAX_TARGETS) {
    return {
      ok: false,
      error: `O Sequestro permite no m\xE1ximo ${SEQUESTRO_MAX_TARGETS} soldados (selecionados: ${selection.length}).`
    };
  }
  for (const id2 of selection) {
    const soldier = state.soldiers[id2];
    if (!soldier) return { ok: false, error: `Soldado inexistente: ${id2}` };
    if (!soldier.alive) return { ok: false, error: "N\xE3o \xE9 poss\xEDvel capturar um soldado eliminado." };
    if (soldier.ownerId === card.ownerId) {
      return { ok: false, error: "S\xF3 \xE9 poss\xEDvel capturar soldados de um time advers\xE1rio." };
    }
    if (soldier.location.kind !== "TERRITORY") {
      return { ok: false, error: "O soldado precisa estar em um territ\xF3rio inimigo." };
    }
  }
  return { ok: true };
}
function applySequestro(draft, cardId, selection) {
  const card = getCardInstance(draft, cardId);
  const captor = draft.players[card.ownerId];
  if (!captor) throw new Error("Dono da carta n\xE3o encontrado.");
  const fromTerritoryIds = [];
  for (const id2 of selection) {
    const soldier = getSoldier(draft, id2);
    if (soldier.location.kind === "TERRITORY") {
      const territoryKey = soldier.location.territoryId;
      if (!fromTerritoryIds.includes(territoryKey)) fromTerritoryIds.push(territoryKey);
    }
    captureSoldier(draft, id2, { factionId: captor.factionId, playerId: captor.id });
  }
  draft.pendingDistribution = {
    playerId: captor.id,
    soldierIds: [...selection],
    sourceCardId: cardId
  };
  const event = emitAnimation(draft, SEQUESTRO_ANIMATION, {
    capturedSoldierIds: selection.map(String),
    fromTerritoryIds,
    captorPlayerId: captor.id
  });
  return { capturedIds: [...selection], fromTerritoryIds, animationEventId: event.id };
}

// src/game/cards/effects/vacina.effect.ts
function applyVacina(draft, cardId, rng = defaultRng) {
  const card = getCardInstance(draft, cardId);
  const attack = draft.pendingAttack;
  if (!attack || attack.status !== "DECLARED" || attack.defenderPlayerId !== card.ownerId) {
    throw new Error("N\xE3o h\xE1 ataque declarado contra este jogador.");
  }
  const roll = rollDie(VACINA_DICE_SIDES, rng);
  const livingAttackers2 = attack.attackingSoldierIds.filter(
    (id2) => draft.soldiers[id2]?.alive
  );
  const eliminatedCount = Math.max(0, Math.min(roll.value, livingAttackers2.length));
  const eliminatedIds = livingAttackers2.slice(0, eliminatedCount);
  for (const id2 of eliminatedIds) eliminateSoldier(draft, id2);
  attack.attackingSoldierIds = attack.attackingSoldierIds.filter(
    (id2) => !eliminatedIds.includes(id2)
  );
  const attackersRemaining = attack.attackingSoldierIds.filter(
    (id2) => draft.soldiers[id2]?.alive
  ).length;
  if (attackersRemaining === 0) attack.status = "CANCELLED";
  const event = emitAnimation(draft, VACINA_ANIMATION, {
    diceValue: roll.value,
    diceSides: roll.sides,
    eliminatedSoldierIds: eliminatedIds.map(String),
    eliminatedCount,
    attackersRemaining,
    attackerPlayerId: attack.attackerPlayerId,
    defenderPlayerId: attack.defenderPlayerId
  });
  return {
    diceValue: roll.value,
    eliminatedIds,
    eliminatedCount,
    attackersRemaining,
    animationEventId: event.id
  };
}

// src/game/cards/cardActions.ts
function ownTerritory(draft, playerId2, id2, label) {
  if (!id2) return { error: `Escolha ${label}.` };
  const territory = draft.territories[id2];
  if (!territory) return { error: "Territ\xF3rio inexistente." };
  if (territory.controllerId !== playerId2) return { error: `${territory.name} n\xE3o \xE9 seu.` };
  return { territory };
}
function enemyTerritory(draft, playerId2, id2) {
  if (!id2) return { error: "Escolha um territ\xF3rio inimigo." };
  const territory = draft.territories[id2];
  if (!territory) return { error: "Territ\xF3rio inexistente." };
  if (!territory.controllerId || territory.controllerId === playerId2) {
    return { error: "O alvo precisa ser um territ\xF3rio inimigo." };
  }
  return { territory };
}
function applyCardAction(draft, spec, playerId2, params = {}, rng = defaultRng) {
  const player = draft.players[playerId2];
  if (!player) return { ok: false, error: "Jogador inexistente." };
  switch (spec.type) {
    case "SEQUESTRO":
    case "VACINA":
      return { ok: false, error: "Efeito oficial resolvido fora deste resolvedor." };
    case "GAIN_TROOPS": {
      const owned = territoriesOf(draft, playerId2);
      if (owned.length === 0) return { ok: false, error: "Sem territ\xF3rios." };
      const assignments = params.assignments && params.assignments.length > 0 ? params.assignments : owned.slice(0, spec.amount).map((t, i) => ({
        territoryId: t.id,
        amount: i < spec.amount % owned.length ? 1 : 0
      }));
      let placed = 0;
      if (params.assignments && params.assignments.length > 0) {
        const total = assignments.reduce((sum, a) => sum + a.amount, 0);
        if (total !== spec.amount) {
          return { ok: false, error: `Distribua exatamente ${spec.amount} soldado(s).` };
        }
        for (const entry of assignments) {
          const check = ownTerritory(draft, playerId2, entry.territoryId, "um territ\xF3rio seu");
          if (!check.territory) return { ok: false, error: check.error };
          for (let i = 0; i < entry.amount; i += 1) {
            createSoldier(draft, {
              factionId: player.factionId,
              ownerId: playerId2,
              territoryId: entry.territoryId
            });
            placed += 1;
          }
        }
      } else {
        for (let i = 0; i < spec.amount; i += 1) {
          createSoldier(draft, {
            factionId: player.factionId,
            ownerId: playerId2,
            territoryId: owned[i % owned.length].id
          });
          placed += 1;
        }
      }
      return { ok: true, message: `+${placed} soldado(s).` };
    }
    case "SABOTAGE": {
      const target = enemyTerritory(draft, playerId2, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      const soldiers = soldiersInTerritory(draft, target.territory.id);
      const removable = Math.min(spec.amount, soldiers.length - BALANCE.territory.minGarrison);
      if (removable <= 0) {
        return { ok: false, error: "O alvo j\xE1 est\xE1 no m\xEDnimo de guarni\xE7\xE3o." };
      }
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
      return { ok: true, message: `${target.territory.name} perde ${removable} soldado(s).` };
    }
    case "ORBITAL_STRIKE": {
      const target = enemyTerritory(draft, playerId2, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      const soldiers = soldiersInTerritory(draft, target.territory.id);
      const removable = Math.min(spec.amount, soldiers.length - BALANCE.territory.minGarrison);
      if (removable <= 0) return { ok: false, error: "O alvo j\xE1 est\xE1 no m\xEDnimo de guarni\xE7\xE3o." };
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
      return {
        ok: true,
        message: `${target.territory.name} perde ${removable} soldado(s) sob o feixe orbital.`
      };
    }
    case "RITUAL": {
      const id2 = params.targetTerritoryId;
      const territory = id2 ? draft.territories[id2] : void 0;
      if (!territory?.controllerId) return { ok: false, error: "Escolha um territ\xF3rio ocupado." };
      const roll = rollInt(spec.diceSides, rng);
      const soldiers = soldiersInTerritory(draft, territory.id);
      const floor = territory.controllerId === playerId2 ? BALANCE.territory.minGarrison : BALANCE.territory.minGarrison;
      const removable = Math.max(0, Math.min(roll, soldiers.length - floor));
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
      return {
        ok: true,
        message: `Ritual Maior em ${territory.name}: 1D6 = ${roll} \u2192 ${removable} soldado(s) perdido(s).`,
        data: { diceValue: roll, eliminated: removable }
      };
    }
    case "BLOOD_PACT": {
      const target = enemyTerritory(draft, playerId2, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      const source = territoriesOf(draft, playerId2).find(
        (own) => isAdjacent(draft, own.id, target.territory.id)
      );
      if (!source) return { ok: false, error: "Voc\xEA precisa de um territ\xF3rio vizinho ao alvo." };
      const roll = rollInt(spec.diceSides, rng);
      const soldiers = soldiersInTerritory(draft, target.territory.id);
      const drained = Math.max(0, Math.min(roll, soldiers.length - BALANCE.territory.minGarrison));
      for (let i = 0; i < drained; i += 1) eliminateSoldier(draft, soldiers[i].id);
      const gained = Math.floor(drained / 2);
      for (let i = 0; i < gained; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: playerId2,
          territoryId: source.id
        });
      }
      return {
        ok: true,
        message: `Pacto de Sangue: 1D6 = ${roll} \u2192 ${drained} drenado(s), ${gained} ganho(s) em ${source.name}.`,
        data: { diceValue: roll, drained, gained }
      };
    }
    case "TRAP": {
      const own = ownTerritory(draft, playerId2, params.targetTerritoryId, "um territ\xF3rio seu");
      if (!own.territory) return { ok: false, error: own.error };
      addTerritoryModifier(draft, {
        territoryId: own.territory.id,
        ownerId: playerId2,
        untilRound: draft.turn.number + spec.rounds,
        trapDamage: spec.damage,
        source: "card.armadilha-explosiva"
      });
      return {
        ok: true,
        message: `${own.territory.name} minado: quem entrar perde ${spec.damage} soldado(s).`
      };
    }
    case "EXTRA_MOVE": {
      draft.turn.movesAllowed += spec.amount;
      return { ok: true, message: `+${spec.amount} movimenta\xE7\xE3o neste turno.` };
    }
    case "EVACUATE": {
      const origin = ownTerritory(draft, playerId2, params.fromTerritoryId, "a origem");
      if (!origin.territory) return { ok: false, error: origin.error };
      const destination = ownTerritory(draft, playerId2, params.targetTerritoryId, "o destino");
      if (!destination.territory) return { ok: false, error: destination.error };
      if (origin.territory.id === destination.territory.id) {
        return { ok: false, error: "Origem e destino precisam ser diferentes." };
      }
      if (isAdjacent(draft, origin.territory.id, destination.territory.id)) {
        return { ok: false, error: "A Evacua\xE7\xE3o exige um destino N\xC3O adjacente." };
      }
      const requested = Math.min(params.amount ?? spec.amount, spec.amount);
      const movable = origin.territory.garrison.length - BALANCE.territory.minGarrison;
      const amount = Math.min(requested, movable);
      if (amount <= 0) return { ok: false, error: "Sem soldados suficientes na origem." };
      for (const soldierId2 of origin.territory.garrison.slice(0, amount)) {
        placeInTerritory(draft, soldierId2, destination.territory.id);
      }
      return {
        ok: true,
        message: `${amount} soldado(s) de ${origin.territory.name} para ${destination.territory.name}.`
      };
    }
    case "SHIELD": {
      const own = ownTerritory(draft, playerId2, params.targetTerritoryId, "um territ\xF3rio seu");
      if (!own.territory) return { ok: false, error: own.error };
      addTerritoryModifier(draft, {
        territoryId: own.territory.id,
        ownerId: playerId2,
        untilRound: draft.turn.number + spec.rounds,
        attackerDiceReduction: spec.attackerDiceReduction,
        blockSpecialAttack: spec.blockSpecialAttack,
        ignoreFirstLossPerRound: spec.ignoreFirstLossPerRound,
        source: "card"
      });
      return { ok: true, message: `${own.territory.name} protegido.` };
    }
    case "BLOCK_TERRITORY": {
      const target = enemyTerritory(draft, playerId2, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      addTerritoryModifier(draft, {
        territoryId: target.territory.id,
        ownerId: playerId2,
        untilRound: draft.turn.number + spec.rounds,
        blockReinforce: true,
        source: "card"
      });
      return { ok: true, message: `${target.territory.name} sem refor\xE7o nem movimenta\xE7\xE3o.` };
    }
    case "DICE_CAP_INCOMING": {
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== "DECLARED" || attack.defenderPlayerId !== playerId2) {
        return { ok: false, error: "S\xF3 vale quando voc\xEA est\xE1 sendo atacado." };
      }
      attack.attackerDiceCap = Math.max(1, Math.min(attack.attackerDiceCap, spec.value));
      return { ok: true, message: `O atacante fica limitado a ${attack.attackerDiceCap} dado(s).` };
    }
    case "AMBUSH": {
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== "DECLARED" || attack.defenderPlayerId !== playerId2) {
        return { ok: false, error: "S\xF3 vale quando voc\xEA est\xE1 sendo atacado." };
      }
      const living = attack.attackingSoldierIds.filter(
        (id2) => draft.soldiers[id2]?.alive
      );
      const origin = getTerritory(draft, attack.fromTerritoryId);
      const removable = Math.min(
        spec.amount,
        living.length,
        origin.garrison.length - BALANCE.territory.minGarrison
      );
      if (removable <= 0) return { ok: false, error: "N\xE3o h\xE1 atacante eleg\xEDvel." };
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, living[i]);
      return { ok: true, message: `O atacante perde ${removable} soldado(s) antes da batalha.` };
    }
    case "REROLL_LOWEST": {
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== "DECLARED") {
        return { ok: false, error: "S\xF3 vale durante uma batalha." };
      }
      const isAttacker = attack.attackerPlayerId === playerId2;
      if (spec.side === "ATTACKER" && !isAttacker) {
        return { ok: false, error: "Esta carta \xE9 para quem ataca." };
      }
      if (spec.side === "DEFENDER" && isAttacker) {
        return { ok: false, error: "Esta carta \xE9 para quem defende." };
      }
      attack.rerolls = attack.rerolls ?? [];
      attack.rerolls.push(spec.side);
      return { ok: true, message: "Voc\xEA relan\xE7ar\xE1 o dado mais baixo na pr\xF3xima rodada." };
    }
    case "RESTORE_TROOPS": {
      const owned = territoriesOf(draft, playerId2);
      if (owned.length === 0) return { ok: false, error: "Sem territ\xF3rios." };
      const lost = Object.values(draft.soldiers).filter(
        (s) => !s.alive && s.ownerId === playerId2 && s.lostAtRound === draft.turn.number
      );
      const amount = Math.min(spec.amount, lost.length);
      if (amount <= 0) return { ok: false, error: "Voc\xEA n\xE3o perdeu soldados nesta rodada." };
      for (let i = 0; i < amount; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: playerId2,
          territoryId: owned[i % owned.length].id
        });
      }
      return { ok: true, message: `${amount} soldado(s) reconstitu\xEDdo(s).` };
    }
    case "DEFECTION": {
      const target = enemyTerritory(draft, playerId2, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      if (target.territory.garrison.length < spec.minEnemyTroops) {
        return {
          ok: false,
          error: `O alvo precisa ter ao menos ${spec.minEnemyTroops} soldados.`
        };
      }
      const destination = territoriesOf(draft, playerId2).find(
        (t) => isAdjacent(draft, t.id, target.territory.id)
      );
      if (!destination) {
        return { ok: false, error: "Voc\xEA n\xE3o tem territ\xF3rio vizinho ao alvo." };
      }
      const soldierId2 = target.territory.garrison[0];
      const soldier = draft.soldiers[soldierId2];
      if (!soldier) return { ok: false, error: "Alvo sem soldados." };
      soldier.ownerId = playerId2;
      soldier.factionId = player.factionId;
      placeInTerritory(draft, soldierId2, destination.id);
      syncPlayerTerritories(draft);
      return { ok: true, message: `1 soldado deserta para ${destination.name}.` };
    }
    case "REVEAL_HAND": {
      const targetId = params.targetPlayerId;
      const target = targetId ? draft.players[targetId] : void 0;
      if (!target || target.id === playerId2) {
        return { ok: false, error: "Escolha um advers\xE1rio." };
      }
      return {
        ok: true,
        message: `M\xE3o de ${target.name} revelada.`,
        data: { revealedHandOf: target.id, cardIds: [...target.handCardIds] }
      };
    }
    case "PEEK_COLLAPSE": {
      const next = draft.collapse.pending?.eventId ?? draft.collapse.bag[0];
      if (!next) return { ok: false, error: "N\xE3o h\xE1 evento previsto." };
      return {
        ok: true,
        message: `Pr\xF3ximo Evento do Colapso: ${getCollapseEvent(next).name}.`,
        data: { eventId: next }
      };
    }
    case "REPEAT_LAST_COLLAPSE": {
      const last = draft.collapse.history[0];
      if (!last) return { ok: false, error: "Nenhum Evento do Colapso foi revelado ainda." };
      armCollapse(draft, last.eventId, rng);
      const applied = applyPendingCollapse(draft, rng);
      if (!applied) return { ok: false, error: "O evento n\xE3o p\xF4de ser repetido agora." };
      return { ok: true, message: `Eco de ${applied.event.name}: ${applied.summary}` };
    }
    default: {
      const exhaustive = spec;
      void exhaustive;
      return { ok: false, error: "A\xE7\xE3o de carta sem resolvedor." };
    }
  }
}

// src/game/engine/victory.ts
function activePlayers(state) {
  return Object.values(state.players).filter((p) => p.status === "ACTIVE");
}
function processEliminations(draft, conquerorId) {
  syncPlayerTerritories(draft);
  const eliminated = [];
  for (const player of Object.values(draft.players)) {
    if (player.status !== "ACTIVE") continue;
    if (territoriesOf(draft, player.id).length > 0) continue;
    player.status = "ELIMINATED";
    player.eliminatedAtRound = draft.turn.number;
    eliminated.push(player.id);
    for (const cardId of [...player.handCardIds]) discardCard(draft, cardId);
    player.transportCharges = 0;
    dropModifiersOf(draft, player.id);
    const mission = draft.missions[player.id];
    if (mission) mission.revealed = true;
    pushLog(draft, "ACTION", `${player.name} foi eliminado da partida.`);
    emitGameEvent(draft, {
      kind: "TURN_ENDED",
      payload: { playerId: player.id, eliminated: true }
    });
  }
  if (eliminated.length > 0) applyMissionFallbacks(draft, conquerorId);
  return eliminated;
}
function checkVictory(draft) {
  if (draft.status === "FINISHED") return draft.result;
  const order = [
    draft.turn.currentPlayerId,
    ...draft.turn.order.filter((id2) => id2 !== draft.turn.currentPlayerId)
  ];
  for (const id2 of order) {
    const player = draft.players[id2];
    if (!player || player.status !== "ACTIVE") continue;
    const entry = draft.missions[id2];
    if (!entry) continue;
    const check = checkMission(draft, id2);
    entry.progress = check.progress;
    if (!check.completed) continue;
    entry.completed = true;
    entry.revealed = true;
    const mission = effectiveMissionOf(draft, id2);
    return {
      winnerId: id2,
      reason: "MISSION",
      detail: `${player.name} cumpriu o objetivo secreto: ${mission?.name ?? "\u2014"}.`,
      finishedAtRound: draft.turn.number
    };
  }
  const territories = listTerritories(draft);
  const controllers = new Set(
    territories.map((t) => t.controllerId).filter((id2) => Boolean(id2))
  );
  if (controllers.size === 1) {
    const [only] = [...controllers];
    if (only !== NEUTRAL_PLAYER_ID) {
      return {
        winnerId: only,
        reason: "DOMINATION",
        detail: `${draft.players[only]?.name} controla os 30 territ\xF3rios.`,
        finishedAtRound: draft.turn.number
      };
    }
  }
  const alive = activePlayers(draft);
  if (alive.length === 1) {
    return {
      winnerId: alive[0].id,
      reason: "LAST_STANDING",
      detail: `${alive[0].name} \xE9 o \xFAnico sobrevivente.`,
      finishedAtRound: draft.turn.number
    };
  }
  if (alive.length === 0) {
    return {
      winnerId: null,
      reason: "LAST_STANDING",
      detail: "Ningu\xE9m sobreviveu ao Colapso.",
      finishedAtRound: draft.turn.number
    };
  }
  if (draft.turn.number > BALANCE.victory.roundLimit) {
    const ranked = [...alive].sort((a, b) => {
      const regionsA = completedRegions(draft, a.id).length;
      const regionsB = completedRegions(draft, b.id).length;
      if (regionsA !== regionsB) return regionsB - regionsA;
      const territoriesA = territoriesOf(draft, a.id);
      const territoriesB = territoriesOf(draft, b.id);
      if (territoriesA.length !== territoriesB.length) {
        return territoriesB.length - territoriesA.length;
      }
      const troopsA = territoriesA.reduce((sum, t) => sum + t.garrison.length, 0);
      const troopsB = territoriesB.reduce((sum, t) => sum + t.garrison.length, 0);
      if (troopsA !== troopsB) return troopsB - troopsA;
      return a.seat - b.seat;
    });
    return {
      winnerId: ranked[0].id,
      reason: "ROUND_LIMIT",
      detail: `Limite de ${BALANCE.victory.roundLimit} rodadas: ${ranked[0].name} vence no crit\xE9rio de desempate.`,
      finishedAtRound: draft.turn.number
    };
  }
  return null;
}
function finishGame(draft, result) {
  draft.status = "FINISHED";
  draft.result = result;
  for (const entry of Object.values(draft.missions)) entry.revealed = true;
  draft.pendingAttack = null;
  draft.pendingOccupation = null;
  draft.pendingDistribution = null;
  pushLog(draft, "INFO", `FIM DE PARTIDA \u2014 ${result.detail}`);
}
function settleVictory(draft) {
  const result = checkVictory(draft);
  if (!result) return false;
  finishGame(draft, result);
  return true;
}

// src/game/engine/gameEngine.ts
function draftOf(state) {
  return structuredClone(state);
}
function fail(state, error) {
  return { ok: false, state, error };
}
function pendingBlocker(state) {
  if (state.status === "FINISHED") return "A partida terminou.";
  if (state.collapse.pending) return "Resolva o Evento do Colapso em andamento.";
  if (state.pendingAttack?.status === "DECLARED") return "Encerre a batalha em andamento.";
  if (state.pendingOccupation) return "Ocupe o territ\xF3rio conquistado.";
  if (state.pendingDistribution) return "Distribua as tropas capturadas.";
  return null;
}
function applyStartOfTurnRules(draft, playerId2) {
  const player = draft.players[playerId2];
  if (!player) return;
  const rules = getFaction(player.factionId).rules;
  if (rules.overcrowdThreshold) {
    for (const territory of territoriesOf(draft, playerId2)) {
      if (territory.garrison.length >= rules.overcrowdThreshold) {
        eliminateSoldier(draft, territory.garrison[territory.garrison.length - 1]);
        pushLog(draft, "ACTION", `${territory.name}: 1 soldado perdido por superlota\xE7\xE3o.`);
      }
    }
  }
  draft.turn.pendingReinforcements = reinforcementsFor(draft, playerId2);
  draft.turn.movesAllowed = movesAllowedFor(draft, playerId2);
}
function applyEndOfTurnRules(draft, playerId2) {
  const player = draft.players[playerId2];
  if (!player) return;
  const rules = getFaction(player.factionId).rules;
  if (rules.borderReinforceOnQuietTurn && draft.turn.conquestsThisTurn === 0) {
    const border = territoriesOf(draft, playerId2).find(
      (t) => t.neighbors.some((n) => {
        const neighbor = draft.territories[n];
        return neighbor?.controllerId && neighbor.controllerId !== playerId2;
      })
    );
    if (border) {
      for (let i = 0; i < rules.borderReinforceOnQuietTurn; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: playerId2,
          territoryId: border.id
        });
      }
      pushLog(draft, "ABILITY", `Reposi\xE7\xE3o cont\xEDnua: +1 soldado em ${border.name}.`);
    }
  }
  for (const territory of territoriesOf(draft, playerId2)) {
    if (territory.id === "reduto-do-comando") {
      createSoldier(draft, {
        factionId: player.factionId,
        ownerId: playerId2,
        territoryId: territory.id
      });
      pushLog(draft, "ACTION", `Setor Militar: +1 soldado.`);
    }
  }
  if (rules.regenerateWoundedTerritories) {
    const wounded = territoriesOf(draft, playerId2).filter((t) => t.garrison.length < BALANCE.territory.woundedBelow).sort((a, b) => a.garrison.length - b.garrison.length).slice(0, rules.regenerateWoundedTerritories);
    for (const territory of wounded) {
      createSoldier(draft, {
        factionId: player.factionId,
        ownerId: playerId2,
        territoryId: territory.id
      });
    }
    if (wounded.length > 0) {
      pushLog(
        draft,
        "ABILITY",
        `Regenera\xE7\xE3o: +1 soldado em ${wounded.map((t) => t.name).join(", ")}.`
      );
    }
  }
  if (draft.turn.conquestsThisTurn === 0 && !draft.turn.drewCard) {
    player.turnsWithoutCard += 1;
  }
  enforceHandLimit(draft, playerId2);
}
function endOfRound(draft, rng) {
  for (const id2 of draft.turn.order) {
    if (draft.players[id2]?.status === "ACTIVE") trackRegionHold(draft, id2);
  }
  for (const player of Object.values(draft.players)) {
    if (player.status !== "ACTIVE") continue;
    const hasDepot = territoriesOf(draft, player.id).some(
      (t) => t.id === "usina-nuclear"
    );
    const every = hasDepot ? BALANCE.transport.rechargeWithDepotRounds : BALANCE.transport.rechargeEveryRounds;
    if (draft.turn.number % every === 0) {
      const max = maxChargesFor(draft, player.id);
      if (player.transportCharges < max) {
        player.transportCharges += 1;
        pushLog(draft, "ACTION", `${player.name}: +1 carga de Transporte Especial.`);
      }
    }
  }
  const eventId = rollForCollapse(draft, rng);
  draft.turn.number += 1;
  const restored = expireCollapseEffects(draft);
  if (restored.length > 0) {
    pushLog(draft, "COLLAPSE", `Efeitos encerrados: ${restored.join(", ")}.`);
  }
  if (eventId) {
    armCollapse(draft, eventId, rng);
    if (draft.collapse.pending) {
      pushLog(draft, "COLLAPSE", "\u26A0 ALERTA DE COLAPSO");
      emitAnimation(
        draft,
        {
          id: "anim.collapse.alert",
          name: "Alerta de Colapso",
          beats: [
            { kind: "ALERT_SIREN", durationMs: 900 },
            { kind: "COUNTDOWN", durationMs: 1800 },
            { kind: "REVEAL", durationMs: 900 }
          ]
        },
        { eventId }
      );
    }
  }
}
function passTurn(draft, rng) {
  const previous = draft.turn.currentPlayerId;
  applyEndOfTurnRules(draft, previous);
  emitGameEvent(draft, { kind: "TURN_ENDED", payload: { playerId: previous } });
  const nextIndexWraps = draft.turn.order.findIndex(
    (id2, index) => index > draft.turn.currentIndex && draft.players[id2]?.status === "ACTIVE"
  ) === -1;
  if (nextIndexWraps) endOfRound(draft, rng);
  endTurn(draft);
  applyStartOfTurnRules(draft, draft.turn.currentPlayerId);
  emitGameEvent(draft, {
    kind: "TURN_STARTED",
    payload: { playerId: draft.turn.currentPlayerId },
    dedupeKey: turnStartedKey(draft.turn.number, draft.turn.currentPlayerId)
  });
  settleVictory(draft);
}
function closeBattle(draft, status) {
  const attack = draft.pendingAttack;
  if (!attack) return;
  attack.status = status;
  for (const soldier of Object.values(draft.soldiers)) {
    if (soldier.alive && (soldier.status === "ATTACKING" || soldier.status === "DEFENDING")) {
      soldier.status = "READY";
    }
  }
  const target = draft.territories[attack.toTerritoryId];
  if (target) target.status = "STABLE";
  draft.pendingAttack = null;
}
function resolveConquest(draft, attack, rng = defaultRng) {
  const origin = draft.territories[attack.fromTerritoryId];
  const target = draft.territories[attack.toTerritoryId];
  const defenderId = attack.defenderPlayerId;
  const occupation = conquerTerritory(draft, {
    from: attack.fromTerritoryId,
    to: attack.toTerritoryId
  });
  draft.turn.conquestsThisTurn += 1;
  trackConquest(draft, attack.attackerPlayerId, target.id);
  const attackerFaction = getFaction(draft.players[attack.attackerPlayerId].factionId);
  const conversionRule = attackerFaction.rules.conquestConversion ?? 0;
  if (conversionRule > 0) {
    const cap = attackerFaction.rules.conquestConversionPerTurn ?? Number.POSITIVE_INFINITY;
    const room = Math.max(0, cap - draft.turn.conversionsThisTurn);
    const converted = Math.min(conversionRule, room);
    for (let i = 0; i < converted; i += 1) {
      createSoldier(draft, {
        factionId: attackerFaction.id,
        ownerId: attack.attackerPlayerId,
        territoryId: target.id
      });
    }
    if (converted > 0) {
      draft.turn.conversionsThisTurn += converted;
      occupation.min = Math.max(0, occupation.min - converted);
      pushLog(
        draft,
        "ABILITY",
        `Infesta\xE7\xE3o: ${converted} defensor(es) eliminado(s) passaram para o seu ex\xE9rcito.`
      );
    }
  }
  const mutation = attackerFaction.rules.conquestMutation ?? 0;
  if (mutation > 0) {
    for (let i = 0; i < mutation; i += 1) {
      createSoldier(draft, {
        factionId: attackerFaction.id,
        ownerId: attack.attackerPlayerId,
        territoryId: target.id
      });
    }
    pushLog(draft, "ABILITY", `Evolu\xE7\xE3o Biol\xF3gica: +${mutation} soldado(s) em ${target.name}.`);
  }
  const loot = attackerFaction.rules.drawOnConquest ?? 0;
  for (let i = 0; i < loot; i += 1) {
    const card = drawCardFor(draft, attack.attackerPlayerId, rng);
    if (!card) break;
    pushLog(draft, "CARD", `Saque R\xE1pido: 1 carta tomada na conquista.`);
  }
  const defenderFaction = getFaction(draft.players[defenderId]?.factionId);
  if (defenderFaction?.rules.discardOnTerritoryLost) {
    const defender = draft.players[defenderId];
    const first = defender?.handCardIds[0];
    if (first) {
      discardCard(draft, first);
      pushLog(draft, "CARD", `${defender.name} descarta 1 carta ao perder territ\xF3rio.`);
    }
  }
  emitGameEvent(draft, {
    kind: "TERRITORY_CONQUERED",
    payload: { playerId: attack.attackerPlayerId, territoryId: target.id }
  });
  emitGameEvent(draft, {
    kind: "TERRITORY_LOST",
    payload: { playerId: defenderId, territoryId: target.id }
  });
  pushLog(
    draft,
    "COMBAT",
    `${origin?.name} conquistou ${target?.name}. Ocupa\xE7\xE3o obrigat\xF3ria: ${occupation.min}-${occupation.max} soldado(s).`
  );
}
function applyAction(state, action, options = {}) {
  const rng = options.rng ?? defaultRng;
  switch (action.type) {
    case "NEW_GAME":
      return { ok: true, state: createGame(action.options), info: "Nova partida criada." };
    // ---------------------------------------------------------------- turno
    case "ADVANCE_PHASE": {
      const blocker = pendingBlocker(state);
      if (blocker) return fail(state, blocker);
      const draft = draftOf(state);
      if (draft.turn.phase === "REFORCO" && draft.turn.pendingReinforcements > 0) {
        return fail(
          state,
          `Distribua os ${draft.turn.pendingReinforcements} refor\xE7o(s) antes de avan\xE7ar.`
        );
      }
      const before = PHASE_LABELS[draft.turn.phase];
      const wasLast = draft.turn.phase === "FIM_TURNO";
      if (wasLast) {
        passTurn(draft, rng);
        const player = draft.players[draft.turn.currentPlayerId];
        pushLog(draft, "ACTION", `Rodada ${draft.turn.number}: vez de ${player?.name ?? "???"}.`);
      } else {
        advancePhase(draft);
        pushLog(draft, "ACTION", `${before} \u2192 ${PHASE_LABELS[draft.turn.phase]}.`);
        emitGameEvent(draft, {
          kind: "PHASE_CHANGED",
          payload: { playerId: draft.turn.currentPlayerId, phase: draft.turn.phase }
        });
      }
      processEliminations(draft, null);
      settleVictory(draft);
      return { ok: true, state: draft };
    }
    case "END_TURN": {
      const blocker = pendingBlocker(state);
      if (blocker) return fail(state, blocker);
      const draft = draftOf(state);
      passTurn(draft, rng);
      const player = draft.players[draft.turn.currentPlayerId];
      pushLog(draft, "ACTION", `Rodada ${draft.turn.number}: vez de ${player?.name ?? "???"}.`);
      return { ok: true, state: draft };
    }
    // -------------------------------------------------------------- reforço
    case "ADD_SOLDIERS": {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, "Quantidade inv\xE1lida.");
      }
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId];
      if (!territory) return fail(state, "Territ\xF3rio inexistente.");
      const ownerId = action.ownerId ?? territory.controllerId ?? draft.turn.currentPlayerId;
      const owner = draft.players[ownerId];
      if (!owner) return fail(state, "Jogador inexistente.");
      const isReinforcement = !action.ownerId && draft.turn.phase === "REFORCO";
      if (isReinforcement) {
        if (territory.controllerId !== draft.turn.currentPlayerId) {
          return fail(state, `${territory.name} n\xE3o \xE9 seu.`);
        }
        if (blocksReinforce(draft, territory.id)) {
          return fail(state, `${territory.name} n\xE3o pode receber refor\xE7os agora.`);
        }
        if (action.amount > draft.turn.pendingReinforcements) {
          return fail(
            state,
            `Voc\xEA tem apenas ${draft.turn.pendingReinforcements} refor\xE7o(s) dispon\xEDvel(is).`
          );
        }
        draft.turn.pendingReinforcements -= action.amount;
      }
      for (let i = 0; i < action.amount; i += 1) {
        createSoldier(draft, {
          factionId: owner.factionId,
          ownerId: owner.id,
          territoryId: territory.id
        });
      }
      syncPlayerTerritories(draft);
      pushLog(draft, "ACTION", `+${action.amount} soldado(s) em ${territory.name}.`);
      return { ok: true, state: draft };
    }
    case "AUTO_REINFORCE": {
      const draft = draftOf(state);
      if (draft.turn.phase !== "REFORCO") return fail(state, "S\xF3 na fase de REFOR\xC7O.");
      const pending = draft.turn.pendingReinforcements;
      if (pending <= 0) return fail(state, "N\xE3o h\xE1 refor\xE7os pendentes.");
      const owned = territoriesOf(draft, draft.turn.currentPlayerId).filter(
        (t) => !blocksReinforce(draft, t.id)
      );
      if (owned.length === 0) return fail(state, "Nenhum territ\xF3rio pode receber refor\xE7os.");
      const player = draft.players[draft.turn.currentPlayerId];
      const border = owned.filter(
        (t) => t.neighbors.some((n) => {
          const neighbor = draft.territories[n];
          return neighbor?.controllerId && neighbor.controllerId !== player.id;
        })
      );
      const targets = border.length > 0 ? border : owned;
      for (let i = 0; i < pending; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: player.id,
          territoryId: targets[i % targets.length].id
        });
      }
      draft.turn.pendingReinforcements = 0;
      pushLog(draft, "ACTION", `${pending} refor\xE7o(s) distribu\xEDdo(s) automaticamente.`);
      return { ok: true, state: draft };
    }
    // --------------------------------------------------------- movimentação
    case "MOVE_SOLDIERS": {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, "Quantidade inv\xE1lida.");
      }
      const draft = draftOf(state);
      const from = draft.territories[action.from];
      const to = draft.territories[action.to];
      if (!from || !to) return fail(state, "Territ\xF3rio inexistente.");
      if (from.id === to.id) return fail(state, "Origem e destino precisam ser diferentes.");
      if (from.controllerId !== draft.turn.currentPlayerId) {
        return fail(state, "S\xF3 \xE9 poss\xEDvel mover tropas de um territ\xF3rio seu.");
      }
      if (to.controllerId !== from.controllerId) {
        return fail(state, "O destino precisa ser um territ\xF3rio seu.");
      }
      if (draft.turn.phase !== "MOVIMENTACAO") {
        return fail(state, "A movimenta\xE7\xE3o s\xF3 acontece na fase MOVIMENTA\xC7\xC3O.");
      }
      if (draft.turn.movesUsed >= draft.turn.movesAllowed) {
        return fail(state, `Voc\xEA j\xE1 usou ${draft.turn.movesAllowed} movimenta\xE7\xE3o(\xF5es) neste turno.`);
      }
      if (blocksReinforce(draft, to.id)) {
        return fail(state, `${to.name} n\xE3o pode receber tropas agora.`);
      }
      const faction = getFaction(draft.players[from.controllerId].factionId);
      const adjacent = isAdjacent(draft, from.id, to.id);
      if (!adjacent) {
        if (!faction.rules.chainMovement) {
          return fail(state, `${from.name} n\xE3o faz fronteira com ${to.name}.`);
        }
        if (!connectedThroughOwnTerritories(draft, from.id, to.id)) {
          return fail(state, "N\xE3o h\xE1 cadeia cont\xEDnua de territ\xF3rios seus entre origem e destino.");
        }
      }
      const maxByFaction = faction.rules.maxSoldiersPerMove ?? Number.POSITIVE_INFINITY;
      const maxByRoute = isLinkKind(from.id, to.id, "MARITIMA") ? BALANCE.movement.coastalRouteLimit : Number.POSITIVE_INFINITY;
      const limit = Math.min(maxByFaction, maxByRoute);
      if (action.amount > limit) {
        return fail(state, `Esta movimenta\xE7\xE3o permite no m\xE1ximo ${limit} soldado(s).`);
      }
      if (from.garrison.length - action.amount < BALANCE.territory.minGarrison) {
        return fail(state, "\xC9 obrigat\xF3rio deixar ao menos 1 soldado na origem.");
      }
      for (const soldierId2 of from.garrison.slice(0, action.amount)) {
        placeInTerritory(draft, soldierId2, to.id);
        draft.soldiers[soldierId2].status = "MOVED";
      }
      draft.turn.movesUsed += 1;
      pushLog(draft, "ACTION", `${action.amount} soldado(s): ${from.name} \u2192 ${to.name}.`);
      emitGameEvent(draft, {
        kind: "TROOPS_MOVED",
        payload: {
          playerId: from.controllerId,
          fromTerritoryId: from.id,
          toTerritoryId: to.id,
          amount: action.amount
        }
      });
      return { ok: true, state: draft };
    }
    // -------------------------------------------------------------- combate
    case "DECLARE_ATTACK": {
      const draft = draftOf(state);
      if (draft.status === "FINISHED") return fail(state, "A partida terminou.");
      if (draft.pendingAttack?.status === "DECLARED") {
        return fail(state, "J\xE1 existe uma batalha em andamento.");
      }
      if (draft.turn.phase !== "ATAQUE_COMUM") {
        return fail(state, "O Ataque Comum s\xF3 acontece na fase ATAQUE COMUM.");
      }
      if (draft.turn.commonAttackUsed) {
        return fail(state, "REGRA OFICIAL: somente 1 Ataque Comum por turno.");
      }
      const from = draft.territories[action.from];
      const to = draft.territories[action.to];
      if (!from || !to) return fail(state, "Territ\xF3rio inexistente.");
      if (from.controllerId !== draft.turn.currentPlayerId) {
        return fail(state, "S\xF3 o jogador do turno pode atacar, a partir de um territ\xF3rio seu.");
      }
      if (!to.controllerId || to.controllerId === from.controllerId) {
        return fail(state, "O alvo precisa ser um territ\xF3rio inimigo.");
      }
      if (!isAdjacent(draft, from.id, to.id)) {
        return fail(state, `${from.name} n\xE3o faz fronteira com ${to.name}.`);
      }
      if (crossesQuarantine(draft, from.id, to.id)) {
        return fail(state, "Quarentena: esta fronteira est\xE1 fechada nesta rodada.");
      }
      const cap = attackerCapFor(draft, from.id, to.id);
      if (attackerDiceFor(from.garrison.length, cap) <= 0) {
        return fail(state, "\xC9 preciso ter ao menos 2 soldados para atacar.");
      }
      const attackers = from.garrison.slice(0, Math.max(1, from.garrison.length - 1));
      for (const soldierId2 of attackers) draft.soldiers[soldierId2].status = "ATTACKING";
      for (const defender of soldiersInTerritory(draft, to.id)) {
        draft.soldiers[defender.id].status = "DEFENDING";
      }
      draft.turn.commonAttackUsed = true;
      draft.pendingAttack = {
        id: `atk-${draft.turn.turnsPlayed}-${from.id}-${to.id}`,
        attackerPlayerId: from.controllerId,
        defenderPlayerId: to.controllerId,
        fromTerritoryId: from.id,
        toTerritoryId: to.id,
        attackingSoldierIds: attackers,
        kind: "COMMON",
        rounds: [],
        attackerDiceCap: cap,
        defenderDiceCap: defenseDiceCap(draft),
        reactionsUsed: [],
        rerolls: [],
        status: "DECLARED"
      };
      to.status = "CONTESTED";
      pushLog(draft, "COMBAT", `Ataque Comum declarado: ${from.name} \u2192 ${to.name}.`);
      emitGameEvent(draft, {
        kind: "BATTLE_STARTED",
        payload: {
          playerId: from.controllerId,
          opponentId: to.controllerId,
          fromTerritoryId: from.id,
          toTerritoryId: to.id
        }
      });
      emitGameEvent(draft, {
        kind: "BEFORE_DEFENSE",
        payload: { playerId: to.controllerId, opponentId: from.controllerId, territoryId: to.id }
      });
      return { ok: true, state: draft };
    }
    case "DECLARE_SPECIAL_ATTACK": {
      const draft = draftOf(state);
      if (draft.status === "FINISHED") return fail(state, "A partida terminou.");
      if (draft.pendingAttack?.status === "DECLARED") {
        return fail(state, "J\xE1 existe uma batalha em andamento.");
      }
      if (draft.turn.phase !== "ATAQUE_ESPECIAL") {
        return fail(state, "O Ataque Especial s\xF3 acontece na fase ATAQUE ESPECIAL.");
      }
      if (draft.turn.specialAttackUsed) {
        return fail(state, "REGRA OFICIAL: no m\xE1ximo 1 Ataque Especial por turno.");
      }
      if (specialAttackBlocked(draft)) {
        return fail(state, "Queda de Tens\xE3o: nenhum Ataque Especial nesta rodada.");
      }
      const playerId2 = draft.turn.currentPlayerId;
      const player = draft.players[playerId2];
      const faction = getFaction(player.factionId);
      const free = Boolean(faction.rules.freeSpecialAttack);
      if (!free && player.transportCharges <= 0) {
        return fail(state, "Sem carga de Transporte Especial.");
      }
      const from = draft.territories[action.from];
      const to = draft.territories[action.to];
      if (!from || !to) return fail(state, "Territ\xF3rio inexistente.");
      if (from.controllerId !== playerId2) return fail(state, "A origem precisa ser sua.");
      if (!to.controllerId || to.controllerId === playerId2) {
        return fail(state, "O alvo precisa ser um territ\xF3rio inimigo.");
      }
      if (blocksSpecialAttack(draft, to.id)) {
        return fail(state, `${to.name} est\xE1 protegido contra Ataque Especial.`);
      }
      const isAnomalous = (id2) => regionOfTerritory(id2)?.id === "zona-impacto";
      const stableInside = (id2) => id2 === "nucleo-do-colapso";
      if (isAnomalous(from.id) && !stableInside(from.id) || isAnomalous(to.id) && !stableInside(to.id)) {
        return fail(state, "O Transporte Especial n\xE3o atravessa a Zona de Impacto.");
      }
      const distance = distanceBetween(draft, from.id, to.id);
      if (distance !== BALANCE.transport.range) {
        return fail(
          state,
          `O Ataque Especial alcan\xE7a apenas dist\xE2ncia exatamente ${BALANCE.transport.range}. Dist\xE2ncia at\xE9 o alvo: ${Number.isFinite(distance) ? distance : "\u2014"}.`
        );
      }
      const maxSoldiers = Math.min(
        BALANCE.transport.maxSoldiers,
        from.garrison.length - BALANCE.territory.minGarrison
      );
      if (!Number.isInteger(action.amount) || action.amount <= 0 || action.amount > maxSoldiers) {
        return fail(state, `Envie entre 1 e ${Math.max(0, maxSoldiers)} soldado(s).`);
      }
      if (!free) player.transportCharges -= 1;
      const attackers = from.garrison.slice(0, action.amount);
      for (const soldierId2 of attackers) draft.soldiers[soldierId2].status = "ATTACKING";
      for (const defender of soldiersInTerritory(draft, to.id)) {
        draft.soldiers[defender.id].status = "DEFENDING";
      }
      draft.turn.specialAttackUsed = true;
      draft.pendingAttack = {
        id: `esp-${draft.turn.turnsPlayed}-${from.id}-${to.id}`,
        attackerPlayerId: playerId2,
        defenderPlayerId: to.controllerId,
        fromTerritoryId: from.id,
        toTerritoryId: to.id,
        attackingSoldierIds: attackers,
        kind: "SPECIAL",
        rounds: [],
        attackerDiceCap: BALANCE.dice.maxAttackDice,
        defenderDiceCap: defenseDiceCap(draft),
        reactionsUsed: [],
        rerolls: [],
        status: "DECLARED"
      };
      to.status = "CONTESTED";
      pushLog(
        draft,
        "COMBAT",
        `Ataque Especial: ${action.amount} soldado(s) de ${from.name} sobre ${to.name}${free ? " (sem gastar carga)" : ""}.`
      );
      emitGameEvent(draft, {
        kind: "BATTLE_STARTED",
        payload: { playerId: playerId2, opponentId: to.controllerId, fromTerritoryId: from.id, toTerritoryId: to.id }
      });
      emitGameEvent(draft, {
        kind: "BEFORE_DEFENSE",
        payload: { playerId: to.controllerId, opponentId: playerId2, territoryId: to.id }
      });
      return { ok: true, state: draft };
    }
    case "ROLL_BATTLE_ROUND": {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== "DECLARED") return fail(state, "N\xE3o h\xE1 batalha em andamento.");
      if (draft.pendingOccupation) return fail(state, "Ocupe o territ\xF3rio conquistado primeiro.");
      const plan = planBattle(draft, attack);
      if (plan.attackerDice <= 0) return fail(state, "O atacante n\xE3o tem tropas para continuar.");
      if (plan.defenderDice <= 0) return fail(state, "N\xE3o h\xE1 defensores.");
      const outcome = rollBattleRound(draft, attack, rng);
      attack.rounds.push(outcome.round);
      const attackers = attack.kind === "SPECIAL" ? livingAttackers(draft, attack) : soldiersInTerritory(draft, attack.fromTerritoryId).map((s) => s.id);
      for (let i = 0; i < outcome.round.attackerLosses && i < attackers.length; i += 1) {
        eliminateSoldier(draft, attackers[i]);
      }
      const defenders = soldiersInTerritory(draft, attack.toTerritoryId);
      for (let i = 0; i < outcome.round.defenderLosses && i < defenders.length; i += 1) {
        eliminateSoldier(draft, defenders[i].id);
      }
      emitGameEvent(draft, {
        kind: "DICE_ROLLED",
        payload: {
          playerId: attack.attackerPlayerId,
          attackerDice: outcome.round.attackerDice,
          defenderDice: outcome.round.defenderDice
        }
      });
      pushLog(
        draft,
        "COMBAT",
        `Rodada ${outcome.round.index}: ${outcome.round.attackerDice.join("-")} \xD7 ${outcome.round.defenderDice.join("-")} \u2192 atacante \u2212${outcome.round.attackerLosses}, defensor \u2212${outcome.round.defenderLosses}.`
      );
      const targetEmpty = soldiersInTerritory(draft, attack.toTerritoryId).length === 0;
      if (targetEmpty) {
        resolveConquest(draft, attack, rng);
        attack.status = "RESOLVED";
        emitGameEvent(draft, { kind: "AFTER_ATTACK", payload: { playerId: attack.attackerPlayerId } });
        return { ok: true, state: draft, data: { round: outcome.round, conquered: true } };
      }
      if (!canContinueBattle(draft, attack)) {
        closeBattle(draft, "RESOLVED");
        pushLog(draft, "COMBAT", "Batalha encerrada: o atacante n\xE3o pode continuar.");
        return { ok: true, state: draft, data: { round: outcome.round, exhausted: true } };
      }
      return { ok: true, state: draft, data: { round: outcome.round } };
    }
    case "RESOLVE_ATTACK":
    case "CANCEL_ATTACK": {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== "DECLARED") return fail(state, "N\xE3o h\xE1 batalha em andamento.");
      if (draft.pendingOccupation) {
        return fail(state, "Ocupe o territ\xF3rio conquistado antes de encerrar o ataque.");
      }
      if (attack.rounds.length === 0) {
        return fail(state, "A primeira rodada de dados \xE9 obrigat\xF3ria: role antes de recuar.");
      }
      closeBattle(draft, action.type === "RESOLVE_ATTACK" ? "RESOLVED" : "CANCELLED");
      pushLog(draft, "COMBAT", "O atacante recuou. A batalha terminou.");
      return { ok: true, state: draft };
    }
    case "DEV_WIN_ATTACK": {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== "DECLARED") return fail(state, "N\xE3o h\xE1 batalha em andamento.");
      if (draft.pendingOccupation) return fail(state, "J\xE1 existe uma ocupa\xE7\xE3o pendente.");
      const survivors = livingAttackers(draft, attack);
      if (survivors.length === 0) return fail(state, "Todos os atacantes foram eliminados.");
      for (const defender of soldiersInTerritory(draft, attack.toTerritoryId)) {
        eliminateSoldier(draft, defender.id);
      }
      resolveConquest(draft, attack, rng);
      attack.status = "RESOLVED";
      pushLog(draft, "COMBAT", "[DEV] Batalha vencida.");
      return { ok: true, state: draft };
    }
    case "OCCUPY_TERRITORY": {
      const draft = draftOf(state);
      const occupation = draft.pendingOccupation;
      if (!occupation) return fail(state, "N\xE3o h\xE1 territ\xF3rio conquistado aguardando ocupa\xE7\xE3o.");
      if (!Number.isInteger(action.amount)) return fail(state, "Quantidade inv\xE1lida.");
      if (action.amount < occupation.min) {
        return fail(
          state,
          `O territ\xF3rio conquistado n\xE3o pode ficar vazio: mova ao menos ${occupation.min} soldado(s).`
        );
      }
      if (action.amount > occupation.max) {
        return fail(state, `M\xE1ximo permitido nesta ocupa\xE7\xE3o: ${occupation.max} soldado(s).`);
      }
      const origin = draft.territories[occupation.fromTerritoryId];
      const target = draft.territories[occupation.toTerritoryId];
      if (!origin || !target) return fail(state, "Territ\xF3rio inexistente na ocupa\xE7\xE3o.");
      if (origin.garrison.length - action.amount < BALANCE.territory.minGarrison) {
        return fail(state, "\xC9 obrigat\xF3rio deixar ao menos 1 soldado no territ\xF3rio de origem.");
      }
      const pool = occupation.eligibleSoldierIds.filter((id2) => {
        const soldier = draft.soldiers[id2];
        return soldier?.alive && soldier.location.kind === "TERRITORY" && soldier.location.territoryId === origin.id;
      });
      const fallback = soldiersInTerritory(draft, origin.id).map((s) => s.id);
      const source = pool.length >= action.amount ? pool : fallback;
      for (let i = 0; i < action.amount; i += 1) {
        placeInTerritory(draft, source[i], target.id);
        draft.soldiers[source[i]].status = "READY";
      }
      draft.pendingOccupation = null;
      closeBattle(draft, "RESOLVED");
      syncPlayerTerritories(draft);
      pushLog(draft, "COMBAT", `${action.amount} soldado(s) ocuparam ${target.name}.`);
      const trap = activeModifiersFor(draft, target.id).find((m) => m.trapDamage);
      if (trap?.trapDamage) {
        const victims = target.garrison.slice(
          0,
          Math.min(trap.trapDamage, Math.max(0, target.garrison.length - 1))
        );
        for (const soldierId2 of victims) eliminateSoldier(draft, soldierId2);
        draft.territoryModifiers = draft.territoryModifiers.filter((m) => m.id !== trap.id);
        pushLog(
          draft,
          "ACTION",
          `Armadilha Explosiva em ${target.name}: ${victims.length} soldado(s) perdidos.`
        );
      }
      const eliminated = processEliminations(draft, target.controllerId);
      if (eliminated.length > 0) {
        pushLog(draft, "ACTION", `${eliminated.length} jogador(es) eliminado(s).`);
      }
      settleVictory(draft);
      return { ok: true, state: draft };
    }
    // --------------------------------------------------------------- cartas
    case "DRAW_CARD": {
      const draft = draftOf(state);
      const playerId2 = draft.turn.currentPlayerId;
      const allowed = canDrawNow(draft, playerId2);
      if (!allowed.ok) return fail(state, allowed.reason);
      const card = drawCardFor(draft, playerId2, rng);
      if (!card) return fail(state, "O Baralho do Colapso est\xE1 vazio.");
      draft.turn.drewCard = true;
      draft.turn.cardsDrawn += 1;
      const definition = getCardDefinition(card.definitionId);
      pushLog(draft, "CARD", `Carta comprada: ${definition.name}.`);
      return { ok: true, state: draft, data: { cardInstanceId: card.instanceId } };
    }
    case "DISCARD_CARD": {
      const draft = draftOf(state);
      const card = draft.cards[action.cardInstanceId];
      if (!card) return fail(state, "Carta inexistente.");
      if (card.ownerId !== draft.turn.currentPlayerId) return fail(state, "A carta n\xE3o \xE9 sua.");
      const definition = getCardDefinition(card.definitionId);
      discardCard(draft, action.cardInstanceId);
      pushLog(draft, "CARD", `Carta descartada: ${definition.name}.`);
      return { ok: true, state: draft };
    }
    case "PLAY_CARD": {
      const draft = draftOf(state);
      const card = draft.cards[action.cardInstanceId];
      if (!card) return fail(state, "Carta inexistente.");
      const availability = canUseCard(draft, card.instanceId, action.mode);
      if (!availability.allowed) return fail(state, availability.reason ?? "Uso n\xE3o permitido.");
      const definition = getCardDefinition(card.definitionId);
      const effect = effectFor(definition, action.mode);
      if (definition.playType === "REATIVA" || effect.id === "effect.vacina") {
        const attack = draft.pendingAttack;
        if (attack?.reactionsUsed.includes(card.ownerId)) {
          return fail(state, "Voc\xEA j\xE1 jogou uma carta reativa nesta batalha.");
        }
        if (attack) attack.reactionsUsed.push(card.ownerId);
      }
      if (effect.id === "effect.sequestro") {
        const selection = action.targetSoldierIds ?? [];
        const validation = validateSequestroSelection(draft, card.instanceId, selection);
        if (!validation.ok) return fail(state, validation.error);
        const result = applySequestro(draft, card.instanceId, selection);
        consumeCard(draft, card.instanceId, action.mode);
        syncPlayerTerritories(draft);
        const faction = getFaction(draft.players[card.ownerId].factionId);
        pushLog(
          draft,
          "CARD",
          `Sequestro: ${result.capturedIds.length} soldado(s) capturado(s) e incorporado(s) \xE0 fac\xE7\xE3o ${faction.name}.`
        );
        emitGameEvent(draft, {
          kind: "CARD_ACTIVATED",
          payload: {
            playerId: card.ownerId,
            cardInstanceId: card.instanceId,
            mode: action.mode,
            amount: result.capturedIds.length
          }
        });
        processEliminations(draft, card.ownerId);
        settleVictory(draft);
        return { ok: true, state: draft, data: result };
      }
      if (effect.id === "effect.vacina") {
        const result = applyVacina(draft, card.instanceId, rng);
        consumeCard(draft, card.instanceId, action.mode);
        pushLog(
          draft,
          "CARD",
          `Vacina / Contra-Ataque: dado ${result.diceValue} \u2192 ${result.eliminatedCount} atacante(s) eliminado(s).`
        );
        emitGameEvent(draft, {
          kind: "CARD_ACTIVATED",
          payload: { playerId: card.ownerId, cardInstanceId: card.instanceId, mode: action.mode }
        });
        emitGameEvent(draft, {
          kind: "DICE_ROLLED",
          payload: { playerId: card.ownerId, diceValue: result.diceValue }
        });
        emitGameEvent(draft, {
          kind: "AFTER_DEFENSE",
          payload: { playerId: card.ownerId, amount: result.eliminatedCount }
        });
        if (draft.pendingAttack && draft.pendingAttack.status === "CANCELLED") {
          closeBattle(draft, "CANCELLED");
          pushLog(draft, "COMBAT", "Ataque neutralizado: nenhum atacante sobreviveu.");
        }
        return { ok: true, state: draft, data: result };
      }
      if (!effect.action) return fail(state, `Efeito sem regra implementada: ${effect.id}.`);
      const outcome = applyCardAction(draft, effect.action, card.ownerId, action.params ?? {}, rng);
      if (!outcome.ok) return fail(state, outcome.error);
      consumeCard(draft, card.instanceId, action.mode);
      discardCard(draft, card.instanceId);
      syncPlayerTerritories(draft);
      pushLog(draft, "CARD", `${definition.name}: ${outcome.message}`);
      emitGameEvent(draft, {
        kind: "CARD_ACTIVATED",
        payload: { playerId: card.ownerId, cardInstanceId: card.instanceId, mode: action.mode }
      });
      processEliminations(draft, card.ownerId);
      settleVictory(draft);
      return { ok: true, state: draft, data: outcome.data };
    }
    case "DISTRIBUTE_RESERVES": {
      const draft = draftOf(state);
      const distribution = draft.pendingDistribution;
      const ownerId = distribution?.playerId ?? draft.turn.currentPlayerId;
      const reserve = reserveSoldiers(draft, ownerId);
      if (reserve.length === 0) return fail(state, "N\xE3o h\xE1 tropas em reserva para distribuir.");
      const total = action.assignments.reduce((sum, a) => sum + a.amount, 0);
      if (action.assignments.some((a) => !Number.isInteger(a.amount) || a.amount < 0)) {
        return fail(state, "Quantidade inv\xE1lida na distribui\xE7\xE3o.");
      }
      if (total !== reserve.length) {
        return fail(state, `Distribua exatamente ${reserve.length} soldado(s). Informado: ${total}.`);
      }
      for (const assignment of action.assignments) {
        const territory = draft.territories[assignment.territoryId];
        if (!territory) return fail(state, "Territ\xF3rio inexistente na distribui\xE7\xE3o.");
        if (territory.controllerId !== ownerId) {
          return fail(state, `${territory.name} n\xE3o \xE9 controlado por voc\xEA.`);
        }
      }
      let cursor = 0;
      for (const assignment of action.assignments) {
        for (let i = 0; i < assignment.amount; i += 1) {
          const soldier = reserve[cursor];
          cursor += 1;
          placeInTerritory(draft, soldier.id, assignment.territoryId);
          draft.soldiers[soldier.id].status = "READY";
        }
      }
      draft.pendingDistribution = null;
      syncPlayerTerritories(draft);
      pushLog(draft, "ACTION", `${total} soldado(s) redistribu\xEDdo(s) a partir da reserva.`);
      settleVictory(draft);
      return { ok: true, state: draft };
    }
    // ---------------------------------------------------- Eventos do Colapso
    case "RESOLVE_COLLAPSE": {
      const draft = draftOf(state);
      if (!draft.collapse.pending) return fail(state, "N\xE3o h\xE1 Evento do Colapso em alerta.");
      const applied = applyPendingCollapse(draft, rng);
      if (!applied) return fail(state, "O evento n\xE3o p\xF4de ser aplicado.");
      trackCollapseSurvived(draft);
      syncPlayerTerritories(draft);
      processEliminations(draft, null);
      settleVictory(draft);
      return { ok: true, state: draft, data: applied };
    }
    // ---------------------------------------------------------- habilidades
    case "ACTIVATE_ABILITY": {
      const draft = draftOf(state);
      const ability = tryGetAbility(action.abilityId);
      if (!ability) return fail(state, "Habilidade desconhecida.");
      if (ability.kind !== "ACTIVE") {
        return fail(state, "Esta habilidade n\xE3o \xE9 acionada manualmente.");
      }
      const playerId2 = draft.turn.currentPlayerId;
      if (!getAbilityState(draft, playerId2, ability.id)) {
        return fail(state, "Sua fac\xE7\xE3o n\xE3o possui esta habilidade.");
      }
      const availability = checkAvailability(draft, playerId2, ability.id);
      if (!availability.available) return fail(state, availability.reason);
      const context = buildContext(draft, playerId2, "ABILITY_ACTIVATED", { playerId: playerId2 }, action.params);
      const validation = ability.validateParams?.(context) ?? { ok: true };
      if (!validation.ok) return fail(state, validation.error);
      const effects = ability.produceEffects(context);
      if (effects.length === 0) return fail(state, "A habilidade n\xE3o produziu nenhum efeito.");
      for (const effect of effects) {
        enqueueEffect(draft, {
          effect,
          source: { kind: "ABILITY", id: ability.id, playerId: playerId2, label: ability.name },
          priority: EFFECT_PRIORITY.ABILITY
        });
      }
      const resolution = resolveEffectQueue(draft);
      if (resolution.resolved.length === 0) {
        const reason = resolution.failed[0]?.result ?? "A habilidade n\xE3o p\xF4de ser aplicada.";
        return fail(state, reason);
      }
      consumeUsage(draft, playerId2, ability);
      const detail = ability.feedback.detail?.(context) ?? "";
      pushLog(draft, "ABILITY", `${ability.feedback.title}${detail ? ` \u2014 ${detail}` : ""}`);
      draft.abilityFeed.unshift({
        abilityId: ability.id,
        playerId: playerId2,
        title: ability.feedback.title,
        detail,
        turn: draft.turn.number
      });
      if (draft.abilityFeed.length > 10) draft.abilityFeed.length = 10;
      if (ability.animation) emitAnimation(draft, ability.animation, { abilityId: ability.id, detail });
      emitGameEvent(draft, { kind: "ABILITY_ACTIVATED", payload: { playerId: playerId2, abilityId: ability.id } });
      syncPlayerTerritories(draft);
      processEliminations(draft, playerId2);
      settleVictory(draft);
      return { ok: true, state: draft, data: { resolved: resolution.resolved.length } };
    }
    // ------------------------------------------------------------------ DEV
    case "REMOVE_SOLDIERS": {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, "Quantidade inv\xE1lida.");
      }
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId];
      if (!territory) return fail(state, "Territ\xF3rio inexistente.");
      const present = soldiersInTerritory(draft, territory.id);
      const removable = Math.min(action.amount, present.length);
      if (removable === 0) return fail(state, `${territory.name} n\xE3o possui tropas.`);
      for (const soldier of present.slice(0, removable)) eliminateSoldier(draft, soldier.id);
      pushLog(draft, "ACTION", `-${removable} soldado(s) em ${territory.name}.`);
      return { ok: true, state: draft };
    }
    case "SET_CONTROLLER": {
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId];
      if (!territory) return fail(state, "Territ\xF3rio inexistente.");
      if (action.playerId && !draft.players[action.playerId]) {
        return fail(state, "Jogador inexistente.");
      }
      territory.controllerId = action.playerId;
      for (const soldierId2 of territory.garrison) {
        const soldier = draft.soldiers[soldierId2];
        if (!soldier || !action.playerId) continue;
        soldier.ownerId = action.playerId;
        soldier.factionId = draft.players[action.playerId].factionId;
      }
      syncPlayerTerritories(draft);
      pushLog(draft, "ACTION", `[DEV] ${territory.name} agora \xE9 de ${action.playerId ?? "ningu\xE9m"}.`);
      return { ok: true, state: draft };
    }
    case "SET_CURRENT_PLAYER": {
      const draft = draftOf(state);
      if (draft.pendingAttack?.status === "DECLARED") {
        return fail(state, "Encerre a batalha antes de trocar de jogador.");
      }
      const player = draft.players[action.playerId];
      if (!player || player.status !== "ACTIVE") return fail(state, "Jogador indispon\xEDvel.");
      draft.turn.currentPlayerId = action.playerId;
      draft.turn.currentIndex = draft.turn.order.indexOf(action.playerId);
      draft.turn.pendingReinforcements = reinforcementsFor(draft, action.playerId);
      draft.turn.movesAllowed = movesAllowedFor(draft, action.playerId);
      pushLog(draft, "ACTION", `[DEV] Vez de ${player.name}.`);
      return { ok: true, state: draft };
    }
    case "GRANT_CARD": {
      const draft = draftOf(state);
      if (!draft.players[action.playerId]) return fail(state, "Jogador inexistente.");
      const instance = grantCard(draft, action.playerId, action.definitionId);
      pushLog(draft, "CARD", `Carta recebida: ${getCardDefinition(instance.definitionId).name}.`);
      return { ok: true, state: draft };
    }
    case "DEV_SET_PHASE": {
      const draft = draftOf(state);
      if (!TURN_PHASES.includes(action.phase)) {
        return fail(state, "Fase desconhecida.");
      }
      draft.turn.phase = action.phase;
      pushLog(draft, "ACTION", `[DEV] Fase: ${PHASE_LABELS[draft.turn.phase]}.`);
      return { ok: true, state: draft };
    }
    case "DEV_FORCE_COLLAPSE": {
      const draft = draftOf(state);
      const eventId = action.eventId ?? draft.collapse.bag[0];
      if (!eventId) return fail(state, "N\xE3o h\xE1 evento dispon\xEDvel.");
      draft.collapse.bag = draft.collapse.bag.filter((id2) => id2 !== eventId);
      armCollapse(draft, eventId, rng);
      if (!draft.collapse.pending) return fail(state, "Este evento n\xE3o tem alvo v\xE1lido agora.");
      pushLog(draft, "COLLAPSE", "[DEV] \u26A0 ALERTA DE COLAPSO for\xE7ado.");
      return { ok: true, state: draft };
    }
    case "DEV_SET_MISSION": {
      const draft = draftOf(state);
      const entry = draft.missions[action.playerId];
      if (!entry) return fail(state, "Jogador sem miss\xE3o.");
      try {
        getMission(action.missionId);
      } catch {
        return fail(state, "Miss\xE3o desconhecida.");
      }
      entry.missionId = action.missionId;
      entry.replacedBy = void 0;
      entry.completed = false;
      pushLog(draft, "ACTION", "[DEV] Objetivo secreto trocado.");
      return { ok: true, state: draft };
    }
    case "DEV_COMPLETE_MISSION": {
      const draft = draftOf(state);
      const entry = draft.missions[action.playerId];
      const player = draft.players[action.playerId];
      if (!entry || !player) return fail(state, "Jogador sem miss\xE3o.");
      entry.completed = true;
      entry.revealed = true;
      const mission = effectiveMissionOf(draft, action.playerId);
      draft.status = "FINISHED";
      draft.result = {
        winnerId: action.playerId,
        reason: "MISSION",
        detail: `[DEV] ${player.name} cumpriu: ${mission?.name ?? "\u2014"}.`,
        finishedAtRound: draft.turn.number
      };
      for (const other of Object.values(draft.missions)) other.revealed = true;
      pushLog(draft, "INFO", draft.result.detail);
      return { ok: true, state: draft };
    }
    case "DEV_ELIMINATE_PLAYER": {
      const draft = draftOf(state);
      const player = draft.players[action.playerId];
      if (!player || player.status !== "ACTIVE") return fail(state, "Jogador indispon\xEDvel.");
      for (const territory of territoriesOf(draft, action.playerId)) {
        territory.controllerId = NEUTRAL_PLAYER_ID in draft.players ? NEUTRAL_PLAYER_ID : null;
        for (const soldierId2 of [...territory.garrison]) eliminateSoldier(draft, soldierId2);
      }
      syncPlayerTerritories(draft);
      processEliminations(draft, null);
      settleVictory(draft);
      pushLog(draft, "ACTION", `[DEV] ${player.name} eliminado.`);
      return { ok: true, state: draft };
    }
    case "DEV_SET_TRANSPORT": {
      const draft = draftOf(state);
      const player = draft.players[action.playerId];
      if (!player) return fail(state, "Jogador inexistente.");
      player.transportCharges = Math.max(0, Math.min(9, Math.floor(action.charges)));
      pushLog(draft, "ACTION", `[DEV] Transporte de ${player.name}: ${player.transportCharges}.`);
      return { ok: true, state: draft };
    }
    case "DEV_SET_DICE": {
      const draft = draftOf(state);
      draft.counters.event += 0;
      pushLog(
        draft,
        "ACTION",
        action.values ? `[DEV] Dados fixados: ${action.values.join(", ")}.` : "[DEV] Dados voltaram ao aleat\xF3rio."
      );
      return { ok: true, state: draft, data: { forcedDice: action.values } };
    }
    case "DEV_SET_ABILITY_ENABLED": {
      const draft = draftOf(state);
      const runtime = draft.abilityStates[abilityKey(action.playerId, action.abilityId)];
      if (!runtime) return fail(state, "Habilidade n\xE3o encontrada para este jogador.");
      runtime.enabled = action.enabled;
      const ability = tryGetAbility(action.abilityId);
      pushLog(
        draft,
        "ABILITY",
        `[DEV] ${ability?.name ?? action.abilityId}: ${action.enabled ? "ativada" : "desativada"}.`
      );
      return { ok: true, state: draft };
    }
    case "DEV_RESET_ABILITY": {
      const draft = draftOf(state);
      const key = abilityKey(action.playerId, action.abilityId);
      if (!draft.abilityStates[key]) return fail(state, "Habilidade n\xE3o encontrada.");
      const ability = getAbility(action.abilityId);
      draft.abilityStates[key] = initialAbilityState(action.playerId, ability);
      pushLog(draft, "ABILITY", `[DEV] ${ability.name}: cargas e recarga restauradas.`);
      return { ok: true, state: draft };
    }
    case "DEV_CLEAR_EFFECTS": {
      const draft = draftOf(state);
      const removed = clearEffectQueue(draft);
      pushLog(draft, "ACTION", `[DEV] Fila de efeitos limpa (${removed} pendente(s)).`);
      return { ok: true, state: draft };
    }
    case "ACK_ANIMATION": {
      const draft = draftOf(state);
      markAnimationPlayed(draft, action.eventId);
      return { ok: true, state: draft };
    }
    default: {
      const exhaustive = action;
      return fail(state, `A\xE7\xE3o desconhecida: ${JSON.stringify(exhaustive)}`);
    }
  }
}
function connectedThroughOwnTerritories(state, from, to) {
  const owner = state.territories[from]?.controllerId;
  if (!owner) return false;
  const seen = /* @__PURE__ */ new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighborId of getTerritory(state, current).neighbors) {
      if (seen.has(neighborId)) continue;
      const neighbor = state.territories[neighborId];
      if (!neighbor || neighbor.controllerId !== owner) continue;
      if (neighborId === to) return true;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return false;
}

// src/net/gameSession.ts
var ALLOWED_INTENTS = /* @__PURE__ */ new Set([
  "ADVANCE_PHASE",
  "END_TURN",
  "ADD_SOLDIERS",
  "AUTO_REINFORCE",
  "MOVE_SOLDIERS",
  "DECLARE_ATTACK",
  "DECLARE_SPECIAL_ATTACK",
  "ROLL_BATTLE_ROUND",
  "RESOLVE_ATTACK",
  "CANCEL_ATTACK",
  "OCCUPY_TERRITORY",
  "DRAW_CARD",
  "DISCARD_CARD",
  "PLAY_CARD",
  "DISTRIBUTE_RESERVES",
  "RESOLVE_COLLAPSE",
  "ACTIVATE_ABILITY"
]);
var OUT_OF_TURN_INTENTS = /* @__PURE__ */ new Set(["PLAY_CARD"]);
var GameSession = class {
  state;
  revision = 0;
  rng;
  diceSeed = 1;
  constructor(initial, rng = defaultRng) {
    this.state = initial;
    this.rng = rng;
  }
  getRevision() {
    return this.revision;
  }
  /** Estado bruto — SÓ para o servidor. Nunca vai para a rede assim. */
  rawState() {
    return this.state;
  }
  /**
   * Recebe uma intenção de um assento e a executa se — e só se — as regras
   * permitirem. O cliente não decide nada: ele pede.
   */
  submit(seatPlayerId, action) {
    if (!ALLOWED_INTENTS.has(action.type)) {
      return { ok: false, error: "A\xE7\xE3o n\xE3o permitida pelo servidor." };
    }
    if (this.state.status === "FINISHED") {
      return { ok: false, error: "A partida j\xE1 terminou." };
    }
    if (!OUT_OF_TURN_INTENTS.has(action.type) && this.state.turn.currentPlayerId !== seatPlayerId) {
      return { ok: false, error: "N\xE3o \xE9 a sua vez." };
    }
    const isRoll = action.type === "ROLL_BATTLE_ROUND";
    const roundsBefore = this.state.pendingAttack?.rounds.length ?? 0;
    const result = applyAction(this.state, action, { rng: this.rng });
    if (!result.ok) return { ok: false, error: result.error };
    this.state = result.state;
    this.revision += 1;
    if (isRoll) {
      const round = this.state.pendingAttack?.rounds.at(-1);
      const data = result.data;
      const officialRound = round && this.state.pendingAttack ? round : data?.round;
      if (officialRound && (this.state.pendingAttack?.rounds.length ?? 0) !== roundsBefore) {
        this.diceSeed += 1;
        return {
          ok: true,
          dice: {
            attackerDice: officialRound.attackerDice,
            defenderDice: officialRound.defenderDice,
            attackerLosses: officialRound.attackerLosses,
            defenderLosses: officialRound.defenderLosses,
            seed: this.diceSeed,
            round: officialRound.index
          }
        };
      }
      if (data?.round) {
        this.diceSeed += 1;
        return {
          ok: true,
          dice: {
            attackerDice: data.round.attackerDice,
            defenderDice: data.round.defenderDice,
            attackerLosses: data.round.attackerLosses,
            defenderLosses: data.round.defenderLosses,
            seed: this.diceSeed,
            round: data.round.index
          }
        };
      }
    }
    return { ok: true };
  }
  /**
   * Snapshot para UM jogador, com a informação privada dos outros removida.
   * O servidor sabe tudo; cada cliente recebe só o que a regra permite.
   */
  snapshotFor(viewer) {
    return {
      revision: this.revision,
      state: redactFor(this.state, viewer),
      youAre: viewer
    };
  }
};
function redactFor(state, viewer) {
  const copy = structuredClone(state);
  for (const [playerId2, mission] of Object.entries(copy.missions)) {
    if (playerId2 === viewer) continue;
    if (mission.revealed) continue;
    delete copy.missions[playerId2];
  }
  const hiddenCardIds = /* @__PURE__ */ new Set();
  for (const player of Object.values(copy.players)) {
    if (player.id === viewer) continue;
    for (const cardId of player.handCardIds) hiddenCardIds.add(cardId);
    player.handCardIds = player.handCardIds.map(
      (_, index) => `hidden:${player.id}:${index}`
    );
  }
  for (const cardId of hiddenCardIds) delete copy.cards[cardId];
  return copy;
}

// src/net/protocol.ts
var PROTOCOL_VERSION = 1;
var SERVER_ERROR_TEXT = {
  ROOM_NOT_FOUND: "Sala n\xE3o encontrada. Confira o c\xF3digo.",
  ROOM_FULL: "A sala j\xE1 est\xE1 cheia.",
  ALREADY_STARTED: "Esta partida j\xE1 come\xE7ou.",
  VERSION_MISMATCH: "Sua vers\xE3o do jogo \xE9 diferente da do host. Atualize a p\xE1gina.",
  NOT_HOST: "S\xF3 o host pode fazer isso.",
  NOT_YOUR_TURN: "N\xE3o \xE9 a sua vez.",
  FACTION_TAKEN: "Outro jogador j\xE1 escolheu essa fac\xE7\xE3o.",
  BAD_REQUEST: "Pedido inv\xE1lido."
};
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRoomCode(random = Math.random) {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return code;
}

// src/net/roomService.ts
var MAX_ROOM_PLAYERS = 6;
var MIN_ROOM_PLAYERS = 2;
var RECONNECT_WINDOW_MS = 12e4;
var seatCounter = 0;
function nextId(prefix) {
  seatCounter += 1;
  return `${prefix}-${seatCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
var RoomService = class {
  rooms = /* @__PURE__ */ new Map();
  now;
  random;
  constructor(options = {}) {
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
  }
  createRoom(hostName, maxPlayers) {
    let code = generateRoomCode(this.random);
    while (this.rooms.has(code)) code = generateRoomCode(this.random);
    const seat = this.makeSeat(hostName);
    const room = {
      code,
      hostSeatId: seat.seatId,
      maxPlayers: Math.max(MIN_ROOM_PLAYERS, Math.min(MAX_ROOM_PLAYERS, maxPlayers)),
      seats: [seat],
      session: null,
      createdAt: this.now()
    };
    this.rooms.set(code, room);
    return { room, seat };
  }
  getRoom(code) {
    return this.rooms.get(code.toUpperCase());
  }
  listRooms() {
    return [...this.rooms.values()];
  }
  makeSeat(name) {
    return {
      seatId: nextId("seat"),
      resumeToken: nextId("tok"),
      name: name.trim().slice(0, 24) || "Comandante",
      factionId: null,
      ready: false,
      connected: true,
      playerId: null,
      disconnectedAt: null
    };
  }
  /**
   * Entra na sala. Se `resumeToken` bater com um assento que caiu, RECONECTA
   * aquele assento em vez de criar um novo — inclusive com a partida rolando.
   */
  join(code, name, resumeToken) {
    const room = this.getRoom(code);
    if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
    if (resumeToken) {
      const existing = room.seats.find((s) => s.resumeToken === resumeToken);
      if (existing) {
        existing.connected = true;
        existing.disconnectedAt = null;
        return { ok: true, room, seat: existing, resumed: true };
      }
    }
    if (room.session) return { ok: false, error: "ALREADY_STARTED" };
    if (room.seats.length >= room.maxPlayers) return { ok: false, error: "ROOM_FULL" };
    const seat = this.makeSeat(name);
    room.seats.push(seat);
    return { ok: true, room, seat, resumed: false };
  }
  pickFaction(room, seatId, factionId2) {
    if (room.session) return false;
    if (factionId2 && room.seats.some((s) => s.seatId !== seatId && s.factionId === factionId2)) {
      return false;
    }
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (!seat) return false;
    seat.factionId = factionId2;
    if (!factionId2) seat.ready = false;
    return true;
  }
  setReady(room, seatId, ready) {
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (!seat || room.session) return false;
    if (ready && !seat.factionId) return false;
    seat.ready = ready;
    return true;
  }
  kick(room, requesterId, targetId) {
    if (room.session) return false;
    if (room.hostSeatId !== requesterId) return false;
    if (requesterId === targetId) return false;
    const index = room.seats.findIndex((s) => s.seatId === targetId);
    if (index < 0) return false;
    room.seats.splice(index, 1);
    return true;
  }
  canStart(room) {
    if (room.session) return { ok: false, reason: "A partida j\xE1 come\xE7ou." };
    if (room.seats.length < MIN_ROOM_PLAYERS) {
      return { ok: false, reason: `S\xE3o necess\xE1rios ao menos ${MIN_ROOM_PLAYERS} jogadores.` };
    }
    if (!room.seats.every((s) => s.factionId)) {
      return { ok: false, reason: "Todos precisam escolher um ex\xE9rcito." };
    }
    if (!room.seats.every((s) => s.ready)) {
      return { ok: false, reason: "Nem todos est\xE3o prontos." };
    }
    return { ok: true };
  }
  /** Inicia a partida: cria a sessão autoritativa e amarra assento ↔ jogador. */
  start(room, requesterId) {
    if (room.hostSeatId !== requesterId) return { ok: false, error: "S\xF3 o host inicia a partida." };
    const check = this.canStart(room);
    if (!check.ok) return { ok: false, error: check.reason };
    const seats = [...room.seats];
    const state = createGame({
      playerCount: seats.length,
      players: seats.map((seat) => ({ factionId: seat.factionId, name: seat.name }))
    });
    const order = [
      PLAYER_IDS.p1,
      PLAYER_IDS.p2,
      PLAYER_IDS.p3,
      PLAYER_IDS.p4,
      PLAYER_IDS.p5,
      PLAYER_IDS.p6
    ];
    seats.forEach((seat, index) => {
      seat.playerId = order[index];
    });
    room.session = new GameSession(state);
    return { ok: true };
  }
  markDisconnected(room, seatId) {
    const seat = room.seats.find((s) => s.seatId === seatId);
    if (!seat) return;
    seat.connected = false;
    seat.disconnectedAt = this.now();
    if (!room.session) {
      room.seats = room.seats.filter((s) => s.seatId !== seatId);
      if (room.hostSeatId === seatId && room.seats.length > 0) {
        room.hostSeatId = room.seats[0].seatId;
      }
    }
  }
  /** Assentos cuja janela de reconexão expirou. Não decide regra de vitória. */
  expiredSeats(room) {
    const cutoff = this.now() - RECONNECT_WINDOW_MS;
    return room.seats.filter(
      (s) => !s.connected && s.disconnectedAt !== null && s.disconnectedAt < cutoff
    );
  }
  dropEmptyRooms() {
    for (const [code, room] of this.rooms) {
      if (room.seats.length === 0) this.rooms.delete(code);
    }
  }
  lobbyView(room) {
    return {
      code: room.code,
      maxPlayers: room.maxPlayers,
      started: room.session !== null,
      hostSeatId: room.hostSeatId,
      players: room.seats.map(
        (seat) => ({
          seatId: seat.seatId,
          name: seat.name,
          factionId: seat.factionId,
          ready: seat.ready,
          connected: seat.connected,
          isHost: seat.seatId === room.hostSeatId,
          pingMs: null
        })
      )
    };
  }
};

// src/net/serverEntry.ts
var PORT = Number(process.env.PORT ?? 8787);
var rooms = new RoomService();
var clients = /* @__PURE__ */ new Map();
function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}
function fail2(socket, code) {
  send(socket, { type: "ERROR", code, message: SERVER_ERROR_TEXT[code] });
}
function clientsOf(room) {
  return [...clients.values()].filter((c) => c.room?.code === room.code);
}
function broadcastLobby(room) {
  const lobby = rooms.lobbyView(room);
  for (const client of clientsOf(room)) send(client.socket, { type: "ROOM", lobby });
}
function broadcastSnapshots(room) {
  if (!room.session) return;
  for (const client of clientsOf(room)) {
    if (!client.seat?.playerId) continue;
    send(client.socket, {
      type: "SNAPSHOT",
      snapshot: room.session.snapshotFor(client.seat.playerId)
    });
  }
}
function handle(socket, message) {
  const client = clients.get(socket);
  if (!client) return;
  switch (message.type) {
    case "HELLO": {
      if (message.protocol !== PROTOCOL_VERSION) return fail2(socket, "VERSION_MISMATCH");
      return;
    }
    case "CREATE_ROOM": {
      const { room, seat } = rooms.createRoom(message.name, message.maxPlayers);
      client.room = room;
      client.seat = seat;
      send(socket, {
        type: "WELCOME",
        seatId: seat.seatId,
        resumeToken: seat.resumeToken,
        protocol: PROTOCOL_VERSION
      });
      broadcastLobby(room);
      return;
    }
    case "JOIN_ROOM": {
      const result = rooms.join(message.code, message.name, message.resumeToken);
      if (!result.ok) return fail2(socket, result.error);
      client.room = result.room;
      client.seat = result.seat;
      send(socket, {
        type: "WELCOME",
        seatId: result.seat.seatId,
        resumeToken: result.seat.resumeToken,
        protocol: PROTOCOL_VERSION
      });
      broadcastLobby(result.room);
      if (result.room.session && result.seat.playerId) {
        send(socket, {
          type: "SNAPSHOT",
          snapshot: result.room.session.snapshotFor(result.seat.playerId)
        });
      }
      return;
    }
    case "PICK_FACTION": {
      if (!client.room || !client.seat) return fail2(socket, "BAD_REQUEST");
      const ok = rooms.pickFaction(client.room, client.seat.seatId, message.factionId);
      if (!ok) return fail2(socket, "FACTION_TAKEN");
      broadcastLobby(client.room);
      return;
    }
    case "SET_READY": {
      if (!client.room || !client.seat) return fail2(socket, "BAD_REQUEST");
      rooms.setReady(client.room, client.seat.seatId, message.ready);
      broadcastLobby(client.room);
      return;
    }
    case "KICK": {
      if (!client.room || !client.seat) return fail2(socket, "BAD_REQUEST");
      if (!rooms.kick(client.room, client.seat.seatId, message.seatId)) {
        return fail2(socket, "NOT_HOST");
      }
      const kicked = clientsOf(client.room).find((c) => c.seat?.seatId === message.seatId);
      if (kicked) {
        kicked.room = null;
        kicked.seat = null;
        send(kicked.socket, { type: "PLAYER_LEFT", seatId: message.seatId, reconnecting: false });
      }
      broadcastLobby(client.room);
      return;
    }
    case "START_MATCH": {
      if (!client.room || !client.seat) return fail2(socket, "BAD_REQUEST");
      const started = rooms.start(client.room, client.seat.seatId);
      if (!started.ok) {
        return send(socket, { type: "REJECTED", reason: started.error ?? "N\xE3o foi poss\xEDvel iniciar." });
      }
      for (const other of clientsOf(client.room)) {
        send(other.socket, { type: "MATCH_STARTING", countdownMs: 3e3 });
      }
      broadcastLobby(client.room);
      broadcastSnapshots(client.room);
      return;
    }
    case "INTENT": {
      if (!client.room?.session || !client.seat?.playerId) return fail2(socket, "BAD_REQUEST");
      const result = client.room.session.submit(client.seat.playerId, message.action);
      if (!result.ok) {
        return send(socket, {
          type: "REJECTED",
          reason: result.error ?? "A\xE7\xE3o recusada.",
          action: message.action.type
        });
      }
      if (result.dice) {
        for (const other of clientsOf(client.room)) {
          send(other.socket, { type: "DICE", dice: result.dice });
        }
      }
      broadcastSnapshots(client.room);
      return;
    }
    case "REQUEST_SNAPSHOT": {
      if (!client.room?.session || !client.seat?.playerId) return;
      send(socket, {
        type: "SNAPSHOT",
        snapshot: client.room.session.snapshotFor(client.seat.playerId)
      });
      return;
    }
    case "PING":
      return send(socket, { type: "PONG", sentAt: message.sentAt });
    case "LEAVE": {
      if (client.room && client.seat) {
        const room = client.room;
        rooms.markDisconnected(room, client.seat.seatId);
        broadcastLobby(room);
      }
      client.room = null;
      client.seat = null;
      return;
    }
    default:
      return fail2(socket, "BAD_REQUEST");
  }
}
var server = new WebSocketServer({ port: PORT });
server.on("connection", (socket) => {
  clients.set(socket, { socket, seat: null, room: null });
  socket.on("message", (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return fail2(socket, "BAD_REQUEST");
    }
    try {
      handle(socket, parsed);
    } catch (error) {
      send(socket, {
        type: "ERROR",
        code: "BAD_REQUEST",
        message: error instanceof Error ? error.message : "Erro no servidor."
      });
    }
  });
  socket.on("close", () => {
    const client = clients.get(socket);
    if (client?.room && client.seat) {
      const room = client.room;
      const seatId = client.seat.seatId;
      const midMatch = room.session !== null;
      rooms.markDisconnected(room, seatId);
      for (const other of clientsOf(room)) {
        send(other.socket, { type: "PLAYER_LEFT", seatId, reconnecting: midMatch });
      }
      broadcastLobby(room);
    }
    clients.delete(socket);
    rooms.dropEmptyRooms();
  });
});
console.log(`[INVAS\xC3O: COLAPSO] servidor autoritativo em ws://localhost:${PORT}`);
