import { useEffect, useState } from "react";
import { subscribe } from "@/lib/store";

/**
 * Hook que faz um seletor reativo no mock store.
 * Re-executa o seletor sempre que o store emite mudança.
 */
export function useStore<T>(selector: () => T): T {
  const [value, setValue] = useState<T>(() => selector());
  useEffect(() => {
    setValue(selector());
    const unsub = subscribe(() => setValue(selector()));
    const syncLanguage = () => setValue(selector());
    window.addEventListener("ccj-language-changed", syncLanguage);
    return () => {
      unsub();
      window.removeEventListener("ccj-language-changed", syncLanguage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
