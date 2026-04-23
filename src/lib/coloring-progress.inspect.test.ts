/**
 * `inspectFillableRegions` é o que alimenta a página de debug. Ele PRECISA
 * concordar bit-a-bit com `extractFillableRegionIds` — caso contrário a
 * tela de debug mostraria uma realidade diferente da usada pelas miniaturas
 * e pelo badge de "Concluída".
 */
import { describe, expect, it } from "vitest";
import { STORY_PAGES } from "@/lib/coloring-pages";
import { extractFillableRegionIds, inspectFillableRegions } from "@/lib/coloring-progress";

describe("inspectFillableRegions ↔ extractFillableRegionIds", () => {
  it.each(Object.keys(STORY_PAGES))(
    "%s: included == extractFillableRegionIds para todas as páginas",
    (slug) => {
      const pages = STORY_PAGES[slug]!;
      for (let i = 0; i < pages.length; i++) {
        const svg = pages[i]!;
        const inspection = inspectFillableRegions(svg);
        const fillable = extractFillableRegionIds(svg);
        expect(new Set(inspection.included)).toEqual(fillable);
        // Não deve haver IDs duplicados entre included/excluded.
        const excludedIds = new Set(inspection.excluded.map((e) => e.id));
        for (const id of inspection.included) expect(excludedIds.has(id)).toBe(false);
      }
    },
  );

  it("inspect roda em Davi e Golias página 0 e produz inclusões válidas", () => {
    // A versão premium não usa mais halos `fill="white"`. Garantimos
    // apenas que a inspeção continua funcional e que há regiões incluídas.
    const svg = STORY_PAGES["davi-e-golias"]![0]!;
    const inspection = inspectFillableRegions(svg);
    expect(inspection.included.length).toBeGreaterThan(0);
  });

  it('explica `fill="none"` quando presente no SVG', () => {
    // Procura qualquer página com pelo menos um fill="none" excluído.
    const found = Object.values(STORY_PAGES)
      .flat()
      .map(inspectFillableRegions)
      .flatMap((insp) => insp.excluded)
      .find((e) => e.fill === "none");
    if (found) {
      expect(found.reason).toMatch(/none|técnico/);
    }
  });
});
