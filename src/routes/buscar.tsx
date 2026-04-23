import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { useStore } from "@/hooks/use-store";
import { CatalogColumnsToggle } from "@/components/catalog-columns-toggle";
import { catalogGridClass, useCatalogColumns } from "@/hooks/use-catalog-columns";
import { useI18n } from "@/lib/i18n";
import { getActiveStories, searchStories } from "@/lib/store";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [{ title: "Buscar — Reino das Cores" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const all = useStore(() => getActiveStories());
  const results = q.trim() ? searchStories(q) : all;
  const hasQuery = q.trim().length > 0;
  // Densidade do catálogo (4 vs 5 colunas em ≥lg). Persistida por
  // dispositivo via `useCatalogColumns` (localStorage + sync cross-tab).
  const { columns } = useCatalogColumns();

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t("searchStories")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("searchHint")}</p>
      </header>

      <div className="group mt-7 flex items-center gap-3 rounded-full bg-surface/80 px-5 py-3.5 ring-1 ring-inset ring-white/[0.07] backdrop-blur transition focus-within:ring-primary/50 focus-within:bg-surface">
        <Search className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Limpar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {hasQuery
            ? `${results.length} ${results.length === 1 ? t("result") : t("results")} para “${q.trim()}”`
            : `${results.length} ${results.length === 1 ? t("availableOne") : t("availableMany")}`}
        </p>
        <CatalogColumnsToggle />
      </div>

      {results.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-2xl bg-surface/70 p-10 text-center ring-1 ring-inset ring-white/[0.07] backdrop-blur">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 ring-1 ring-white/[0.08]">
            <Search className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("noStoryFound")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("tryAnother")}</p>
        </div>
      ) : (
        <div className={`mt-5 ${catalogGridClass(columns)}`}>
          {results.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      )}
    </main>
  );
}
