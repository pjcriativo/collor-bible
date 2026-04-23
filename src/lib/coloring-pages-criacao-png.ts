/**
 * Gerador de páginas PNG-backed para "A Criação do Mundo".
 *
 * Todas as 30 páginas agora usam PNGs line art reais (estilo Pixar).
 */

import criacaoPage01 from "@/assets/criacao-png/page-01.png";
import criacaoPage02 from "@/assets/criacao-png/page-02.png";
import criacaoPage03 from "@/assets/criacao-png/page-03.png";
import criacaoPage04 from "@/assets/criacao-png/page-04.png";
import criacaoPage05 from "@/assets/criacao-png/page-05.png";
import criacaoPage06 from "@/assets/criacao-png/page-06.png";
import criacaoPage07 from "@/assets/criacao-png/page-07.png";
import criacaoPage08 from "@/assets/criacao-png/page-08.png";
import criacaoPage09 from "@/assets/criacao-png/page-09.png";
import criacaoPage10 from "@/assets/criacao-png/page-10.png";
import criacaoPage11 from "@/assets/criacao-png/page-11.png";
import criacaoPage12 from "@/assets/criacao-png/page-12.png";
import criacaoPage13 from "@/assets/criacao-png/page-13.png";
import criacaoPage14 from "@/assets/criacao-png/page-14.png";
import criacaoPage15 from "@/assets/criacao-png/page-15.png";
import criacaoPage16 from "@/assets/criacao-png/page-16.png";
import criacaoPage17 from "@/assets/criacao-png/page-17.png";
import criacaoPage18 from "@/assets/criacao-png/page-18.png";
import criacaoPage19 from "@/assets/criacao-png/page-19.png";
import criacaoPage20 from "@/assets/criacao-png/page-20.png";
import criacaoPage21 from "@/assets/criacao-png/page-21.png";
import criacaoPage22 from "@/assets/criacao-png/page-22.png";
import criacaoPage23 from "@/assets/criacao-png/page-23.png";
import criacaoPage24 from "@/assets/criacao-png/page-24.png";
import criacaoPage25 from "@/assets/criacao-png/page-25.png";
import criacaoPage26 from "@/assets/criacao-png/page-26.png";
import criacaoPage27 from "@/assets/criacao-png/page-27.png";
import criacaoPage28 from "@/assets/criacao-png/page-28.png";
import criacaoPage29 from "@/assets/criacao-png/page-29.png";
import criacaoPage30 from "@/assets/criacao-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateCriacaoPngFirstPages(): string[] {
  const realPages = [
    criacaoPage01,
    criacaoPage02,
    criacaoPage03,
    criacaoPage04,
    criacaoPage05,
    criacaoPage06,
    criacaoPage07,
    criacaoPage08,
    criacaoPage09,
    criacaoPage10,
    criacaoPage11,
    criacaoPage12,
    criacaoPage13,
    criacaoPage14,
    criacaoPage15,
    criacaoPage16,
    criacaoPage17,
    criacaoPage18,
    criacaoPage19,
    criacaoPage20,
    criacaoPage21,
    criacaoPage22,
    criacaoPage23,
    criacaoPage24,
    criacaoPage25,
    criacaoPage26,
    criacaoPage27,
    criacaoPage28,
    criacaoPage29,
    criacaoPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
