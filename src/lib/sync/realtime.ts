/**
 * Subscriptions Supabase Realtime cross-device (Fase 5).
 *
 * Para cada usuário autenticado, abrimos UM canal único que escuta
 * INSERT/UPDATE/DELETE nas tabelas de estado por-usuário:
 *   - user_favorites
 *   - user_story_progress
 *   - user_page_progress
 *   - user_artworks
 *
 * Política de conflito: "DB sempre vence" (consistente com Fase 4).
 * Em vez de aplicar diffs caso-a-caso (frágil, propenso a race com escritas
 * locais em andamento), qualquer evento dispara um `hydrateFromSupabase()`
 * coalescido (debounce). A hidratação já implementa toda a lógica de merge
 * e é idempotente — reusar é mais simples e mais seguro do que duplicar
 * regras de mesclagem aqui.
 *
 * Garantias:
 *   - Roda apenas no browser e apenas com sessão autenticada.
 *   - Idempotente: chamar `installRealtime(userId)` várias vezes para o
 *     MESMO userId não cria canais duplicados.
 *   - Troca de usuário: derruba o canal anterior antes de abrir o novo.
 *   - Falhas vão para `debugLog`; nunca lança.
 *   - Filtra por `user_id=eq.<id>` na origem (RLS reforça mesmo assim),
 *     então o broker só nos envia o que importa.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug-log";
import { hydrateFromSupabase } from "./hydrate";

const TABLES = [
  "user_favorites",
  "user_story_progress",
  "user_page_progress",
  "user_artworks",
] as const;

const RESYNC_DEBOUNCE_MS = 600;

let currentUserId: string | null = null;
let currentChannel: RealtimeChannel | null = null;
let resyncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingResyncFor: string | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function scheduleResync(userId: string) {
  pendingResyncFor = userId;
  if (resyncTimer) return; // já há uma rajada agendada
  resyncTimer = setTimeout(() => {
    const target = pendingResyncFor;
    resyncTimer = null;
    pendingResyncFor = null;
    if (!target || target !== currentUserId) return;
    debugLog("sync", "realtime-resync", { userId: target });
    void hydrateFromSupabase(target).catch((err) =>
      debugLog("sync", "realtime-error", { phase: "resync", err: String(err) }),
    );
  }, RESYNC_DEBOUNCE_MS);
}

/**
 * Abre (ou reusa) o canal realtime para `userId`. Se já existe um canal
 * para outro usuário, ele é fechado primeiro.
 */
export function installRealtime(userId: string): void {
  if (!isBrowser() || !userId) return;
  if (currentUserId === userId && currentChannel) return;

  // Troca de usuário: limpa o anterior antes de abrir o novo.
  if (currentChannel) {
    void uninstallRealtime();
  }

  currentUserId = userId;
  const filter = `user_id=eq.${userId}`;
  const channel = supabase.channel(`ccj-realtime-${userId}`);

  for (const table of TABLES) {
    channel.on(
      // O tipo do `on` em postgres_changes não é exportado; cast restrito.
      "postgres_changes" as never,
      { event: "*", schema: "public", table, filter } as never,
      (payload: { eventType?: string; table?: string }) => {
        debugLog("sync", "realtime-event", {
          table: payload.table ?? table,
          event: payload.eventType,
        });
        scheduleResync(userId);
      },
    );
  }

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      debugLog("sync", "realtime-subscribed", { userId, tables: TABLES.length });
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      debugLog("sync", "realtime-error", { phase: "subscribe", status });
    }
  });

  currentChannel = channel;
}

/** Fecha o canal ativo (se houver). Seguro chamar a qualquer momento. */
export async function uninstallRealtime(): Promise<void> {
  if (resyncTimer) {
    clearTimeout(resyncTimer);
    resyncTimer = null;
    pendingResyncFor = null;
  }
  const ch = currentChannel;
  currentChannel = null;
  currentUserId = null;
  if (!ch) return;
  try {
    await supabase.removeChannel(ch);
    debugLog("sync", "realtime-unsubscribed");
  } catch (err) {
    debugLog("sync", "realtime-error", { phase: "unsubscribe", err: String(err) });
  }
}

/** Apenas para testes — limpa estado interno sem tocar no broker. */
export function __resetRealtimeForTests() {
  currentUserId = null;
  currentChannel = null;
  if (resyncTimer) clearTimeout(resyncTimer);
  resyncTimer = null;
  pendingResyncFor = null;
}
