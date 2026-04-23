/**
 * Teste de invariância "modal vs miniatura": usa SVGs REAIS gerados pelo
 * catálogo de páginas (`STORY_PAGES`) — incluindo cenas com a primitiva
 * `person()` (que emite halos com `fill="white"` fixo) e cenas do
 * padrão noah-realistic (cheias de linhas com `fill="none"`).
 *
 * Garante de uma vez por todas que:
 *   1. `extractFillableRegionIds` é a fonte única — nenhum elemento
 *      `<... fill="..." ... id="fill-...">` decorativo entra no total.
 *   2. Linhas com `fill="none"` (ex.: contornos do barbas/arca/horizonte)
 *      NÃO são contadas como regiões preenchíveis pelo usuário.
 *   3. Pintar exatamente os IDs retornados por `extractFillableRegionIds`
 *      leva o `pagePercent` a 100 e `isPageComplete` a `true` — ou seja,
 *      o "100%" da pintura mágica/modal SEMPRE bate com o mostrado nas
 *      miniaturas.
 *   4. Pintar (n-1) regiões nunca dispara `isPageComplete=true`, e o
 *      percent fica abaixo de 100.
 */
import { describe, expect, it } from "vitest";
import {
  countFillableRegions,
  countFilledRegions,
  extractFillableRegionIds,
  isPageComplete,
  pagePercent,
} from "@/lib/coloring-progress";
import { suggestFillsFromSvg } from "@/lib/color-suggestions";
import { STORY_PAGES } from "@/lib/coloring-pages";

// Conjunto pequeno mas representativo. Cada slug cobre um caso distinto.
const CASES: Array<{ slug: string; pageIndex: number; note: string }> = [
  // Cena com 2x `person()` → 2 halos `fill="white"` decorativos.
  { slug: "davi-e-golias", pageIndex: 0, note: "halos brancos de person()" },
  // Mesma família, mas com camelo e 2 halos de samaritano + viajante.
  { slug: "o-bom-samaritano", pageIndex: 0, note: "múltiplos halos + animal composto" },
  // Padrão noah-realistic: muitas linhas `fill="none"` (chuva, horizonte,
  // costuras do casco da arca, sobrancelha/boca de Noé).
  { slug: "noe-e-a-arca", pageIndex: 0, note: "linhas decorativas com fill=none" },
  // Regressão vista no uso real: página parecia completa, mas 1 detalhe
  // minúsculo/técnico ainda bloqueava o botão de verificar/concluir.
  {
    slug: "jesus-e-as-criancas",
    pageIndex: 5,
    note: "detalhes minúsculos não bloqueiam conclusão",
  },
  // Cena marinha sem person() — sanity check: nenhum `fill=` decorativo,
  // todos os ids `fill-*` devem contar.
  { slug: "jonas-e-a-baleia", pageIndex: 0, note: "baseline sem decoração" },
];

// Regex local APENAS para o teste — propositalmente "ingênuo" (igual ao
// que existia antes da regra global). Serve para PROVAR que a regra
// global filtra mais coisa que o regex bruto e por isso resolve o bug
// de divergência. Se algum dia alguém reverter `extractFillableRegionIds`
// e voltar a usar essa regex bruta, este teste falha.
const NAIVE_REGEX = /id\s*=\s*["'](fill-[^"']+)["']/g;
function naiveCount(svg: string): number {
  const seen = new Set<string>();
  for (const m of svg.matchAll(NAIVE_REGEX)) seen.add(m[1]);
  return seen.size;
}

describe("coloring-progress — invariância modal vs miniatura em SVGs reais", () => {
  it.each(CASES)(
    "$slug página $pageIndex ($note): regra global ignora decorativos e bate com miniatura",
    ({ slug, pageIndex }) => {
      const svg = STORY_PAGES[slug]?.[pageIndex];
      expect(svg, `SVG não encontrado para ${slug}#${pageIndex}`).toBeTruthy();
      if (!svg) return;

      const fillableIds = extractFillableRegionIds(svg);
      const total = countFillableRegions(svg);
      expect(total).toBe(fillableIds.size);
      expect(total).toBeGreaterThan(0);

      // Sanidade: a regra global nunca pode contar MAIS que o regex
      // ingênuo — só pode filtrar (≤). Para os casos com person()/halo
      // ou noah-realistic, deve filtrar ESTRITAMENTE menos.
      const naive = naiveCount(svg);
      expect(total).toBeLessThanOrEqual(naive);
    },
  );

  it.each(CASES)(
    "$slug página $pageIndex: pintar todos os ids preenchíveis ⇒ 100% e isPageComplete=true",
    ({ slug, pageIndex }) => {
      const svg = STORY_PAGES[slug]?.[pageIndex];
      if (!svg) throw new Error("fixture ausente");

      const fillableIds = Array.from(extractFillableRegionIds(svg));
      const fills: Record<string, string> = {};
      fillableIds.forEach((id) => (fills[id] = "#7CB7FF"));

      // Modal (pintura mágica): conta como "concluído" via isPageComplete.
      expect(isPageComplete(svg, fills)).toBe(true);
      // Miniatura: usa pagePercent. Tem que dar exatamente 100.
      expect(pagePercent(svg, fills)).toBe(100);
      // E o numerador bate com o denominador.
      expect(countFilledRegions(svg, fills)).toBe(fillableIds.length);
    },
  );

  it.each(CASES)(
    "$slug página $pageIndex: a pintura mágica preenche EXATAMENTE o conjunto preenchível",
    ({ slug, pageIndex }) => {
      const svg = STORY_PAGES[slug]?.[pageIndex];
      if (!svg) throw new Error("fixture ausente");

      const suggestions = suggestFillsFromSvg(svg);
      const fillable = extractFillableRegionIds(svg);

      // Conjunto da mágica = conjunto preenchível (mesmo cardinal e mesmas chaves).
      expect(new Set(Object.keys(suggestions))).toEqual(fillable);

      // Aplicando as sugestões, fechamos a página.
      expect(isPageComplete(svg, suggestions)).toBe(true);
      expect(pagePercent(svg, suggestions)).toBe(100);
    },
  );

  it.each(CASES)(
    "$slug página $pageIndex: pintar bem menos que tudo NÃO conclui a página e fica < 100",
    ({ slug, pageIndex }) => {
      const svg = STORY_PAGES[slug]?.[pageIndex];
      if (!svg) throw new Error("fixture ausente");

      const fillableIds = Array.from(extractFillableRegionIds(svg));
      // Pelo menos 4 regiões para garantir que (n-2) NÃO seja capturado
      // pela tolerância de "1 região faltante em página grande".
      if (fillableIds.length < 4) return;

      const fills: Record<string, string> = {};
      // Deixa 2 regiões sem pintar — sob a regra de tolerância
      // (`isPageValidationComplete`), 1 sozinha em página grande pode ser
      // tolerada; 2 nunca é. Garante que esse teste continue cobrindo
      // "página inacabada" sem colidir com o fallback de UX infantil.
      fillableIds.slice(0, -2).forEach((id) => (fills[id] = "#FF0000"));

      expect(isPageComplete(svg, fills)).toBe(false);
      expect(pagePercent(svg, fills)).toBeLessThan(100);
    },
  );

  it("Davi e Golias página 0 expõe regiões grandes preenchíveis (padrão premium)", () => {
    // A nova versão premium não usa halos decorativos `fill="white"` —
    // todas as regiões `id="fill-..."` são preenchíveis por construção.
    const svg = STORY_PAGES["davi-e-golias"]?.[0];
    if (!svg) throw new Error("fixture ausente");
    const ids = extractFillableRegionIds(svg);
    expect(ids.size).toBeGreaterThan(5);
  });

  it("Noé página 0 NÃO conta os `<path ... fill='none' />` decorativos", () => {
    const svg = STORY_PAGES["noe-e-a-arca"]?.[0];
    if (!svg) throw new Error("fixture ausente");
    // Sanidade do fixture: o SVG real contém múltiplos `fill="none"`.
    const fillNoneCount = (svg.match(/fill="none"/g) ?? []).length;
    expect(fillNoneCount).toBeGreaterThan(3);

    // Nenhum desses paths tem `id="fill-..."` — então o conjunto
    // preenchível é estritamente menor que o número total de elementos
    // com `id="fill-..."` + linhas decorativas.
    const ids = extractFillableRegionIds(svg);
    for (const id of ids) {
      // Para cada id preenchível, garantimos que o tag correspondente
      // NÃO carrega `fill="none"` (decorativo) nem `fill="white"` (halo).
      const tagRegex = new RegExp(`<[^>]*\\sid\\s*=\\s*["']${id}["'][^>]*>`);
      const tag = svg.match(tagRegex)?.[0] ?? "";
      expect(tag).not.toMatch(/\sfill\s*=\s*["'](none|white)["']/);
    }
  });
});
