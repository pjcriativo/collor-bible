/**
 * Gerador de páginas PNG-backed para "O Bom Samaritano".
 *
 * Mesmo padrão de `coloring-pages-davi-png.ts`: cada SVG-stub embute a PNG
 * line art real do usuário via `<image>` + atributo `data-png-url` para o
 * roteador detectar e usar o motor canvas (`<ColoringCanvasPng>`).
 *
 * Estado: 30 PNGs reais entregues. História completa.
 */

import samPage01 from "@/assets/bom-samaritano/page-01.png";
import samPage02 from "@/assets/bom-samaritano/page-02.png";
import samPage03 from "@/assets/bom-samaritano/page-03.png";
import samPage04 from "@/assets/bom-samaritano/page-04.png";
import samPage05 from "@/assets/bom-samaritano/page-05.png";
import samPage06 from "@/assets/bom-samaritano/page-06.png";
import samPage07 from "@/assets/bom-samaritano/page-07.png";
import samPage08 from "@/assets/bom-samaritano/page-08.png";
import samPage09 from "@/assets/bom-samaritano/page-09.png";
import samPage10 from "@/assets/bom-samaritano/page-10.png";
import samPage11 from "@/assets/bom-samaritano/page-11.png";
import samPage12 from "@/assets/bom-samaritano/page-12.png";
import samPage13 from "@/assets/bom-samaritano/page-13.png";
import samPage14 from "@/assets/bom-samaritano/page-14.png";
import samPage15 from "@/assets/bom-samaritano/page-15.png";
import samPage16 from "@/assets/bom-samaritano/page-16.png";
import samPage17 from "@/assets/bom-samaritano/page-17.png";
import samPage18 from "@/assets/bom-samaritano/page-18.png";
import samPage19 from "@/assets/bom-samaritano/page-19.png";
import samPage20 from "@/assets/bom-samaritano/page-20.png";
import samPage21 from "@/assets/bom-samaritano/page-21.png";
import samPage22 from "@/assets/bom-samaritano/page-22.png";
import samPage23 from "@/assets/bom-samaritano/page-23.png";
import samPage24 from "@/assets/bom-samaritano/page-24.png";
import samPage25 from "@/assets/bom-samaritano/page-25.png";
import samPage26 from "@/assets/bom-samaritano/page-26.png";
import samPage27 from "@/assets/bom-samaritano/page-27.png";
import samPage28 from "@/assets/bom-samaritano/page-28.png";
import samPage29 from "@/assets/bom-samaritano/page-29.png";
import samPage30 from "@/assets/bom-samaritano/page-30.png";

function pngPageStub(pngUrl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" data-png-url="${pngUrl}"><image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

/**
 * Exporta exatamente 30 SVGs para o slug "o-bom-samaritano".
 * Todas as páginas agora são PNGs reais.
 */
export function generateBomSamaritanoPngPages(): string[] {
  const realPages = [
    samPage01,
    samPage02,
    samPage03,
    samPage04,
    samPage05,
    samPage06,
    samPage07,
    samPage08,
    samPage09,
    samPage10,
    samPage11,
    samPage12,
    samPage13,
    samPage14,
    samPage15,
    samPage16,
    samPage17,
    samPage18,
    samPage19,
    samPage20,
    samPage21,
    samPage22,
    samPage23,
    samPage24,
    samPage25,
    samPage26,
    samPage27,
    samPage28,
    samPage29,
    samPage30,
  ];
  return realPages.map((url) => pngPageStub(url));
}
