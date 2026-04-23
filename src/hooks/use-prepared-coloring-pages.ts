/**
 * Hook que prepara as páginas Pixar (PNG line art) de uma história para uso
 * no `<ColoringCanvas>` SVG existente. Pipeline:
 *   1. Detecta páginas com `data-png-url` no SVG raw (vindo de `STORY_PAGES`).
 *   2. Pra cada PNG: carrega + segmenta (flood fill) + vetoriza (marching
 *      squares) cada região fechada → cache em IndexedDB + memória.
 *   3. Monta um SVG final com `<image>` (PNG visual) + `<path id="fill-png-N">`
 *      por região com contorno exato. O `<ColoringCanvas>` trata como SVG
 *      normal e o usuário pinta com pixel-perfect accuracy.
 *
 * Estratégia de prioridade (importante para UX):
 *   - A página ATUAL (`activeIndex`) é processada IMEDIATAMENTE com prioridade
 *     máxima — o usuário vê o loading só por 1-2s.
 *   - Páginas VIZINHAS (±1) começam logo em seguida (pré-fetch).
 *   - Páginas distantes ficam numa fila com concorrência limitada (2 por vez)
 *     pra não travar a CPU enquanto o usuário pinta.
 *
 * IMPORTANTE: isto roda APENAS no client (depende de canvas/IndexedDB).
 * Durante SSR retornamos as páginas raw (com `<image>` apenas, sem regiões
 * pintáveis).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { buildPaintableSvgFromSegmentation, getSegmentationForUrl } from "@/lib/png-segmentation";
import { extractPngUrl } from "@/lib/coloring-pages-davi-png";
import type { Story } from "@/lib/types";

type PreparedPagesState = {
  preparedSvgs: string[];
  preparingIndices: Set<number>;
  hasPngPages: boolean;
  failedIndices: Set<number>;
};

/** Quantas segmentações pesadas (não-prioritárias) podem rodar em paralelo.
 *  Com 30+ páginas, deixar tudo em paralelo trava a thread principal e a
 *  página ATUAL fica esperando junto com as outras. 2 é um bom equilíbrio. */
const BACKGROUND_CONCURRENCY = 2;

export function usePreparedColoringPages(
  story: Story | null,
  activeIndex: number = 0,
): PreparedPagesState {
  const rawSvgs = useMemo(() => story?.pages.map((p) => p.svg) ?? [], [story]);
  const pngIndices = useMemo(() => {
    const out: number[] = [];
    rawSvgs.forEach((svg, i) => {
      if (extractPngUrl(svg)) out.push(i);
    });
    return out;
  }, [rawSvgs]);

  const [preparedSvgs, setPreparedSvgs] = useState<string[]>(rawSvgs);
  const [preparingIndices, setPreparingIndices] = useState<Set<number>>(() => new Set(pngIndices));
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  // Track quais índices já foram disparados para não reprocessar.
  const dispatchedRef = useRef<Set<number>>(new Set());

  // Reset quando a história muda.
  useEffect(() => {
    setPreparedSvgs(rawSvgs);
    setPreparingIndices(new Set(pngIndices));
    setFailedIndices(new Set());
    dispatchedRef.current = new Set();
  }, [rawSvgs, pngIndices]);

  // Processa páginas com prioridade dinâmica: ativa primeiro, depois vizinhas,
  // depois o resto com concorrência limitada.
  useEffect(() => {
    if (pngIndices.length === 0) return;
    let canceled = false;

    const processOne = async (idx: number) => {
      if (dispatchedRef.current.has(idx)) return;
      dispatchedRef.current.add(idx);
      const svg = rawSvgs[idx];
      if (!svg) return;
      const pngUrl = extractPngUrl(svg);
      if (!pngUrl) return;

      try {
        const seg = await getSegmentationForUrl(pngUrl);
        if (canceled) return;
        const finalSvg = buildPaintableSvgFromSegmentation(seg, pngUrl);
        setPreparedSvgs((prev) => {
          const next = [...prev];
          next[idx] = finalSvg;
          return next;
        });
        setPreparingIndices((prev) => {
          if (!prev.has(idx)) return prev;
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      } catch (err) {
        if (canceled) return;
        console.warn(`[png-prepare] Falha ao segmentar página ${idx}:`, err);
        setPreparingIndices((prev) => {
          if (!prev.has(idx)) return prev;
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
        setFailedIndices((prev) => {
          const next = new Set(prev);
          next.add(idx);
          return next;
        });
      }
    };

    // Ordena: primeiro a página ativa, depois ±1, ±2... pra que a fila
    // background sempre puxe o que está mais próximo do usuário.
    const sortedByPriority = [...pngIndices].sort(
      (a, b) => Math.abs(a - activeIndex) - Math.abs(b - activeIndex),
    );

    // 1. Dispara a página ativa IMEDIATAMENTE, fora da fila.
    const activeIdx = sortedByPriority[0];
    if (activeIdx !== undefined && !dispatchedRef.current.has(activeIdx)) {
      void processOne(activeIdx);
    }

    // 2. Worker pool para o resto, com concorrência limitada.
    const queue = sortedByPriority.slice(1).filter((i) => !dispatchedRef.current.has(i));
    let queueIdx = 0;

    const worker = async () => {
      while (!canceled && queueIdx < queue.length) {
        const myIdx = queue[queueIdx++]!;
        await processOne(myIdx);
        // Cede o thread entre tarefas pra não bloquear interação.
        await new Promise<void>((r) => {
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => r(), { timeout: 200 });
          } else {
            setTimeout(r, 0);
          }
        });
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < BACKGROUND_CONCURRENCY; i++) {
      workers.push(worker());
    }

    return () => {
      canceled = true;
    };
  }, [pngIndices, rawSvgs, activeIndex]);

  return {
    preparedSvgs,
    preparingIndices,
    hasPngPages: pngIndices.length > 0,
    failedIndices,
  };
}
