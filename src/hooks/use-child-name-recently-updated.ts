import { useEffect, useRef, useState } from "react";
import { debugLog } from "@/lib/debug-log";

/**
 * Sinaliza que o "Nome da criança" acabou de ser atualizado em algum lugar
 * do app (mesma aba via `CustomEvent`, ou outra aba via `storage`), para que
 * componentes — como os modais da página de pintura — possam exibir um
 * badge temporário "atualizado agora".
 *
 * Por que é um hook separado de `useChildName`:
 *   - `useChildName` já entrega o NOME atual; quem precisa do nome usa ele.
 *   - este hook entrega APENAS o sinal "mudou recentemente", sem forçar
 *     re-render quando outras partes do nome mudam (ex.: re-leitura inicial
 *     do DB no mount). Mantém os modais isolados de ruído.
 *
 * Contrato:
 *   - retorna `true` durante `durationMs` após cada atualização real;
 *   - NÃO dispara no carregamento inicial (não há "atualização" — só leitura);
 *   - cada nova atualização reinicia o timer (o badge fica visível pelo
 *     tempo certo se o pai mexer várias vezes seguidas).
 */
const UPDATE_EVENT = "ccj-child-name-updated";
const LOCAL_CACHE_KEY = "ccj.child-name.cache.v1";

export function useChildNameRecentlyUpdated(durationMs: number = 3500): boolean {
  const [recent, setRecent] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const flash = () => {
      setRecent(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setRecent(false);
        timerRef.current = null;
      }, durationMs);
    };

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      debugLog("child-name-flash", "custom-event", { detail });
      flash();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_CACHE_KEY) return;
      debugLog("child-name-flash", "storage", { newValue: event.newValue });
      flash();
    };

    window.addEventListener(UPDATE_EVENT, onUpdate as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(UPDATE_EVENT, onUpdate as EventListener);
      window.removeEventListener("storage", onStorage);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [durationMs]);

  return recent;
}
