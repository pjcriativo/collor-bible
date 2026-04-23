import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetLanguageSwitchingForTests,
  cancelLanguageSwitch,
  getLanguage,
  setLanguage,
} from "@/lib/i18n";

/**
 * Cobre o fluxo "Cancelar troca": durante a janela de switching, o
 * usuário pode desistir da mudança e o app deve voltar ao idioma anterior.
 */
describe("cancelLanguageSwitch", () => {
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

  it("é no-op fora da janela de switching", () => {
    expect(cancelLanguageSwitch()).toBe(false);
    expect(events).toEqual([]);
    expect(getLanguage()).toBe("pt-BR");
  });

  it("reverte para o idioma anterior se chamado dentro da janela", () => {
    // Estado inicial estável: pt-BR (default).
    setLanguage("en-US");
    expect(getLanguage()).toBe("en-US");
    expect(events).toEqual(["en-US"]);

    // Usuário desiste DURANTE a janela de switching.
    expect(cancelLanguageSwitch()).toBe(true);
    expect(getLanguage()).toBe("pt-BR");
    // Um segundo evento foi disparado para reverter as telas reativas.
    expect(events).toEqual(["en-US", "pt-BR"]);

    // E avançar o relógio NÃO deve reabrir a janela ou re-aplicar nada.
    vi.advanceTimersByTime(2000);
    expect(events).toEqual(["en-US", "pt-BR"]);
    expect(getLanguage()).toBe("pt-BR");
  });

  it("descarta a fila pendente E reverte se o idioma efetivo já mudou", () => {
    setLanguage("en-US"); // aplica imediatamente
    setLanguage("es-ES"); // enfileira
    expect(events).toEqual(["en-US"]);

    expect(cancelLanguageSwitch()).toBe(true);
    // Voltou para pt-BR (o estável anterior à sequência).
    expect(getLanguage()).toBe("pt-BR");
    expect(events).toEqual(["en-US", "pt-BR"]);

    // Tempo passa: nada mais deve acontecer (fila descartada).
    vi.advanceTimersByTime(2000);
    expect(events).toEqual(["en-US", "pt-BR"]);
  });

  it("permite uma nova troca limpa após o cancelamento", () => {
    setLanguage("en-US");
    cancelLanguageSwitch();
    expect(getLanguage()).toBe("pt-BR");

    // Nova troca subsequente deve funcionar normalmente.
    setLanguage("es-ES");
    expect(getLanguage()).toBe("es-ES");
    expect(events).toEqual(["en-US", "pt-BR", "es-ES"]);
  });
});
