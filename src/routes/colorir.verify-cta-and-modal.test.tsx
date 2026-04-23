/**
 * Teste end-to-end do fluxo de "página completa":
 *
 *   1. Monta o `useColoringState` real + o `<ColoringCanvas>` real,
 *      usando a página 0 REAL de "Davi e Golias" do catálogo
 *      (`STORY_PAGES`).
 *   2. Pinta TODAS as regiões preenchíveis retornadas por
 *      `extractFillableRegionIds` — exatamente o conjunto que o
 *      modal/miniatura considera para 100%.
 *   3. Verifica que o badge "100% concluído" e o CTA
 *      `verify-painting-cta` aparecem no canvas.
 *   4. Clica no CTA e checa que o handler `onVerifyComplete` invoca
 *      `onPageComplete` com `{ pageIndex: 0, storySlug: "davi-e-golias" }`,
 *      o que é exatamente o gatilho que o `colorir.$slug.tsx` usa para
 *      abrir o modal de concluído (renderizado aqui pelo harness, igual
 *      ao da rota).
 *
 * Por que esse teste é importante:
 *   Já tivemos 2 regressões em produção onde a criança pintava tudo,
 *   mas o modal não abria. As causas foram diferentes (regiões
 *   minúsculas que bloqueavam 100%; cascata da pintura mágica que não
 *   chegava ao callback). Este teste fecha o ciclo: se um dia o CTA
 *   voltar a não aparecer numa página real OU o clique parar de abrir
 *   o modal, a suíte falha imediatamente.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { ColoringCanvas } from "@/components/coloring/coloring-canvas";
import { useColoringState } from "@/hooks/use-coloring-state";
import { STORY_PAGES } from "@/lib/coloring-pages";
import { extractFillableRegionIds } from "@/lib/coloring-progress";
import * as store from "@/lib/store";
import type { Story } from "@/lib/types";

// Som/celebração não importam aqui — só atrapalhariam JSDOM.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/celebrate", () => ({ celebrate: vi.fn(), celebrateSubtle: vi.fn() }));
vi.mock("@/lib/pop-sound", () => ({
  playPop: vi.fn(),
  playFanfare: vi.fn(),
  playSparkle: vi.fn(),
  isPopMuted: () => true,
  togglePopMuted: () => true,
}));

// Constrói um Story que usa o SVG real da história "Davi e Golias".
// Mantemos só 1 página para o teste — o objetivo é a página 0, não o
// fluxo entre páginas.
function buildStoryFromCatalog(slug: keyof typeof STORY_PAGES): Story {
  const pages = STORY_PAGES[slug] ?? [];
  if (!pages.length) throw new Error(`Sem páginas no catálogo para ${slug}`);
  return {
    id: slug,
    slug,
    title: "Davi e Golias",
    subtitle: "",
    shortDescription: "",
    description: "",
    ageRange: "3-7",
    testament: "antigo",
    categoryIds: [],
    cover: "",
    pages: [{ id: `${slug}-p0`, svg: pages[0]! }],
    active: true,
    order: 1,
  };
}

/**
 * Harness mínimo que reproduz o que `src/routes/colorir.$slug.tsx` faz:
 *   - usa `useColoringState` de verdade;
 *   - monta `<ColoringCanvas>` com `onVerifyComplete={coloring.verifyCurrentPage}`;
 *   - abre o "modal de página concluída" quando `onPageComplete` dispara,
 *     usando a mesma forma `setPageComplete({ pageIndex })`.
 *
 * Não depende de Supabase, react-router ou i18n específico — é o
 * pedaço da rota que importa para o fluxo "verificar pintura → modal".
 */
function ColorirHarness({ story }: { story: Story }) {
  const [pageComplete, setPageComplete] = useState<{ pageIndex: number } | null>(null);
  const coloring = useColoringState({
    story,
    pageIndex: 0,
    onPageComplete: ({ pageIndex }) => {
      setPageComplete({ pageIndex });
    },
  });
  return (
    <div>
      <ColoringCanvas
        svg={story.pages[0]!.svg}
        fills={coloring.fills}
        onFill={coloring.applyFill}
        showSuggestion={false}
        onCloseSuggestion={() => {}}
        pageIndex={0}
        totalPages={story.pages.length}
        pageSvgs={story.pages.map((p) => p.svg)}
        pageFills={{ 0: coloring.fills }}
        onPrev={() => {}}
        onNext={() => {}}
        onVerifyComplete={coloring.verifyCurrentPage}
      />
      {pageComplete && (
        <div data-testid="page-complete-modal" role="dialog" aria-modal="true">
          <h2>Parabéns! Página completa! 🎉</h2>
          <p>Página {pageComplete.pageIndex + 1}</p>
        </div>
      )}
    </div>
  );
}

describe("Davi e Golias — pintar tudo → CTA 'Verificar pintura' → modal de concluído", () => {
  beforeEach(() => {
    // Não persistir nada; getProgress retorna vazio para forçar pintura
    // do zero — exatamente a jornada que reproduz o bug original.
    vi.spyOn(store, "saveProgress").mockImplementation(() => {});
    vi.spyOn(store, "getProgress").mockReturnValue(undefined);
    vi.spyOn(store, "getStoryProgress").mockReturnValue({ done: 0, total: 1 });
    vi.spyOn(store, "hasStoryCompletion").mockReturnValue(false);
    vi.spyOn(store, "markStoryCompleted").mockImplementation((() => null) as never);
    vi.spyOn(store, "getActiveStories").mockReturnValue([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("após pintar todas as regiões, o CTA aparece e o clique abre o modal", () => {
    const story = buildStoryFromCatalog("davi-e-golias");
    const svg = story.pages[0]!.svg;
    const fillableIds = Array.from(extractFillableRegionIds(svg));
    // Sanidade do fixture: a página tem regiões pintáveis de verdade.
    expect(fillableIds.length).toBeGreaterThan(5);

    render(<ColorirHarness story={story} />);

    // Antes de pintar, NEM o CTA NEM o modal existem — isso garante que
    // o teste não está dando "falso positivo" por algo já visível.
    expect(screen.queryByTestId("verify-painting-cta")).toBeNull();
    expect(screen.queryByTestId("page-complete-modal")).toBeNull();

    // Pinta cada região clicando no <path>/<circle>/etc. correspondente.
    // Usamos `fireEvent.click` no elemento dentro do SVG renderizado;
    // o `ColoringCanvas` usa pointer events, mas também escuta `click`
    // como fallback no nível do wrapper — então disparamos `pointerdown`
    // + `pointerup` para garantir cobertura do path real de pintura.
    const wrapper = screen.getByTestId("coloring-canvas-wrapper");
    for (const id of fillableIds) {
      const el = wrapper.querySelector(`[id="${id}"]`) as SVGElement | null;
      expect(el, `região ${id} não foi renderizada no SVG`).toBeTruthy();
      if (!el) continue;
      act(() => {
        // Path "rápido": pointerup é o evento que `applyFill` escuta no
        // wrapper. Disparamos diretamente no elemento alvo.
        fireEvent.pointerUp(el, { pointerId: 1, button: 0 });
        // Caso o handler do canvas dependa de `click` em vez disso,
        // este disparo extra é um no-op idempotente (já pintado).
        fireEvent.click(el);
      });
    }

    // 1. O badge passivo "Concluída 100%" tem que estar visível —
    //    significa que o `pagePercent` chegou a 100 (mesma função das
    //    miniaturas).
    expect(screen.getByTestId("page-completed-badge")).toBeTruthy();

    // 2. O CTA grande aparece sobreposto ao canvas — gesto explícito
    //    da criança ("acabei!").
    const cta = screen.getByTestId("verify-painting-cta");
    expect(cta).toBeTruthy();

    // 3. Clicar no CTA dispara `verifyCurrentPage`, que chama
    //    `onPageComplete` → o harness abre o modal.
    act(() => {
      fireEvent.click(cta);
    });
    const modal = screen.getByTestId("page-complete-modal");
    expect(modal).toBeTruthy();
    expect(modal.getAttribute("role")).toBe("dialog");
  });

  it("clicar no CTA múltiplas vezes não duplica o modal nem quebra o estado", () => {
    const story = buildStoryFromCatalog("davi-e-golias");
    const svg = story.pages[0]!.svg;
    const fillableIds = Array.from(extractFillableRegionIds(svg));

    render(<ColorirHarness story={story} />);
    // Re-busca o wrapper a cada iteração: depois de cada click() o React
    // re-renderiza e o nó interno do `dangerouslySetInnerHTML` é
    // substituído — guardar uma referência velha faz `querySelector`
    // retornar `null` para todas as próximas regiões.
    for (const id of fillableIds) {
      const wrapper = screen.getByTestId("coloring-canvas-wrapper");
      const el = wrapper.querySelector(`[id="${id}"]`) as SVGElement | null;
      if (!el) continue;
      act(() => fireEvent.click(el));
    }

    const cta = screen.getByTestId("verify-painting-cta");
    act(() => fireEvent.click(cta));
    act(() => fireEvent.click(cta));
    act(() => fireEvent.click(cta));

    // Sempre 1 modal renderizado — idempotência exigida pelo PRD.
    expect(screen.getAllByTestId("page-complete-modal")).toHaveLength(1);
  });

  it("CTA aparece no MESMO frame da última pincelada — sem await/tick extra", () => {
    // Regressão do "delay percebido": antes, o CTA dependia do React
    // agendar o próximo render em algum momento depois do click; com
    // batching de pointer events, isso podia adiar a aparição do botão
    // e do badge. Agora `applyFill` força `flushSync` quando a próxima
    // pintura é a última — então o CTA está no DOM IMEDIATAMENTE depois
    // do `fireEvent.click`, sem precisar de `await`/`act` async/microtask.
    const story = buildStoryFromCatalog("davi-e-golias");
    const svg = story.pages[0]!.svg;
    const fillableIds = Array.from(extractFillableRegionIds(svg));
    expect(fillableIds.length).toBeGreaterThan(2);

    render(<ColorirHarness story={story} />);

    // Pinta TODAS menos a última.
    for (const id of fillableIds.slice(0, -1)) {
      const wrapper = screen.getByTestId("coloring-canvas-wrapper");
      const el = wrapper.querySelector(`[id="${id}"]`) as SVGElement | null;
      if (!el) continue;
      act(() => fireEvent.click(el));
    }
    // Pré-condição: CTA NÃO deve existir ainda (faltando 1).
    expect(screen.queryByTestId("verify-painting-cta")).toBeNull();
    expect(screen.queryByTestId("page-completed-badge")).toBeNull();

    // Pinta a ÚLTIMA — CTA deve aparecer síncrono.
    const lastId = fillableIds.at(-1)!;
    const wrapper = screen.getByTestId("coloring-canvas-wrapper");
    const lastEl = wrapper.querySelector(`[id="${lastId}"]`) as SVGElement | null;
    expect(lastEl).toBeTruthy();
    act(() => fireEvent.click(lastEl!));

    // Sem `await`, sem `findByTestId`: o `flushSync` em `applyFill`
    // garante que ambos estão presentes no momento exato em que o
    // teste consulta o DOM.
    expect(screen.getByTestId("page-completed-badge")).toBeTruthy();
    expect(screen.getByTestId("verify-painting-cta")).toBeTruthy();
  });
});
