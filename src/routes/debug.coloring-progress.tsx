import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { STORY_PAGES } from "@/lib/coloring-pages";
import {
  countFillableRegions,
  extractFillableRegionIds,
  inspectFillableRegions,
  pagePercent,
  validatePageProgress,
} from "@/lib/coloring-progress";

/**
 * Página de debug interna — NÃO LISTADA na navegação.
 *
 * Para cada história e cada página, mostra:
 *  - quantos `id="fill-*"` o SVG declara no total;
 *  - quais foram CONTADOS como preenchíveis (denominador do %);
 *  - quais foram EXCLUÍDOS, com o motivo (`fill="white"` decorativo,
 *    `fill="none"` técnico, etc.).
 *
 * A fonte da verdade é `extractFillableRegionIds` (mesma função usada
 * por miniaturas, badge "Concluída" e pintura mágica), então o que
 * aparece aqui REFLETE EXATAMENTE o que conta para os 100%.
 */
export const Route = createFileRoute("/debug/coloring-progress")({
  head: () => ({
    meta: [
      { title: "Debug · Regiões preenchíveis por página" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DebugColoringProgressPage,
});

type StorySummary = {
  slug: string;
  pages: Array<{
    pageIndex: number;
    totalIds: number;
    fillableCount: number;
    excludedCount: number;
    inspection: ReturnType<typeof inspectFillableRegions>;
    fullSetPercent: number;
    validation: ReturnType<typeof validatePageProgress>;
  }>;
};

function DebugColoringProgressPage() {
  const stories: StorySummary[] = useMemo(() => {
    return Object.entries(STORY_PAGES).map(([slug, pages]) => ({
      slug,
      pages: pages.map((svg, pageIndex) => {
        const inspection = inspectFillableRegions(svg);
        const fillable = extractFillableRegionIds(svg);
        // Sanity check exibido na UI: pintar TODOS os IDs incluídos
        // deve dar 100%. Se não der, é sinal de que algo divergiu.
        const allFills = Object.fromEntries(Array.from(fillable).map((id) => [id, "#A7D89A"]));
        return {
          pageIndex,
          totalIds: inspection.included.length + inspection.excluded.length,
          fillableCount: countFillableRegions(svg),
          excludedCount: inspection.excluded.length,
          inspection,
          fullSetPercent: pagePercent(svg, allFills),
          // Sanity check com o set completo: deve sempre dar `ok=true`,
          // 0 inválidos e 0 ausentes. Se algo aqui ficar vermelho na
          // tela de debug, é sinal de que `extractFillableRegionIds` e
          // `validatePageProgress` divergiram — bug de fonte única.
          validation: validatePageProgress(svg, allFills),
        };
      }),
    }));
  }, []);

  const [openSlug, setOpenSlug] = useState<string | null>(stories[0]?.slug ?? null);
  const [filter, setFilter] = useState("");

  const visibleStories = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter((s) => s.slug.toLowerCase().includes(q));
  }, [stories, filter]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">
          Debug · Regiões preenchíveis
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Para cada página, mostramos quais IDs{" "}
          <code className="rounded bg-muted px-1">fill-*</code> contam para o cálculo de 100% e
          quais foram excluídos (e por quê). A fonte da verdade é a mesma função usada nas
          miniaturas, no badge &quot;Concluída&quot; e na pintura mágica.
        </p>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por slug da história…"
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm shadow-soft outline-none focus:ring-2 focus:ring-primary md:max-w-sm"
        />
      </header>

      <ul className="space-y-3">
        {visibleStories.map((story) => {
          const isOpen = openSlug === story.slug;
          const totalFillable = story.pages.reduce((acc, p) => acc + p.fillableCount, 0);
          const totalExcluded = story.pages.reduce((acc, p) => acc + p.excludedCount, 0);
          const allOk = story.pages.every((p) => p.fullSetPercent === 100);
          return (
            <li
              key={story.slug}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
            >
              <button
                type="button"
                onClick={() => setOpenSlug(isOpen ? null : story.slug)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                aria-expanded={isOpen}
              >
                <div className="min-w-0">
                  <div className="font-display text-base font-bold text-foreground">
                    {story.slug}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {story.pages.length} página(s) · {totalFillable} preenchíveis · {totalExcluded}{" "}
                    excluídos
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    allOk
                      ? "bg-mint text-mint-foreground"
                      : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {allOk ? "OK · 100% atingível" : "⚠ divergência"}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-background/60 p-4">
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {story.pages.map((p) => (
                      <li
                        key={p.pageIndex}
                        className="rounded-xl border border-border bg-card p-3"
                        data-testid={`debug-page-${story.slug}-${p.pageIndex}`}
                      >
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <h2 className="font-display text-sm font-bold text-foreground">
                            Página {p.pageIndex + 1}
                          </h2>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              p.fullSetPercent === 100
                                ? "bg-mint text-mint-foreground"
                                : "bg-destructive text-destructive-foreground"
                            }`}
                            data-testid={`debug-percent-${story.slug}-${p.pageIndex}`}
                          >
                            {p.fullSetPercent}% com set completo
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.totalIds} ids no SVG · {p.fillableCount} contam · {p.excludedCount}{" "}
                          excluídos
                        </div>

                        <div
                          className={`mt-2 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                            p.validation.ok
                              ? "bg-mint/30 text-foreground"
                              : "bg-destructive/15 text-destructive"
                          }`}
                          data-testid={`debug-validation-${story.slug}-${p.pageIndex}`}
                        >
                          Validação: {p.validation.painted}/{p.validation.totalValid} pintadas ·{" "}
                          {p.validation.invalidPaintedIds.length} inválidas ·{" "}
                          {p.validation.missingIds.length} ausentes
                        </div>

                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-foreground">
                            ✓ Incluídos ({p.inspection.included.length})
                          </summary>
                          <ul className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-[11px] leading-snug">
                            {p.inspection.included.map((id) => (
                              <li key={id}>{id}</li>
                            ))}
                            {p.inspection.included.length === 0 && (
                              <li className="text-muted-foreground">(nenhum)</li>
                            )}
                          </ul>
                        </details>

                        <details className="mt-2" open={p.inspection.excluded.length > 0}>
                          <summary className="cursor-pointer text-xs font-semibold text-foreground">
                            ✗ Excluídos ({p.inspection.excluded.length})
                          </summary>
                          <ul className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-[11px] leading-snug">
                            {p.inspection.excluded.map((item) => (
                              <li key={item.id} data-testid={`debug-excluded-${item.id}`}>
                                <span className="text-foreground">{item.id}</span>
                                <span className="ml-2 text-muted-foreground">— {item.reason}</span>
                              </li>
                            ))}
                            {p.inspection.excluded.length === 0 && (
                              <li className="text-muted-foreground">(nenhum)</li>
                            )}
                          </ul>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
