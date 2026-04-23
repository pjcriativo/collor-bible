import { useEffect } from "react";
import {
  Outlet,
  createFileRoute,
  Link,
  useLocation,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import {
  BarChart3,
  Eye,
  Globe2,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  PlugZap,
  ScanSearch,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    if (typeof window === "undefined") return; // SSR — let client check
    const isAdmin = await getAdminAccess();
    if (!isAdmin) throw redirect({ to: "/admin/login" });
  },
  component: AdminLayout,
});

let adminAccessPromise: Promise<boolean> | null = null;

export function invalidateAdminAccess() {
  adminAccessPromise = null;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    adminAccessPromise = null;
  });
}

function getAdminAccess() {
  adminAccessPromise ??= (async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return false;
    const { data: roles, error } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    return !error && Boolean(roles?.length);
  })();
  return adminAccessPromise;
}

const NAV: Array<{
  to:
    | "/admin"
    | "/admin/usuarios"
    | "/admin/relatorios"
    | "/admin/branding"
    | "/admin/emails"
    | "/admin/qa-capas"
    | "/admin/idiomas"
    | "/admin/integracoes";
  labelKey:
    | "dashboard"
    | "users"
    | "reports"
    | "branding"
    | "emailTemplates"
    | "qaCovers"
    | "languages"
    | "webhooks";
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { to: "/admin", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", labelKey: "users", icon: Users },
  { to: "/admin/relatorios", labelKey: "reports", icon: BarChart3 },
  { to: "/admin/branding", labelKey: "branding", icon: ImageIcon },
  { to: "/admin/emails", labelKey: "emailTemplates", icon: Mail },
  { to: "/admin/qa-capas", labelKey: "qaCovers", icon: ScanSearch },
  { to: "/admin/idiomas", labelKey: "languages", icon: Globe2 },
  { to: "/admin/integracoes", labelKey: "webhooks", icon: PlugZap },
];

function AdminLayout() {
  const loc = useLocation();
  const router = useRouter();
  const { t } = useI18n();
  const branding = useBranding();
  useEffect(() => {
    NAV.forEach((item) => router.preloadRoute({ to: item.to }));
  }, [router]);
  if (loc.pathname === "/admin/login") {
    return <Outlet />;
  }
  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to && !loc.hash : loc.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <aside className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xl md:h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center gap-3 px-5 py-6">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.logoAlt}
                className="h-12 w-12 shrink-0 rounded-xl object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                {t("admin")}
              </p>
              <h2 className="mt-1 truncate font-display text-xl font-extrabold text-foreground">
                {branding.appName}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("adminPanel")}</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-4">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.to, n.exact);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-glow-gold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(n.labelKey)}
                </Link>
              );
            })}
            <Link
              to="/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Eye className="h-4 w-4" /> {t("viewAsUser")}
            </Link>
            <button
              type="button"
              onClick={async () => {
                adminAccessPromise = null;
                await supabase.auth.signOut();
                window.location.href = "/admin/login";
              }}
              className="mt-2 flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> {t("logout")}
            </button>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden bg-gradient-surface">
          <div className="mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
