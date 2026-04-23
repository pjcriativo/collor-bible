import { useEffect } from "react";
import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AdminFloatingBackButton } from "@/components/admin-floating-back-button";
import { AppHeader } from "@/components/app-header";
import { AppSplash } from "@/components/app-splash";
import { PwaInstallBanner } from "@/components/pwa-install-banner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { RouteTransitionBar } from "@/components/route-transition-bar";
import { SingleSessionWarningDialog } from "@/components/single-session-warning-dialog";
import { Toaster } from "@/components/ui/sonner";
import { useSingleSession } from "@/hooks/use-single-session";
import { runColoringProgressRecalcJob } from "@/lib/coloring-progress-recalc";
import { BackendNotConfigured } from "@/components/backend-not-configured";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-cream px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 text-7xl">🧸</div>
        <h1 className="font-display text-4xl font-extrabold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Essa páginha se perdeu. Vamos voltar para o início?
        </p>
        <div className="mt-6">
          <Link
            to="/home"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-display text-base font-bold text-primary-foreground shadow-soft transition hover:scale-105"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Reino das Cores — Histórias da Bíblia para colorir" },
      {
        name: "description",
        content:
          "App infantil cristão para colorir histórias da Bíblia no celular e tablet. Experiência delicada, premium e segura para crianças.",
      },
      { name: "author", content: "Reino das Cores" },
      // Cor do "chrome" do browser/PWA — combina com o gradient-hero
      // do app, de modo que a splash do iOS/Android emende com o
      // background sem flash branco.
      { name: "theme-color", content: "#0E1726" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Reino das Cores" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Reino das Cores" },
      { property: "og:title", content: "Reino das Cores — Histórias da Bíblia para colorir" },
      {
        property: "og:description",
        content: "Histórias da Bíblia para colorir com amor, leveza e diversão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Reino das Cores — Histórias da Bíblia para colorir" },
      {
        name: "description",
        content: "Reino das Cores: um app infantil cristão para colorir histórias bíblicas.",
      },
      {
        property: "og:description",
        content: "Reino das Cores: um app infantil cristão para colorir histórias bíblicas.",
      },
      {
        name: "twitter:description",
        content: "Reino das Cores: um app infantil cristão para colorir histórias bíblicas.",
      },
      ...(import.meta.env.VITE_OG_IMAGE_URL
        ? [
            { property: "og:image", content: import.meta.env.VITE_OG_IMAGE_URL as string },
            { name: "twitter:image", content: import.meta.env.VITE_OG_IMAGE_URL as string },
          ]
        : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Favicon multi-tamanho — o `.ico` cobre browsers antigos; o
      // PNG 32px é usado por browsers modernos para nitidez em telas
      // de alta densidade. Apple touch icon = atalho na home do iOS.
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  if (!isSupabaseConfigured) {
    return <BackendNotConfigured />;
  }
  return <AppShell />;
}

function AppShell() {
  // Job de recálculo do progresso salvo: roda UMA vez por dispositivo
  // (gate em localStorage). Garante que páginas antigas, salvas antes
  // da regra global de regiões preenchíveis, exibam o percentual
  // correto e o estado de "completa" coerente em todas as telas.
  useEffect(() => {
    void runColoringProgressRecalcJob();
  }, []);
  // Garante apenas uma sessão ativa por usuário em todo o app.
  // O hook devolve o estado do aviso prévio (countdown) e ações para o
  // usuário escolher manter esta sessão ou sair imediatamente.
  const { warning, keepThisDevice, logoutNow } = useSingleSession();

  return (
    <div className="app-shell-root min-h-dvh bg-background pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
      <AppShellController />
      {/*
        Em mobile, este container vira o ÚNICO scroller real da aplicação
        (CSS em styles.css, ativado por html[data-app-shell="mobile"]).
        Em desktop, é apenas um wrapper transparente — o documento rola
        normalmente. Isso isola a rolagem do app do chrome do navegador
        móvel, reduzindo a interferência da UI nativa (address bar,
        bottom bar) durante a navegação.
      */}
      <div id="app-scroll">
        <AppHeader />
        <RouteTransitionBar />
        <Outlet />
        <AdminFloatingBackButton />
      </div>
      <MobileTabBar />
      <PwaInstallBanner />
      <Toaster position="top-center" richColors />
      {/* Diálogo de aviso prévio quando outro dispositivo entra na conta. */}
      <SingleSessionWarningDialog
        open={warning !== null}
        secondsLeft={warning?.secondsLeft ?? 0}
        otherDeviceLabel={warning?.otherDeviceLabel ?? null}
        onKeepThisDevice={() => void keepThisDevice()}
        onLogoutNow={logoutNow}
      />
      {/*
        Splash de abertura — fica POR CIMA de tudo via z-index alto, mas
        some em ~900ms, e roda só uma vez por sessão. Posicionada por
        último para garantir a sobreposição mesmo sem stacking context.
      */}
      <AppSplash />
    </div>
  );
}

/**
 * Liga/desliga o app shell mobile via atributo `data-app-shell` no
 * <html>. Ativo quando: viewport ≤ 767px E rota está no conjunto de
 * páginas com header/tab bar padrão (home, busca, favoritos, perfil,
 * categorias, história). Desligado em rotas que controlam o próprio
 * layout (`/colorir` é `fixed inset-0`, `/admin` tem sidebar sticky,
 * `/` é landing) — nelas, manter o comportamento atual.
 *
 * Em desktop, o atributo nunca é setado: documento rola normalmente.
 */
function AppShellController() {
  const loc = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const html = document.documentElement;
    const path = loc.pathname;
    const isExcluded =
      path === "/" ||
      path.startsWith("/colorir") ||
      path.startsWith("/admin") ||
      path.startsWith("/reset-password");
    const apply = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile && !isExcluded) {
        html.setAttribute("data-app-shell", "mobile");
      } else {
        html.removeAttribute("data-app-shell");
      }
    };
    apply();
    const mql = window.matchMedia("(max-width: 767px)");
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      // Não removemos o atributo aqui — a próxima rota recalcula. Isso
      // evita um "flash" de scroll do body durante a transição.
    };
  }, [loc.pathname]);
  return null;
}
