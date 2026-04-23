/**
 * Gerador de páginas PNG-backed para "Ester, a Rainha Corajosa".
 *
 * As primeiras 20 páginas usam PNGs line art reais (estilo Pixar).
 * As demais continuam vindo do gerador procedural existente.
 */

import esterPage01 from "@/assets/ester-png/page-01.png";
import esterPage02 from "@/assets/ester-png/page-02.png";
import esterPage03 from "@/assets/ester-png/page-03.png";
import esterPage04 from "@/assets/ester-png/page-04.png";
import esterPage05 from "@/assets/ester-png/page-05.png";
import esterPage06 from "@/assets/ester-png/page-06.png";
import esterPage07 from "@/assets/ester-png/page-07.png";
import esterPage08 from "@/assets/ester-png/page-08.png";
import esterPage09 from "@/assets/ester-png/page-09.png";
import esterPage10 from "@/assets/ester-png/page-10.png";
import esterPage11 from "@/assets/ester-png/page-11.png";
import esterPage12 from "@/assets/ester-png/page-12.png";
import esterPage13 from "@/assets/ester-png/page-13.png";
import esterPage14 from "@/assets/ester-png/page-14.png";
import esterPage15 from "@/assets/ester-png/page-15.png";
import esterPage16 from "@/assets/ester-png/page-16.png";
import esterPage17 from "@/assets/ester-png/page-17.png";
import esterPage18 from "@/assets/ester-png/page-18.png";
import esterPage19 from "@/assets/ester-png/page-19.png";
import esterPage20 from "@/assets/ester-png/page-20.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateEsterPngFirstPages(): string[] {
  const realPages = [
    esterPage01,
    esterPage02,
    esterPage03,
    esterPage04,
    esterPage05,
    esterPage06,
    esterPage07,
    esterPage08,
    esterPage09,
    esterPage10,
    esterPage11,
    esterPage12,
    esterPage13,
    esterPage14,
    esterPage15,
    esterPage16,
    esterPage17,
    esterPage18,
    esterPage19,
    esterPage20,
  ];
  return realPages.map((url) => pngPageStub(url));
}
