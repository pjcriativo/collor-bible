import { beforeEach, describe, expect, it } from "vitest";
import {
  recalculateCompletedPages,
  runColoringProgressRecalcJob,
} from "@/lib/coloring-progress-recalc";
import type { ColoringProgress, Story } from "@/lib/types";

/**
 * SVG modelo: 2 regiões preenchíveis "reais" + 1 halo decorativo
 * (`fill="white"` fixo). Pela regra global, total = 2.
 */
const svgPersonScene = `
  <rect id="fill-sky" x="0" y="0" width="600" height="380" />
  <circle id="fill-head" cx="300" cy="370" r="22" />
  <circle id="fill-halo" cx="300" cy="360" r="30" fill="white" stroke-dasharray="4 4" />
`;

const svgEmpty = `<rect id="fill-bg" x="0" y="0" width="600" height="600" />`;

const story: Story = {
  id: "s-test",
  slug: "story-test",
  title: "T",
  subtitle: "",
  shortDescription: "",
  description: "",
  ageRange: "",
  testament: "antigo",
  categoryIds: [],
  cover: "",
  pages: [
    { id: "p1", svg: svgPersonScene },
    { id: "p2", svg: svgEmpty },
    { id: "p3", svg: svgPersonScene },
  ],
  active: true,
  order: 1,
};

describe("recalculateCompletedPages — pure function", () => {
  it("REMOVE página listada como completa que não está 100% pela nova regra", () => {
    // Página 0 marcada como completa, mas só tem o céu pintado (1/2).
    const progress: ColoringProgress = {
      storySlug: "story-test",
      pageIndex: 0,
      fills: { "fill-sky": "#fff" },
      completedPages: [0],
      pagesFills: { 0: { "fill-sky": "#fff" } },
      updatedAt: 0,
    };
    const { next, summary } = recalculateCompletedPages([progress], [story]);
    expect(next[0].completedPages).toEqual([]);
    expect(summary.pagesRemoved).toBe(1);
    expect(summary.pagesAdded).toBe(0);
    expect(summary.storiesUpdated).toBe(1);
  });

  it("ADICIONA página 100% pela nova regra que estava fora de completedPages", () => {
    // Página 2 totalmente pintada (sky + head — halo é ignorado), mas
    // ainda não estava em completedPages.
    const progress: ColoringProgress = {
      storySlug: "story-test",
      pageIndex: 2,
      fills: {},
      completedPages: [],
      pagesFills: {
        2: { "fill-sky": "#aaa", "fill-head": "#bbb" },
      },
      updatedAt: 0,
    };
    const { next, summary } = recalculateCompletedPages([progress], [story]);
    expect(next[0].completedPages).toEqual([2]);
    expect(summary.pagesAdded).toBe(1);
    expect(summary.pagesRemoved).toBe(0);
  });

  it("é idempotente: rodar de novo sobre dados corretos não muda nada", () => {
    const progress: ColoringProgress = {
      storySlug: "story-test",
      pageIndex: 1,
      fills: {},
      completedPages: [1],
      pagesFills: { 1: { "fill-bg": "#ccc" } },
      updatedAt: 0,
    };
    const { next, summary } = recalculateCompletedPages([progress], [story]);
    expect(summary.storiesUpdated).toBe(0);
    expect(next[0]).toBe(progress); // mesma referência (não recriado)
  });

  it("preserva progresso de histórias removidas do catálogo", () => {
    const progress: ColoringProgress = {
      storySlug: "história-deletada",
      pageIndex: 0,
      fills: { "fill-x": "#fff" },
      completedPages: [0],
      updatedAt: 0,
    };
    const { next, summary } = recalculateCompletedPages([progress], [story]);
    expect(next[0]).toBe(progress);
    expect(summary.storiesUpdated).toBe(0);
  });

  it("usa o `fills` legacy quando o pageIndex bate e não há pagesFills", () => {
    // Registro antigo, anterior ao mapa por página.
    const progress: ColoringProgress = {
      storySlug: "story-test",
      pageIndex: 0,
      fills: { "fill-sky": "#aaa", "fill-head": "#bbb" },
      completedPages: [],
      updatedAt: 0,
    };
    const { next, summary } = recalculateCompletedPages([progress], [story]);
    expect(next[0].completedPages).toEqual([0]);
    expect(summary.pagesAdded).toBe(1);
  });
});

describe("runColoringProgressRecalcJob — gate de versão e persistência", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("etapa LOCAL: não roda duas vezes quando ambos os gates estão atendidos", async () => {
    // Pré-marca AMBOS os gates como já cumpridos (simula usuário que
    // já passou pelas duas etapas em boots anteriores).
    window.localStorage.setItem("ccj.progress.recalc.v", "999");
    window.localStorage.setItem("ccj.progress.recalc.server.v", "999");
    const result = await runColoringProgressRecalcJob();
    expect(result).toBeNull();
  });

  it("primeira execução em ambiente sem sessão: roda etapa local mesmo sem gate servidor", async () => {
    // Sem sessão (Supabase mockado retorna session=null no setup global),
    // a etapa servidor não marca seu gate — mas a local marca o seu e
    // a função devolve um summary (não `null`).
    const summary = await runColoringProgressRecalcJob();
    expect(summary).not.toBeNull();
    expect(window.localStorage.getItem("ccj.progress.recalc.v")).toBe("3");
    // Servidor sem sessão: gate continua não setado (tentará de novo no
    // próximo boot, quando o usuário estiver logado).
    expect(window.localStorage.getItem("ccj.progress.recalc.server.v")).toBeNull();
  });

  it("`force=true` ignora o gate", async () => {
    await runColoringProgressRecalcJob();
    const forced = await runColoringProgressRecalcJob(true);
    expect(forced).not.toBeNull();
  });
});
