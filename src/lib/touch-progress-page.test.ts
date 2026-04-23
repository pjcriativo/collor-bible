import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProgress, saveProgress, touchProgressPage } from "@/lib/store";

/**
 * Cobre o cenário "voltar para /home retoma na página atual":
 *  - Usuário abre a história na página 0, pinta algo (pageIndex=0 fica salvo).
 *  - Navega para a página 2 sem pintar — `touchProgressPage` é chamado.
 *  - Esperado: `getProgress(...).pageIndex === 2` (e os fills da página 0
 *    permanecem intactos), o que faz o FAB do perfil retomar na página 2.
 */
describe("touchProgressPage — persistência do pageIndex sem pintura", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("cria progresso vazio com pageIndex quando não existe registro prévio", () => {
    expect(getProgress("noe-e-a-arca")).toBeUndefined();
    touchProgressPage("noe-e-a-arca", 3);

    const prog = getProgress("noe-e-a-arca");
    expect(prog).toBeDefined();
    expect(prog!.pageIndex).toBe(3);
    expect(prog!.fills).toEqual({});
    expect(prog!.completedPages).toEqual([]);
  });

  it("atualiza apenas pageIndex/updatedAt sem perder fills nem completedPages", () => {
    // Primeiro, simula pintura PARCIAL na página 0.
    // Nota: até a v1, qualquer fill marcava a página como concluída.
    // Após o fix em `saveProgress`, `completedPages` segue a regra
    // estrita `isPageComplete`, então uma fill parcial sintética
    // (`fill-a` que não pertence aos IDs reais do SVG) não conclui
    // a página — o que valida que o cálculo agora é confiável.
    saveProgress({
      storySlug: "davi-e-golias",
      pageIndex: 0,
      fills: { "fill-a": "#FF0000" },
      updatedAt: 1_000,
    });
    const before = getProgress("davi-e-golias")!;
    expect(before.pageIndex).toBe(0);
    expect(before.completedPages).toEqual([]);
    expect(before.pagesFills).toEqual({ 0: { "fill-a": "#FF0000" } });

    // Usuário navega para página 2 sem pintar.
    touchProgressPage("davi-e-golias", 2);

    const after = getProgress("davi-e-golias")!;
    expect(after.pageIndex).toBe(2);
    // Fills e páginas concluídas preservados.
    // O importante aqui é que `touchProgressPage` NÃO mexa nos campos
    // de progresso — preserva o que `saveProgress` deixou.
    expect(after.completedPages).toEqual([]);
    expect(after.pagesFills).toEqual({ 0: { "fill-a": "#FF0000" } });
    expect(after.fills).toEqual({ "fill-a": "#FF0000" });
    expect(after.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
  });

  it("é no-op quando o pageIndex já está atualizado (não muda updatedAt)", () => {
    saveProgress({
      storySlug: "jonas-e-a-baleia",
      pageIndex: 1,
      fills: { "fill-x": "#0000FF" },
      updatedAt: 5_000,
    });
    const before = getProgress("jonas-e-a-baleia")!;
    const stamp = before.updatedAt;

    touchProgressPage("jonas-e-a-baleia", 1);

    const after = getProgress("jonas-e-a-baleia")!;
    expect(after.updatedAt).toBe(stamp);
    expect(after.pageIndex).toBe(1);
  });
});
