/**
 * Job de recálculo do progresso salvo localmente.
 *
 * MOTIVAÇÃO
 * ---------
 * `coloring-progress.ts` é a regra global única para decidir quais regiões
 * `id="fill-..."` de um SVG são realmente "preenchíveis pelo usuário"
 * (ignora elementos decorativos com `fill="..."` fixo, como o halo da
 * primitiva `person()`). Antes dessa regra, cada página armazenava
 * `completedPages` baseado em "tem ≥ 1 fill", e em alguns lugares a UI
 * contava as regiões com regex próprio. Isso deixou registros antigos no
 * `localStorage` em estados inconsistentes:
 *
 *   - Páginas listadas como "completas" sem estarem 100% pintadas pela
 *     nova regra (ex.: usuário pintou 1 região e fechou).
 *   - Páginas 100% pintadas pela nova regra que NÃO estão em
 *     `completedPages` (porque o usuário fechou antes do recálculo).
 *
 * Este job percorre TODAS as histórias ativas e, para cada
 * `ColoringProgress` salvo, recalcula `completedPages` aplicando
 * `isPageComplete(svg, fills)` página a página — usando o `pagesFills`
 * por página quando disponível e caindo para o `fills` "legacy" da
 * `pageIndex` corrente caso contrário.
 *
 * Roda UMA VEZ por dispositivo (gate em `localStorage`), para não pesar
 * em todo boot. Idempotente: rodar de novo em cima de dados já corretos
 * não altera nada (o `JSON.stringify` da lista resultante bate com o
 * anterior e `save()` é evitado).
 */
import { computeStoryCompletedPages, isStoryComplete } from "@/lib/coloring-progress";
import type { ColoringProgress, Story } from "@/lib/types";

/** Versão do job. Subir esse número força o recálculo em todos os clientes. */
// v2: Bug fix em `saveProgress` (até v1, marcávamos página como concluída
// com 1 fill em vez de 100%). Quem já usou o app antes do fix tem
// `completedPages` "infladas" no localStorage; este recálculo as
// realinha à regra correta (`isPageComplete`).
// v3: Após centralizar `computeStoryCompletedPages`/`storyPercent` como
// fonte única (mesma função usada por canvas, store, recalc, modais),
// forçamos uma nova passada para garantir que clientes que já tinham
// rodado a v2 com fórmulas espalhadas reconvergem ao denominador
// correto. Idempotente: quem já estava certo não muda nada.
export const RECALC_VERSION = 3;
const RECALC_FLAG_KEY = "ccj.progress.recalc.v";

// Gate INDEPENDENTE para a etapa servidor: como ela depende de sessão
// autenticada, queremos rodá-la quando o usuário fizer login mesmo se
// a parte local já estiver concluída. Subir esse número força nova
// reconciliação de `story_completions` em todos os clientes logados.
export const SERVER_RECALC_VERSION = 1;
const SERVER_RECALC_FLAG_KEY = "ccj.progress.recalc.server.v";

export type RecalcSummary = {
  /** Histórias inspecionadas (que tinham progresso salvo). */
  storiesScanned: number;
  /** Histórias cujo `completedPages` foi alterado. */
  storiesUpdated: number;
  /** Páginas adicionadas a `completedPages` por estarem 100% pela nova regra. */
  pagesAdded: number;
  /** Páginas removidas de `completedPages` por NÃO estarem 100% pela nova regra. */
  pagesRemoved: number;
  /** Slugs em `story_completions` (servidor) removidos por não estarem mais 100%. */
  serverCompletionsRemoved?: number;
};

/**
 * Recalcula `completedPages` de uma lista de progressos contra a lista
 * atual de histórias, sem tocar em `localStorage`. Função pura — usada
 * no teste e no wrapper que persiste.
 */
export function recalculateCompletedPages(
  allProgress: ColoringProgress[],
  stories: Story[],
): { next: ColoringProgress[]; summary: RecalcSummary } {
  const storyBySlug = new Map(stories.map((s) => [s.slug, s]));
  const summary: RecalcSummary = {
    storiesScanned: allProgress.length,
    storiesUpdated: 0,
    pagesAdded: 0,
    pagesRemoved: 0,
  };

  const next = allProgress.map((progress) => {
    const story = storyBySlug.get(progress.storySlug);
    // História removida do catálogo: preserva como está.
    if (!story) return progress;

    // Monta o mapa por página combinando o `pagesFills` moderno com o
    // `fills` legacy (registros antigos só tinham a página corrente).
    // Depois delega para `computeStoryCompletedPages` — fonte única do
    // motor central — em vez de duplicar o loop de `isPageComplete`.
    const mergedPagesFills: Record<number, Record<string, string>> = {
      ...(progress.pagesFills ?? {}),
    };
    if (mergedPagesFills[progress.pageIndex] === undefined && progress.fills) {
      mergedPagesFills[progress.pageIndex] = progress.fills;
    }
    const recomputed = computeStoryCompletedPages(story, mergedPagesFills);

    const previousSet = new Set(progress.completedPages);
    const recomputedSet = new Set(recomputed);
    let added = 0;
    let removed = 0;
    for (const i of recomputedSet) if (!previousSet.has(i)) added += 1;
    for (const i of previousSet) if (!recomputedSet.has(i)) removed += 1;

    if (added === 0 && removed === 0) return progress;

    summary.storiesUpdated += 1;
    summary.pagesAdded += added;
    summary.pagesRemoved += removed;
    return { ...progress, completedPages: recomputed };
  });

  return { next, summary };
}

// ──────────────────────────────────────────────────────────────────────
// RECONCILIAÇÃO COM O SERVIDOR (`story_completions`)
//
// Quando o usuário concluía uma história, o cliente gravava em
// `public.story_completions` um registro com o `overall_progress_percent`
// daquele momento. Antes do fix da regra global ("100% das regiões
// preenchíveis"), algumas histórias eram marcadas como concluídas sem
// estarem realmente 100% — e esses registros ficaram no servidor.
//
// Esta função NÃO faz I/O: recebe o estado local já recalculado + a lista
// de slugs presentes no servidor e devolve quais devem ser removidos
// (porque a nova regra diz que não estão mais concluídas). A camada
// chamadora (no wrapper) é quem dispara o `delete` no Supabase.
//
// Decisão de design: NÃO criamos registros no servidor para histórias
// que estão 100% no local mas faltam no servidor — esse caminho já é
// coberto pelo fluxo normal de conclusão (`useColoringState` chama
// `persistStoryCompletion` ao detectar conclusão). O job só REMOVE
// inconsistências antigas; nunca adiciona, para evitar disparar
// celebrações duplicadas.
// ──────────────────────────────────────────────────────────────────────

/**
 * Compara o estado LOCAL recalculado com a lista de slugs presentes na
 * tabela `story_completions` (servidor) e devolve os slugs que devem
 * ser removidos por não estarem mais 100% pela regra atual.
 *
 * Histórias presentes no servidor mas removidas do catálogo são
 * preservadas — não deletamos histórico de algo que pode voltar.
 */
export function reconcileServerCompletions(
  localProgress: ColoringProgress[],
  stories: Story[],
  serverCompletionSlugs: string[],
): { slugsToRemove: string[] } {
  const storyBySlug = new Map(stories.map((s) => [s.slug, s]));
  const progressBySlug = new Map(localProgress.map((p) => [p.storySlug, p]));
  const slugsToRemove: string[] = [];

  for (const slug of serverCompletionSlugs) {
    const story = storyBySlug.get(slug);
    // História sumiu do catálogo: não deletamos (preserva histórico).
    if (!story) continue;

    const progress = progressBySlug.get(slug);
    const total = story.pages.length;
    const done = progress ? progress.completedPages.filter((i) => i >= 0 && i < total).length : 0;

    if (!isStoryComplete(done, total)) {
      slugsToRemove.push(slug);
    }
  }

  return { slugsToRemove };
}

/**
 * Wrapper que carrega o estado atual do `localStorage`, recalcula e
 * persiste — disparando os listeners reativos do store. Idempotente:
 * se nada mudou (resultado igual ao salvo), não escreve nada.
 *
 * `force=true` ignora o gate de versão (útil em teste e ferramenta de
 * admin). Em produção, chame sem `force` — o gate evita rodar a cada
 * navegação.
 */
export async function runColoringProgressRecalcJob(force = false): Promise<RecalcSummary | null> {
  if (typeof window === "undefined") return null;

  const localFlag = window.localStorage.getItem(RECALC_FLAG_KEY);
  const serverFlag = window.localStorage.getItem(SERVER_RECALC_FLAG_KEY);
  const localDone = !force && localFlag !== null && Number(localFlag) >= RECALC_VERSION;
  const serverDone = !force && serverFlag !== null && Number(serverFlag) >= SERVER_RECALC_VERSION;
  // Se ambas as etapas (local e servidor) já passaram nesta versão,
  // não há nada a fazer.
  if (localDone && serverDone) return null;

  // Import dinâmico evita ciclo (`store.ts` -> `coloring-pages.ts` puxa
  // todo o catálogo de SVGs; só queremos pagar isso quando o job roda).
  const { getActiveStories, getAllProgress, subscribe } = await import("@/lib/store");
  const stories = getActiveStories();
  const current = getAllProgress();
  const { next, summary } = recalculateCompletedPages(current, stories);

  // ─── Etapa LOCAL ────────────────────────────────────────────────────
  if (!localDone) {
    if (summary.storiesUpdated > 0) {
      try {
        window.localStorage.setItem("ccj.progress.v1", JSON.stringify(next));
        // Notifica consumidores reativos (miniaturas, "Continue colorindo",
        // FAB do perfil) sem precisar de reload.
        void subscribe; // referência mantém o import vivo para tree-shaking
        window.dispatchEvent(new StorageEvent("storage", { key: "ccj.progress.v1" }));
      } catch {
        /* ignore quota/serialization errors — gate ainda será setado */
      }
    }
    window.localStorage.setItem(RECALC_FLAG_KEY, String(RECALC_VERSION));
  }

  // ─── Etapa SERVIDOR ─────────────────────────────────────────────────
  // Só roda se houver sessão autenticada — visitantes não têm registros
  // em `story_completions`. Se a sessão estiver indisponível (offline,
  // erro de rede), NÃO marcamos o gate, para tentar de novo no próximo
  // boot quando o usuário estiver logado.
  if (!serverDone) {
    let serverRemoved = 0;
    let serverGateOk = false;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        const { data: rows, error } = await (supabase as any)
          .from("story_completions")
          .select("story_slug")
          .eq("user_id", userId);
        if (!error && Array.isArray(rows)) {
          const serverSlugs = rows.map((r: { story_slug: string }) => r.story_slug);
          const { slugsToRemove } = reconcileServerCompletions(next, stories, serverSlugs);
          if (slugsToRemove.length > 0) {
            const { error: deleteError } = await (supabase as any)
              .from("story_completions")
              .delete()
              .eq("user_id", userId)
              .in("story_slug", slugsToRemove);
            if (!deleteError) {
              serverRemoved = slugsToRemove.length;
              serverGateOk = true;
            }
          } else {
            // Nada a remover — etapa concluída com sucesso.
            serverGateOk = true;
          }
        }
      } else {
        // Sem sessão: NÃO marca o gate; tenta de novo quando logar.
      }
    } catch {
      /* offline / supabase indisponível: não marca gate, tenta depois */
    }
    summary.serverCompletionsRemoved = serverRemoved;
    if (serverGateOk) {
      window.localStorage.setItem(SERVER_RECALC_FLAG_KEY, String(SERVER_RECALC_VERSION));
    }
  }

  return summary;
}
