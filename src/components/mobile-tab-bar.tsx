import { Link, useLocation } from "@tanstack/react-router";
import { Heart, Home, Search, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useVirtualKeyboardOpen } from "@/hooks/use-virtual-keyboard";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Início", icon: Home },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function MobileTabBar() {
  const loc = useLocation();
  const { t } = useI18n();
  // Quando o teclado virtual abre (input focado em mobile), aplicamos uma
  // variante "compacta": altura menor, labels ocultos visualmente (mantidos
  // via aria/sr-only para acessibilidade), ícones levemente reduzidos e
  // ring do estado ativo enxuto. A safe-area continua aplicada via CSS,
  // garantindo que mesmo no modo compacto a home indicator não corte itens.
  const keyboardOpen = useVirtualKeyboardOpen();
  if (
    loc.pathname.startsWith("/colorir") ||
    loc.pathname.startsWith("/admin") ||
    loc.pathname === "/"
  ) {
    return null;
  }
  return (
    <nav
      aria-label="Navegação principal"
      // Toda a estabilidade vive em `.mobile-tab-bar` (styles.css):
      // altura travada (64px + safe-area), fundo sólido sem
      // backdrop-blur, camada de composição própria via translateZ.
      // Aqui só controlamos visibilidade no breakpoint mobile.
      // `is-compact` é a flag CSS que dispara a variante de teclado aberto.
      data-compact={keyboardOpen ? "true" : undefined}
      className={cn("mobile-tab-bar md:hidden", keyboardOpen && "mobile-tab-bar--compact")}
    >
      <ul className="mobile-tab-bar__list mx-auto flex max-w-xl items-stretch justify-around px-2">
        {items.map((it) => {
          const active = loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1 shrink-0">
              <Link
                to={it.to}
                className={cn(
                  // gap-[5px]: respiro extra de 1px entre pílula e label
                  // melhora a leitura sem aumentar a altura útil de 64px.
                  // px-2 (em vez de px-3) abre 8px laterais a mais — vital
                  // em iPhone SE 320px onde "FAVORITOS" precisa caber sem
                  // letter-spacing apertado.
                  "relative mx-auto flex h-full shrink-0 flex-col items-center justify-center gap-[5px] px-2 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground/85",
                )}
              >
                <span
                  // Pílula do ícone com DIMENSÕES FIXAS (h-7 w-12) e ring
                  // SEMPRE presente (transparente quando inativo) — assim
                  // o estado ativo não altera 1px de altura/largura nem
                  // empurra o label abaixo. Só muda cor.
                  className={cn(
                    // Sem labels: pílula maior (h-12 w-16) acomoda ícones
                    // de 28px com respiro generoso, mantendo target de
                    // toque WCAG e visual premium.
                    "flex h-12 w-16 items-center justify-center rounded-full ring-1 transition-colors duration-300",
                    active ? "bg-primary/12 ring-primary/25" : "bg-transparent ring-transparent",
                  )}
                >
                  <Icon
                    // 28×28px: ícones grandes "premium". Sem label, o
                    // glifo é o protagonista — peso 1.8 mantém clareza
                    // sem parecer pesado em densidade 2x/3x.
                    className="h-[28px] w-[28px]"
                    strokeWidth={1.8}
                  />
                </span>
                <span
                  // Labels removidos visualmente — só ícones, conforme
                  // pedido. Mantemos o texto via `sr-only` para que o
                  // leitor de tela continue anunciando o destino.
                  className="sr-only"
                >
                  {t(
                    it.to === "/home"
                      ? "home"
                      : it.to === "/buscar"
                        ? "search"
                        : it.to === "/favoritos"
                          ? "favorites"
                          : "profile",
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
