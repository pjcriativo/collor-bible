import { useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAdminAccess } from "./admin";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (error || !data.user) {
      setLoading(false);
      toast.error("Email ou senha incorretos");
      return;
    }

    const { data: roles, error: roleError } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");

    if (roleError || !roles?.length) {
      setLoading(false);
      await supabase.auth.signOut();
      toast.error("Esse usuário não tem acesso ao painel admin");
      return;
    }

    invalidateAdminAccess();
    await router.invalidate();
    setLoading(false);
    toast.success("Bem-vindo, admin!");
    navigate({ to: "/admin" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-cream px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-hero">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-center font-display text-2xl font-extrabold">Painel Admin</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Entre para gerenciar o catálogo
        </p>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <span className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
            <Mail className="h-4 w-4 text-primary" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base outline-none"
              autoComplete="email"
              required
            />
          </span>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Senha
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-full bg-primary py-3 font-display text-base font-bold text-primary-foreground shadow-soft hover:scale-[1.02]"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
