/**
 * Gerador de páginas PNG-backed para "Jonas e a Baleia".
 *
 * Todas as 30 páginas agora são PNGs line art reais (estilo Pixar).
 *
 * Cada página é um SVG mínimo com `<image>` + `data-png-url` para que o
 * roteador detecte e instancie o motor canvas em vez do motor SVG procedural.
 */

import jonasPage01 from "@/assets/jonas-png/page-01.png";
import jonasPage02 from "@/assets/jonas-png/page-02.png";
import jonasPage03 from "@/assets/jonas-png/page-03.png";
import jonasPage04 from "@/assets/jonas-png/page-04.png";
import jonasPage05 from "@/assets/jonas-png/page-05.png";
import jonasPage06 from "@/assets/jonas-png/page-06.png";
import jonasPage07 from "@/assets/jonas-png/page-07.png";
import jonasPage08 from "@/assets/jonas-png/page-08.png";
import jonasPage09 from "@/assets/jonas-png/page-09.png";
import jonasPage10 from "@/assets/jonas-png/page-10.png";
import jonasPage11 from "@/assets/jonas-png/page-11.png";
import jonasPage12 from "@/assets/jonas-png/page-12.png";
import jonasPage13 from "@/assets/jonas-png/page-13.png";
import jonasPage14 from "@/assets/jonas-png/page-14.png";
import jonasPage15 from "@/assets/jonas-png/page-15.png";
import jonasPage16 from "@/assets/jonas-png/page-16.png";
import jonasPage17 from "@/assets/jonas-png/page-17.png";
import jonasPage18 from "@/assets/jonas-png/page-18.png";
import jonasPage19 from "@/assets/jonas-png/page-19.png";
import jonasPage20 from "@/assets/jonas-png/page-20.png";
import jonasPage21 from "@/assets/jonas-png/page-21.png";
import jonasPage22 from "@/assets/jonas-png/page-22.png";
import jonasPage23 from "@/assets/jonas-png/page-23.png";
import jonasPage24 from "@/assets/jonas-png/page-24.png";
import jonasPage25 from "@/assets/jonas-png/page-25.png";
import jonasPage26 from "@/assets/jonas-png/page-26.png";
import jonasPage27 from "@/assets/jonas-png/page-27.png";
import jonasPage28 from "@/assets/jonas-png/page-28.png";
import jonasPage29 from "@/assets/jonas-png/page-29.png";
import jonasPage30 from "@/assets/jonas-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

/**
 * Retorna as 30 páginas reais (PNG) de Jonas e a Baleia.
 * O dispatcher principal substitui as posições do array procedural por
 * estes stubs PNG.
 */
export function generateJonasPngFirstTenPages(): string[] {
  const realPages = [
    jonasPage01,
    jonasPage02,
    jonasPage03,
    jonasPage04,
    jonasPage05,
    jonasPage06,
    jonasPage07,
    jonasPage08,
    jonasPage09,
    jonasPage10,
    jonasPage11,
    jonasPage12,
    jonasPage13,
    jonasPage14,
    jonasPage15,
    jonasPage16,
    jonasPage17,
    jonasPage18,
    jonasPage19,
    jonasPage20,
    jonasPage21,
    jonasPage22,
    jonasPage23,
    jonasPage24,
    jonasPage25,
    jonasPage26,
    jonasPage27,
    jonasPage28,
    jonasPage29,
    jonasPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
