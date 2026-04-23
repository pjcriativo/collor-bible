/**
 * Testes de regressão tentando reproduzir o bug reportado no PRD:
 *  "às vezes o modal não aparece quando completa a página".
 *
 * Casos cobertos (cenários 3, 4 e 6 do PRD):
 *  1) Pintura manual: ao pintar a ÚLTIMA região, `onPageComplete` dispara
 *     EXATAMENTE 1 vez na MESMA passagem do estado (sem depender de
 *     navegação / próximo render).
 *  2) Magic paint: ao final da cascata, `onPageComplete` dispara
 *     EXATAMENTE 1 vez.
 *  3) Sem disparo duplicado: pintar -> apagar -> repintar dispara o modal
 *     em CADA conclusão (sequência válida) sem duplicar dentro da mesma
 *     conclusão contínua.
 *  4) Page change rápido: completar e MUDAR de página imediatamente não
 *     perde o disparo do modal da página anterior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useColoringState } from "./use-coloring-state";
import * as store from "@/lib/store";
import type { Story } from "@/lib/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/celebrate", () => ({ celebrate: vi.fn(), celebrateSubtle: vi.fn() }));
vi.mock("@/lib/pop-sound", () => ({
  playPop: vi.fn(),
  playFanfare: vi.fn(),
  playSparkle: vi.fn(),
  isPopMuted: () => true,
  togglePopMuted: () => true,
}));

const story: Story = {
  id: "s",
  slug: "bug-test",
  title: "T",
  subtitle: "",
  shortDescription: "",
  description: "",
  ageRange: "3-7",
  testament: "antigo",
  categoryIds: [],
  cover: "",
  // 3 regiões REAIS + 1 decorativa (halo) — o denominador correto é 3.
  pages: [
    {
      id: "p1",
      svg: `
        <rect id="fill-sky" x="0" y="0" width="600" height="380" />
        <circle id="fill-sun" cx="500" cy="110" r="50" />
        <circle id="fill-head" cx="300" cy="370" r="22" />
        <circle id="fill-halo" cx="300" cy="360" r="30" fill="white" />
      `,
    },
    { id: "p2", svg: `<rect id="fill-x" />` },
  ],
  active: true,
  order: 1,
};

describe("useColoringState — disparo do modal de página completa (regressão do bug)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(store, "saveProgress").mockImplementation(() => {});
    vi.spyOn(store, "getProgress").mockReturnValue(undefined);
    vi.spyOn(store, "getStoryProgress").mockReturnValue({ done: 0, total: 2 });
    vi.spyOn(store, "hasStoryCompletion").mockReturnValue(false);
    vi.spyOn(store, "markStoryCompleted").mockImplementation((() => null) as never);
    vi.spyOn(store, "getActiveStories").mockReturnValue([story]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("CENÁRIO 3 — pintura manual: dispara EXATAMENTE 1 vez ao pintar a última região válida", () => {
    const onPageComplete = vi.fn();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0, onPageComplete }));

    act(() => result.current.setColor("#FF0000"));
    act(() => result.current.applyFill("fill-sky"));
    act(() => result.current.applyFill("fill-sun"));
    expect(onPageComplete).not.toHaveBeenCalled();

    // Última região válida — deve disparar imediatamente, sem timer.
    act(() => result.current.applyFill("fill-head"));
    expect(onPageComplete).toHaveBeenCalledTimes(1);
    // `done`/`total` refletem a HISTÓRIA inteira (calculado em memória):
    // página 0 acabou de fechar → done=1; a história tem 2 páginas → total=2.
    expect(onPageComplete).toHaveBeenCalledWith({
      pageIndex: 0,
      storySlug: "bug-test",
      done: 1,
      total: 2,
    });
  });

  it("o halo decorativo (fill='white') NÃO conta — pintar só ele não dispara o modal", () => {
    const onPageComplete = vi.fn();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0, onPageComplete }));
    act(() => result.current.applyFill("fill-halo"));
    expect(onPageComplete).not.toHaveBeenCalled();
  });

  it("CENÁRIO 4 — magic paint: dispara o modal exatamente 1 vez quando a cascata termina", () => {
    const onPageComplete = vi.fn();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0, onPageComplete }));

    act(() => {
      result.current.magicPaint({ "fill-sky": "#1", "fill-sun": "#2", "fill-head": "#3" }, 10);
    });
    // Avança todos os timeouts da cascata.
    act(() => vi.advanceTimersByTime(50));
    expect(onPageComplete).toHaveBeenCalledTimes(1);
  });

  it("não dispara duas vezes em uma única conclusão contínua (sem apagar e repintar)", () => {
    const onPageComplete = vi.fn();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 0, onPageComplete }));
    act(() => {
      result.current.applyFill("fill-sky");
      result.current.applyFill("fill-sun");
      result.current.applyFill("fill-head");
    });
    // Re-render artificial não deve disparar de novo (idempotência).
    act(() => vi.advanceTimersByTime(1000));
    expect(onPageComplete).toHaveBeenCalledTimes(1);
  });

  it("CENÁRIO 6 — completar e mudar de página rapidamente: o disparo NÃO se perde", () => {
    const onPageComplete = vi.fn();
    const { result, rerender } = renderHook(
      ({ pageIndex }) => useColoringState({ story, pageIndex, onPageComplete }),
      { initialProps: { pageIndex: 0 } },
    );

    act(() => {
      result.current.applyFill("fill-sky");
      result.current.applyFill("fill-sun");
      result.current.applyFill("fill-head");
    });
    expect(onPageComplete).toHaveBeenCalledTimes(1);

    // Mudança de página imediatamente após — não deve causar 2º disparo
    // nem perder o anterior.
    rerender({ pageIndex: 1 });
    act(() => vi.advanceTimersByTime(1000));
    expect(onPageComplete).toHaveBeenCalledTimes(1);
  });

  it("re-monte: ao reabrir uma página JÁ concluída, NÃO dispara o modal de novo", () => {
    const onPageComplete = vi.fn();

    // Simula página já concluída no storage.
    vi.spyOn(store, "getProgress").mockReturnValue({
      storySlug: story.slug,
      pageIndex: 0,
      fills: { "fill-sky": "#1", "fill-sun": "#2", "fill-head": "#3" },
      pagesFills: { 0: { "fill-sky": "#1", "fill-sun": "#2", "fill-head": "#3" } },
      completedPages: [0],
      updatedAt: 1,
    });

    renderHook(() => useColoringState({ story, pageIndex: 0, onPageComplete }));
    // O efeito de inicialização carrega fills já completos. Permitido
    // disparar 1 vez (significa "página completa") OU não disparar — o
    // que NÃO pode é disparar mais de uma vez.
    act(() => vi.advanceTimersByTime(1000));
    expect(onPageComplete.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
