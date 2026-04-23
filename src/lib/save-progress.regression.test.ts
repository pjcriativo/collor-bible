/**
 * Regressão: até a v1, `saveProgress` marcava `completedPages` quando a
 * página tinha QUALQUER fill, em vez de quando estava 100% pintada
 * (regra `isPageComplete`). Isso causava o bug em que a barra geral da
 * história mostrava a página como concluída mesmo a thumbnail dizendo
 * 78%/82%/94%, e fazia o `getStoryProgress` divergir das miniaturas.
 *
 * Estes testes ancoram a correção: agora `completedPages` é derivado
 * da MESMA regra usada no canvas/miniatura/modal.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProgress, saveProgress, clearProgress } from "@/lib/store";
import { getActiveStories } from "@/lib/store";
import { extractFillableRegionIds } from "@/lib/coloring-progress";

describe("saveProgress — completedPages alinhado a isPageComplete", () => {
  let slug: string;
  let pageSvg: string;
  let allFills: Record<string, string>;
  let partialFills: Record<string, string>;

  beforeEach(() => {
    window.localStorage.clear();
    // Pega uma história real do catálogo para que o cálculo aconteça
    // contra o SVG verdadeiro — qualquer regressão em
    // `extractFillableRegionIds` também é capturada aqui.
    const story = getActiveStories()[0];
    slug = story.slug;
    pageSvg = story.pages[0].svg;
    const ids = Array.from(extractFillableRegionIds(pageSvg));
    expect(ids.length).toBeGreaterThan(2); // sanity
    allFills = Object.fromEntries(ids.map((id) => [id, "#ff0000"]));
    // Apenas 1 região pintada — antes da correção, isto era suficiente
    // para `completedPages` incluir a página. Agora não pode mais.
    partialFills = { [ids[0]]: "#ff0000" };
  });

  afterEach(() => {
    clearProgress(slug);
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("pintar 1 região NÃO marca a página como concluída", () => {
    saveProgress({ storySlug: slug, pageIndex: 0, fills: partialFills, updatedAt: Date.now() });
    expect(getProgress(slug)?.completedPages).toEqual([]);
  });

  it("pintar 100% das regiões válidas marca a página como concluída", () => {
    saveProgress({ storySlug: slug, pageIndex: 0, fills: allFills, updatedAt: Date.now() });
    expect(getProgress(slug)?.completedPages).toEqual([0]);
  });

  it("despintar (limpar fills) volta a desmarcar a página", () => {
    saveProgress({ storySlug: slug, pageIndex: 0, fills: allFills, updatedAt: Date.now() });
    expect(getProgress(slug)?.completedPages).toEqual([0]);
    saveProgress({ storySlug: slug, pageIndex: 0, fills: {}, updatedAt: Date.now() });
    expect(getProgress(slug)?.completedPages).toEqual([]);
  });

  it("repintar uma região já pintada não duplica nem altera o status", () => {
    saveProgress({ storySlug: slug, pageIndex: 0, fills: allFills, updatedAt: Date.now() });
    // "Repinta" trocando a cor — mesmo conjunto de IDs.
    const repainted = Object.fromEntries(Object.keys(allFills).map((id) => [id, "#00ff00"]));
    saveProgress({ storySlug: slug, pageIndex: 0, fills: repainted, updatedAt: Date.now() });
    const p = getProgress(slug)!;
    expect(p.completedPages).toEqual([0]);
    // Apenas a cor mudou, não a contagem.
    expect(Object.keys(p.fills).length).toBe(Object.keys(allFills).length);
  });

  it("salvar página B 100% pintada NÃO afeta o status da página A (isolamento por página)", () => {
    saveProgress({ storySlug: slug, pageIndex: 0, fills: partialFills, updatedAt: Date.now() });
    // Agora salva a página 1 totalmente pintada — isolando o cálculo.
    const story = getActiveStories().find((s) => s.slug === slug)!;
    const p1Svg = story.pages[1]?.svg ?? "";
    if (!p1Svg) return; // história de 1 página: pula
    const p1Ids = Array.from(extractFillableRegionIds(p1Svg));
    const p1AllFills = Object.fromEntries(p1Ids.map((id) => [id, "#ff0000"]));
    saveProgress({ storySlug: slug, pageIndex: 1, fills: p1AllFills, updatedAt: Date.now() });
    expect(getProgress(slug)?.completedPages).toEqual([1]);
  });
});
