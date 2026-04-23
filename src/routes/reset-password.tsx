import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Eye, EyeOff, KeyRound, Lock, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { mapAuthError } from "@/lib/auth-login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Reino das Cores" },
      { name: "description", content: "Crie uma nova senha para acessar o Reino das Cores." },
    ],
  }),
  component: ResetPasswordPage,
});

// Avalia força da senha em 4 dimensões. Mantemos local pra não depender de
// libs pesadas — o objetivo é só dar feedback visual e listar requisitos.
type PasswordChecks = {
  length: boolean;
  letterAndNumber: boolean;
  hasUpper: boolean;
  hasSymbol: boolean;
};

function evaluatePassword(value: string): PasswordChecks {
  return {
    length: value.length >= 8,
    letterAndNumber: /[a-zA-Z]/.test(value) && /\d/.test(value),
    hasUpper: /[A-Z]/.test(value),
    hasSymbol: /[^a-zA-Z0-9]/.test(value),
  };
}

function strengthScore(checks: PasswordChecks): 0 | 1 | 2 | 3 | 4 {
  const passed = Object.values(checks).filter(Boolean).length;
  return passed as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABEL = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"] as const;
// Tokens semânticos do design system — sem cores hardcoded.
const STRENGTH_COLOR = [
  "bg-muted",
  "bg-destructive",
  "bg-destructive/70",
  "bg-primary/70",
  "bg-primary",
] as const;
const STRENGTH_TEXT = [
  "text-muted-foreground",
  "text-destructive",
  "text-destructive",
  "text-primary",
  "text-primary",
] as const;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado do guard: validando link, pronto para redefinir, ou link inválido/expirado.
  // - "checking": ainda esperando o Supabase confirmar a sessão de recovery.
  // - "ready": fluxo de recuperação válido — libera o form.
  // - "invalid": link ausente, malformado, expirado ou já consumido.
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;
    const markReady = () => {
      settled = true;
      setStatus("ready");
    };
    const markInvalid = (reason: string) => {
      if (settled) return;
      settled = true;
      setInvalidReason(reason);
      setStatus("invalid");
    };

    // 1) O Supabase entrega o token de recovery na hash da URL e dispara
    //    `PASSWORD_RECOVERY` no listener — esse é o sinal canônico de fluxo válido.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady();
      }
    });

    // 2) Inspeciona a URL: se o Supabase devolveu erro no hash/query
    //    (ex.: `error=access_denied&error_code=otp_expired`), já marca como inválido.
    if (typeof window !== "undefined") {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);
      const errorCode =
        hashParams.get("error_code") ||
        hashParams.get("error") ||
        queryParams.get("error_code") ||
        queryParams.get("error");
      const errorDesc = hashParams.get("error_description") || queryParams.get("error_description");
      if (errorCode) {
        const isExpired = /expired|otp_expired|invalid/i.test(`${errorCode} ${errorDesc ?? ""}`);
        markInvalid(
          isExpired
            ? "Seu link de recuperação expirou ou já foi usado. Peça um novo link na tela de login."
            : (errorDesc ?? "Não foi possível validar este link de recuperação."),
        );
        return () => {
          sub.subscription.unsubscribe();
        };
      }

      // 3) Sem erro explícito: precisa haver indício de fluxo de recovery
      //    (token na hash com `type=recovery`, ou `code` no query do PKCE).
      const hasRecoveryHash =
        hashParams.get("type") === "recovery" ||
        hashParams.has("access_token") ||
        hashParams.has("refresh_token");
      const hasPkceCode = queryParams.has("code");
      if (!hasRecoveryHash && !hasPkceCode) {
        // Pode ser um reload pós-login: aceita se já houver sessão ativa.
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) markReady();
          else
            markInvalid(
              "Este link de recuperação não é válido. Solicite um novo na tela de login.",
            );
        });
        return () => {
          sub.subscription.unsubscribe();
        };
      }
    }

    // 4) Caso o usuário recarregue após já ter sessão, libera direto.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    // 5) Timeout de segurança: se nada confirmar o fluxo em 8s, marca como inválido
    //    para não deixar o usuário preso na tela de "Validando...".
    const timeout = window.setTimeout(() => {
      markInvalid(
        "Não conseguimos validar seu link de recuperação. Ele pode ter expirado — peça um novo na tela de login.",
      );
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const checks = useMemo(() => evaluatePassword(password), [password]);
  const score = strengthScore(checks);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const confirmMismatch = touchedConfirm && confirm.length > 0 && password !== confirm;
  const canSubmit = checks.length && passwordsMatch && !loading;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (status !== "ready") return;
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setError(null);
    setLoading(true);
    const toastId = toast.loading("Atualizando senha...");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const message = mapAuthError(updateError);
        toast.error(message, { id: toastId });
        // Sessão de recovery pode ter expirado entre o load e o submit —
        // nesse caso bloqueia o form e mostra a tela de expiração.
        if (/session|expired|invalid|jwt/i.test(updateError.message ?? "")) {
          setStatus("invalid");
          setInvalidReason(
            "Sua sessão de recuperação expirou. Peça um novo link na tela de login.",
          );
        } else {
          setError(message);
        }
        return;
      }
      toast.success("Senha atualizada! Bem-vindo de volta.", { id: toastId });
      navigate({ to: "/home" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(mapAuthError({ message }), { id: toastId });
      setError(mapAuthError({ message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-gradient-hero px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col items-center justify-center text-center">
        <img
          src={logo}
          alt="Reino das Cores"
          width={160}
          height={160}
          className="h-20 w-20 drop-shadow-[0_8px_30px_rgba(244,190,99,0.35)] sm:h-32 sm:w-32"
        />
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary ring-1 ring-white/8 backdrop-blur sm:mt-6">
          <Sparkles className="h-3 w-3" /> Nova senha
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:mt-6 sm:text-4xl">
          Redefinir <span className="text-primary">sua senha</span>
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground sm:mt-3 sm:text-base">
          Crie uma nova senha de pelo menos 8 caracteres para continuar.
        </p>

        {status === "checking" ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 w-full rounded-2xl bg-surface/80 p-5 text-sm text-muted-foreground ring-1 ring-inset ring-white/10 sm:mt-8"
          >
            Validando seu link de recuperação...
          </div>
        ) : status === "invalid" ? (
          <div
            role="alert"
            className="mt-6 w-full rounded-2xl bg-surface/85 p-5 text-left ring-1 ring-inset ring-destructive/40 sm:mt-8 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-extrabold text-foreground">
                  Link expirado ou inválido
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invalidReason ??
                    "Seu link de recuperação não é mais válido. Peça um novo link para continuar."}
                </p>
                <Link
                  to="/"
                  className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] active:scale-95"
                >
                  <KeyRound className="mr-2 h-4 w-4" /> Pedir novo link
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 w-full space-y-4 text-left sm:mt-8">
            {/* Nova senha */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-bold text-foreground">
                Nova senha
              </label>
              <div
                className={`mt-2 flex items-center gap-2 rounded-2xl bg-surface/85 px-3 py-1 ring-1 focus-within:ring-primary/70 sm:gap-3 sm:px-4 ${
                  error ? "ring-destructive/60" : "ring-white/[0.08]"
                }`}
              >
                <Lock className="h-5 w-5 flex-shrink-0 text-primary" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="new-password"
                  inputMode="text"
                  enterKeyHint="next"
                  minLength={8}
                  maxLength={72}
                  required
                  aria-describedby="password-strength password-requirements"
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:text-foreground active:scale-95"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Indicador de força */}
              {password.length > 0 && (
                <div id="password-strength" className="mt-3" aria-live="polite">
                  <div
                    className="flex gap-1.5"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-valuenow={score}
                  >
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          step <= score ? STRENGTH_COLOR[score] : "bg-white/[0.06]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-semibold ${STRENGTH_TEXT[score]}`}>
                    Força: {STRENGTH_LABEL[score]}
                  </p>
                </div>
              )}

              {/* Lista de requisitos — feedback inline */}
              <ul
                id="password-requirements"
                className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2"
              >
                <RequirementItem ok={checks.length} label="Pelo menos 8 caracteres" />
                <RequirementItem ok={checks.letterAndNumber} label="Letras e números" />
                <RequirementItem ok={checks.hasUpper} label="Uma letra maiúscula" />
                <RequirementItem ok={checks.hasSymbol} label="Um símbolo (recomendado)" />
              </ul>
            </div>

            {/* Confirmar senha */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-bold text-foreground">
                Confirmar senha
              </label>
              <div
                className={`mt-2 flex items-center gap-2 rounded-2xl bg-surface/85 px-3 py-1 ring-1 focus-within:ring-primary/70 sm:gap-3 sm:px-4 ${
                  confirmMismatch
                    ? "ring-destructive/60"
                    : passwordsMatch
                      ? "ring-primary/40"
                      : "ring-white/[0.08]"
                }`}
              >
                <KeyRound className="h-5 w-5 flex-shrink-0 text-primary" />
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setTouchedConfirm(true)}
                  autoComplete="new-password"
                  inputMode="text"
                  enterKeyHint="done"
                  minLength={8}
                  maxLength={72}
                  required
                  aria-invalid={confirmMismatch || undefined}
                  aria-describedby={confirmMismatch ? "confirm-error" : undefined}
                  className="min-w-0 flex-1 bg-transparent py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                {passwordsMatch && (
                  <span
                    aria-hidden
                    className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                  >
                    <Check className="h-4 w-4" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showConfirm}
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:text-foreground active:scale-95"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmMismatch && (
                <p id="confirm-error" className="mt-1.5 text-xs font-semibold text-destructive">
                  As senhas não coincidem.
                </p>
              )}
              {error && !confirmMismatch && (
                <p className="mt-1.5 text-xs font-semibold text-destructive">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={loading}
              className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-primary px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
            >
              {loading ? "Atualizando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function RequirementItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-primary" : "text-muted-foreground"}`}>
      <span
        aria-hidden
        className={`inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-primary/20" : "bg-white/[0.06]"
        }`}
      >
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-60" />}
      </span>
      <span>{label}</span>
    </li>
  );
}
