import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { celebrate, celebrateSubtle } from "@/lib/celebrate";
import { playFanfare, playPop, playSparkle } from "@/lib/pop-sound";
import {
  getActiveStories,
  getProgress,
  getStoryProgress,
  hasStoryCompletion,
  markStoryCompleted,
  saveProgress,
} from "@/lib/store";
import {
  catalogPercent,
  computeStoryCompletedPages,
  countFilledRegions,
  countFillableRegions,
  findUnlockedMilestone,
  isStoryComplete,
  pageCompletionState,
  extractFillableRegionIds,
  validatePageProgress,
} from "@/lib/coloring-progress";
import { supabase } from "@/integrations/supabase/client";
import type { Story } from "@/lib/types";

export const ERASER = "ERASER";

export type UseColoringStateOptions = {
  story: Story;
  pageIndex: number;
  onStoryComplete?: (payload: { overallPct: number; unlockedMilestone?: string }) => void;
  onPageComplete?: (payload: {
    pageIndex: number;
    storySlug: string;
    done: number;
    total: number;
  }) => void;
};

const MILESTONES = [
  { pct: 25, label: "Semente" },
  { pct: 50, label: "Artista" },
  { pct: 75, label: "Estrela" },
  { pct: 100, label: "Mestre" },
];

async function persistStoryCompletion(
  storySlug: string,
  overallPct: number,
  unlockedMilestone?: string,
) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await (supabase as any).from("story_completions").insert({
    user_id: userId,
    story_slug: storySlug,
    overall_progress_percent: overallPct,
    unlocked_milestone: unlockedMilestone ?? null,
  });
}

export function useColoringState({
  story,
  pageIndex,
  onStoryComplete,
  onPageComplete,
}: UseColoringStateOptions) {
  const [color, setColor] = useState<string>("#7CB7FF");
  const [fills, setFills] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [saved, setSaved] = useState(true);
  const [magicPainting, setMagicPainting] = useState(false);
  const magicTimersRef = useRef<number[]>([]);
  const colorRef = useRef(color);
  const fillsRef = useRef(fills);
  // Conjunto de IDs preenchíveis da página atual — reaproveitado por
  // `applyFill` para detectar SÍNCRONAMENTE quando a próxima pintura
  // será a última (e só nesse caso forçar `flushSync`, evitando custo
  // nas pinturas comuns).
  const fillableIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    fillableIdsRef.current = extractFillableRegionIds(story.pages[pageIndex]?.svg ?? "");
  }, [pageIndex, story.pages]);

  const totalFillRegions = useMemo(() => {
    const currentPageSvg = story.pages[pageIndex]?.svg ?? "";
    return countFillableRegions(currentPageSvg);
  }, [pageIndex, story.pages]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    fillsRef.current = fills;
  }, [fills]);

  // cancel any in-flight magic paint cascade on unmount or when page/story changes
  useEffect(() => {
    return () => {
      magicTimersRef.current.forEach((t) => window.clearTimeout(t));
      magicTimersRef.current = [];
    };
  }, [story.slug, pageIndex]);

  // load saved progress when page or story changes
  useEffect(() => {
    const prog = getProgress(story.slug);
    // Prefere o mapa por página (persistência multi-página); usa o fills "legacy"
    // somente quando o registro existente é da mesma página atual.
    const fromPagesMap = prog?.pagesFills?.[pageIndex];
    if (fromPagesMap) {
      setFills(fromPagesMap);
    } else if (prog && prog.pageIndex === pageIndex) {
      setFills(prog.fills);
    } else {
      setFills({});
    }
    setHistory([]);
    setSaved(true);
  }, [story.slug, pageIndex]);

  // celebração ao concluir todas as páginas
  const celebratedRef = useRef<string | null>(null);
  // ─── DETECÇÃO IMEDIATA DE CONCLUSÃO (sem esperar o autosave) ─────────
  // Antes, `triggerStoryCompletion` lia `getStoryProgress(slug)` que
  // depende de `completedPages` no localStorage — só atualizado depois
  // do debounce de 500ms do autosave. Resultado: ao pintar a última
  // região, o modal de "história concluída" ficava preso por meio
  // segundo, e se o usuário navegasse antes disso, o modal nunca
  // disparava. Agora derivamos `done/total` em memória mesclando
  // `pagesFills` persistido com o `fills` corrente, usando a mesma
  // `computeStoryCompletedPages` (fonte única) — assim o cálculo
  // concorda com o que o autosave vai eventualmente persistir, sem
  // depender do timing dele.
  const computeFreshStoryProgress = useCallback(
    (currentFills: Record<string, string>) => {
      const total = story.pages.length;
      if (total === 0) return { done: 0, total: 0 };
      const persisted = getProgress(story.slug);
      const mergedPagesFills: Record<number, Record<string, string>> = {
        ...(persisted?.pagesFills ?? {}),
      };
      // Compat com registros antigos que só tinham `fills` + `pageIndex`.
      if (persisted && mergedPagesFills[persisted.pageIndex] === undefined && persisted.fills) {
        mergedPagesFills[persisted.pageIndex] = persisted.fills;
      }
      // Sobrepõe a página corrente com o estado em memória — é ele que
      // o usuário acabou de modificar e que o autosave vai gravar.
      mergedPagesFills[pageIndex] = currentFills;
      const done = computeStoryCompletedPages(story, mergedPagesFills).length;
      return { done, total };
    },
    [pageIndex, story],
  );

  const triggerStoryCompletion = useCallback(
    (freshFills?: Record<string, string>) => {
      const { done, total } = freshFills
        ? computeFreshStoryProgress(freshFills)
        : getStoryProgress(story.slug);
      if (
        isStoryComplete(done, total) &&
        celebratedRef.current !== story.slug &&
        !hasStoryCompletion(story.slug)
      ) {
        celebratedRef.current = story.slug;
        // Agrega o catálogo inteiro pela MESMA função usada em qualquer
        // tela de overview — um único `Math.round` no meio do caminho.
        const allStories = getActiveStories();
        // Para a história corrente usamos o `done` recém-calculado em
        // memória — o resto vem do localStorage.
        const { percent: overallPct } = catalogPercent(allStories, (i) => {
          const s = allStories[i]!;
          return s.slug === story.slug ? done : getStoryProgress(s.slug).done;
        });
        // Para detectar "milestone recém-cruzado" precisamos do percentual
        // anterior — recalculado pela mesma função, descontando a página
        // que acabou de fechar.
        const { percent: previousPct } = catalogPercent(allStories, (i) => {
          const s = allStories[i]!;
          const base = s.slug === story.slug ? done : getStoryProgress(s.slug).done;
          return Math.max(0, base - (s.slug === story.slug ? 1 : 0));
        });
        const unlockedMilestone = findUnlockedMilestone(previousPct, overallPct, MILESTONES)?.label;
        markStoryCompleted(story.slug);
        void persistStoryCompletion(story.slug, overallPct, unlockedMilestone);
        onStoryComplete?.({ overallPct, unlockedMilestone });
        celebrate();
        playFanfare();
      }
    },
    [computeFreshStoryProgress, onStoryComplete, story.slug],
  );

  // autosave (debounced) — single source of truth, no manual save button
  const isFirstFillsPassRef = useRef(true);
  useEffect(() => {
    if (isFirstFillsPassRef.current) {
      isFirstFillsPassRef.current = false;
      return;
    }
    setSaved(false);
    const t = setTimeout(() => {
      saveProgress({
        storySlug: story.slug,
        pageIndex,
        fills,
        updatedAt: Date.now(),
      });
      // Já disparamos imediatamente no effect abaixo; aqui só
      // reconfirmamos depois do save (cobre o caso raro de race com
      // outro consumidor que também escreve em `completedPages`).
      triggerStoryCompletion();
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
  }, [fills, pageIndex, story.slug, triggerStoryCompletion]);

  // reset the "first pass" guard when page/story changes so loaded fills don't trigger a save
  useEffect(() => {
    isFirstFillsPassRef.current = true;
  }, [story.slug, pageIndex]);

  useEffect(() => {
    triggerStoryCompletion();
  }, [triggerStoryCompletion]);

  // celebração ao concluir a imagem atual
  const celebratedPageRef = useRef<string | null>(null);
  useEffect(() => {
    const pageKey = `${story.slug}:${pageIndex}`;
    const currentPageSvg = story.pages[pageIndex]?.svg ?? "";
    const filledRegions = countFilledRegions(currentPageSvg, fills);
    const isCurrentPageComplete = pageCompletionState(currentPageSvg, fills).isComplete;

    if (totalFillRegions > 0 && isCurrentPageComplete && celebratedPageRef.current !== pageKey) {
      celebratedPageRef.current = pageKey;
      celebrateSubtle();
      playSparkle();
      // Calcula `done/total` em memória ANTES de chamar o callback para
      // que a UI consumidora (modal, toast) tenha o estado já atualizado
      // — sem esperar o autosave de 500ms gravar `completedPages`.
      const fresh = computeFreshStoryProgress(fills);
      onPageComplete?.({ pageIndex, storySlug: story.slug, done: fresh.done, total: fresh.total });
      // Se esta página fechou a história inteira, dispara o modal de
      // conclusão IMEDIATAMENTE — passando os fills correntes para o
      // cálculo concordar com `onPageComplete` acima.
      if (isStoryComplete(fresh.done, fresh.total)) {
        triggerStoryCompletion(fills);
      }
    }

    if (
      !isCurrentPageComplete &&
      filledRegions < totalFillRegions &&
      celebratedPageRef.current === pageKey
    ) {
      celebratedPageRef.current = null;
    }
  }, [
    fills,
    pageIndex,
    story.slug,
    story.pages,
    totalFillRegions,
    onPageComplete,
    computeFreshStoryProgress,
    triggerStoryCompletion,
  ]);

  const applyFill = useCallback((id: string) => {
    const activeColor = colorRef.current;
    // Updater funcional para que múltiplas pinturas enfileiradas no
    // mesmo batch (ex.: 3 `applyFill` em sequência num único event
    // handler) componham corretamente em vez de sobrescreverem-se.
    setHistory((h) => [...h.slice(-30), fillsRef.current]);
    setFills((f) => {
      const next = { ...f };
      if (activeColor === ERASER) {
        delete next[id];
      } else {
        next[id] = activeColor;
      }
      return next;
    });
    // ── Recálculo SÍNCRONO para o CTA aparecer no mesmo frame ──
    // Predizemos `next` a partir de `fillsRef.current` (snapshot pré-batch
    // — pode estar 1 update atrás se múltiplas pinturas forem enfileiradas
    // no mesmo handler). Para cobrir esse caso, chamamos `flushSync` com
    // um no-op SE essa pintura individualmente fechar a página segundo
    // o snapshot. Quando há batching (3 cliques no mesmo handler), o
    // último deles enxerga o estado já com os 2 anteriores via React 18
    // automatic batching — e o `flushSync` força o commit imediato.
    const fillable = fillableIdsRef.current;
    if (activeColor !== ERASER && fillable.size > 0 && fillable.has(id) && !fillsRef.current[id]) {
      // Só vale a pena verificar se a pintura atual é a última faltante.
      // Note que `fillsRef.current` ainda é o snapshot ANTERIOR — mas se
      // o React já flushou as anteriores no mesmo handler, ele estará
      // atualizado. Em SSR/jsdom o `flushSync` faz o commit acontecer
      // antes da próxima linha, então o `useEffect` que dispara
      // `onPageComplete` roda imediatamente.
      let willComplete = true;
      for (const validId of fillable) {
        if (validId === id) continue;
        if (!fillsRef.current[validId]) {
          willComplete = false;
          break;
        }
      }
      if (willComplete) {
        flushSync(() => {
          // no-op: força o React a comitar o `setFills` pendente AGORA,
          // garantindo que `useEffect`s (incluindo o de detecção de
          // conclusão) rodem síncrono no mesmo frame da última
          // pincelada.
        });
      }
    }
    if (activeColor !== ERASER) playPop();
  }, []);

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setFills(last);
      return h.slice(0, -1);
    });
  };

  const clearAll = useCallback(() => {
    if (Object.keys(fillsRef.current).length === 0) return;
    setHistory((h) => [...h.slice(-30), fillsRef.current]);
    setFills({});
  }, []);

  /**
   * Pinta automaticamente todas as áreas com as cores sugeridas, em cascata.
   * `suggestions` é o mapa { regionId: color } gerado por `suggestFillsFromSvg`.
   * `stepMs` controla o intervalo entre cada área pintada.
   *
   * IMPORTANTE — fonte única da verdade do "100%":
   * `suggestions` é construído por `suggestFillsFromSvg`, que por sua vez
   * usa `extractFillableRegionIds` (a mesma função que alimenta as
   * miniaturas e o trigger de "página concluída"). Portanto, pintar
   * EXATAMENTE essas chaves garante que ao final o conjunto de fills
   * corresponde ao denominador usado em `pagePercent` / `isPageComplete`
   * — nada de regex paralelo aqui.
   */
  const magicPaint = useCallback((suggestions: Record<string, string>, stepMs: number = 80) => {
    const entries = Object.entries(suggestions).filter(([, value]) => Boolean(value));
    if (entries.length === 0) {
      toast.error("Não foi possível aplicar a pintura mágica");
      return;
    }

    magicTimersRef.current.forEach((t) => window.clearTimeout(t));
    magicTimersRef.current = [];

    setHistory((h) => [...h.slice(-30), fillsRef.current]);
    setMagicPainting(true);

    entries.forEach(([id, fillColor], i) => {
      const handle = window.setTimeout(() => {
        const isLast = i === entries.length - 1;
        const apply = () => setFills((f) => ({ ...f, [id]: fillColor }));
        // Última pincelada da pintura mágica fecha a página → garante
        // que o badge/CTA aparecem no mesmo frame, sem esperar o React
        // agendar o re-render junto com o `setMagicPainting(false)`.
        if (isLast) flushSync(apply);
        else apply();
        playPop();
        if (isLast) {
          setMagicPainting(false);
          magicTimersRef.current = [];
          playSparkle();
          toast.success("✨ Pintura mágica aplicada!", { duration: 2200 });
        }
      }, i * stepMs);
      magicTimersRef.current.push(handle);
    });
  }, []);

  /**
   * Disparado pelo CTA "Verificar pintura" no canvas. Reusa a mesma
   * verificação imediata (`computeFreshStoryProgress` + callbacks) que o
   * autotrigger usa quando a última região é pintada — porém de forma
   * idempotente: pode ser chamado múltiplas vezes pelo usuário sem
   * efeitos colaterais (callbacks já são protegidos por refs e
   * proteções de toast por slug+página).
   *
   * Também limpa o `celebratedPageRef` antes para garantir que, mesmo
   * que o efeito automático já tenha rodado e o modal foi fechado, a
   * criança consiga reabrir manualmente — é o "botão de confirmação"
   * pedido pela UX para crianças.
   */
  const verifyCurrentPage = useCallback(() => {
    const currentPageSvg = story.pages[pageIndex]?.svg ?? "";
    if (!pageCompletionState(currentPageSvg, fillsRef.current).isComplete) return;
    // Permite reabrir o modal mesmo se já foi celebrado nesta sessão.
    celebratedPageRef.current = null;
    const fresh = computeFreshStoryProgress(fillsRef.current);
    onPageComplete?.({ pageIndex, storySlug: story.slug, done: fresh.done, total: fresh.total });
    if (isStoryComplete(fresh.done, fresh.total)) {
      // celebratedRef pode ter sido setado pelo autotrigger; reseta
      // para que a criança consiga reabrir o modal "história completa".
      celebratedRef.current = null;
      triggerStoryCompletion(fillsRef.current);
    }
  }, [
    computeFreshStoryProgress,
    onPageComplete,
    pageIndex,
    story.pages,
    story.slug,
    triggerStoryCompletion,
  ]);

  /**
   * "Já terminei" — botão de auto-conclusão pedido para crianças que
   * acharem que a página já está pronta visualmente, mas restem
   * detalhes técnicos minúsculos (olhinhos, sementes, contornos finos)
   * que não foram considerados pelo `pageCompletionState` mesmo com a
   * tolerância automática.
   *
   * Estratégia: pinta TODAS as regiões `missingIds` faltantes com a
   * cor atual da paleta (ou um cinza-suave neutro se a borracha estiver
   * selecionada — não faz sentido "apagar" para concluir). Depois deixa
   * o auto-trigger normal (efeito que escuta `fills`) detectar a
   * conclusão. Idempotente: se já estiver completa, apenas chama
   * `verifyCurrentPage`.
   */
  const forceCompleteCurrentPage = useCallback(() => {
    const currentPageSvg = story.pages[pageIndex]?.svg ?? "";
    const validation = validatePageProgress(currentPageSvg, fillsRef.current);
    if (validation.missingIds.length === 0) {
      verifyCurrentPage();
      return;
    }
    const activeColor = colorRef.current;
    const fillColor = activeColor === ERASER ? "#E5E7EB" : activeColor;
    setHistory((h) => [...h.slice(-30), fillsRef.current]);
    flushSync(() => {
      setFills((f) => {
        const next = { ...f };
        for (const id of validation.missingIds) {
          next[id] = fillColor;
        }
        return next;
      });
    });
    playSparkle();
    toast.success("✨ Página marcada como concluída!", { duration: 2200 });
  }, [pageIndex, story.pages, verifyCurrentPage]);

  return {
    color,
    setColor,
    fills,
    history,
    applyFill,
    undo,
    clearAll,
    saved,
    magicPaint,
    magicPainting,
    verifyCurrentPage,
    forceCompleteCurrentPage,
  };
}
