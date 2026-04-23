/**
 * Gerador de páginas PNG-backed para "Jesus acalma a tempestade".
 *
 * 30 páginas usam PNGs line art reais (estilo Pixar).
 */

import tpPage01 from "@/assets/tempestade-png/page-01.png";
import tpPage02 from "@/assets/tempestade-png/page-02.png";
import tpPage03 from "@/assets/tempestade-png/page-03.png";
import tpPage04 from "@/assets/tempestade-png/page-04.png";
import tpPage05 from "@/assets/tempestade-png/page-05.png";
import tpPage06 from "@/assets/tempestade-png/page-06.png";
import tpPage07 from "@/assets/tempestade-png/page-07.png";
import tpPage08 from "@/assets/tempestade-png/page-08.png";
import tpPage09 from "@/assets/tempestade-png/page-09.png";
import tpPage10 from "@/assets/tempestade-png/page-10.png";
import tpPage11 from "@/assets/tempestade-png/page-11.png";
import tpPage12 from "@/assets/tempestade-png/page-12.png";
import tpPage13 from "@/assets/tempestade-png/page-13.png";
import tpPage14 from "@/assets/tempestade-png/page-14.png";
import tpPage15 from "@/assets/tempestade-png/page-15.png";
import tpPage16 from "@/assets/tempestade-png/page-16.png";
import tpPage17 from "@/assets/tempestade-png/page-17.png";
import tpPage18 from "@/assets/tempestade-png/page-18.png";
import tpPage19 from "@/assets/tempestade-png/page-19.png";
import tpPage20 from "@/assets/tempestade-png/page-20.png";
import tpPage21 from "@/assets/tempestade-png/page-21.png";
import tpPage22 from "@/assets/tempestade-png/page-22.png";
import tpPage23 from "@/assets/tempestade-png/page-23.png";
import tpPage24 from "@/assets/tempestade-png/page-24.png";
import tpPage25 from "@/assets/tempestade-png/page-25.png";
import tpPage26 from "@/assets/tempestade-png/page-26.png";
import tpPage27 from "@/assets/tempestade-png/page-27.png";
import tpPage28 from "@/assets/tempestade-png/page-28.png";
import tpPage29 from "@/assets/tempestade-png/page-29.png";
import tpPage30 from "@/assets/tempestade-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateTempestadePngFirstPages(): string[] {
  const realPages = [
    tpPage01,
    tpPage02,
    tpPage03,
    tpPage04,
    tpPage05,
    tpPage06,
    tpPage07,
    tpPage08,
    tpPage09,
    tpPage10,
    tpPage11,
    tpPage12,
    tpPage13,
    tpPage14,
    tpPage15,
    tpPage16,
    tpPage17,
    tpPage18,
    tpPage19,
    tpPage20,
    tpPage21,
    tpPage22,
    tpPage23,
    tpPage24,
    tpPage25,
    tpPage26,
    tpPage27,
    tpPage28,
    tpPage29,
    tpPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
