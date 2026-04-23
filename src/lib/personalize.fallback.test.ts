/**
 * Garante que o fallback automático (nome vazio/inválido OU style="you")
 * exibe um texto NEUTRO e elegante — sem termos infantilizados como
 * "amiguinho/little friend/amiguito" — em todas as copies que aparecem
 * para o usuário (saudação + modais).
 */
import { describe, expect, it } from "vitest";
import {
  pageCompleteBody,
  pageCompleteTitle,
  pageCompleteToast,
  profileGreeting,
  storyCompleteTitle,
  storyMilestoneTitle,
} from "@/lib/personalize";
import type { AppLanguage } from "@/lib/i18n";

const LANGS: AppLanguage[] = ["pt-BR", "en-US", "es-ES"];
const FORBIDDEN = /amiguinho|amiguito|little friend/i;
const EMPTY_INPUTS = ["", "   ", "!!!", "123", "{name}", "null", "undefined"];

describe("personalize — fallback automático neutro/elegante", () => {
  it.each(LANGS)("[%s] saudação sem nome usa texto neutro", (lang) => {
    const greeting = profileGreeting(lang, "");
    expect(greeting).not.toMatch(FORBIDDEN);
    expect(greeting.length).toBeGreaterThan(0);
  });

  it.each(LANGS)("[%s] saudação style='you' usa texto neutro mesmo com nome", (lang) => {
    const greeting = profileGreeting(lang, "Davi", "you");
    expect(greeting).not.toMatch(FORBIDDEN);
    expect(greeting).not.toContain("Davi");
  });

  it("nenhuma copy infantiliza o usuário no fallback", () => {
    for (const lang of LANGS) {
      for (const bad of EMPTY_INPUTS) {
        expect(profileGreeting(lang, bad)).not.toMatch(FORBIDDEN);
        expect(pageCompleteTitle(lang, bad)).not.toMatch(FORBIDDEN);
        expect(pageCompleteBody(lang, bad)).not.toMatch(FORBIDDEN);
        expect(pageCompleteToast(lang, bad)).not.toMatch(FORBIDDEN);
        expect(storyCompleteTitle(lang, bad)).not.toMatch(FORBIDDEN);
        expect(storyMilestoneTitle(lang, bad)).not.toMatch(FORBIDDEN);
      }
    }
  });

  it("textos de fallback exatos por idioma (saudação)", () => {
    expect(profileGreeting("pt-BR", "")).toBe("Olá!");
    expect(profileGreeting("en-US", "")).toBe("Hi there!");
    expect(profileGreeting("es-ES", "")).toBe("¡Hola!");
  });

  it("fallback nunca deixa placeholder vazar", () => {
    for (const lang of LANGS) {
      for (const bad of EMPTY_INPUTS) {
        expect(profileGreeting(lang, bad)).not.toContain("{name}");
        expect(pageCompleteTitle(lang, bad)).not.toContain("{name}");
        expect(pageCompleteBody(lang, bad)).not.toContain("{name}");
        expect(storyCompleteTitle(lang, bad)).not.toContain("{name}");
      }
    }
  });
});
