import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { ERASER, useColoringState } from "./use-coloring-state";
import * as store from "@/lib/store";
import { suggestFillsFromSvg } from "@/lib/color-suggestions";
import { countFillableRegions, isPageComplete } from "@/lib/coloring-progress";
import type { Story } from "@/lib/types";

// Silence toast + confetti side-effects
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/celebrate", () => ({
  celebrate: vi.fn(),
  celebrateSubtle: vi.fn(),
}));

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: "s1",
  slug: "test-story",
  title: "Teste",
  subtitle: "",
  shortDescription: "",
  description: "",
  ageRange: "3-7",
  testament: "antigo",
  categoryIds: [],
  cover: "",
  pages: [
    { id: "p1", svg: '<svg><rect id="fill-a"/><rect id="fill-b"/></svg>' },
    { id: "p2", svg: '<svg><rect id="fill-c"/></svg>' },
  ],
  active: true,
  order: 1,
  ...overrides,
});

describe("useColoringState", () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    saveSpy = vi.spyOn(store, "saveProgress").mockImplementation(() => {});
    vi.spyOn(store, "getProgress").mockReturnValue(undefined);
    vi.spyOn(store, "getStoryProgress").mockReturnValue({ done: 0, total: 2 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts with empty fills, no history and saved=true", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    expect(result.current.fills).toEqual({});
    expect(result.current.history).toEqual([]);
    expect(result.current.saved).toBe(true);
  });

  it("applyFill paints a region with the current color and pushes to history", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    act(() => result.current.setColor("#FF0000"));
    act(() => result.current.applyFill("fill-a"));

    expect(result.current.fills).toEqual({ "fill-a": "#FF0000" });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toEqual({});
  });

  it("applyFill with ERASER removes the region's color", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    act(() => result.current.setColor("#00FF00"));
    act(() => result.current.applyFill("fill-a"));
    expect(result.current.fills).toEqual({ "fill-a": "#00FF00" });

    act(() => result.current.setColor(ERASER));
    act(() => result.current.applyFill("fill-a"));
    expect(result.current.fills).toEqual({});
  });

  it("undo restores the previous fills snapshot and is a no-op when history is empty", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    // no-op undo
    act(() => result.current.undo());
    expect(result.current.fills).toEqual({});

    act(() => result.current.setColor("#123456"));
    act(() => result.current.applyFill("fill-a"));
    act(() => result.current.applyFill("fill-b"));

    expect(result.current.fills).toEqual({ "fill-a": "#123456", "fill-b": "#123456" });

    act(() => result.current.undo());
    expect(result.current.fills).toEqual({ "fill-a": "#123456" });

    act(() => result.current.undo());
    expect(result.current.fills).toEqual({});
  });

  it("autosaves 500ms after a fill change and toggles saved flag", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    act(() => result.current.applyFill("fill-a"));
    expect(result.current.saved).toBe(false);
    expect(saveSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0]).toMatchObject({
      storySlug: "test-story",
      pageIndex: 0,
      fills: { "fill-a": "#7CB7FF" },
    });
    expect(result.current.saved).toBe(true);
  });

  it("debounces autosave: rapid fills produce a single save call", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    act(() => result.current.applyFill("fill-a"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => result.current.applyFill("fill-b"));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => result.current.applyFill("fill-a"));

    expect(saveSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("loads existing progress when pageIndex matches the saved one", () => {
    const story = makeStory();
    vi.spyOn(store, "getProgress").mockReturnValue({
      storySlug: story.slug,
      pageIndex: 0,
      fills: { "fill-a": "#ABCDEF" },
      completedPages: [0],
      updatedAt: 1,
    });

    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));
    expect(result.current.fills).toEqual({ "fill-a": "#ABCDEF" });
    expect(result.current.saved).toBe(true);

    // loaded fills must NOT trigger an autosave
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("resets fills and history when changing page", () => {
    const story = makeStory();
    const { result, rerender } = renderHook(
      ({ pageIndex }) => useColoringState({ story, pageIndex }),
      { initialProps: { pageIndex: 0 } },
    );

    act(() => result.current.applyFill("fill-a"));
    expect(result.current.fills).toEqual({ "fill-a": "#7CB7FF" });

    rerender({ pageIndex: 1 });

    expect(result.current.fills).toEqual({});
    expect(result.current.history).toEqual([]);

    // page change alone should not produce an autosave
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("magicPaint applies suggested colors in order via setTimeout, snapshots history once and ends with magicPainting=false", () => {
    const story = makeStory();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    // pré-pinta uma área para garantir que o snapshot do histórico capture esse estado
    act(() => result.current.setColor("#000000"));
    act(() => result.current.applyFill("fill-a"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const historyBefore = result.current.history.length;
    const fillsBefore = { ...result.current.fills };

    const suggestions = { "fill-a": "#FF0000", "fill-b": "#00FF00" };

    act(() => {
      result.current.magicPaint(suggestions, 80);
    });

    // snapshot único adicionado e magicPainting ativo; nada foi pintado ainda
    expect(result.current.history.length).toBe(historyBefore + 1);
    expect(result.current.history[result.current.history.length - 1]).toEqual(fillsBefore);
    expect(result.current.magicPainting).toBe(true);
    expect(result.current.fills).toEqual(fillsBefore);

    // primeiro tick (i=0, agendado em 0ms): só fill-a foi pintada
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.fills["fill-a"]).toBe("#FF0000");
    expect(result.current.fills["fill-b"]).toBeUndefined();
    expect(result.current.magicPainting).toBe(true);

    // segundo tick (i=1, agendado em 80ms): fill-b é pintada e a cascata termina
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(result.current.fills["fill-a"]).toBe("#FF0000");
    expect(result.current.fills["fill-b"]).toBe("#00FF00");
    expect(result.current.magicPainting).toBe(false);

    // nenhum snapshot extra foi empurrado durante a cascata
    expect(result.current.history.length).toBe(historyBefore + 1);
  });

  it("preserva os fills de cada página ao avançar e voltar entre páginas da mesma história", () => {
    const story = makeStory();

    // Simula a persistência real do store: saveProgress mescla por página
    // e getProgress devolve o snapshot atual.
    let stored:
      | {
          storySlug: string;
          pageIndex: number;
          fills: Record<string, string>;
          pagesFills: Record<number, Record<string, string>>;
          completedPages: number[];
          updatedAt: number;
        }
      | undefined;

    saveSpy.mockImplementation((payload: Parameters<typeof store.saveProgress>[0]) => {
      const previous = stored?.pagesFills ?? {};
      stored = {
        storySlug: payload.storySlug,
        pageIndex: payload.pageIndex,
        fills: payload.fills,
        pagesFills: { ...previous, [payload.pageIndex]: payload.fills },
        completedPages: stored?.completedPages ?? [],
        updatedAt: payload.updatedAt,
      };
    });
    vi.spyOn(store, "getProgress").mockImplementation(() => stored);

    const { result, rerender } = renderHook(
      ({ pageIndex }) => useColoringState({ story, pageIndex }),
      { initialProps: { pageIndex: 0 } },
    );

    // Pinta a página 0 e deixa o autosave rodar
    act(() => result.current.setColor("#AA0000"));
    act(() => result.current.applyFill("fill-a"));
    act(() => result.current.applyFill("fill-b"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(stored?.pagesFills[0]).toEqual({ "fill-a": "#AA0000", "fill-b": "#AA0000" });

    // Avança para a página 1, pinta e salva
    rerender({ pageIndex: 1 });
    expect(result.current.fills).toEqual({}); // página 1 ainda vazia

    act(() => result.current.setColor("#00BB00"));
    act(() => result.current.applyFill("fill-c"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(stored?.pagesFills[0]).toEqual({ "fill-a": "#AA0000", "fill-b": "#AA0000" });
    expect(stored?.pagesFills[1]).toEqual({ "fill-c": "#00BB00" });

    // Volta para a página 0: os fills originais devem reaparecer
    rerender({ pageIndex: 0 });
    expect(result.current.fills).toEqual({ "fill-a": "#AA0000", "fill-b": "#AA0000" });

    // Avança de novo para a página 1: os fills da página 1 devem reaparecer
    rerender({ pageIndex: 1 });
    expect(result.current.fills).toEqual({ "fill-c": "#00BB00" });

    // Apenas a navegação não deve disparar novos saves
    const savesUpToHere = saveSpy.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(saveSpy).toHaveBeenCalledTimes(savesUpToHere);
  });

  it("magicPaint atinge exatamente o denominador global de regiões preenchíveis (100% bate com miniaturas e isPageComplete)", () => {
    // SVG com regiões "reais" + 1 halo decorativo (`fill="white"` fixo).
    // A regra global em `extractFillableRegionIds` ignora o halo, então
    // o denominador correto é 3 — e a mágica deve preencher exatamente
    // essas 3 chaves.
    const svgWithDecorativeHalo = `
      <rect id="fill-sky" x="0" y="0" width="600" height="380" />
      <circle id="fill-sun" cx="500" cy="110" r="50" />
      <circle id="fill-head" cx="300" cy="370" r="22" />
      <circle id="fill-halo" cx="300" cy="360" r="30" fill="white" stroke-dasharray="4 4" />
    `;
    const story = makeStory({
      pages: [{ id: "p1", svg: svgWithDecorativeHalo }],
    });
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0 }));

    const suggestions = suggestFillsFromSvg(svgWithDecorativeHalo);
    const total = countFillableRegions(svgWithDecorativeHalo);

    // Pré-condição: o conjunto que a mágica vai pintar é EXATAMENTE o
    // denominador usado em todo o app (sem o halo).
    expect(Object.keys(suggestions).sort()).toEqual(["fill-head", "fill-sky", "fill-sun"]);
    expect(Object.keys(suggestions).length).toBe(total);

    act(() => {
      result.current.magicPaint(suggestions, 0);
    });
    // Avança todos os timers da cascata (entries.length * stepMs).
    act(() => {
      vi.advanceTimersByTime(0);
    });

    // Pós-condição: cada região preenchível ganhou cor e a página é
    // considerada 100% pelas mesmas regras das miniaturas.
    expect(Object.keys(result.current.fills).sort()).toEqual(["fill-head", "fill-sky", "fill-sun"]);
    expect(isPageComplete(svgWithDecorativeHalo, result.current.fills)).toBe(true);
    // Halo decorativo NÃO foi pintado — não polui o estado.
    expect(result.current.fills["fill-halo"]).toBeUndefined();
  });
});
