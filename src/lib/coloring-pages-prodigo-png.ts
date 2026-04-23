/**
 * Gerador de páginas PNG-backed para "O Filho Pródigo".
 *
 * 30 páginas usam PNGs line art reais (estilo Pixar).
 */

import fpPage01 from "@/assets/prodigo-png/page-01.png";
import fpPage02 from "@/assets/prodigo-png/page-02.png";
import fpPage03 from "@/assets/prodigo-png/page-03.png";
import fpPage04 from "@/assets/prodigo-png/page-04.png";
import fpPage05 from "@/assets/prodigo-png/page-05.png";
import fpPage06 from "@/assets/prodigo-png/page-06.png";
import fpPage07 from "@/assets/prodigo-png/page-07.png";
import fpPage08 from "@/assets/prodigo-png/page-08.png";
import fpPage09 from "@/assets/prodigo-png/page-09.png";
import fpPage10 from "@/assets/prodigo-png/page-10.png";
import fpPage11 from "@/assets/prodigo-png/page-11.png";
import fpPage12 from "@/assets/prodigo-png/page-12.png";
import fpPage13 from "@/assets/prodigo-png/page-13.png";
import fpPage14 from "@/assets/prodigo-png/page-14.png";
import fpPage15 from "@/assets/prodigo-png/page-15.png";
import fpPage16 from "@/assets/prodigo-png/page-16.png";
import fpPage17 from "@/assets/prodigo-png/page-17.png";
import fpPage18 from "@/assets/prodigo-png/page-18.png";
import fpPage19 from "@/assets/prodigo-png/page-19.png";
import fpPage20 from "@/assets/prodigo-png/page-20.png";
import fpPage21 from "@/assets/prodigo-png/page-21.png";
import fpPage22 from "@/assets/prodigo-png/page-22.png";
import fpPage23 from "@/assets/prodigo-png/page-23.png";
import fpPage24 from "@/assets/prodigo-png/page-24.png";
import fpPage25 from "@/assets/prodigo-png/page-25.png";
import fpPage26 from "@/assets/prodigo-png/page-26.png";
import fpPage27 from "@/assets/prodigo-png/page-27.png";
import fpPage28 from "@/assets/prodigo-png/page-28.png";
import fpPage29 from "@/assets/prodigo-png/page-29.png";
import fpPage30 from "@/assets/prodigo-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateProdigoPngFirstPages(): string[] {
  const realPages = [
    fpPage01,
    fpPage02,
    fpPage03,
    fpPage04,
    fpPage05,
    fpPage06,
    fpPage07,
    fpPage08,
    fpPage09,
    fpPage10,
    fpPage11,
    fpPage12,
    fpPage13,
    fpPage14,
    fpPage15,
    fpPage16,
    fpPage17,
    fpPage18,
    fpPage19,
    fpPage20,
    fpPage21,
    fpPage22,
    fpPage23,
    fpPage24,
    fpPage25,
    fpPage26,
    fpPage27,
    fpPage28,
    fpPage29,
    fpPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
