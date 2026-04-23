import { useCallback, useEffect, useState } from "react";

/**
 * BeforeInstallPromptEvent não é tipado no lib.dom.d.ts padrão. Define
 * apenas o que usamos: o `prompt()` que dispara o diálogo nativo do
 * Chrome/Edge/Android para "Adicionar à tela inicial", e o `userChoice`
 * com o resultado.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * Hook que captura o evento `beforeinstallprompt` (PWA) e expõe:
 *  - `canInstall`: true quando o navegador ofereceu a instalação nativa.
 *  - `isStandalone`: true quando o app já está rodando como PWA instalado.
 *  - `promptInstall()`: dispara o diálogo nativo do navegador. Resolve com
 *     `"accepted"` | `"dismissed"` | `"unavailable"` (sem evento disponível).
 *
 * Compatível com Chrome/Edge/Android. No iOS Safari não existe API nativa —
 * o consumidor deve usar o fallback (tutorial visual) quando `canInstall`
 * for `false`.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (typeof (navigator as { standalone?: boolean }).standalone === "boolean" &&
        (navigator as { standalone?: boolean }).standalone === true);
    setIsStandalone(Boolean(standalone));

    const onBeforeInstall = (e: Event) => {
      // Impede o mini-infobar do Chrome — controlamos o momento do prompt.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      // Após uso, o evento não pode ser reutilizado.
      setDeferredPrompt(null);
      return result.outcome;
    } catch {
      return "unavailable";
    }
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null,
    isStandalone,
    promptInstall,
  };
}
