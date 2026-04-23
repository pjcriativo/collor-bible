/**
 * Hook que orquestra o cache local de PNGs das miniaturas.
 *
 * Como funciona:
 *  1. Recebe uma lista de SVG strings (as miniaturas brutas).
 *  2. Extrai todas as URLs de `<image href="...">`.
 *  3. Pré-aquece o cache (IDB) em paralelo.
 *  4. À medida que cada URL fica disponível como `blob:` em memória, força
 *     um re-render reescrevendo os hrefs nos SVGs retornados.
 *
 * O componente consumidor recebe `cachedSvgs` no lugar dos SVGs originais
 * — tudo o que muda é que `<image href>` aponta pra `blob:` local.
 *
 * Importante: este cache é por-sessão para os object URLs (criados via
 * `URL.createObjectURL`); o BLOB em si persiste no IDB entre sessões.
 * Na primeira visita do usuário a uma história, vê-se um pequeno delay até
 * o IDB ser populado; na segunda visita, hits instantâneos.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ensureCachedImageUrl,
  extractImageHrefs,
  rewriteSvgImageHrefs,
} from "@/lib/thumbnail-image-cache";

export function useThumbnailImageCache(svgs: string[]): string[] {
  // `tick` é incrementado toda vez que uma nova URL é resolvida no cache
  // de memória — força re-derivação de `cachedSvgs` sem precisar guardar
  // os SVGs já reescritos no estado.
  const [tick, setTick] = useState(0);

  const allHrefs = useMemo(() => {
    const set = new Set<string>();
    for (const svg of svgs) {
      for (const href of extractImageHrefs(svg)) set.add(href);
    }
    return [...set];
  }, [svgs]);

  useEffect(() => {
    if (allHrefs.length === 0) return;
    let canceled = false;
    let pending = 0;

    // Resolve todas em paralelo. Cada conclusão dispara um único re-render
    // (debounced por microtask) — assim em histórias com 30 thumbs não
    // disparamos 30 re-renders consecutivos.
    let scheduled = false;
    const scheduleTick = () => {
      if (scheduled || canceled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (!canceled) setTick((t) => t + 1);
      });
    };

    for (const url of allHrefs) {
      pending++;
      ensureCachedImageUrl(url)
        .then((resolved) => {
          if (canceled) return;
          // Só re-renderizamos se o cache REALMENTE devolveu algo diferente
          // do href original (caso contrário não há ganho — mantemos calmo).
          if (resolved !== url) scheduleTick();
        })
        .catch(() => {
          /* fallback silencioso — href original continua válido */
        })
        .finally(() => {
          pending--;
        });
    }

    return () => {
      canceled = true;
    };
  }, [allHrefs]);

  return useMemo(
    () => svgs.map((svg) => rewriteSvgImageHrefs(svg)),
    // `tick` precisa estar nas deps pra forçar re-derivação quando novas
    // URLs entram no cache de memória.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [svgs, tick],
  );
}
