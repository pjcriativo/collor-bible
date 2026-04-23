import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Detecta `prefers-reduced-motion: reduce` e mantém o valor sincronizado
 * com mudanças do sistema/SO. SSR-safe: começa em `false` e atualiza no
 * primeiro efeito do cliente.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Sonner
      className="toaster group"
      // Em "reduce", encurtamos a duração padrão para que o toast não fique
      // estático na tela por muito tempo (sem animação ele dá menos pista
      // visual de que está saindo). Animações de entrada/saída são
      // anuladas via CSS em src/styles.css.
      duration={reducedMotion ? 1800 : (props.duration ?? 4000)}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
