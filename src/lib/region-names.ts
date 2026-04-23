/**
 * Mapeia IDs de região (`fill-...-jesus-head`, `fill-sym-3-flor-p2`, …)
 * para um nome amigável + emoji para a criança ("Jesus", "Flor", "Sol").
 *
 * Por que existe?
 *   Antes mostrávamos só uma animação dourada nas regiões faltantes, o
 *   que ajuda visualmente mas a criança ainda perguntava "o que falta?".
 *   Agora exibimos um checklist com até 5 itens — agrupados por categoria
 *   semântica — para tornar explícito ("Falta: Sol, Flor, Pomba").
 *
 * Heurística:
 *   - Removemos prefixos técnicos (`fill-`, `bg-7-`, `hero-3-`, `sym-12-`).
 *   - Procuramos a primeira keyword conhecida no slug normalizado.
 *   - Devolvemos { key, label, emoji } — `key` é usado para deduplicar
 *     no checklist (ex.: "flor-p1", "flor-p2", "flor-center" viram um só
 *     item "Flor"). Isso evita listar 6 pétalas separadas.
 *
 * Quando nenhuma regra casa, devolvemos um fallback genérico ("Detalhe")
 * para ainda assim agrupar — nunca expomos o ID cru.
 */
export type FriendlyRegion = {
  /** Chave para deduplicar no checklist (ex.: "flor", "jesus", "sol"). */
  key: string;
  /** Rótulo legível por humano para a criança. */
  label: string;
  /** Emoji que ilustra a região na lista. */
  emoji: string;
};

type Rule = {
  /** Chaves a procurar (já em lowercase, comparadas com `includes`). */
  keywords: string[];
  /** O que devolver quando alguma keyword bate. */
  region: FriendlyRegion;
};

/**
 * Idiomas suportados para os rótulos do checklist. Mantém um subconjunto
 * dos `AppLanguage` do `i18n.ts` — duplicar o tipo aqui evita um ciclo
 * de importação (`i18n` → `region-names` → `i18n`).
 */
export type RegionLanguage = "pt-BR" | "en-US" | "es-ES";

/**
 * Traduções dos rótulos amigáveis usados no checklist "o que falta
 * colorir". As chaves vêm do campo `key` de cada `FriendlyRegion` —
 * a mesma chave é usada para deduplicar itens no checklist.
 *
 * Importante: o campo `label` em `RULES` permanece em PT-BR e funciona
 * como fallback. Se uma chave aqui faltar para um idioma, caímos para
 * o PT-BR — assim, novas regras não quebram a UI enquanto não recebem
 * tradução.
 */
const LABEL_TRANSLATIONS: Record<Exclude<RegionLanguage, "pt-BR">, Record<string, string>> = {
  "en-US": {
    jesus: "Jesus",
    maria: "Mary",
    jose: "Joseph",
    bebe: "Baby Jesus",
    davi: "David",
    golias: "Goliath",
    noe: "Noah",
    ester: "Esther",
    rei: "King",
    pastor: "Shepherd",
    pai: "Father",
    filho: "Son",
    samaritano: "Good Samaritan",
    viajante: "Traveler",
    semeador: "Sower",
    criancas: "Child",
    pomba: "Dove",
    ovelha: "Sheep",
    leao: "Lion",
    camelo: "Camel",
    baleia: "Whale",
    peixe: "Fish",
    passaro: "Bird",
    elefante: "Elephant",
    girafa: "Giraffe",
    sol: "Sun",
    lua: "Moon",
    estrela: "Star",
    nuvem: "Cloud",
    "arco-iris": "Rainbow",
    chuva: "Rain",
    ceu: "Sky",
    mar: "Sea",
    montanha: "Mountain",
    colina: "Hill",
    arvore: "Tree",
    palmeira: "Palm tree",
    grama: "Grass",
    flor: "Flower",
    folha: "Leaves",
    rocha: "Rock",
    chao: "Ground",
    arca: "Boat",
    casa: "House",
    tenda: "Tent",
    estabulo: "Stable",
    telhado: "Roof",
    porta: "Door",
    janela: "Window",
    poco: "Well",
    cesto: "Basket",
    pao: "Bread",
    rolo: "Scroll",
    tabua: "Tablet",
    coroa: "Crown",
    cajado: "Staff",
    lampada: "Lamp",
    coracao: "Heart",
    detalhe: "Detail",
  },
  "es-ES": {
    jesus: "Jesús",
    maria: "María",
    jose: "José",
    bebe: "Bebé Jesús",
    davi: "David",
    golias: "Goliat",
    noe: "Noé",
    ester: "Ester",
    rei: "Rey",
    pastor: "Pastor",
    pai: "Padre",
    filho: "Hijo",
    samaritano: "Buen samaritano",
    viajante: "Viajero",
    semeador: "Sembrador",
    criancas: "Niño",
    pomba: "Paloma",
    ovelha: "Oveja",
    leao: "León",
    camelo: "Camello",
    baleia: "Ballena",
    peixe: "Pez",
    passaro: "Pájaro",
    elefante: "Elefante",
    girafa: "Jirafa",
    sol: "Sol",
    lua: "Luna",
    estrela: "Estrella",
    nuvem: "Nube",
    "arco-iris": "Arcoíris",
    chuva: "Lluvia",
    ceu: "Cielo",
    mar: "Mar",
    montanha: "Montaña",
    colina: "Colina",
    arvore: "Árbol",
    palmeira: "Palmera",
    grama: "Hierba",
    flor: "Flor",
    folha: "Hojas",
    rocha: "Roca",
    chao: "Suelo",
    arca: "Barco",
    casa: "Casa",
    tenda: "Tienda",
    estabulo: "Establo",
    telhado: "Tejado",
    porta: "Puerta",
    janela: "Ventana",
    poco: "Pozo",
    cesto: "Cesta",
    pao: "Pan",
    rolo: "Rollo",
    tabua: "Tabla",
    coroa: "Corona",
    cajado: "Cayado",
    lampada: "Lámpara",
    coracao: "Corazón",
    detalhe: "Detalle",
  },
};

function localizeLabel(key: string, ptLabel: string, language: RegionLanguage): string {
  if (language === "pt-BR") return ptLabel;
  return LABEL_TRANSLATIONS[language]?.[key] ?? ptLabel;
}

const RULES: Rule[] = [
  // ─── Personagens bíblicos (mais específicos primeiro) ────────────────
  { keywords: ["jesus"], region: { key: "jesus", label: "Jesus", emoji: "👤" } },
  { keywords: ["maria"], region: { key: "maria", label: "Maria", emoji: "👩" } },
  { keywords: ["jose"], region: { key: "jose", label: "José", emoji: "👨" } },
  { keywords: ["bebe"], region: { key: "bebe", label: "Bebê Jesus", emoji: "👶" } },
  { keywords: ["davi"], region: { key: "davi", label: "Davi", emoji: "🧒" } },
  { keywords: ["gol", "golias"], region: { key: "golias", label: "Golias", emoji: "🧔" } },
  { keywords: ["noah", "noe"], region: { key: "noe", label: "Noé", emoji: "🧓" } },
  { keywords: ["ester"], region: { key: "ester", label: "Ester", emoji: "👸" } },
  { keywords: ["rei"], region: { key: "rei", label: "Rei", emoji: "🤴" } },
  { keywords: ["pastor"], region: { key: "pastor", label: "Pastor", emoji: "🧑‍🌾" } },
  { keywords: ["pai"], region: { key: "pai", label: "Pai", emoji: "👨" } },
  { keywords: ["filho"], region: { key: "filho", label: "Filho", emoji: "🧒" } },
  { keywords: ["sam"], region: { key: "samaritano", label: "Bom samaritano", emoji: "🧑" } },
  { keywords: ["viajante"], region: { key: "viajante", label: "Viajante", emoji: "🧑" } },
  { keywords: ["semeador"], region: { key: "semeador", label: "Semeador", emoji: "🧑‍🌾" } },
  // ─── Crianças (vários ids cN-head/body) ──────────────────────────────
  // Os ids têm a forma "...-c1-head", "...-c2-body", "...-c3-..." — então
  // procuramos por `-c1-`/`-c2-`/`-c3-` (com tracinhos) no slug bruto, e
  // também aceitamos `child` para slugs em inglês.
  {
    keywords: ["-c1-", "-c2-", "-c3-", "child"],
    region: { key: "criancas", label: "Criança", emoji: "🧒" },
  },

  // ─── Animais ─────────────────────────────────────────────────────────
  { keywords: ["dove", "pomba"], region: { key: "pomba", label: "Pomba", emoji: "🕊️" } },
  {
    keywords: ["sheep", "ovelha", "lamb", "rebanho"],
    region: { key: "ovelha", label: "Ovelha", emoji: "🐑" },
  },
  { keywords: ["lion", "leao"], region: { key: "leao", label: "Leão", emoji: "🦁" } },
  { keywords: ["camel", "camelo"], region: { key: "camelo", label: "Camelo", emoji: "🐪" } },
  { keywords: ["whale", "baleia"], region: { key: "baleia", label: "Baleia", emoji: "🐋" } },
  { keywords: ["fish", "peixe"], region: { key: "peixe", label: "Peixe", emoji: "🐟" } },
  {
    keywords: ["bird", "passaro", "pass"],
    region: { key: "passaro", label: "Pássaro", emoji: "🐦" },
  },
  {
    keywords: ["elephant", "elefante"],
    region: { key: "elefante", label: "Elefante", emoji: "🐘" },
  },
  { keywords: ["giraffe", "girafa"], region: { key: "girafa", label: "Girafa", emoji: "🦒" } },

  // ─── Natureza ────────────────────────────────────────────────────────
  { keywords: ["sun", "sol"], region: { key: "sol", label: "Sol", emoji: "☀️" } },
  { keywords: ["moon", "lua"], region: { key: "lua", label: "Lua", emoji: "🌙" } },
  { keywords: ["star", "estrela"], region: { key: "estrela", label: "Estrela", emoji: "⭐" } },
  { keywords: ["cloud", "nuvem"], region: { key: "nuvem", label: "Nuvem", emoji: "☁️" } },
  {
    keywords: ["rainbow", "-rb-", "arco"],
    region: { key: "arco-iris", label: "Arco-íris", emoji: "🌈" },
  },
  { keywords: ["rain", "chuva"], region: { key: "chuva", label: "Chuva", emoji: "🌧️" } },
  { keywords: ["sky"], region: { key: "ceu", label: "Céu", emoji: "🌌" } },
  { keywords: ["sea", "ocean", "wave", "mar"], region: { key: "mar", label: "Mar", emoji: "🌊" } },
  { keywords: ["mountain", "mt-"], region: { key: "montanha", label: "Montanha", emoji: "⛰️" } },
  { keywords: ["hill", "colina"], region: { key: "colina", label: "Colina", emoji: "🌄" } },
  { keywords: ["tree", "arvore", "arv"], region: { key: "arvore", label: "Árvore", emoji: "🌳" } },
  { keywords: ["palm"], region: { key: "palmeira", label: "Palmeira", emoji: "🌴" } },
  { keywords: ["grass", "broto"], region: { key: "grama", label: "Grama", emoji: "🌱" } },
  { keywords: ["flor", "flower", "tulip"], region: { key: "flor", label: "Flor", emoji: "🌸" } },
  { keywords: ["leaf", "leaves"], region: { key: "folha", label: "Folhas", emoji: "🍃" } },
  { keywords: ["stone", "rocha", "rock"], region: { key: "rocha", label: "Rocha", emoji: "🪨" } },
  // `ground` é o nome explícito; o id curto `g` vem das primitivas
  // (`ground(id)` → `fill-...-g`). Marcador especial @bare-X cobre o
  // caso "fill-bg-5-g" (onde sobra apenas `g` após o prefixo) sem capturar
  // palavras maiores como "gol".
  {
    keywords: ["ground", "terra", "yard", "@bare-g"],
    region: { key: "chao", label: "Chão", emoji: "🟫" },
  },

  // ─── Construções/objetos ─────────────────────────────────────────────
  {
    keywords: ["ark", "arca", "boat", "barco", "hull"],
    region: { key: "arca", label: "Barco", emoji: "🚢" },
  },
  { keywords: ["house", "casa", "wall"], region: { key: "casa", label: "Casa", emoji: "🏠" } },
  { keywords: ["tent", "tenda"], region: { key: "tenda", label: "Tenda", emoji: "⛺" } },
  { keywords: ["stable", "estabulo"], region: { key: "estabulo", label: "Estábulo", emoji: "🏚️" } },
  { keywords: ["roof", "telhado"], region: { key: "telhado", label: "Telhado", emoji: "🏠" } },
  { keywords: ["door", "porta"], region: { key: "porta", label: "Porta", emoji: "🚪" } },
  { keywords: ["window", "janela"], region: { key: "janela", label: "Janela", emoji: "🪟" } },
  { keywords: ["well", "poco"], region: { key: "poco", label: "Poço", emoji: "🛖" } },
  { keywords: ["basket", "cesto"], region: { key: "cesto", label: "Cesto", emoji: "🧺" } },
  { keywords: ["bread", "pao"], region: { key: "pao", label: "Pão", emoji: "🍞" } },
  { keywords: ["scroll", "rolo"], region: { key: "rolo", label: "Rolo", emoji: "📜" } },
  { keywords: ["tablet"], region: { key: "tabua", label: "Tábua", emoji: "📜" } },
  { keywords: ["crown", "coroa"], region: { key: "coroa", label: "Coroa", emoji: "👑" } },
  { keywords: ["staff", "cajado"], region: { key: "cajado", label: "Cajado", emoji: "🦯" } },
  { keywords: ["lamp"], region: { key: "lampada", label: "Lâmpada", emoji: "🕯️" } },
  // `heart()` gera ids como "fill-h-3" ou "fill-heart-2". Aceitamos
  // ambos: a chave longa via `includes` e o caso curto via @bare-h.
  {
    keywords: ["heart", "coracao", "abraco", "amor", "@bare-h"],
    region: { key: "coracao", label: "Coração", emoji: "❤️" },
  },
];

const FALLBACK: FriendlyRegion = { key: "detalhe", label: "Detalhe", emoji: "✨" };

/**
 * Devolve o nome amigável de uma região a partir do id `fill-...`.
 *
 * Limpa prefixos técnicos antes de procurar — o objetivo é que regras
 * curtas como `["sol"]` casem mesmo em ids longos como
 * `fill-bg-7-sol-12`.
 */
export function nameForRegionId(id: string, language: RegionLanguage = "pt-BR"): FriendlyRegion {
  // Conservador: só removemos `fill-` e os 3 prefixos sintéticos do
  // gerador (`bg-N-`, `hero-N-`, `sym-N-`). O resto fica intacto para
  // que tokens curtos como `c1`, `g`, `h`, `dove-body` sigam reconhecíveis.
  const slug = id
    .toLowerCase()
    .replace(/^fill-/, "")
    .replace(/^(bg|hero|sym)-\d+-/, "");

  // Quando o slug restante é "letra+número" (ex.: `g`, `g-5`, `h-2`,
  // `sun-3`), construímos a sentinela `@bare-X` para casar regras que
  // querem só esse helper sem confundir com palavras maiores ("gol",
  // "house", "heart").
  const bareMatch = slug.match(/^([a-z]+)(?:-\d+)?$/);
  const bareToken = bareMatch ? `@bare-${bareMatch[1]}` : null;

  // Adiciona dashes nas pontas para regras como `-c1-` casarem mesmo
  // quando o token está no início ou no fim do slug.
  const slugWithBoundaries = `-${slug}-`;

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (kw.startsWith("@bare-")) {
        if (bareToken === kw) return localizeRegion(rule.region, language);
      } else if (slugWithBoundaries.includes(kw)) {
        return localizeRegion(rule.region, language);
      }
    }
  }
  return localizeRegion(FALLBACK, language);
}

function localizeRegion(region: FriendlyRegion, language: RegionLanguage): FriendlyRegion {
  if (language === "pt-BR") return region;
  return { ...region, label: localizeLabel(region.key, region.label, language) };
}

/**
 * Item agregado do checklist de "o que falta": consolida múltiplos ids
 * que viram o mesmo nome amigável (ex.: pétalas → "Flor (4)").
 */
export type MissingChecklistItem = FriendlyRegion & {
  /** Quantos ids brutos casaram com esse nome. */
  count: number;
  /** Lista dos ids originais — útil para destacar todos no canvas. */
  ids: string[];
};

/**
 * Agrupa uma lista de ids em itens amigáveis para exibir no checklist.
 *
 * Ordem do retorno:
 *   1. Personagens humanos > animais > natureza > objetos (definido pela
 *      ordem das regras acima — preserva a ordem de descoberta).
 *   2. Dentro do mesmo grupo, mais "frequentes" primeiro.
 */
export function buildMissingChecklist(
  missingIds: string[],
  language: RegionLanguage = "pt-BR",
): MissingChecklistItem[] {
  const map = new Map<string, MissingChecklistItem>();
  // Mantém a ordem da primeira ocorrência para estabilidade visual entre
  // re-renders (evita o checklist "pular" quando uma região é pintada).
  for (const id of missingIds) {
    const friendly = nameForRegionId(id, language);
    const existing = map.get(friendly.key);
    if (existing) {
      existing.count += 1;
      existing.ids.push(id);
    } else {
      map.set(friendly.key, { ...friendly, count: 1, ids: [id] });
    }
  }
  return Array.from(map.values());
}
