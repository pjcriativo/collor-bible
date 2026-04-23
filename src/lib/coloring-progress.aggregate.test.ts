/**
 * Garante que a FONTE ÚNICA de cálculos agregados (história/catálogo)
 * em `coloring-progress.ts` se comporta de forma idêntica em todos os
 * consumidores: store, recalc, story-card e useColoringState.
 *
 * Antes essas fórmulas viviam duplicadas e divergiam (ex.: `Math.round`
 * num lugar e `Math.floor` em outro). Agora qualquer regressão aparece
 * primeiro aqui — e qualquer mudança de regra precisa atualizar uma
 * função só, não 5 sites.
 */
import { describe, expect, it } from "vitest";
import {
  catalogPercent,
  computeStoryCompletedPages,
  countCompletedPages,
  findUnlockedMilestone,
  isStoryComplete,
  storyPercent,
} from "@/lib/coloring-progress";

// SVG mínimo com N regiões pintáveis (sem fill explícito).
function makeSvg(regionCount: number): string {
  const regions = Array.from(
    { length: regionCount },
    (_, i) => `<path id="fill-r${i}" d="M0 0"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg">${regions}</svg>`;
}
function fullFills(regionCount: number): Record<string, string> {
  return Object.fromEntries(Array.from({ length: regionCount }, (_, i) => [`fill-r${i}`, "#fff"]));
}

describe("storyPercent — overload number,number e {done,total}", () => {
  it("0 quando total=0 (história sem páginas)", () => {
    expect(storyPercent(0, 0)).toBe(0);
    expect(storyPercent({ done: 5, total: 0 })).toBe(0);
  });
  it("arredonda para o inteiro mais próximo (Math.round)", () => {
    expect(storyPercent(1, 3)).toBe(33); // 33.33
    expect(storyPercent(2, 3)).toBe(67); // 66.66
    expect(storyPercent(7, 8)).toBe(88); // 87.5 → 88
  });
  it("nunca passa de 100 mesmo se done > total (defesa)", () => {
    expect(storyPercent(10, 5)).toBe(100);
  });
  it("100% exato quando todas as páginas concluídas", () => {
    expect(storyPercent(4, 4)).toBe(100);
  });
});

describe("isStoryComplete — semântica idêntica em modal/card/store", () => {
  it("true só quando done >= total e total > 0", () => {
    expect(isStoryComplete(0, 0)).toBe(false);
    expect(isStoryComplete(2, 4)).toBe(false);
    expect(isStoryComplete(4, 4)).toBe(true);
    expect(isStoryComplete(5, 4)).toBe(true); // tolera "extra"
  });
});

describe("countCompletedPages — recorta índices órfãos", () => {
  it("ignora índices >= total (compat com localStorage de versões antigas)", () => {
    expect(countCompletedPages([0, 1, 5, 9], 3)).toBe(2);
  });
  it("ignora índices negativos", () => {
    expect(countCompletedPages([-1, 0, 1], 5)).toBe(2);
  });
  it("retorna 0 quando total=0", () => {
    expect(countCompletedPages([0, 1, 2], 0)).toBe(0);
  });
});

describe("computeStoryCompletedPages — fonte única do 'concluiu'", () => {
  const story = { pages: [{ svg: makeSvg(3) }, { svg: makeSvg(2) }, { svg: makeSvg(4) }] };

  it("inclui apenas páginas 100% pintadas (regra estrita)", () => {
    const result = computeStoryCompletedPages(story, {
      0: fullFills(3),
      1: { "fill-r0": "#fff" }, // só metade
      2: fullFills(4),
    });
    expect(result).toEqual([0, 2]);
  });

  it("página sem fills no mapa é tratada como 0% (não conclui)", () => {
    expect(computeStoryCompletedPages(story, {})).toEqual([]);
  });

  it("é determinística — mesma entrada, mesma saída, em qualquer chamador", () => {
    const input = { 0: fullFills(3), 2: fullFills(4) };
    const a = computeStoryCompletedPages(story, input);
    const b = computeStoryCompletedPages(story, input);
    expect(a).toEqual(b);
    expect(a).toEqual([0, 2]);
  });
});

describe("catalogPercent — agregação do catálogo inteiro", () => {
  const stories = [
    { pages: [{ svg: "" }, { svg: "" }] }, // 2 páginas
    { pages: [{ svg: "" }, { svg: "" }, { svg: "" }] }, // 3 páginas
  ];

  it("soma páginas e arredonda uma única vez (sem drift)", () => {
    const r = catalogPercent(stories, (i) => (i === 0 ? 1 : 2)); // 3/5
    expect(r).toEqual({ done: 3, total: 5, percent: 60 });
  });

  it("zero histórias → percent 0 (não NaN)", () => {
    expect(catalogPercent([], () => 0)).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("100% quando done === total em todas", () => {
    expect(catalogPercent(stories, (i) => stories[i]!.pages.length)).toEqual({
      done: 5,
      total: 5,
      percent: 100,
    });
  });
});

describe("findUnlockedMilestone — detecção de cruzamento", () => {
  const milestones = [
    { pct: 25, label: "Semente" },
    { pct: 50, label: "Artista" },
    { pct: 75, label: "Estrela" },
    { pct: 100, label: "Mestre" },
  ];

  it("retorna o milestone recém-cruzado", () => {
    expect(findUnlockedMilestone(20, 30, milestones)?.label).toBe("Semente");
    expect(findUnlockedMilestone(49, 51, milestones)?.label).toBe("Artista");
    expect(findUnlockedMilestone(99, 100, milestones)?.label).toBe("Mestre");
  });
  it("retorna undefined quando não cruzou nenhum", () => {
    expect(findUnlockedMilestone(30, 40, milestones)).toBeUndefined();
    expect(findUnlockedMilestone(50, 50, milestones)).toBeUndefined();
  });
  it("retorna o PRIMEIRO milestone cruzado quando vários (ordem da tabela)", () => {
    expect(findUnlockedMilestone(0, 100, milestones)?.label).toBe("Semente");
  });
});

describe("paridade entre consumidores — story-card vs modal vs store", () => {
  // Garante que `pct` calculado pelo card e `isStoryComplete` checado pelo
  // modal sempre concordam, em qualquer (done,total). Antes isso podia
  // divergir porque cada arquivo tinha sua própria fórmula.
  it("storyPercent === 100 ⇔ isStoryComplete === true", () => {
    for (let total = 1; total <= 10; total++) {
      for (let done = 0; done <= total + 2; done++) {
        const pct = storyPercent(done, total);
        const complete = isStoryComplete(done, total);
        expect(pct === 100).toBe(complete);
      }
    }
  });
});
