/**
 * Testes do dicionário de nomes amigáveis usado pelo checklist
 * "o que falta colorir". Cobrem os ids reais que aparecem nas histórias
 * (jesus, criancas, sol, flores, pomba) e o agrupamento por categoria.
 */
import { describe, expect, it } from "vitest";
import { buildMissingChecklist, nameForRegionId } from "./region-names";

describe("nameForRegionId", () => {
  it.each([
    ["fill-hero-5-jesus-head", "jesus", "Jesus"],
    ["fill-hero-5-jesus-robe", "jesus", "Jesus"],
    ["fill-hero-5-c1-head", "criancas", "Criança"],
    ["fill-hero-5-c2-body", "criancas", "Criança"],
    ["fill-sym-5-flor-p2", "flor", "Flor"],
    ["fill-sym-5-dove-body", "pomba", "Pomba"],
    ["fill-bg-5-sky", "ceu", "Céu"],
    ["fill-bg-5-g", "chao", "Chão"],
    ["fill-sun-3", "sol", "Sol"],
    ["fill-h-5", "coracao", "Coração"],
    ["fill-rainbow-2", "arco-iris", "Arco-íris"],
  ])("%s → %s/%s", (id, key, label) => {
    const out = nameForRegionId(id);
    expect(out.key).toBe(key);
    expect(out.label).toBe(label);
    expect(out.emoji.length).toBeGreaterThan(0);
  });

  it("usa fallback genérico para ids desconhecidos sem expor o id cru", () => {
    const out = nameForRegionId("fill-xyz-zorba");
    expect(out.key).toBe("detalhe");
    expect(out.label).toBe("Detalhe");
  });
});

describe("buildMissingChecklist", () => {
  it("agrupa pétalas/cabeça/corpo no mesmo nome amigável e conta", () => {
    const items = buildMissingChecklist([
      "fill-sym-5-flor-p1",
      "fill-sym-5-flor-p2",
      "fill-sym-5-flor-p3",
      "fill-hero-5-c1-head",
      "fill-hero-5-c1-body",
      "fill-sun-2",
    ]);
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.count]));
    expect(byKey).toEqual({ flor: 3, criancas: 2, sol: 1 });
  });

  it("mantém ordem da primeira ocorrência (estabilidade visual)", () => {
    const items = buildMissingChecklist([
      "fill-sun-1",
      "fill-sym-3-flor-p1",
      "fill-sun-2",
      "fill-hero-3-jesus-head",
    ]);
    expect(items.map((i) => i.key)).toEqual(["sol", "flor", "jesus"]);
  });

  it("preserva os ids brutos em cada item — usado para realçar no canvas", () => {
    const items = buildMissingChecklist(["fill-sun-1", "fill-sun-2"]);
    expect(items[0]!.ids).toEqual(["fill-sun-1", "fill-sun-2"]);
  });

  it("lista vazia gera checklist vazio", () => {
    expect(buildMissingChecklist([])).toEqual([]);
  });
});
