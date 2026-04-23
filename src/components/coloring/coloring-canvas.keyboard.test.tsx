/**
 * Garante a navegação por teclado no aside de miniaturas:
 *  - Roving tabindex: apenas a miniatura ativa entra no tab order.
 *  - Setas/Home/End movem o foco; Enter/Espaço seleciona a página.
 *  - Após mover o foco, o item focado é trazido para a viewport do
 *    trilho rolável (testado verificando que `scrollIntoView` foi
 *    chamado com `block: "nearest"`).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColoringCanvas } from "./coloring-canvas";
import { STORY_PAGES } from "@/lib/coloring-pages";

const noop = () => {};

function setup(onSelectPage = vi.fn()) {
  const pages = STORY_PAGES["davi-e-golias"]!.slice(0, 4);
  const utils = render(
    <ColoringCanvas
      svg={pages[0]!}
      fills={{}}
      onFill={noop}
      showSuggestion={false}
      onCloseSuggestion={noop}
      pageIndex={1}
      totalPages={pages.length}
      pageSvgs={pages}
      pageFills={{}}
      onSelectPage={onSelectPage}
      onPrev={noop}
      onNext={noop}
    />,
  );
  const tabs = screen.getAllByRole("tab");
  return { ...utils, tabs, onSelectPage };
}

beforeEach(() => {
  // jsdom não implementa scrollIntoView; precisamos de um stub para que
  // as chamadas internas (ao mover foco) não quebrem.
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom também não implementa ResizeObserver, usado pelo aside para
  // detectar overflow. Stub mínimo (no-op) — os testes não dependem da
  // detecção de overflow para validar foco/teclado.
  if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
    (globalThis as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("ColoringCanvas — navegação por teclado nas miniaturas", () => {
  it("roving tabindex: apenas a miniatura ativa tem tabIndex=0", () => {
    const { tabs } = setup();
    // pageIndex=1 → segunda miniatura é a ativa
    expect(tabs[0]!.getAttribute("tabindex")).toBe("-1");
    expect(tabs[1]!.getAttribute("tabindex")).toBe("0");
    expect(tabs[2]!.getAttribute("tabindex")).toBe("-1");
    expect(tabs[3]!.getAttribute("tabindex")).toBe("-1");
  });

  it("aria-selected reflete a página atual", () => {
    const { tabs } = setup();
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("false");
  });

  it("ArrowRight move o foco para a próxima miniatura", () => {
    const { tabs } = setup();
    tabs[1]!.focus();
    fireEvent.keyDown(tabs[1]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[2]);
  });

  it("ArrowLeft move o foco para a miniatura anterior", () => {
    const { tabs } = setup();
    tabs[1]!.focus();
    fireEvent.keyDown(tabs[1]!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tabs[0]);
  });

  it("ArrowDown e ArrowUp também navegam (suporte ao layout vertical)", () => {
    const { tabs } = setup();
    tabs[1]!.focus();
    fireEvent.keyDown(tabs[1]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(tabs[2]);
    fireEvent.keyDown(tabs[2]!, { key: "ArrowUp" });
    expect(document.activeElement).toBe(tabs[1]);
  });

  it("Home foca a primeira e End foca a última miniatura", () => {
    const { tabs } = setup();
    tabs[1]!.focus();
    fireEvent.keyDown(tabs[1]!, { key: "End" });
    expect(document.activeElement).toBe(tabs[tabs.length - 1]);
    fireEvent.keyDown(tabs[tabs.length - 1]!, { key: "Home" });
    expect(document.activeElement).toBe(tabs[0]);
  });

  it("não vaza o foco para fora dos limites (clamp em ambas as pontas)", () => {
    const { tabs } = setup();
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tabs[0]); // permanece na primeira
    tabs[tabs.length - 1]!.focus();
    fireEvent.keyDown(tabs[tabs.length - 1]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[tabs.length - 1]); // permanece na última
  });

  it("Enter e Espaço acionam onSelectPage com o índice da miniatura focada", () => {
    const onSelectPage = vi.fn();
    const { tabs } = setup(onSelectPage);
    tabs[2]!.focus();
    fireEvent.keyDown(tabs[2]!, { key: "Enter" });
    expect(onSelectPage).toHaveBeenLastCalledWith(2);
    tabs[3]!.focus();
    fireEvent.keyDown(tabs[3]!, { key: " " });
    expect(onSelectPage).toHaveBeenLastCalledWith(3);
  });

  it("ao mover o foco via teclado, chama scrollIntoView para manter visível", () => {
    const { tabs } = setup();
    tabs[1]!.focus();
    const spy = vi.spyOn(tabs[2]!, "scrollIntoView");
    fireEvent.keyDown(tabs[1]!, { key: "ArrowRight" });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ block: "nearest", inline: "nearest" }),
    );
  });

  it("o tablist tem role e aria-label corretos", () => {
    setup();
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-label")).toBeTruthy();
  });
});
