/**
 * Gerador de páginas PNG-backed para "Daniel na Cova dos Leões".
 *
 * Todas as 30 páginas agora usam PNGs line art reais (estilo Pixar).
 */

import danielPage01 from "@/assets/daniel-png/page-01.png";
import danielPage02 from "@/assets/daniel-png/page-02.png";
import danielPage03 from "@/assets/daniel-png/page-03.png";
import danielPage04 from "@/assets/daniel-png/page-04.png";
import danielPage05 from "@/assets/daniel-png/page-05.png";
import danielPage06 from "@/assets/daniel-png/page-06.png";
import danielPage07 from "@/assets/daniel-png/page-07.png";
import danielPage08 from "@/assets/daniel-png/page-08.png";
import danielPage09 from "@/assets/daniel-png/page-09.png";
import danielPage10 from "@/assets/daniel-png/page-10.png";
import danielPage11 from "@/assets/daniel-png/page-11.png";
import danielPage12 from "@/assets/daniel-png/page-12.png";
import danielPage13 from "@/assets/daniel-png/page-13.png";
import danielPage14 from "@/assets/daniel-png/page-14.png";
import danielPage15 from "@/assets/daniel-png/page-15.png";
import danielPage16 from "@/assets/daniel-png/page-16.png";
import danielPage17 from "@/assets/daniel-png/page-17.png";
import danielPage18 from "@/assets/daniel-png/page-18.png";
import danielPage19 from "@/assets/daniel-png/page-19.png";
import danielPage20 from "@/assets/daniel-png/page-20.png";
import danielPage21 from "@/assets/daniel-png/page-21.png";
import danielPage22 from "@/assets/daniel-png/page-22.png";
import danielPage23 from "@/assets/daniel-png/page-23.png";
import danielPage24 from "@/assets/daniel-png/page-24.png";
import danielPage25 from "@/assets/daniel-png/page-25.png";
import danielPage26 from "@/assets/daniel-png/page-26.png";
import danielPage27 from "@/assets/daniel-png/page-27.png";
import danielPage28 from "@/assets/daniel-png/page-28.png";
import danielPage29 from "@/assets/daniel-png/page-29.png";
import danielPage30 from "@/assets/daniel-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateDanielPngFirstPages(): string[] {
  const realPages = [
    danielPage01,
    danielPage02,
    danielPage03,
    danielPage04,
    danielPage05,
    danielPage06,
    danielPage07,
    danielPage08,
    danielPage09,
    danielPage10,
    danielPage11,
    danielPage12,
    danielPage13,
    danielPage14,
    danielPage15,
    danielPage16,
    danielPage17,
    danielPage18,
    danielPage19,
    danielPage20,
    danielPage21,
    danielPage22,
    danielPage23,
    danielPage24,
    danielPage25,
    danielPage26,
    danielPage27,
    danielPage28,
    danielPage29,
    danielPage30,
  ];

  return realPages.map((url) => pngPageStub(url));
}
