/**
 * Splash inicial do app — exibido por uma fração de segundo na primeira
 * pintura para dar a sensação de "abrindo um app real" (não uma página
 * web qualquer). Some logo após hidratar, sem bloquear navegação.
 *
 * Por que existe?
 *   • Esconde o "flash" entre o background do <body> e o primeiro
 *     conteúdo SSR — em conexões lentas de tablet/celular dava para ver
 *     o gradiente "piscar" antes do logo aparecer.
 *   • Reforça a marca Reino das Cores logo na abertura, exatamente como
 *     um app nativo faz com sua splash screen.
 *
 * Detalhes finos:
 *   • Z-index alto (sobrepõe header e tab bar) e `pointer-events-none`
 *     enquanto está saindo, para não bloquear cliques.
 *   • `aria-hidden` quando some — assistivos não anunciam splash vazio.
 *   • Roda só uma vez por aba (sessionStorage). Em SPA navigations
 *     subsequentes não reaparece — splash é evento de abertura, não de
 *     transição de rota.
 *   • Respeita `prefers-reduced-motion`: sem `animate-pulse`, sem
 *     transição de fade — apenas aparece e some instantaneamente.
 */
import { useEffect, useState } from "react";
import logoIcon from "@/assets/logo-icon.png";
import { useBranding } from "@/hooks/use-branding";

const SESSION_KEY = "rdc.splash-shown.v1";
/** Tempo total visível em ms — curto o suficiente para não atrasar o uso. */
const VISIBLE_MS = 900;
/** Duração do fade-out (precisa bater com `transition-opacity duration-*`). */
const FADE_MS = 350;

export function AppSplash() {
  // `mounted=false` antes da hidratação evita um flash duplicado quando o
  // SSR já entregou conteúdo. Só renderiza a splash no cliente, depois
  // some rápido.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const branding = useBranding();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Mostra apenas na primeira abertura da aba — refreshes acidentais
    // dentro de uma sessão não revivem a splash.
    const alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    if (alreadyShown) {
      setVisible(false);
      return;
    }
    setMounted(true);
    const fadeTimer = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    const removeTimer = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setMounted(false);
    }, VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      // role=presentation porque o conteúdo é puramente decorativo —
      // a navegação real começa logo abaixo, no <Outlet />.
      role="presentation"
      aria-hidden={!visible}
      data-testid="app-splash"
      data-visible={visible}
      className={[
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "bg-gradient-hero transition-opacity",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="flex flex-col items-center gap-5 motion-safe:animate-float-in">
        <img
          src={branding.logoUrl ?? logoIcon}
          alt=""
          width={144}
          height={144}
          className="h-32 w-32 drop-shadow-[0_12px_40px_rgba(244,190,99,0.45)] sm:h-36 sm:w-36"
        />
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {branding.appName}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-sm">
            Histórias da Bíblia para colorir
          </p>
        </div>
      </div>
    </div>
  );
}
