/**
 * Gerador de páginas PNG-backed para "A Ovelha Perdida".
 *
 * 30 páginas usam PNGs line art reais (estilo Pixar).
 */

import opPage01 from "@/assets/ovelha-perdida-png/page-01.png";
import opPage02 from "@/assets/ovelha-perdida-png/page-02.png";
import opPage03 from "@/assets/ovelha-perdida-png/page-03.png";
import opPage04 from "@/assets/ovelha-perdida-png/page-04.png";
import opPage05 from "@/assets/ovelha-perdida-png/page-05.png";
import opPage06 from "@/assets/ovelha-perdida-png/page-06.png";
import opPage07 from "@/assets/ovelha-perdida-png/page-07.png";
import opPage08 from "@/assets/ovelha-perdida-png/page-08.png";
import opPage09 from "@/assets/ovelha-perdida-png/page-09.png";
import opPage10 from "@/assets/ovelha-perdida-png/page-10.png";
import opPage11 from "@/assets/ovelha-perdida-png/page-11.png";
import opPage12 from "@/assets/ovelha-perdida-png/page-12.png";
import opPage13 from "@/assets/ovelha-perdida-png/page-13.png";
import opPage14 from "@/assets/ovelha-perdida-png/page-14.png";
import opPage15 from "@/assets/ovelha-perdida-png/page-15.png";
import opPage16 from "@/assets/ovelha-perdida-png/page-16.png";
import opPage17 from "@/assets/ovelha-perdida-png/page-17.png";
import opPage18 from "@/assets/ovelha-perdida-png/page-18.png";
import opPage19 from "@/assets/ovelha-perdida-png/page-19.png";
import opPage20 from "@/assets/ovelha-perdida-png/page-20.png";
import opPage21 from "@/assets/ovelha-perdida-png/page-21.png";
import opPage22 from "@/assets/ovelha-perdida-png/page-22.png";
import opPage23 from "@/assets/ovelha-perdida-png/page-23.png";
import opPage24 from "@/assets/ovelha-perdida-png/page-24.png";
import opPage25 from "@/assets/ovelha-perdida-png/page-25.png";
import opPage26 from "@/assets/ovelha-perdida-png/page-26.png";
import opPage27 from "@/assets/ovelha-perdida-png/page-27.png";
import opPage28 from "@/assets/ovelha-perdida-png/page-28.png";
import opPage29 from "@/assets/ovelha-perdida-png/page-29.png";
import opPage30 from "@/assets/ovelha-perdida-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateOvelhaPerdidaPngFirstPages(): string[] {
  const realPages = [
    opPage01,
    opPage02,
    opPage03,
    opPage04,
    opPage05,
    opPage06,
    opPage07,
    opPage08,
    opPage09,
    opPage10,
    opPage11,
    opPage12,
    opPage13,
    opPage14,
    opPage15,
    opPage16,
    opPage17,
    opPage18,
    opPage19,
    opPage20,
    opPage21,
    opPage22,
    opPage23,
    opPage24,
    opPage25,
    opPage26,
    opPage27,
    opPage28,
    opPage29,
    opPage30,
  ];

  return realPages.map((url) => pngPageStub(url));
}
