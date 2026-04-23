/**
 * Heurística simples: olha o id da região (após "fill-") e devolve uma cor
 * sugerida baseada em palavras-chave conhecidas. Funciona offline, sem IA.
 */

import { extractFillableRegionIds } from "@/lib/coloring-progress";

const RULES: Array<{ keywords: string[]; color: string; label: string }> = [
  { keywords: ["sun"], color: "#F2C96B", label: "sol" },
  { keywords: ["moon", "star"], color: "#FFE89A", label: "lua/estrela" },
  { keywords: ["sky", "background", "bg"], color: "#CDE6FF", label: "céu" },
  { keywords: ["cloud"], color: "#FFFFFF", label: "nuvem" },
  { keywords: ["rainbow-1", "rainbow1"], color: "#FF6B6B", label: "arco-íris" },
  { keywords: ["rainbow-2", "rainbow2"], color: "#FFA94D", label: "arco-íris" },
  { keywords: ["rainbow-3", "rainbow3"], color: "#FFE066", label: "arco-íris" },
  { keywords: ["rainbow-4", "rainbow4"], color: "#69DB7C", label: "arco-íris" },
  { keywords: ["rainbow-5", "rainbow5"], color: "#4DABF7", label: "arco-íris" },
  { keywords: ["rainbow-6", "rainbow6"], color: "#9775FA", label: "arco-íris" },
  { keywords: ["rainbow"], color: "#7CB7FF", label: "arco-íris" },
  { keywords: ["water", "sea", "ocean", "river", "wave"], color: "#7CB7FF", label: "água" },
  { keywords: ["grass", "ground-green", "field"], color: "#A7D89A", label: "grama" },
  {
    keywords: ["ground", "sand", "earth", "soil", "rock", "stone"],
    color: "#E5C8A0",
    label: "terra",
  },
  { keywords: ["mountain", "hill"], color: "#A89A8C", label: "montanha" },
  { keywords: ["tree", "leaf", "leaves", "bush", "plant"], color: "#6FB36F", label: "vegetação" },
  { keywords: ["trunk", "wood", "log", "branch"], color: "#8B5A3C", label: "madeira" },
  { keywords: ["ark", "boat", "ship", "hull"], color: "#A0673A", label: "arca/barco" },
  { keywords: ["roof", "tent"], color: "#C24D4D", label: "telhado" },
  { keywords: ["wall", "house", "stone-wall"], color: "#F2D2A6", label: "parede" },
  { keywords: ["door"], color: "#7A4A2E", label: "porta" },
  { keywords: ["window"], color: "#FFE89A", label: "janela" },
  { keywords: ["fish", "whale-body", "whale"], color: "#5BA9D6", label: "peixe/baleia" },
  { keywords: ["lion"], color: "#E0A040", label: "leão" },
  { keywords: ["elephant"], color: "#B0B5BB", label: "elefante" },
  { keywords: ["giraffe"], color: "#F2C96B", label: "girafa" },
  { keywords: ["bird", "dove"], color: "#FFFFFF", label: "ave" },
  { keywords: ["sheep", "lamb"], color: "#F5EFE6", label: "ovelha" },
  { keywords: ["cow", "ox"], color: "#D7B58B", label: "vaca" },
  { keywords: ["horse"], color: "#8B5A3C", label: "cavalo" },
  { keywords: ["dog"], color: "#C99966", label: "cachorro" },
  { keywords: ["cat"], color: "#E5B568", label: "gato" },
  { keywords: ["rabbit", "bunny"], color: "#F2D8C2", label: "coelho" },
  { keywords: ["snake", "serpent"], color: "#7AB87A", label: "serpente" },
  { keywords: ["fire", "flame"], color: "#FF7043", label: "fogo" },
  { keywords: ["bread", "loaf"], color: "#E5C088", label: "pão" },
  { keywords: ["fruit", "apple"], color: "#FF6B6B", label: "fruta" },
  { keywords: ["grape"], color: "#9775FA", label: "uva" },
  { keywords: ["robe", "tunic", "cloak"], color: "#7CB7FF", label: "veste" },
  { keywords: ["sandal", "shoe"], color: "#7A4A2E", label: "sandália" },
  { keywords: ["hair", "beard"], color: "#5C3A1E", label: "cabelo" },
  { keywords: ["skin", "face", "hand", "arm", "leg"], color: "#F2D2A6", label: "pele" },
  { keywords: ["crown"], color: "#F2C96B", label: "coroa" },
  {
    keywords: ["sword", "shield", "armor", "helmet", "spear"],
    color: "#B5BCC6",
    label: "armadura",
  },
  { keywords: ["staff", "stick"], color: "#8B5A3C", label: "cajado" },
  { keywords: ["sling", "rope"], color: "#A89A8C", label: "corda" },
  { keywords: ["heart"], color: "#FF9E8A", label: "coração" },
  { keywords: ["cross"], color: "#8B5A3C", label: "cruz" },
];

const FALLBACK_PALETTE = ["#FF9E8A", "#F2C96B", "#7CB7FF", "#A7D89A", "#C8A4E8", "#FFB199"];

/** Retorna a cor sugerida para o id da região, ou cor de fallback rotativa. */
export function suggestColorForId(id: string, fallbackIndex = 0): string {
  const lower = id.toLowerCase().replace(/^fill-/, "");
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.color;
  }
  return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}

/** Extrai todos os ids fill-* de um SVG (string) e devolve o mapa id→cor. */
export function suggestFillsFromSvg(svg: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Usa o mesmo conjunto de IDs "preenchíveis" que o resto do app considera
  // (ignora halos decorativos com `fill="..."` fixo). Garante que a pintura
  // mágica não polua os fills com ids que não contam para o progresso.
  const ids = Array.from(extractFillableRegionIds(svg));
  ids.forEach((id, i) => {
    result[id] = suggestColorForId(id, i);
  });
  return result;
}
