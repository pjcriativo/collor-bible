import { describe, expect, it } from "vitest";
import {
  countFillableRegions,
  countFilledRegions,
  isPageValidationComplete,
  isPageComplete,
  pageCompletionState,
  pagePercent,
  validatePageProgress,
} from "@/lib/coloring-progress";

/**
 * Bug reproduzido em produção: páginas visualmente 100% pintadas mostravam
 * 88–89% nas miniaturas. Causa: o regex contava o `halo` decorativo da
 * figura `person()` (`<circle id="fill-...-halo" ... fill="white" .../>`)
 * como uma região preenchível, inflando o denominador.
 *
 * Este teste garante que elementos com `fill="..."` fixo são EXCLUÍDOS
 * do total — restaurando o comportamento esperado de 100% global.
 */
describe("coloring-progress — exclui regiões decorativas com fill fixo", () => {
  // Recorte mínimo de uma cena real (Davi e Golias, página 1):
  // duas figuras `person()` (cada uma com halo decorativo) + sky/ground/sun.
  const svg = `
    <rect id="fill-sky-0" x="0" y="0" width="600" height="380" />
    <path id="fill-g-0" d="M0 380 L600 380 L600 600 L0 600 Z" />
    <circle id="fill-sun-0" cx="500" cy="110" r="50" />
    <circle id="fill-davi-0-head" cx="220" cy="370" r="22" />
    <path id="fill-davi-0-robe" d="..." />
    <circle id="fill-davi-0-halo" cx="220" cy="360" r="30" fill="white" stroke-dasharray="4 4" />
    <circle id="fill-gol-0-head" cx="420" cy="360" r="22" />
    <path id="fill-gol-0-robe" d="..." />
    <circle id="fill-gol-0-halo" cx="420" cy="350" r="30" fill="white" stroke-dasharray="4 4" />
  `;

  it("não conta halos decorativos no denominador", () => {
    // 3 (sky/ground/sun) + 2 (davi head+robe) + 2 (gol head+robe) = 7
    // Halos NÃO devem contar.
    expect(countFillableRegions(svg)).toBe(7);
  });

  it("retorna 100% quando todas as 7 regiões preenchíveis estão pintadas, mesmo sem halos", () => {
    const fills = {
      "fill-sky-0": "#7CB7FF",
      "fill-g-0": "#A7D89A",
      "fill-sun-0": "#F2C96B",
      "fill-davi-0-head": "#F4D6B8",
      "fill-davi-0-robe": "#69DB7C",
      "fill-gol-0-head": "#F4D6B8",
      "fill-gol-0-robe": "#FF6B6B",
    };
    expect(countFilledRegions(svg, fills)).toBe(7);
    expect(pagePercent(svg, fills)).toBe(100);
    expect(isPageComplete(svg, fills)).toBe(true);
  });

  it("ignora fills 'fantasma' que não existem na página atual (ex: ids antigos do localStorage)", () => {
    const fills = {
      "fill-sky-0": "#7CB7FF",
      "fill-stone-99": "#000000", // não existe no SVG — deve ser ignorado
    };
    expect(countFilledRegions(svg, fills)).toBe(1);
    expect(pagePercent(svg, fills)).toBe(Math.round((1 / 7) * 100));
  });

  it("não deixa detalhes minúsculos bloquearem a conclusão visual da criança", () => {
    const page = `
      <rect id="fill-bg" x="0" y="0" width="600" height="600" />
      <circle id="fill-eye" cx="20" cy="20" r="3" />
      <rect id="fill-stem" x="30" y="30" width="4" height="40" />
    `;

    expect(countFillableRegions(page)).toBe(1);
    expect(pagePercent(page, { "fill-bg": "#F2C96B" })).toBe(100);
    expect(isPageComplete(page, { "fill-bg": "#F2C96B" })).toBe(true);
  });

  it("considera completa com tolerância quando só falta 1 região em página grande", () => {
    const page = Array.from(
      { length: 10 },
      (_, i) => `<path id="fill-region-${i}" d="M${i} 0h1v1z" />`,
    ).join("");
    const fills = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`fill-region-${i}`, "#7CB7FF"]),
    );
    const report = validatePageProgress(page, fills);

    expect(report.missingIds).toEqual(["fill-region-9"]);
    // `pagePercent` é alinhado com `isComplete`: sob tolerância, mostra
    // 100% para a miniatura concordar com o badge do canvas.
    expect(pagePercent(page, fills)).toBe(100);
    expect(isPageValidationComplete(report)).toBe(true);
    expect(isPageComplete(page, fills)).toBe(true);
  });

  it("retorna 0 quando o SVG não tem regiões preenchíveis", () => {
    expect(pagePercent("", {})).toBe(0);
    expect(countFillableRegions("")).toBe(0);
    expect(isPageComplete("", {})).toBe(false);
  });

  describe("pageCompletionState — fallbacks cross-screen", () => {
    const tinyPage = `<rect id="fill-bg" x="0" y="0" width="600" height="600" />`;

    it("trata SVG sem regiões como NÃO concluído (evita 0/0 = NaN ou falso 100%)", () => {
      const state = pageCompletionState("", {});
      expect(state.isComplete).toBe(false);
      expect(state.percent).toBe(0);
      expect(state.reason).toBe("empty-svg");
    });

    it("ignora fills fantasmas: tudo o que está em fills é órfão → NÃO concluído", () => {
      // localStorage com IDs antigos que não existem mais no SVG novo.
      const ghostFills = { "fill-old-1": "#000", "fill-old-2": "#fff" };
      const state = pageCompletionState(tinyPage, ghostFills);
      expect(state.reason).toBe("ghost-fills-only");
      expect(state.isComplete).toBe(false);
      expect(state.percent).toBe(0);
    });

    it("força percent=100 quando concluído (estrito) — miniatura e canvas batem", () => {
      const state = pageCompletionState(tinyPage, { "fill-bg": "#7CB7FF" });
      expect(state.reason).toBe("complete-strict");
      expect(state.isComplete).toBe(true);
      expect(state.percent).toBe(100);
    });

    it("força percent=100 sob tolerância — evita miniatura mostrar 90% com badge 100%", () => {
      const page = Array.from(
        { length: 10 },
        (_, i) => `<path id="fill-region-${i}" d="M${i} 0h1v1z" />`,
      ).join("");
      const fills = Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [`fill-region-${i}`, "#7CB7FF"]),
      );
      const state = pageCompletionState(page, fills);
      expect(state.reason).toBe("complete-with-tolerance");
      expect(state.isComplete).toBe(true);
      expect(state.percent).toBe(100);
      // E a barra/miniatura concorda agora — sem o cap, daria 90.
      expect(pagePercent(page, fills)).toBe(100);
    });

    it("in-progress real: arredondamento que daria 100 é capado em 99 — CTA NÃO aparece", () => {
      // 599 pintadas de 600 → tolerância só vale para "<=1 faltando", aceita.
      // Para forçar in-progress sem tolerância, faltam 2:
      const page = Array.from(
        { length: 600 },
        (_, i) => `<path id="fill-r-${i}" d="M${i} 0h1v1z" />`,
      ).join("");
      const fills = Object.fromEntries(
        Array.from({ length: 598 }, (_, i) => [`fill-r-${i}`, "#7CB7FF"]),
      );
      const state = pageCompletionState(page, fills);
      expect(state.isComplete).toBe(false);
      expect(state.reason).toBe("in-progress");
      // 598/600 ≈ 99.66% — sem o cap, `Math.round` daria 100 e o CTA
      // apareceria sem a página estar realmente pronta.
      expect(state.percent).toBe(99);
    });

    it("validation está incluso no resultado (telas podem reaproveitar sem recomputar)", () => {
      const state = pageCompletionState(tinyPage, { "fill-bg": "#000" });
      expect(state.validation.totalValid).toBe(1);
      expect(state.validation.painted).toBe(1);
      expect(state.validation.missingIds).toEqual([]);
    });
  });
});
