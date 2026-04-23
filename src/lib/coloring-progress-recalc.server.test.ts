/**
 * Testes da etapa SERVIDOR do job de recálculo: a função pura
 * `reconcileServerCompletions` decide quais slugs em `story_completions`
 * devem ser removidos por não estarem mais 100% pela regra atual.
 *
 * O design intencionalmente NUNCA cria novos registros — só remove
 * inconsistências antigas (evita disparar celebrações duplicadas).
 */
import { describe, expect, it } from "vitest";
import { reconcileServerCompletions } from "@/lib/coloring-progress-recalc";
import type { ColoringProgress, Story } from "@/lib/types";

const svgTwoRegions = `<rect id="fill-a"/><rect id="fill-b"/>`;
const svgOneRegion = `<rect id="fill-x"/>`;

const storyA: Story = {
  id: "a",
  slug: "a",
  title: "A",
  subtitle: "",
  shortDescription: "",
  description: "",
  ageRange: "",
  testament: "antigo",
  categoryIds: [],
  cover: "",
  pages: [
    { id: "p1", svg: svgTwoRegions },
    { id: "p2", svg: svgTwoRegions },
  ],
  active: true,
  order: 1,
};
const storyB: Story = {
  ...storyA,
  id: "b",
  slug: "b",
  pages: [{ id: "p1", svg: svgOneRegion }],
};

describe("reconcileServerCompletions — etapa servidor do job", () => {
  it("remove slug do servidor quando local indica < 100%", () => {
    // Local: história A com só 1/2 páginas concluídas.
    const local: ColoringProgress[] = [
      {
        storySlug: "a",
        pageIndex: 0,
        fills: {},
        completedPages: [0],
        pagesFills: {},
        updatedAt: 1,
      },
    ];
    const r = reconcileServerCompletions(local, [storyA], ["a"]);
    expect(r.slugsToRemove).toEqual(["a"]);
  });

  it("PRESERVA slug do servidor quando local confirma 100%", () => {
    const local: ColoringProgress[] = [
      {
        storySlug: "a",
        pageIndex: 1,
        fills: {},
        completedPages: [0, 1],
        pagesFills: {},
        updatedAt: 1,
      },
    ];
    const r = reconcileServerCompletions(local, [storyA], ["a"]);
    expect(r.slugsToRemove).toEqual([]);
  });

  it("remove slug quando NÃO há registro local algum (limpeza de órfãos)", () => {
    const r = reconcileServerCompletions([], [storyA], ["a"]);
    expect(r.slugsToRemove).toEqual(["a"]);
  });

  it("PRESERVA slug cuja história saiu do catálogo (não toca histórico)", () => {
    const r = reconcileServerCompletions([], [storyA], ["a", "ghost-removed-story"]);
    expect(r.slugsToRemove).toEqual(["a"]); // 'ghost' não entra
  });

  it("NÃO inventa registros — slugs locais 100% que faltam no servidor são ignorados", () => {
    // Local diz que B está 100%, mas servidor não tem registro algum.
    // O job nunca insere — apenas remove.
    const local: ColoringProgress[] = [
      {
        storySlug: "b",
        pageIndex: 0,
        fills: {},
        completedPages: [0],
        pagesFills: {},
        updatedAt: 1,
      },
    ];
    const r = reconcileServerCompletions(local, [storyA, storyB], []);
    expect(r.slugsToRemove).toEqual([]);
  });

  it("ignora índices órfãos em completedPages (i >= total) ao decidir 100%", () => {
    // completedPages tem [0, 5] mas total é 2 → done real = 1 → < 100%
    const local: ColoringProgress[] = [
      {
        storySlug: "a",
        pageIndex: 0,
        fills: {},
        completedPages: [0, 5],
        pagesFills: {},
        updatedAt: 1,
      },
    ];
    const r = reconcileServerCompletions(local, [storyA], ["a"]);
    expect(r.slugsToRemove).toEqual(["a"]);
  });

  it("processa múltiplos slugs em uma única passada (lote)", () => {
    const local: ColoringProgress[] = [
      {
        storySlug: "a",
        pageIndex: 1,
        fills: {},
        completedPages: [0, 1],
        pagesFills: {},
        updatedAt: 1,
      }, // 100%
      { storySlug: "b", pageIndex: 0, fills: {}, completedPages: [], pagesFills: {}, updatedAt: 1 }, // 0%
    ];
    const r = reconcileServerCompletions(local, [storyA, storyB], ["a", "b"]);
    expect(r.slugsToRemove).toEqual(["b"]);
  });

  it("é determinístico (mesma entrada → mesma saída, em qualquer ordem)", () => {
    const local: ColoringProgress[] = [
      {
        storySlug: "a",
        pageIndex: 0,
        fills: {},
        completedPages: [0],
        pagesFills: {},
        updatedAt: 1,
      },
    ];
    const r1 = reconcileServerCompletions(local, [storyA, storyB], ["a", "b"]);
    const r2 = reconcileServerCompletions(local, [storyB, storyA], ["b", "a"]);
    expect(new Set(r1.slugsToRemove)).toEqual(new Set(r2.slugsToRemove));
  });
});
