/**
 * Backfill one-shot localStorage → Supabase (Fase 4).
 *
 * Para cada usuário, na PRIMEIRA vez que ele logar após a Fase 4 ser
 * lançada, empurramos todo o estado já existente em `localStorage` para
 * o banco — favoritos, progresso por história/página e snapshots de
 * pintura. Tudo via os mesmos services usados pelo dual-write da Fase 3,
 * que já são idempotentes (upsert por chave única).
 *
 * Idempotência:
 *  - Marcamos a flag `ccj.backfill.v1.<userId>` em localStorage. Quem já
 *    rodou uma vez nunca mais reexecuta no mesmo dispositivo. Trocar de
 *    dispositivo não é problema: o backfill só envia coisas que aquele
 *    dispositivo tinha localmente, e os upserts no DB ignoram duplicatas.
 *  - Em caso de falha parcial, a flag NÃO é gravada — a próxima sessão
 *    tenta novamente.
 */
import { debugLog } from "@/lib/debug-log";
import { getAllProgress, getFavorites, getStoryBySlug } from "@/lib/store";
import { upsertStoryProgress, upsertPageProgress, saveArtwork, addFavoriteStory } from "@/services";

const FLAG_PREFIX = "ccj.backfill.v1.";

function isBrowser() {
  return typeof window !== "undefined";
}

function alreadyDone(userId: string): boolean {
  if (!isBrowser()) return true;
  try {
    return window.localStorage.getItem(FLAG_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

function markDone(userId: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(FLAG_PREFIX + userId, "1");
  } catch {
    /* ignore quota */
  }
}

/** Backfill silencioso de favoritos. Erros de "duplicate" são esperados. */
async function backfillFavorites(): Promise<boolean> {
  let ok = true;
  const slugs = getFavorites();
  for (const slug of slugs) {
    const res = await addFavoriteStory(slug);
    if (res.error && !res.error.toLowerCase().includes("duplicate")) {
      debugLog("sync", "backfill-favorite-error", { slug, error: res.error });
      ok = false;
    }
  }
  return ok;
}

/** Backfill de progresso (story + page) e snapshot de pintura por página. */
async function backfillProgress(): Promise<boolean> {
  let ok = true;
  const all = getAllProgress();
  for (const p of all) {
    const story = getStoryBySlug(p.storySlug);
    const totalPages = story?.pages.length ?? 0;
    const completedPages = p.completedPages ?? [];
    const completionPercent =
      totalPages > 0 ? Math.round((completedPages.length / totalPages) * 100) : 0;
    const status: "not_started" | "in_progress" | "completed" =
      completedPages.length === 0
        ? "not_started"
        : completedPages.length >= totalPages && totalPages > 0
          ? "completed"
          : "in_progress";

    const storyRes = await upsertStoryProgress({
      storySlug: p.storySlug,
      status,
      pagesCompleted: completedPages.length,
      completionPercent,
      currentPageIndex: p.pageIndex ?? 0,
      startedAt: new Date(p.updatedAt ?? Date.now()).toISOString(),
      completedAt:
        status === "completed" ? new Date(p.updatedAt ?? Date.now()).toISOString() : null,
    });
    if (storyRes.error) {
      debugLog("sync", "backfill-story-progress-error", {
        slug: p.storySlug,
        error: storyRes.error,
      });
      ok = false;
    }

    // Para cada página com fills locais, espelha progress + artwork.
    const pagesFills = p.pagesFills ?? {};
    const pageIndices = new Set<number>([
      ...Object.keys(pagesFills).map(Number),
      ...completedPages,
      p.pageIndex,
    ]);

    for (const pageIndex of pageIndices) {
      const fills = pagesFills[pageIndex] ?? (pageIndex === p.pageIndex ? p.fills : undefined);
      const isComplete = completedPages.includes(pageIndex);

      if (fills || isComplete) {
        const pageRes = await upsertPageProgress({
          storySlug: p.storySlug,
          pageIndex,
          status: isComplete ? "completed" : "in_progress",
          completedAt: isComplete ? new Date(p.updatedAt ?? Date.now()).toISOString() : null,
        });
        if (pageRes.error) {
          debugLog("sync", "backfill-page-progress-error", {
            slug: p.storySlug,
            pageIndex,
            error: pageRes.error,
          });
          ok = false;
        }
      }

      if (fills && Object.keys(fills).length > 0) {
        const artRes = await saveArtwork({
          storySlug: p.storySlug,
          pageIndex,
          canvasData: { fills, version: 1 },
          palette: Array.from(new Set(Object.values(fills))),
          isFinished: isComplete,
        });
        if (artRes.error) {
          debugLog("sync", "backfill-artwork-error", {
            slug: p.storySlug,
            pageIndex,
            error: artRes.error,
          });
          ok = false;
        }
      }
    }
  }
  return ok;
}

/**
 * Roda o backfill uma única vez por (usuário, dispositivo). Sempre seguro
 * chamar — verifica a flag antes e sai cedo se já rodou.
 */
export async function backfillToSupabase(userId: string): Promise<void> {
  if (!isBrowser()) return;
  if (alreadyDone(userId)) return;
  try {
    const [favOk, progOk] = await Promise.all([backfillFavorites(), backfillProgress()]);
    if (favOk && progOk) {
      markDone(userId);
      debugLog("sync", "backfill-complete", { userId });
    } else {
      debugLog("sync", "backfill-partial", { userId, favOk, progOk });
    }
  } catch (err) {
    debugLog("sync", "backfill-throw", { err: String(err) });
  }
}
