import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "ccj.pwa-install-banner.dismissed.v1";
const VISIT_COUNT_KEY = "ccj.pwa-install-banner.visits.v1";
const MIN_VISITS_BEFORE_SHOW = 3;

/**
 * Banner discreto e dispensável que aparece SÓ no mobile, em browser
 * (não em standalone), depois de algumas visitas, sugerindo instalar
 * o app na tela inicial.
 *
 * Por que isso importa: a UI nativa do navegador móvel (barra inferior
 * do Safari/Chrome com ícones de aba/menu) não pode ser removida em
 * modo browser. A única solução real para "cara de app" é o usuário
 * adicionar à tela inicial — o banner empurra suavemente nessa direção.
 *
 * Regras:
 *  - Só aparece em mobile (≤767px).
 *  - Não aparece se `isStandalone` (já está em modo app).
 *  - Não aparece em rotas onde o cascão padrão está oculto
 *    (`/colorir`, `/admin`, `/`, login, reset).
 *  - Não aparece nas primeiras visitas — espera o usuário "engajar"
 *    antes de pedir instalação (anti-fricção).
 *  - Pode ser dispensado; a escolha é persistida em localStorage.
 *  - No Android/Chrome dispara o `beforeinstallprompt` nativo;
 *    no iOS Safari mostra um toast com o passo-a-passo (sem API).
 */
export function PwaInstallBanner() {
  const loc = useLocation();
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Conta visitas (montagens da rota) e decide se exibe.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const path = loc.pathname;
    const isExcluded =
      path === "/" ||
      path.startsWith("/colorir") ||
      path.startsWith("/admin") ||
      path.startsWith("/reset-password");

    if (!isMobile || isStandalone || isExcluded) {
      setVisible(false);
      return;
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      /* storage indisponível — segue sem persistência */
    }
    if (dismissed) {
      setVisible(false);
      return;
    }

    let visits = 0;
    try {
      const raw = localStorage.getItem(VISIT_COUNT_KEY);
      visits = raw ? Number(raw) || 0 : 0;
      visits += 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(visits));
    } catch {
      visits = MIN_VISITS_BEFORE_SHOW; // sem storage, mostra desde o início
    }

    setVisible(visits >= MIN_VISITS_BEFORE_SHOW);
  }, [loc.pathname, isStandalone]);

  if (!visible) return null;

  const onInstall = async () => {
    if (installing) return;
    setInstalling(true);
    try {
      if (canInstall) {
        const outcome = await promptInstall();
        if (outcome === "accepted") {
          toast.success("App adicionado à tela inicial!");
          setVisible(false);
        }
      } else {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        if (isIOS) {
          toast.message("Como instalar no iPhone/iPad", {
            description:
              '1. Toque no ícone Compartilhar (quadrado com a seta para cima) na barra do Safari.\n2. Role para baixo e toque em "Adicionar à Tela de Início".\n3. Confirme em "Adicionar" no canto superior direito.',
            duration: 9000,
          });
        } else {
          toast.message("Adicionar à tela inicial", {
            description:
              'Abra o menu do navegador (⋮) e toque em "Adicionar à tela inicial" ou "Instalar app".',
            duration: 7000,
          });
        }
      }
    } finally {
      setInstalling(false);
    }
  };

  const onDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* sem persistência — apenas oculta nesta sessão */
    }
  };

  return (
    <div
      role="region"
      aria-label="Sugestão para instalar o app"
      className={cn(
        // Posicionado ACIMA da tab bar fixa (64px + safe-area).
        // Apenas mobile — escondido em desktop (md+).
        "fixed left-3 right-3 z-40 md:hidden",
        "bottom-[calc(64px+env(safe-area-inset-bottom)+10px)]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-primary/25 bg-popover/95 p-3 shadow-elevated backdrop-blur-xl",
          "ring-1 ring-inset ring-white/[0.06]",
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/25">
          <Smartphone className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold leading-tight text-foreground">
            Use como app
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Adicione à tela inicial e abra sem as barras do navegador.
          </p>
        </div>
        <button
          type="button"
          onClick={onInstall}
          disabled={installing}
          className="shrink-0 rounded-full bg-primary px-3 py-2 font-display text-xs font-extrabold text-primary-foreground shadow-glow-gold transition active:scale-95 disabled:opacity-60"
        >
          {installing ? "Abrindo..." : "Instalar"}
        </button>
        <button
          type="button"
          aria-label="Dispensar sugestão"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
