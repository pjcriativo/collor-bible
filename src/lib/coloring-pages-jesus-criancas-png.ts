/**
 * Gerador de páginas PNG-backed para "Jesus e as Crianças".
 *
 * 30 páginas usam PNGs line art reais (estilo Pixar).
 */

import jcPage01 from "@/assets/jesus-criancas-png/page-01.png";
import jcPage02 from "@/assets/jesus-criancas-png/page-02.png";
import jcPage03 from "@/assets/jesus-criancas-png/page-03.png";
import jcPage04 from "@/assets/jesus-criancas-png/page-04.png";
import jcPage05 from "@/assets/jesus-criancas-png/page-05.png";
import jcPage06 from "@/assets/jesus-criancas-png/page-06.png";
import jcPage07 from "@/assets/jesus-criancas-png/page-07.png";
import jcPage08 from "@/assets/jesus-criancas-png/page-08.png";
import jcPage09 from "@/assets/jesus-criancas-png/page-09.png";
import jcPage10 from "@/assets/jesus-criancas-png/page-10.png";
import jcPage11 from "@/assets/jesus-criancas-png/page-11.png";
import jcPage12 from "@/assets/jesus-criancas-png/page-12.png";
import jcPage13 from "@/assets/jesus-criancas-png/page-13.png";
import jcPage14 from "@/assets/jesus-criancas-png/page-14.png";
import jcPage15 from "@/assets/jesus-criancas-png/page-15.png";
import jcPage16 from "@/assets/jesus-criancas-png/page-16.png";
import jcPage17 from "@/assets/jesus-criancas-png/page-17.png";
import jcPage18 from "@/assets/jesus-criancas-png/page-18.png";
import jcPage19 from "@/assets/jesus-criancas-png/page-19.png";
import jcPage20 from "@/assets/jesus-criancas-png/page-20.png";
import jcPage21 from "@/assets/jesus-criancas-png/page-21.png";
import jcPage22 from "@/assets/jesus-criancas-png/page-22.png";
import jcPage23 from "@/assets/jesus-criancas-png/page-23.png";
import jcPage24 from "@/assets/jesus-criancas-png/page-24.png";
import jcPage25 from "@/assets/jesus-criancas-png/page-25.png";
import jcPage26 from "@/assets/jesus-criancas-png/page-26.png";
import jcPage27 from "@/assets/jesus-criancas-png/page-27.png";
import jcPage28 from "@/assets/jesus-criancas-png/page-28.png";
import jcPage29 from "@/assets/jesus-criancas-png/page-29.png";
import jcPage30 from "@/assets/jesus-criancas-png/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function generateJesusCriancasPngFirstPages(): string[] {
  const realPages = [
    jcPage01,
    jcPage02,
    jcPage03,
    jcPage04,
    jcPage05,
    jcPage06,
    jcPage07,
    jcPage08,
    jcPage09,
    jcPage10,
    jcPage11,
    jcPage12,
    jcPage13,
    jcPage14,
    jcPage15,
    jcPage16,
    jcPage17,
    jcPage18,
    jcPage19,
    jcPage20,
    jcPage21,
    jcPage22,
    jcPage23,
    jcPage24,
    jcPage25,
    jcPage26,
    jcPage27,
    jcPage28,
    jcPage29,
    jcPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
