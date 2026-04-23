/**
 * Gerador de páginas PNG-backed para "O Nascimento de Jesus".
 *
 * As 30 páginas usam PNGs line art reais (estilo Pixar).
 */

import nascimentoPage01 from "@/assets/nascimento-png/page-01.png";
import nascimentoPage02 from "@/assets/nascimento-png/page-02.png";
import nascimentoPage03 from "@/assets/nascimento-png/page-03.png";
import nascimentoPage04 from "@/assets/nascimento-png/page-04.png";
import nascimentoPage05 from "@/assets/nascimento-png/page-05.png";
import nascimentoPage06 from "@/assets/nascimento-png/page-06.png";
import nascimentoPage07 from "@/assets/nascimento-png/page-07.png";
import nascimentoPage08 from "@/assets/nascimento-png/page-08.png";
import nascimentoPage09 from "@/assets/nascimento-png/page-09.png";
import nascimentoPage10 from "@/assets/nascimento-png/page-10.png";
import nascimentoPage11 from "@/assets/nascimento-png/page-11.png";
import nascimentoPage12 from "@/assets/nascimento-png/page-12.png";
import nascimentoPage13 from "@/assets/nascimento-png/page-13.png";
import nascimentoPage14 from "@/assets/nascimento-png/page-14.png";
import nascimentoPage15 from "@/assets/nascimento-png/page-15.png";
import nascimentoPage16 from "@/assets/nascimento-png/page-16.png";
import nascimentoPage17 from "@/assets/nascimento-png/page-17.png";
import nascimentoPage18 from "@/assets/nascimento-png/page-18.png";
import nascimentoPage19 from "@/assets/nascimento-png/page-19.png";
import nascimentoPage20 from "@/assets/nascimento-png/page-20.png";
import nascimentoPage21 from "@/assets/nascimento-png/page-21.png";
import nascimentoPage22 from "@/assets/nascimento-png/page-22.png";
import nascimentoPage23 from "@/assets/nascimento-png/page-23.png";
import nascimentoPage24 from "@/assets/nascimento-png/page-24.png";
import nascimentoPage25 from "@/assets/nascimento-png/page-25.png";
import nascimentoPage26 from "@/assets/nascimento-png/page-26.png";
import nascimentoPage27 from "@/assets/nascimento-png/page-27.png";
import nascimentoPage28 from "@/assets/nascimento-png/page-28.png";
import nascimentoPage29 from "@/assets/nascimento-png/page-29.png";
import nascimentoPage30 from "@/assets/nascimento-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateNascimentoPngFirstPages(): string[] {
  const realPages = [
    nascimentoPage01,
    nascimentoPage02,
    nascimentoPage03,
    nascimentoPage04,
    nascimentoPage05,
    nascimentoPage06,
    nascimentoPage07,
    nascimentoPage08,
    nascimentoPage09,
    nascimentoPage10,
    nascimentoPage11,
    nascimentoPage12,
    nascimentoPage13,
    nascimentoPage14,
    nascimentoPage15,
    nascimentoPage16,
    nascimentoPage17,
    nascimentoPage18,
    nascimentoPage19,
    nascimentoPage20,
    nascimentoPage21,
    nascimentoPage22,
    nascimentoPage23,
    nascimentoPage24,
    nascimentoPage25,
    nascimentoPage26,
    nascimentoPage27,
    nascimentoPage28,
    nascimentoPage29,
    nascimentoPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
