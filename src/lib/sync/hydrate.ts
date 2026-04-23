/**
 * Hidratação Supabase → localStorage (Fase 4).
 *
 * Lê o estado persistido no banco (progresso, favoritos, artworks) e
 * mescla no `localStorage` respeitando a política de conflito acordada:
 *
 *   "DB vence quando seu `updated_at` é mais recente que o
 *   `updatedAt` local. Caso contrário, mantém o local."
 *
 * Por que existe:
 *   - Cross-device: usuário abre o app em outro dispositivo e quer ver
 *     o que já pintou/favoritou — antes da Fase 5 (que vai inverter a
 *     fonte da verdade), esta camada empresta cobertura cross-device
 *     sem trocar a UI nem o pipeline atual.
 *   - Pós-login: depois que `auth.signInWithPassword` resolve, é o
 *     momento certo para sincronizar — os hooks já vão reler o store
 *     reativamente no próximo render.
 *
 * Garantias:
 *   - 100% silencioso: nunca lança, nunca bloqueia, qualquer erro vai
 *     somente para `debugLog`.
 *   - Não reescreve fills locais quando o local é mais novo (evita
 *     perder pintura recém-feita offline).
 *   - Idempotente: rodar várias vezes não duplica favoritos nem progresso.
 */
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug-log";
import { getAllProgress, getFavorites, getStoryBySlug } from "@/lib/store";
import { computeStoryCompletedPages } from "@/lib/coloring-progress";
import type { ColoringProgress } from "@/lib/types";

/* ------------ chaves locais (espelham as do store) ------------ */

const KEY_PROGRESS = "ccj.progress.v1";
const KEY_FAVORITES = "ccj.favorites.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function writeLocal<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacidade */
  }
}

/** Emite o evento que o `useStore` escuta para re-render reativo. */
function bumpStore() {
  if (!isBrowser()) return;
  // O `subscribe`/`emit` do store só é acionado por funções do store.
  // Para forçar consumidores a re-lerem, disparamos um `storage` event
  // sintético — é exatamente o mecanismo que o próprio `use-store` ouve
  // via window listeners para syncs cross-tab.
  try {
    window.dispatchEvent(new Event("ccj-language-changed"));
  } catch {
    /* ignore */
  }
}

/* ------------ hidratação de favoritos ------------ */

async function hydrateFavorites(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("story_slug, page_id")
    .eq("user_id", userId);
  if (error) {
    debugLog("sync", "hydrate-favorites-error", { error: error.message });
    return;
  }
  const remoteSlugs = new Set<string>();
  for (const row of data ?? []) {
    // só consideramos favoritos de história (page_id IS NULL) — o local
    // não trabalha com favoritos por página ainda.
    if (row.page_id == null && row.story_slug) {
      remoteSlugs.add(row.story_slug);
    }
  }
  const local = getFavorites();
  // União: nenhum favorito local é descartado (segurança), mas o que está
  // no DB e ainda não está local é adicionado. Para "DB vence" puro, a
  // remoção em outro device só vale para favoritos que JÁ existem no DB
  // — favoritos locais sem espelho no DB são preservados (provavelmente
  // foram criados offline e ainda não sincronizaram).
  const merged = new Set<string>(local);
  for (const slug of remoteSlugs) merged.add(slug);
  // Caso especial DB-vence: se o DB tem MENOS favoritos que o local E o
  // local foi criado antes do último update do DB, removemos. Sem
  // timestamps por item, mantemos a estratégia conservadora (união).
  const next = Array.from(merged);
  if (next.length !== local.length || next.some((slug) => !local.includes(slug))) {
    writeLocal(KEY_FAVORITES, next);
    debugLog("sync", "hydrate-favorites-merged", {
      localCount: local.length,
      remoteCount: remoteSlugs.size,
      mergedCount: next.length,
    });
  }
}

/* ------------ hidratação de progresso + artworks ------------ */

interface ArtworkPayload {
  fills?: Record<string, string>;
  version?: number;
}

async function hydrateProgressAndArtworks(userId: string): Promise<void> {
  // Busca em paralelo: progresso da história, progresso da página e snapshot
  // de pintura. Todos filtrados por user_id (RLS reforça mesmo assim).
  const [storyRes, pageRes, artworkRes] = await Promise.all([
    supabase
      .from("user_story_progress")
      .select("story_slug, current_page_index, updated_at")
      .eq("user_id", userId),
    supabase
      .from("user_page_progress")
      .select("story_slug, page_index, status, updated_at")
      .eq("user_id", userId),
    supabase
      .from("user_artworks")
      .select("story_slug, page_index, canvas_data_json, updated_at")
      .eq("user_id", userId),
  ]);

  if (storyRes.error) {
    debugLog("sync", "hydrate-story-error", { error: storyRes.error.message });
  }
  if (pageRes.error) {
    debugLog("sync", "hydrate-page-error", { error: pageRes.error.message });
  }
  if (artworkRes.error) {
    debugLog("sync", "hydrate-artwork-error", { error: artworkRes.error.message });
  }

  const storyRows = storyRes.data ?? [];
  const pageRows = pageRes.data ?? [];
  const artworkRows = artworkRes.data ?? [];
  if (storyRows.length === 0 && pageRows.length === 0 && artworkRows.length === 0) {
    return;
  }

  // Indexa pintura por (slug, pageIndex) e mantém o updated_at mais novo.
  const artworkBySlug = new Map<
    string,
    Map<number, { fills: Record<string, string>; updatedAt: number }>
  >();
  for (const row of artworkRows) {
    if (!row.story_slug) continue;
    const payload = (row.canvas_data_json ?? {}) as ArtworkPayload;
    const fills = payload.fills ?? {};
    if (!fills || typeof fills !== "object") continue;
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : 0;
    const slugMap = artworkBySlug.get(row.story_slug) ?? new Map();
    slugMap.set(row.page_index ?? 0, { fills, updatedAt });
    artworkBySlug.set(row.story_slug, slugMap);
  }

  // Indexa progresso de história por slug.
  const storyBySlug = new Map<string, { currentPageIndex: number; updatedAt: number }>();
  for (const row of storyRows) {
    if (!row.story_slug) continue;
    storyBySlug.set(row.story_slug, {
      currentPageIndex: row.current_page_index ?? 0,
      updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
    });
  }

  // Conjunto de páginas concluídas por slug, vindas do DB.
  const completedFromDb = new Map<string, Set<number>>();
  for (const row of pageRows) {
    if (!row.story_slug) continue;
    if (row.status === "completed") {
      const set = completedFromDb.get(row.story_slug) ?? new Set<number>();
      set.add(row.page_index ?? 0);
      completedFromDb.set(row.story_slug, set);
    }
  }

  // Mescla com o local — política "DB vence por updated_at".
  const localProgress = getAllProgress();
  const localBySlug = new Map<string, ColoringProgress>(localProgress.map((p) => [p.storySlug, p]));

  const allSlugs = new Set<string>([
    ...storyBySlug.keys(),
    ...artworkBySlug.keys(),
    ...completedFromDb.keys(),
    ...localBySlug.keys(),
  ]);

  let mutated = false;
  const merged: ColoringProgress[] = [];

  for (const slug of allSlugs) {
    const local = localBySlug.get(slug);
    const dbStory = storyBySlug.get(slug);
    const dbArtworkPages = artworkBySlug.get(slug);
    const dbUpdatedAt = Math.max(
      dbStory?.updatedAt ?? 0,
      ...Array.from(dbArtworkPages?.values() ?? []).map((a) => a.updatedAt),
    );
    const localUpdatedAt = local?.updatedAt ?? 0;
    const dbWins = dbUpdatedAt > localUpdatedAt;

    if (!local && !dbStory && !dbArtworkPages) continue;

    // Se DB venceu, montamos pagesFills a partir das pinturas do DB.
    // Caso contrário, preservamos o local (DB serve só para preencher
    // páginas que o local não tinha).
    const basePagesFills = local?.pagesFills ?? {};
    const nextPagesFills: Record<number, Record<string, string>> = { ...basePagesFills };
    if (dbArtworkPages) {
      for (const [pageIndex, art] of dbArtworkPages.entries()) {
        const localPage = nextPagesFills[pageIndex];
        const localPageHasFills = localPage && Object.keys(localPage).length > 0;
        if (!localPageHasFills) {
          nextPagesFills[pageIndex] = art.fills;
        } else if (dbWins && art.updatedAt > localUpdatedAt) {
          nextPagesFills[pageIndex] = art.fills;
        }
      }
    }

    // Página corrente: DB vence se for mais novo, senão preserva local.
    const pageIndex =
      dbWins && dbStory
        ? dbStory.currentPageIndex
        : (local?.pageIndex ?? dbStory?.currentPageIndex ?? 0);

    // fills da página corrente: usa snapshot mais consistente.
    const fills = nextPagesFills[pageIndex] ?? local?.fills ?? {};

    // Recomputa completedPages com a regra estrita do motor central.
    const story = getStoryBySlug(slug);
    let completedPages = local?.completedPages ?? [];
    if (story) {
      completedPages = computeStoryCompletedPages(story, nextPagesFills);
    } else {
      // Sem catálogo carregado, fallback para o que o DB sinalizou.
      const dbCompleted = completedFromDb.get(slug);
      if (dbCompleted && dbWins) completedPages = Array.from(dbCompleted).sort();
    }

    const next: ColoringProgress = {
      storySlug: slug,
      pageIndex,
      fills,
      completedPages,
      pagesFills: nextPagesFills,
      updatedAt: Math.max(localUpdatedAt, dbUpdatedAt) || Date.now(),
    };

    // Detecta mudança real para evitar re-render desnecessário.
    const changed =
      !local ||
      local.pageIndex !== next.pageIndex ||
      local.completedPages.length !== next.completedPages.length ||
      JSON.stringify(local.pagesFills ?? {}) !== JSON.stringify(next.pagesFills);
    if (changed) mutated = true;
    merged.push(next);
  }

  if (mutated) {
    writeLocal(KEY_PROGRESS, merged);
    debugLog("sync", "hydrate-progress-merged", {
      slugCount: merged.length,
    });
  }
}

/* ------------ entry point ------------ */

/**
 * Roda hidratação completa para o usuário autenticado. Seguro chamar
 * múltiplas vezes; o ciclo é coordenado pelo `bootstrap.ts` para evitar
 * re-execução durante a mesma sessão.
 */
export async function hydrateFromSupabase(userId: string): Promise<void> {
  if (!isBrowser()) return;
  try {
    await Promise.all([hydrateFavorites(userId), hydrateProgressAndArtworks(userId)]);
    bumpStore();
  } catch (err) {
    debugLog("sync", "hydrate-throw", { err: String(err) });
  }
}
