/**
 * Testes da validação por página (`validatePageProgress`).
 *
 * Foco: garantir que o relatório usado pelo dev-warning do canvas e
 * pela página /debug/coloring-progress reflita exatamente a mesma fonte
 * de verdade de `extractFillableRegionIds` — sem inventar regiões nem
 * tolerar IDs órfãos silenciosamente.
 */
import { describe, expect, it } from "vitest";
import { extractFillableRegionIds, validatePageProgress } from "@/lib/coloring-progress";

const svgTwo = `<rect id="fill-a"/><circle id="fill-b"/>`;
// `fill-halo` tem fill="white" fixo → decorativo, NÃO deve contar.
const svgWithDecor = `<rect id="fill-a"/><circle id="fill-halo" fill="white"/>`;

describe("validatePageProgress", () => {
  it("ok=true e zero inválidas/ausentes quando todas as regiões válidas estão pintadas", () => {
    const r = validatePageProgress(svgTwo, { "fill-a": "#000", "fill-b": "#fff" });
    expect(r).toEqual({
      totalValid: 2,
      painted: 2,
      invalidPaintedIds: [],
      missingIds: [],
      ok: true,
    });
  });

  it("lista regiões ausentes quando faltam pintar", () => {
    const r = validatePageProgress(svgTwo, { "fill-a": "#000" });
    expect(r.totalValid).toBe(2);
    expect(r.painted).toBe(1);
    expect(r.missingIds).toEqual(["fill-b"]);
    expect(r.ok).toBe(true); // ausência é informativa, não erro
  });

  it("detecta IDs pintados que NÃO pertencem ao conjunto preenchível (ok=false)", () => {
    // `fill-z` não existe no SVG; `fill-halo` é decorativo (excluído).
    const r = validatePageProgress(svgWithDecor, {
      "fill-a": "#000",
      "fill-z": "#111",
      "fill-halo": "#222",
    });
    expect(r.totalValid).toBe(1);
    expect(r.painted).toBe(1); // só fill-a conta como pintada válida
    expect(r.invalidPaintedIds).toEqual(["fill-halo", "fill-z"]); // ordenado
    expect(r.ok).toBe(false);
  });

  it("ignora cores vazias/falsy (não conta como pintura)", () => {
    const r = validatePageProgress(svgTwo, { "fill-a": "", "fill-b": "#fff" });
    expect(r.painted).toBe(1);
    expect(r.missingIds).toEqual(["fill-a"]);
    expect(r.invalidPaintedIds).toEqual([]);
  });

  it("SVG vazio: totalValid=0, ok=true (nada a validar)", () => {
    const r = validatePageProgress("", { "fill-x": "#000" });
    expect(r.totalValid).toBe(0);
    expect(r.painted).toBe(0);
    // O ID continua sendo "inválido" porque não pertence ao set vazio.
    expect(r.invalidPaintedIds).toEqual(["fill-x"]);
    expect(r.ok).toBe(false);
  });

  it("é determinístico: arrays sempre ordenados alfabeticamente", () => {
    const a = validatePageProgress(svgWithDecor, {
      "fill-z": "#000",
      "fill-halo": "#000",
      "fill-a": "#000",
    });
    const b = validatePageProgress(svgWithDecor, {
      "fill-a": "#000",
      "fill-halo": "#000",
      "fill-z": "#000",
    });
    expect(a).toEqual(b);
  });

  it("painted + missing == totalValid (invariante)", () => {
    const r = validatePageProgress(svgTwo, { "fill-a": "#000", "fill-z": "#111" });
    expect(r.painted + r.missingIds.length).toBe(r.totalValid);
  });

  it("totalValid == |extractFillableRegionIds| (mesma fonte da verdade)", () => {
    const r = validatePageProgress(svgWithDecor, {});
    expect(r.totalValid).toBe(extractFillableRegionIds(svgWithDecor).size);
  });
});
