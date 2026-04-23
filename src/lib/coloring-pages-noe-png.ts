/**
 * Gerador de páginas PNG-backed para "Arca de Noé".
 *
 * Todas as 30 páginas agora são PNGs line art reais (estilo Pixar).
 *
 * Mesmo padrão do `coloring-pages-davi-png.ts`: cada página é um SVG mínimo
 * com `<image>` + `data-png-url` para que o roteador detecte e instancie o
 * motor canvas em vez do motor SVG procedural.
 */

import noePage01 from "@/assets/noe-png/page-01.png";
import noePage02 from "@/assets/noe-png/page-02.png";
import noePage03 from "@/assets/noe-png/page-03.png";
import noePage04 from "@/assets/noe-png/page-04.png";
import noePage05 from "@/assets/noe-png/page-05.png";
import noePage06 from "@/assets/noe-png/page-06.png";
import noePage07 from "@/assets/noe-png/page-07.png";
import noePage08 from "@/assets/noe-png/page-08.png";
import noePage09 from "@/assets/noe-png/page-09.png";
import noePage10 from "@/assets/noe-png/page-10.png";
import noePage11 from "@/assets/noe-png/page-11.png";
import noePage12 from "@/assets/noe-png/page-12.png";
import noePage13 from "@/assets/noe-png/page-13.png";
import noePage14 from "@/assets/noe-png/page-14.png";
import noePage15 from "@/assets/noe-png/page-15.png";
import noePage16 from "@/assets/noe-png/page-16.png";
import noePage17 from "@/assets/noe-png/page-17.png";
import noePage18 from "@/assets/noe-png/page-18.png";
import noePage19 from "@/assets/noe-png/page-19.png";
import noePage20 from "@/assets/noe-png/page-20.png";
import noePage21 from "@/assets/noe-png/page-21.png";
import noePage22 from "@/assets/noe-png/page-22.png";
import noePage23 from "@/assets/noe-png/page-23.png";
import noePage24 from "@/assets/noe-png/page-24.png";
import noePage25 from "@/assets/noe-png/page-25.png";
import noePage26 from "@/assets/noe-png/page-26.png";
import noePage27 from "@/assets/noe-png/page-27.png";
import noePage28 from "@/assets/noe-png/page-28.png";
import noePage29 from "@/assets/noe-png/page-29.png";
import noePage30 from "@/assets/noe-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

/**
 * Exporta exatamente 30 SVGs para o slug "noe-e-a-arca".
 * Todas as páginas (1–30) são PNG line art real.
 */
export function generateNoeArcaPngPages(): string[] {
  const realPages = [
    noePage01,
    noePage02,
    noePage03,
    noePage04,
    noePage05,
    noePage06,
    noePage07,
    noePage08,
    noePage09,
    noePage10,
    noePage11,
    noePage12,
    noePage13,
    noePage14,
    noePage15,
    noePage16,
    noePage17,
    noePage18,
    noePage19,
    noePage20,
    noePage21,
    noePage22,
    noePage23,
    noePage24,
    noePage25,
    noePage26,
    noePage27,
    noePage28,
    noePage29,
    noePage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
