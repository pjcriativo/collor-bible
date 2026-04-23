import { describe, expect, it } from "vitest";
import {
  isValidChildName,
  milestoneToast,
  pageCompleteBody,
  pageCompleteTitle,
  pageCompleteToast,
  profileGreeting,
  storyCompleteTitle,
  storyIntroEyebrow,
  storyMilestoneTitle,
} from "./personalize";
import { sanitizeChildName } from "@/hooks/use-child-name";

describe("personalize — fallback genérico vs nome", () => {
  it("saudação: sem nome usa fallback neutro e elegante; com nome insere o nome", () => {
    expect(profileGreeting("pt-BR", "")).toBe("Olá!");
    expect(profileGreeting("pt-BR", "Davi")).toBe("Olá, Davi");
    expect(profileGreeting("en-US", "")).toBe("Hi there!");
    expect(profileGreeting("en-US", "Davi")).toBe("Hi, Davi");
    expect(profileGreeting("es-ES", "")).toBe("¡Hola!");
    expect(profileGreeting("es-ES", "Davi")).toBe("Hola, Davi");
  });

  it("modal página completa: título e corpo personalizados", () => {
    expect(pageCompleteTitle("pt-BR", "")).toBe("Parabéns! Página completa! 🎉");
    expect(pageCompleteTitle("pt-BR", "Davi")).toBe("Parabéns, Davi! Página completa! 🎉");
    expect(pageCompleteBody("pt-BR", "Davi")).toContain("Davi, você pintou");
  });

  it("modal história concluída usa o nome", () => {
    expect(storyCompleteTitle("pt-BR", "")).toBe("Parabéns!");
    expect(storyCompleteTitle("pt-BR", "Davi")).toBe("Parabéns, Davi!");
  });

  it("eyebrow da tela de história: vazio sem nome, com nome insere o nome", () => {
    // Sem nome → string vazia (a UI esconde o eyebrow inteiro,
    // diferente das outras copies que têm fallback genérico).
    expect(storyIntroEyebrow("pt-BR", "")).toBe("");
    expect(storyIntroEyebrow("pt-BR", "   ")).toBe("");
    expect(storyIntroEyebrow("pt-BR", "!!!")).toBe("");
    // Com nome → frase localizada.
    expect(storyIntroEyebrow("pt-BR", "Davi")).toBe("Vamos começar, Davi?");
    expect(storyIntroEyebrow("en-US", "Davi")).toBe("Ready to start, Davi?");
    expect(storyIntroEyebrow("es-ES", "Davi")).toBe("¿Empezamos, Davi?");
  });
});

describe("personalize — fallback contra nomes inválidos", () => {
  it("isValidChildName rejeita lixo comum", () => {
    expect(isValidChildName("")).toBe(false);
    expect(isValidChildName("   ")).toBe(false);
    expect(isValidChildName("!!!")).toBe(false);
    expect(isValidChildName("123")).toBe(false);
    expect(isValidChildName("---")).toBe(false);
    expect(isValidChildName("null")).toBe(false);
    expect(isValidChildName("undefined")).toBe(false);
    expect(isValidChildName("{name}")).toBe(false);
    expect(isValidChildName(null as unknown as string)).toBe(false);
    expect(isValidChildName(undefined as unknown as string)).toBe(false);
    expect(isValidChildName(42 as unknown as string)).toBe(false);
  });
  it("isValidChildName aceita nomes reais (incl. acentos e hífen)", () => {
    expect(isValidChildName("Davi")).toBe(true);
    expect(isValidChildName("Maria Clara")).toBe(true);
    expect(isValidChildName("João")).toBe(true);
    expect(isValidChildName("Ana-Luísa")).toBe(true);
  });
  it("nome inválido cai no fallback genérico em TODAS as copies", () => {
    // pt-BR
    expect(profileGreeting("pt-BR", "   ")).toBe("Olá!");
    expect(pageCompleteTitle("pt-BR", "!!!")).toBe("Parabéns! Página completa! 🎉");
    expect(pageCompleteBody("pt-BR", "123")).not.toContain("123");
    expect(storyCompleteTitle("pt-BR", "null")).toBe("Parabéns!");
    expect(storyMilestoneTitle("pt-BR", "{name}")).toBe(
      "Parabéns! Você desbloqueou uma nova fase!",
    );
    expect(pageCompleteToast("pt-BR", "  ")).toBe("Boa! Mais uma página pintada!");
    // milestoneToast — substitui {ms} mesmo no fallback
    expect(milestoneToast("pt-BR", "   ", "Aprendiz")).toBe("Você desbloqueou Aprendiz!");
    // outros idiomas
    expect(profileGreeting("en-US", "!!!")).toBe("Hi there!");
    expect(profileGreeting("es-ES", "---")).toBe("¡Hola!");
  });
  it("nome com espaços externos é normalizado e usado", () => {
    expect(profileGreeting("pt-BR", "  Davi  ")).toBe("Olá, Davi");
    expect(pageCompleteToast("pt-BR", "  Maria   Clara  ")).toBe(
      "Boa, Maria Clara! Mais uma página pintada!",
    );
  });
});

describe("sanitizeChildName", () => {
  it("trim, colapsa espaços, capitaliza palavras e mantém conectores em minúsculo", () => {
    expect(sanitizeChildName("  davi  ")).toBe("Davi");
    expect(sanitizeChildName("maria   clara")).toBe("Maria Clara");
    expect(sanitizeChildName("ana DA silva")).toBe("Ana da Silva");
  });
  it("limita a 25 caracteres (alinhado ao input do perfil)", () => {
    const long = "a".repeat(80);
    expect(sanitizeChildName(long).length).toBe(25);
  });
  it("vazio => vazio", () => {
    expect(sanitizeChildName("   ")).toBe("");
  });
});
