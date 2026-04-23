import { useEffect, useState } from "react";

/**
 * Detecta se o teclado virtual está aberto no mobile usando a Visual Viewport
 * API. Quando o teclado abre, `window.visualViewport.height` fica
 * significativamente menor que `window.innerHeight` (a área visível encolhe
 * para acomodar o teclado).
 *
 * Threshold: 150px de diferença é o ponto seguro — barras de URL dinâmicas
 * (Safari/Chrome mobile) variam ~60-100px, então 150px garante que só
 * detectamos o teclado de verdade, sem falsos positivos.
 *
 * Retorna `false` em SSR e em desktops sem Visual Viewport API.
 */
export function useVirtualKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Diferença entre a viewport "layout" (innerHeight) e a viewport visível
      // (visualViewport.height). Teclados virtuais ocupam tipicamente 250-400px.
      const delta = window.innerHeight - vv.height;
      setOpen(delta > 150);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return open;
}
