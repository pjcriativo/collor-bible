/**
 * Gerador de páginas PNG-backed para "A Multiplicação dos Pães".
 *
 * 30 páginas usam PNGs line art reais (estilo Pixar).
 */

import mpPage01 from "@/assets/multiplicacao-paes-png/page-01.png";
import mpPage02 from "@/assets/multiplicacao-paes-png/page-02.png";
import mpPage03 from "@/assets/multiplicacao-paes-png/page-03.png";
import mpPage04 from "@/assets/multiplicacao-paes-png/page-04.png";
import mpPage05 from "@/assets/multiplicacao-paes-png/page-05.png";
import mpPage06 from "@/assets/multiplicacao-paes-png/page-06.png";
import mpPage07 from "@/assets/multiplicacao-paes-png/page-07.png";
import mpPage08 from "@/assets/multiplicacao-paes-png/page-08.png";
import mpPage09 from "@/assets/multiplicacao-paes-png/page-09.png";
import mpPage10 from "@/assets/multiplicacao-paes-png/page-10.png";
import mpPage11 from "@/assets/multiplicacao-paes-png/page-11.png";
import mpPage12 from "@/assets/multiplicacao-paes-png/page-12.png";
import mpPage13 from "@/assets/multiplicacao-paes-png/page-13.png";
import mpPage14 from "@/assets/multiplicacao-paes-png/page-14.png";
import mpPage15 from "@/assets/multiplicacao-paes-png/page-15.png";
import mpPage16 from "@/assets/multiplicacao-paes-png/page-16.png";
import mpPage17 from "@/assets/multiplicacao-paes-png/page-17.png";
import mpPage18 from "@/assets/multiplicacao-paes-png/page-18.png";
import mpPage19 from "@/assets/multiplicacao-paes-png/page-19.png";
import mpPage20 from "@/assets/multiplicacao-paes-png/page-20.png";
import mpPage21 from "@/assets/multiplicacao-paes-png/page-21.png";
import mpPage22 from "@/assets/multiplicacao-paes-png/page-22.png";
import mpPage23 from "@/assets/multiplicacao-paes-png/page-23.png";
import mpPage24 from "@/assets/multiplicacao-paes-png/page-24.png";
import mpPage25 from "@/assets/multiplicacao-paes-png/page-25.png";
import mpPage26 from "@/assets/multiplicacao-paes-png/page-26.png";
import mpPage27 from "@/assets/multiplicacao-paes-png/page-27.png";
import mpPage28 from "@/assets/multiplicacao-paes-png/page-28.png";
import mpPage29 from "@/assets/multiplicacao-paes-png/page-29.png";
import mpPage30 from "@/assets/multiplicacao-paes-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateMultiplicacaoPaesPngFirstPages(): string[] {
  const realPages = [
    mpPage01,
    mpPage02,
    mpPage03,
    mpPage04,
    mpPage05,
    mpPage06,
    mpPage07,
    mpPage08,
    mpPage09,
    mpPage10,
    mpPage11,
    mpPage12,
    mpPage13,
    mpPage14,
    mpPage15,
    mpPage16,
    mpPage17,
    mpPage18,
    mpPage19,
    mpPage20,
    mpPage21,
    mpPage22,
    mpPage23,
    mpPage24,
    mpPage25,
    mpPage26,
    mpPage27,
    mpPage28,
    mpPage29,
    mpPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
