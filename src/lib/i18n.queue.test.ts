import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetLanguageSwitchingForTests, getLanguage, setLanguage } from "@/lib/i18n";

/**
 * Verifica a fila de mudanças rápidas de idioma:
 *  - Durante a janela de "switching", chamadas adicionais a `setLanguage`
 *    NÃO disparam eventos imediatos.
 *  - A última seleção pendente é aplicada automaticamente ao fim da janela.
 */
describe("setLanguage queue", () => {
  let events: string[] = [];
  const handler = (e: Event) => {
    events.push((e as CustomEvent<string>).detail);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    events = [];
    window.localStorage.clear();
    __resetLanguageSwitchingForTests();
    window.addEventListener("ccj-language-changed", handler);
  });

  afterEach(() => {
    window.removeEventListener("ccj-language-changed", handler);
    __resetLanguageSwitchingForTests();
    vi.useRealTimers();
  });

  it("aplica imediatamente a primeira mudança e enfileira as seguintes", () => {
    setLanguage("en-US");
    expect(events).toEqual(["en-US"]);
    expect(getLanguage()).toBe("en-US");

    // Trocas rápidas durante a janela: não disparam evento agora.
    setLanguage("es-ES");
    setLanguage("pt-BR");
    setLanguage("es-ES");
    expect(events).toEqual(["en-US"]);
    // O idioma "ativo" persistido continua o último aplicado.
    expect(getLanguage()).toBe("en-US");

    // Avança a janela: a última seleção (es-ES) é aplicada.
    vi.advanceTimersByTime(700);
    expect(events).toEqual(["en-US", "es-ES"]);
    expect(getLanguage()).toBe("es-ES");
  });

  it("descarta a fila quando a última seleção iguala o estado atual", () => {
    setLanguage("en-US");
    setLanguage("es-ES"); // enfileirado
    setLanguage("en-US"); // último: igual ao atual aplicado -> descartar
    vi.advanceTimersByTime(700);
    expect(events).toEqual(["en-US"]);
    expect(getLanguage()).toBe("en-US");
  });

  it("encadeia janelas: aplicação pendente abre nova janela e aceita nova fila", () => {
    setLanguage("en-US");
    setLanguage("es-ES"); // pendente

    vi.advanceTimersByTime(700);
    expect(events).toEqual(["en-US", "es-ES"]);

    // Agora estamos na janela aberta pelo flush -> nova chamada enfileira.
    setLanguage("pt-BR");
    expect(events).toEqual(["en-US", "es-ES"]);
    vi.advanceTimersByTime(700);
    expect(events).toEqual(["en-US", "es-ES", "pt-BR"]);
    expect(getLanguage()).toBe("pt-BR");
  });
});
