/**
 * Garante que ao pintar a ÚLTIMA região da ÚLTIMA página de uma história,
 * o callback `onStoryComplete` (modal) dispara IMEDIATAMENTE — sem
 * depender do debounce de 500ms do autosave nem de re-render externo.
 *
 * Antes desse refactor, `triggerStoryCompletion` lia `getStoryProgress`
 * (que vem do localStorage) e ficava preso até o autosave gravar
 * `completedPages`. Resultado: usuário pintava a última região e o modal
 * só aparecia depois de meio segundo (ou nunca, se ele navegasse antes).
 *
 * Agora o cálculo é feito EM MEMÓRIA pela mesma `computeStoryCompletedPages`
 * usada pelo store — fonte única — combinando `pagesFills` persistido com
 * o `fills` corrente.
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
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: () => ({ insert: () => Promise.resolve({ data: null, error: null }) }),
  },
}));

// História com 2 páginas; página 0 já concluída no storage,
// página 1 com 1 região faltando.
const story: Story = {
  id: "s",
  slug: "immediate-test",
  title: "T",
  subtitle: "",
  shortDescription: "",
  description: "",
  ageRange: "3-7",
  testament: "antigo",
  categoryIds: [],
  cover: "",
  pages: [
    { id: "p1", svg: `<rect id="fill-a" /><rect id="fill-b" />` },
    { id: "p2", svg: `<rect id="fill-c" /><rect id="fill-d" />` },
  ],
  active: true,
  order: 1,
};

describe("useColoringState — conclusão de história dispara IMEDIATAMENTE", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(store, "saveProgress").mockImplementation(() => {});
    // Storage: página 0 concluída; página 1 com 1 fill (falta a outra).
    vi.spyOn(store, "getProgress").mockReturnValue({
      storySlug: story.slug,
      pageIndex: 1,
      fills: { "fill-c": "#1" },
      pagesFills: {
        0: { "fill-a": "#1", "fill-b": "#2" },
        1: { "fill-c": "#1" },
      },
      completedPages: [0],
      updatedAt: 1,
    });
    // `getStoryProgress` ainda retorna o estado ANTIGO (pré-debounce) —
    // o ponto deste teste é que NÃO devemos depender dele.
    vi.spyOn(store, "getStoryProgress").mockReturnValue({ done: 1, total: 2 });
    vi.spyOn(store, "hasStoryCompletion").mockReturnValue(false);
    vi.spyOn(store, "markStoryCompleted").mockImplementation((() => null) as never);
    vi.spyOn(store, "getActiveStories").mockReturnValue([story]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dispara onStoryComplete na MESMA passagem do estado, sem timer", () => {
    const onStoryComplete = vi.fn();
    const onPageComplete = vi.fn();
    const { result } = renderHook(() =>
      useColoringState({ story, pageIndex: 1, onStoryComplete, onPageComplete }),
    );

    // Pinta a região que faltava na última página.
    act(() => result.current.applyFill("fill-d"));

    // SEM avançar timers: callbacks já devem ter sido chamados.
    expect(onPageComplete).toHaveBeenCalledTimes(1);
    expect(onStoryComplete).toHaveBeenCalledTimes(1);
    // Payload do modal traz o overall do catálogo (1 história, 2/2 páginas → 100%).
    expect(onStoryComplete).toHaveBeenCalledWith(expect.objectContaining({ overallPct: 100 }));
  });

  it("payload de onPageComplete reflete done=total em memória, não o storage antigo", () => {
    const onPageComplete = vi.fn();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 1, onPageComplete }));
    act(() => result.current.applyFill("fill-d"));
    // Storage diria done=1, total=2 — mas o payload deve refletir
    // o estado FRESCO já com a página 1 concluída.
    expect(onPageComplete).toHaveBeenCalledWith(expect.objectContaining({ done: 2, total: 2 }));
  });

  it("não dispara onStoryComplete antes do tempo (página intermediária ainda em aberto)", () => {
    const onStoryComplete = vi.fn();
    const { result } = renderHook(() => useColoringState({ story, pageIndex: 1, onStoryComplete }));
    // Apenas re-confirma a região já existente (idempotente, não fecha
    // a história).
    act(() => result.current.applyFill("fill-c"));
    expect(onStoryComplete).not.toHaveBeenCalled();
  });
});
