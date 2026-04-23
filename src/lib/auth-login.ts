import { z } from "zod";

/**
 * Schema de validação do formulário de login.
 *
 * IMPORTANTE — NÃO BLOQUEAR SENHAS COMUNS NO CLIENT:
 *  - O único critério aqui é tamanho (8–72). NÃO existe regra de
 *    complexidade (maiúscula/símbolo) nem checagem contra dicionários
 *    no client. Isso garante que, após um RESET DE SENHA, o cliente
 *    consiga entrar com a nova senha mesmo que ela seja simples
 *    (ex.: "12345678"), sem o form rejeitar antes de chegar no servidor.
 *  - A política de senhas vazadas (HIBP) é decisão de servidor — ela é
 *    desativada para este projeto justamente para suportar a senha
 *    padrão pós-compra.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "Informe o email usado na compra" })
    .max(254, { message: "Email muito longo" })
    .email({ message: "Digite um email válido" }),
  password: z
    .string()
    .min(8, { message: "A senha precisa ter pelo menos 8 caracteres" })
    .max(72, { message: "A senha pode ter no máximo 72 caracteres" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Mapeia o erro do Supabase para uma mensagem amigável e em português.
 * Evita expor strings cruas de API ("Invalid login credentials") e cobre
 * os casos mais comuns que o usuário final pode encontrar.
 *
 * O caso `password.*pwned|leaked|compromised` existe como guarda-chuva:
 * se um dia o servidor reativar HIBP por engano, o usuário recebe uma
 * mensagem clara em português ao invés do texto cru da API.
 */
export function mapAuthError(
  error: { message?: string; status?: number } | null | undefined,
): string {
  const raw = (error?.message ?? "").toLowerCase();
  const status = error?.status;

  if (raw.includes("invalid login credentials") || raw.includes("invalid_grant")) {
    return "Email ou senha incorretos. Confira e tente novamente.";
  }
  if (raw.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar — verifique sua caixa de entrada.";
  }
  if (raw.includes("user not found")) {
    return "Não encontramos uma conta com esse email.";
  }
  if (raw.includes("rate") || status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente de novo.";
  }
  if (raw.includes("password") && raw.includes("short")) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (raw.includes("password") && /(pwned|leaked|compromised|breach)/.test(raw)) {
    return "Essa senha foi vista em vazamentos públicos. Escolha uma diferente.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
  }
  if (raw.includes("user already registered") || raw.includes("already registered")) {
    return "Esse email já tem cadastro. Confira a senha e tente entrar.";
  }
  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

/**
 * Heurística usada pelo formulário para decidir se um erro de login
 * indica usuário INEXISTENTE — única condição em que o fluxo cai no
 * `signUp` automático. Qualquer outro erro (senha errada, rate limit,
 * etc.) NÃO deve disparar signup, para não criar conta acidental.
 */
export function looksLikeUnknownUser(error: { message?: string } | null | undefined): boolean {
  const raw = (error?.message ?? "").toLowerCase();
  return /invalid login credentials|user not found/.test(raw);
}
