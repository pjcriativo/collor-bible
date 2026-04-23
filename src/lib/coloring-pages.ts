/**
 * Páginas de colorir em SVG line art.
 * Cada região pintável tem id="fill-..." para o engine de pintura mudar `fill` ao toque.
 *
 * Geramos proceduralmente 30 páginas por história usando primitivas reutilizáveis.
 * Exceção: "davi-e-golias" usa PNG line art Pixar real, vetorizada no client.
 */

import { generateDaviGoliasPngPages } from "./coloring-pages-davi-png";
import { generateBomSamaritanoPngPages } from "./coloring-pages-bom-samaritano-png";
import { generateNoeArcaPngPages } from "./coloring-pages-noe-png";
import { generateJonasPngFirstTenPages } from "./coloring-pages-jonas-png";
import { generateMoisesPngFirstPages } from "./coloring-pages-moises-png";
import { generateDanielPngFirstPages } from "./coloring-pages-daniel-png";
import { generateCriacaoPngFirstPages } from "./coloring-pages-criacao-png";
import { generateEsterPngFirstPages } from "./coloring-pages-ester-png";
import { generateNascimentoPngFirstPages } from "./coloring-pages-nascimento-png";
import { generateJesusCriancasPngFirstPages } from "./coloring-pages-jesus-criancas-png";
import { generateMultiplicacaoPaesPngFirstPages } from "./coloring-pages-multiplicacao-paes-png";
import { generateTempestadePngFirstPages } from "./coloring-pages-tempestade-png";
import { generateProdigoPngFirstPages } from "./coloring-pages-prodigo-png";
import { generateOvelhaPerdidaPngFirstPages } from "./coloring-pages-ovelha-perdida-png";

const STROKE = "#3D2E22";
const REGION_OVERLAP = 28;

/**
 * "Premium upgrade" sem custo de IA:
 *  - <defs> com filtro de drop-shadow suave aplicado a todas as regiões pintáveis
 *    → dá sensação de profundidade tipo livro infantil 3D / Pixar.
 *  - Gradiente sutil branco→creme no preenchimento default (regiões ainda não
 *    pintadas) → quebra a chapadice de "papel branco" e parece pintura à mão.
 *  - Stroke mais escuro (#3D2E22) e levemente mais grosso (3.5) com cantos round
 *    → contornos "encorpados" estilo cartoon premium.
 *  - paint-order: stroke fill → o traço fica POR FORA do fill, então a pintura
 *    da criança nunca "morde" o contorno — visual mais limpo e profissional.
 *
 * IMPORTANTE: nada disso adiciona elementos com `id="fill-..."`, então o motor
 * de progresso (`countFillableRegions`) e todos os testes continuam idênticos.
 * O filtro/gradiente moram em <defs> e são aplicados via <style> interno por
 * seletor de atributo — zero impacto no contrato do engine de pintura.
 */
const PREMIUM_DEFS = `
  <defs>
    <filter id="rk-soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
      <feOffset dx="0" dy="1.5" result="off" />
      <feComponentTransfer><feFuncA type="linear" slope="0.28" /></feComponentTransfer>
      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <linearGradient id="rk-paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#FBF5EC" />
    </linearGradient>
    <radialGradient id="rk-vignette" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.06" />
    </radialGradient>
    <style>
      svg [id^="fill-"] {
        paint-order: stroke fill;
        filter: url(#rk-soft-shadow);
      }
      svg [id^="fill-"][fill="white"],
      svg [id^="fill-"][fill="#FFFFFF"],
      svg [id^="fill-"][fill="#ffffff"] {
        fill: url(#rk-paper);
      }
    </style>
  </defs>
  <rect x="0" y="0" width="600" height="600" fill="url(#rk-paper)" pointer-events="none" />
`;

const PREMIUM_VIGNETTE = `<rect x="0" y="0" width="600" height="600" fill="url(#rk-vignette)" pointer-events="none" />`;

const baseSvg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" stroke="${STROKE}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" fill="white">${PREMIUM_DEFS}${inner}${PREMIUM_VIGNETTE}</svg>`;

// ============= Primitivas reutilizáveis =============
// Todas recebem um prefixo de id único para que cada cena tenha IDs distintos.

const sky = (id: string, h = 380) =>
  `<rect id="fill-${id}" x="0" y="0" width="600" height="${Math.min(600, h + REGION_OVERLAP)}" />`;

const ground = (id: string, y = 380) =>
  `<path id="fill-${id}" d="M0 ${y} L600 ${y} L600 600 L0 600 Z" />`;

const sea = (id: string, y = 380) =>
  `<path id="fill-${id}" d="M0 ${y} Q150 ${y - 20} 300 ${y} T600 ${y} L600 600 L0 600 Z" />`;

const sun = (id: string, cx = 500, cy = 120, r = 50) =>
  `<circle id="fill-${id}" cx="${cx}" cy="${cy}" r="${r}" />`;

const moon = (id: string, cx = 480, cy = 120, r = 40) =>
  `<circle id="fill-${id}" cx="${cx}" cy="${cy}" r="${r}" />`;

const cloud = (id: string, cx: number, cy: number, scale = 1) => {
  const w = 90 * scale;
  const h = 35 * scale;
  return `<path id="fill-${id}" d="M${cx - w} ${cy} q-${15 * scale} 0 -${15 * scale} ${h * 0.6} q-${12 * scale} 0 -${12 * scale} ${h * 0.6} q0 ${h * 0.6} ${12 * scale} ${h * 0.6} h${w * 2} q${12 * scale} 0 ${12 * scale} -${h * 0.6} q0 -${h * 0.6} -${12 * scale} -${h * 0.6} q0 -${h * 0.6} -${15 * scale} -${h * 0.6} q-${10 * scale} -${h * 0.5} -${20 * scale} -${h * 0.5} q-${10 * scale} 0 -${20 * scale} ${h * 0.5} z" />`;
};

const star = (id: string, cx: number, cy: number, r = 14) => {
  // 5-point star
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)},${(cy + Math.sin(ang) * rr).toFixed(1)}`);
  }
  return `<polygon id="fill-${id}" points="${pts.join(" ")}" />`;
};

const dot = (id: string, cx: number, cy: number, r = 6) =>
  `<circle id="fill-${id}" cx="${cx}" cy="${cy}" r="${r}" />`;

const tree = (id: string, x: number, y: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-leaves" d="M${x} ${y - 80 * s} q-${50 * s} ${10 * s} -${50 * s} ${50 * s} q0 ${30 * s} ${30 * s} ${30 * s} h${40 * s} q${30 * s} 0 ${30 * s} -${30 * s} q0 -${40 * s} -${50 * s} -${50 * s} z" />
    <rect id="fill-${id}-trunk" x="${x - 8 * s}" y="${y}" width="${16 * s}" height="${40 * s}" />
  `;
};

const palm = (id: string, x: number, y: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-trunk" d="M${x - 6 * s} ${y} q-${4 * s} -${50 * s} ${6 * s} -${100 * s} q${10 * s} ${50 * s} ${6 * s} ${100 * s} z" />
    <path id="fill-${id}-frond1" d="M${x} ${y - 100 * s} q-${60 * s} -${10 * s} -${80 * s} ${20 * s} q${30 * s} -${30 * s} ${80 * s} -${10 * s} z" />
    <path id="fill-${id}-frond2" d="M${x} ${y - 100 * s} q${60 * s} -${10 * s} ${80 * s} ${20 * s} q-${30 * s} -${30 * s} -${80 * s} -${10 * s} z" />
    <path id="fill-${id}-frond3" d="M${x} ${y - 100 * s} q-${10 * s} -${50 * s} ${30 * s} -${70 * s} q-${10 * s} ${40 * s} -${30 * s} ${70 * s} z" />
    <circle id="fill-${id}-coco" cx="${x + 4 * s}" cy="${y - 95 * s}" r="${6 * s}" />
  `;
};

const flower = (id: string, x: number, y: number, scale = 1) => {
  const s = scale;
  return `
    <circle id="fill-${id}-p1" cx="${x - 14 * s}" cy="${y}" r="${10 * s}" />
    <circle id="fill-${id}-p2" cx="${x + 14 * s}" cy="${y}" r="${10 * s}" />
    <circle id="fill-${id}-p3" cx="${x}" cy="${y - 14 * s}" r="${10 * s}" />
    <circle id="fill-${id}-p4" cx="${x}" cy="${y + 14 * s}" r="${10 * s}" />
    <circle id="fill-${id}-center" cx="${x}" cy="${y}" r="${7 * s}" />
    <rect id="fill-${id}-stem" x="${x - 2 * s}" y="${y + 24 * s}" width="${4 * s}" height="${40 * s}" />
  `;
};

const tulip = (id: string, x: number, y: number) => `
  <path id="fill-${id}-bud" d="M${x - 14} ${y} q0 -22 14 -28 q14 6 14 28 q-7 -10 -14 -10 q-7 0 -14 10 z" />
  <rect id="fill-${id}-stem" x="${x - 2}" y="${y}" width="4" height="50" />
  <path id="fill-${id}-leaf" d="M${x + 2} ${y + 30} q20 -10 30 10 q-20 0 -30 -10 z" />
`;

const mountain = (id: string, x: number, y: number, w = 200, h = 120) => `
  <path id="fill-${id}" d="M${x} ${y} L${x + w / 2} ${y - h} L${x + w} ${y} Z" />
`;

const hill = (id: string, x: number, y: number, w = 250, h = 60) => `
  <path id="fill-${id}" d="M${x} ${y} q${w / 2} -${h * 2} ${w} 0 z" />
`;

const fish = (id: string, x: number, y: number, dir: 1 | -1 = 1, scale = 1) => {
  const sx = scale * dir;
  return `
    <path id="fill-${id}-body" d="M${x} ${y} q${20 * sx} -${15 * scale} ${50 * sx} 0 q${-30 * sx} ${15 * scale} ${-50 * sx} 0 z" />
    <path id="fill-${id}-tail" d="M${x} ${y} l${-15 * sx} -${10 * scale} l0 ${20 * scale} z" />
    <circle id="fill-${id}-eye" cx="${x + 35 * sx}" cy="${y - 2 * scale}" r="${2.5 * scale}" />
  `;
};

const bird = (id: string, x: number, y: number) => `
  <path id="fill-${id}" d="M${x} ${y} q-15 -10 -25 0 q10 0 12 5 q3 -5 13 -5 q10 0 13 5 q2 -5 12 -5 q-10 -10 -25 0 z" />
`;

const heart = (id: string, x: number, y: number, scale = 1) => {
  const s = scale;
  return `<path id="fill-${id}" d="M${x} ${y + 10 * s} q-${15 * s} -${20 * s} -${25 * s} -${5 * s} q-${10 * s} ${15 * s} ${25 * s} ${30 * s} q${35 * s} -${15 * s} ${25 * s} -${30 * s} q-${10 * s} -${15 * s} -${25 * s} ${5 * s} z" />`;
};

const crown = (id: string, x: number, y: number) => `
  <path id="fill-${id}" d="M${x - 40} ${y} L${x - 40} ${y - 30} L${x - 20} ${y - 10} L${x} ${y - 40} L${x + 20} ${y - 10} L${x + 40} ${y - 30} L${x + 40} ${y} Z" />
`;

const tablet = (id: string, x: number, y: number) => `
  <rect id="fill-${id}-l" x="${x - 50}" y="${y}" width="40" height="80" rx="20" />
  <rect id="fill-${id}-r" x="${x + 10}" y="${y}" width="40" height="80" rx="20" />
`;

const scroll = (id: string, x: number, y: number) => `
  <rect id="fill-${id}-paper" x="${x - 40}" y="${y - 8}" width="80" height="40" />
  <circle id="fill-${id}-l" cx="${x - 40}" cy="${y + 12}" r="14" />
  <circle id="fill-${id}-r" cx="${x + 40}" cy="${y + 12}" r="14" />
`;

const ark = (id: string, cx: number, cy: number) => `
  <path id="fill-${id}-hull" d="M${cx - 180} ${cy} Q${cx} ${cy + 100} ${cx + 180} ${cy} L${cx + 160} ${cy + 50} Q${cx} ${cy + 130} ${cx - 160} ${cy + 50} Z" />
  <rect id="fill-${id}-house" x="${cx - 80}" y="${cy - 90}" width="160" height="100" rx="8" />
  <path id="fill-${id}-roof" d="M${cx - 100} ${cy - 90} L${cx} ${cy - 150} L${cx + 100} ${cy - 90} Z" />
  <rect id="fill-${id}-w1" x="${cx - 55}" y="${cy - 60}" width="30" height="30" rx="4" />
  <rect id="fill-${id}-w2" x="${cx + 25}" y="${cy - 60}" width="30" height="30" rx="4" />
  <rect id="fill-${id}-door" x="${cx - 15}" y="${cy - 30}" width="30" height="40" rx="4" />
`;

const rainbow = (id: string, cx: number, cy: number) => `
  <path id="fill-${id}-1" d="M${cx - 250} ${cy} q250 -260 500 0 l-30 0 q-220 -240 -440 0 z" />
  <path id="fill-${id}-2" d="M${cx - 220} ${cy} q220 -230 440 0 l-30 0 q-190 -210 -380 0 z" />
  <path id="fill-${id}-3" d="M${cx - 190} ${cy} q190 -200 380 0 l-30 0 q-160 -180 -320 0 z" />
`;

const tent = (id: string, cx: number, cy: number) => `
  <path id="fill-${id}-tent" d="M${cx - 70} ${cy} L${cx} ${cy - 90} L${cx + 70} ${cy} Z" />
  <path id="fill-${id}-door" d="M${cx} ${cy} L${cx - 12} ${cy - 50} L${cx + 12} ${cy - 50} Z" />
`;

const house = (id: string, cx: number, cy: number) => `
  <rect id="fill-${id}-wall" x="${cx - 60}" y="${cy - 60}" width="120" height="80" />
  <path id="fill-${id}-roof" d="M${cx - 75} ${cy - 60} L${cx} ${cy - 110} L${cx + 75} ${cy - 60} Z" />
  <rect id="fill-${id}-door" x="${cx - 12}" y="${cy - 30}" width="24" height="50" />
  <rect id="fill-${id}-w" x="${cx + 18}" y="${cy - 50}" width="22" height="22" />
`;

const stable = (id: string, cx: number, cy: number) => `
  <path id="fill-${id}-roof" d="M${cx - 130} ${cy - 60} L${cx} ${cy - 160} L${cx + 130} ${cy - 60} Z" />
  <rect id="fill-${id}-wall" x="${cx - 110}" y="${cy - 60}" width="220" height="120" />
  <rect id="fill-${id}-manger" x="${cx - 35}" y="${cy + 10}" width="70" height="40" rx="6" />
`;

const person = (id: string, cx: number, cy: number, robe = "robe") => `
  <circle id="fill-${id}-head" cx="${cx}" cy="${cy - 60}" r="22" />
  <path id="fill-${id}-${robe}" d="M${cx - 35} ${cy + 60} L${cx - 28} ${cy - 35} q${28} -${20} ${56} 0 L${cx + 35} ${cy + 60} Z" />
  <circle id="fill-${id}-halo" cx="${cx}" cy="${cy - 70}" r="30" fill="white" stroke-dasharray="4 4" />
`;

const child = (id: string, cx: number, cy: number) => `
  <circle id="fill-${id}-head" cx="${cx}" cy="${cy - 30}" r="16" />
  <path id="fill-${id}-body" d="M${cx - 18} ${cy + 30} L${cx - 14} ${cy - 14} q${14} -${10} ${28} 0 L${cx + 18} ${cy + 30} Z" />
`;

const lion = (id: string, cx: number, cy: number) => `
  <circle id="fill-${id}-mane" cx="${cx}" cy="${cy}" r="40" />
  <circle id="fill-${id}-face" cx="${cx}" cy="${cy}" r="26" />
  <circle id="fill-${id}-eye1" cx="${cx - 9}" cy="${cy - 4}" r="3" />
  <circle id="fill-${id}-eye2" cx="${cx + 9}" cy="${cy - 4}" r="3" />
  <path id="fill-${id}-nose" d="M${cx - 5} ${cy + 6} L${cx + 5} ${cy + 6} L${cx} ${cy + 12} Z" />
`;

const sheep = (id: string, cx: number, cy: number) => `
  <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="34" ry="22" />
  <circle id="fill-${id}-head" cx="${cx - 32}" cy="${cy - 4}" r="12" />
  <rect id="fill-${id}-l1" x="${cx - 18}" y="${cy + 18}" width="6" height="14" />
  <rect id="fill-${id}-l2" x="${cx + 12}" y="${cy + 18}" width="6" height="14" />
`;

const dove = (id: string, cx: number, cy: number) => `
  <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="22" ry="14" />
  <circle id="fill-${id}-head" cx="${cx + 18}" cy="${cy - 8}" r="9" />
  <path id="fill-${id}-wing" d="M${cx} ${cy - 6} q-15 -20 -28 -4 q15 0 28 14 z" />
  <path id="fill-${id}-tail" d="M${cx - 22} ${cy} l-18 -4 l4 12 z" />
`;

const camel = (id: string, cx: number, cy: number) => `
  <path id="fill-${id}-body" d="M${cx - 50} ${cy} q10 -30 30 -30 q5 -20 15 0 q5 -20 15 0 q10 0 20 30 z" />
  <circle id="fill-${id}-head" cx="${cx + 50}" cy="${cy - 30}" r="10" />
  <rect id="fill-${id}-neck" x="${cx + 40}" y="${cy - 30}" width="8" height="30" />
  <rect id="fill-${id}-l1" x="${cx - 40}" y="${cy}" width="6" height="30" />
  <rect id="fill-${id}-l2" x="${cx + 30}" y="${cy}" width="6" height="30" />
`;

const fishBig = (id: string, cx: number, cy: number) => `
  <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="80" ry="40" />
  <path id="fill-${id}-tail" d="M${cx - 80} ${cy} l-30 -20 l0 40 z" />
  <circle id="fill-${id}-eye" cx="${cx + 50}" cy="${cy - 8}" r="4" />
  <path id="fill-${id}-fin" d="M${cx} ${cy - 38} q-10 -20 -25 -8 q15 0 25 8 z" />
`;

const whale = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="${180 * s}" ry="${90 * s}" />
    <path id="fill-${id}-tail" d="M${cx - 180 * s} ${cy - 50 * s} Q${cx - 230 * s} ${cy - 70 * s} ${cx - 250 * s} ${cy - 110 * s} Q${cx - 220 * s} ${cy - 80 * s} ${cx - 180 * s} ${cy - 70 * s} Z" />
    <path id="fill-${id}-belly" d="M${cx - 120 * s} ${cy + 30 * s} Q${cx} ${cy + 110 * s} ${cx + 120 * s} ${cy + 30 * s} Q${cx} ${cy + 80 * s} ${cx - 120 * s} ${cy + 30 * s} Z" />
    <circle id="fill-${id}-eye" cx="${cx + 110 * s}" cy="${cy - 20 * s}" r="${10 * s}" />
    <path id="fill-${id}-fin" d="M${cx + 30 * s} ${cy + 80 * s} q${20 * s} ${20 * s} ${50 * s} 0 q-${25 * s} -${10 * s} -${50 * s} 0 z" />
    <path id="fill-${id}-spout" d="M${cx} ${cy - 110 * s} q-${10 * s} -${40 * s} 0 -${80 * s} q${10 * s} ${40 * s} 0 ${80 * s} z" />
  `;
};

const giraffe = (id: string, cx: number, cy: number) => `
  <rect id="fill-${id}-neck" x="${cx - 10}" y="${cy - 80}" width="20" height="80" />
  <circle id="fill-${id}-head" cx="${cx}" cy="${cy - 90}" r="16" />
  <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy + 20}" rx="40" ry="20" />
  <rect id="fill-${id}-l1" x="${cx - 30}" y="${cy + 30}" width="6" height="30" />
  <rect id="fill-${id}-l2" x="${cx + 24}" y="${cy + 30}" width="6" height="30" />
`;

const elephant = (id: string, cx: number, cy: number) => `
  <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="50" ry="32" />
  <circle id="fill-${id}-head" cx="${cx + 50}" cy="${cy - 10}" r="22" />
  <path id="fill-${id}-trunk" d="M${cx + 70} ${cy - 5} q15 20 5 40 q-5 -15 -15 -25 z" />
  <path id="fill-${id}-ear" d="M${cx + 38} ${cy - 25} q-15 -10 -10 10 q5 -3 10 -10 z" />
  <rect id="fill-${id}-l1" x="${cx - 30}" y="${cy + 30}" width="10" height="22" />
  <rect id="fill-${id}-l2" x="${cx + 12}" y="${cy + 30}" width="10" height="22" />
`;

const grass = (id: string, x: number, y: number) => `
  <path id="fill-${id}" d="M${x} ${y} q5 -20 10 0 q5 -25 10 0 q5 -20 10 0 z" />
`;

const cross = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <rect id="fill-${id}-v" x="${cx - 8 * s}" y="${cy - 50 * s}" width="${16 * s}" height="${100 * s}" />
    <rect id="fill-${id}-h" x="${cx - 30 * s}" y="${cy - 20 * s}" width="${60 * s}" height="${16 * s}" />
  `;
};

const bread = (id: string, cx: number, cy: number) => `
  <ellipse id="fill-${id}-loaf" cx="${cx}" cy="${cy}" rx="28" ry="18" />
  <path id="fill-${id}-line" d="M${cx - 18} ${cy - 4} q18 -6 36 0" fill="none" />
`;

const basket = (id: string, cx: number, cy: number) => `
  <path id="fill-${id}-body" d="M${cx - 50} ${cy} L${cx - 40} ${cy + 50} L${cx + 40} ${cy + 50} L${cx + 50} ${cy} Z" />
  <path id="fill-${id}-handle" d="M${cx - 40} ${cy} q40 -50 80 0" fill="none" />
`;

const stone = (id: string, cx: number, cy: number, r = 14) =>
  `<ellipse id="fill-${id}" cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.7}" />`;

const wave = (id: string, x: number, y: number, w = 200, h = 80, dir: 1 | -1 = 1) => {
  const sign = dir;
  return `<path id="fill-${id}" d="M${x} ${y} Q${x + w / 2} ${y - h * sign} ${x + w} ${y} L${x + w - 30} ${y} Q${x + w / 2} ${y - (h - 20) * sign} ${x + 30} ${y} Z" />`;
};

const splash = (id: string, cx: number, cy: number) => `
  <circle id="fill-${id}-d1" cx="${cx - 20}" cy="${cy - 10}" r="4" />
  <circle id="fill-${id}-d2" cx="${cx + 18}" cy="${cy - 14}" r="5" />
  <circle id="fill-${id}-d3" cx="${cx + 2}" cy="${cy - 24}" r="6" />
`;

const lampStand = (id: string, cx: number, cy: number) => `
  <rect id="fill-${id}-base" x="${cx - 24}" y="${cy + 20}" width="48" height="10" />
  <rect id="fill-${id}-stem" x="${cx - 4}" y="${cy - 30}" width="8" height="50" />
  <path id="fill-${id}-flame" d="M${cx} ${cy - 30} q-8 -10 0 -25 q8 15 0 25 z" />
`;

const wellShape = (id: string, cx: number, cy: number) => `
  <rect id="fill-${id}-wall" x="${cx - 40}" y="${cy}" width="80" height="40" rx="4" />
  <rect id="fill-${id}-water" x="${cx - 32}" y="${cy + 6}" width="64" height="8" />
  <rect id="fill-${id}-pole1" x="${cx - 36}" y="${cy - 50}" width="6" height="55" />
  <rect id="fill-${id}-pole2" x="${cx + 30}" y="${cy - 50}" width="6" height="55" />
  <rect id="fill-${id}-roof" x="${cx - 50}" y="${cy - 60}" width="100" height="14" />
`;

// ============= Geração procedural =============

type SceneFn = (i: number) => string;

/** Gera array de N páginas aplicando uma lista de variações */
function generatePages(scenes: SceneFn[], count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const fn = scenes[i % scenes.length];
    out.push(fn(i));
  }
  return out;
}

type AntigoStorySlug =
  | "noe-e-a-arca"
  | "davi-e-golias"
  | "jonas-e-a-baleia"
  | "moises-e-o-mar-vermelho"
  | "daniel-na-cova-dos-leoes";

type AntigoSceneConfig = {
  slug: AntigoStorySlug;
  horizon: "sea" | "ground" | "sand" | "cave";
  hero: (id: string, variant: number) => string;
  sidekick: (id: string, variant: number) => string;
  symbol: (id: string, variant: number) => string;
};

const storySceneConfigs: Record<AntigoStorySlug, AntigoSceneConfig> = {
  "noe-e-a-arca": {
    slug: "noe-e-a-arca",
    horizon: "sea",
    hero: (id, v) => ark(id, v % 2 === 0 ? 300 : 250 + (v % 4) * 35, v % 3 === 0 ? 400 : 430),
    sidekick: (id, v) =>
      v % 3 === 0
        ? `${giraffe(`${id}-g`, 150, 360)}${elephant(`${id}-e`, 410, 365)}`
        : `${sheep(`${id}-s1`, 130, 460)}${sheep(`${id}-s2`, 270, 470)}${dove(`${id}-d`, 430, 160)}`,
    symbol: (id, v) => (v % 2 === 0 ? rainbow(id, 300, 380) : dove(id, 300, 150)),
  },
  "davi-e-golias": {
    slug: "davi-e-golias",
    horizon: "ground",
    hero: (id, v) =>
      v % 2 === 0
        ? `${child(`${id}-davi`, 220, 440)}${person(`${id}-golias`, 430, 420)}${stone(`${id}-pedra`, 320, 480, 12)}`
        : `${child(`${id}-davi`, 330, 430)}${sheep(`${id}-ovelha`, 160, 470)}${tree(`${id}-arv`, 500, 440, 0.9)}`,
    sidekick: (id, v) =>
      v % 2 === 0
        ? `${sheep(`${id}-s1`, 120, 470)}${sheep(`${id}-s2`, 250, 475)}`
        : `${tent(`${id}-t1`, 150, 440)}${tent(`${id}-t2`, 430, 440)}`,
    symbol: (id, v) =>
      v % 3 === 0
        ? crown(id, 300, 360)
        : `${stone(`${id}-s1`, 220, 480, 14)}${stone(`${id}-s2`, 380, 480, 14)}`,
  },
  "jonas-e-a-baleia": {
    slug: "jonas-e-a-baleia",
    horizon: "sea",
    hero: (id, v) =>
      v % 2 === 0
        ? whale(id, 300 + (v % 3) * 30 - 30, 430, v % 4 === 0 ? 0.85 : 1)
        : `${person(`${id}-jonas`, 310, 390)}${fishBig(`${id}-peixe`, 320, 500)}`,
    sidekick: (id, v) =>
      `${fish(`${id}-f1`, 100, 510, 1, 1.3)}${fish(`${id}-f2`, 480, 535, -1, 1.1)}${dove(`${id}-d`, 440, 150)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? splash(id, 300, 275)
        : `${wave(`${id}-w1`, 0, 330, 220, 70)}${wave(`${id}-w2`, 360, 340, 220, 60)}`,
  },
  "moises-e-o-mar-vermelho": {
    slug: "moises-e-o-mar-vermelho",
    horizon: "sand",
    hero: (id, v) =>
      `${person(`${id}-moises`, 300, 440)}<rect id="fill-${id}-cajado" x="334" y="395" width="7" height="105" />${v % 2 === 0 ? `${wave(`${id}-l`, 0, 380, 180, 160)}${wave(`${id}-r`, 420, 380, 180, 160)}` : ""}`,
    sidekick: (id, v) =>
      v % 2 === 0
        ? `${child(`${id}-c1`, 165, 470)}${child(`${id}-c2`, 435, 470)}`
        : `${camel(`${id}-cam1`, 150, 430)}${camel(`${id}-cam2`, 420, 430)}`,
    symbol: (id, v) =>
      v % 3 === 0
        ? tablet(id, 300, 190)
        : `${palm(`${id}-p1`, 90, 455, 0.85)}${palm(`${id}-p2`, 520, 455, 0.85)}`,
  },
  "daniel-na-cova-dos-leoes": {
    slug: "daniel-na-cova-dos-leoes",
    horizon: "cave",
    hero: (id, v) =>
      `${person(`${id}-daniel`, 300, 440)}${v % 2 === 0 ? `${lion(`${id}-l1`, 145, 470)}${lion(`${id}-l2`, 455, 470)}` : lion(`${id}-l3`, 300, 500)}`,
    sidekick: (id, v) =>
      v % 2 === 0
        ? `${lion(`${id}-l4`, 210, 485)}${lion(`${id}-l5`, 390, 485)}`
        : `${dove(`${id}-d`, 300, 180)}${lampStand(`${id}-lamp`, 500, 420)}`,
    symbol: (id, v) =>
      v % 3 === 0
        ? crown(id, 430, 350)
        : `${star(`${id}-s1`, 120, 100)}${star(`${id}-s2`, 480, 115)}`,
  },
};

const sceneBackplate = (cfg: AntigoSceneConfig, id: string, variant: number) => {
  const skyHeight = cfg.horizon === "sea" ? 300 + (variant % 3) * 25 : 370;
  const floor = cfg.horizon === "sea" ? sea(`${id}-sea`, skyHeight) : ground(`${id}-ground`, 370);
  const cave =
    cfg.horizon === "cave"
      ? `<path id="fill-${id}-cave" d="M0 370 Q120 230 300 250 Q480 230 600 370 L600 600 L0 600 Z" />`
      : "";
  return `${sky(`${id}-sky`, skyHeight)}${floor}${cave}`;
};

const antigoLayouts: Array<(cfg: AntigoSceneConfig, i: number) => string> = [
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${sun(`sun-${i}`, 500, 105, 45)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${cloud(`cloud-${i}`, 150, 100, 1.1)}${c.sidekick(`side-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${rainbow(`rainbow-${i}`, 300, 380)}${c.hero(`hero-${i}`, i)}${flower(`fl-${i}`, 90, 480)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${mountain(`mt1-${i}`, 20, 370, 250, 130)}${mountain(`mt2-${i}`, 330, 370, 220, 110)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${moon(`moon-${i}`, 470, 95, 36)}${star(`star-${i}`, 130, 110)}${c.symbol(`symbol-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${tree(`tree1-${i}`, 90, 430, 0.9)}${tree(`tree2-${i}`, 510, 430, 0.8)}${c.sidekick(`side-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${sun(`sun-${i}`, 300, 120, 55)}${c.symbol(`symbol-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${cloud(`c1-${i}`, 110, 85)}${cloud(`c2-${i}`, 445, 125, 0.9)}${c.hero(`hero-${i}`, i)}${grass(`gr-${i}`, 510, 500)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${hill(`hill-${i}`, 60, 395, 480, 65)}${c.sidekick(`side-${i}`, i)}${c.symbol(`symbol-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${dove(`dove-${i}`, 300, 135)}${heart(`heart-${i}`, 300, 220, 1.4)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${flower(`f1-${i}`, 105, 475)}${flower(`f2-${i}`, 500, 480)}${sun(`sun-${i}`, 95, 100)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${tent(`tent1-${i}`, 125, 445)}${tent(`tent2-${i}`, 475, 445)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${palm(`palm1-${i}`, 95, 455, 0.9)}${palm(`palm2-${i}`, 510, 455, 0.9)}${c.sidekick(`side-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${cloud(`cloud-${i}`, 305, 95, 1.35)}${dot(`r1-${i}`, 120, 210)}${dot(`r2-${i}`, 260, 250)}${dot(`r3-${i}`, 420, 220)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.symbol(`symbol-${i}`, i)}${c.sidekick(`side-${i}`, i)}${moon(`moon-${i}`, 100, 100, 30)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${wellShape(`well-${i}`, 300, 405)}${c.hero(`hero-${i}`, i)}${tree(`tree-${i}`, 520, 430, 0.8)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${bird(`b1-${i}`, 170, 140)}${bird(`b2-${i}`, 410, 120)}${c.hero(`hero-${i}`, i)}${c.sidekick(`side-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${c.symbol(`symbol-${i}`, i)}${grass(`g1-${i}`, 130, 505)}${grass(`g2-${i}`, 430, 505)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${mountain(`mt-${i}`, 130, 370, 340, 190)}${sun(`sun-${i}`, 305, 175, 38)}${c.sidekick(`side-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${scroll(`scroll-${i}`, 300, 180)}${c.hero(`hero-${i}`, i)}${flower(`fl-${i}`, 520, 480)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${house(`house-${i}`, 300, 430)}${c.sidekick(`side-${i}`, i)}${sun(`sun-${i}`, 500, 105, 42)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${fish(`fish1-${i}`, 105, 510)}${fish(`fish2-${i}`, 495, 520, -1)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${star(`s1-${i}`, 115, 90)}${star(`s2-${i}`, 300, 70, 18)}${star(`s3-${i}`, 485, 100)}${c.symbol(`symbol-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.sidekick(`side-${i}`, i)}${c.hero(`hero-${i}`, i)}${rainbow(`rb-${i}`, 300, 390)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${stone(`st1-${i}`, 100, 500)}${stone(`st2-${i}`, 190, 480, 18)}${stone(`st3-${i}`, 470, 495, 16)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${cloud(`c1-${i}`, 120, 115)}${sun(`sun-${i}`, 470, 95, 42)}${c.symbol(`symbol-${i}`, i)}${c.sidekick(`side-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${tablet(`tab-${i}`, 120, 175)}${dove(`dv-${i}`, 480, 175)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${hill(`h1-${i}`, -20, 420, 280, 55)}${hill(`h2-${i}`, 340, 410, 300, 70)}${c.hero(`hero-${i}`, i)}${c.sidekick(`side-${i}`, i)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${c.symbol(`symbol-${i}`, i)}${flower(`f1-${i}`, 110, 470)}${flower(`f2-${i}`, 210, 500)}${flower(`f3-${i}`, 390, 500)}${flower(`f4-${i}`, 500, 470)}`,
  (c, i) =>
    `${sceneBackplate(c, `bg-${i}`, i)}${sun(`sun-${i}`, 300, 95, 48)}${cloud(`c-${i}`, 300, 165)}${c.hero(`hero-${i}`, i)}${c.symbol(`symbol-${i}`, i)}${c.sidekick(`side-${i}`, i)}`,
];

function generateAntigoStoryPages(slug: AntigoStorySlug): string[] {
  const cfg = storySceneConfigs[slug];
  return antigoLayouts.map((layout, index) => baseSvg(layout(cfg, index)));
}

// =====================================================================
// ARCA DE NOÉ — coleção premium 1:1 (30 cenas redesenhadas).
// Cada cena ocupa 70–85% do canvas, com áreas amplas (mín. ~40px)
// para toque mobile confortável. Line art mais escuro/grosso para
// legibilidade em telas pequenas. Fundo simples mas contextual.
// =====================================================================

const noahPremiumSvg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" stroke="#2A2622" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" fill="white"><rect x="0" y="0" width="600" height="600" fill="white" /><rect x="14" y="14" width="572" height="572" rx="18" fill="white" />${inner}</svg>`;

// ----- Backdrops grandes e simples -----
const npSky = (id: string, h = 360) =>
  `<rect id="fill-${id}" x="14" y="14" width="572" height="${h - 14}" />`;
const npGround = (id: string, y = 360) =>
  `<path id="fill-${id}" d="M14 ${y} L586 ${y} L586 586 L14 586 Z" />`;
const npSea = (id: string, y = 360) =>
  `<path id="fill-${id}" d="M14 ${y} Q150 ${y - 18} 300 ${y} T586 ${y} L586 586 L14 586 Z" />`;
const npHillBack = (id: string) =>
  `<path id="fill-${id}" d="M14 360 Q160 296 300 332 Q440 296 586 360 L586 400 L14 400 Z" />`;
const npCloudBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `<path id="fill-${id}" d="M${cx - 70 * s} ${cy} q-32 0 -32 ${28 * s} q0 ${24 * s} ${30 * s} ${24 * s} h${140 * s} q${30 * s} 0 ${30 * s} ${-24 * s} q0 ${-26 * s} ${-30 * s} ${-26 * s} q-4 ${-24 * s} ${-32 * s} ${-24 * s} q-${18 * s} ${-22 * s} ${-44 * s} ${-2 * s} q-${20 * s} -${10 * s} -${32 * s} ${24 * s} z" />`;
};
const npSunBig = (id: string, cx: number, cy: number, r = 56) =>
  `<g><circle id="fill-${id}" cx="${cx}" cy="${cy}" r="${r}" />${Array.from(
    { length: 8 },
    (_, i) => {
      const a = (Math.PI * 2 * i) / 8;
      const x1 = cx + Math.cos(a) * (r + 10);
      const y1 = cy + Math.sin(a) * (r + 10);
      const x2 = cx + Math.cos(a) * (r + 28);
      const y2 = cy + Math.sin(a) * (r + 28);
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" />`;
    },
  ).join("")}</g>`;
const npMoon = (id: string, cx: number, cy: number, r = 44) =>
  `<circle id="fill-${id}" cx="${cx}" cy="${cy}" r="${r}" />`;
const npStar = (id: string, cx: number, cy: number, r = 18) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)},${(cy + Math.sin(ang) * rr).toFixed(1)}`);
  }
  return `<polygon id="fill-${id}" points="${pts.join(" ")}" />`;
};
const npRaindrop = (id: string, cx: number, cy: number, r = 12) =>
  `<path id="fill-${id}" d="M${cx} ${cy - r * 1.6} q${r} ${r * 1.4} ${r} ${r * 1.6} a${r} ${r} 0 1 1 ${-r * 2} 0 q0 -0.2 ${r} -${r * 1.6} z" />`;
const npWaveBig = (id: string, x: number, y: number, w = 260, amp = 38) =>
  `<path id="fill-${id}" d="M${x} ${y} q${w / 4} -${amp} ${w / 2} 0 t${w / 2} 0 v${amp + 18} h${-w} z" />`;
const npMountain = (id: string, x: number, y: number, w = 260, h = 150) =>
  `<path id="fill-${id}" d="M${x} ${y} L${x + w * 0.45} ${y - h} L${x + w * 0.6} ${y - h * 0.7} L${x + w} ${y} Z" />`;
const npRainbowBig = (id: string, cx: number, cy: number, w = 520) => {
  const r1 = w / 2;
  const t = 36;
  return `
    <path id="fill-${id}-a" d="M${cx - r1} ${cy} a${r1} ${r1} 0 0 1 ${r1 * 2} 0 h${-t} a${r1 - t} ${r1 - t} 0 0 0 ${-(r1 - t) * 2} 0 z" />
    <path id="fill-${id}-b" d="M${cx - r1 + t} ${cy} a${r1 - t} ${r1 - t} 0 0 1 ${(r1 - t) * 2} 0 h${-t} a${r1 - 2 * t} ${r1 - 2 * t} 0 0 0 ${-(r1 - 2 * t) * 2} 0 z" />
    <path id="fill-${id}-c" d="M${cx - r1 + 2 * t} ${cy} a${r1 - 2 * t} ${r1 - 2 * t} 0 0 1 ${(r1 - 2 * t) * 2} 0 h${-t} a${r1 - 3 * t} ${r1 - 3 * t} 0 0 0 ${-(r1 - 3 * t) * 2} 0 z" />
    <path id="fill-${id}-d" d="M${cx - r1 + 3 * t} ${cy} a${r1 - 3 * t} ${r1 - 3 * t} 0 0 1 ${(r1 - 3 * t) * 2} 0 h${-t} a${r1 - 4 * t} ${r1 - 4 * t} 0 0 0 ${-(r1 - 4 * t) * 2} 0 z" />
  `;
};

// ----- Arca premium (grande, 5–7 áreas amplas) -----
const npArk = (
  id: string,
  cx: number,
  cy: number,
  scale = 1,
  state: "building" | "closed" | "open" | "rest" = "closed",
) => {
  const s = scale;
  const hullW = 280 * s;
  const hullH = 84 * s;
  const cabinW = 220 * s;
  const cabinH = 110 * s;
  const roofH = 78 * s;
  return `
    <path id="fill-${id}-hull" d="M${cx - hullW} ${cy} C${cx - hullW * 0.55} ${cy + hullH} ${cx + hullW * 0.55} ${cy + hullH} ${cx + hullW} ${cy} L${cx + hullW * 0.86} ${cy - hullH * 0.42} C${cx + hullW * 0.42} ${cy - hullH * 0.6} ${cx - hullW * 0.42} ${cy - hullH * 0.6} ${cx - hullW * 0.86} ${cy - hullH * 0.42} Z" />
    <path id="fill-${id}-cabin" d="M${cx - cabinW / 2} ${cy - hullH * 0.42 - cabinH} h${cabinW} v${cabinH} h${-cabinW} z" />
    <path id="fill-${id}-roof" d="M${cx - cabinW / 2 - 26 * s} ${cy - hullH * 0.42 - cabinH} L${cx} ${cy - hullH * 0.42 - cabinH - roofH} L${cx + cabinW / 2 + 26 * s} ${cy - hullH * 0.42 - cabinH} Z" />
    ${
      state === "open"
        ? `<path id="fill-${id}-door-l" d="M${cx - 56 * s} ${cy - hullH * 0.42 - 80 * s} v${72 * s} h${44 * s} v${-72 * s} z" /><path id="fill-${id}-door-r" d="M${cx + 12 * s} ${cy - hullH * 0.42 - 80 * s} v${72 * s} h${44 * s} v${-72 * s} z" /><path id="fill-${id}-ramp" d="M${cx - 70 * s} ${cy - 4 * s} l${-50 * s} ${64 * s} h${240 * s} l${-50 * s} ${-64 * s} z" />`
        : `<rect id="fill-${id}-door" x="${cx - 36 * s}" y="${cy - hullH * 0.42 - 82 * s}" width="${72 * s}" height="${74 * s}" rx="6" />`
    }
    <circle id="fill-${id}-window-l" cx="${cx - 76 * s}" cy="${cy - hullH * 0.42 - cabinH * 0.55}" r="${20 * s}" />
    <circle id="fill-${id}-window-r" cx="${cx + 76 * s}" cy="${cy - hullH * 0.42 - cabinH * 0.55}" r="${20 * s}" />
    ${
      state === "building"
        ? `<path d="M${cx - hullW * 0.6} ${cy - hullH * 0.42} l${-30 * s} ${30 * s} M${cx + hullW * 0.6} ${cy - hullH * 0.42} l${30 * s} ${30 * s}" fill="none" />`
        : ""
    }
    ${
      state === "rest"
        ? `<path d="M${cx - 60 * s} ${cy + hullH * 0.55} q${60 * s} ${20 * s} ${120 * s} 0" fill="none" />`
        : ""
    }
  `;
};

// ----- Noé premium e família -----
const npNoah = (
  id: string,
  cx: number,
  cy: number,
  scale = 1,
  pose: "idle" | "pray" | "point" | "carry" | "staff" | "hammer" = "idle",
) => {
  const s = scale;
  const headR = 38 * s;
  const headCy = cy - 110 * s;
  return `
    <circle id="fill-${id}-head" cx="${cx}" cy="${headCy}" r="${headR}" />
    <path id="fill-${id}-hair" d="M${cx - headR} ${headCy - 6 * s} q${headR} ${-30 * s} ${headR * 2} 0 q${-headR / 2} ${-headR * 0.3} ${-headR} ${-headR * 0.3} q${-headR / 2} 0 ${-headR} ${headR * 0.3} z" />
    <path id="fill-${id}-beard" d="M${cx - headR * 0.85} ${headCy + headR * 0.55} q${headR * 0.85} ${headR * 1.2} ${headR * 1.7} 0 q${-headR * 0.4} ${headR * 1.4} ${-headR * 1.7} 0 z" />
    <path d="M${cx - 14 * s} ${headCy - 4 * s} q${4 * s} ${-6 * s} ${8 * s} 0 M${cx + 6 * s} ${headCy - 4 * s} q${4 * s} ${-6 * s} ${8 * s} 0" fill="none" />
    <path id="fill-${id}-robe" d="M${cx - 70 * s} ${cy + 100 * s} L${cx - 50 * s} ${cy - 60 * s} q${50 * s} ${-22 * s} ${100 * s} 0 L${cx + 70 * s} ${cy + 100 * s} Z" />
    <path id="fill-${id}-belt" d="M${cx - 58 * s} ${cy + 6 * s} q${58 * s} ${10 * s} ${116 * s} 0 v${14 * s} q${-58 * s} ${-10 * s} ${-116 * s} 0 z" />
    ${
      pose === "pray"
        ? `<path id="fill-${id}-arm-l" d="M${cx - 50 * s} ${cy - 40 * s} q${20 * s} ${-30 * s} ${44 * s} ${-50 * s} l${10 * s} ${-12 * s} l${-12 * s} ${-8 * s} q${-26 * s} ${20 * s} ${-50 * s} ${52 * s} z" /><path id="fill-${id}-arm-r" d="M${cx + 50 * s} ${cy - 40 * s} q${-20 * s} ${-30 * s} ${-44 * s} ${-50 * s} l${-10 * s} ${-12 * s} l${12 * s} ${-8 * s} q${26 * s} ${20 * s} ${50 * s} ${52 * s} z" />`
        : pose === "point"
          ? `<path id="fill-${id}-arm-l" d="M${cx - 50 * s} ${cy - 40 * s} q${-30 * s} ${30 * s} ${-50 * s} ${68 * s} l${14 * s} ${10 * s} q${22 * s} ${-30 * s} ${50 * s} ${-58 * s} z" /><path id="fill-${id}-arm-r" d="M${cx + 50 * s} ${cy - 40 * s} q${50 * s} ${-30 * s} ${82 * s} ${-44 * s} l${4 * s} ${14 * s} q${-44 * s} ${20 * s} ${-78 * s} ${44 * s} z" />`
          : pose === "staff"
            ? `<path id="fill-${id}-arm-l" d="M${cx - 50 * s} ${cy - 40 * s} q${-30 * s} ${30 * s} ${-50 * s} ${68 * s} l${14 * s} ${10 * s} q${22 * s} ${-30 * s} ${50 * s} ${-58 * s} z" /><path id="fill-${id}-arm-r" d="M${cx + 50 * s} ${cy - 40 * s} q${30 * s} ${10 * s} ${50 * s} ${30 * s} l${-12 * s} ${14 * s} q${-22 * s} ${-12 * s} ${-50 * s} ${-22 * s} z" /><path id="fill-${id}-staff" d="M${cx + 96 * s} ${cy - 100 * s} q${10 * s} ${20 * s} 0 ${40 * s} l${-4 * s} ${160 * s} h${10 * s} l${-2 * s} ${-160 * s} q${10 * s} ${-20 * s} 0 ${-40 * s} z" />`
            : pose === "carry"
              ? `<path id="fill-${id}-arm-l" d="M${cx - 50 * s} ${cy - 40 * s} q${-20 * s} ${20 * s} ${-30 * s} ${50 * s} l${14 * s} ${10 * s} q${14 * s} ${-22 * s} ${30 * s} ${-50 * s} z" /><path id="fill-${id}-arm-r" d="M${cx + 50 * s} ${cy - 40 * s} q${20 * s} ${20 * s} ${30 * s} ${50 * s} l${-14 * s} ${10 * s} q${-14 * s} ${-22 * s} ${-30 * s} ${-50 * s} z" /><rect id="fill-${id}-bundle" x="${cx - 36 * s}" y="${cy + 6 * s}" width="${72 * s}" height="${30 * s}" rx="6" />`
              : pose === "hammer"
                ? `<path id="fill-${id}-arm-l" d="M${cx - 50 * s} ${cy - 40 * s} q${-20 * s} ${20 * s} ${-30 * s} ${50 * s} l${14 * s} ${10 * s} q${14 * s} ${-22 * s} ${30 * s} ${-50 * s} z" /><path id="fill-${id}-arm-r" d="M${cx + 50 * s} ${cy - 40 * s} q${40 * s} ${-30 * s} ${64 * s} ${-46 * s} l${10 * s} ${14 * s} q${-32 * s} ${20 * s} ${-60 * s} ${42 * s} z" /><rect id="fill-${id}-hammer-handle" x="${cx + 96 * s}" y="${cy - 90 * s}" width="${10 * s}" height="${56 * s}" /><rect id="fill-${id}-hammer-head" x="${cx + 84 * s}" y="${cy - 102 * s}" width="${36 * s}" height="${22 * s}" rx="3" />`
                : `<path id="fill-${id}-arm-l" d="M${cx - 50 * s} ${cy - 40 * s} q${-22 * s} ${30 * s} ${-30 * s} ${66 * s} l${14 * s} ${6 * s} q${10 * s} ${-30 * s} ${30 * s} ${-58 * s} z" /><path id="fill-${id}-arm-r" d="M${cx + 50 * s} ${cy - 40 * s} q${22 * s} ${30 * s} ${30 * s} ${66 * s} l${-14 * s} ${6 * s} q${-10 * s} ${-30 * s} ${-30 * s} ${-58 * s} z" />`
    }
    <path id="fill-${id}-foot-l" d="M${cx - 28 * s} ${cy + 100 * s} h${22 * s} l${-2 * s} ${14 * s} h${-22 * s} z" />
    <path id="fill-${id}-foot-r" d="M${cx + 6 * s} ${cy + 100 * s} h${22 * s} l${-2 * s} ${14 * s} h${-22 * s} z" />
  `;
};

const npChild = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const headR = 26 * s;
  return `
    <circle id="fill-${id}-head" cx="${cx}" cy="${cy - 70 * s}" r="${headR}" />
    <path id="fill-${id}-hair" d="M${cx - headR} ${cy - 78 * s} q${headR} ${-22 * s} ${headR * 2} 0 q${-headR / 2} ${-8 * s} ${-headR} ${-8 * s} q${-headR / 2} 0 ${-headR} ${8 * s} z" />
    <path id="fill-${id}-tunic" d="M${cx - 36 * s} ${cy + 60 * s} L${cx - 28 * s} ${cy - 38 * s} q${28 * s} ${-14 * s} ${56 * s} 0 L${cx + 36 * s} ${cy + 60 * s} Z" />
    <path id="fill-${id}-arms" d="M${cx - 28 * s} ${cy - 24 * s} q${-22 * s} ${30 * s} ${-26 * s} ${50 * s} l${10 * s} ${4 * s} q${10 * s} ${-22 * s} ${24 * s} ${-44 * s} z M${cx + 28 * s} ${cy - 24 * s} q${22 * s} ${30 * s} ${26 * s} ${50 * s} l${-10 * s} ${4 * s} q${-10 * s} ${-22 * s} ${-24 * s} ${-44 * s} z" />
  `;
};

const npFamily = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    ${npNoah(`${id}-noah`, cx, cy, 0.85 * s, "idle")}
    ${npChild(`${id}-wife`, cx - 90 * s, cy + 12 * s, 0.95 * s)}
    ${npChild(`${id}-c1`, cx - 60 * s, cy + 50 * s, 0.7 * s)}
    ${npChild(`${id}-c2`, cx + 60 * s, cy + 50 * s, 0.7 * s)}
    ${npChild(`${id}-c3`, cx + 100 * s, cy + 18 * s, 0.85 * s)}
  `;
};

// ----- Animais "fofos premium" — grandes, poucas áreas internas -----
const npLion = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 70 * s} ${cy + 10 * s} q${10 * s} ${-50 * s} ${70 * s} ${-46 * s} q${60 * s} ${-4 * s} ${70 * s} ${46 * s} q0 ${50 * s} ${-70 * s} ${50 * s} q${-70 * s} 0 ${-70 * s} ${-50 * s} z" />
    <circle id="fill-${id}-head" cx="${cx - 50 * s}" cy="${cy - 30 * s}" r="${36 * s}" />
    <path id="fill-${id}-mane" d="M${cx - 50 * s} ${cy - 70 * s} q${-46 * s} ${0} ${-50 * s} ${42 * s} q${0} ${44 * s} ${50 * s} ${44 * s} q${50 * s} 0 ${50 * s} ${-44 * s} q${-4 * s} ${-42 * s} ${-50 * s} ${-42 * s} z" />
    <path id="fill-${id}-leg-fl" d="M${cx - 60 * s} ${cy + 50 * s} h${22 * s} v${30 * s} h${-22 * s} z" />
    <path id="fill-${id}-leg-bl" d="M${cx + 32 * s} ${cy + 50 * s} h${22 * s} v${30 * s} h${-22 * s} z" />
    <path id="fill-${id}-tail" d="M${cx + 70 * s} ${cy + 8 * s} q${30 * s} ${-20 * s} ${36 * s} ${20 * s} q${-6 * s} ${10 * s} ${-14 * s} ${4 * s} q${-2 * s} ${-16 * s} ${-22 * s} ${-10 * s} z" />
    <circle cx="${cx - 60 * s}" cy="${cy - 32 * s}" r="${3 * s}" /><circle cx="${cx - 38 * s}" cy="${cy - 32 * s}" r="${3 * s}" />
  `;
};

const npElephant = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 70 * s} ${cy} q0 ${-60 * s} ${80 * s} ${-60 * s} q${80 * s} 0 ${80 * s} ${60 * s} q0 ${50 * s} ${-80 * s} ${50 * s} q${-80 * s} 0 ${-80 * s} ${-50 * s} z" />
    <path id="fill-${id}-head" d="M${cx - 90 * s} ${cy - 20 * s} q${-30 * s} ${-10 * s} ${-30 * s} ${30 * s} q0 ${30 * s} ${30 * s} ${30 * s} z" />
    <path id="fill-${id}-ear" d="M${cx - 76 * s} ${cy - 30 * s} q${-30 * s} ${-10 * s} ${-30 * s} ${30 * s} q${30 * s} ${-4 * s} ${30 * s} ${-30 * s} z" />
    <path id="fill-${id}-trunk" d="M${cx - 120 * s} ${cy + 28 * s} q${-10 * s} ${30 * s} ${10 * s} ${50 * s} q${24 * s} ${10 * s} ${30 * s} ${-10 * s} l${-12 * s} ${-6 * s} q${-2 * s} ${10 * s} ${-12 * s} ${4 * s} q${-10 * s} ${-12 * s} 0 ${-30 * s} z" />
    <path id="fill-${id}-leg-fl" d="M${cx - 50 * s} ${cy + 50 * s} h${28 * s} v${36 * s} h${-28 * s} z" />
    <path id="fill-${id}-leg-bl" d="M${cx + 30 * s} ${cy + 50 * s} h${28 * s} v${36 * s} h${-28 * s} z" />
    <circle cx="${cx - 96 * s}" cy="${cy - 4 * s}" r="${3.5 * s}" />
  `;
};

const npGiraffe = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 50 * s} ${cy} q0 ${-40 * s} ${50 * s} ${-40 * s} q${50 * s} 0 ${50 * s} ${40 * s} q0 ${40 * s} ${-50 * s} ${40 * s} q${-50 * s} 0 ${-50 * s} ${-40 * s} z" />
    <path id="fill-${id}-neck" d="M${cx + 30 * s} ${cy - 30 * s} l${24 * s} ${-110 * s} h${28 * s} l${-22 * s} ${110 * s} z" />
    <path id="fill-${id}-head" d="M${cx + 56 * s} ${cy - 150 * s} q${-14 * s} ${-22 * s} ${24 * s} ${-26 * s} q${30 * s} ${4 * s} ${20 * s} ${30 * s} z" />
    <path id="fill-${id}-leg-fl" d="M${cx - 30 * s} ${cy + 30 * s} h${18 * s} v${50 * s} h${-18 * s} z" />
    <path id="fill-${id}-leg-bl" d="M${cx + 30 * s} ${cy + 30 * s} h${18 * s} v${50 * s} h${-18 * s} z" />
    <circle cx="${cx + 86 * s}" cy="${cy - 158 * s}" r="${3 * s}" />
    <path d="M${cx + 70 * s} ${cy - 184 * s} v${10 * s} M${cx + 88 * s} ${cy - 184 * s} v${10 * s}" fill="none" />
  `;
};

const npSheep = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 60 * s} ${cy} q0 ${-46 * s} ${60 * s} ${-46 * s} q${60 * s} 0 ${60 * s} ${46 * s} q${10 * s} ${36 * s} ${-30 * s} ${36 * s} q${-30 * s} 0 ${-30 * s} ${-10 * s} q0 ${10 * s} ${-30 * s} ${10 * s} q${-30 * s} 0 ${-30 * s} ${-10 * s} q0 ${10 * s} ${-30 * s} ${10 * s} q${-40 * s} 0 ${-30 * s} ${-36 * s} z" />
    <ellipse id="fill-${id}-head" cx="${cx + 60 * s}" cy="${cy - 6 * s}" rx="${24 * s}" ry="${22 * s}" />
    <path id="fill-${id}-leg-fl" d="M${cx - 30 * s} ${cy + 36 * s} h${14 * s} v${28 * s} h${-14 * s} z" />
    <path id="fill-${id}-leg-bl" d="M${cx + 22 * s} ${cy + 36 * s} h${14 * s} v${28 * s} h${-14 * s} z" />
    <circle cx="${cx + 70 * s}" cy="${cy - 8 * s}" r="${2.5 * s}" />
  `;
};

const npZebra = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 60 * s} ${cy} q0 ${-44 * s} ${60 * s} ${-44 * s} q${60 * s} 0 ${60 * s} ${44 * s} q0 ${36 * s} ${-60 * s} ${36 * s} q${-60 * s} 0 ${-60 * s} ${-36 * s} z" />
    <ellipse id="fill-${id}-head" cx="${cx + 70 * s}" cy="${cy - 24 * s}" rx="${28 * s}" ry="${22 * s}" />
    <path id="fill-${id}-mane" d="M${cx + 50 * s} ${cy - 44 * s} l${-6 * s} ${-14 * s} l${10 * s} ${4 * s} l${-2 * s} ${-14 * s} l${10 * s} ${6 * s} l${0} ${-12 * s} l${10 * s} ${10 * s} z" />
    <path id="fill-${id}-leg-fl" d="M${cx - 30 * s} ${cy + 34 * s} h${16 * s} v${36 * s} h${-16 * s} z" />
    <path id="fill-${id}-leg-bl" d="M${cx + 24 * s} ${cy + 34 * s} h${16 * s} v${36 * s} h${-16 * s} z" />
    <circle cx="${cx + 80 * s}" cy="${cy - 26 * s}" r="${3 * s}" />
  `;
};

const npBear = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 60 * s} ${cy} q0 ${-50 * s} ${60 * s} ${-50 * s} q${60 * s} 0 ${60 * s} ${50 * s} q0 ${44 * s} ${-60 * s} ${44 * s} q${-60 * s} 0 ${-60 * s} ${-44 * s} z" />
    <circle id="fill-${id}-head" cx="${cx - 60 * s}" cy="${cy - 30 * s}" r="${30 * s}" />
    <circle id="fill-${id}-ear-l" cx="${cx - 80 * s}" cy="${cy - 56 * s}" r="${10 * s}" />
    <circle id="fill-${id}-ear-r" cx="${cx - 40 * s}" cy="${cy - 56 * s}" r="${10 * s}" />
    <path id="fill-${id}-leg-fl" d="M${cx - 50 * s} ${cy + 40 * s} h${22 * s} v${30 * s} h${-22 * s} z" />
    <path id="fill-${id}-leg-bl" d="M${cx + 28 * s} ${cy + 40 * s} h${22 * s} v${30 * s} h${-22 * s} z" />
    <circle cx="${cx - 70 * s}" cy="${cy - 30 * s}" r="${3 * s}" /><circle cx="${cx - 50 * s}" cy="${cy - 30 * s}" r="${3 * s}" />
  `;
};

const npRabbit = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 36 * s} ${cy} q0 ${-30 * s} ${36 * s} ${-30 * s} q${36 * s} 0 ${36 * s} ${30 * s} q0 ${30 * s} ${-36 * s} ${30 * s} q${-36 * s} 0 ${-36 * s} ${-30 * s} z" />
    <circle id="fill-${id}-head" cx="${cx - 30 * s}" cy="${cy - 28 * s}" r="${20 * s}" />
    <path id="fill-${id}-ear-l" d="M${cx - 40 * s} ${cy - 50 * s} q${-6 * s} ${-30 * s} ${4 * s} ${-32 * s} q${10 * s} ${2 * s} ${4 * s} ${30 * s} z" />
    <path id="fill-${id}-ear-r" d="M${cx - 22 * s} ${cy - 50 * s} q${-6 * s} ${-32 * s} ${6 * s} ${-32 * s} q${10 * s} 0 ${4 * s} ${30 * s} z" />
    <circle cx="${cx - 36 * s}" cy="${cy - 28 * s}" r="${2.5 * s}" /><circle cx="${cx - 22 * s}" cy="${cy - 28 * s}" r="${2.5 * s}" />
  `;
};

const npDovePremium = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 30 * s} ${cy} q${-6 * s} ${-30 * s} ${30 * s} ${-30 * s} q${30 * s} 0 ${50 * s} ${20 * s} q${0} ${24 * s} ${-30 * s} ${24 * s} q${-30 * s} 0 ${-50 * s} ${-14 * s} z" />
    <path id="fill-${id}-wing" d="M${cx + 10 * s} ${cy - 20 * s} q${20 * s} ${-26 * s} ${44 * s} ${-12 * s} q${-12 * s} ${22 * s} ${-44 * s} ${20 * s} z" />
    <path id="fill-${id}-tail" d="M${cx + 50 * s} ${cy + 6 * s} l${20 * s} ${-4 * s} l${-4 * s} ${14 * s} z" />
    <circle cx="${cx - 16 * s}" cy="${cy - 10 * s}" r="${3 * s}" />
    <path d="M${cx - 28 * s} ${cy - 6 * s} l${-12 * s} ${4 * s} l${10 * s} ${4 * s} z" fill="none" />
  `;
};

const npOliveBranch = (id: string, cx: number, cy: number) => `
  <path d="M${cx} ${cy} q${30} ${-20} ${60} ${-30}" fill="none" />
  <ellipse id="fill-${id}-l1" cx="${cx + 18}" cy="${cy - 10}" rx="10" ry="5" transform="rotate(-30 ${cx + 18} ${cy - 10})" />
  <ellipse id="fill-${id}-l2" cx="${cx + 38}" cy="${cy - 22}" rx="10" ry="5" transform="rotate(-25 ${cx + 38} ${cy - 22})" />
  <ellipse id="fill-${id}-l3" cx="${cx + 56}" cy="${cy - 30}" rx="10" ry="5" transform="rotate(-15 ${cx + 56} ${cy - 30})" />
`;

const npGodLight = (id: string) => `
  <path id="fill-${id}-c" d="M260 40 q40 30 80 0 q-10 60 -40 80 q-30 -20 -40 -80 z" />
  <path d="M280 120 l-30 60 M320 120 l30 60 M300 124 v60" fill="none" stroke-width="3" />
`;

const npHammerStation = (id: string, cx: number, cy: number) => `
  <rect id="fill-${id}-table" x="${cx - 90}" y="${cy}" width="180" height="22" rx="4" />
  <rect id="fill-${id}-leg-l" x="${cx - 80}" y="${cy + 22}" width="14" height="40" />
  <rect id="fill-${id}-leg-r" x="${cx + 66}" y="${cy + 22}" width="14" height="40" />
  <rect id="fill-${id}-plank" x="${cx - 70}" y="${cy - 14}" width="140" height="14" rx="3" />
`;

const npAltar = (id: string, cx: number, cy: number) => `
  <rect id="fill-${id}-base" x="${cx - 70}" y="${cy}" width="140" height="50" rx="4" />
  <rect id="fill-${id}-top" x="${cx - 80}" y="${cy - 12}" width="160" height="14" rx="3" />
  <path id="fill-${id}-flame" d="M${cx} ${cy - 20} q${-18} ${-30} 0 ${-60} q${18} ${30} 0 ${60} z" />
`;

const npRain = (count = 14, seed = 0) =>
  Array.from({ length: count }, (_, n) => {
    const x = 60 + ((seed * 47 + n * 53) % 480);
    const y = 80 + ((seed * 23 + n * 37) % 200);
    return `<path d="M${x} ${y} l-12 28" fill="none" />`;
  }).join("");

// ----- Frame de cena helper -----
const noahScene = (inner: string) => noahPremiumSvg(inner);

// ============== As 30 cenas premium da Arca de Noé ==============

function noahPage1(): string {
  // Deus fala com Noé — Noé olhando para o céu, raios de luz divina.
  const id = "p1";
  return noahScene(`
    ${npSky(`${id}-sky`, 380)}
    ${npGround(`${id}-ground`, 380)}
    ${npGodLight(`${id}-light`)}
    ${npCloudBig(`${id}-c1`, 130, 110, 1)}
    ${npCloudBig(`${id}-c2`, 470, 130, 0.95)}
    ${npNoah(`${id}-noah`, 300, 460, 1.05, "pray")}
    <path id="fill-${id}-rock-l" d="M30 540 q40 -28 90 0 v46 h-90 z" />
    <path id="fill-${id}-rock-r" d="M480 540 q40 -28 90 0 v46 h-90 z" />
    <path d="M50 555 q20 -10 40 0" fill="none" />
    <path d="M55 568 q20 -8 30 0" fill="none" />
    <path d="M495 555 q20 -10 40 0" fill="none" />
    <path d="M505 568 q18 -8 30 0" fill="none" />
    <path d="M210 530 q20 -6 38 0" fill="none" />
    <path d="M340 538 q20 -6 38 0" fill="none" />
  `);
}

function noahPage2(): string {
  // Noé recebe a missão — destaque de Noé com expressão de decisão.
  const id = "p2";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npSunBig(`${id}-sun`, 110, 110, 48)}
    ${npCloudBig(`${id}-c`, 460, 120, 1.1)}
    ${npNoah(`${id}-noah`, 300, 470, 1.15, "point")}
    ${npHillBack(`${id}-hill`)}
  `);
}

function noahPage3(): string {
  // Noé planeja — bancada com tábua, plano grande.
  const id = "p3";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npCloudBig(`${id}-c`, 480, 100, 0.9)}
    ${npNoah(`${id}-noah`, 200, 450, 1, "carry")}
    ${npHammerStation(`${id}-bench`, 420, 440)}
    <rect id="fill-${id}-scroll" x="170" y="160" width="120" height="80" rx="6" />
    <path d="M180 188 h100 M180 210 h80" fill="none" />
  `);
}

function noahPage4(): string {
  // Construção — Noé com martelo + casco da arca em formação.
  const id = "p4";
  return noahScene(`
    ${npSky(`${id}-sky`, 340)}
    ${npGround(`${id}-ground`, 340)}
    ${npSunBig(`${id}-sun`, 100, 100, 42)}
    ${npNoah(`${id}-noah`, 160, 460, 0.95, "hammer")}
    ${npArk(`${id}-ark`, 380, 360, 0.78, "building")}
    <path id="fill-${id}-plank-a" d="M40 540 h220 v18 h-220 z" />
    <path id="fill-${id}-plank-b" d="M340 552 h220 v18 h-220 z" />
  `);
}

function noahPage5(): string {
  // Arca tomando forma — arca com cabine, família ajudando.
  const id = "p5";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npCloudBig(`${id}-c`, 110, 110, 0.85)}
    ${npArk(`${id}-ark`, 320, 350, 0.92, "building")}
    ${npChild(`${id}-c1`, 110, 470, 0.95)}
    ${npChild(`${id}-c2`, 530, 480, 0.95)}
  `);
}

function noahPage6(): string {
  // Arca pronta — arca grande em destaque.
  const id = "p6";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npSunBig(`${id}-sun`, 500, 110, 50)}
    ${npCloudBig(`${id}-c`, 130, 110, 1)}
    ${npArk(`${id}-ark`, 300, 370, 1.15, "closed")}
  `);
}

function noahPage7(): string {
  // Animais começam a chegar.
  const id = "p7";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npArk(`${id}-ark`, 460, 360, 0.78, "open")}
    ${npElephant(`${id}-ele`, 170, 430, 1)}
    ${npRabbit(`${id}-rab`, 320, 510, 1.1)}
  `);
}

function noahPage8(): string {
  // Noé recebe os animais.
  const id = "p8";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npNoah(`${id}-noah`, 470, 460, 1, "idle")}
    ${npLion(`${id}-lion`, 180, 460, 1)}
    ${npSheep(`${id}-sheep`, 320, 510, 0.85)}
  `);
}

function noahPage9(): string {
  // Pares de animais a caminho.
  const id = "p9";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npGiraffe(`${id}-gir`, 130, 460, 0.88)}
    ${npZebra(`${id}-zeb`, 350, 470, 0.95)}
    ${npSunBig(`${id}-sun`, 510, 100, 40)}
  `);
}

function noahPage10(): string {
  // Entrada dos animais na arca.
  const id = "p10";
  return noahScene(`
    ${npSky(`${id}-sky`, 340)}
    ${npGround(`${id}-ground`, 340)}
    ${npArk(`${id}-ark`, 320, 340, 0.92, "open")}
    ${npLion(`${id}-lion`, 130, 510, 0.7)}
    ${npSheep(`${id}-sheep`, 510, 520, 0.7)}
  `);
}

function noahPage11(): string {
  // Noé e família entram na arca.
  const id = "p11";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npArk(`${id}-ark`, 440, 360, 0.78, "open")}
    ${npFamily(`${id}-fam`, 200, 470, 1.1)}
  `);
}

function noahPage12(): string {
  // A porta da arca se fecha.
  const id = "p12";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npCloudBig(`${id}-c1`, 120, 90, 1)}
    ${npCloudBig(`${id}-c2`, 480, 110, 1)}
    ${npArk(`${id}-ark`, 300, 360, 1.05, "closed")}
  `);
}

function noahPage13(): string {
  // A chuva começa.
  const id = "p13";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npCloudBig(`${id}-c1`, 160, 100, 1.15)}
    ${npCloudBig(`${id}-c2`, 460, 110, 1.05)}
    ${npArk(`${id}-ark`, 300, 370, 0.95, "closed")}
    ${npRaindrop(`${id}-r1`, 120, 230, 13)}
    ${npRaindrop(`${id}-r2`, 220, 260, 13)}
    ${npRaindrop(`${id}-r3`, 380, 240, 13)}
    ${npRaindrop(`${id}-r4`, 480, 270, 13)}
  `);
}

function noahPage14(): string {
  // Tempestade aumenta — arca na água, ondas grandes.
  const id = "p14";
  return noahScene(`
    ${npSky(`${id}-sky`, 320)}
    ${npSea(`${id}-sea`, 320)}
    ${npCloudBig(`${id}-c`, 300, 90, 1.4)}
    ${npRain(20, 3)}
    ${npArk(`${id}-ark`, 300, 380, 0.95, "closed")}
    ${npWaveBig(`${id}-w1`, 14, 460, 280, 36)}
    ${npWaveBig(`${id}-w2`, 300, 470, 286, 36)}
  `);
}

function noahPage15(): string {
  // Arca navegando.
  const id = "p15";
  return noahScene(`
    ${npSky(`${id}-sky`, 330)}
    ${npSea(`${id}-sea`, 330)}
    ${npSunBig(`${id}-sun`, 480, 120, 46)}
    ${npCloudBig(`${id}-c`, 130, 110, 1)}
    ${npArk(`${id}-ark`, 300, 380, 1, "closed")}
    ${npWaveBig(`${id}-w1`, 14, 470, 280, 30)}
    ${npWaveBig(`${id}-w2`, 300, 480, 286, 30)}
  `);
}

function noahPage16(): string {
  // Animais dentro da arca — cena interna.
  const id = "p16";
  return noahScene(`
    <rect id="fill-${id}-floor" x="14" y="430" width="572" height="156" />
    <rect id="fill-${id}-wall" x="14" y="14" width="572" height="416" />
    <rect id="fill-${id}-window" x="240" y="60" width="120" height="80" rx="10" />
    ${npLion(`${id}-lion`, 160, 470, 0.95)}
    ${npElephant(`${id}-ele`, 420, 470, 0.85)}
    ${npSheep(`${id}-sheep`, 290, 520, 0.7)}
  `);
}

function noahPage17(): string {
  // Noé cuidando dos animais.
  const id = "p17";
  return noahScene(`
    <rect id="fill-${id}-floor" x="14" y="430" width="572" height="156" />
    <rect id="fill-${id}-wall" x="14" y="14" width="572" height="416" />
    ${npNoah(`${id}-noah`, 180, 470, 1, "carry")}
    ${npSheep(`${id}-sheep`, 380, 480, 0.95)}
    ${npRabbit(`${id}-rab`, 500, 510, 1)}
  `);
}

function noahPage18(): string {
  // Família dentro da arca.
  const id = "p18";
  return noahScene(`
    <rect id="fill-${id}-floor" x="14" y="450" width="572" height="136" />
    <rect id="fill-${id}-wall" x="14" y="14" width="572" height="436" />
    <circle id="fill-${id}-window" cx="300" cy="100" r="50" />
    ${npFamily(`${id}-fam`, 300, 480, 1.05)}
  `);
}

function noahPage19(): string {
  // A chuva termina — céu clareando.
  const id = "p19";
  return noahScene(`
    ${npSky(`${id}-sky`, 330)}
    ${npSea(`${id}-sea`, 330)}
    ${npSunBig(`${id}-sun`, 300, 110, 50)}
    ${npCloudBig(`${id}-c1`, 110, 130, 0.85)}
    ${npCloudBig(`${id}-c2`, 490, 140, 0.85)}
    ${npArk(`${id}-ark`, 300, 380, 0.95, "closed")}
  `);
}

function noahPage20(): string {
  // Águas começam a baixar.
  const id = "p20";
  return noahScene(`
    ${npSky(`${id}-sky`, 320)}
    ${npSea(`${id}-sea`, 320)}
    ${npMountain(`${id}-m1`, 30, 360, 220, 90)}
    ${npMountain(`${id}-m2`, 360, 370, 220, 80)}
    ${npArk(`${id}-ark`, 300, 400, 0.92, "closed")}
  `);
}

function noahPage21(): string {
  // A arca repousa no monte.
  const id = "p21";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npMountain(`${id}-m1`, 14, 360, 280, 220)}
    ${npMountain(`${id}-m2`, 320, 370, 270, 200)}
    ${npArk(`${id}-ark`, 300, 320, 0.85, "rest")}
  `);
}

function noahPage22(): string {
  // Noé observa a terra.
  const id = "p22";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npSunBig(`${id}-sun`, 480, 110, 48)}
    ${npHillBack(`${id}-hill`)}
    ${npNoah(`${id}-noah`, 280, 470, 1.1, "point")}
  `);
}

function noahPage23(): string {
  // Noé solta o corvo.
  const id = "p23";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npNoah(`${id}-noah`, 220, 460, 1, "point")}
    ${npDovePremium(`${id}-bird`, 430, 200, 1.4)}
    ${npCloudBig(`${id}-c`, 480, 100, 0.85)}
  `);
}

function noahPage24(): string {
  // Noé solta a pomba.
  const id = "p24";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npNoah(`${id}-noah`, 200, 460, 1, "point")}
    ${npDovePremium(`${id}-dove`, 420, 220, 1.5)}
    ${npSunBig(`${id}-sun`, 510, 100, 42)}
  `);
}

function noahPage25(): string {
  // A pomba volta com ramo de oliveira.
  const id = "p25";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npCloudBig(`${id}-c`, 130, 110, 0.9)}
    ${npDovePremium(`${id}-dove`, 300, 250, 1.8)}
    ${npOliveBranch(`${id}-olive`, 230, 270)}
    ${npHillBack(`${id}-hill`)}
  `);
}

function noahPage26(): string {
  // A porta da arca se abre.
  const id = "p26";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npSunBig(`${id}-sun`, 300, 110, 56)}
    ${npArk(`${id}-ark`, 300, 360, 1.05, "open")}
  `);
}

function noahPage27(): string {
  // Animais saem.
  const id = "p27";
  return noahScene(`
    ${npSky(`${id}-sky`, 350)}
    ${npGround(`${id}-ground`, 350)}
    ${npArk(`${id}-ark`, 460, 360, 0.78, "open")}
    ${npElephant(`${id}-ele`, 170, 470, 0.95)}
    ${npLion(`${id}-lion`, 320, 510, 0.75)}
  `);
}

function noahPage28(): string {
  // Noé agradece a Deus.
  const id = "p28";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npGodLight(`${id}-light`)}
    ${npAltar(`${id}-alt`, 420, 440)}
    ${npNoah(`${id}-noah`, 200, 470, 1, "pray")}
  `);
}

function noahPage29(): string {
  // O arco-íris da promessa.
  const id = "p29";
  return noahScene(`
    ${npSky(`${id}-sky`, 380)}
    ${npGround(`${id}-ground`, 380)}
    ${npRainbowBig(`${id}-rb`, 300, 380, 520)}
    ${npCloudBig(`${id}-c1`, 70, 380, 0.9)}
    ${npCloudBig(`${id}-c2`, 530, 380, 0.9)}
    ${npNoah(`${id}-noah`, 300, 540, 0.7, "pray")}
  `);
}

function noahPage30(): string {
  // Final feliz — Noé, família e animais.
  const id = "p30";
  return noahScene(`
    ${npSky(`${id}-sky`, 360)}
    ${npGround(`${id}-ground`, 360)}
    ${npRainbowBig(`${id}-rb`, 300, 360, 540)}
    ${npFamily(`${id}-fam`, 200, 470, 0.9)}
    ${npLion(`${id}-lion`, 430, 480, 0.75)}
    ${npSheep(`${id}-sheep`, 530, 510, 0.6)}
  `);
}

function generateNoahPremiumPages(): string[] {
  return [
    noahPage1(),
    noahPage2(),
    noahPage3(),
    noahPage4(),
    noahPage5(),
    noahPage6(),
    noahPage7(),
    noahPage8(),
    noahPage9(),
    noahPage10(),
    noahPage11(),
    noahPage12(),
    noahPage13(),
    noahPage14(),
    noahPage15(),
    noahPage16(),
    noahPage17(),
    noahPage18(),
    noahPage19(),
    noahPage20(),
    noahPage21(),
    noahPage22(),
    noahPage23(),
    noahPage24(),
    noahPage25(),
    noahPage26(),
    noahPage27(),
    noahPage28(),
    noahPage29(),
    noahPage30(),
  ];
}

type ThemedStorySlug =
  | "o-nascimento-de-jesus"
  | "jesus-e-as-criancas"
  | "jesus-acalma-a-tempestade"
  | "a-multiplicacao-dos-paes"
  | "o-bom-samaritano"
  | "a-criacao-do-mundo"
  | "ester-rainha-corajosa"
  | "o-filho-prodigo"
  | "a-ovelha-perdida"
  | "o-semeador"
  | "a-casa-na-rocha";

type ThemedSceneConfig = {
  slug: ThemedStorySlug;
  horizon: "ground" | "sea" | "night" | "garden";
  hero: (id: string, variant: number) => string;
  symbol: (id: string, variant: number) => string;
};

const themedSceneConfigs: Record<ThemedStorySlug, ThemedSceneConfig> = {
  "o-nascimento-de-jesus": {
    slug: "o-nascimento-de-jesus",
    horizon: "night",
    hero: (id, v) =>
      v % 3 === 0
        ? stable(`${id}-estabulo`, 300, 440)
        : `${person(`${id}-maria`, 220, 440)}${person(`${id}-jose`, 380, 440)}${child(`${id}-bebe`, 300, 475)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? star(id, 300, 90, 34)
        : `${camel(`${id}-cam`, 150, 440)}${sheep(`${id}-ovelha`, 455, 470)}`,
  },
  "jesus-e-as-criancas": {
    slug: "jesus-e-as-criancas",
    horizon: "garden",
    hero: (id, v) =>
      `${person(`${id}-jesus`, v % 2 === 0 ? 300 : 220, 430)}${child(`${id}-c1`, 145, 475)}${child(`${id}-c2`, 455, 475)}${v % 3 === 0 ? child(`${id}-c3`, 300, 490) : ""}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? heart(id, 300, 210, 1.7)
        : `${dove(`${id}-dove`, 300, 150)}${flower(`${id}-flor`, 500, 480)}`,
  },
  "jesus-acalma-a-tempestade": {
    slug: "jesus-acalma-a-tempestade",
    horizon: "sea",
    hero: (id, v) =>
      `${person(`${id}-jesus`, 300, 370)}${v % 2 === 0 ? `${wave(`${id}-wv1`, 0, 345, 260, 90)}${wave(`${id}-wv2`, 340, 355, 260, 80)}` : fishBig(`${id}-barco`, 300, 500)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? `${cloud(`${id}-nuvem`, 300, 95, 1.4)}${dot(`${id}-chuva1`, 190, 220)}${dot(`${id}-chuva2`, 405, 230)}`
        : `${dove(`${id}-paz`, 300, 145)}${sun(`${id}-sol`, 500, 105, 42)}`,
  },
  "a-multiplicacao-dos-paes": {
    slug: "a-multiplicacao-dos-paes",
    horizon: "ground",
    hero: (id, v) =>
      `${person(`${id}-jesus`, 300, 430)}${basket(`${id}-cesto`, v % 2 === 0 ? 300 : 420, 470)}${bread(`${id}-pao1`, 250, 465)}${bread(`${id}-pao2`, 350, 465)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? `${fish(`${id}-f1`, 110, 500, 1, 1.4)}${fish(`${id}-f2`, 490, 500, -1, 1.4)}`
        : `${basket(`${id}-b1`, 130, 470)}${basket(`${id}-b2`, 470, 470)}`,
  },
  "o-bom-samaritano": {
    slug: "o-bom-samaritano",
    horizon: "ground",
    hero: (id, v) =>
      `${person(`${id}-sam`, 220, 430)}${person(`${id}-viajante`, 390, 445)}${v % 2 === 0 ? camel(`${id}-camelo`, 120, 430) : house(`${id}-casa`, 480, 430)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? heart(id, 300, 210, 1.6)
        : `${stone(`${id}-s1`, 120, 500)}${stone(`${id}-s2`, 500, 500)}${wellShape(`${id}-poco`, 300, 405)}`,
  },
  "a-criacao-do-mundo": {
    slug: "a-criacao-do-mundo",
    horizon: "garden",
    hero: (id, v) =>
      v % 2 === 0
        ? `${tree(`${id}-arv1`, 130, 430)}${tree(`${id}-arv2`, 460, 430)}${elephant(`${id}-ele`, 300, 455)}`
        : `${sun(`${id}-sol`, 170, 135, 48)}${moon(`${id}-lua`, 455, 115, 34)}${fish(`${id}-peixe`, 300, 510, 1, 1.5)}`,
    symbol: (id, v) =>
      v % 3 === 0
        ? `${bird(`${id}-b1`, 160, 140)}${bird(`${id}-b2`, 420, 125)}`
        : `${flower(`${id}-fl1`, 120, 475)}${flower(`${id}-fl2`, 500, 475)}`,
  },
  "ester-rainha-corajosa": {
    slug: "ester-rainha-corajosa",
    horizon: "ground",
    hero: (id, v) =>
      `${person(`${id}-ester`, 300, 430)}${crown(`${id}-coroa`, 300, 345)}${v % 2 === 0 ? person(`${id}-rei`, 455, 430) : scroll(`${id}-rolo`, 455, 210)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? `${lampStand(`${id}-lamp`, 130, 390)}${star(`${id}-st`, 470, 125)}`
        : `${heart(`${id}-cor`, 300, 215, 1.5)}${flower(`${id}-fl`, 120, 480)}`,
  },
  "o-filho-prodigo": {
    slug: "o-filho-prodigo",
    horizon: "ground",
    hero: (id, v) =>
      `${person(`${id}-pai`, 220, 430)}${child(`${id}-filho`, 390, 470)}${v % 2 === 0 ? house(`${id}-casa`, 500, 430) : heart(`${id}-abraco`, 305, 220, 1.5)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? `${tree(`${id}-arvore`, 95, 430, 0.9)}${stone(`${id}-caminho`, 300, 505, 18)}`
        : `${sun(`${id}-sol`, 490, 105, 42)}${flower(`${id}-fl`, 115, 480)}`,
  },
  "a-ovelha-perdida": {
    slug: "a-ovelha-perdida",
    horizon: "garden",
    hero: (id, v) =>
      `${person(`${id}-pastor`, 260, 430)}${sheep(`${id}-ovelha`, 405, 470)}${v % 2 === 0 ? sheep(`${id}-rebanho`, 125, 480) : tree(`${id}-arvore`, 500, 430, 0.85)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? heart(`${id}-amor`, 300, 210, 1.4)
        : `${hill(`${id}-colina`, 60, 395, 480, 70)}${dove(`${id}-dove`, 300, 145)}`,
  },
  "o-semeador": {
    slug: "o-semeador",
    horizon: "garden",
    hero: (id, v) =>
      `${person(`${id}-semeador`, 250, 430)}${dot(`${id}-semente1`, 345, 430, 5)}${dot(`${id}-semente2`, 390, 455, 5)}${dot(`${id}-semente3`, 430, 480, 5)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? `${bird(`${id}-pass1`, 125, 145)}${bird(`${id}-pass2`, 465, 125)}${grass(`${id}-broto`, 500, 500)}`
        : `${sun(`${id}-sol`, 495, 105, 42)}${flower(`${id}-fl`, 110, 480)}`,
  },
  "a-casa-na-rocha": {
    slug: "a-casa-na-rocha",
    horizon: "ground",
    hero: (id, v) =>
      `${house(`${id}-casa`, 300, 410)}${stone(`${id}-rocha1`, 250, 505, 28)}${stone(`${id}-rocha2`, 330, 505, 30)}${stone(`${id}-rocha3`, 410, 500, 24)}`,
    symbol: (id, v) =>
      v % 2 === 0
        ? `${cloud(`${id}-nuvem`, 300, 95, 1.35)}${dot(`${id}-chuva1`, 150, 230)}${dot(`${id}-chuva2`, 450, 230)}`
        : `${sun(`${id}-sol`, 500, 105, 42)}${rainbow(`${id}-rb`, 300, 385)}`,
  },
};

const themedBackplate = (cfg: ThemedSceneConfig, id: string, variant: number) => {
  if (cfg.horizon === "night") return `${sky(`${id}-night`, 370)}${ground(`${id}-g`, 370)}`;
  if (cfg.horizon === "sea")
    return `${sky(`${id}-sky`, 310 + (variant % 2) * 35)}${sea(`${id}-sea`, 330)}`;
  return `${sky(`${id}-sky`, 370)}${ground(`${id}-g`, 370)}`;
};

const themedLayouts: Array<(cfg: ThemedSceneConfig, i: number) => string> = [
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${sun(`sun-${i}`, 500, 105, 42)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${cloud(`c1-${i}`, 125, 95)}${c.symbol(`sym-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${tree(`t1-${i}`, 90, 430, 0.8)}${tree(`t2-${i}`, 515, 430, 0.8)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${moon(`moon-${i}`, 475, 95, 34)}${star(`st-${i}`, 130, 110)}${c.symbol(`sym-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${rainbow(`rb-${i}`, 300, 385)}${c.hero(`hero-${i}`, i)}${flower(`fl-${i}`, 95, 480)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${hill(`h-${i}`, 60, 395, 480, 60)}${c.symbol(`sym-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${dove(`dove-${i}`, 300, 140)}${heart(`heart-${i}`, 300, 225, 1.4)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${mountain(`m1-${i}`, 30, 370, 245, 120)}${mountain(`m2-${i}`, 330, 370, 230, 140)}${c.symbol(`sym-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${tent(`tent-${i}`, 300, 445)}${c.hero(`hero-${i}`, i)}${grass(`gr-${i}`, 510, 505)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${palm(`p1-${i}`, 100, 455, 0.9)}${palm(`p2-${i}`, 500, 455, 0.9)}${c.symbol(`sym-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${star(`s1-${i}`, 115, 90)}${star(`s2-${i}`, 300, 70, 18)}${star(`s3-${i}`, 485, 105)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${house(`house-${i}`, 300, 430)}${c.symbol(`sym-${i}`, i)}${sun(`sun-${i}`, 95, 105, 40)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${wellShape(`well-${i}`, 300, 405)}${c.hero(`hero-${i}`, i)}${flower(`fl-${i}`, 510, 480)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${cloud(`c-${i}`, 300, 95, 1.35)}${dot(`d1-${i}`, 140, 220)}${dot(`d2-${i}`, 310, 250)}${dot(`d3-${i}`, 475, 215)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${scroll(`scroll-${i}`, 300, 175)}${c.symbol(`sym-${i}`, i)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${bird(`b1-${i}`, 165, 135)}${bird(`b2-${i}`, 420, 120)}${c.hero(`hero-${i}`, i)}${c.symbol(`sym-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${flower(`f1-${i}`, 110, 475)}${flower(`f2-${i}`, 220, 500)}${flower(`f3-${i}`, 390, 500)}${flower(`f4-${i}`, 500, 475)}${c.symbol(`sym-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${c.symbol(`sym-${i}`, i)}${grass(`g1-${i}`, 120, 505)}${grass(`g2-${i}`, 440, 505)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.symbol(`sym-${i}`, i)}${c.hero(`hero-${i}`, i)}${cloud(`c-${i}`, 470, 135, 0.8)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${tablet(`tab-${i}`, 115, 175)}${dove(`dv-${i}`, 485, 170)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${fish(`f1-${i}`, 110, 510, 1, 1.2)}${fish(`f2-${i}`, 490, 520, -1, 1.2)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${stone(`st1-${i}`, 115, 500)}${stone(`st2-${i}`, 205, 480, 18)}${stone(`st3-${i}`, 485, 495, 16)}${c.symbol(`sym-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${sheep(`sh1-${i}`, 130, 475)}${sheep(`sh2-${i}`, 480, 475)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${mountain(`mt-${i}`, 135, 370, 330, 185)}${sun(`sun-${i}`, 300, 175, 38)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.symbol(`sym-${i}`, i)}${heart(`h1-${i}`, 130, 205)}${heart(`h2-${i}`, 470, 205)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.hero(`hero-${i}`, i)}${basket(`basket-${i}`, 300, 500)}${bread(`bread-${i}`, 300, 480)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${tree(`tree-${i}`, 300, 430, 1.25)}${c.symbol(`sym-${i}`, i)}${child(`child-${i}`, 470, 485)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${hill(`h1-${i}`, -20, 420, 285, 55)}${hill(`h2-${i}`, 340, 410, 300, 70)}${c.hero(`hero-${i}`, i)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${c.symbol(`sym-${i}`, i)}${c.hero(`hero-${i}`, i)}${rainbow(`rb-${i}`, 300, 390)}`,
  (c, i) =>
    `${themedBackplate(c, `bg-${i}`, i)}${sun(`sun-${i}`, 300, 95, 48)}${cloud(`c-${i}`, 300, 165)}${c.hero(`hero-${i}`, i)}${c.symbol(`sym-${i}`, i)}`,
];

function generateThemedStoryPages(slug: ThemedStorySlug): string[] {
  const cfg = themedSceneConfigs[slug];
  return themedLayouts.map((layout, index) => baseSvg(layout(cfg, index)));
}

// ----- Cenas: Noé e a Arca -----
const noeScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${sea(`sea-${i}`)}
    ${sun(`sun-${i}`, 500, 110, 50)}
    ${cloud(`c1-${i}`, 120, 130)}
    ${cloud(`c2-${i}`, 360, 90, 0.8)}
    ${rainbow(`rb-${i}`, 300, 380)}
    ${ark(`ark-${i}`, 300, 430)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 360)}
    ${ground(`g-${i}`, 360)}
    ${sun(`sun-${i}`, 110, 110, 45)}
    ${cloud(`c-${i}`, 420, 100)}
    ${ark(`ark-${i}`, 300, 360)}
    ${tree(`t1-${i}`, 80, 360)}
    ${tree(`t2-${i}`, 530, 360, 0.9)}
    ${grass(`gr1-${i}`, 200, 470)}
    ${grass(`gr2-${i}`, 380, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${sea(`sea-${i}`)}
    ${cloud(`c1-${i}`, 100, 80, 1.2)}
    ${cloud(`c2-${i}`, 480, 110, 1)}
    ${ark(`ark-${i}`, 300, 420)}
    ${dot(`rain1-${i}`, 80, 200, 4)}
    ${dot(`rain2-${i}`, 150, 240, 4)}
    ${dot(`rain3-${i}`, 250, 200, 4)}
    ${dot(`rain4-${i}`, 350, 230, 4)}
    ${dot(`rain5-${i}`, 480, 210, 4)}
    ${dot(`rain6-${i}`, 540, 250, 4)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sun(`sun-${i}`, 500, 100)}
    ${dove(`d1-${i}`, 200, 180)}
    ${dove(`d2-${i}`, 340, 130)}
    ${tree(`t-${i}`, 300, 380)}
    ${flower(`f1-${i}`, 90, 460)}
    ${flower(`f2-${i}`, 510, 460)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${rainbow(`rb-${i}`, 300, 380)}
    ${flower(`f1-${i}`, 100, 470)}
    ${flower(`f2-${i}`, 200, 500)}
    ${flower(`f3-${i}`, 300, 470)}
    ${flower(`f4-${i}`, 400, 500)}
    ${flower(`f5-${i}`, 500, 470)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 360)}
    ${ground(`g-${i}`, 360)}
    ${sun(`sun-${i}`, 300, 100, 50)}
    ${giraffe(`g1-${i}`, 150, 350)}
    ${elephant(`e1-${i}`, 360, 350)}
    ${tree(`t-${i}`, 520, 360, 0.8)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${sea(`sea-${i}`)}
    ${sun(`sun-${i}`, 480, 130)}
    ${cloud(`c-${i}`, 130, 100)}
    ${fish(`f1-${i}`, 100, 500, 1, 1.4)}
    ${fish(`f2-${i}`, 380, 540, 1, 1.2)}
    ${ark(`ark-${i}`, 300, 420)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${rainbow(`rb-${i}`, 300, 380)}
    ${dove(`d-${i}`, 300, 150)}
    ${ark(`ark-${i}`, 300, 380)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sun(`sun-${i}`, 500, 110)}
    ${sheep(`s1-${i}`, 130, 460)}
    ${sheep(`s2-${i}`, 250, 470)}
    ${sheep(`s3-${i}`, 400, 460)}
    ${sheep(`s4-${i}`, 520, 470)}
    ${tree(`t-${i}`, 60, 460, 0.8)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 300, 440)}
    ${dove(`d-${i}`, 380, 200)}
    ${tree(`t1-${i}`, 100, 440, 0.9)}
    ${tree(`t2-${i}`, 500, 440, 0.9)}
    ${rainbow(`rb-${i}`, 300, 380)}
  `),
];

// ----- Cenas: Davi e Golias -----
const daviScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sun(`sun-${i}`, 500, 110)}
    ${mountain(`m1-${i}`, 0, 380, 280, 140)}
    ${mountain(`m2-${i}`, 320, 380, 280, 120)}
    ${child(`davi-${i}`, 220, 430)}
    ${person(`gol-${i}`, 420, 420)}
    ${stone(`s-${i}`, 300, 470, 12)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sun(`sun-${i}`, 110, 110)}
    ${sheep(`s1-${i}`, 150, 460)}
    ${sheep(`s2-${i}`, 280, 470)}
    ${sheep(`s3-${i}`, 410, 460)}
    ${child(`davi-${i}`, 500, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${stone(`s1-${i}`, 120, 460, 18)}
    ${stone(`s2-${i}`, 200, 480, 14)}
    ${stone(`s3-${i}`, 280, 460, 16)}
    ${stone(`s4-${i}`, 380, 480, 14)}
    ${stone(`s5-${i}`, 460, 460, 18)}
    ${cloud(`c-${i}`, 300, 100)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${tent(`t1-${i}`, 150, 440)}
    ${tent(`t2-${i}`, 300, 440)}
    ${tent(`t3-${i}`, 450, 440)}
    ${moon(`m-${i}`, 480, 100)}
    ${star(`st-${i}`, 120, 100)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 300, 440)}
    ${crown(`cr-${i}`, 300, 360)}
    ${star(`st1-${i}`, 120, 150)}
    ${star(`st2-${i}`, 480, 150)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sun(`sun-${i}`, 300, 100, 60)}
    ${child(`davi-${i}`, 200, 440)}
    ${sheep(`s-${i}`, 400, 470)}
    ${tree(`t-${i}`, 530, 440, 0.9)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${mountain(`m-${i}`, 200, 380, 200, 160)}
    ${sun(`sun-${i}`, 300, 200, 40)}
    ${person(`p-${i}`, 100, 450)}
    ${person(`p2-${i}`, 500, 450)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${child(`davi-${i}`, 300, 430)}
    ${stone(`s1-${i}`, 200, 480, 12)}
    ${stone(`s2-${i}`, 400, 480, 12)}
    ${flower(`f1-${i}`, 100, 480)}
    ${flower(`f2-${i}`, 500, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 300, 440)}
    ${crown(`cr-${i}`, 300, 360)}
    ${heart(`h1-${i}`, 130, 200, 1.4)}
    ${heart(`h2-${i}`, 470, 200, 1.4)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${child(`davi-${i}`, 200, 440)}
    ${person(`gol-${i}`, 420, 420)}
    ${cloud(`c-${i}`, 300, 100)}
    ${dove(`d-${i}`, 300, 200)}
  `),
];

// ----- Cenas: Jonas e a Baleia -----
const jonasScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 280)}
    ${sea(`sea-${i}`, 280)}
    ${sun(`sun-${i}`, 120, 100, 50)}
    ${cloud(`c-${i}`, 420, 100)}
    ${whale(`w-${i}`, 320, 430)}
    ${fish(`f1-${i}`, 80, 520)}
    ${fish(`f2-${i}`, 480, 540, -1)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 300)}
    ${sea(`sea-${i}`, 300)}
    ${sun(`sun-${i}`, 500, 120)}
    ${wave(`wv1-${i}`, 0, 300, 200, 60)}
    ${wave(`wv2-${i}`, 200, 300, 200, 80)}
    ${wave(`wv3-${i}`, 400, 300, 200, 60)}
    ${whale(`w-${i}`, 300, 480, 0.7)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 280)}
    ${sea(`sea-${i}`, 280)}
    ${cloud(`c1-${i}`, 100, 80)}
    ${cloud(`c2-${i}`, 400, 110)}
    ${moon(`m-${i}`, 480, 90)}
    ${star(`s1-${i}`, 200, 100)}
    ${star(`s2-${i}`, 350, 60)}
    ${whale(`w-${i}`, 300, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 300)}
    ${sea(`sea-${i}`, 300)}
    ${person(`p-${i}`, 300, 380)}
    ${wave(`wv1-${i}`, 50, 360, 200, 60)}
    ${wave(`wv2-${i}`, 350, 360, 200, 60)}
    ${sun(`sun-${i}`, 110, 100)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 280)}
    ${sea(`sea-${i}`, 280)}
    ${whale(`w-${i}`, 300, 430)}
    ${splash(`sp-${i}`, 300, 280)}
    ${cloud(`c-${i}`, 130, 90)}
    ${sun(`sun-${i}`, 500, 100)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 280)}
    ${sea(`sea-${i}`, 280)}
    ${fish(`f1-${i}`, 80, 380, 1, 1.4)}
    ${fish(`f2-${i}`, 220, 440, 1, 1.2)}
    ${fish(`f3-${i}`, 360, 400, -1, 1.4)}
    ${fish(`f4-${i}`, 480, 460, -1, 1.2)}
    ${whale(`w-${i}`, 300, 530, 0.5)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 300, 440)}
    ${tree(`t-${i}`, 480, 440)}
    ${sun(`sun-${i}`, 110, 110)}
    ${grass(`gr-${i}`, 100, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 280)}
    ${sea(`sea-${i}`, 280)}
    ${whale(`w-${i}`, 300, 440)}
    ${rainbow(`rb-${i}`, 300, 280)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 280)}
    ${sea(`sea-${i}`, 280)}
    ${sun(`sun-${i}`, 300, 130, 50)}
    ${fishBig(`fb-${i}`, 300, 430)}
    ${fish(`f1-${i}`, 100, 520)}
    ${fish(`f2-${i}`, 500, 520, -1)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 300)}
    ${ground(`sand-${i}`, 300)}
    ${whale(`w-${i}`, 300, 240, 0.5)}
    ${person(`p-${i}`, 300, 460)}
    ${palm(`pa-${i}`, 90, 460)}
    ${palm(`pa2-${i}`, 510, 460)}
  `),
];

// ----- Cenas: Moisés e o Mar Vermelho -----
const moisesScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${sun(`sun-${i}`, 300, 320, 60)}
    ${wave(`wv-l-${i}`, 0, 380, 180, 200)}
    ${wave(`wv-r-${i}`, 420, 380, 180, 200)}
    ${person(`m-${i}`, 300, 470)}
    <rect id="fill-staff-${i}" x="332" y="430" width="6" height="80" />
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${person(`m-${i}`, 300, 440)}
    ${child(`c1-${i}`, 180, 460)}
    ${child(`c2-${i}`, 420, 460)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${sea(`sea-${i}`)}
    ${wave(`wv1-${i}`, 50, 380, 200, 80)}
    ${wave(`wv2-${i}`, 350, 380, 200, 80)}
    ${sun(`sun-${i}`, 300, 120, 50)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${tent(`t1-${i}`, 120, 440)}
    ${tent(`t2-${i}`, 300, 440)}
    ${tent(`t3-${i}`, 480, 440)}
    ${moon(`m-${i}`, 480, 100)}
    ${star(`st-${i}`, 120, 130)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${person(`m-${i}`, 300, 440)}
    ${tablet(`tb-${i}`, 300, 200)}
    ${mountain(`mt-${i}`, 100, 380, 400, 200)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${cloud(`c-${i}`, 300, 100, 1.5)}
    ${person(`m-${i}`, 300, 440)}
    ${dot(`d1-${i}`, 200, 200, 5)}
    ${dot(`d2-${i}`, 400, 200, 5)}
    ${dot(`d3-${i}`, 300, 280, 6)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${camel(`ca1-${i}`, 150, 430)}
    ${camel(`ca2-${i}`, 380, 430)}
    ${palm(`pa-${i}`, 530, 440, 0.8)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${person(`m-${i}`, 200, 440)}
    ${person(`p2-${i}`, 400, 440)}
    ${sun(`sun-${i}`, 300, 120, 60)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${wellShape(`w-${i}`, 300, 400)}
    ${palm(`p-${i}`, 100, 440)}
    ${palm(`p2-${i}`, 510, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`sand-${i}`, 380)}
    ${person(`m-${i}`, 300, 440)}
    ${dove(`d1-${i}`, 150, 180)}
    ${dove(`d2-${i}`, 450, 180)}
    ${rainbow(`rb-${i}`, 300, 380)}
  `),
];

// ----- Cenas: Daniel na Cova dos Leões -----
const danielScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`d-${i}`, 300, 450)}
    ${lion(`l1-${i}`, 130, 470)}
    ${lion(`l2-${i}`, 470, 470)}
    ${moon(`m-${i}`, 500, 100)}
    ${star(`st-${i}`, 130, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${lion(`l1-${i}`, 150, 460)}
    ${lion(`l2-${i}`, 300, 470)}
    ${lion(`l3-${i}`, 450, 460)}
    ${sun(`sun-${i}`, 300, 110, 50)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`d-${i}`, 300, 440)}
    ${dove(`d-${i}`, 300, 220)}
    ${flower(`f1-${i}`, 100, 470)}
    ${flower(`f2-${i}`, 500, 470)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${house(`h-${i}`, 300, 440)}
    ${sun(`sun-${i}`, 110, 110)}
    ${tree(`t-${i}`, 510, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 200, 440)}
    ${person(`p2-${i}`, 400, 440)}
    ${crown(`cr-${i}`, 400, 370)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${lion(`l-${i}`, 300, 450)}
    ${star(`st1-${i}`, 100, 100)}
    ${star(`st2-${i}`, 500, 100)}
    ${star(`st3-${i}`, 300, 80)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`d-${i}`, 300, 440)}
    ${tablet(`tb-${i}`, 300, 200)}
    ${cloud(`c-${i}`, 110, 100)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${lampStand(`ls-${i}`, 300, 380)}
    ${person(`d-${i}`, 200, 440)}
    ${person(`p2-${i}`, 400, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${lion(`l1-${i}`, 200, 470)}
    ${lion(`l2-${i}`, 400, 470)}
    ${heart(`h-${i}`, 300, 200, 2)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`d-${i}`, 300, 440)}
    ${lion(`l-${i}`, 480, 470)}
    ${dove(`dv-${i}`, 130, 180)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
];

// ----- Cenas: Nascimento de Jesus -----
const nascimentoScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${star(`big-${i}`, 300, 100, 35)}
    ${star(`s1-${i}`, 120, 140, 8)}
    ${star(`s2-${i}`, 480, 160, 8)}
    ${stable(`st-${i}`, 300, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`mary-${i}`, 220, 440)}
    ${person(`joseph-${i}`, 380, 440)}
    ${child(`baby-${i}`, 300, 470)}
    ${star(`st-${i}`, 300, 100, 30)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sheep(`s1-${i}`, 130, 460)}
    ${sheep(`s2-${i}`, 280, 470)}
    ${sheep(`s3-${i}`, 430, 460)}
    ${person(`shep-${i}`, 530, 440)}
    ${star(`st-${i}`, 300, 100, 25)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${camel(`c-${i}`, 150, 440)}
    ${person(`mag1-${i}`, 320, 440)}
    ${person(`mag2-${i}`, 420, 440)}
    ${person(`mag3-${i}`, 520, 440)}
    ${star(`st-${i}`, 300, 100, 30)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${dove(`d1-${i}`, 200, 150)}
    ${dove(`d2-${i}`, 400, 150)}
    ${star(`st-${i}`, 300, 80, 35)}
    ${stable(`st2-${i}`, 300, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${child(`baby-${i}`, 300, 460)}
    <rect id="fill-manger-${i}" x="240" y="450" width="120" height="60" rx="8" />
    ${star(`st-${i}`, 300, 100, 30)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`ang-${i}`, 300, 300)}
    ${dove(`d-${i}`, 300, 200)}
    ${person(`shep1-${i}`, 150, 460)}
    ${person(`shep2-${i}`, 450, 460)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${star(`st1-${i}`, 100, 80, 14)}
    ${star(`st2-${i}`, 200, 130, 12)}
    ${star(`st3-${i}`, 300, 80, 18)}
    ${star(`st4-${i}`, 400, 130, 12)}
    ${star(`st5-${i}`, 500, 80, 14)}
    ${stable(`st-${i}`, 300, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`mary-${i}`, 300, 440)}
    ${child(`baby-${i}`, 300, 480)}
    ${heart(`h-${i}`, 300, 200, 2)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${stable(`st-${i}`, 300, 440)}
    ${sheep(`sh-${i}`, 130, 470)}
    ${dove(`d-${i}`, 480, 180)}
    ${star(`s-${i}`, 300, 100, 30)}
  `),
];

// ----- Cenas: Jesus e as Crianças -----
const jesusCriancasScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${child(`c1-${i}`, 180, 470)}
    ${child(`c2-${i}`, 420, 470)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${child(`c1-${i}`, 130, 470)}
    ${child(`c2-${i}`, 230, 470)}
    ${child(`c3-${i}`, 370, 470)}
    ${child(`c4-${i}`, 470, 470)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${heart(`h1-${i}`, 130, 200, 1.4)}
    ${heart(`h2-${i}`, 470, 200, 1.4)}
    ${dove(`d-${i}`, 300, 130)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${tree(`t-${i}`, 300, 440, 1.3)}
    ${child(`c1-${i}`, 130, 480)}
    ${child(`c2-${i}`, 470, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${flower(`f1-${i}`, 100, 480)}
    ${flower(`f2-${i}`, 200, 500)}
    ${flower(`f3-${i}`, 400, 500)}
    ${flower(`f4-${i}`, 500, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${child(`c1-${i}`, 200, 470)}
    ${child(`c2-${i}`, 400, 470)}
    ${rainbow(`rb-${i}`, 300, 380)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${sheep(`s1-${i}`, 130, 470)}
    ${sheep(`s2-${i}`, 470, 470)}
    ${dove(`d-${i}`, 300, 150)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${child(`c1-${i}`, 180, 470)}
    ${child(`c2-${i}`, 420, 470)}
    ${star(`s1-${i}`, 130, 130, 12)}
    ${star(`s2-${i}`, 470, 130, 12)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 200, 430)}
    ${child(`c1-${i}`, 350, 470)}
    ${child(`c2-${i}`, 450, 470)}
    ${tree(`t-${i}`, 530, 440, 0.9)}
    ${flower(`f-${i}`, 90, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${child(`c1-${i}`, 130, 470)}
    ${child(`c2-${i}`, 470, 470)}
    ${heart(`h-${i}`, 300, 250, 1.6)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
];

// ----- Cenas: Multiplicação dos Pães -----
const paesScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${basket(`b-${i}`, 300, 470)}
    ${bread(`b1-${i}`, 280, 460)}
    ${bread(`b2-${i}`, 320, 460)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${bread(`b1-${i}`, 100, 470)}
    ${bread(`b2-${i}`, 200, 480)}
    ${bread(`b3-${i}`, 300, 470)}
    ${bread(`b4-${i}`, 400, 480)}
    ${bread(`b5-${i}`, 500, 470)}
    ${sun(`sun-${i}`, 300, 110, 50)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${fish(`f1-${i}`, 120, 470, 1, 1.6)}
    ${fish(`f2-${i}`, 380, 470, 1, 1.6)}
    ${basket(`b-${i}`, 300, 460)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 300, 430)}
    ${child(`c-${i}`, 200, 470)}
    ${basket(`b-${i}`, 200, 510)}
    ${dove(`d-${i}`, 300, 200)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p1-${i}`, 130, 440)}
    ${person(`p2-${i}`, 250, 440)}
    ${person(`p3-${i}`, 370, 440)}
    ${person(`p4-${i}`, 490, 440)}
    ${sun(`sun-${i}`, 300, 110, 50)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${basket(`b1-${i}`, 130, 460)}
    ${basket(`b2-${i}`, 300, 460)}
    ${basket(`b3-${i}`, 470, 460)}
    ${cloud(`c-${i}`, 300, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${sea(`sea-${i}`)}
    ${person(`j-${i}`, 300, 350)}
    ${fish(`f1-${i}`, 100, 500)}
    ${fish(`f2-${i}`, 500, 500, -1)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${bread(`b1-${i}`, 130, 460)}
    ${bread(`b2-${i}`, 200, 480)}
    ${fish(`f1-${i}`, 350, 470)}
    ${fish(`f2-${i}`, 480, 470, -1)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`j-${i}`, 200, 430)}
    ${child(`c-${i}`, 400, 470)}
    ${heart(`h-${i}`, 300, 250)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${basket(`b-${i}`, 300, 460)}
    ${bread(`b1-${i}`, 270, 450)}
    ${bread(`b2-${i}`, 330, 450)}
    ${bread(`b3-${i}`, 300, 470)}
    ${dove(`d-${i}`, 130, 180)}
    ${dove(`d2-${i}`, 470, 180)}
  `),
];

// ----- Cenas: Bom Samaritano -----
const samaritanoScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`s-${i}`, 200, 430)}
    ${person(`p-${i}`, 400, 440)}
    ${tree(`t-${i}`, 540, 440, 0.8)}
    ${sun(`sun-${i}`, 110, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${camel(`c-${i}`, 200, 430)}
    ${person(`p-${i}`, 420, 440)}
    ${palm(`pa-${i}`, 530, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${house(`h-${i}`, 300, 440)}
    ${sun(`sun-${i}`, 500, 110)}
    ${tree(`t-${i}`, 90, 440, 0.8)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`s1-${i}`, 200, 440)}
    ${person(`s2-${i}`, 400, 440)}
    ${heart(`h-${i}`, 300, 200, 2)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${stone(`s1-${i}`, 130, 480, 16)}
    ${stone(`s2-${i}`, 220, 470, 12)}
    ${stone(`s3-${i}`, 380, 470, 14)}
    ${stone(`s4-${i}`, 470, 480, 16)}
    ${person(`p-${i}`, 300, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${wellShape(`w-${i}`, 300, 400)}
    ${person(`p-${i}`, 150, 440)}
    ${person(`p2-${i}`, 470, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 300, 440)}
    ${flower(`f1-${i}`, 100, 470)}
    ${flower(`f2-${i}`, 500, 470)}
    ${dove(`d-${i}`, 300, 150)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${tent(`t-${i}`, 300, 440)}
    ${sun(`sun-${i}`, 110, 110)}
    ${moon(`m-${i}`, 480, 110)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`s1-${i}`, 150, 440)}
    ${person(`s2-${i}`, 300, 440)}
    ${person(`s3-${i}`, 450, 440)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`p-${i}`, 300, 440)}
    ${heart(`h1-${i}`, 130, 200)}
    ${heart(`h2-${i}`, 470, 200)}
    ${rainbow(`rb-${i}`, 300, 380)}
  `),
];

// ----- Cenas: Criação do Mundo -----
const criacaoScenes: SceneFn[] = [
  (i) =>
    baseSvg(`
    <rect id="fill-bg-${i}" x="0" y="0" width="600" height="600" />
    <circle id="fill-earth-${i}" cx="300" cy="320" r="140" />
    <path id="fill-c1-${i}" d="M220 280 Q260 260 300 290 Q340 270 360 310 Q330 350 290 340 Q250 360 220 320 Z" />
    <path id="fill-c2-${i}" d="M280 380 Q320 370 350 400 Q330 430 290 420 Z" />
    ${sun(`sun-${i}`, 130, 130, 40)}
    ${moon(`moon-${i}`, 470, 130, 35)}
    ${star(`s1-${i}`, 100, 250, 12)}
    ${star(`s2-${i}`, 500, 280, 12)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 600)}
    ${sun(`sun-${i}`, 300, 300, 80)}
    ${cloud(`c1-${i}`, 130, 130)}
    ${cloud(`c2-${i}`, 470, 130)}
    ${star(`s1-${i}`, 100, 80, 12)}
    ${star(`s2-${i}`, 500, 80, 12)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${sea(`sea-${i}`)}
    ${sun(`sun-${i}`, 300, 110, 60)}
    ${fish(`f1-${i}`, 120, 480, 1, 1.4)}
    ${fish(`f2-${i}`, 380, 520, 1, 1.4)}
    ${fish(`f3-${i}`, 480, 480, -1, 1.4)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${tree(`t1-${i}`, 100, 440)}
    ${tree(`t2-${i}`, 300, 440, 1.3)}
    ${tree(`t3-${i}`, 500, 440)}
    ${flower(`f1-${i}`, 200, 490)}
    ${flower(`f2-${i}`, 400, 490)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`night-${i}`, 600)}
    ${moon(`m-${i}`, 300, 300, 80)}
    ${star(`s1-${i}`, 100, 100, 14)}
    ${star(`s2-${i}`, 500, 100, 14)}
    ${star(`s3-${i}`, 150, 480, 12)}
    ${star(`s4-${i}`, 450, 480, 12)}
    ${star(`s5-${i}`, 300, 100, 16)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${bird(`b1-${i}`, 120, 150)}
    ${bird(`b2-${i}`, 300, 110)}
    ${bird(`b3-${i}`, 480, 150)}
    ${tree(`t-${i}`, 300, 440, 1.4)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${lion(`l-${i}`, 150, 460)}
    ${sheep(`sh-${i}`, 300, 470)}
    ${elephant(`e-${i}`, 470, 450)}
    ${sun(`sun-${i}`, 300, 110, 50)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${person(`adam-${i}`, 200, 440)}
    ${person(`eve-${i}`, 400, 440)}
    ${tree(`t-${i}`, 530, 440, 0.9)}
    ${flower(`f-${i}`, 100, 490)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${rainbow(`rb-${i}`, 300, 380)}
    ${dove(`d-${i}`, 300, 200)}
    ${flower(`f1-${i}`, 130, 480)}
    ${flower(`f2-${i}`, 470, 480)}
  `),
  (i) =>
    baseSvg(`
    ${sky(`sky-${i}`, 380)}
    ${ground(`g-${i}`, 380)}
    ${sun(`sun-${i}`, 110, 110)}
    ${moon(`m-${i}`, 490, 110)}
    ${tree(`t-${i}`, 300, 440, 1.2)}
    ${heart(`h-${i}`, 300, 220)}
  `),
];

// ============= Primitivas premium do Antigo Testamento =============
//
// Extensão do conjunto `np*` (No\u00e9 premium) para cobrir personagens e
// elementos espec\u00edficos das demais hist\u00f3rias do AT: Davi (jovem
// pastor), Golias (gigante armado), Mois\u00e9s (cajado erguido), Daniel,
// rei/Ester, ba\u00edreia, peixes, mar dividido, palme/palco, etc.
// Mant\u00e9m o mesmo padr\u00e3o visual: stroke #2A2622, espessura 3.6,
// regi\u00f5es grandes (id="fill-..."), composi\u00e7\u00e3o cheia.

const npBoy = (
  id: string,
  cx: number,
  cy: number,
  scale = 1,
  pose: "stand" | "sling" | "stone" = "stand",
) => {
  const s = scale;
  const headR = 26 * s;
  const tunicW = 80 * s;
  const tunicH = 110 * s;
  const headCY = cy - tunicH - headR + 6 * s;
  return `
    <circle id="fill-${id}-head" cx="${cx}" cy="${headCY}" r="${headR}" />
    <path id="fill-${id}-hair" d="M${cx - headR} ${headCY - 4} q${headR} -${headR + 6 * s} ${2 * headR} 0 q-${headR / 2} -${4 * s} -${headR} -${4 * s} q-${headR / 2} 0 -${headR} ${4 * s} z" />
    <circle cx="${cx - headR / 3}" cy="${headCY}" r="${3 * s}" fill="#2A2622" stroke="none" />
    <circle cx="${cx + headR / 3}" cy="${headCY}" r="${3 * s}" fill="#2A2622" stroke="none" />
    <path d="M${cx - 7 * s} ${headCY + 9 * s} q${7 * s} ${5 * s} ${14 * s} 0" fill="none" />
    <rect id="fill-${id}-tunic" x="${cx - tunicW / 2}" y="${cy - tunicH}" width="${tunicW}" height="${tunicH}" rx="${10 * s}" />
    <rect id="fill-${id}-belt" x="${cx - tunicW / 2 - 4 * s}" y="${cy - tunicH / 2}" width="${tunicW + 8 * s}" height="${10 * s}" />
    <rect id="fill-${id}-leg-l" x="${cx - 28 * s}" y="${cy - 6 * s}" width="${22 * s}" height="${44 * s}" rx="${6 * s}" />
    <rect id="fill-${id}-leg-r" x="${cx + 6 * s}" y="${cy - 6 * s}" width="${22 * s}" height="${44 * s}" rx="${6 * s}" />
    ${
      pose === "sling"
        ? `<path id="fill-${id}-arm" d="M${cx + tunicW / 2} ${cy - tunicH + 28 * s} q${50 * s} -${20 * s} ${80 * s} ${20 * s}" fill="none" stroke-width="14" />
           <circle id="fill-${id}-stone" cx="${cx + tunicW / 2 + 90 * s}" cy="${cy - tunicH + 60 * s}" r="${10 * s}" />`
        : pose === "stone"
          ? `<path id="fill-${id}-arm" d="M${cx - tunicW / 2} ${cy - tunicH + 28 * s} q-${30 * s} -${10 * s} -${50 * s} -${30 * s}" fill="none" stroke-width="14" />
             <circle id="fill-${id}-stone" cx="${cx - tunicW / 2 - 56 * s}" cy="${cy - tunicH - 6 * s}" r="${12 * s}" />`
          : `<path id="fill-${id}-arm-l" d="M${cx - tunicW / 2} ${cy - tunicH + 28 * s} q-${20 * s} ${30 * s} -${30 * s} ${50 * s}" fill="none" stroke-width="14" />
             <path id="fill-${id}-arm-r" d="M${cx + tunicW / 2} ${cy - tunicH + 28 * s} q${20 * s} ${30 * s} ${30 * s} ${50 * s}" fill="none" stroke-width="14" />`
    }
  `;
};

const npGoliath = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const headR = 38 * s;
  const torsoW = 140 * s;
  const torsoH = 170 * s;
  const headCY = cy - torsoH - headR + 8 * s;
  return `
    <rect id="fill-${id}-helmet" x="${cx - headR}" y="${headCY - headR - 6 * s}" width="${2 * headR}" height="${headR + 10 * s}" rx="${headR}" />
    <circle id="fill-${id}-head" cx="${cx}" cy="${headCY + 8 * s}" r="${headR - 2 * s}" />
    <path id="fill-${id}-beard" d="M${cx - headR + 6 * s} ${headCY + 14 * s} q${headR - 6 * s} ${headR} ${2 * (headR - 6 * s)} 0 v${20 * s} h-${2 * (headR - 6 * s)} z" />
    <rect id="fill-${id}-armor" x="${cx - torsoW / 2}" y="${cy - torsoH}" width="${torsoW}" height="${torsoH}" rx="${14 * s}" />
    <path id="fill-${id}-chest" d="M${cx - 50 * s} ${cy - torsoH + 30 * s} h${100 * s} v${60 * s} h-${100 * s} z" />
    <rect id="fill-${id}-skirt" x="${cx - torsoW / 2 - 10 * s}" y="${cy - 10 * s}" width="${torsoW + 20 * s}" height="${56 * s}" rx="${8 * s}" />
    <rect id="fill-${id}-leg-l" x="${cx - 50 * s}" y="${cy + 46 * s}" width="${36 * s}" height="${64 * s}" rx="${8 * s}" />
    <rect id="fill-${id}-leg-r" x="${cx + 14 * s}" y="${cy + 46 * s}" width="${36 * s}" height="${64 * s}" rx="${8 * s}" />
    <rect id="fill-${id}-spear-shaft" x="${cx + torsoW / 2 + 10 * s}" y="${cy - torsoH - 60 * s}" width="${10 * s}" height="${torsoH + 110 * s}" />
    <path id="fill-${id}-spear-tip" d="M${cx + torsoW / 2 + 8 * s} ${cy - torsoH - 60 * s} l${14 * s} -${30 * s} l${14 * s} ${30 * s} z" />
    <path id="fill-${id}-shield" d="M${cx - torsoW / 2 - 56 * s} ${cy - torsoH + 40 * s} q-${24 * s} ${50 * s} 0 ${100 * s} q${24 * s} -${50 * s} 0 -${100 * s} z" />
  `;
};

const npWhalePremium = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const rx = 200 * s;
  const ry = 110 * s;
  return `
    <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />
    <path id="fill-${id}-belly" d="M${cx - rx + 30 * s} ${cy + 10 * s} q${rx - 30 * s} ${ry} ${2 * (rx - 30 * s)} 0 q-${rx - 30 * s} ${ry / 2} -${2 * (rx - 30 * s)} 0 z" />
    <path id="fill-${id}-tail" d="M${cx - rx + 6 * s} ${cy} q-${60 * s} -${30 * s} -${90 * s} -${70 * s} q${20 * s} ${50 * s} ${20 * s} ${70 * s} q-${30 * s} ${20 * s} -${10 * s} ${50 * s} q${40 * s} -${10 * s} ${80 * s} -${50 * s} z" />
    <path id="fill-${id}-fin" d="M${cx + 30 * s} ${cy + ry - 10 * s} q${30 * s} ${30 * s} ${70 * s} ${10 * s} q-${30 * s} -${20 * s} -${70 * s} -${10 * s} z" />
    <path id="fill-${id}-spout" d="M${cx + 60 * s} ${cy - ry - 10 * s} q-${20 * s} -${50 * s} ${10 * s} -${90 * s} q${30 * s} ${40 * s} ${10 * s} ${90 * s} z" />
    <circle id="fill-${id}-eye" cx="${cx + rx - 50 * s}" cy="${cy - 30 * s}" r="${10 * s}" />
    <path d="M${cx + 60 * s} ${cy + 4 * s} q${40 * s} ${20 * s} ${80 * s} 0" fill="none" />
  `;
};

const npFishBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="${50 * s}" ry="${28 * s}" />
    <path id="fill-${id}-tail" d="M${cx - 50 * s} ${cy} l-${30 * s} -${22 * s} v${44 * s} z" />
    <circle id="fill-${id}-eye" cx="${cx + 30 * s}" cy="${cy - 4 * s}" r="${4 * s}" />
    <path id="fill-${id}-fin" d="M${cx} ${cy + 20 * s} q${10 * s} ${16 * s} ${24 * s} 0 z" />
  `;
};

const npBoatBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const w = 200 * s;
  return `
    <path id="fill-${id}-hull" d="M${cx - w} ${cy} q${w} ${50 * s} ${2 * w} 0 l-${30 * s} ${40 * s} q-${w - 30 * s} ${30 * s} -${2 * (w - 30 * s)} 0 z" />
    <rect id="fill-${id}-mast" x="${cx - 4 * s}" y="${cy - 130 * s}" width="${8 * s}" height="${130 * s}" />
    <path id="fill-${id}-sail" d="M${cx + 4 * s} ${cy - 130 * s} q${80 * s} ${30 * s} ${20 * s} ${110 * s} z" />
    <path id="fill-${id}-flag" d="M${cx - 4 * s} ${cy - 130 * s} l-${30 * s} ${10 * s} l${30 * s} ${20 * s} z" />
  `;
};

const npSeaSplit = (id: string) => `
  <path id="fill-${id}-wall-l" d="M14 360 q140 -180 280 -180 v220 h-280 z" />
  <path id="fill-${id}-wall-r" d="M586 360 q-140 -180 -280 -180 v220 h280 z" />
  <rect id="fill-${id}-path" x="180" y="380" width="240" height="206" />
  <path d="M50 320 q40 -20 80 0" fill="none" />
  <path d="M70 270 q40 -20 80 0" fill="none" />
  <path d="M450 320 q40 -20 80 0" fill="none" />
  <path d="M470 270 q40 -20 80 0" fill="none" />
`;

const npAdam = (id: string, cx: number, cy: number, scale = 1) => npNoah(id, cx, cy, scale, "idle");

const npEve = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const headR = 30 * s;
  const dressW = 90 * s;
  const dressH = 130 * s;
  const headCY = cy - dressH - headR + 6 * s;
  return `
    <circle id="fill-${id}-head" cx="${cx}" cy="${headCY}" r="${headR}" />
    <path id="fill-${id}-hair" d="M${cx - headR - 6 * s} ${headCY - 4 * s} q${headR + 6 * s} -${headR + 14 * s} ${2 * (headR + 6 * s)} 0 v${headR + 30 * s} h-${2 * (headR + 6 * s)} z" />
    <circle cx="${cx - headR / 3}" cy="${headCY}" r="${3 * s}" fill="#2A2622" stroke="none" />
    <circle cx="${cx + headR / 3}" cy="${headCY}" r="${3 * s}" fill="#2A2622" stroke="none" />
    <path d="M${cx - 7 * s} ${headCY + 10 * s} q${7 * s} ${6 * s} ${14 * s} 0" fill="none" />
    <path id="fill-${id}-dress" d="M${cx - dressW / 2} ${cy - dressH} h${dressW} l${20 * s} ${dressH} h-${dressW + 40 * s} z" />
    <rect id="fill-${id}-leg-l" x="${cx - 24 * s}" y="${cy}" width="${20 * s}" height="${40 * s}" rx="${5 * s}" />
    <rect id="fill-${id}-leg-r" x="${cx + 4 * s}" y="${cy}" width="${20 * s}" height="${40 * s}" rx="${5 * s}" />
  `;
};

const npTreeBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <rect id="fill-${id}-trunk" x="${cx - 24 * s}" y="${cy - 80 * s}" width="${48 * s}" height="${130 * s}" rx="${8 * s}" />
    <circle id="fill-${id}-leaves" cx="${cx}" cy="${cy - 130 * s}" r="${90 * s}" />
    <circle id="fill-${id}-fruit-l" cx="${cx - 40 * s}" cy="${cy - 110 * s}" r="${12 * s}" />
    <circle id="fill-${id}-fruit-r" cx="${cx + 40 * s}" cy="${cy - 130 * s}" r="${12 * s}" />
  `;
};

const npFlowerBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const r = 14 * s;
  return `
    <circle id="fill-${id}-c" cx="${cx}" cy="${cy}" r="${r}" />
    <circle id="fill-${id}-p1" cx="${cx}" cy="${cy - 28 * s}" r="${r}" />
    <circle id="fill-${id}-p2" cx="${cx + 26 * s}" cy="${cy - 10 * s}" r="${r}" />
    <circle id="fill-${id}-p3" cx="${cx + 18 * s}" cy="${cy + 22 * s}" r="${r}" />
    <circle id="fill-${id}-p4" cx="${cx - 18 * s}" cy="${cy + 22 * s}" r="${r}" />
    <circle id="fill-${id}-p5" cx="${cx - 26 * s}" cy="${cy - 10 * s}" r="${r}" />
    <rect id="fill-${id}-stem" x="${cx - 4 * s}" y="${cy + 30 * s}" width="${8 * s}" height="${50 * s}" />
    <path id="fill-${id}-leaf" d="M${cx + 4 * s} ${cy + 50 * s} q${28 * s} -${10 * s} ${30 * s} ${14 * s} q-${20 * s} ${4 * s} -${30 * s} -${14 * s} z" />
  `;
};

const npPalace = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const w = 280 * s;
  return `
    <rect id="fill-${id}-base" x="${cx - w / 2}" y="${cy - 100 * s}" width="${w}" height="${130 * s}" />
    <path id="fill-${id}-roof-l" d="M${cx - w / 2 - 20 * s} ${cy - 100 * s} h${w / 3 + 20 * s} l-${30 * s} -${50 * s} h-${w / 3 - 40 * s} z" />
    <path id="fill-${id}-roof-c" d="M${cx - w / 6} ${cy - 100 * s} h${w / 3} l-${20 * s} -${80 * s} h-${w / 3 - 40 * s} z" />
    <path id="fill-${id}-roof-r" d="M${cx + w / 6} ${cy - 100 * s} h${w / 3 + 20 * s} l-${30 * s} -${50 * s} h-${w / 3 - 40 * s} z" />
    <rect id="fill-${id}-door" x="${cx - 24 * s}" y="${cy - 50 * s}" width="${48 * s}" height="${80 * s}" rx="${20 * s}" />
    <rect id="fill-${id}-win-l" x="${cx - w / 2 + 24 * s}" y="${cy - 70 * s}" width="${36 * s}" height="${44 * s}" rx="${6 * s}" />
    <rect id="fill-${id}-win-r" x="${cx + w / 2 - 60 * s}" y="${cy - 70 * s}" width="${36 * s}" height="${44 * s}" rx="${6 * s}" />
  `;
};

const npThrone = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <rect id="fill-${id}-back" x="${cx - 70 * s}" y="${cy - 160 * s}" width="${140 * s}" height="${160 * s}" rx="${14 * s}" />
    <rect id="fill-${id}-seat" x="${cx - 90 * s}" y="${cy - 10 * s}" width="${180 * s}" height="${36 * s}" rx="${8 * s}" />
    <rect id="fill-${id}-leg-l" x="${cx - 80 * s}" y="${cy + 26 * s}" width="${24 * s}" height="${50 * s}" />
    <rect id="fill-${id}-leg-r" x="${cx + 56 * s}" y="${cy + 26 * s}" width="${24 * s}" height="${50 * s}" />
    <circle id="fill-${id}-jewel" cx="${cx}" cy="${cy - 130 * s}" r="${14 * s}" />
  `;
};

const npCrownPremium = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-band" d="M${cx - 60 * s} ${cy} h${120 * s} v${20 * s} h-${120 * s} z" />
    <path id="fill-${id}-points" d="M${cx - 60 * s} ${cy} l${20 * s} -${30 * s} l${10 * s} ${20 * s} l${15 * s} -${36 * s} l${15 * s} ${36 * s} l${10 * s} -${20 * s} l${20 * s} ${30 * s} z" />
    <circle id="fill-${id}-jewel" cx="${cx}" cy="${cy + 10 * s}" r="${8 * s}" />
  `;
};

const npLionBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="${100 * s}" ry="${60 * s}" />
    <circle id="fill-${id}-mane" cx="${cx + 80 * s}" cy="${cy - 20 * s}" r="${56 * s}" />
    <circle id="fill-${id}-head" cx="${cx + 80 * s}" cy="${cy - 20 * s}" r="${36 * s}" />
    <circle cx="${cx + 70 * s}" cy="${cy - 28 * s}" r="${4 * s}" fill="#2A2622" stroke="none" />
    <circle cx="${cx + 92 * s}" cy="${cy - 28 * s}" r="${4 * s}" fill="#2A2622" stroke="none" />
    <path d="M${cx + 76 * s} ${cy - 12 * s} q${4 * s} ${4 * s} ${8 * s} 0" fill="none" />
    <rect id="fill-${id}-leg-fl" x="${cx + 30 * s}" y="${cy + 40 * s}" width="${22 * s}" height="${40 * s}" rx="${4 * s}" />
    <rect id="fill-${id}-leg-fr" x="${cx + 70 * s}" y="${cy + 40 * s}" width="${22 * s}" height="${40 * s}" rx="${4 * s}" />
    <rect id="fill-${id}-leg-bl" x="${cx - 80 * s}" y="${cy + 40 * s}" width="${22 * s}" height="${40 * s}" rx="${4 * s}" />
    <rect id="fill-${id}-leg-br" x="${cx - 40 * s}" y="${cy + 40 * s}" width="${22 * s}" height="${40 * s}" rx="${4 * s}" />
    <path id="fill-${id}-tail" d="M${cx - 100 * s} ${cy - 10 * s} q-${30 * s} -${30 * s} -${50 * s} ${10 * s} q${10 * s} ${20 * s} ${30 * s} ${10 * s} z" />
  `;
};

const npStaff = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <rect id="fill-${id}-shaft" x="${cx - 5 * s}" y="${cy - 130 * s}" width="${10 * s}" height="${180 * s}" />
    <path id="fill-${id}-hook" d="M${cx + 5 * s} ${cy - 130 * s} q${30 * s} -${10 * s} ${20 * s} ${30 * s} q-${20 * s} ${5 * s} -${20 * s} -${30 * s} z" />
  `;
};

const npAngel = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  const headR = 22 * s;
  return `
    <circle id="fill-${id}-halo" cx="${cx}" cy="${cy - 70 * s}" r="${30 * s}" fill="none" stroke-width="6" />
    <circle id="fill-${id}-head" cx="${cx}" cy="${cy - 60 * s}" r="${headR}" />
    <path id="fill-${id}-robe" d="M${cx - 50 * s} ${cy - 40 * s} h${100 * s} l${30 * s} ${100 * s} h-${160 * s} z" />
    <path id="fill-${id}-wing-l" d="M${cx - 50 * s} ${cy - 40 * s} q-${70 * s} -${20 * s} -${60 * s} ${50 * s} q${30 * s} -${10 * s} ${60 * s} -${10 * s} z" />
    <path id="fill-${id}-wing-r" d="M${cx + 50 * s} ${cy - 40 * s} q${70 * s} -${20 * s} ${60 * s} ${50 * s} q-${30 * s} -${10 * s} -${60 * s} -${10 * s} z" />
  `;
};

// ============= Cenas premium — utilit\u00e1rios compartilhados =============

const skyAndGround = (id: string, horizon = 360) => `
  ${npSky(`${id}-sky`, horizon)}
  ${npGround(`${id}-ground`, horizon)}
`;
const skyAndSea = (id: string, horizon = 360) => `
  ${npSky(`${id}-sky`, horizon)}
  ${npSea(`${id}-sea`, horizon)}
`;

// ============= 30 cenas premium — Davi e Golias =============

function generateDaviPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="d${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("d1", 380)}${npSunBig("d1-sun", 110, 110, 50)}${npCloudBig("d1-c", 470, 130)}${npSheep("d1-s1", 200, 460, 1)}${npSheep("d1-s2", 380, 470, 0.95)}${npSheep("d1-s3", 480, 500, 0.7)}${npFlowerBig("d1-fl", 80, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("d2", 360)}${npCloudBig("d2-c", 130, 110)}${npBoy("d2-davi", 300, 470, 1.2, "stand")}${npSheep("d2-s", 460, 500, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("d3", 360)}${npSunBig("d3-sun", 480, 110, 46)}${npBoy("d3-davi", 220, 470, 1.05, "sling")}${npStaff("d3-staff", 380, 460, 0.9)}${npSheep("d3-s", 460, 500, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("d4", 350)}${npHillBack("d4-h")}${npBoy("d4-davi", 300, 470, 1.15, "stand")}${npLion("d4-l", 480, 500, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("d5", 360)}${npCloudBig("d5-c1", 120, 100)}${npCloudBig("d5-c2", 470, 120, 0.85)}${npBoy("d5-davi", 200, 470, 1, "stand")}${npBear("d5-b", 420, 500, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("d6", 360)}${npSunBig("d6-sun", 110, 100, 44)}${npBoy("d6-davi", 300, 470, 1.2, "stand")}<path id="fill-d6-harp-frame" d="M380 380 q60 -90 120 0 v90 h-120 z" /><path d="M395 395 v75 M420 395 v75 M445 395 v75 M470 395 v75" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("d7", 360)}${npHillBack("d7-h")}${npBoy("d7-davi", 200, 470, 1, "stand")}${npNoah("d7-pai", 420, 470, 1.05, "idle")}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("d8", 360)}${npCloudBig("d8-c", 460, 110)}${npNoah("d8-rei", 200, 470, 1.1, "point")}${npBoy("d8-davi", 420, 480, 1, "stand")}${npCrownPremium("d8-cr", 200, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("d9", 350)}${npGoliath("d9-g", 380, 510, 0.95)}${npBoy("d9-davi", 160, 480, 0.9, "stand")}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("d10", 350)}${npHillBack("d10-h")}${npGoliath("d10-g", 420, 510, 1)}<path id="fill-d10-tent-l" d="M40 540 l60 -100 l60 100 z" /><path id="fill-d10-tent-r" d="M170 540 l60 -100 l60 100 z" />`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("d11", 360)}${npNoah("d11-saul", 300, 470, 1.2, "point")}${npBoy("d11-davi", 460, 480, 0.9, "stand")}${npCrownPremium("d11-cr", 300, 310, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("d12", 350)}${npBoy("d12-davi", 300, 470, 1.2, "stand")}<path id="fill-d12-armor" d="M260 380 h80 v90 h-80 z" /><circle id="fill-d12-helmet" cx="300" cy="350" r="28" />`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("d13", 360)}${npBoy("d13-davi", 200, 470, 1.05, "stone")}<path id="fill-d13-stream" d="M340 470 q40 -10 80 0 v40 q-40 10 -80 0 z" /><circle id="fill-d13-stone1" cx="380" cy="500" r="10" /><circle id="fill-d13-stone2" cx="430" cy="510" r="12" /><circle id="fill-d13-stone3" cx="480" cy="495" r="11" /><circle id="fill-d13-stone4" cx="520" cy="505" r="10" /><circle id="fill-d13-stone5" cx="560" cy="500" r="12" />`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("d14", 350)}${npBoy("d14-davi", 200, 470, 1.05, "sling")}${npGoliath("d14-g", 460, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("d15", 350)}${npGoliath("d15-g", 380, 510, 1)}${npBoy("d15-davi", 140, 480, 0.85, "sling")}<path d="M220 420 q70 -40 140 0" fill="none" stroke-dasharray="6 6" />`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("d16", 350)}${npGoliath("d16-g", 320, 510, 1)}<circle id="fill-d16-impact" cx="318" cy="375" r="14" /><path d="M250 380 l60 0 M380 380 l60 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("d17", 360)}<path id="fill-d17-fallen" d="M120 530 q200 -40 380 0 l-20 30 q-160 30 -340 0 z" /><circle id="fill-d17-helmet" cx="500" cy="510" r="24" />${npBoy("d17-davi", 180, 470, 1, "stand")}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("d18", 360)}${npBoy("d18-davi", 300, 470, 1.2, "stand")}<path id="fill-d18-sword" d="M380 360 h12 v160 h-12 z" /><rect id="fill-d18-hilt" x="370" y="510" width="32" height="14" />`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("d19", 350)}${npHillBack("d19-h")}${npBoy("d19-davi", 200, 470, 1, "stand")}${npFamily("d19-fam", 420, 480, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("d20", 360)}${npNoah("d20-saul", 200, 470, 1.05, "idle")}${npBoy("d20-davi", 420, 480, 1, "stand")}${npCrownPremium("d20-cr", 420, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("d21", 350)}<path id="fill-d21-walls" d="M60 360 h480 v200 h-480 z" />${npPalace("d21-pal", 300, 350, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("d22", 360)}${npBoy("d22-davi", 300, 470, 1.25, "stand")}<path id="fill-d22-harp" d="M220 350 q80 -90 160 0 v100 h-160 z" /><path d="M240 360 v90 M275 360 v90 M310 360 v90 M345 360 v90 M380 360 v90" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("d23", 360)}${npFamily("d23-fam", 200, 470, 1)}${npBoy("d23-davi", 440, 480, 1.05, "stand")}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("d24", 350)}${npBoy("d24-davi", 300, 470, 1.2, "stand")}${npSheep("d24-s1", 120, 510, 0.7)}${npSheep("d24-s2", 480, 510, 0.7)}${npStaff("d24-st", 380, 460, 1)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("d25", 360)}${npNoah("d25-davi", 300, 470, 1.3, "pray")}${npGodLight("d25-light")}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("d26", 360)}${npNoah("d26-davi", 300, 470, 1.3, "carry")}${npCrownPremium("d26-cr", 300, 310, 1)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("d27", 360)}${npThrone("d27-th", 300, 460, 1.05)}${npCrownPremium("d27-cr", 300, 270, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("d28", 360)}${npNoah("d28-davi", 300, 470, 1.25, "pray")}${npAltar("d28-al", 300, 360)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("d29", 360)}${npFamily("d29-fam", 300, 470, 1.2)}${npRainbowBig("d29-rb", 300, 360, 520)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("d30", 360)}${npNoah("d30-davi", 200, 470, 1.1, "carry")}${npFamily("d30-fam", 440, 480, 0.95)}${npCrownPremium("d30-cr", 200, 320, 0.85)}${npSunBig("d30-sun", 110, 110, 46)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — Jonas e a Baleia =============

function generateJonasPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="j${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("j1", 360)}${npSunBig("j1-sun", 110, 110, 48)}${npCloudBig("j1-c", 470, 120)}${npNoah("j1-jonas", 300, 470, 1.2, "idle")}${npGodLight("j1-light")}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("j2", 350)}${npNoah("j2-jonas", 300, 470, 1.2, "point")}${npHillBack("j2-h")}<path id="fill-j2-arrow" d="M460 350 l60 0 l-10 -10 m10 10 l-10 10" fill="none" stroke-width="6" />`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndSea("j3", 380)}${npBoatBig("j3-boat", 300, 380, 1)}${npNoah("j3-jonas", 200, 470, 0.85, "carry")}${npSunBig("j3-sun", 480, 110, 44)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndSea("j4", 360)}${npBoatBig("j4-boat", 300, 380, 1.05)}${npNoah("j4-jonas", 300, 360, 0.7, "idle")}${npCloudBig("j4-c1", 110, 100)}${npCloudBig("j4-c2", 480, 100)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndSea("j5", 320)}${npCloudBig("j5-c1", 130, 90, 1.1)}${npCloudBig("j5-c2", 470, 110, 1.1)}${npBoatBig("j5-boat", 300, 360, 1)}${npRain(18, 5)}${npWaveBig("j5-w1", 0, 380, 240, 50)}${npWaveBig("j5-w2", 360, 390, 240, 50)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndSea("j6", 320)}${npRain(20, 7)}${npBoatBig("j6-boat", 300, 360, 1.05)}${npNoah("j6-jonas", 220, 340, 0.6, "pray")}${npNoah("j6-marin", 400, 340, 0.55, "point")}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndSea("j7", 320)}${npRain(16, 11)}${npBoatBig("j7-boat", 300, 360, 1)}${npNoah("j7-jonas", 300, 340, 0.7, "carry")}<path d="M260 320 l40 -40 l40 40" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndSea("j8", 340)}${npBoatBig("j8-boat", 380, 380, 0.9)}<path id="fill-j8-splash" d="M180 410 q40 -80 80 0 q-40 40 -80 0 z" />${npNoah("j8-jonas", 220, 380, 0.55, "idle")}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndSea("j9", 320)}${npWhalePremium("j9-whale", 300, 470, 1)}${npBoatBig("j9-boat", 110, 360, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndSea("j10", 320)}${npWhalePremium("j10-whale", 300, 460, 1.1)}${npNoah("j10-jonas", 80, 380, 0.45, "carry")}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndSea("j11", 340)}${npWhalePremium("j11-whale", 300, 470, 1.05)}<path id="fill-j11-mouth" d="M380 430 q40 30 80 0 q-40 50 -80 0 z" />`,
    ),
  );
  pages.push(
    sc(
      12,
      `${npSky("j12-sky", 300)}<rect id="fill-j12-belly" x="40" y="200" width="520" height="380" rx="40" />${npNoah("j12-jonas", 300, 470, 1.2, "pray")}`,
    ),
  );
  pages.push(
    sc(
      13,
      `<rect id="fill-j13-belly" x="14" y="14" width="572" height="572" rx="40" />${npNoah("j13-jonas", 300, 470, 1.25, "pray")}${npFishBig("j13-f1", 110, 200, 1)}${npFishBig("j13-f2", 470, 220, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `<rect id="fill-j14-belly" x="14" y="14" width="572" height="572" rx="40" />${npNoah("j14-jonas", 300, 470, 1.2, "pray")}${npGodLight("j14-light")}`,
    ),
  );
  pages.push(
    sc(
      15,
      `<rect id="fill-j15-belly" x="14" y="14" width="572" height="572" rx="40" />${npNoah("j15-jonas", 300, 470, 1.25, "carry")}<path id="fill-j15-list" d="M180 280 h240 v140 h-240 z" /><path d="M200 310 h200 M200 340 h180 M200 370 h160" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndSea("j16", 340)}${npWhalePremium("j16-whale", 300, 470, 1.05)}<path id="fill-j16-spit" d="M460 410 q60 -40 100 0 q-60 30 -100 0 z" />${npNoah("j16-jonas", 480, 380, 0.55, "carry")}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("j17", 360)}${npSunBig("j17-sun", 110, 110, 46)}${npNoah("j17-jonas", 300, 470, 1.25, "stand" as never)}${npHillBack("j17-h")}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("j18", 360)}${npNoah("j18-jonas", 300, 470, 1.25, "point")}${npPalace("j18-pal", 460, 410, 0.5)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("j19", 360)}${npPalace("j19-pal", 300, 400, 0.95)}${npNoah("j19-jonas", 100, 470, 0.85, "carry")}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("j20", 360)}${npNoah("j20-jonas", 200, 470, 1.05, "point")}${npFamily("j20-fam", 440, 480, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("j21", 360)}${npNoah("j21-rei", 300, 470, 1.25, "pray")}${npCrownPremium("j21-cr", 300, 310, 0.9)}${npAltar("j21-al", 460, 470)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("j22", 360)}${npFamily("j22-fam1", 180, 470, 0.95)}${npFamily("j22-fam2", 420, 470, 0.95)}${npAltar("j22-al", 300, 460)}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("j23", 360)}${npNoah("j23-jonas", 200, 470, 1.05, "idle")}${npTreeBig("j23-tree", 440, 470, 1)}${npSunBig("j23-sun", 110, 110, 50)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("j24", 360)}${npNoah("j24-jonas", 200, 470, 1.05, "carry")}${npTreeBig("j24-tree", 440, 470, 1.1)}<circle id="fill-j24-fruit" cx="450" cy="340" r="14" />`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("j25", 360)}${npNoah("j25-jonas", 200, 470, 1.05, "pray")}<path id="fill-j25-stump" d="M400 470 h80 v40 h-80 z" /><path id="fill-j25-leaves" d="M390 480 q-30 -20 -10 30 z" />`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("j26", 320)}${npSunBig("j26-sun", 300, 200, 90)}${npNoah("j26-jonas", 300, 470, 1.2, "carry")}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("j27", 360)}${npNoah("j27-jonas", 300, 470, 1.3, "pray")}${npGodLight("j27-light")}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("j28", 360)}${npFamily("j28-fam", 300, 470, 1.2)}${npRainbowBig("j28-rb", 300, 360, 520)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndSea("j29", 360)}${npWhalePremium("j29-whale", 300, 470, 1.1)}${npSunBig("j29-sun", 110, 110, 50)}${npDovePremium("j29-dove", 460, 160, 1.1)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("j30", 360)}${npNoah("j30-jonas", 200, 470, 1.1, "pray")}${npAltar("j30-al", 440, 470)}${npRainbowBig("j30-rb", 300, 340, 520)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — Mois\u00e9s e o Mar Vermelho =============

function generateMoisesPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="m${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("m1", 360)}${npNoah("m1-moises", 220, 470, 1.05, "pray")}<path id="fill-m1-bush" d="M380 470 q-40 -120 80 -100 q120 -20 80 100 z" /><path id="fill-m1-flame" d="M400 380 q20 -50 40 0 q20 -50 40 0 q-20 30 -40 20 q-20 10 -40 -20 z" />`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("m2", 360)}${npNoah("m2-moises", 200, 470, 1.05, "carry")}${npStaff("m2-st", 360, 460, 1)}${npGodLight("m2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("m3", 360)}${npNoah("m3-moises", 200, 470, 1.05, "point")}${npNoah("m3-faraó", 440, 470, 1.1, "idle")}${npCrownPremium("m3-cr", 440, 320, 0.85)}${npPalace("m3-pal", 440, 380, 0.4)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("m4", 360)}${npStaff("m4-st", 300, 480, 1.4)}<path id="fill-m4-snake" d="M260 540 q40 -40 80 0 q-40 40 -80 0 z M250 530 q-30 20 0 50 z" />`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("m5", 360)}${npNoah("m5-moises", 200, 470, 1.05, "carry")}<path id="fill-m5-river" d="M340 380 h220 v200 h-220 z" /><path id="fill-m5-blood" d="M360 400 h180 v160 h-180 z" />`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("m6", 360)}<path id="fill-m6-frog1" d="M120 520 q-20 -30 40 -30 q60 0 40 30 z" /><path id="fill-m6-frog2" d="M260 540 q-20 -30 40 -30 q60 0 40 30 z" /><path id="fill-m6-frog3" d="M400 520 q-20 -30 40 -30 q60 0 40 30 z" /><path id="fill-m6-frog4" d="M180 480 q-20 -30 40 -30 q60 0 40 30 z" /><path id="fill-m6-frog5" d="M340 480 q-20 -30 40 -30 q60 0 40 30 z" />${npNoah("m6-moises", 80, 470, 0.7, "idle")}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("m7", 360)}<circle id="fill-m7-fly1" cx="180" cy="200" r="14" /><circle id="fill-m7-fly2" cx="280" cy="160" r="16" /><circle id="fill-m7-fly3" cx="380" cy="220" r="14" /><circle id="fill-m7-fly4" cx="460" cy="180" r="14" /><circle id="fill-m7-fly5" cx="200" cy="280" r="12" /><circle id="fill-m7-fly6" cx="420" cy="280" r="12" />${npNoah("m7-moises", 300, 470, 1.1, "point")}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${npSky("m8-sky", 300)}<rect id="fill-m8-dark" x="14" y="300" width="572" height="286" />${npNoah("m8-moises", 300, 540, 1.05, "pray")}${npStaff("m8-st", 380, 530, 1)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("m9", 360)}${npNoah("m9-moises", 200, 470, 1.1, "point")}${npFamily("m9-fam", 420, 480, 0.95)}<path id="fill-m9-door" d="M450 350 h60 v140 h-60 z" /><path id="fill-m9-mark" d="M470 360 h20 v20 h-20 z" />`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("m10", 360)}${npNoah("m10-moises", 200, 470, 1.05, "carry")}${npFamily("m10-fam", 420, 480, 1)}<path d="M40 540 q260 -40 520 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("m11", 360)}${npFamily("m11-f1", 130, 470, 0.9)}${npFamily("m11-f2", 320, 470, 0.9)}${npFamily("m11-f3", 510, 470, 0.9)}${npNoah("m11-moises", 60, 470, 0.8, "point")}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndSea("m12", 360)}${npFamily("m12-fam", 150, 470, 0.95)}${npNoah("m12-moises", 320, 470, 1.1, "pray")}<path id="fill-m12-cloud" d="M380 200 q60 -40 120 0 q40 60 -10 100 q-50 30 -110 0 q-40 -50 0 -100 z" />`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndSea("m13", 360)}${npNoah("m13-moises", 300, 470, 1.3, "point")}${npStaff("m13-st", 400, 460, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${npSky("m14-sky", 200)}${npSeaSplit("m14-split")}${npNoah("m14-moises", 300, 540, 0.9, "point")}`,
    ),
  );
  pages.push(
    sc(15, `${npSky("m15-sky", 200)}${npSeaSplit("m15-split")}${npFamily("m15-fam", 300, 540, 1)}`),
  );
  pages.push(
    sc(
      16,
      `${npSky("m16-sky", 200)}${npSeaSplit("m16-split")}${npFamily("m16-f1", 220, 540, 0.85)}${npFamily("m16-f2", 380, 540, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${npSky("m17-sky", 200)}${npSeaSplit("m17-split")}${npNoah("m17-moises", 300, 540, 1, "carry")}${npChild("m17-c", 380, 550, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndSea("m18", 360)}<path id="fill-m18-wave-l" d="M14 360 q140 60 280 0 v220 h-280 z" /><path id="fill-m18-wave-r" d="M586 360 q-140 60 -280 0 v220 h280 z" />${npNoah("m18-moises", 300, 470, 1.1, "pray")}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("m19", 360)}${npFamily("m19-fam", 300, 470, 1.2)}${npSunBig("m19-sun", 110, 110, 50)}${npRainbowBig("m19-rb", 300, 360, 520)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("m20", 360)}${npNoah("m20-moises", 300, 470, 1.3, "pray")}${npAltar("m20-al", 480, 470)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("m21", 360)}${npMountain("m21-mt", 100, 250, 400, 220)}${npNoah("m21-moises", 300, 470, 1.1, "carry")}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("m22", 360)}${npMountain("m22-mt", 100, 250, 400, 220)}${npNoah("m22-moises", 300, 470, 1.1, "pray")}${npGodLight("m22-light")}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("m23", 360)}${npNoah("m23-moises", 300, 470, 1.3, "carry")}${tablet("m23-tab", 300, 230)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("m24", 360)}${npNoah("m24-moises", 300, 470, 1.25, "point")}${tablet("m24-tab", 300, 220)}<path d="M180 480 q120 -10 240 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("m25", 360)}${npFamily("m25-fam", 200, 470, 1)}${npNoah("m25-moises", 460, 470, 1.05, "carry")}${tablet("m25-tab", 460, 320)}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("m26", 360)}${npAltar("m26-al", 300, 460)}${npNoah("m26-moises", 130, 470, 0.95, "pray")}${npFamily("m26-fam", 480, 480, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("m27", 360)}<path id="fill-m27-tent-l" d="M40 540 l80 -120 l80 120 z" /><path id="fill-m27-tent-c" d="M210 540 l90 -150 l90 150 z" /><path id="fill-m27-tent-r" d="M400 540 l80 -120 l80 120 z" />`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("m28", 360)}<path id="fill-m28-cloud" d="M180 100 q60 -40 120 0 q40 60 -10 100 q-50 30 -110 0 q-40 -50 0 -100 z" />${npFamily("m28-fam", 300, 470, 1.1)}<path id="fill-m28-fire" d="M220 200 q40 -50 80 0 q-40 40 -80 0 z" />`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("m29", 360)}${npNoah("m29-moises", 300, 470, 1.3, "carry")}${npStaff("m29-st", 400, 460, 1.2)}<path id="fill-m29-rock" d="M40 380 q120 -120 240 0 v160 h-240 z" /><path id="fill-m29-water" d="M260 460 q40 60 100 60 q60 0 100 -60 q-100 60 -200 0 z" />`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("m30", 360)}${npFamily("m30-fam", 300, 470, 1.3)}${npRainbowBig("m30-rb", 300, 340, 540)}${npSunBig("m30-sun", 110, 110, 46)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — Daniel na Cova dos Le\u00f5es =============

function generateDanielPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="dn${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("dn1", 360)}${npNoah("dn1-daniel", 300, 470, 1.2, "carry")}${npPalace("dn1-pal", 460, 410, 0.5)}${npSunBig("dn1-sun", 110, 110, 46)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("dn2", 360)}${npNoah("dn2-rei", 300, 470, 1.25, "point")}${npCrownPremium("dn2-cr", 300, 310, 1)}${npThrone("dn2-th", 300, 460, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("dn3", 360)}${npNoah("dn3-daniel", 200, 470, 1.05, "idle")}${npNoah("dn3-rei", 440, 470, 1.05, "point")}${npCrownPremium("dn3-cr", 440, 320, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("dn4", 360)}${npNoah("dn4-daniel", 300, 470, 1.3, "pray")}${npGodLight("dn4-light")}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("dn5", 360)}${npNoah("dn5-daniel", 220, 470, 1.05, "pray")}<path id="fill-dn5-window" d="M380 240 h120 v160 h-120 z" /><path d="M440 240 v160 M380 320 h120" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("dn6", 360)}${npNoah("dn6-inv1", 180, 470, 1, "point")}${npNoah("dn6-inv2", 420, 470, 1, "point")}<path id="fill-dn6-scroll" d="M260 200 h80 v80 h-80 z" /><path d="M275 220 h50 M275 240 h40" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("dn7", 360)}${npNoah("dn7-rei", 300, 470, 1.25, "carry")}${npCrownPremium("dn7-cr", 300, 310, 0.9)}<path id="fill-dn7-decree" d="M180 360 h240 v100 h-240 z" /><path d="M200 380 h200 M200 400 h180" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("dn8", 360)}${npNoah("dn8-daniel", 300, 470, 1.3, "pray")}<path id="fill-dn8-window" d="M380 240 h140 v200 h-140 z" />`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("dn9", 360)}${npNoah("dn9-daniel", 200, 470, 1.05, "pray")}${npNoah("dn9-spy", 460, 470, 0.95, "point")}<path id="fill-dn9-window" d="M260 240 h120 v160 h-120 z" />`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("dn10", 360)}${npNoah("dn10-rei", 200, 470, 1.1, "idle")}${npCrownPremium("dn10-cr", 200, 320, 0.85)}${npNoah("dn10-spy1", 380, 470, 0.95, "point")}${npNoah("dn10-spy2", 500, 470, 0.95, "point")}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("dn11", 360)}${npNoah("dn11-rei", 300, 470, 1.25, "pray")}${npCrownPremium("dn11-cr", 300, 310, 0.9)}<path d="M180 380 q120 40 240 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("dn12", 360)}${npNoah("dn12-daniel", 200, 470, 1, "carry")}${npNoah("dn12-guard1", 380, 470, 1, "point")}${npNoah("dn12-guard2", 500, 470, 1, "point")}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${npSky("dn13-sky", 220)}<path id="fill-dn13-cave" d="M14 220 q280 -100 572 0 v360 h-572 z" />${npNoah("dn13-daniel", 300, 540, 0.95, "carry")}`,
    ),
  );
  pages.push(
    sc(
      14,
      `<rect id="fill-dn14-cave" x="14" y="14" width="572" height="572" rx="40" />${npNoah("dn14-daniel", 300, 470, 1.2, "pray")}${npLionBig("dn14-l1", 130, 510, 0.85)}${npLionBig("dn14-l2", 470, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `<rect id="fill-dn15-cave" x="14" y="14" width="572" height="572" rx="40" />${npNoah("dn15-daniel", 200, 470, 1.1, "pray")}${npLionBig("dn15-l1", 440, 500, 0.9)}${npLionBig("dn15-l2", 460, 350, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `<rect id="fill-dn16-cave" x="14" y="14" width="572" height="572" rx="40" />${npNoah("dn16-daniel", 300, 470, 1.25, "pray")}${npAngel("dn16-ang", 300, 280, 1)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `<rect id="fill-dn17-cave" x="14" y="14" width="572" height="572" rx="40" />${npAngel("dn17-ang", 150, 320, 0.95)}${npLionBig("dn17-l1", 420, 510, 1)}${npLionBig("dn17-l2", 480, 360, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `<rect id="fill-dn18-cave" x="14" y="14" width="572" height="572" rx="40" />${npNoah("dn18-daniel", 200, 470, 1.05, "idle")}${npLionBig("dn18-l1", 460, 500, 0.95)}${npLionBig("dn18-l2", 470, 350, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("dn19", 320)}${npMoon("dn19-moon", 110, 110, 48)}${npStar("dn19-s1", 230, 90)}${npStar("dn19-s2", 380, 130)}${npStar("dn19-s3", 510, 90)}<path id="fill-dn19-palace" d="M120 360 h360 v220 h-360 z" />${npNoah("dn19-rei", 300, 540, 1, "pray")}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("dn20", 360)}${npNoah("dn20-rei", 300, 470, 1.25, "carry")}${npCrownPremium("dn20-cr", 300, 310, 0.9)}<path d="M200 460 q100 -40 200 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("dn21", 360)}${npNoah("dn21-rei", 200, 470, 1.1, "point")}${npNoah("dn21-guard", 460, 470, 1.05, "point")}${npCrownPremium("dn21-cr", 200, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `<rect id="fill-dn22-cave" x="14" y="14" width="572" height="572" rx="40" />${npNoah("dn22-daniel", 300, 470, 1.25, "carry")}${npLionBig("dn22-l", 460, 500, 0.85)}<path id="fill-dn22-light" d="M50 80 q200 100 500 0 q-150 200 -500 0 z" />`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("dn23", 360)}${npNoah("dn23-daniel", 200, 470, 1.1, "carry")}${npNoah("dn23-rei", 440, 470, 1.1, "carry")}${npCrownPremium("dn23-cr", 440, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("dn24", 360)}${npFamily("dn24-fam", 300, 470, 1.2)}${npSunBig("dn24-sun", 110, 110, 50)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("dn25", 360)}${npNoah("dn25-rei", 300, 470, 1.25, "pray")}${npCrownPremium("dn25-cr", 300, 310, 0.9)}${npGodLight("dn25-light")}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("dn26", 360)}${npNoah("dn26-daniel", 300, 470, 1.3, "pray")}${npAltar("dn26-al", 300, 360)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("dn27", 360)}${npNoah("dn27-daniel", 200, 470, 1.05, "carry")}${npFamily("dn27-fam", 440, 480, 0.95)}<path id="fill-dn27-scroll" d="M260 200 h80 v80 h-80 z" /><path d="M275 220 h50 M275 240 h40" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("dn28", 360)}${npNoah("dn28-daniel", 300, 470, 1.3, "pray")}${npAngel("dn28-ang", 300, 220, 1.05)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("dn29", 360)}${npLionBig("dn29-l1", 200, 480, 1)}${npLionBig("dn29-l2", 440, 480, 1)}${npNoah("dn29-daniel", 320, 470, 1.05, "carry")}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("dn30", 360)}${npFamily("dn30-fam", 200, 470, 1)}${npNoah("dn30-daniel", 440, 470, 1.05, "pray")}${npRainbowBig("dn30-rb", 300, 340, 540)}${npDovePremium("dn30-dove", 300, 160, 1)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — A Cria\u00e7\u00e3o do Mundo =============

function generateCriacaoPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="cr${i}">${inner}</g>`);

  // Dia 1 — luz
  pages.push(
    sc(
      1,
      `<rect id="fill-cr1-dark" x="14" y="14" width="572" height="572" rx="18" />${npGodLight("cr1-light")}`,
    ),
  );
  pages.push(
    sc(
      2,
      `<rect id="fill-cr2-dark" x="14" y="300" width="572" height="286" />${npSky("cr2-sky", 300)}${npSunBig("cr2-sun", 300, 200, 90)}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("cr3", 300)}${npSunBig("cr3-sun", 300, 200, 100)}${npGodLight("cr3-light")}`,
    ),
  );
  // Dia 2 — c\u00e9u e \u00e1guas
  pages.push(
    sc(
      4,
      `${npSky("cr4-sky", 300)}<rect id="fill-cr4-water" x="14" y="300" width="572" height="286" />${npCloudBig("cr4-c1", 130, 110, 1.1)}${npCloudBig("cr4-c2", 470, 130, 1)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${npSky("cr5-sky", 280)}<rect id="fill-cr5-water" x="14" y="280" width="572" height="306" />${npCloudBig("cr5-c1", 110, 100)}${npCloudBig("cr5-c2", 300, 80, 1.2)}${npCloudBig("cr5-c3", 490, 110)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${npSky("cr6-sky", 280)}<rect id="fill-cr6-water" x="14" y="280" width="572" height="306" />${npWaveBig("cr6-w1", 0, 320, 240, 50)}${npWaveBig("cr6-w2", 360, 340, 240, 50)}${npSunBig("cr6-sun", 480, 110, 44)}`,
    ),
  );
  // Dia 3 — terra e plantas
  pages.push(
    sc(
      7,
      `${skyAndGround("cr7", 300)}${npHillBack("cr7-h")}${npMountain("cr7-m", 60, 200, 200, 160)}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("cr8", 320)}${npTreeBig("cr8-t1", 130, 470, 1)}${npTreeBig("cr8-t2", 300, 470, 1.1)}${npTreeBig("cr8-t3", 470, 470, 1)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("cr9", 320)}${npFlowerBig("cr9-f1", 130, 480, 1)}${npFlowerBig("cr9-f2", 230, 510, 0.85)}${npFlowerBig("cr9-f3", 340, 480, 1.1)}${npFlowerBig("cr9-f4", 470, 510, 0.9)}`,
    ),
  );
  // Dia 4 — sol, lua, estrelas
  pages.push(
    sc(
      10,
      `${npSky("cr10-sky", 360)}${npGround("cr10-ground", 360)}${npSunBig("cr10-sun", 300, 200, 110)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `<rect id="fill-cr11-night" x="14" y="14" width="572" height="346" />${npGround("cr11-ground", 360)}${npMoon("cr11-moon", 300, 200, 70)}${npStar("cr11-s1", 130, 110)}${npStar("cr11-s2", 470, 130)}${npStar("cr11-s3", 230, 250)}${npStar("cr11-s4", 380, 250)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `<rect id="fill-cr12-night" x="14" y="14" width="572" height="346" />${npGround("cr12-ground", 360)}${npMoon("cr12-moon", 130, 130, 56)}${npSunBig("cr12-sun", 470, 130, 50)}${npStar("cr12-s1", 230, 90)}${npStar("cr12-s2", 380, 110)}${npStar("cr12-s3", 300, 230)}`,
    ),
  );
  // Dia 5 — peixes e aves
  pages.push(
    sc(
      13,
      `${skyAndSea("cr13", 300)}${npFishBig("cr13-f1", 130, 420, 1)}${npFishBig("cr13-f2", 320, 470, 1.1)}${npFishBig("cr13-f3", 480, 440, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndSea("cr14", 300)}${npWhalePremium("cr14-w", 300, 460, 1)}${npFishBig("cr14-f1", 110, 420, 0.8)}${npFishBig("cr14-f2", 510, 430, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("cr15", 360)}${npDovePremium("cr15-d1", 150, 130, 1)}${npDovePremium("cr15-d2", 450, 150, 1)}${npDovePremium("cr15-d3", 300, 220, 0.9)}${npTreeBig("cr15-t", 300, 470, 1)}`,
    ),
  );
  // Dia 6 — animais e ser humano
  pages.push(
    sc(
      16,
      `${skyAndGround("cr16", 360)}${npLionBig("cr16-l", 200, 480, 0.95)}${npElephant("cr16-e", 440, 470, 1.1)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("cr17", 360)}${npGiraffe("cr17-g", 130, 470, 1)}${npZebra("cr17-z", 320, 470, 1)}${npBear("cr17-b", 480, 480, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("cr18", 360)}${npSheep("cr18-s1", 130, 490, 0.95)}${npRabbit("cr18-r1", 240, 510, 1)}${npSheep("cr18-s2", 360, 490, 0.95)}${npRabbit("cr18-r2", 470, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("cr19", 360)}${npAdam("cr19-adam", 220, 470, 1.05)}${npEve("cr19-eve", 420, 470, 1.05)}${npGodLight("cr19-light")}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("cr20", 360)}${npAdam("cr20-adam", 220, 470, 1.05)}${npEve("cr20-eve", 420, 470, 1.05)}${npTreeBig("cr20-t", 320, 350, 0.6)}`,
    ),
  );
  // Dia 7 — descanso
  pages.push(
    sc(
      21,
      `${skyAndGround("cr21", 360)}${npAdam("cr21-adam", 220, 470, 1.05)}${npEve("cr21-eve", 420, 470, 1.05)}${npFlowerBig("cr21-f1", 100, 510, 0.8)}${npFlowerBig("cr21-f2", 540, 510, 0.8)}${npSunBig("cr21-sun", 110, 110, 46)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("cr22", 360)}${npTreeBig("cr22-t1", 130, 470, 1)}${npTreeBig("cr22-t2", 470, 470, 1)}${npAdam("cr22-adam", 240, 470, 0.95)}${npEve("cr22-eve", 380, 470, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("cr23", 360)}${npLionBig("cr23-l", 130, 480, 0.85)}${npAdam("cr23-adam", 320, 470, 1.05)}${npSheep("cr23-s", 480, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("cr24", 360)}<path id="fill-cr24-river" d="M40 380 q260 -60 520 0 v160 q-260 -60 -520 0 z" />${npFishBig("cr24-f", 300, 460, 1)}${npTreeBig("cr24-t", 480, 470, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("cr25", 360)}${npRainbowBig("cr25-rb", 300, 360, 540)}${npAdam("cr25-adam", 220, 470, 1)}${npEve("cr25-eve", 380, 470, 1)}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("cr26", 360)}${npFamily("cr26-fam", 300, 470, 1.2)}${npSunBig("cr26-sun", 110, 110, 46)}${npCloudBig("cr26-c", 470, 120, 1)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("cr27", 360)}${npAdam("cr27-adam", 200, 470, 1)}${npEve("cr27-eve", 420, 470, 1)}${npChild("cr27-c1", 290, 490, 0.85)}${npChild("cr27-c2", 350, 490, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("cr28", 360)}${npAltar("cr28-al", 300, 460)}${npAdam("cr28-adam", 130, 470, 0.95)}${npEve("cr28-eve", 470, 470, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("cr29", 360)}${npRainbowBig("cr29-rb", 300, 340, 560)}${npFamily("cr29-fam", 300, 480, 1.15)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("cr30", 360)}${npSunBig("cr30-sun", 110, 110, 46)}${npMoon("cr30-moon", 490, 110, 40)}${npFamily("cr30-fam", 300, 470, 1.15)}${npFlowerBig("cr30-f1", 90, 530, 0.8)}${npFlowerBig("cr30-f2", 510, 530, 0.8)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — Ester, a Rainha Corajosa =============

function generateEsterPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="es${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("es1", 360)}${npPalace("es1-pal", 300, 400, 1)}${npSunBig("es1-sun", 110, 110, 48)}${npCloudBig("es1-c", 470, 120, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("es2", 360)}${npNoah("es2-rei", 300, 470, 1.3, "idle")}${npCrownPremium("es2-cr", 300, 310, 1)}${npThrone("es2-th", 300, 460, 1)}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("es3", 360)}${npEve("es3-ester", 200, 470, 1.05)}${npEve("es3-amiga", 420, 470, 1)}${npFlowerBig("es3-f", 540, 530, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("es4", 360)}${npNoah("es4-mardoq", 200, 470, 1.05, "carry")}${npEve("es4-ester", 420, 470, 1.05)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("es5", 360)}${npEve("es5-ester", 130, 470, 0.95)}${npEve("es5-c1", 280, 470, 0.95)}${npEve("es5-c2", 430, 470, 0.95)}${npNoah("es5-guard", 540, 470, 0.9, "point")}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("es6", 360)}${npEve("es6-ester", 300, 470, 1.3)}${npCrownPremium("es6-cr", 300, 320, 1)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("es7", 360)}${npNoah("es7-rei", 200, 470, 1.1, "carry")}${npEve("es7-ester", 420, 470, 1.05)}${npCrownPremium("es7-cr", 420, 320, 0.85)}${npCrownPremium("es7-cr2", 200, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("es8", 360)}${npThrone("es8-th", 300, 460, 1)}${npEve("es8-ester", 220, 470, 1)}${npNoah("es8-rei", 380, 470, 1, "idle")}${npCrownPremium("es8-cr", 300, 280, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("es9", 360)}${npNoah("es9-mardoq", 300, 470, 1.25, "carry")}${npPalace("es9-pal", 460, 410, 0.45)}<path id="fill-es9-scroll" d="M180 200 h120 v100 h-120 z" /><path d="M200 220 h80 M200 240 h70" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("es10", 360)}${npNoah("es10-rei", 200, 470, 1.1, "idle")}${npNoah("es10-mardoq", 420, 470, 1.05, "carry")}${npCrownPremium("es10-cr", 200, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("es11", 360)}${npNoah("es11-ham", 300, 470, 1.3, "point")}<path id="fill-es11-decree" d="M200 200 h200 v140 h-200 z" /><path d="M220 230 h160 M220 260 h140 M220 290 h120" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("es12", 360)}${npNoah("es12-mardoq", 200, 470, 1.05, "pray")}${npFamily("es12-fam", 440, 480, 0.95)}<path id="fill-es12-cloth" d="M180 380 h60 v90 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("es13", 360)}${npEve("es13-ester", 300, 470, 1.3)}${npCrownPremium("es13-cr", 300, 320, 1)}${npGodLight("es13-light")}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("es14", 360)}${npEve("es14-ester", 200, 470, 1.05)}${npEve("es14-c1", 380, 470, 0.95)}${npEve("es14-c2", 500, 470, 0.95)}${npAltar("es14-al", 300, 460)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("es15", 360)}${npEve("es15-ester", 300, 470, 1.3)}<path id="fill-es15-dress" d="M240 380 h120 v100 h-120 z" />${npCrownPremium("es15-cr", 300, 320, 1)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("es16", 360)}${npThrone("es16-th", 300, 460, 1)}${npNoah("es16-rei", 300, 470, 1.2, "idle")}${npCrownPremium("es16-cr", 300, 290, 0.9)}${npEve("es16-ester", 130, 470, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("es17", 360)}${npNoah("es17-rei", 200, 470, 1.1, "point")}${npEve("es17-ester", 420, 470, 1.05)}${npStaff("es17-st", 300, 460, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("es18", 360)}${npEve("es18-ester", 300, 470, 1.3)}${npNoah("es18-rei", 130, 470, 0.95, "idle")}${npNoah("es18-ham", 470, 470, 0.95, "idle")}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("es19", 360)}<path id="fill-es19-table" d="M120 460 h360 v40 h-360 z" /><circle id="fill-es19-cup1" cx="180" cy="430" r="16" /><circle id="fill-es19-cup2" cx="300" cy="430" r="16" /><circle id="fill-es19-cup3" cx="420" cy="430" r="16" /><path id="fill-es19-bread" d="M240 420 q30 -20 60 0 q-30 10 -60 0 z" /><path id="fill-es19-bread2" d="M340 420 q30 -20 60 0 q-30 10 -60 0 z" />`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("es20", 360)}${npEve("es20-ester", 200, 470, 1.05)}${npNoah("es20-rei", 320, 470, 1.05, "idle")}${npNoah("es20-ham", 460, 470, 1.05, "idle")}<path id="fill-es20-table" d="M80 470 h440 v30 h-440 z" />`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("es21", 360)}${npEve("es21-ester", 300, 470, 1.3)}${npNoah("es21-rei", 130, 470, 0.95, "point")}${npNoah("es21-ham", 470, 470, 0.95, "idle")}<path d="M280 380 q40 -10 80 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("es22", 360)}${npNoah("es22-rei", 300, 470, 1.3, "point")}${npCrownPremium("es22-cr", 300, 310, 1)}${npNoah("es22-ham", 470, 470, 0.85, "idle")}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("es23", 360)}${npNoah("es23-mardoq", 300, 470, 1.25, "carry")}${npCrownPremium("es23-cr", 300, 310, 0.9)}<path id="fill-es23-cape" d="M240 360 h120 v160 h-120 z" />`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("es24", 360)}${npNoah("es24-mardoq", 300, 470, 1.25, "carry")}<path id="fill-es24-horse" d="M180 460 q-60 -10 -60 -60 q60 -10 120 0 q60 -10 120 0 q0 50 -60 60 z" />`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("es25", 360)}${npFamily("es25-fam", 200, 470, 1)}${npFamily("es25-fam2", 440, 470, 1)}<path d="M180 380 q120 -30 240 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("es26", 360)}${npEve("es26-ester", 200, 470, 1.05)}${npNoah("es26-rei", 420, 470, 1.05, "carry")}${npCrownPremium("es26-cr", 420, 320, 0.85)}<path id="fill-es26-decree" d="M260 200 h80 v100 h-80 z" />`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("es27", 360)}${npNoah("es27-povo1", 130, 470, 0.95, "carry")}${npFamily("es27-povo2", 320, 480, 1)}${npNoah("es27-povo3", 510, 470, 0.95, "carry")}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("es28", 360)}${npAltar("es28-al", 300, 460)}${npEve("es28-ester", 130, 470, 0.95)}${npNoah("es28-mardoq", 470, 470, 0.95, "pray")}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("es29", 360)}${npFamily("es29-fam", 300, 470, 1.25)}${npRainbowBig("es29-rb", 300, 340, 540)}${npSunBig("es29-sun", 110, 110, 46)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("es30", 360)}${npEve("es30-ester", 300, 470, 1.35)}${npCrownPremium("es30-cr", 300, 320, 1.1)}${npFlowerBig("es30-f1", 100, 510, 0.85)}${npFlowerBig("es30-f2", 500, 510, 0.85)}${npSunBig("es30-sun", 110, 110, 44)}`,
    ),
  );

  return pages;
}

// ============= Primitivas premium NT =============

const npManger = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-bed" d="M${cx - 90 * s} ${cy} q${90 * s} ${40 * s} ${180 * s} 0 v${30 * s} q-${90 * s} ${30 * s} -${180 * s} 0 z" />
    <rect id="fill-${id}-leg-l" x="${cx - 70 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${50 * s}" />
    <rect id="fill-${id}-leg-r" x="${cx + 54 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${50 * s}" />
    <path id="fill-${id}-hay" d="M${cx - 70 * s} ${cy + 4 * s} q${70 * s} -${30 * s} ${140 * s} 0 q-${70 * s} ${20 * s} -${140 * s} 0 z" />
    <circle id="fill-${id}-baby-head" cx="${cx}" cy="${cy - 14 * s}" r="${18 * s}" />
    <path id="fill-${id}-baby-blanket" d="M${cx - 30 * s} ${cy - 4 * s} q${30 * s} ${20 * s} ${60 * s} 0 v${20 * s} h-${60 * s} z" />
  `;
};

const npStarBig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}" d="M${cx} ${cy - 40 * s} l${12 * s} ${28 * s} l${30 * s} ${4 * s} l-${22 * s} ${22 * s} l${6 * s} ${30 * s} l-${26 * s} -${16 * s} l-${26 * s} ${16 * s} l${6 * s} -${30 * s} l-${22 * s} -${22 * s} l${30 * s} -${4 * s} z" />
    <path d="M${cx} ${cy + 50 * s} v${80 * s}" fill="none" stroke-dasharray="6 6" />
  `;
};

const npDonkey = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="${80 * s}" ry="${44 * s}" />
    <circle id="fill-${id}-head" cx="${cx + 70 * s}" cy="${cy - 30 * s}" r="${30 * s}" />
    <path id="fill-${id}-ear-l" d="M${cx + 60 * s} ${cy - 60 * s} l${6 * s} -${28 * s} l${12 * s} ${4 * s} z" />
    <path id="fill-${id}-ear-r" d="M${cx + 80 * s} ${cy - 60 * s} l${6 * s} -${28 * s} l${12 * s} ${4 * s} z" />
    <circle cx="${cx + 80 * s}" cy="${cy - 32 * s}" r="${3 * s}" fill="#2A2622" stroke="none" />
    <rect id="fill-${id}-leg-fl" x="${cx + 30 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${44 * s}" rx="${4 * s}" />
    <rect id="fill-${id}-leg-fr" x="${cx + 56 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${44 * s}" rx="${4 * s}" />
    <rect id="fill-${id}-leg-bl" x="${cx - 60 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${44 * s}" rx="${4 * s}" />
    <rect id="fill-${id}-leg-br" x="${cx - 30 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${44 * s}" rx="${4 * s}" />
    <path id="fill-${id}-tail" d="M${cx - 80 * s} ${cy} q-${20 * s} ${10 * s} -${10 * s} ${30 * s} q${10 * s} -${4 * s} ${10 * s} -${20 * s} z" />
  `;
};

const npLoaf = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `<path id="fill-${id}" d="M${cx - 30 * s} ${cy} q${30 * s} -${30 * s} ${60 * s} 0 q-${10 * s} ${22 * s} -${30 * s} ${22 * s} q-${20 * s} 0 -${30 * s} -${22 * s} z" />`;
};

const npFishSmall = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 30 * s} ${cy} q${30 * s} -${22 * s} ${60 * s} 0 q-${30 * s} ${22 * s} -${60 * s} 0 z" />
    <path id="fill-${id}-tail" d="M${cx + 30 * s} ${cy} l${20 * s} -${14 * s} v${28 * s} z" />
    <circle cx="${cx - 16 * s}" cy="${cy - 4 * s}" r="${3 * s}" fill="#2A2622" stroke="none" />
  `;
};

const npLoavesBasket = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-basket" d="M${cx - 80 * s} ${cy} q${80 * s} ${40 * s} ${160 * s} 0 v${50 * s} q-${80 * s} ${30 * s} -${160 * s} 0 z" />
    <path d="M${cx - 70 * s} ${cy + 18 * s} q${70 * s} ${20 * s} ${140 * s} 0 M${cx - 70 * s} ${cy + 36 * s} q${70 * s} ${20 * s} ${140 * s} 0" fill="none" />
    ${npLoaf(`${id}-l1`, cx - 30 * s, cy - 10 * s, 0.85 * s)}
    ${npLoaf(`${id}-l2`, cx + 30 * s, cy - 14 * s, 0.85 * s)}
    ${npFishSmall(`${id}-f1`, cx, cy - 6 * s, 0.85 * s)}
  `;
};

const npBoatJesus = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-hull" d="M${cx - 130 * s} ${cy} q${130 * s} ${50 * s} ${260 * s} 0 v${40 * s} q-${130 * s} ${30 * s} -${260 * s} 0 z" />
    <rect id="fill-${id}-mast" x="${cx - 4 * s}" y="${cy - 140 * s}" width="${8 * s}" height="${140 * s}" />
    <path id="fill-${id}-sail" d="M${cx + 4 * s} ${cy - 140 * s} q${100 * s} ${30 * s} ${0 * s} ${130 * s} z" />
    <path id="fill-${id}-wave-l" d="M${cx - 200 * s} ${cy + 50 * s} q${30 * s} -${20 * s} ${60 * s} 0 q${30 * s} ${20 * s} ${60 * s} 0" fill="none" stroke-width="4" />
    <path id="fill-${id}-wave-r" d="M${cx + 80 * s} ${cy + 50 * s} q${30 * s} -${20 * s} ${60 * s} 0 q${30 * s} ${20 * s} ${60 * s} 0" fill="none" stroke-width="4" />
  `;
};

const npBandageMan = (id: string, cx: number, cy: number, scale = 1) => {
  // Pessoa deitada com ataduras (ferido na história do Bom Samaritano).
  const s = scale;
  return `
    <path id="fill-${id}-body" d="M${cx - 100 * s} ${cy} q${30 * s} -${30 * s} ${100 * s} -${30 * s} q${70 * s} 0 ${100 * s} ${30 * s} v${30 * s} h-${200 * s} z" />
    <circle id="fill-${id}-head" cx="${cx + 90 * s}" cy="${cy - 30 * s}" r="${24 * s}" />
    <rect id="fill-${id}-bandage-h" x="${cx + 70 * s}" y="${cy - 38 * s}" width="${50 * s}" height="${10 * s}" />
    <rect id="fill-${id}-bandage-arm" x="${cx - 40 * s}" y="${cy - 20 * s}" width="${50 * s}" height="${10 * s}" />
    <path d="M${cx + 80 * s} ${cy - 32 * s} l${4 * s} ${4 * s} M${cx - 20 * s} ${cy - 14 * s} l${4 * s} ${4 * s}" fill="none" />
  `;
};

const npHeart = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `<path id="fill-${id}" d="M${cx} ${cy + 30 * s} q-${50 * s} -${30 * s} -${40 * s} -${60 * s} q${10 * s} -${20 * s} ${40 * s} 0 q${30 * s} -${20 * s} ${40 * s} 0 q${10 * s} ${30 * s} -${40 * s} ${60 * s} z" />`;
};

// ============= Primitivas extras p/ parábolas (NT) =============

// Porco simpático (cena com porcos do Filho Pródigo).
const npPig = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <ellipse id="fill-${id}-body" cx="${cx}" cy="${cy}" rx="${70 * s}" ry="${40 * s}" />
    <circle id="fill-${id}-head" cx="${cx + 70 * s}" cy="${cy - 10 * s}" r="${30 * s}" />
    <rect id="fill-${id}-snout" x="${cx + 86 * s}" y="${cy - 10 * s}" width="${22 * s}" height="${18 * s}" rx="${6 * s}" />
    <rect id="fill-${id}-leg1" x="${cx - 50 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${30 * s}" />
    <rect id="fill-${id}-leg2" x="${cx + 30 * s}" y="${cy + 30 * s}" width="${16 * s}" height="${30 * s}" />
    <path id="fill-${id}-tail" d="M${cx - 70 * s} ${cy - 10 * s} q-${20 * s} -${10 * s} -${10 * s} -${24 * s}" fill="none" stroke-width="6" />
    <circle cx="${cx + 80 * s}" cy="${cy - 16 * s}" r="${3 * s}" />
    <circle cx="${cx + 92 * s}" cy="${cy - 4 * s}" r="${2 * s}" />
    <circle cx="${cx + 100 * s}" cy="${cy - 4 * s}" r="${2 * s}" />
  `;
};

// Moeda redonda. Útil para Filho Pródigo, Ovelha Perdida (10 dracmas) etc.
const npCoin = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <circle id="fill-${id}" cx="${cx}" cy="${cy}" r="${22 * s}" />
    <text x="${cx}" y="${cy + 6 * s}" text-anchor="middle" font-size="${20 * s}" fill="#2A2622" font-family="serif" font-weight="bold">$</text>
  `;
};

// Saco de moedas com gargalo amarrado.
const npMoneyBag = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-bag" d="M${cx - 50 * s} ${cy - 10 * s} q${50 * s} -${30 * s} ${100 * s} 0 q${10 * s} ${60 * s} -${50 * s} ${60 * s} q-${60 * s} 0 -${50 * s} -${60 * s} z" />
    <rect id="fill-${id}-tie" x="${cx - 18 * s}" y="${cy - 28 * s}" width="${36 * s}" height="${14 * s}" rx="${4 * s}" />
    <text x="${cx}" y="${cy + 26 * s}" text-anchor="middle" font-size="${28 * s}" fill="#2A2622" font-family="serif" font-weight="bold">$</text>
  `;
};

// Pedra grande (rocha base da casa).
const npRock = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}" d="M${cx - 130 * s} ${cy} q${30 * s} -${50 * s} ${130 * s} -${50 * s} q${100 * s} 0 ${130 * s} ${50 * s} v${30 * s} h-${260 * s} z" />
    <path d="M${cx - 80 * s} ${cy - 30 * s} l${20 * s} ${10 * s} M${cx + 60 * s} ${cy - 40 * s} l${10 * s} ${20 * s}" fill="none" />
  `;
};

// Areia / duna (base instável da segunda casa).
const npSand = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}" d="M${cx - 140 * s} ${cy + 30 * s} q${30 * s} -${20 * s} ${70 * s} -${20 * s} q${40 * s} 0 ${70 * s} -${10 * s} q${40 * s} 10 ${70 * s} 0 q${30 * s} ${0} ${70 * s} ${20 * s} v${20 * s} h-${280 * s} z" />
    <circle cx="${cx - 80 * s}" cy="${cy + 20 * s}" r="${2 * s}" />
    <circle cx="${cx + 30 * s}" cy="${cy + 30 * s}" r="${2 * s}" />
    <circle cx="${cx + 100 * s}" cy="${cy + 22 * s}" r="${2 * s}" />
  `;
};

// Casa simples — usada para Casa na Rocha. `pose="ok"` em pé / `pose="fall"` inclinada.
const npHouse = (id: string, cx: number, cy: number, scale = 1, pose: "ok" | "fall" = "ok") => {
  const s = scale;
  const tilt = pose === "fall" ? 8 : 0;
  // Aplica a inclinação via matriz simples (rotaciona em torno do canto inferior).
  const open =
    pose === "fall" ? `<g transform="rotate(${tilt} ${cx - 100 * s} ${cy + 80 * s})">` : `<g>`;
  return `${open}
    <path id="fill-${id}-roof" d="M${cx - 110 * s} ${cy - 20 * s} l${110 * s} -${70 * s} l${110 * s} ${70 * s} z" />
    <rect id="fill-${id}-wall" x="${cx - 100 * s}" y="${cy - 20 * s}" width="${200 * s}" height="${100 * s}" />
    <rect id="fill-${id}-door" x="${cx - 24 * s}" y="${cy + 20 * s}" width="${48 * s}" height="${60 * s}" />
    <rect id="fill-${id}-window" x="${cx + 40 * s}" y="${cy + 0 * s}" width="${36 * s}" height="${30 * s}" />
  </g>`;
};

// Semente individual (gota marrom).
const npSeed = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `<ellipse id="fill-${id}" cx="${cx}" cy="${cy}" rx="${8 * s}" ry="${5 * s}" />`;
};

// Espiga / planta crescida.
const npWheatPlant = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <rect id="fill-${id}-stem" x="${cx - 4 * s}" y="${cy - 60 * s}" width="${8 * s}" height="${60 * s}" />
    <ellipse id="fill-${id}-grain1" cx="${cx - 14 * s}" cy="${cy - 50 * s}" rx="${10 * s}" ry="${6 * s}" />
    <ellipse id="fill-${id}-grain2" cx="${cx + 14 * s}" cy="${cy - 50 * s}" rx="${10 * s}" ry="${6 * s}" />
    <ellipse id="fill-${id}-grain3" cx="${cx - 12 * s}" cy="${cy - 35 * s}" rx="${10 * s}" ry="${6 * s}" />
    <ellipse id="fill-${id}-grain4" cx="${cx + 12 * s}" cy="${cy - 35 * s}" rx="${10 * s}" ry="${6 * s}" />
    <ellipse id="fill-${id}-top" cx="${cx}" cy="${cy - 70 * s}" rx="${10 * s}" ry="${6 * s}" />
  `;
};

// Espinhos (terreno entre espinhos do Semeador).
const npThorn = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}-bush" d="M${cx - 30 * s} ${cy} q${30 * s} -${40 * s} ${60 * s} 0 v${20 * s} h-${60 * s} z" />
    <path d="M${cx - 20 * s} ${cy - 18 * s} l-${8 * s} -${10 * s} M${cx} ${cy - 26 * s} l0 -${12 * s} M${cx + 18 * s} ${cy - 18 * s} l${8 * s} -${10 * s}" fill="none" />
  `;
};

// Pássaro estilizado (comem as sementes do Semeador).
const npBird = (id: string, cx: number, cy: number, scale = 1) => {
  const s = scale;
  return `
    <path id="fill-${id}" d="M${cx - 20 * s} ${cy} q${20 * s} -${20 * s} ${40 * s} 0 q-${10 * s} ${10 * s} -${20 * s} ${10 * s} q-${10 * s} 0 -${20 * s} -${10 * s} z" />
    <path d="M${cx + 18 * s} ${cy - 4 * s} l${10 * s} -${4 * s}" fill="none" />
  `;
};

// Onda de tempestade simples (para Casa na Rocha — chuvas e enchente).
const npFlood = (id: string, y: number) => `
  <path id="fill-${id}" d="M0 ${y} q60 -30 120 0 q60 30 120 0 q60 -30 120 0 q60 30 120 0 q60 -30 120 0 v40 h-600 z" />
`;

// ============= 30 cenas premium — O Nascimento de Jesus =============

function generateNascimentoPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="nj${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("nj1", 360)}${npSunBig("nj1-sun", 110, 110, 50)}${npCloudBig("nj1-c", 470, 130)}${npHillBack("nj1-h")}${npFlowerBig("nj1-f1", 90, 540, 0.8)}${npFlowerBig("nj1-f2", 510, 540, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("nj2", 360)}${npAngel("nj2-a", 300, 380, 1.2)}${npGodLight("nj2-light")}${npCloudBig("nj2-c", 480, 130, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("nj3", 360)}${npEve("nj3-maria", 220, 470, 1.1)}${npAngel("nj3-a", 440, 380, 1)}${npGodLight("nj3-light")}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("nj4", 360)}${npEve("nj4-maria", 220, 470, 1.05)}${npNoah("nj4-jose", 420, 470, 1.1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("nj5", 360)}${npNoah("nj5-jose", 220, 470, 1.1, "carry")}${npEve("nj5-maria", 380, 470, 1.05)}${npDonkey("nj5-dk", 480, 480, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("nj6", 360)}${npHillBack("nj6-h")}${npDonkey("nj6-dk", 200, 470, 0.95)}${npEve("nj6-maria", 200, 440, 0.85)}${npNoah("nj6-jose", 380, 470, 1.05, "carry")}${npStarBig("nj6-star", 460, 130, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("nj7", 360)}${npPalace("nj7-pal", 300, 400, 0.9)}${npNoah("nj7-jose", 130, 470, 0.95, "point")}${npEve("nj7-maria", 480, 470, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("nj8", 360)}<rect id="fill-nj8-door" x="240" y="320" width="120" height="160" rx="14" /><path id="fill-nj8-x" d="M260 360 l80 80 m0 -80 l-80 80" fill="none" stroke-width="6" />${npNoah("nj8-jose", 460, 470, 0.95, "point")}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("nj9", 360)}<path id="fill-nj9-stable-roof" d="M120 280 l180 -80 l180 80 z" /><rect id="fill-nj9-stable-wall" x="140" y="280" width="320" height="200" /><rect id="fill-nj9-stable-door" x="270" y="360" width="60" height="120" />`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("nj10", 360)}${npEve("nj10-maria", 220, 470, 1.05)}${npNoah("nj10-jose", 400, 470, 1.05, "idle")}${npDonkey("nj10-dk", 540, 490, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("nj11", 360)}${npManger("nj11-m", 300, 440, 1.2)}${npStarBig("nj11-star", 300, 140, 1.1)}${npGodLight("nj11-light")}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("nj12", 360)}${npEve("nj12-maria", 200, 470, 1.05)}${npManger("nj12-m", 400, 460, 1)}${npStarBig("nj12-star", 480, 140, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("nj13", 360)}${npEve("nj13-maria", 180, 470, 1)}${npNoah("nj13-jose", 420, 470, 1.05, "idle")}${npManger("nj13-m", 300, 470, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("nj14", 360)}${npHillBack("nj14-h")}${npNoah("nj14-pas1", 180, 470, 1, "carry")}${npNoah("nj14-pas2", 360, 470, 1, "idle")}${npSheep("nj14-s1", 480, 500, 0.8)}${npSheep("nj14-s2", 540, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("nj15", 360)}${npAngel("nj15-a", 300, 350, 1.3)}${npGodLight("nj15-light")}${npNoah("nj15-pas", 130, 480, 0.85, "pray")}${npSheep("nj15-s", 480, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("nj16", 360)}${npStarBig("nj16-star", 300, 130, 1.3)}${npAngel("nj16-a1", 150, 320, 0.85)}${npAngel("nj16-a2", 450, 320, 0.85)}${npGodLight("nj16-light")}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("nj17", 360)}${npHillBack("nj17-h")}${npNoah("nj17-pas1", 150, 480, 0.95, "carry")}${npNoah("nj17-pas2", 320, 480, 0.95, "carry")}${npNoah("nj17-pas3", 480, 480, 0.95, "carry")}${npStarBig("nj17-star", 460, 140, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("nj18", 360)}${npManger("nj18-m", 300, 450, 1.05)}${npNoah("nj18-pas1", 130, 470, 0.85, "pray")}${npNoah("nj18-pas2", 470, 470, 0.85, "pray")}${npStarBig("nj18-star", 300, 130, 1)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("nj19", 360)}${npEve("nj19-maria", 200, 470, 1.05)}${npNoah("nj19-jose", 400, 470, 1.05, "idle")}${npSheep("nj19-s", 540, 510, 0.65)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("nj20", 360)}${npStarBig("nj20-star", 300, 110, 1.3)}${npHillBack("nj20-h")}${npNoah("nj20-mago1", 140, 470, 0.95, "carry")}${npNoah("nj20-mago2", 300, 470, 0.95, "carry")}${npNoah("nj20-mago3", 460, 470, 0.95, "carry")}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("nj21", 360)}${npNoah("nj21-mago1", 160, 470, 0.95, "point")}${npNoah("nj21-mago2", 320, 470, 0.95, "point")}${npNoah("nj21-mago3", 480, 470, 0.95, "point")}${npStarBig("nj21-star", 300, 120, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("nj22", 360)}${npPalace("nj22-pal", 300, 400, 0.95)}${npNoah("nj22-mago", 130, 470, 0.85, "carry")}${npNoah("nj22-her", 470, 470, 1.1, "point")}${npCrownPremium("nj22-cr", 470, 320, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("nj23", 360)}${npHillBack("nj23-h")}${npStarBig("nj23-star", 300, 110, 1.3)}${npDonkey("nj23-dk", 130, 490, 0.7)}${npNoah("nj23-mago", 320, 470, 0.95, "carry")}${npDonkey("nj23-dk2", 510, 490, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("nj24", 360)}<path id="fill-nj24-house-roof" d="M180 300 l120 -70 l120 70 z" /><rect id="fill-nj24-house" x="200" y="300" width="200" height="180" /><rect id="fill-nj24-door" x="280" y="380" width="40" height="100" />${npStarBig("nj24-star", 300, 140, 1)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("nj25", 360)}${npEve("nj25-maria", 200, 470, 1.05)}<circle id="fill-nj25-baby" cx="220" cy="430" r="22" />${npNoah("nj25-mago1", 360, 470, 0.95, "carry")}${npNoah("nj25-mago2", 480, 470, 0.95, "carry")}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("nj26", 360)}<rect id="fill-nj26-gold" x="120" y="430" width="80" height="60" rx="6" /><path id="fill-nj26-gold-top" d="M120 430 h80 v-14 h-80 z" /><circle id="fill-nj26-incense" cx="300" cy="460" r="28" /><path id="fill-nj26-myrrh" d="M440 430 h60 v60 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("nj27", 360)}${npAngel("nj27-a", 300, 380, 1.2)}${npNoah("nj27-jose", 130, 470, 0.95, "pray")}${npGodLight("nj27-light")}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("nj28", 360)}${npNoah("nj28-jose", 200, 470, 1.05, "carry")}${npEve("nj28-maria", 360, 470, 1)}<circle id="fill-nj28-baby" cx="380" cy="430" r="20" />${npDonkey("nj28-dk", 510, 490, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("nj29", 360)}${npHillBack("nj29-h")}<path id="fill-nj29-pyramid" d="M40 480 l130 -160 l130 160 z" />${npDonkey("nj29-dk", 380, 490, 0.7)}${npNoah("nj29-jose", 500, 470, 0.95, "carry")}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("nj30", 360)}${npFamily("nj30-fam", 300, 470, 1.2)}${npStarBig("nj30-star", 300, 130, 1.2)}${npHeart("nj30-h", 130, 200, 1)}${npHeart("nj30-h2", 470, 200, 1)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — Jesus e as Crianças =============

function generateJesusCriancasPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="jc${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("jc1", 360)}${npSunBig("jc1-sun", 110, 110, 50)}${npCloudBig("jc1-c", 470, 130)}${npHillBack("jc1-h")}${npTreeBig("jc1-t", 480, 470, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("jc2", 360)}${npNoah("jc2-jesus", 300, 470, 1.3, "idle")}${npGodLight("jc2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("jc3", 360)}${npNoah("jc3-jesus", 200, 470, 1.15, "point")}${npChild("jc3-c1", 380, 490, 0.9)}${npChild("jc3-c2", 480, 500, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("jc4", 360)}${npHillBack("jc4-h")}${npNoah("jc4-jesus", 200, 470, 1.1, "idle")}${npChild("jc4-c1", 360, 500, 0.85)}${npChild("jc4-c2", 460, 510, 0.8)}${npChild("jc4-c3", 540, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("jc5", 360)}${npNoah("jc5-jesus", 200, 470, 1.1, "idle")}${npNoah("jc5-disc1", 380, 470, 1, "point")}${npNoah("jc5-disc2", 500, 470, 1, "point")}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("jc6", 360)}${npChild("jc6-c1", 140, 510, 0.95)}${npChild("jc6-c2", 240, 510, 0.95)}${npChild("jc6-c3", 340, 510, 0.95)}${npChild("jc6-c4", 440, 510, 0.95)}${npChild("jc6-c5", 540, 510, 0.95)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("jc7", 360)}${npNoah("jc7-disc", 300, 470, 1.2, "point")}${npChild("jc7-c1", 130, 510, 0.85)}${npChild("jc7-c2", 470, 510, 0.85)}<path d="M280 380 q40 -10 80 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("jc8", 360)}${npNoah("jc8-jesus", 300, 470, 1.3, "point")}${npChild("jc8-c1", 130, 510, 0.85)}${npChild("jc8-c2", 470, 510, 0.85)}${npGodLight("jc8-light")}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("jc9", 360)}${npNoah("jc9-jesus", 200, 470, 1.1, "carry")}${npChild("jc9-c1", 380, 500, 0.9)}${npChild("jc9-c2", 480, 510, 0.85)}${npFlowerBig("jc9-f", 540, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("jc10", 360)}${npNoah("jc10-jesus", 300, 470, 1.2, "idle")}${npChild("jc10-c", 380, 480, 0.7)}<circle id="fill-jc10-arm" cx="370" cy="430" r="20" />`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("jc11", 360)}${npTreeBig("jc11-t", 130, 480, 0.9)}${npNoah("jc11-jesus", 320, 470, 1.2, "idle")}${npChild("jc11-c1", 460, 510, 0.85)}${npChild("jc11-c2", 540, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("jc12", 360)}${npNoah("jc12-jesus", 200, 470, 1.15, "idle")}${npChild("jc12-c1", 360, 510, 0.9)}${npChild("jc12-c2", 460, 510, 0.85)}${npChild("jc12-c3", 540, 510, 0.8)}<path id="fill-jc12-cesta" d="M280 460 h60 v40 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("jc13", 360)}${npNoah("jc13-jesus", 300, 470, 1.3, "carry")}<circle id="fill-jc13-baby" cx="320" cy="410" r="22" />`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("jc14", 360)}${npNoah("jc14-jesus", 300, 470, 1.2, "pray")}${npChild("jc14-c1", 130, 510, 0.9)}${npChild("jc14-c2", 470, 510, 0.9)}${npGodLight("jc14-light")}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("jc15", 360)}${npNoah("jc15-jesus", 300, 470, 1.25, "idle")}${npChild("jc15-c1", 130, 510, 0.9)}${npChild("jc15-c2", 470, 510, 0.9)}${npHeart("jc15-h", 300, 200, 1)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("jc16", 360)}${npNoah("jc16-jesus", 200, 470, 1.1, "idle")}${npChild("jc16-c", 380, 490, 0.95)}<path id="fill-jc16-pao" d="M460 480 q20 -20 40 0 q-20 14 -40 0 z" />`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("jc17", 360)}${npNoah("jc17-jesus", 300, 470, 1.2, "idle")}${npChild("jc17-c1", 130, 510, 0.85)}${npChild("jc17-c2", 230, 510, 0.85)}${npChild("jc17-c3", 380, 510, 0.85)}${npChild("jc17-c4", 480, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("jc18", 360)}${npHillBack("jc18-h")}${npNoah("jc18-jesus", 200, 470, 1.15, "idle")}${npChild("jc18-c", 380, 500, 0.95)}${npSheep("jc18-s", 510, 510, 0.65)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("jc19", 360)}${npNoah("jc19-jesus", 300, 470, 1.2, "idle")}${npChild("jc19-c1", 200, 510, 0.85)}${npChild("jc19-c2", 400, 510, 0.85)}${npFlowerBig("jc19-f1", 110, 540, 0.7)}${npFlowerBig("jc19-f2", 510, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("jc20", 360)}${npNoah("jc20-jesus", 300, 470, 1.25, "idle")}${npChild("jc20-c", 200, 480, 0.85)}<path id="fill-jc20-flute" d="M380 460 h60 v8 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("jc21", 360)}${npHillBack("jc21-h")}${npNoah("jc21-jesus", 200, 470, 1.1, "idle")}${npChild("jc21-c1", 360, 510, 0.85)}${npChild("jc21-c2", 460, 510, 0.85)}${npChild("jc21-c3", 540, 510, 0.8)}${npStar("jc21-st", 470, 130, 18)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("jc22", 360)}${npNoah("jc22-jesus", 300, 470, 1.3, "idle")}${npChild("jc22-c1", 140, 510, 0.85)}${npChild("jc22-c2", 460, 510, 0.85)}<path id="fill-jc22-tablet" d="M260 220 h80 v100 h-80 z" />`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("jc23", 360)}${npNoah("jc23-jesus", 200, 470, 1.1, "carry")}${npChild("jc23-c1", 380, 510, 0.9)}${npChild("jc23-c2", 480, 510, 0.85)}${npChild("jc23-c3", 540, 510, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("jc24", 360)}${npNoah("jc24-jesus", 300, 470, 1.25, "idle")}${npChild("jc24-c", 200, 490, 0.85)}${npNoah("jc24-mae", 460, 470, 1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("jc25", 360)}${npHillBack("jc25-h")}${npNoah("jc25-jesus", 300, 470, 1.25, "point")}${npChild("jc25-c1", 130, 510, 0.85)}${npChild("jc25-c2", 470, 510, 0.85)}${npStarBig("jc25-st", 110, 130, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("jc26", 360)}${npNoah("jc26-jesus", 300, 470, 1.3, "carry")}<circle id="fill-jc26-baby" cx="320" cy="410" r="20" />${npChild("jc26-c", 480, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("jc27", 360)}${npNoah("jc27-jesus", 200, 470, 1.1, "idle")}${npChild("jc27-c1", 360, 510, 0.85)}${npChild("jc27-c2", 460, 510, 0.85)}${npFamily("jc27-fam", 540, 480, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("jc28", 360)}${npNoah("jc28-jesus", 300, 470, 1.25, "pray")}${npChild("jc28-c1", 130, 510, 0.9)}${npChild("jc28-c2", 470, 510, 0.9)}${npGodLight("jc28-light")}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("jc29", 360)}${npRainbowBig("jc29-rb", 300, 340, 540)}${npNoah("jc29-jesus", 200, 470, 1.1, "idle")}${npChild("jc29-c1", 380, 510, 0.85)}${npChild("jc29-c2", 480, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("jc30", 360)}${npNoah("jc30-jesus", 300, 470, 1.3, "idle")}${npChild("jc30-c1", 130, 510, 0.9)}${npChild("jc30-c2", 470, 510, 0.9)}${npHeart("jc30-h", 110, 180, 0.9)}${npHeart("jc30-h2", 490, 180, 0.9)}${npSunBig("jc30-sun", 300, 130, 40)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — Jesus Acalma a Tempestade =============

function generateTempestadePremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="te${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndSea("te1", 360)}${npSunBig("te1-sun", 110, 110, 48)}${npCloudBig("te1-c", 470, 120)}${npBoatJesus("te1-b", 300, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndSea("te2", 360)}${npHillBack("te2-h")}${npNoah("te2-jesus", 200, 470, 1.1, "idle")}${npNoah("te2-disc1", 360, 470, 1, "idle")}${npNoah("te2-disc2", 480, 470, 1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndSea("te3", 360)}${npNoah("te3-jesus", 200, 470, 1.1, "point")}${npBoatJesus("te3-b", 420, 480, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndSea("te4", 360)}${npBoatJesus("te4-b", 300, 460, 1)}${npSunBig("te4-sun", 110, 100, 42)}${npCloudBig("te4-c", 480, 120, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndSea("te5", 360)}${npBoatJesus("te5-b", 300, 460, 1)}${npFishSmall("te5-f1", 130, 530, 1)}${npFishSmall("te5-f2", 470, 530, 1)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndSea("te6", 360)}${npBoatJesus("te6-b", 300, 460, 1)}${npNoah("te6-disc", 240, 410, 0.7, "point")}${npNoah("te6-disc2", 360, 410, 0.7, "point")}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndSea("te7", 360)}${npBoatJesus("te7-b", 300, 460, 1)}<path id="fill-te7-pillow" d="M260 470 q40 -16 80 0 v20 q-40 14 -80 0 z" />${npNoah("te7-jesus", 300, 460, 0.6, "idle")}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndSea("te8", 320)}${npCloudBig("te8-c1", 130, 100, 1.1)}${npCloudBig("te8-c2", 470, 120, 1.1)}${npRain(20, 1)}${npBoatJesus("te8-b", 300, 460, 1)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndSea("te9", 320)}${npCloudBig("te9-c1", 130, 100, 1.2)}${npCloudBig("te9-c2", 470, 110, 1.2)}${npWaveBig("te9-w1", 30, 480, 280, 50)}${npWaveBig("te9-w2", 290, 480, 280, 50)}${npBoatJesus("te9-b", 300, 460, 1)}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndSea("te10", 320)}${npRain(24, 2)}${npBoatJesus("te10-b", 300, 460, 1)}${npNoah("te10-disc", 260, 420, 0.65, "point")}${npNoah("te10-disc2", 340, 420, 0.65, "point")}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndSea("te11", 320)}${npCloudBig("te11-c", 300, 100, 1.4)}${npRain(28, 3)}${npWaveBig("te11-w1", 30, 480, 270, 60)}${npWaveBig("te11-w2", 290, 480, 270, 60)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndSea("te12", 320)}${npRain(20, 4)}${npBoatJesus("te12-b", 300, 460, 1.1)}${npNoah("te12-jesus", 300, 460, 0.55, "idle")}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndSea("te13", 320)}${npRain(20, 5)}${npBoatJesus("te13-b", 300, 460, 1)}${npNoah("te13-disc1", 240, 410, 0.7, "point")}${npNoah("te13-disc2", 360, 410, 0.7, "point")}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndSea("te14", 320)}${npCloudBig("te14-c", 300, 100, 1.4)}${npRain(24, 6)}${npNoah("te14-disc", 200, 420, 0.7, "pray")}${npNoah("te14-disc2", 400, 420, 0.7, "pray")}${npBoatJesus("te14-b", 300, 460, 1)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndSea("te15", 320)}${npBoatJesus("te15-b", 300, 460, 1)}${npNoah("te15-disc", 200, 420, 0.7, "point")}${npNoah("te15-jesus", 380, 420, 0.85, "idle")}${npRain(14, 7)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndSea("te16", 320)}${npNoah("te16-jesus", 300, 470, 1.3, "point")}${npGodLight("te16-light")}${npRain(10, 8)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndSea("te17", 360)}${npNoah("te17-jesus", 300, 470, 1.3, "point")}${npCloudBig("te17-c", 130, 110, 0.9)}${npCloudBig("te17-c2", 470, 120, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndSea("te18", 360)}${npNoah("te18-jesus", 300, 470, 1.3, "idle")}${npSunBig("te18-sun", 110, 110, 46)}${npGodLight("te18-light")}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndSea("te19", 360)}${npBoatJesus("te19-b", 300, 460, 1)}${npSunBig("te19-sun", 110, 110, 46)}${npCloudBig("te19-c", 470, 120, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndSea("te20", 360)}${npBoatJesus("te20-b", 300, 460, 1)}${npNoah("te20-jesus", 300, 460, 0.6, "idle")}${npNoah("te20-disc", 380, 410, 0.6, "pray")}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndSea("te21", 360)}${npBoatJesus("te21-b", 300, 460, 1.05)}${npFishSmall("te21-f1", 130, 540, 1.1)}${npFishSmall("te21-f2", 470, 540, 1.1)}${npFishSmall("te21-f3", 90, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndSea("te22", 360)}${npNoah("te22-jesus", 200, 470, 1.1, "idle")}${npNoah("te22-disc1", 360, 470, 1, "pray")}${npNoah("te22-disc2", 480, 470, 1, "pray")}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndSea("te23", 360)}${npHillBack("te23-h")}${npBoatJesus("te23-b", 300, 460, 1)}${npRainbowBig("te23-rb", 300, 320, 540)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndSea("te24", 360)}${npNoah("te24-jesus", 300, 470, 1.3, "idle")}${npGodLight("te24-light")}${npStarBig("te24-star", 110, 140, 0.85)}${npStarBig("te24-star2", 490, 140, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndSea("te25", 360)}${npBoatJesus("te25-b", 200, 460, 0.85)}${npHillBack("te25-h")}${npNoah("te25-jesus", 460, 470, 1.1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndSea("te26", 360)}${npNoah("te26-jesus", 200, 470, 1.1, "idle")}${npNoah("te26-disc1", 360, 470, 1, "carry")}${npNoah("te26-disc2", 480, 470, 1, "carry")}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndSea("te27", 360)}${npHillBack("te27-h")}${npNoah("te27-povo1", 130, 470, 0.95, "idle")}${npFamily("te27-fam", 320, 480, 0.95)}${npNoah("te27-povo2", 510, 470, 0.95, "idle")}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndSea("te28", 360)}${npNoah("te28-jesus", 300, 470, 1.3, "pray")}${npNoah("te28-disc", 130, 480, 0.9, "pray")}${npNoah("te28-disc2", 470, 480, 0.9, "pray")}${npGodLight("te28-light")}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndSea("te29", 360)}${npRainbowBig("te29-rb", 300, 340, 540)}${npFamily("te29-fam", 300, 480, 1.15)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndSea("te30", 360)}${npNoah("te30-jesus", 300, 470, 1.3, "idle")}${npHeart("te30-h", 130, 200, 1)}${npHeart("te30-h2", 470, 200, 1)}${npSunBig("te30-sun", 110, 110, 46)}${npFishSmall("te30-f", 540, 540, 1)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — A Multiplicação dos Pães =============

function generateMultiplicacaoPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="mp${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("mp1", 360)}${npSunBig("mp1-sun", 110, 110, 50)}${npCloudBig("mp1-c", 470, 130)}${npHillBack("mp1-h")}${npFlowerBig("mp1-f", 110, 540, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("mp2", 360)}${npNoah("mp2-jesus", 300, 470, 1.3, "idle")}${npHillBack("mp2-h")}${npGodLight("mp2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("mp3", 360)}${npNoah("mp3-jesus", 200, 470, 1.1, "point")}${npNoah("mp3-disc1", 380, 470, 1, "idle")}${npNoah("mp3-disc2", 500, 470, 1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("mp4", 360)}${npHillBack("mp4-h")}${npFamily("mp4-f1", 150, 480, 0.85)}${npFamily("mp4-f2", 320, 480, 0.85)}${npFamily("mp4-f3", 490, 480, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("mp5", 360)}${npNoah("mp5-povo1", 130, 480, 0.85, "idle")}${npNoah("mp5-povo2", 230, 480, 0.85, "idle")}${npNoah("mp5-povo3", 330, 480, 0.85, "idle")}${npNoah("mp5-povo4", 430, 480, 0.85, "idle")}${npNoah("mp5-povo5", 530, 480, 0.85, "idle")}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("mp6", 360)}${npNoah("mp6-jesus", 300, 470, 1.25, "idle")}${npFamily("mp6-fam", 130, 480, 0.85)}${npFamily("mp6-fam2", 470, 480, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("mp7", 360)}${npNoah("mp7-jesus", 300, 470, 1.3, "point")}${npGodLight("mp7-light")}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("mp8", 360)}${npNoah("mp8-jesus", 200, 470, 1.1, "idle")}${npNoah("mp8-disc1", 360, 470, 1, "point")}${npNoah("mp8-disc2", 480, 470, 1, "point")}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("mp9", 360)}${npNoah("mp9-disc", 200, 470, 1.1, "point")}${npNoah("mp9-disc2", 400, 470, 1.1, "point")}<path id="fill-mp9-money" d="M280 380 h60 v40 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("mp10", 360)}${npChild("mp10-menino", 300, 490, 1.1)}${npLoavesBasket("mp10-cesto", 460, 490, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("mp11", 360)}${npNoah("mp11-andr", 200, 470, 1.1, "carry")}${npChild("mp11-menino", 400, 490, 1)}${npLoavesBasket("mp11-cesto", 510, 500, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("mp12", 360)}${npNoah("mp12-jesus", 200, 470, 1.1, "idle")}${npChild("mp12-menino", 380, 490, 1)}${npLoavesBasket("mp12-cesto", 510, 500, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("mp13", 360)}${npNoah("mp13-jesus", 300, 470, 1.3, "carry")}${npLoavesBasket("mp13-cesto", 300, 480, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("mp14", 360)}${npNoah("mp14-jesus", 300, 470, 1.3, "pray")}${npLoavesBasket("mp14-cesto", 300, 470, 0.7)}${npGodLight("mp14-light")}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("mp15", 360)}${npNoah("mp15-jesus", 300, 470, 1.3, "point")}${npLoaf("mp15-l1", 220, 410, 1.5)}${npLoaf("mp15-l2", 380, 410, 1.5)}${npFishSmall("mp15-f", 300, 470, 1.5)}${npGodLight("mp15-light")}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("mp16", 360)}${npLoaf("mp16-l1", 130, 480, 1.4)}${npLoaf("mp16-l2", 250, 480, 1.4)}${npLoaf("mp16-l3", 370, 480, 1.4)}${npLoaf("mp16-l4", 490, 480, 1.4)}${npFishSmall("mp16-f1", 130, 540, 1.2)}${npFishSmall("mp16-f2", 470, 540, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("mp17", 360)}${npNoah("mp17-disc1", 200, 470, 1.05, "carry")}${npNoah("mp17-disc2", 320, 470, 1.05, "carry")}${npNoah("mp17-disc3", 440, 470, 1.05, "carry")}${npLoavesBasket("mp17-cesto", 540, 510, 0.5)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("mp18", 360)}${npFamily("mp18-f1", 200, 480, 1)}${npLoavesBasket("mp18-cesto", 350, 490, 0.6)}${npFamily("mp18-f2", 480, 480, 1)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("mp19", 360)}${npChild("mp19-c1", 130, 510, 0.85)}${npChild("mp19-c2", 230, 510, 0.85)}${npChild("mp19-c3", 330, 510, 0.85)}${npChild("mp19-c4", 430, 510, 0.85)}${npChild("mp19-c5", 530, 510, 0.85)}${npLoaf("mp19-l", 300, 410, 1.4)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("mp20", 360)}${npNoah("mp20-jesus", 200, 470, 1.1, "idle")}${npFamily("mp20-fam", 420, 480, 1)}${npLoavesBasket("mp20-cesto", 540, 510, 0.5)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("mp21", 360)}${npNoah("mp21-jesus", 300, 470, 1.25, "point")}${npNoah("mp21-disc1", 130, 480, 0.9, "carry")}${npNoah("mp21-disc2", 470, 480, 0.9, "carry")}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("mp22", 360)}${npLoavesBasket("mp22-c1", 130, 500, 0.7)}${npLoavesBasket("mp22-c2", 300, 500, 0.7)}${npLoavesBasket("mp22-c3", 470, 500, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("mp23", 360)}${npLoavesBasket("mp23-c1", 110, 500, 0.55)}${npLoavesBasket("mp23-c2", 230, 500, 0.55)}${npLoavesBasket("mp23-c3", 350, 500, 0.55)}${npLoavesBasket("mp23-c4", 470, 500, 0.55)}${npLoavesBasket("mp23-c5", 540, 540, 0.4)}${npLoavesBasket("mp23-c6", 110, 540, 0.4)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("mp24", 360)}${npNoah("mp24-jesus", 300, 470, 1.25, "idle")}${npChild("mp24-c", 460, 510, 0.95)}${npLoavesBasket("mp24-cesto", 130, 500, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("mp25", 360)}${npFamily("mp25-fam", 300, 470, 1.2)}${npLoaf("mp25-l", 130, 480, 1.2)}${npLoaf("mp25-l2", 470, 480, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("mp26", 360)}${npNoah("mp26-jesus", 300, 470, 1.3, "point")}${npHeart("mp26-h", 130, 220, 0.9)}${npHeart("mp26-h2", 470, 220, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("mp27", 360)}${npNoah("mp27-jesus", 200, 470, 1.1, "idle")}${npChild("mp27-menino", 380, 490, 1.05)}${npNoah("mp27-mae", 510, 470, 0.95, "idle")}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("mp28", 360)}${npNoah("mp28-jesus", 300, 470, 1.25, "pray")}${npFamily("mp28-fam", 130, 480, 0.85)}${npFamily("mp28-fam2", 470, 480, 0.85)}${npGodLight("mp28-light")}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("mp29", 360)}${npRainbowBig("mp29-rb", 300, 340, 540)}${npFamily("mp29-fam", 300, 480, 1.15)}${npLoavesBasket("mp29-cesto", 110, 530, 0.55)}${npLoavesBasket("mp29-cesto2", 490, 530, 0.55)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("mp30", 360)}${npNoah("mp30-jesus", 300, 470, 1.3, "idle")}${npChild("mp30-menino", 460, 510, 0.9)}${npLoavesBasket("mp30-cesto", 130, 500, 0.7)}${npSunBig("mp30-sun", 110, 130, 38)}${npHeart("mp30-h", 480, 200, 0.9)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — O Bom Samaritano =============

function generateSamaritanoPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="bs${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("bs1", 360)}${npSunBig("bs1-sun", 110, 110, 48)}${npCloudBig("bs1-c", 470, 130)}${npHillBack("bs1-h")}${npTreeBig("bs1-t", 480, 470, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("bs2", 360)}${npNoah("bs2-jesus", 300, 470, 1.3, "point")}${npGodLight("bs2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("bs3", 360)}${npNoah("bs3-jesus", 200, 470, 1.1, "idle")}${npNoah("bs3-disc1", 360, 470, 1, "idle")}${npNoah("bs3-disc2", 480, 470, 1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("bs4", 360)}${npHillBack("bs4-h")}<path id="fill-bs4-road" d="M40 540 q260 -160 520 0 v40 h-520 z" />${npNoah("bs4-viaj", 300, 470, 1.1, "carry")}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("bs5", 360)}${npNoah("bs5-viaj", 200, 470, 1.05, "carry")}${npDonkey("bs5-dk", 410, 490, 0.8)}${npHillBack("bs5-h")}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("bs6", 360)}${npNoah("bs6-viaj", 200, 470, 1.05, "carry")}${npNoah("bs6-bandit1", 380, 470, 1.05, "point")}${npNoah("bs6-bandit2", 500, 470, 1.05, "point")}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("bs7", 360)}${npNoah("bs7-bandit1", 200, 470, 1.05, "point")}${npNoah("bs7-bandit2", 320, 470, 1.05, "point")}${npNoah("bs7-bandit3", 440, 470, 1.05, "point")}<path id="fill-bs7-stick" d="M540 380 h10 v160 h-10 z" />`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("bs8", 360)}${npBandageMan("bs8-vit", 300, 460, 1)}${npHillBack("bs8-h")}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("bs9", 360)}${npBandageMan("bs9-vit", 220, 460, 0.95)}<path id="fill-bs9-bag" d="M380 460 q30 -10 60 0 v40 h-60 z" />${npHillBack("bs9-h")}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("bs10", 360)}${npNoah("bs10-sac", 200, 470, 1.05, "carry")}${npBandageMan("bs10-vit", 420, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("bs11", 360)}${npNoah("bs11-sac", 220, 470, 1.05, "point")}<path d="M280 380 q40 -10 80 0" fill="none" />${npBandageMan("bs11-vit", 460, 460, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("bs12", 360)}${npNoah("bs12-sac", 460, 470, 1.05, "point")}${npBandageMan("bs12-vit", 200, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("bs13", 360)}${npNoah("bs13-lev", 200, 470, 1.05, "carry")}${npBandageMan("bs13-vit", 420, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("bs14", 360)}${npNoah("bs14-lev", 240, 470, 1.05, "point")}${npBandageMan("bs14-vit", 460, 460, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("bs15", 360)}${npNoah("bs15-lev", 460, 470, 1.05, "point")}${npBandageMan("bs15-vit", 200, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("bs16", 360)}${npHillBack("bs16-h")}${npNoah("bs16-sam", 200, 470, 1.05, "carry")}${npDonkey("bs16-dk", 380, 490, 0.85)}${npBandageMan("bs16-vit", 540, 460, 0.55)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("bs17", 360)}${npNoah("bs17-sam", 200, 470, 1.05, "pray")}${npBandageMan("bs17-vit", 420, 460, 0.95)}${npHeart("bs17-h", 110, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("bs18", 360)}${npNoah("bs18-sam", 220, 470, 1.05, "carry")}${npBandageMan("bs18-vit", 420, 460, 0.95)}<rect id="fill-bs18-jar" x="380" y="380" width="36" height="60" rx="6" />`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("bs19", 360)}${npNoah("bs19-sam", 220, 470, 1.05, "idle")}${npBandageMan("bs19-vit", 420, 460, 1)}<rect id="fill-bs19-bandage" x="380" y="380" width="80" height="14" rx="6" />`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("bs20", 360)}${npNoah("bs20-sam", 200, 470, 1.05, "carry")}${npBandageMan("bs20-vit", 380, 460, 0.95)}${npDonkey("bs20-dk", 510, 490, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("bs21", 360)}${npNoah("bs21-sam", 220, 470, 1.05, "carry")}${npDonkey("bs21-dk", 380, 490, 0.85)}${npBandageMan("bs21-vit", 380, 440, 0.55)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("bs22", 360)}${npHillBack("bs22-h")}${npDonkey("bs22-dk", 200, 490, 0.85)}${npNoah("bs22-sam", 380, 470, 1.05, "carry")}<path id="fill-bs22-road" d="M40 540 q260 -160 520 0 v40 h-520 z" />`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("bs23", 360)}<path id="fill-bs23-house-roof" d="M120 280 l180 -80 l180 80 z" /><rect id="fill-bs23-house" x="140" y="280" width="320" height="200" /><rect id="fill-bs23-door" x="270" y="380" width="60" height="100" />${npStarBig("bs23-st", 110, 130, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("bs24", 360)}${npNoah("bs24-sam", 200, 470, 1.05, "carry")}${npNoah("bs24-host", 420, 470, 1.05, "idle")}${npBandageMan("bs24-vit", 540, 460, 0.55)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("bs25", 360)}${npNoah("bs25-sam", 200, 470, 1.05, "point")}${npNoah("bs25-host", 420, 470, 1.05, "carry")}<rect id="fill-bs25-coin1" x="280" y="380" width="20" height="20" rx="4" /><rect id="fill-bs25-coin2" x="310" y="380" width="20" height="20" rx="4" /><rect id="fill-bs25-coin3" x="340" y="380" width="20" height="20" rx="4" />`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("bs26", 360)}${npBandageMan("bs26-vit", 220, 460, 0.95)}${npNoah("bs26-host", 460, 470, 1.05, "idle")}<path id="fill-bs26-bowl" d="M380 470 q30 20 60 0 v20 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("bs27", 360)}${npNoah("bs27-sam", 200, 470, 1.05, "idle")}${npDonkey("bs27-dk", 420, 490, 0.85)}<path d="M40 540 q260 -160 520 0" fill="none" stroke-dasharray="6 6" />`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("bs28", 360)}${npNoah("bs28-jesus", 300, 470, 1.3, "point")}${npNoah("bs28-disc", 130, 480, 0.9, "idle")}${npNoah("bs28-disc2", 470, 480, 0.9, "idle")}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("bs29", 360)}${npNoah("bs29-jesus", 300, 470, 1.3, "idle")}${npHeart("bs29-h1", 130, 200, 0.9)}${npHeart("bs29-h2", 470, 200, 0.9)}${npGodLight("bs29-light")}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("bs30", 360)}${npFamily("bs30-fam", 300, 470, 1.2)}${npHeart("bs30-h", 110, 180, 0.9)}${npHeart("bs30-h2", 490, 180, 0.9)}${npSunBig("bs30-sun", 300, 130, 40)}${npFlowerBig("bs30-f1", 90, 540, 0.75)}${npFlowerBig("bs30-f2", 510, 540, 0.75)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — O Filho Pródigo =============

function generateProdigoPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="fp${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("fp1", 360)}${npSunBig("fp1-sun", 110, 110, 50)}${npCloudBig("fp1-c", 470, 130)}<path id="fill-fp1-house-roof" d="M180 280 l120 -70 l120 70 z" /><rect id="fill-fp1-house" x="200" y="280" width="240" height="200" /><rect id="fill-fp1-door" x="290" y="380" width="60" height="100" />`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("fp2", 360)}${npNoah("fp2-pai", 220, 470, 1.2, "idle")}${npNoah("fp2-fmais", 360, 470, 1.05, "carry")}${npNoah("fp2-fmenor", 480, 470, 1.05, "idle")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("fp3", 360)}${npNoah("fp3-pai", 200, 470, 1.2, "idle")}${npNoah("fp3-fmenor", 380, 470, 1.05, "point")}${npMoneyBag("fp3-bag", 480, 460, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("fp4", 360)}${npNoah("fp4-pai", 220, 470, 1.2, "carry")}${npMoneyBag("fp4-bag1", 380, 460, 0.85)}${npMoneyBag("fp4-bag2", 470, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("fp5", 360)}${npNoah("fp5-pai", 200, 470, 1.15, "pray")}${npNoah("fp5-fmenor", 400, 470, 1.05, "carry")}${npMoneyBag("fp5-bag", 500, 460, 0.85)}${npHeart("fp5-h", 200, 280, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("fp6", 360)}${npHillBack("fp6-h")}${npNoah("fp6-fmenor", 200, 470, 1.1, "carry")}${npMoneyBag("fp6-bag", 300, 460, 0.85)}${npDonkey("fp6-dk", 460, 490, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("fp7", 360)}${npHillBack("fp7-h")}${npPalace("fp7-pal", 320, 380, 0.95)}${npNoah("fp7-fmenor", 130, 470, 0.95, "point")}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("fp8", 360)}${npNoah("fp8-fmenor", 200, 470, 1.1, "carry")}${npNoah("fp8-amigo1", 360, 470, 1.05, "idle")}${npNoah("fp8-amigo2", 480, 470, 1.05, "idle")}${npMoneyBag("fp8-bag", 290, 450, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("fp9", 360)}${npNoah("fp9-fmenor", 200, 470, 1.05, "idle")}${npNoah("fp9-amigo1", 360, 470, 1.05, "idle")}${npNoah("fp9-amigo2", 480, 470, 1.05, "idle")}${npCoin("fp9-co1", 290, 380, 1)}${npCoin("fp9-co2", 320, 380, 1)}${npCoin("fp9-co3", 350, 380, 1)}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("fp10", 360)}${npNoah("fp10-fmenor", 300, 470, 1.1, "idle")}${npLoavesBasket("fp10-bk", 200, 480, 1)}${npLoaf("fp10-l1", 420, 460, 1)}${npLoaf("fp10-l2", 480, 460, 1)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("fp11", 360)}${npNoah("fp11-fmenor", 200, 470, 1.05, "idle")}${npNoah("fp11-amigo1", 360, 470, 1.05, "carry")}${npMoneyBag("fp11-bag", 460, 460, 0.7)}<path d="M260 380 q40 -10 80 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("fp12", 360)}${npHillBack("fp12-h")}${npRain(20, 1)}${npNoah("fp12-fmenor", 300, 470, 1.05, "pray")}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("fp13", 360)}${npNoah("fp13-fmenor", 200, 470, 1.05, "idle")}${npNoah("fp13-fazend", 460, 470, 1.1, "point")}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("fp14", 360)}${npHillBack("fp14-h")}${npNoah("fp14-fmenor", 200, 470, 1, "carry")}${npPig("fp14-p1", 380, 480, 0.85)}${npPig("fp14-p2", 510, 490, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("fp15", 360)}${npNoah("fp15-fmenor", 200, 470, 1, "idle")}${npPig("fp15-p1", 360, 480, 0.9)}${npPig("fp15-p2", 480, 490, 0.85)}<path id="fill-fp15-trough" d="M340 510 h180 v20 h-180 z" />`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("fp16", 360)}${npNoah("fp16-fmenor", 300, 470, 1.05, "pray")}${npPig("fp16-p", 460, 490, 0.7)}${npHeart("fp16-h", 110, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("fp17", 360)}${npNoah("fp17-fmenor", 300, 470, 1.05, "idle")}${npGodLight("fp17-light")}<path d="M260 320 q40 -10 80 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("fp18", 360)}${npHillBack("fp18-h")}${npNoah("fp18-fmenor", 200, 470, 1.05, "carry")}<path id="fill-fp18-road" d="M40 540 q260 -160 520 0 v40 h-520 z" />`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("fp19", 360)}${npHillBack("fp19-h")}${npNoah("fp19-pai", 460, 470, 1.2, "point")}${npNoah("fp19-fmenor", 130, 480, 0.95, "carry")}<path id="fill-fp19-road" d="M40 540 q260 -160 520 0 v40 h-520 z" />`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("fp20", 360)}${npNoah("fp20-pai", 220, 470, 1.2, "carry")}${npNoah("fp20-fmenor", 380, 470, 1.05, "pray")}${npHeart("fp20-h", 300, 200, 1.1)}${npGodLight("fp20-light")}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("fp21", 360)}${npNoah("fp21-pai", 240, 470, 1.2, "carry")}${npNoah("fp21-fmenor", 380, 470, 1.05, "idle")}<rect id="fill-fp21-robe" x="200" y="380" width="200" height="14" rx="6" />`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("fp22", 360)}${npNoah("fp22-pai", 200, 470, 1.15, "carry")}${npNoah("fp22-fmenor", 360, 470, 1.05, "idle")}${npCoin("fp22-ring", 380, 410, 0.7)}<rect id="fill-fp22-sandal" x="440" y="510" width="60" height="20" rx="6" />`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("fp23", 360)}<path id="fill-fp23-house-roof" d="M120 280 l180 -80 l180 80 z" /><rect id="fill-fp23-house" x="140" y="280" width="320" height="200" /><rect id="fill-fp23-door" x="270" y="380" width="60" height="100" />${npStarBig("fp23-st", 110, 130, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("fp24", 360)}${npNoah("fp24-pai", 200, 470, 1.15, "point")}${npNoah("fp24-criado", 380, 470, 1.05, "idle")}${npCoin("fp24-ring", 320, 410, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("fp25", 360)}<rect id="fill-fp25-table" x="100" y="430" width="400" height="20" /><path id="fill-fp25-leg1" d="M120 450 v60" fill="none" stroke-width="6" /><path id="fill-fp25-leg2" d="M480 450 v60" fill="none" stroke-width="6" />${npLoaf("fp25-l1", 180, 410, 1.1)}${npLoaf("fp25-l2", 300, 410, 1.1)}${npLoaf("fp25-l3", 420, 410, 1.1)}${npFishBig("fp25-fi", 520, 410, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("fp26", 360)}${npFamily("fp26-fam", 300, 470, 1.2)}${npHeart("fp26-h", 110, 200, 0.85)}${npHeart("fp26-h2", 490, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("fp27", 360)}${npHillBack("fp27-h")}${npNoah("fp27-fmais", 460, 470, 1.1, "point")}<path id="fill-fp27-road" d="M40 540 q260 -160 520 0 v40 h-520 z" /><path d="M280 380 q40 -10 80 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("fp28", 360)}${npNoah("fp28-pai", 220, 470, 1.2, "idle")}${npNoah("fp28-fmais", 460, 470, 1.1, "point")}${npHeart("fp28-h", 130, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("fp29", 360)}${npNoah("fp29-pai", 200, 470, 1.15, "carry")}${npNoah("fp29-fmais", 360, 470, 1.1, "idle")}${npNoah("fp29-fmenor", 480, 470, 1.05, "idle")}${npGodLight("fp29-light")}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("fp30", 360)}${npFamily("fp30-fam", 300, 470, 1.25)}${npHeart("fp30-h", 110, 180, 0.9)}${npHeart("fp30-h2", 490, 180, 0.9)}${npSunBig("fp30-sun", 300, 130, 40)}${npFlowerBig("fp30-f1", 90, 540, 0.75)}${npFlowerBig("fp30-f2", 510, 540, 0.75)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — A Ovelha Perdida =============

function generateOvelhaPerdidaPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="op${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("op1", 360)}${npSunBig("op1-sun", 110, 110, 50)}${npCloudBig("op1-c", 470, 130)}${npHillBack("op1-h")}${npFlowerBig("op1-f1", 90, 540, 0.8)}${npFlowerBig("op1-f2", 510, 540, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("op2", 360)}${npNoah("op2-jesus", 300, 470, 1.3, "point")}${npGodLight("op2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("op3", 360)}${npNoah("op3-pastor", 220, 470, 1.15, "idle")}${npStaff("op3-st", 280, 460, 1)}${npSheep("op3-s1", 380, 510, 0.85)}${npSheep("op3-s2", 470, 510, 0.85)}${npSheep("op3-s3", 540, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("op4", 360)}${npHillBack("op4-h")}${npNoah("op4-pastor", 200, 470, 1.1, "idle")}${npSheep("op4-s1", 340, 510, 0.8)}${npSheep("op4-s2", 410, 510, 0.8)}${npSheep("op4-s3", 470, 510, 0.8)}${npSheep("op4-s4", 530, 510, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("op5", 360)}${npSheep("op5-s1", 130, 510, 0.8)}${npSheep("op5-s2", 230, 510, 0.8)}${npSheep("op5-s3", 320, 510, 0.8)}${npSheep("op5-s4", 410, 510, 0.8)}${npSheep("op5-s5", 500, 510, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("op6", 360)}${npSheep("op6-s1", 130, 510, 0.7)}${npSheep("op6-s2", 200, 510, 0.7)}${npSheep("op6-s3", 270, 510, 0.7)}${npSheep("op6-s4", 340, 510, 0.7)}${npSheep("op6-s5", 410, 510, 0.7)}${npSheep("op6-s6", 480, 510, 0.7)}${npSheep("op6-s7", 540, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("op7", 360)}${npHillBack("op7-h")}${npNoah("op7-pastor", 320, 470, 1.1, "carry")}${npSheep("op7-s", 460, 510, 0.8)}${npFlowerBig("op7-f", 110, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("op8", 360)}${npHillBack("op8-h")}${npNoah("op8-pastor", 200, 470, 1.1, "idle")}${npSheep("op8-s1", 360, 510, 0.85)}${npSheep("op8-s2", 470, 510, 0.85)}${npSheep("op8-stray", 540, 530, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("op9", 360)}${npHillBack("op9-h")}${npSheep("op9-stray", 300, 510, 1)}${npFlowerBig("op9-f", 480, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("op10", 360)}${npSheep("op10-stray", 300, 510, 1)}${npTreeBig("op10-t1", 130, 460, 0.85)}${npTreeBig("op10-t2", 480, 460, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("op11", 360)}${npHillBack("op11-h")}${npNoah("op11-pastor", 300, 470, 1.15, "point")}${npSheep("op11-s1", 130, 510, 0.7)}${npSheep("op11-s2", 470, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("op12", 360)}${npNoah("op12-pastor", 200, 470, 1.1, "carry")}${npStaff("op12-st", 260, 460, 1)}${npHillBack("op12-h")}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("op13", 360)}${npHillBack("op13-h")}${npRain(16, 1)}${npNoah("op13-pastor", 300, 470, 1.05, "carry")}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("op14", 360)}${npHillBack("op14-h")}${npNoah("op14-pastor", 200, 470, 1.05, "point")}<path id="fill-op14-cliff" d="M380 360 q40 -20 100 0 v160 h-100 z" />`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("op15", 360)}<path id="fill-op15-cliff" d="M40 380 q60 -40 200 -40 q140 0 200 40 v160 h-400 z" />${npSheep("op15-stray", 300, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("op16", 360)}${npNoah("op16-pastor", 300, 470, 1.1, "point")}${npGodLight("op16-light")}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("op17", 360)}${npHillBack("op17-h")}${npNoah("op17-pastor", 200, 470, 1.1, "carry")}${npSheep("op17-stray", 460, 510, 0.95)}<path d="M280 380 q40 -10 80 0" fill="none" />`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("op18", 360)}${npNoah("op18-pastor", 220, 470, 1.1, "carry")}${npSheep("op18-stray", 380, 460, 0.85)}${npHeart("op18-h", 480, 240, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("op19", 360)}${npHillBack("op19-h")}${npNoah("op19-pastor", 300, 470, 1.15, "carry")}${npSheep("op19-stray", 360, 440, 0.7)}<path id="fill-op19-road" d="M40 540 q260 -160 520 0 v40 h-520 z" />`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("op20", 360)}${npNoah("op20-pastor", 300, 470, 1.15, "carry")}${npSheep("op20-stray", 360, 440, 0.7)}${npStarBig("op20-st", 110, 130, 0.85)}${npStarBig("op20-st2", 490, 130, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("op21", 360)}${npHillBack("op21-h")}${npNoah("op21-pastor", 200, 470, 1.1, "carry")}${npSheep("op21-stray", 260, 440, 0.7)}${npSheep("op21-s1", 380, 510, 0.7)}${npSheep("op21-s2", 470, 510, 0.7)}${npSheep("op21-s3", 540, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("op22", 360)}${npNoah("op22-pastor", 220, 470, 1.1, "carry")}${npSheep("op22-stray", 280, 440, 0.7)}${npSheep("op22-s1", 380, 510, 0.7)}${npSheep("op22-s2", 460, 510, 0.7)}${npHeart("op22-h", 110, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("op23", 360)}<path id="fill-op23-house-roof" d="M120 280 l180 -80 l180 80 z" /><rect id="fill-op23-house" x="140" y="280" width="320" height="200" /><rect id="fill-op23-door" x="270" y="380" width="60" height="100" />${npStarBig("op23-st", 110, 130, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("op24", 360)}${npNoah("op24-pastor", 300, 470, 1.15, "point")}${npNoah("op24-amigo1", 130, 480, 0.9, "idle")}${npNoah("op24-amigo2", 470, 480, 0.9, "idle")}${npHeart("op24-h", 110, 200, 0.85)}${npHeart("op24-h2", 490, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("op25", 360)}${npFamily("op25-fam", 300, 470, 1.2)}${npHeart("op25-h", 110, 200, 0.85)}${npHeart("op25-h2", 490, 200, 0.85)}${npSunBig("op25-sun", 300, 130, 40)}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("op26", 360)}${npNoah("op26-jesus", 300, 470, 1.3, "idle")}${npChild("op26-c1", 130, 510, 0.85)}${npChild("op26-c2", 470, 510, 0.85)}${npGodLight("op26-light")}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("op27", 360)}${npNoah("op27-jesus", 300, 470, 1.3, "carry")}${npSheep("op27-s", 320, 410, 0.7)}${npHeart("op27-h", 110, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("op28", 360)}${npAngel("op28-a", 300, 380, 1.2)}${npGodLight("op28-light")}${npSheep("op28-s", 200, 510, 0.7)}${npSheep("op28-s2", 410, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("op29", 360)}${npRainbowBig("op29-rb", 300, 340, 540)}${npNoah("op29-pastor", 200, 470, 1.1, "idle")}${npSheep("op29-s1", 360, 510, 0.7)}${npSheep("op29-s2", 460, 510, 0.7)}${npSheep("op29-s3", 540, 510, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("op30", 360)}${npNoah("op30-jesus", 300, 470, 1.3, "idle")}${npHeart("op30-h", 130, 200, 1)}${npHeart("op30-h2", 470, 200, 1)}${npSheep("op30-s", 110, 540, 0.7)}${npSheep("op30-s2", 490, 540, 0.7)}${npSunBig("op30-sun", 300, 130, 40)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — O Semeador =============

function generateSemeadorPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="se${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("se1", 360)}${npSunBig("se1-sun", 110, 110, 50)}${npCloudBig("se1-c", 470, 130)}${npHillBack("se1-h")}${npFlowerBig("se1-f1", 90, 540, 0.8)}${npFlowerBig("se1-f2", 510, 540, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("se2", 360)}${npNoah("se2-jesus", 300, 470, 1.3, "point")}${npGodLight("se2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("se3", 360)}${npNoah("se3-jesus", 200, 470, 1.1, "idle")}${npNoah("se3-disc1", 360, 470, 1, "idle")}${npNoah("se3-disc2", 480, 470, 1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("se4", 360)}${npNoah("se4-sem", 200, 470, 1.15, "carry")}<path id="fill-se4-bag" d="M260 460 q30 -10 60 0 v40 h-60 z" />`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("se5", 360)}${npHillBack("se5-h")}${npNoah("se5-sem", 200, 470, 1.1, "carry")}${npSeed("se5-s1", 360, 460, 1)}${npSeed("se5-s2", 400, 470, 1)}${npSeed("se5-s3", 440, 480, 1)}${npSeed("se5-s4", 480, 490, 1)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("se6", 360)}<path id="fill-se6-path" d="M40 540 h520 v20 h-520 z" />${npSeed("se6-s1", 120, 530, 1.2)}${npSeed("se6-s2", 240, 530, 1.2)}${npSeed("se6-s3", 360, 530, 1.2)}${npSeed("se6-s4", 480, 530, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("se7", 360)}${npBird("se7-b1", 200, 350, 1.3)}${npBird("se7-b2", 360, 380, 1.3)}${npSeed("se7-s1", 240, 530, 1.2)}${npSeed("se7-s2", 360, 530, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("se8", 360)}${npBird("se8-b1", 180, 510, 1.5)}${npBird("se8-b2", 360, 510, 1.5)}${npBird("se8-b3", 480, 510, 1.5)}<path id="fill-se8-path" d="M40 540 h520 v20 h-520 z" />`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("se9", 360)}${npRock("se9-r", 300, 480, 0.85)}${npSeed("se9-s1", 220, 460, 1.2)}${npSeed("se9-s2", 300, 450, 1.2)}${npSeed("se9-s3", 380, 460, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("se10", 360)}${npRock("se10-r", 300, 480, 0.85)}${npWheatPlant("se10-w1", 240, 460, 0.7)}${npWheatPlant("se10-w2", 360, 460, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("se11", 360)}${npSunBig("se11-sun", 300, 130, 60)}${npRock("se11-r", 300, 480, 0.85)}<path id="fill-se11-wilt" d="M260 480 q40 -20 80 0 v20 h-80 z" />`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("se12", 360)}${npThorn("se12-t1", 200, 510, 1.2)}${npThorn("se12-t2", 380, 510, 1.2)}${npSeed("se12-s1", 290, 510, 1.2)}${npSeed("se12-s2", 320, 510, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("se13", 360)}${npThorn("se13-t1", 150, 510, 1.4)}${npThorn("se13-t2", 300, 510, 1.4)}${npThorn("se13-t3", 460, 510, 1.4)}${npWheatPlant("se13-w", 230, 510, 0.6)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("se14", 360)}${npThorn("se14-t1", 120, 510, 1.4)}${npThorn("se14-t2", 240, 510, 1.4)}${npThorn("se14-t3", 360, 510, 1.4)}${npThorn("se14-t4", 480, 510, 1.4)}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("se15", 360)}<path id="fill-se15-soil" d="M40 500 q260 -40 520 0 v60 h-520 z" />${npSeed("se15-s1", 130, 500, 1.2)}${npSeed("se15-s2", 240, 500, 1.2)}${npSeed("se15-s3", 360, 500, 1.2)}${npSeed("se15-s4", 470, 500, 1.2)}`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("se16", 360)}<path id="fill-se16-soil" d="M40 500 q260 -40 520 0 v60 h-520 z" />${npWheatPlant("se16-w1", 130, 500, 0.85)}${npWheatPlant("se16-w2", 300, 500, 0.85)}${npWheatPlant("se16-w3", 470, 500, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("se17", 360)}${npWheatPlant("se17-w1", 120, 510, 1)}${npWheatPlant("se17-w2", 220, 510, 1)}${npWheatPlant("se17-w3", 320, 510, 1)}${npWheatPlant("se17-w4", 420, 510, 1)}${npWheatPlant("se17-w5", 510, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndGround("se18", 360)}${npNoah("se18-sem", 200, 470, 1.1, "carry")}${npWheatPlant("se18-w1", 360, 510, 1)}${npWheatPlant("se18-w2", 460, 510, 1)}${npWheatPlant("se18-w3", 540, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndGround("se19", 360)}${npNoah("se19-sem", 200, 470, 1.1, "idle")}<path id="fill-se19-sickle" d="M280 380 q30 -20 60 -10 q-10 30 -40 30 z" />${npWheatPlant("se19-w", 460, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndGround("se20", 360)}${npLoavesBasket("se20-bk", 200, 480, 1.1)}${npLoavesBasket("se20-bk2", 400, 480, 1.1)}${npWheatPlant("se20-w", 540, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndGround("se21", 360)}${npNoah("se21-jesus", 300, 470, 1.3, "point")}${npGodLight("se21-light")}${npSeed("se21-s1", 130, 200, 2)}${npSeed("se21-s2", 470, 200, 2)}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndGround("se22", 360)}${npNoah("se22-jesus", 200, 470, 1.1, "point")}${npChild("se22-c1", 380, 510, 0.9)}${npChild("se22-c2", 470, 510, 0.85)}${npChild("se22-c3", 540, 510, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndGround("se23", 360)}${npNoah("se23-jesus", 200, 470, 1.1, "carry")}<path id="fill-se23-scroll" d="M260 380 q30 -10 60 0 v40 h-60 z" />${npNoah("se23-disc", 460, 470, 1.05, "idle")}`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("se24", 360)}${npHillBack("se24-h")}${npNoah("se24-jesus", 200, 470, 1.1, "idle")}${npFamily("se24-fam", 420, 480, 1.05)}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("se25", 360)}${npNoah("se25-jesus", 300, 470, 1.3, "carry")}${npHeart("se25-h", 110, 200, 0.85)}${npHeart("se25-h2", 490, 200, 0.85)}${npGodLight("se25-light")}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("se26", 360)}${npChild("se26-c1", 130, 510, 0.95)}${npChild("se26-c2", 240, 510, 0.95)}${npChild("se26-c3", 350, 510, 0.95)}${npChild("se26-c4", 460, 510, 0.95)}${npWheatPlant("se26-w", 540, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("se27", 360)}${npHillBack("se27-h")}${npFamily("se27-fam", 200, 480, 1.05)}${npFamily("se27-fam2", 460, 480, 1.05)}${npWheatPlant("se27-w", 540, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("se28", 360)}${npNoah("se28-jesus", 300, 470, 1.3, "pray")}${npGodLight("se28-light")}${npHeart("se28-h", 130, 200, 0.85)}${npHeart("se28-h2", 470, 200, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("se29", 360)}${npRainbowBig("se29-rb", 300, 340, 540)}${npWheatPlant("se29-w1", 130, 510, 1)}${npWheatPlant("se29-w2", 300, 510, 1)}${npWheatPlant("se29-w3", 470, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("se30", 360)}${npFamily("se30-fam", 300, 470, 1.2)}${npHeart("se30-h", 110, 180, 0.9)}${npHeart("se30-h2", 490, 180, 0.9)}${npSunBig("se30-sun", 300, 130, 40)}${npWheatPlant("se30-w1", 90, 540, 0.7)}${npWheatPlant("se30-w2", 510, 540, 0.7)}`,
    ),
  );

  return pages;
}

// ============= 30 cenas premium — A Casa na Rocha =============

function generateCasaRochaPremiumPages(): string[] {
  const pages: string[] = [];
  const sc = (i: number, inner: string) => noahPremiumSvg(`<g data-page="cr${i}">${inner}</g>`);

  pages.push(
    sc(
      1,
      `${skyAndGround("cr1", 360)}${npSunBig("cr1-sun", 110, 110, 50)}${npCloudBig("cr1-c", 470, 130)}${npHillBack("cr1-h")}${npTreeBig("cr1-t", 480, 470, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      2,
      `${skyAndGround("cr2", 360)}${npNoah("cr2-jesus", 300, 470, 1.3, "point")}${npGodLight("cr2-light")}`,
    ),
  );
  pages.push(
    sc(
      3,
      `${skyAndGround("cr3", 360)}${npNoah("cr3-jesus", 200, 470, 1.1, "idle")}${npNoah("cr3-disc1", 360, 470, 1, "idle")}${npNoah("cr3-disc2", 480, 470, 1, "idle")}`,
    ),
  );
  pages.push(
    sc(
      4,
      `${skyAndGround("cr4", 360)}${npNoah("cr4-jesus", 200, 470, 1.1, "point")}${npChild("cr4-c1", 380, 510, 0.85)}${npChild("cr4-c2", 470, 510, 0.85)}${npChild("cr4-c3", 540, 510, 0.85)}`,
    ),
  );
  pages.push(
    sc(
      5,
      `${skyAndGround("cr5", 360)}${npNoah("cr5-builder", 200, 470, 1.1, "carry")}${npNoah("cr5-builder2", 420, 470, 1.1, "carry")}${npRock("cr5-r", 300, 530, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      6,
      `${skyAndGround("cr6", 360)}${npNoah("cr6-builder", 220, 470, 1.1, "point")}${npRock("cr6-r", 420, 510, 0.95)}${npHillBack("cr6-h")}`,
    ),
  );
  pages.push(
    sc(
      7,
      `${skyAndGround("cr7", 360)}${npRock("cr7-r", 300, 510, 1.1)}${npNoah("cr7-builder", 200, 470, 1.05, "carry")}${npHammerStation("cr7-tools", 460, 470)}`,
    ),
  );
  pages.push(
    sc(
      8,
      `${skyAndGround("cr8", 360)}${npRock("cr8-r", 300, 510, 1.1)}<rect id="fill-cr8-found" x="160" y="460" width="280" height="40" />${npNoah("cr8-builder", 480, 470, 1, "carry")}`,
    ),
  );
  pages.push(
    sc(
      9,
      `${skyAndGround("cr9", 360)}${npRock("cr9-r", 300, 510, 1.1)}<rect id="fill-cr9-found" x="160" y="460" width="280" height="40" /><rect id="fill-cr9-wall1" x="170" y="380" width="40" height="80" /><rect id="fill-cr9-wall2" x="390" y="380" width="40" height="80" />`,
    ),
  );
  pages.push(
    sc(
      10,
      `${skyAndGround("cr10", 360)}${npRock("cr10-r", 300, 510, 1.1)}${npHouse("cr10-h", 300, 400, 1, "ok")}`,
    ),
  );
  pages.push(
    sc(
      11,
      `${skyAndGround("cr11", 360)}${npRock("cr11-r", 300, 510, 1.1)}${npHouse("cr11-h", 300, 400, 1, "ok")}${npFlowerBig("cr11-f1", 110, 540, 0.7)}${npFlowerBig("cr11-f2", 510, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      12,
      `${skyAndGround("cr12", 360)}${npNoah("cr12-builder", 200, 470, 1.1, "carry")}${npSand("cr12-sand", 420, 510, 1)}`,
    ),
  );
  pages.push(
    sc(
      13,
      `${skyAndGround("cr13", 360)}${npSand("cr13-sand", 300, 530, 1.2)}${npNoah("cr13-builder", 200, 470, 1.05, "carry")}${npHammerStation("cr13-tools", 460, 470)}`,
    ),
  );
  pages.push(
    sc(
      14,
      `${skyAndGround("cr14", 360)}${npSand("cr14-sand", 300, 530, 1.2)}<rect id="fill-cr14-found" x="160" y="490" width="280" height="20" />${npNoah("cr14-builder", 480, 470, 1, "carry")}`,
    ),
  );
  pages.push(
    sc(
      15,
      `${skyAndGround("cr15", 360)}${npSand("cr15-sand", 300, 530, 1.2)}<rect id="fill-cr15-wall1" x="170" y="400" width="40" height="100" /><rect id="fill-cr15-wall2" x="390" y="400" width="40" height="100" />`,
    ),
  );
  pages.push(
    sc(
      16,
      `${skyAndGround("cr16", 360)}${npSand("cr16-sand", 300, 530, 1.2)}${npHouse("cr16-h", 300, 410, 1, "ok")}`,
    ),
  );
  pages.push(
    sc(
      17,
      `${skyAndGround("cr17", 360)}${npRock("cr17-r", 160, 510, 0.8)}${npHouse("cr17-h1", 160, 410, 0.8, "ok")}${npSand("cr17-sand", 460, 530, 0.95)}${npHouse("cr17-h2", 460, 410, 0.8, "ok")}`,
    ),
  );
  pages.push(
    sc(
      18,
      `${skyAndSea("cr18", 320)}${npCloudBig("cr18-c1", 130, 100, 1.1)}${npCloudBig("cr18-c2", 470, 110, 1.1)}${npRock("cr18-r", 160, 510, 0.8)}${npHouse("cr18-h1", 160, 410, 0.8, "ok")}${npSand("cr18-sand", 460, 530, 0.95)}${npHouse("cr18-h2", 460, 410, 0.8, "ok")}`,
    ),
  );
  pages.push(
    sc(
      19,
      `${skyAndSea("cr19", 320)}${npCloudBig("cr19-c", 300, 100, 1.4)}${npRain(28, 1)}${npRock("cr19-r", 160, 510, 0.8)}${npHouse("cr19-h1", 160, 410, 0.8, "ok")}${npSand("cr19-sand", 460, 530, 0.95)}${npHouse("cr19-h2", 460, 410, 0.8, "ok")}`,
    ),
  );
  pages.push(
    sc(
      20,
      `${skyAndSea("cr20", 300)}${npRain(30, 2)}${npFlood("cr20-fl", 480)}${npRock("cr20-r", 160, 510, 0.8)}${npHouse("cr20-h1", 160, 400, 0.8, "ok")}${npSand("cr20-sand", 460, 530, 0.95)}${npHouse("cr20-h2", 460, 410, 0.8, "fall")}`,
    ),
  );
  pages.push(
    sc(
      21,
      `${skyAndSea("cr21", 300)}${npRain(30, 3)}${npFlood("cr21-fl", 460)}${npWaveBig("cr21-w", 280, 460, 280, 50)}${npRock("cr21-r", 160, 510, 0.8)}${npHouse("cr21-h1", 160, 400, 0.8, "ok")}`,
    ),
  );
  pages.push(
    sc(
      22,
      `${skyAndSea("cr22", 300)}${npRain(28, 4)}${npFlood("cr22-fl", 440)}${npSand("cr22-sand", 300, 510, 1.2)}${npHouse("cr22-h2", 300, 400, 0.8, "fall")}`,
    ),
  );
  pages.push(
    sc(
      23,
      `${skyAndSea("cr23", 300)}${npFlood("cr23-fl", 420)}<path id="fill-cr23-debris1" d="M120 460 l40 -20 l40 20 z" /><rect id="fill-cr23-debris2" x="380" y="460" width="40" height="20" /><rect id="fill-cr23-debris3" x="460" y="470" width="50" height="20" />`,
    ),
  );
  pages.push(
    sc(
      24,
      `${skyAndGround("cr24", 360)}${npSunBig("cr24-sun", 110, 110, 50)}${npCloudBig("cr24-c", 470, 130)}${npRock("cr24-r", 300, 510, 1.1)}${npHouse("cr24-h", 300, 400, 1, "ok")}`,
    ),
  );
  pages.push(
    sc(
      25,
      `${skyAndGround("cr25", 360)}${npRainbowBig("cr25-rb", 300, 340, 540)}${npRock("cr25-r", 300, 510, 1.1)}${npHouse("cr25-h", 300, 400, 1, "ok")}`,
    ),
  );
  pages.push(
    sc(
      26,
      `${skyAndGround("cr26", 360)}${npNoah("cr26-jesus", 300, 470, 1.3, "point")}${npChild("cr26-c1", 130, 510, 0.85)}${npChild("cr26-c2", 470, 510, 0.85)}${npGodLight("cr26-light")}`,
    ),
  );
  pages.push(
    sc(
      27,
      `${skyAndGround("cr27", 360)}${npNoah("cr27-jesus", 300, 470, 1.3, "idle")}${npFamily("cr27-fam", 130, 480, 0.8)}${npFamily("cr27-fam2", 470, 480, 0.8)}`,
    ),
  );
  pages.push(
    sc(
      28,
      `${skyAndGround("cr28", 360)}${npNoah("cr28-jesus", 300, 470, 1.25, "pray")}${npGodLight("cr28-light")}${npHeart("cr28-h", 130, 200, 0.9)}${npHeart("cr28-h2", 470, 200, 0.9)}`,
    ),
  );
  pages.push(
    sc(
      29,
      `${skyAndGround("cr29", 360)}${npHillBack("cr29-h")}${npRock("cr29-r", 300, 510, 1.1)}${npHouse("cr29-h-house", 300, 400, 1, "ok")}${npFamily("cr29-fam", 300, 540, 0.7)}`,
    ),
  );
  pages.push(
    sc(
      30,
      `${skyAndGround("cr30", 360)}${npRock("cr30-r", 300, 510, 1.1)}${npHouse("cr30-h-house", 300, 400, 1, "ok")}${npHeart("cr30-h", 110, 180, 0.9)}${npHeart("cr30-h2", 490, 180, 0.9)}${npSunBig("cr30-sun", 110, 110, 46)}${npStarBig("cr30-st", 490, 130, 0.85)}${npFlowerBig("cr30-f1", 90, 540, 0.7)}${npFlowerBig("cr30-f2", 510, 540, 0.7)}`,
    ),
  );

  return pages;
}

// ============= Exporta páginas por slug =============

// Mapeia cada slug de história para um array com 30 SVGs (1 por cena).
//
// NOTA — motor PNG (Davi e Golias):
// O motor canvas para PNG line art Pixar está em desenvolvimento
// (ver src/lib/png-segmentation.ts e src/components/coloring/coloring-canvas-png.tsx).
// Enquanto não está integrado ao restante da UI (miniaturas/zoom/pan),
// Davi e Golias volta a usar o gerador SVG procedural (mesmo motor das
// outras histórias) para garantir pintura funcional em todas as 30 páginas.

export const STORY_PAGES: Record<string, string[]> = {
  // Arca de Noé: 10 primeiras páginas são PNG line art Pixar real (enviadas
  // pelo usuário). Páginas 11–30 são placeholder até o restante ser entregue.
  "noe-e-a-arca": generateNoeArcaPngPages(),
  // Davi e Golias usa PNG line art Pixar real (gerada pelo usuário).
  // Cada página vem como SVG mínimo com `<image>` + `data-png-url`. No
  // client, `usePreparedColoringPages` segmenta a PNG (flood fill) e
  // vetoriza cada região (marching squares) → SVG final com paths
  // pintáveis, totalmente compatível com `<ColoringCanvas>`.
  "davi-e-golias": generateDaviGoliasPngPages(),
  // Jonas e a Baleia: 10 primeiras páginas são PNG line art Pixar real
  // (enviadas pelo usuário). Páginas 11–30 mantêm o gerador procedural até
  // o restante das artes ser entregue.
  "jonas-e-a-baleia": (() => {
    const procedural = generateJonasPremiumPages();
    const real = generateJonasPngFirstTenPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "moises-e-o-mar-vermelho": (() => {
    const procedural = generateMoisesPremiumPages();
    const real = generateMoisesPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "daniel-na-cova-dos-leoes": generateDanielPngFirstPages(),
  "o-nascimento-de-jesus": (() => {
    const procedural = generateNascimentoPremiumPages();
    const real = generateNascimentoPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "jesus-e-as-criancas": (() => {
    const procedural = generateJesusCriancasPremiumPages();
    const real = generateJesusCriancasPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "jesus-acalma-a-tempestade": (() => {
    const procedural = generateTempestadePremiumPages();
    const real = generateTempestadePngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "a-multiplicacao-dos-paes": (() => {
    const procedural = generateMultiplicacaoPremiumPages();
    const real = generateMultiplicacaoPaesPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "o-bom-samaritano": generateBomSamaritanoPngPages(),
  "a-criacao-do-mundo": (() => {
    const procedural = generateCriacaoPremiumPages();
    const real = generateCriacaoPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "ester-rainha-corajosa": (() => {
    const procedural = generateEsterPremiumPages();
    const real = generateEsterPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "o-filho-prodigo": (() => {
    const procedural = generateProdigoPremiumPages();
    const real = generateProdigoPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "a-ovelha-perdida": (() => {
    const procedural = generateOvelhaPerdidaPremiumPages();
    const real = generateOvelhaPerdidaPngFirstPages();
    return [...real, ...procedural.slice(real.length)];
  })(),
  "o-semeador": generateSemeadorPremiumPages(),
  "a-casa-na-rocha": generateCasaRochaPremiumPages(),
};

// (generators das parábolas inseridos acima do STORY_PAGES via patch separado)

export function validateStoryPages(pagesBySlug: Record<string, string[]> = STORY_PAGES) {
  const errors: string[] = [];

  for (const [slug, pages] of Object.entries(pagesBySlug)) {
    if (pages.length !== 30) {
      errors.push(`${slug}: esperado 30 páginas, encontrado ${pages.length}`);
    }

    const uniquePages = new Set(pages.map((page) => page.replace(/\s+/g, " ").trim()));
    if (uniquePages.size !== pages.length) {
      errors.push(
        `${slug}: há páginas SVG duplicadas (${uniquePages.size}/${pages.length} únicas)`,
      );
    }
  }

  if (errors.length > 0) {
    const message = `Catálogo de colorir inválido:\n${errors.join("\n")}`;
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      throw new Error(message);
    }
    console.error(message);
  }

  return errors;
}

validateStoryPages();

// Páginas avulsas mantidas para retrocompatibilidade (admin/banner usam keys nominais)
export const COLORING_PAGES = {
  arca: STORY_PAGES["noe-e-a-arca"][0],
  baleia: STORY_PAGES["jonas-e-a-baleia"][0],
  criacao: STORY_PAGES["a-criacao-do-mundo"][0],
  nascimento: STORY_PAGES["o-nascimento-de-jesus"][0],
  marVermelho: STORY_PAGES["moises-e-o-mar-vermelho"][0],
};
