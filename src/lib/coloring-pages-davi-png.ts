/**
 * Gerador de páginas PNG-backed para "Davi e Golias".
 *
 * Status: TRANSIÇÃO. Cada página agora exibe a PNG line art Pixar real
 * gerada pelo usuário (ChatGPT). O roteador (`colorir.$slug.tsx`) ainda
 * usa o motor SVG procedural como fallback enquanto o motor canvas+PNG
 * (`<ColoringCanvasPng>`) não é totalmente integrado à UI lateral
 * (miniaturas/zoom/pan).
 *
 * Quando o motor canvas estiver integrado, basta o roteador ler o
 * atributo `data-png-url` e instanciar o canvas em vez do SVG — este
 * arquivo já produz SVGs com esse marcador.
 */

import daviPage01 from "@/assets/davi-golias/page-01.png";
import daviPage02 from "@/assets/davi-golias/page-02.png";
import daviPage03 from "@/assets/davi-golias/page-03.png";
import daviPage04 from "@/assets/davi-golias/page-04.png";
import daviPage05 from "@/assets/davi-golias/page-05.png";
import daviPage06 from "@/assets/davi-golias/page-06.png";
import daviPage07 from "@/assets/davi-golias/page-07.png";
import daviPage08 from "@/assets/davi-golias/page-08.png";
import daviPage09 from "@/assets/davi-golias/page-09.png";
import daviPage10 from "@/assets/davi-golias/page-10.png";
import daviPage11 from "@/assets/davi-golias/page-11.png";
import daviPage12 from "@/assets/davi-golias/page-12.png";
import daviPage13 from "@/assets/davi-golias/page-13.png";
import daviPage14 from "@/assets/davi-golias/page-14.png";
import daviPage15 from "@/assets/davi-golias/page-15.png";
import daviPage16 from "@/assets/davi-golias/page-16.png";
import daviPage17 from "@/assets/davi-golias/page-17.png";
import daviPage18 from "@/assets/davi-golias/page-18.png";
import daviPage19 from "@/assets/davi-golias/page-19.png";
import daviPage20 from "@/assets/davi-golias/page-20.png";
import daviPage21 from "@/assets/davi-golias/page-21.png";
import daviPage22 from "@/assets/davi-golias/page-22.png";
import daviPage23 from "@/assets/davi-golias/page-23.png";
import daviPage24 from "@/assets/davi-golias/page-24.png";
import daviPage25 from "@/assets/davi-golias/page-25.png";
import daviPage26 from "@/assets/davi-golias/page-26.png";
import daviPage27 from "@/assets/davi-golias/page-27.png";
import daviPage28 from "@/assets/davi-golias/page-28.png";
import daviPage29 from "@/assets/davi-golias/page-29.png";
import daviPage30 from "@/assets/davi-golias/page-30.png";

/**
 * SVG-stub para uma página PNG. Inclui:
 *   - `data-png-url` no <svg> raiz → marcador para o roteador detectar
 *     e usar o motor canvas em vez do motor SVG tradicional.
 *   - `<image>` → garante que miniaturas (que usam dangerouslySetInnerHTML
 *     com este SVG) já mostrem a PNG sem precisar do motor canvas.
 */
function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

/**
 * Stub para páginas placeholder (11-30) enquanto o usuário não envia as
 * PNGs restantes. Mostra a PNG da página 1 esmaecida + um label "Em breve".
 */
function placeholderStub(pageNumber: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <image href="${daviPage01}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet" opacity="0.18"/>
    <g pointer-events="none">
      <text x="300" y="290" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="800" fill="#2A2622">Página ${pageNumber}</text>
      <text x="300" y="335" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#2A2622" opacity="0.7">Em breve</text>
    </g>
  </svg>`;
}

/**
 * Helper público: dado o SVG de uma página, retorna a URL da PNG
 * line art (se houver) ou null. Usado pelo roteador para decidir
 * qual motor montar.
 */
export function extractPngUrl(svg: string): string | null {
  const match = svg.match(/<svg\b[^>]*\sdata-png-url\s*=\s*["']([^"']+)["']/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Exporta exatamente 30 SVGs para o slug "davi-e-golias".
 * Todas as 30 páginas agora são arte Pixar real do usuário.
 */
export function generateDaviGoliasPngPages(): string[] {
  const pixarPages = [
    daviPage01,
    daviPage02,
    daviPage03,
    daviPage04,
    daviPage05,
    daviPage06,
    daviPage07,
    daviPage08,
    daviPage09,
    daviPage10,
    daviPage11,
    daviPage12,
    daviPage13,
    daviPage14,
    daviPage15,
    daviPage16,
    daviPage17,
    daviPage18,
    daviPage19,
    daviPage20,
    daviPage21,
    daviPage22,
    daviPage23,
    daviPage24,
    daviPage25,
    daviPage26,
    daviPage27,
    daviPage28,
    daviPage29,
    daviPage30,
  ];
  return pixarPages.map((url) => pngPageStub(url));
}
