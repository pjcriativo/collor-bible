import { afterEach, describe, expect, it } from "vitest";
import { allowSessionToast, __resetSessionToastGuard } from "@/lib/session-toast-guard";

describe("allowSessionToast — limite de repetição imediata por criança", () => {
  afterEach(() => __resetSessionToastGuard());

  it("permite o primeiro disparo e bloqueia o mesmo key seguido para a mesma criança", () => {
    expect(allowSessionToast("Davi", "page-complete:noe:2")).toBe(true);
    expect(allowSessionToast("Davi", "page-complete:noe:2")).toBe(false);
  });

  it("permite quando a chave muda (microtoasts diferentes podem se intercalar)", () => {
    expect(allowSessionToast("Davi", "page-complete:noe:2")).toBe(true);
    expect(allowSessionToast("Davi", "milestone:Semente")).toBe(true);
    // depois de outra chave, repetir a primeira é permitido — só bloqueia "duas vezes seguidas"
    expect(allowSessionToast("Davi", "page-complete:noe:2")).toBe(true);
  });

  it("isola por criança: a mesma chave para outro perfil não é bloqueada", () => {
    expect(allowSessionToast("Davi", "story-done:davi")).toBe(true);
    expect(allowSessionToast("Maria", "story-done:davi")).toBe(true);
    // mas continua bloqueando repetição imediata por criança
    expect(allowSessionToast("Maria", "story-done:davi")).toBe(false);
  });

  it("trata nome ausente/whitespace como o mesmo balde", () => {
    expect(allowSessionToast(null, "page-complete:noe:0")).toBe(true);
    expect(allowSessionToast("   ", "page-complete:noe:0")).toBe(false);
    expect(allowSessionToast(undefined, "page-complete:noe:0")).toBe(false);
  });

  it("é case-insensitive no nome (Davi == davi)", () => {
    expect(allowSessionToast("Davi", "milestone:Artista")).toBe(true);
    expect(allowSessionToast("davi", "milestone:Artista")).toBe(false);
  });
});
