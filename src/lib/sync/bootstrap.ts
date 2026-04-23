/**
 * Bootstrap de sincronização (Fase 4).
 *
 * Auto-instala um listener em `supabase.auth.onAuthStateChange` que dispara,
 * para cada sessão autenticada:
 *   1. backfill one-shot do localStorage → Supabase (idempotente);
 *   2. hidratação contínua do Supabase → localStorage (DB vence por
 *      `updated_at`).
 *
 * Por que aqui e não nas rotas:
 *   - Manter as rotas/hooks intocadas era requisito da Fase 4. Este módulo
 *     é importado UMA vez no entry do app (router) e o listener cuida do
 *     ciclo de vida sozinho.
 *
 * Garantias:
 *   - Roda apenas no browser.
 *   - Roda no máximo uma vez por sessão (mesmo se o `onAuthStateChange`
 *     emitir eventos repetidos como TOKEN_REFRESHED).
 *   - Tudo é fire-and-forget; falhas vão somente para `debugLog`.
 */
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug-log";
import { backfillToSupabase } from "./backfill";
import { hydrateFromSupabase } from "./hydrate";
import { installRealtime, uninstallRealtime } from "./realtime";

let installed = false;
let lastSyncedUserId: string | null = null;
let inflight = false;

function isBrowser() {
  return typeof window !== "undefined";
}

async function syncForUser(userId: string) {
  if (inflight || lastSyncedUserId === userId) return;
  inflight = true;
  try {
    // Backfill primeiro: garante que o que o usuário acabou de fazer
    // offline neste device chega ao DB antes de a hidratação puxar o
    // estado consolidado de volta.
    await backfillToSupabase(userId);
    await hydrateFromSupabase(userId);
    // Após hidratar, abre o canal realtime para que mudanças feitas em
    // outros devices/abas cheguem automaticamente. Idempotente.
    installRealtime(userId);
    lastSyncedUserId = userId;
    debugLog("sync", "bootstrap-synced", { userId });
  } catch (err) {
    debugLog("sync", "bootstrap-throw", { err: String(err) });
  } finally {
    inflight = false;
  }
}

/**
 * Instala o listener uma única vez. Chamado no boot do app via
 * `src/router.tsx`. Seguro chamar múltiplas vezes — só registra de fato
 * na primeira invocação.
 */
export function installSyncBootstrap() {
  if (!isBrowser() || installed) return;
  installed = true;

  // Caso já exista uma sessão antes do listener registrar (refresh de
  // página com sessão persistida), dispara imediatamente.
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      if (userId) void syncForUser(userId);
    } catch (err) {
      debugLog("sync", "bootstrap-initial-error", { err: String(err) });
    }
  })();

  try {
    supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null;
      if (event === "SIGNED_OUT" || !userId) {
        lastSyncedUserId = null;
        void uninstallRealtime();
        return;
      }
      // Só nos interessam transições reais para usuário autenticado.
      // SIGNED_IN dispara no login e em refresh com sessão; ambos são
      // tratados pelo guard `lastSyncedUserId === userId`.
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        void syncForUser(userId);
      }
    });
  } catch (err) {
    debugLog("sync", "bootstrap-install-error", { err: String(err) });
  }
}
