/**
 * Gerador de páginas PNG-backed para "Moisés e o Mar Vermelho".
 *
 * Todas as 30 páginas agora usam PNGs line art reais (estilo Pixar).
 *
 * Mesmo padrão dos outros geradores PNG: cada página é um SVG mínimo com
 * `<image>` + `data-png-url` para que o roteador detecte e instancie o motor
 * canvas em vez do motor SVG procedural.
 */

import moisesPage01 from "@/assets/moises-png/page-01.png";
import moisesPage02 from "@/assets/moises-png/page-02.png";
import moisesPage03 from "@/assets/moises-png/page-03.png";
import moisesPage04 from "@/assets/moises-png/page-04.png";
import moisesPage05 from "@/assets/moises-png/page-05.png";
import moisesPage06 from "@/assets/moises-png/page-06.png";
import moisesPage07 from "@/assets/moises-png/page-07.png";
import moisesPage08 from "@/assets/moises-png/page-08.png";
import moisesPage09 from "@/assets/moises-png/page-09.png";
import moisesPage10 from "@/assets/moises-png/page-10.png";
import moisesPage11 from "@/assets/moises-png/page-11.png";
import moisesPage12 from "@/assets/moises-png/page-12.png";
import moisesPage13 from "@/assets/moises-png/page-13.png";
import moisesPage14 from "@/assets/moises-png/page-14.png";
import moisesPage15 from "@/assets/moises-png/page-15.png";
import moisesPage16 from "@/assets/moises-png/page-16.png";
import moisesPage17 from "@/assets/moises-png/page-17.png";
import moisesPage18 from "@/assets/moises-png/page-18.png";
import moisesPage19 from "@/assets/moises-png/page-19.png";
import moisesPage20 from "@/assets/moises-png/page-20.png";
import moisesPage21 from "@/assets/moises-png/page-21.png";
import moisesPage22 from "@/assets/moises-png/page-22.png";
import moisesPage23 from "@/assets/moises-png/page-23.png";
import moisesPage24 from "@/assets/moises-png/page-24.png";
import moisesPage25 from "@/assets/moises-png/page-25.png";
import moisesPage26 from "@/assets/moises-png/page-26.png";
import moisesPage27 from "@/assets/moises-png/page-27.png";
import moisesPage28 from "@/assets/moises-png/page-28.png";
import moisesPage29 from "@/assets/moises-png/page-29.png";
import moisesPage30 from "@/assets/moises-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

/**
 * Retorna as 30 páginas reais (PNG) de Moisés e o Mar Vermelho.
 */
export function generateMoisesPngFirstPages(): string[] {
  const realPages = [
    moisesPage01,
    moisesPage02,
    moisesPage03,
    moisesPage04,
    moisesPage05,
    moisesPage06,
    moisesPage07,
    moisesPage08,
    moisesPage09,
    moisesPage10,
    moisesPage11,
    moisesPage12,
    moisesPage13,
    moisesPage14,
    moisesPage15,
    moisesPage16,
    moisesPage17,
    moisesPage18,
    moisesPage19,
    moisesPage20,
    moisesPage21,
    moisesPage22,
    moisesPage23,
    moisesPage24,
    moisesPage25,
    moisesPage26,
    moisesPage27,
    moisesPage28,
    moisesPage29,
    moisesPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
