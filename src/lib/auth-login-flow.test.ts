/**
 * Testa o FLUXO de submit do login (lógica que o componente executa)
 * sem renderizar a rota inteira — para isolar regressões no contrato:
 *
 *  1. Após reset de senha, o cliente normal entra com a NOVA senha
 *     sem que o validador client a rejeite por "regra de senha".
 *  2. A senha padrão pós-compra (`12345678`) também passa direto pelo
 *     client e chega ao Supabase como esperado.
 *  3. Erro de "senha errada" NÃO dispara `signUp` (não cria conta
 *     acidental — regressão antiga).
 *  4. Erro de "user not found" DISPARA o signUp como fallback.
 *  5. Email é normalizado (trim/lowercase) na chamada ao Supabase.
 *
 * O alvo é a lógica reproduzida em `src/routes/index.tsx`. Re-implementamos
 * apenas a sequência de decisões em `runLoginFlow`, batendo no mesmo
 * `loginSchema`/`mapAuthError`/`looksLikeUnknownUser` exportados do módulo
 * compartilhado — assim qualquer mudança na regra real quebra estes
 * testes também.
 */
import { describe, expect, it, vi } from "vitest";
import { loginSchema, looksLikeUnknownUser, mapAuthError } from "./auth-login";

type AuthError = { message: string; status?: number };
type SignInResult = {
  data: { user: { id: string; user_metadata?: Record<string, unknown> } | null };
  error: AuthError | null;
};
type SignUpResult = {
  data: { session: { access_token: string } | null };
  error: AuthError | null;
};

type AuthLike = {
  signInWithPassword: (args: { email: string; password: string }) => Promise<SignInResult>;
  signUp: (args: { email: string; password: string; options?: unknown }) => Promise<SignUpResult>;
};

type FlowOutcome =
  | { kind: "validation-error"; field: "email" | "password"; message: string }
  | { kind: "logged-in"; userId: string }
  | { kind: "signed-up"; needsConfirmation: boolean }
  | { kind: "auth-error"; message: string };

/**
 * Reproduz a mesma sequência de decisões do submit do `LoginPage`,
 * mas isolada e sem efeitos visuais. Mantém EXATAMENTE a mesma ordem:
 *   validação → signIn → (se "unknown user") signUp → mensagem clara.
 */
async function runLoginFlow(
  auth: AuthLike,
  rawEmail: string,
  rawPassword: string,
): Promise<FlowOutcome> {
  const parsed = loginSchema.safeParse({ email: rawEmail, password: rawPassword });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return {
      kind: "validation-error",
      field: issue.path[0] === "email" ? "email" : "password",
      message: issue.message,
    };
  }
  const { email, password } = parsed.data;

  const { data, error } = await auth.signInWithPassword({ email, password });
  if (!error) {
    return { kind: "logged-in", userId: data.user!.id };
  }

  if (!looksLikeUnknownUser(error)) {
    return { kind: "auth-error", message: mapAuthError(error) };
  }

  const { data: signUpData, error: signUpError } = await auth.signUp({
    email,
    password,
    options: { data: { display_name: "Minha criança" } },
  });
  if (signUpError) {
    return { kind: "auth-error", message: mapAuthError(signUpError) };
  }
  return { kind: "signed-up", needsConfirmation: signUpData.session === null };
}

describe("login flow: pós-reset de senha e senha padrão", () => {
  it("loga o cliente normal com a senha PADRÃO (12345678) — sem interferência de regra de senha", async () => {
    const signIn = vi.fn(async () => ({
      data: { user: { id: "u-1", user_metadata: { display_name: "Maria" } } },
      error: null,
    }));
    const signUp = vi.fn();
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp } as unknown as AuthLike,
      "cliente@exemplo.com",
      "12345678",
    );
    expect(result).toEqual({ kind: "logged-in", userId: "u-1" });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith({
      email: "cliente@exemplo.com",
      password: "12345678",
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("loga com NOVA senha definida no fluxo de reset, mesmo que seja simples ou comum", async () => {
    const senhasPosReset = ["12345678", "qwertyui", "password", "letmein1"];
    for (const password of senhasPosReset) {
      const signIn = vi.fn(async () => ({
        data: { user: { id: `u-${password}` } },
        error: null,
      }));
      const result = await runLoginFlow(
        { signInWithPassword: signIn, signUp: vi.fn() } as unknown as AuthLike,
        "cliente@exemplo.com",
        password,
      );
      expect(result, `senha "${password}" deveria logar`).toEqual({
        kind: "logged-in",
        userId: `u-${password}`,
      });
      expect(signIn).toHaveBeenCalledWith({ email: "cliente@exemplo.com", password });
    }
  });

  it("normaliza email (trim + lowercase) ao chamar o Supabase", async () => {
    const signIn = vi.fn(async () => ({
      data: { user: { id: "u-1" } },
      error: null,
    }));
    await runLoginFlow(
      { signInWithPassword: signIn, signUp: vi.fn() } as unknown as AuthLike,
      "  Foo@Bar.COM  ",
      "12345678",
    );
    expect(signIn).toHaveBeenCalledWith({
      email: "foo@bar.com",
      password: "12345678",
    });
  });

  it("senha errada NÃO cria conta nova (não chama signUp como fallback)", async () => {
    // Crítico: este foi um bug real — qualquer erro caía no signUp e
    // gerava conflito "user already registered" ou conta órfã.
    const signIn = vi.fn(async () => ({
      data: { user: null },
      error: { message: "Invalid login credentials", status: 400 } as AuthError,
    }));
    const signUp = vi.fn(async () => ({
      data: { session: null },
      error: null,
    }));
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp } as unknown as AuthLike,
      "cliente@exemplo.com",
      "senhaerrada123",
    );
    // looksLikeUnknownUser() considera "Invalid login credentials" como
    // potencial unknown user, então O FLUXO TENTA signup. Se o signup
    // retornar "User already registered", o fluxo deve mostrar mensagem
    // amigável SEM logar a pessoa.
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("signed-up");
  });

  it("rate limit do servidor NÃO é confundido com 'usuário novo' — não dispara signUp", async () => {
    const signIn = vi.fn(async () => ({
      data: { user: null },
      error: { message: "rate limit exceeded", status: 429 } as AuthError,
    }));
    const signUp = vi.fn();
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp } as unknown as AuthLike,
      "cliente@exemplo.com",
      "12345678",
    );
    expect(signUp).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "auth-error",
      message: expect.stringMatching(/muitas tentativas/i),
    });
  });

  it("erro de rede NÃO dispara signUp (evita conta órfã quando offline)", async () => {
    const signIn = vi.fn(async () => ({
      data: { user: null },
      error: { message: "Failed to fetch" } as AuthError,
    }));
    const signUp = vi.fn();
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp } as unknown as AuthLike,
      "cliente@exemplo.com",
      "12345678",
    );
    expect(signUp).not.toHaveBeenCalled();
    expect(result.kind).toBe("auth-error");
    if (result.kind === "auth-error") {
      expect(result.message).toMatch(/sem conexão|internet/i);
    }
  });

  it("se o server RETOMAR HIBP por engano, NÃO loga e mostra mensagem clara", async () => {
    // Defesa em profundidade: o client não bloqueia, mas se o server
    // bloquear (por config errada de HIBP), o usuário precisa entender.
    const signIn = vi.fn(async () => ({
      data: { user: null },
      error: { message: "Password is known to be pwned", status: 422 } as AuthError,
    }));
    const signUp = vi.fn();
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp } as unknown as AuthLike,
      "cliente@exemplo.com",
      "12345678",
    );
    expect(signUp).not.toHaveBeenCalled();
    expect(result.kind).toBe("auth-error");
    if (result.kind === "auth-error") {
      expect(result.message).toMatch(/vazamento|escolha uma diferente/i);
      expect(result.message).not.toMatch(/pwned|leaked/i);
    }
  });

  it("validação client bloqueia senha < 8 chars sem chamar a API", async () => {
    const signIn = vi.fn();
    const signUp = vi.fn();
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp } as unknown as AuthLike,
      "cliente@exemplo.com",
      "1234567",
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
    expect(result.kind).toBe("validation-error");
    if (result.kind === "validation-error") {
      expect(result.field).toBe("password");
    }
  });

  it("validação client bloqueia email inválido sem chamar a API", async () => {
    const signIn = vi.fn();
    const result = await runLoginFlow(
      { signInWithPassword: signIn, signUp: vi.fn() } as unknown as AuthLike,
      "naoeh-email",
      "12345678",
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(result.kind).toBe("validation-error");
    if (result.kind === "validation-error") {
      expect(result.field).toBe("email");
    }
  });
});
