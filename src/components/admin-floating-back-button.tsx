import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeftToLine, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function AdminFloatingBackButton() {
  const loc = useLocation();
  const { t } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const isColoringPage = loc.pathname.startsWith("/colorir");

  useEffect(() => {
    let mounted = true;
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUserId(data.session?.user.id ?? null);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    syncSession();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setIsAdmin(false);
      return () => {
        mounted = false;
      };
    }
    const checkAdmin = async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .limit(1);
      if (mounted) setIsAdmin(!error && Boolean(data?.length));
    };
    checkAdmin();
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (!isAdmin || loc.pathname.startsWith("/admin") || loc.pathname === "/") return null;

  if (isColoringPage) {
    return (
      <aside
        aria-label="Modo admin ativo"
        className="fixed right-2 top-[calc(env(safe-area-inset-top)+3.35rem)] z-[70] flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/80 px-2 py-1 text-card-foreground shadow-soft backdrop-blur-xl sm:right-4 sm:top-14"
      >
        <ShieldCheck className="h-3 w-3 shrink-0 text-primary" strokeWidth={2.1} />
        <span className="font-display text-[10px] font-bold text-muted-foreground sm:text-[11px]">
          Admin
        </span>
        <Link
          to="/admin"
          aria-label={t("backToPanel")}
          className="inline-flex h-5 items-center justify-center rounded-full bg-primary/12 px-2 font-display text-[10px] font-extrabold text-primary ring-1 ring-primary/20 transition hover:bg-primary hover:text-primary-foreground sm:h-6 sm:text-[11px]"
        >
          Painel
        </Link>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Modo admin ativo na área do usuário"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[70] border-y border-primary/20 bg-card/92 px-3 py-1.5 text-card-foreground shadow-soft backdrop-blur-xl sm:top-16"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.1} />
          <span className="min-w-0 truncate font-display text-[11px] font-bold leading-tight sm:text-xs">
            Modo admin — visualizando área do usuário
          </span>
        </div>
        <Link
          to="/admin"
          aria-label={t("backToPanel")}
          className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary/12 px-2.5 font-display text-[11px] font-extrabold text-primary ring-1 ring-primary/25 transition hover:bg-primary hover:text-primary-foreground sm:px-3 sm:text-xs"
        >
          <ArrowLeftToLine className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>{t("backToPanel")}</span>
        </Link>
      </div>
    </aside>
  );
}
