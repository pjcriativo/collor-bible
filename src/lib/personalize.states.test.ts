/**
 * Garante que os microtoasts dos três estados-chave da jornada de pintura
 * — 1ª página da história, 50% da história e história concluída —
 * substituem corretamente a variável {name} e usam a tradução PT/EN/ES
 * adequada, em ambos os estilos de tratamento (name vs. you).
 *
 * Esses são os disparos visíveis para a criança em
 * `src/routes/colorir.$slug.tsx` e qualquer regressão aqui aparece direto
 * na UI; por isso vale travar com asserts de string completa em vez de
 * `toContain`.
 */
import { describe, expect, it } from "vitest";
import { firstPageOfStoryToast, halfStoryToast, storyDoneToast } from "@/lib/personalize";
import type { AppLanguage } from "@/lib/i18n";

const NAME = "Davi";

const EXPECTED = {
  firstPage: {
    named: {
      "pt-BR": `Que comecinho lindo, ${NAME}! Continue pintando 💛`,
      "en-US": `What a lovely start, ${NAME}! Keep coloring 💛`,
      "es-ES": `¡Qué bonito comienzo, ${NAME}! Sigue pintando 💛`,
    },
    generic: {
      "pt-BR": "Que comecinho lindo! Continue pintando 💛",
      "en-US": "What a lovely start! Keep coloring 💛",
      "es-ES": "¡Qué bonito comienzo! Sigue pintando 💛",
    },
  },
  half: {
    named: {
      "pt-BR": `Boa, ${NAME}! Você já está na metade! Falta pouco ✨`,
      "en-US": `Nice, ${NAME}! You're halfway there! Almost done ✨`,
      "es-ES": `¡Bien, ${NAME}! ¡Ya estás a la mitad! Falta poco ✨`,
    },
    generic: {
      "pt-BR": "Você já está na metade! Falta pouco ✨",
      "en-US": "You're halfway there! Almost done ✨",
      "es-ES": "¡Ya estás a la mitad! Falta poco ✨",
    },
  },
  storyDone: {
    named: {
      "pt-BR": `Muito bem, ${NAME}! Você terminou a história! 🎊`,
      "en-US": `Well done, ${NAME}! You finished the story! 🎊`,
      "es-ES": `¡Muy bien, ${NAME}! ¡Terminaste la historia! 🎊`,
    },
    generic: {
      "pt-BR": "Muito bem! Você terminou a história! 🎊",
      "en-US": "Well done! You finished the story! 🎊",
      "es-ES": "¡Muy bien! ¡Terminaste la historia! 🎊",
    },
  },
} as const;

const LANGS: AppLanguage[] = ["pt-BR", "en-US", "es-ES"];

describe("personalize — estado 1ª página da história", () => {
  it.each(LANGS)("[%s] insere o nome quando style=name e há nome válido", (lang) => {
    expect(firstPageOfStoryToast(lang, NAME, "name")).toBe(EXPECTED.firstPage.named[lang]);
  });

  it.each(LANGS)("[%s] usa a versão genérica quando não há nome", (lang) => {
    expect(firstPageOfStoryToast(lang, "", "name")).toBe(EXPECTED.firstPage.generic[lang]);
  });

  it.each(LANGS)("[%s] style=you força a versão genérica mesmo com nome", (lang) => {
    expect(firstPageOfStoryToast(lang, NAME, "you")).toBe(EXPECTED.firstPage.generic[lang]);
  });

  it("nunca deixa o placeholder {name} vazar para a UI", () => {
    for (const lang of LANGS) {
      expect(firstPageOfStoryToast(lang, NAME, "name")).not.toContain("{name}");
      expect(firstPageOfStoryToast(lang, "", "name")).not.toContain("{name}");
      expect(firstPageOfStoryToast(lang, NAME, "you")).not.toContain("{name}");
    }
  });
});

describe("personalize — estado 50% da história", () => {
  it.each(LANGS)("[%s] insere o nome quando style=name e há nome válido", (lang) => {
    expect(halfStoryToast(lang, NAME, "name")).toBe(EXPECTED.half.named[lang]);
  });

  it.each(LANGS)("[%s] usa a versão genérica quando não há nome", (lang) => {
    expect(halfStoryToast(lang, "", "name")).toBe(EXPECTED.half.generic[lang]);
  });

  it.each(LANGS)("[%s] style=you força a versão genérica mesmo com nome", (lang) => {
    expect(halfStoryToast(lang, NAME, "you")).toBe(EXPECTED.half.generic[lang]);
  });

  it("ES preserva a abertura '¡' tanto na versão com nome quanto na genérica", () => {
    expect(halfStoryToast("es-ES", NAME, "name").startsWith("¡")).toBe(true);
    expect(halfStoryToast("es-ES", "", "name").startsWith("¡")).toBe(true);
  });

  it("nunca deixa o placeholder {name} vazar para a UI", () => {
    for (const lang of LANGS) {
      expect(halfStoryToast(lang, NAME, "name")).not.toContain("{name}");
      expect(halfStoryToast(lang, "", "name")).not.toContain("{name}");
    }
  });
});

describe("personalize — estado história concluída", () => {
  it.each(LANGS)("[%s] insere o nome quando style=name e há nome válido", (lang) => {
    expect(storyDoneToast(lang, NAME, "name")).toBe(EXPECTED.storyDone.named[lang]);
  });

  it.each(LANGS)("[%s] usa a versão genérica quando não há nome", (lang) => {
    expect(storyDoneToast(lang, "", "name")).toBe(EXPECTED.storyDone.generic[lang]);
  });

  it.each(LANGS)("[%s] style=you força a versão genérica mesmo com nome", (lang) => {
    expect(storyDoneToast(lang, NAME, "you")).toBe(EXPECTED.storyDone.generic[lang]);
  });

  it("ES preserva pontuação completa '¡...!' nas duas variantes", () => {
    const named = storyDoneToast("es-ES", NAME, "name");
    const generic = storyDoneToast("es-ES", "", "name");
    expect(named.startsWith("¡")).toBe(true);
    expect(named.includes("!")).toBe(true);
    expect(generic.startsWith("¡")).toBe(true);
    expect(generic.includes("!")).toBe(true);
  });

  it("nome inválido cai no genérico (defesa em profundidade) em todos os idiomas", () => {
    for (const lang of LANGS) {
      expect(storyDoneToast(lang, "   ", "name")).toBe(EXPECTED.storyDone.generic[lang]);
      expect(storyDoneToast(lang, "{name}", "name")).toBe(EXPECTED.storyDone.generic[lang]);
      expect(storyDoneToast(lang, "123", "name")).toBe(EXPECTED.storyDone.generic[lang]);
    }
  });
});

describe("personalize — nome com espaços externos é normalizado nos 3 estados", () => {
  it("trim e colapso de espaços antes de injetar em {name}", () => {
    expect(firstPageOfStoryToast("pt-BR", "  Davi  ", "name")).toBe(
      EXPECTED.firstPage.named["pt-BR"],
    );
    expect(halfStoryToast("en-US", "  Davi ", "name")).toBe(EXPECTED.half.named["en-US"]);
    expect(storyDoneToast("es-ES", " Davi  ", "name")).toBe(EXPECTED.storyDone.named["es-ES"]);
  });
});
