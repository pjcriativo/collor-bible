/**
 * Garante que os rótulos do checklist "o que falta" são traduzidos
 * para inglês e espanhol, e que o PT-BR (default) permanece estável.
 *
 * Cobertura mínima: alguns rótulos visualmente importantes que a
 * criança verá com mais frequência (Sol, Flor, Criança, Jesus, Pomba)
 * + o fallback genérico ("Detalhe") para ids desconhecidos.
 */
import { describe, expect, it } from "vitest";
import { buildMissingChecklist, nameForRegionId } from "./region-names";

describe("nameForRegionId — traduções", () => {
  it("retorna PT-BR por padrão (sem language)", () => {
    expect(nameForRegionId("fill-sun-3").label).toBe("Sol");
    expect(nameForRegionId("fill-sym-5-flor-p1").label).toBe("Flor");
    expect(nameForRegionId("fill-hero-5-c1-head").label).toBe("Criança");
  });

  it("traduz para inglês quando language='en-US'", () => {
    expect(nameForRegionId("fill-sun-3", "en-US").label).toBe("Sun");
    expect(nameForRegionId("fill-sym-5-flor-p1", "en-US").label).toBe("Flower");
    expect(nameForRegionId("fill-hero-5-c1-head", "en-US").label).toBe("Child");
    expect(nameForRegionId("fill-hero-5-jesus-head", "en-US").label).toBe("Jesus");
    expect(nameForRegionId("fill-sym-5-dove-body", "en-US").label).toBe("Dove");
  });

  it("traduz para espanhol quando language='es-ES'", () => {
    expect(nameForRegionId("fill-sun-3", "es-ES").label).toBe("Sol");
    expect(nameForRegionId("fill-sym-5-flor-p1", "es-ES").label).toBe("Flor");
    expect(nameForRegionId("fill-hero-5-c1-head", "es-ES").label).toBe("Niño");
    expect(nameForRegionId("fill-sym-5-dove-body", "es-ES").label).toBe("Paloma");
    expect(nameForRegionId("fill-bg-5-sky", "es-ES").label).toBe("Cielo");
    expect(nameForRegionId("fill-rainbow-2", "es-ES").label).toBe("Arcoíris");
  });

  it("preserva a chave (`key`) entre idiomas — usada para deduplicar", () => {
    const pt = nameForRegionId("fill-sym-5-flor-p1", "pt-BR");
    const en = nameForRegionId("fill-sym-5-flor-p1", "en-US");
    const es = nameForRegionId("fill-sym-5-flor-p1", "es-ES");
    expect(pt.key).toBe("flor");
    expect(en.key).toBe("flor");
    expect(es.key).toBe("flor");
  });

  it("traduz o fallback genérico ('Detalhe' → 'Detail' / 'Detalle')", () => {
    expect(nameForRegionId("fill-xyz-zorba", "pt-BR").label).toBe("Detalhe");
    expect(nameForRegionId("fill-xyz-zorba", "en-US").label).toBe("Detail");
    expect(nameForRegionId("fill-xyz-zorba", "es-ES").label).toBe("Detalle");
  });
});

describe("buildMissingChecklist — traduções", () => {
  it("aplica idioma a todos os itens do checklist", () => {
    const items = buildMissingChecklist(
      ["fill-sun-1", "fill-sym-3-flor-p1", "fill-hero-3-jesus-head"],
      "en-US",
    );
    expect(items.map((i) => i.label)).toEqual(["Sun", "Flower", "Jesus"]);
  });

  it("preserva contagem e ids ao traduzir", () => {
    const items = buildMissingChecklist(
      ["fill-sym-5-flor-p1", "fill-sym-5-flor-p2", "fill-sun-1"],
      "es-ES",
    );
    const flor = items.find((i) => i.key === "flor");
    expect(flor?.label).toBe("Flor");
    expect(flor?.count).toBe(2);
    expect(flor?.ids).toEqual(["fill-sym-5-flor-p1", "fill-sym-5-flor-p2"]);
  });
});
