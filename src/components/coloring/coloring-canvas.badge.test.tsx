/**
 * Garante o invariante VISUAL:
 *   o badge "Concluída" no canvas aparece se, e somente se,
 *   `pagePercent(svg, fills) === 100` — a MESMA função usada nas
 *   miniaturas. Assim o usuário consegue verificar o fix a olho nu.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColoringCanvas } from "./coloring-canvas";
import { extractFillableRegionIds, pagePercent } from "@/lib/coloring-progress";
import { STORY_PAGES } from "@/lib/coloring-pages";

// Stubs inofensivos para as props de evento.
const noop = () => {};

function renderCanvas(svg: string, fills: Record<string, string>) {
  return render(
    <ColoringCanvas
      svg={svg}
      fills={fills}
      onFill={noop}
      showSuggestion={false}
      onCloseSuggestion={noop}
      pageIndex={0}
      totalPages={1}
      onPrev={noop}
      onNext={noop}
    />,
  );
}

describe("ColoringCanvas — badge 'Concluída' a 100%", () => {
  it("NÃO mostra o badge quando a página está vazia (0%)", () => {
    const svg = STORY_PAGES["davi-e-golias"]![0]!;
    expect(pagePercent(svg, {})).toBe(0);
    renderCanvas(svg, {});
    expect(screen.queryByTestId("page-completed-badge")).toBeNull();
  });

  it("NÃO mostra o badge quando faltam regiões (n-1 pintadas)", () => {
    const svg = STORY_PAGES["davi-e-golias"]![0]!;
    const ids = Array.from(extractFillableRegionIds(svg));
    const fills = Object.fromEntries(ids.slice(0, -1).map((id) => [id, "#7CB7FF"]));
    expect(pagePercent(svg, fills)).toBeLessThan(100);
    renderCanvas(svg, fills);
    expect(screen.queryByTestId("page-completed-badge")).toBeNull();
  });

  it("MOSTRA o badge com '100%' e label 'Concluída' quando todas as regiões preenchíveis estão pintadas", () => {
    // Cena com person()/halo: prova que o badge respeita a regra global
    // (não exige pintar o halo decorativo para chegar a 100%).
    const svg = STORY_PAGES["davi-e-golias"]![0]!;
    const ids = Array.from(extractFillableRegionIds(svg));
    const fills = Object.fromEntries(ids.map((id) => [id, "#A7D89A"]));

    // Pré-condição: pela função pura, a página é 100%.
    expect(pagePercent(svg, fills)).toBe(100);

    renderCanvas(svg, fills);
    const badge = screen.getByTestId("page-completed-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("100%");
    // i18n default = pt-BR -> "Concluída".
    expect(badge.textContent).toContain("Concluída");
    // Acessibilidade: anuncia para leitores de tela.
    expect(badge.getAttribute("role")).toBe("status");
    expect(badge.getAttribute("aria-live")).toBe("polite");
  });

  it("NÃO mostra o badge se o usuário pintar APENAS um id inexistente (não conta para o total)", () => {
    // Pintar uma região que não existe no SVG não deve influenciar o
    // progresso — permanece 0% e o badge não aparece.
    const svg = STORY_PAGES["davi-e-golias"]![0]!;
    const fills = { "fill-id-que-nao-existe": "#FF0000" };
    expect(pagePercent(svg, fills)).toBe(0);
    renderCanvas(svg, fills);
    expect(screen.queryByTestId("page-completed-badge")).toBeNull();
  });

  it("Noé página 0 (cena com `fill='none'`): badge aparece quando todas as regiões REAIS estão pintadas", () => {
    const svg = STORY_PAGES["noe-e-a-arca"]![0]!;
    const ids = Array.from(extractFillableRegionIds(svg));
    const fills = Object.fromEntries(ids.map((id) => [id, "#7CB7FF"]));
    expect(pagePercent(svg, fills)).toBe(100);
    renderCanvas(svg, fills);
    expect(screen.getByTestId("page-completed-badge")).toBeTruthy();
  });
});
