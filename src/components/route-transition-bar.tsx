import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Barra de loading curta para transições entre rotas — sensação de app
 * nativo. Aparece no topo apenas quando uma navegação demora alguns frames
 * (carregando código, dados ou imagens). Para navegações instantâneas, não
 * pisca nada (gate em ~120ms). Respeita prefers-reduced-motion: substitui
 * o brilho/animação contínua por um indicador opaco e estático.
 *
 * Implementação:
 * - `useRouterState({ select: s => s.isLoading })` para reagir ao status do
 *   router sem re-renderizar em outras mudanças.
 * - Estados visuais: hidden -> visible (entra com fade) -> finishing (vai a
 *   100% e some). Isso garante uma "saída" suave em vez de cortar no meio.
 */
export function RouteTransitionBar() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Cancela qualquer "saída" em andamento e agenda a entrada.
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setFinishing(false);
      // Gate: só mostra se a navegação demorar mais que ~120ms — evita
      // flash em transições instantâneas.
      if (!showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          setVisible(true);
          showTimerRef.current = null;
        }, 120);
      }
    } else {
      // Cancela entrada agendada se a navegação terminou rápido.
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (visible) {
        // Anima a barra até 100% e depois oculta.
        setFinishing(true);
        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          setFinishing(false);
          hideTimerRef.current = null;
        }, 280);
      }
    }
  }, [isLoading, visible]);

  // Cleanup de timers ao desmontar.
  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="route-transition-bar pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden"
      data-state={finishing ? "finishing" : "loading"}
    >
      <div className="route-transition-bar__fill" />
    </div>
  );
}
