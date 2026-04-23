import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { CatalogColumnsToggle } from "@/components/catalog-columns-toggle";
import { catalogGridClass, useCatalogColumns } from "@/hooks/use-catalog-columns";
import { useStore } from "@/hooks/use-store";
import { useI18n } from "@/lib/i18n";
import { getActiveStories, getFavorites } from "@/lib/store";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [{ title: "Favoritos — Reino das Cores" }],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const slugs = useStore(() => getFavorites());
  // Deriva via `getActiveStories` (já localizado pelo idioma ativo) para que
  // os títulos dos favoritos atualizem ao trocar o idioma.
  const allStories = useStore(() => getActiveStories());
  const storyBySlug = new Map(allStories.map((s) => [s.slug, s] as const));
  const stories = slugs
    .map((s) => storyBySlug.get(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  // Densidade do catálogo (4 vs 5 colunas em ≥lg) — preferência por dispositivo.
  const { columns } = useCatalogColumns();

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t("favorites")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {stories.length === 0
            ? t("savedEmpty")
            : `${stories.length} ${stories.length === 1 ? t("savedOne") : t("savedMany")}`}
        </p>
      </header>

      {stories.length === 0 ? (
        <div className="mx-auto mt-12 max-w-md rounded-2xl bg-surface/70 p-10 text-center ring-1 ring-inset ring-white/[0.07] backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 ring-1 ring-white/[0.08]">
            <Heart className="h-6 w-6 text-coral" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("noFavorites")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("favoriteHint")}</p>
          <Link
            to="/home"
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02]"
          >
            {t("exploreStories")}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex justify-end">
            <CatalogColumnsToggle />
          </div>
          <div className={`mt-4 ${catalogGridClass(columns)}`}>
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
