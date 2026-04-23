import type { AppLanguage } from "@/lib/i18n";

/**
 * Mapeia cores hex da paleta de pintura para nomes amigáveis localizados,
 * usados em aria-labels para acessibilidade (leitores de tela).
 */
const COLOR_NAMES: Record<string, Record<AppLanguage, string>> = {
  "#FF9E8A": { "pt-BR": "coral", "en-US": "coral", "es-ES": "coral" },
  "#F2C96B": { "pt-BR": "dourado", "en-US": "gold", "es-ES": "dorado" },
  "#92D6B3": { "pt-BR": "menta", "en-US": "mint", "es-ES": "menta" },
  "#7CB7FF": { "pt-BR": "azul céu", "en-US": "sky blue", "es-ES": "azul cielo" },
  "#3E6FB6": { "pt-BR": "azul escuro", "en-US": "deep blue", "es-ES": "azul oscuro" },
  "#5C4B3B": { "pt-BR": "marrom", "en-US": "brown", "es-ES": "marrón" },
  "#FFFFFF": { "pt-BR": "branco", "en-US": "white", "es-ES": "blanco" },
  "#FFB6D9": { "pt-BR": "rosa", "en-US": "pink", "es-ES": "rosa" },
  "#C5A3FF": { "pt-BR": "roxo", "en-US": "purple", "es-ES": "morado" },
  "#A8E6CF": { "pt-BR": "verde claro", "en-US": "pale green", "es-ES": "verde claro" },
  "#FFD56B": { "pt-BR": "amarelo", "en-US": "yellow", "es-ES": "amarillo" },
  "#FF7373": { "pt-BR": "vermelho", "en-US": "red", "es-ES": "rojo" },
  "#6FCF97": { "pt-BR": "verde", "en-US": "green", "es-ES": "verde" },
  "#FFC97A": { "pt-BR": "pêssego", "en-US": "peach", "es-ES": "melocotón" },
  "#1F2937": { "pt-BR": "preto", "en-US": "black", "es-ES": "negro" },
};

export function getColorName(hex: string, language: AppLanguage): string {
  return COLOR_NAMES[hex]?.[language] ?? hex;
}
