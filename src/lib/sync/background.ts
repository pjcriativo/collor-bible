/**
 * Background sync (Fase 3) — espelha o estado local em localStorage para
 * o Supabase em fire-and-forget, SEM mudar a UI nem o timing dos hooks.
 *
 * Princípios desta camada:
 *  - Tudo é assíncrono e silencioso: erros vão só para `debugLog`,
 *    nunca quebram um fluxo do usuário.
 *  - Throttle/coalescing por chave (ex.: storySlug+pageIndex) para
 *    evitar saturar a rede durante autosaves de pintura rápidos.
 *  - Só dispara quando há sessão Supabase ativa — sem login, vira no-op.
 *  - Não lê do servidor para evitar overrides do estado local. A leitura
 *    "verdadeira" do banco fica para a Fase 5, quando inverteremos a
 *    fonte da verdade.
 */
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug-log";
import {
  upsertStoryProgress,
  upsertPageProgress,
  saveArtwork,
  addFavoriteStory,
  removeFavoriteStory,
  logActivity,
  touchStreakToday,
} from "@/services";

/* ───────────────────────── helpers ───────────────────────── */

let _userIdCache: string | null | undefined;
let _userIdCacheTs = 0;
const USER_CACHE_MS = 30_000;

/**
 * Resolve o user_id atual com cache curto. Se não houver sessão, devolve
 * `null` — caller deve tratar como "no-op silencioso".
 */
async function getUserIdCached(): Promise<string | null> {
  const now = Date.now();
  if (_userIdCache !== undefined && now - _userIdCacheTs < USER_CACHE_MS) {
    return _userIdCache;
  }
  try {
    const { data } = await supabase.auth.getSession();
    _userIdCache = data.session?.user.id ?? null;
    _userIdCacheTs = now;
    return _userIdCache;
  } catch {
    _userIdCache = null;
    _userIdCacheTs = now;
    return null;
  }
}

// Invalida o cache quando a sessão muda (login/logout em qualquer lugar).
if (typeof window !== "undefined") {
  try {
    supabase.auth.onAuthStateChange(() => {
      _userIdCache = undefined;
      _userIdCacheTs = 0;
    });
  } catch {
    /* ignore */
  }
}

/**
 * Coalescing por chave: agrupa chamadas rápidas para a mesma chave em
 * uma única execução, mantendo apenas o último payload (last-wins).
 */
function makeCoalescer<TPayload>(delayMs: number, runner: (payload: TPayload) => Promise<void>) {
  const pending = new Map<string, { payload: TPayload; timer: number }>();
  return (key: string, payload: TPayload) => {
    const existing = pending.get(key);
    if (existing) {
      window.clearTimeout(existing.timer);
    }
    const timer = window.setTimeout(async () => {
      const entry = pending.get(key);
      if (!entry) return;
      pending.delete(key);
      try {
        await runner(entry.payload);
      } catch (err) {
        debugLog("sync", "runner-error", { key, err: String(err) });
      }
    }, delayMs);
    pending.set(key, { payload, timer: timer as unknown as number });
  };
}

/* ───────────────────────── progress ───────────────────────── */

const syncStoryProgressDebounced = makeCoalescer<{
  storySlug: string;
  pagesCompleted: number;
  totalPages: number;
  currentPageIndex: number;
}>(800, async (p) => {
  const userId = await getUserIdCached();
  if (!userId) return;
  const completionPercent =
    p.totalPages > 0 ? Math.round((p.pagesCompleted / p.totalPages) * 100) : 0;
  const status: "not_started" | "in_progress" | "completed" =
    p.pagesCompleted === 0
      ? "not_started"
      : p.pagesCompleted >= p.totalPages
        ? "completed"
        : "in_progress";
  const res = await upsertStoryProgress({
    storySlug: p.storySlug,
    status,
    pagesCompleted: p.pagesCompleted,
    completionPercent,
    currentPageIndex: p.currentPageIndex,
    startedAt: new Date().toISOString(),
    completedAt: status === "completed" ? new Date().toISOString() : null,
  });
  if (res.error) debugLog("sync", "story-progress-error", { error: res.error });
});

const syncPageProgressDebounced = makeCoalescer<{
  storySlug: string;
  pageIndex: number;
  isComplete: boolean;
}>(800, async (p) => {
  const userId = await getUserIdCached();
  if (!userId) return;
  const res = await upsertPageProgress({
    storySlug: p.storySlug,
    pageIndex: p.pageIndex,
    status: p.isComplete ? "completed" : "in_progress",
    completedAt: p.isComplete ? new Date().toISOString() : null,
  });
  if (res.error) debugLog("sync", "page-progress-error", { error: res.error });
});

/**
 * Espelha o progresso de uma história ao banco em background.
 * Chamado de dentro de `saveProgress` / `touchProgressPage` no store local.
 */
export function syncStoryProgress(input: {
  storySlug: string;
  pagesCompleted: number;
  totalPages: number;
  currentPageIndex: number;
}) {
  if (typeof window === "undefined") return;
  syncStoryProgressDebounced(input.storySlug, input);
}

/**
 * Espelha o progresso da página atual ao banco em background.
 */
export function syncPageProgress(input: {
  storySlug: string;
  pageIndex: number;
  isComplete: boolean;
}) {
  if (typeof window === "undefined") return;
  syncPageProgressDebounced(`${input.storySlug}#${input.pageIndex}`, input);
}

/* ───────────────────────── artworks ───────────────────────── */

const syncArtworkDebounced = makeCoalescer<{
  storySlug: string;
  pageIndex: number;
  fills: Record<string, string>;
  isFinished: boolean;
}>(1500, async (p) => {
  const userId = await getUserIdCached();
  if (!userId) return;
  const res = await saveArtwork({
    storySlug: p.storySlug,
    pageIndex: p.pageIndex,
    canvasData: { fills: p.fills, version: 1 },
    palette: Array.from(new Set(Object.values(p.fills))),
    isFinished: p.isFinished,
  });
  if (res.error) debugLog("sync", "artwork-error", { error: res.error });
});

/**
 * Espelha o snapshot da pintura ao banco com debounce maior (1.5s) — não
 * compete com o autosave local de 500ms; só persiste quando o usuário
 * para de pintar por mais tempo, evitando carga desnecessária.
 */
export function syncArtwork(input: {
  storySlug: string;
  pageIndex: number;
  fills: Record<string, string>;
  isFinished: boolean;
}) {
  if (typeof window === "undefined") return;
  syncArtworkDebounced(`${input.storySlug}#${input.pageIndex}`, input);
}

/* ───────────────────────── favoritos ───────────────────────── */

/**
 * Espelha um toggle de favorito ao banco. Diferente de progresso, aqui
 * NÃO usamos debounce — favoritar/desfavoritar é uma intenção explícita
 * do usuário e deve refletir imediatamente.
 */
export function syncFavoriteToggle(input: { storySlug: string; isFavoriteNow: boolean }) {
  if (typeof window === "undefined") return;
  void (async () => {
    const userId = await getUserIdCached();
    if (!userId) return;
    try {
      const res = input.isFavoriteNow
        ? await addFavoriteStory(input.storySlug)
        : await removeFavoriteStory(input.storySlug);
      if (res.error && !res.error.includes("duplicate")) {
        debugLog("sync", "favorite-error", { error: res.error });
      }
    } catch (err) {
      debugLog("sync", "favorite-throw", { err: String(err) });
    }
  })();
}

/* ───────────────────────── atividade + streak ───────────────────────── */

const RECENT_DEDUPE_MS = 60_000;
const recentDedupe = new Map<string, number>();

/**
 * Loga uma atividade do usuário (ex.: opened_story, completed_page).
 * Auto-deduplica eventos idênticos disparados em < 60s para evitar
 * inflar o histórico quando o usuário reentra rapidamente.
 */
export function syncActivity(input: {
  type: string;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
  /** chave de dedupe — se omitida, usa `type:referenceId`. */
  dedupeKey?: string;
}) {
  if (typeof window === "undefined") return;
  const key = input.dedupeKey ?? `${input.type}:${input.referenceId ?? ""}`;
  const now = Date.now();
  const last = recentDedupe.get(key);
  if (last && now - last < RECENT_DEDUPE_MS) return;
  recentDedupe.set(key, now);

  void (async () => {
    const userId = await getUserIdCached();
    if (!userId) return;
    const res = await logActivity({
      type: input.type,
      referenceId: input.referenceId ?? null,
      metadata: input.metadata ?? null,
    });
    if (res.error) debugLog("sync", "activity-error", { error: res.error });
    // Toda atividade do usuário também conta para o streak diário.
    void touchStreakToday();
  })();
}

/* ───────────────────────── profile (child_name) ───────────────────────── */

/**
 * Garante que `profiles.child_name` reflete o nome local. Já existia
 * lógica no `use-child-name.ts` que faz upsert direto — esta função é
 * idempotente e usada como fallback para fluxos antigos que ainda não
 * passam pelo hook (ex.: import legado).
 */
export function syncChildName(name: string) {
  if (typeof window === "undefined") return;
  void (async () => {
    const userId = await getUserIdCached();
    if (!userId) return;
    try {
      const sanitized = name.trim().slice(0, 60) || null;
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, child_name: sanitized }, { onConflict: "user_id" });
      if (error) debugLog("sync", "child-name-error", { error: error.message });
    } catch (err) {
      debugLog("sync", "child-name-throw", { err: String(err) });
    }
  })();
}
