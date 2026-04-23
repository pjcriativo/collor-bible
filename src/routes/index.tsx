import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, KeyRound, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { SINGLE_SESSION_KICK_KEY } from "@/hooks/use-single-session";
import { loginSchema, looksLikeUnknownUser, mapAuthError } from "@/lib/auth-login";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reino das Cores — Histórias da Bíblia para colorir" },
      {
        name: "description",
        content: "Histórias da Bíblia para colorir com amor, leveza e diversão.",
      },
    ],
  }),
  component: LoginPage,
});

const DEFAULT_PASSWORD = "12345678";

type FieldErrors = Partial<{ email: string; password: string }>;

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  // Banner mostrado quando a sessão atual foi encerrada porque a conta
  // foi acessada em outro dispositivo (sinalizado por `useSingleSession`).
  const [sessionKicked, setSessionKicked] = useState(false);

  // Lê e CONSOME o flag de "kick" assim que a tela monta. Usar `sessionStorage`
  // garante que o aviso aparece só na aba que foi deslogada e some no F5.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = window.sessionStorage.getItem(SINGLE_SESSION_KICK_KEY);
      if (flag) {
        setSessionKicked(true);
        window.sessionStorage.removeItem(SINGLE_SESSION_KICK_KEY);
      }
    } catch {
      // ignore — sessionStorage pode estar bloqueada (modo privado)
    }
  }, []);

  // Abre o diálogo de recuperação pré-preenchendo com o email já digitado
  // no formulário de login (quando válido), para reduzir digitação.
  const openRecover = () => {
    setRecoverError(null);
    const trimmed = email.trim().toLowerCase();
    setRecoverEmail(trimmed);
    setRecoverOpen(true);
  };

  const submitRecover = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recoverLoading) return;
    const normalized = recoverEmail.trim().toLowerCase();
    // Validação leve usando o mesmo schema (apenas o campo email).
    const parsed = loginSchema.shape.email.safeParse(normalized);
    if (!parsed.success) {
      setRecoverError("Digite um email válido.");
      return;
    }
    setRecoverError(null);
    setRecoverLoading(true);
    const toastId = toast.loading("Enviando email de recuperação...");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(mapAuthError(error), { id: toastId });
        setRecoverError(mapAuthError(error));
        return;
      }
      toast.success("Se o email existir, enviaremos um link em instantes.", { id: toastId });
      setRecoverOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(mapAuthError({ message }), { id: toastId });
      setRecoverError(mapAuthError({ message }));
    } finally {
      setRecoverLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    // Validação client-side com Zod — mensagens são exibidas inline ABAIXO
    // do campo correspondente, não apenas como toast (mais acessível).
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" && !next.email) next.email = issue.message;
        else if (field === "password" && !next.password) next.password = issue.message;
      }
      setErrors(next);
      // Foca o primeiro campo com erro para acessibilidade via teclado.
      const firstInvalid = next.email ? "email" : "password";
      const node = document.getElementById(firstInvalid) as HTMLInputElement | null;
      node?.focus();
      return;
    }
    setErrors({});
    const { email: purchaseEmail, password: cleanPassword } = parsed.data;

    setLoading(true);
    const loadingId = toast.loading("Entrando...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: purchaseEmail,
        password: cleanPassword,
      });

      if (error) {
        // Tenta criar a conta APENAS quando o erro indica usuário inexistente
        // — isso evita signup acidental quando o usuário só errou a senha.
        if (!looksLikeUnknownUser(error)) {
          toast.error(mapAuthError(error), { id: loadingId });
          setErrors({ password: "Confira a senha e tente novamente." });
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: purchaseEmail,
          password: cleanPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: "Minha criança" },
          },
        });

        if (signUpError) {
          toast.error(mapAuthError(signUpError), { id: loadingId });
          return;
        }
        if (!signUpData.session) {
          toast.success("Acesso criado. Confirme o email para entrar.", { id: loadingId });
          return;
        }
        toast.success("Bem-vindo ao Reino das Cores!", { id: loadingId });
        navigate({ to: "/home" });
        return;
      }

      if (data.user) {
        // Não bloqueia o login se o upsert falhar — o trigger
        // `handle_new_user_profile` já cria o profile básico no signup,
        // este upsert é apenas best-effort para sincronizar o email da compra.
        await supabase
          .from("profiles")
          .upsert({
            user_id: data.user.id,
            purchase_email: purchaseEmail,
            display_name:
              (data.user.user_metadata?.display_name as string | undefined) ?? "Minha criança",
          })
          .then(({ error: upsertError }) => {
            if (upsertError && import.meta.env.DEV) {
              console.warn("[login] profile upsert failed", upsertError);
            }
          });
      }

      toast.success("Bem-vindo de volta!", { id: loadingId });
      navigate({ to: "/home" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(mapAuthError({ message }), { id: loadingId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-hero px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center text-center">
        <form onSubmit={submit} className="w-full">
          <div className="animate-float-in">
            <img
              src={logo}
              alt="Reino das Cores"
              width={200}
              height={200}
              className="mx-auto h-32 w-32 drop-shadow-[0_8px_30px_rgba(244,190,99,0.35)] sm:h-40 sm:w-40"
            />
          </div>

          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary ring-1 ring-white/8 backdrop-blur">
            <Sparkles className="h-3 w-3" /> Acesso da compra
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Entrar no <span className="text-primary">Reino das Cores</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base text-muted-foreground sm:text-lg">
            Use o email informado na compra para liberar as histórias bíblicas para colorir.
          </p>

          {/* Banner: sessão deslogada por outro dispositivo. Aparece só
              na aba que efetivamente foi expulsa (sessionStorage). */}
          {sessionKicked && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-6 flex items-start gap-3 rounded-2xl bg-destructive/12 p-4 text-left ring-1 ring-inset ring-destructive/40 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-foreground">
                  Sua sessão foi encerrada
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Sua conta foi acessada em outro dispositivo. Por segurança, só uma sessão pode
                  ficar ativa por vez. Faça login novamente para continuar de onde parou.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3 text-left">
            <label className="block text-sm font-bold text-foreground">
              Email da compra
              <span
                className={`mt-2 flex items-center gap-3 rounded-2xl bg-surface/85 px-4 py-3 ring-1 focus-within:ring-primary/70 ${
                  errors.email ? "ring-destructive/60" : "ring-white/[0.08]"
                }`}
              >
                <Mail className="h-5 w-5 text-primary" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  onBlur={() => setEmail((value) => value.trim())}
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  maxLength={254}
                  required
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
              {errors.email && (
                <span
                  id="email-error"
                  className="mt-1.5 block text-xs font-semibold text-destructive"
                >
                  {errors.email}
                </span>
              )}
            </label>
            <label className="block text-sm font-bold text-foreground">
              Senha
              <span
                className={`mt-2 flex items-center gap-3 rounded-2xl bg-surface/85 px-4 py-3 ring-1 focus-within:ring-primary/70 ${
                  errors.password ? "ring-destructive/60" : "ring-white/[0.08]"
                }`}
              >
                <Lock className="h-5 w-5 text-primary" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  autoComplete="current-password"
                  minLength={8}
                  maxLength={72}
                  required
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
              {errors.password && (
                <span
                  id="password-error"
                  className="mt-1.5 block text-xs font-semibold text-destructive"
                >
                  {errors.password}
                </span>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 active:scale-95"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={openRecover}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <KeyRound className="h-4 w-4" /> Esqueci minha senha
          </button>
        </form>
      </div>

      <Dialog open={recoverOpen} onOpenChange={setRecoverOpen}>
        <DialogContent className="max-w-md rounded-2xl border-white/10 bg-surface">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold tracking-tight">
              Recuperar senha
            </DialogTitle>
            <DialogDescription>
              Informe o email da compra. Enviaremos um link para você criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRecover} className="mt-2 space-y-3 text-left">
            <label className="block text-sm font-bold text-foreground">
              Email
              <span
                className={`mt-2 flex items-center gap-3 rounded-2xl bg-background/60 px-4 py-3 ring-1 focus-within:ring-primary/70 ${
                  recoverError ? "ring-destructive/60" : "ring-white/[0.08]"
                }`}
              >
                <Mail className="h-5 w-5 text-primary" />
                <input
                  id="recover-email"
                  type="email"
                  inputMode="email"
                  value={recoverEmail}
                  onChange={(event) => {
                    setRecoverEmail(event.target.value);
                    if (recoverError) setRecoverError(null);
                  }}
                  onBlur={() => setRecoverEmail((value) => value.trim())}
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  maxLength={254}
                  required
                  aria-invalid={recoverError ? true : undefined}
                  aria-describedby={recoverError ? "recover-email-error" : undefined}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
              </span>
              {recoverError && (
                <span
                  id="recover-email-error"
                  className="mt-1.5 block text-xs font-semibold text-destructive"
                >
                  {recoverError}
                </span>
              )}
            </label>
            <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRecoverOpen(false)}
                disabled={recoverLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={recoverLoading} aria-busy={recoverLoading}>
                {recoverLoading ? "Enviando..." : "Enviar link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
