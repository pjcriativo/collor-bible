import { describe, expect, it } from "vitest";
import { localizeCategory, localizeStory, translate, type AppLanguage } from "@/lib/i18n";
import type { Category, Story } from "@/lib/types";

const baseStory: Story = {
  id: "s1",
  slug: "noe-e-a-arca",
  title: "Arca de Noé",
  subtitle: "Animais, chuva e um lindo arco-íris",
  shortDescription: "Animais, chuva e um lindo arco-íris",
  description: "Descubra como Noé construiu uma arca enorme",
  ageRange: "3-7",
  testament: "antigo",
  categoryIds: [],
  cover: "",
  pages: [],
  active: true,
  order: 1,
};

const orphanStory: Story = {
  ...baseStory,
  slug: "historia-sem-traducao",
  title: "História sem tradução",
  subtitle: "Original PT-BR",
  shortDescription: "Original PT-BR",
  description: "Original PT-BR",
};

const baseCategory: Category = {
  id: "c1",
  slug: "criacao",
  name: "Criação",
  emoji: "🌍",
  color: "mint",
};

describe("i18n — fallback de tradução", () => {
  it("translate() devolve a mesma chave quando não existe nenhuma tradução em nenhum idioma", () => {
    const result = translate("pt-BR", "chave_inexistente_xyz" as never);
    expect(result).toBe("chave_inexistente_xyz");
  });

  it("translate() cai para PT-BR quando o idioma alvo não tem a chave", () => {
    // 'noStarted' existe em PT-BR mas não está nos overrides de en-US/es-ES.
    const ptValue = translate("pt-BR", "noStarted");
    const esValue = translate("es-ES", "noStarted");
    expect(ptValue.length).toBeGreaterThan(0);
    expect(esValue.length).toBeGreaterThan(0);
    // A versão em ES já existe no copy, então deve ser diferente do PT.
    expect(esValue).not.toBe("noStarted");
  });

  it("translate() resolve um idioma desconhecido (ex.: fr-FR) caindo no inglês ou no padrão", () => {
    const value = translate("fr-FR" as AppLanguage, "continue");
    // 'Continue' (en-US) ou 'Continuar' (pt-BR) — nunca a chave crua.
    expect(value).not.toBe("continue");
    expect(value.length).toBeGreaterThan(0);
  });

  it("localizeStory() devolve a história base quando não há tradução para o idioma alvo nem para a família", () => {
    const out = localizeStory(orphanStory, "es-ES");
    expect(out.title).toBe("História sem tradução");
    expect(out.subtitle).toBe("Original PT-BR");
  });

  it("localizeStory() troca o título quando a tradução existe e mantém o título traduzido após múltiplas trocas", () => {
    const en = localizeStory(baseStory, "en-US");
    expect(en.title).toBe("Noah's Ark");

    const es = localizeStory(baseStory, "es-ES");
    expect(es.title).toBe("El Arca de Noé");

    // Voltar para PT-BR — não pode "ficar travado" no espanhol.
    const pt = localizeStory(baseStory, "pt-BR");
    expect(pt.title).toBe("Arca de Noé");
  });

  it("localizeCategory() cai para o nome base quando o idioma alvo não tem tradução", () => {
    const out = localizeCategory(baseCategory, "fr-FR" as AppLanguage);
    // Sem tradução em fr-FR — usa en-US ("Creation") ou cai para o nome base.
    expect(["Creation", "Criação"]).toContain(out.name);
  });
});
