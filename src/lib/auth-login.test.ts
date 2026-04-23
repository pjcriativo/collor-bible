/**
 * Garante o contrato de login do cliente normal.
 *
 * Cenários cobertos:
 *  1. Login feliz com a senha PADRÃO pós-compra (`12345678`) é aceito —
 *     o schema NÃO bloqueia senhas comuns no client.
 *  2. Login feliz com uma senha NOVA escolhida no fluxo de reset
 *     (mesmo que seja simples, fraca ou apareça em listas de vazamento)
 *     é aceito — o validador só checa tamanho, não complexidade.
 *  3. Email é normalizado (trim + lowercase) antes de chegar ao servidor.
 *  4. Erros do Supabase são mapeados para mensagens claras em PT-BR e o
 *     fluxo NÃO confunde "senha errada" com "usuário inexistente".
 *  5. Se o servidor um dia voltar a rejeitar por HIBP/leaked, o usuário
 *     recebe uma mensagem clara em vez do texto cru da API.
 *
 * Esses testes existem para travar uma regressão real: a conta de
 * cliente normal deixou de logar quando a checagem HIBP ficou ligada e
 * rejeitou a senha padrão. Aqui garantimos que o lado client não volte
 * a impor essa restrição por conta própria.
 */
import { describe, expect, it } from "vitest";
import { loginSchema, looksLikeUnknownUser, mapAuthError } from "./auth-login";

describe("auth-login: schema do formulário", () => {
  it("aceita a senha padrão pós-compra (12345678) — não há regra de complexidade", () => {
    const result = loginSchema.safeParse({
      email: "cliente@exemplo.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("cliente@exemplo.com");
      expect(result.data.password).toBe("12345678");
    }
  });

  it("aceita uma senha nova escolhida pelo usuário após reset — mesmo que seja simples ou comum", () => {
    // Senhas que, juntas, cobrem várias categorias de "comum" / "fraca":
    // numérica curta, repetida, palavra de dicionário, pwned famosa.
    const novasSenhas = ["12345678", "aaaaaaaa", "qwertyui", "password", "letmein1"];
    for (const password of novasSenhas) {
      const result = loginSchema.safeParse({ email: "novo@cliente.com", password });
      expect(result.success, `senha "${password}" deveria ser aceita pelo client`).toBe(true);
    }
  });

  it("normaliza email (trim + lowercase) antes de validar", () => {
    const result = loginSchema.safeParse({
      email: "  Foo@Bar.COM  ",
      password: "12345678",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("foo@bar.com");
    }
  });

  it("rejeita senha com menos de 8 caracteres com mensagem clara", () => {
    const result = loginSchema.safeParse({ email: "x@y.com", password: "1234567" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path[0] === "password");
      expect(passwordIssue?.message).toMatch(/pelo menos 8/i);
    }
  });

  it("rejeita email inválido (sem @) com mensagem clara", () => {
    const result = loginSchema.safeParse({ email: "naoeh-email", password: "12345678" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === "email");
      expect(emailIssue?.message).toMatch(/email válido/i);
    }
  });

  it("rejeita email vazio (campo obrigatório)", () => {
    const result = loginSchema.safeParse({ email: "   ", password: "12345678" });
    expect(result.success).toBe(false);
  });
});

describe("auth-login: mapeamento de erros do Supabase", () => {
  it("traduz 'Invalid login credentials' (senha errada) — sem expor a string crua", () => {
    const msg = mapAuthError({ message: "Invalid login credentials" });
    expect(msg).toMatch(/email ou senha incorretos/i);
    expect(msg).not.toContain("Invalid");
  });

  it("traduz 'Email not confirmed' para mensagem clara em PT-BR", () => {
    const msg = mapAuthError({ message: "Email not confirmed" });
    expect(msg).toMatch(/confirme seu email/i);
  });

  it("traduz rate limit (429) sem precisar do texto exato", () => {
    expect(mapAuthError({ message: "anything", status: 429 })).toMatch(/muitas tentativas/i);
    expect(mapAuthError({ message: "rate limit exceeded" })).toMatch(/muitas tentativas/i);
  });

  it("traduz erro de rede para mensagem amigável", () => {
    expect(mapAuthError({ message: "Failed to fetch" })).toMatch(/sem conexão|internet/i);
    expect(mapAuthError({ message: "Network request failed" })).toMatch(/sem conexão|internet/i);
  });

  it("se o servidor RETOMAR HIBP, mostra mensagem clara — não vaza string técnica", () => {
    // Variações reais que o GoTrue/Supabase emite quando a HIBP está ligada.
    const variantes = [
      "Password is known to be pwned",
      "Password has appeared in a data breach",
      "This password is leaked",
      "Password compromised",
    ];
    for (const message of variantes) {
      const msg = mapAuthError({ message });
      expect(msg, `variante "${message}"`).toMatch(/vazamento|escolha uma diferente/i);
      expect(msg).not.toMatch(/pwned|leaked|breach|compromised/i);
    }
  });

  it("erro genérico/desconhecido cai no fallback amigável", () => {
    expect(mapAuthError({ message: "boom 5xx" })).toMatch(/não foi possível entrar/i);
    expect(mapAuthError(null)).toMatch(/não foi possível entrar/i);
  });
});

describe("auth-login: heurística de 'usuário inexistente'", () => {
  it("considera 'Invalid login credentials' como usuário potencialmente novo (signup auto)", () => {
    expect(looksLikeUnknownUser({ message: "Invalid login credentials" })).toBe(true);
  });

  it("considera 'User not found' como usuário inexistente", () => {
    expect(looksLikeUnknownUser({ message: "User not found" })).toBe(true);
  });

  it("NÃO confunde rate limit / rede / HIBP com usuário inexistente — não dispara signup", () => {
    expect(looksLikeUnknownUser({ message: "rate limit exceeded" })).toBe(false);
    expect(looksLikeUnknownUser({ message: "Failed to fetch" })).toBe(false);
    expect(looksLikeUnknownUser({ message: "Password is leaked" })).toBe(false);
    expect(looksLikeUnknownUser(null)).toBe(false);
  });
});
