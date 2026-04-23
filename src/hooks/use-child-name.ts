import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug-log";

/**
 * Estado global do "Nome da criança".
 *
 * Por que existe:
 *   O PRD pede que o nome apareça em vários lugares (modal de conclusão,
 *   saudação do perfil, mensagens de gamificação) e atualize "em tempo
 *   real após salvar, sem necessidade de logout/login". Este hook é a
 *   FONTE ÚNICA de verdade no cliente — qualquer componente que precise
 *   do nome usa `useChildName()` e recebe atualizações imediatas via
 *   `window` event quando outro lugar do app salva.
 *
 * Persistência:
 *   - Banco: `profiles.child_name` (RLS já restringe ao próprio usuário).
 *   - Cache local em `localStorage` somente para evitar "flash" de
 *     "Olá, amiguinho" no carregamento; a verdade canônica é o DB.
 *
 * Sanitização:
 *   - `trim` no início/fim e colapso de espaços internos.
 *   - Capitalização amigável ("davi  da silva" -> "Davi Da Silva").
 *   - Limite de 60 chars no DB (CHECK constraint), aplicação corta antes.
 */

const LOCAL_CACHE_KEY = "ccj.child-name.cache.v1";
const UPDATE_EVENT = "ccj-child-name-updated";

/** Limpa espaços, normaliza e capitaliza palavras. Mantém apóstrofo/hífen. */
export function sanitizeChildName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed
    .split(" ")
    .map((word) => {
      if (!word) return word;
      // Preserva conectores comuns minúsculos no meio do nome ("da", "de", "do").
      const lower = word.toLowerCase();
      if (["da", "de", "do", "das", "dos", "di", "du"].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .slice(0, 25);
}

function readCache(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LOCAL_CACHE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeCache(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(LOCAL_CACHE_KEY, value);
    else window.localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch {
    // ignora — cache é apenas otimização visual.
  }
}

/**
 * Carrega/observa o nome da criança e expõe um saver.
 * `loading=true` enquanto a primeira leitura do DB está em curso (após
 * isso o cache local resolve sozinho).
 */
export function useChildName(): {
  childName: string;
  loading: boolean;
  setChildName: (next: string) => Promise<{ ok: boolean; error?: string; value: string }>;
} {
  const [childName, setLocalChildName] = useState<string>(() => readCache());
  const [loading, setLoading] = useState<boolean>(true);

  // Carrega do DB no mount + ouve eventos cross-componente.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await (supabase as any)
        .from("profiles")
        .select("child_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      const value = (data?.child_name ?? "").toString();
      setLocalChildName(value);
      writeCache(value);
      setLoading(false);
    };
    void load();

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail ?? "";
      debugLog("child-name", "custom-event", { detail });
      setLocalChildName(detail);
    };
    window.addEventListener(UPDATE_EVENT, onUpdate as EventListener);

    // Cross-tab: quando OUTRA aba salva o nome, o `localStorage.setItem`
    // dispara `storage` event aqui. Atualiza este consumidor sem reload —
    // requisito do PRD ("refletir sem necessidade de logout/login").
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_CACHE_KEY) return;
      debugLog("child-name", "storage", { newValue: event.newValue, oldValue: event.oldValue });
      setLocalChildName(event.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(UPDATE_EVENT, onUpdate as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setChildName = useCallback(async (next: string) => {
    const sanitized = sanitizeChildName(next);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      // Sem login: salva só no cache local — o app continua funcionando
      // com mensagens personalizadas no dispositivo atual.
      writeCache(sanitized);
      setLocalChildName(sanitized);
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: sanitized }));
      return { ok: true, value: sanitized };
    }
    // upsert para acomodar o caso (raro) de o profile ainda não existir.
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert({ user_id: userId, child_name: sanitized || null }, { onConflict: "user_id" });
    if (error) {
      return { ok: false, error: error.message, value: sanitized };
    }
    writeCache(sanitized);
    setLocalChildName(sanitized);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: sanitized }));
    return { ok: true, value: sanitized };
  }, []);

  return { childName, loading, setChildName };
}
