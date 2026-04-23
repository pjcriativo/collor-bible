import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HeroBanner } from "@/components/hero-banner";
import { StoryRow } from "@/components/story-row";
import { useStore } from "@/hooks/use-store";
import { getActiveStories, getAllProgress, getBanners, getFavorites } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import type { Banner } from "@/lib/types";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Início — Reino das Cores" },
      { name: "description", content: "Catálogo premium de histórias da Bíblia para colorir." },
    ],
  }),
  component: HomePage,
});

const ROTATION_INTERVAL_MS = 7_000;

function HomePage() {
  const { t, localizeStory } = useI18n();
  const banners = useStore(() => getBanners().filter((b) => b.active));
  const allStories = useStore(() => getActiveStories());
  const favoritesSlugs = useStore(() => getFavorites());
  const progress = useStore(() => getAllProgress());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Deriva favoritos e "continue" a partir de `allStories` (já localizado
  // pelo idioma ativo via `useStore`) — assim trocar de idioma re-renderiza
  // os títulos sem precisar recarregar a página.
  const storyBySlug = new Map(allStories.map((s) => [s.slug, s] as const));

  const favoriteStories = favoritesSlugs
    .map((s) => storyBySlug.get(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const continueStories = isMounted
    ? [...progress]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((p) => storyBySlug.get(p.storySlug))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .slice(0, 12)
    : [];

  // Slugs ocultos em linhas específicas da home (não remove das categorias).
  const HIDDEN_FROM_NEW_TESTAMENT = new Set(["o-filho-prodigo", "a-ovelha-perdida"]);
  const HIDDEN_FROM_PARABLES = new Set(["o-bom-samaritano"]);

  const parables = allStories.filter(
    (s) => s.categoryIds?.includes("c4") && !HIDDEN_FROM_PARABLES.has(s.slug),
  );

  const [heroIndex, setHeroIndex] = useState(0);
  const heroItems = useMemo(() => {
    const bannersBySlug = new Map(banners.map((banner) => [banner.storySlug, banner]));
    return [...allStories]
      .sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          (b.loved ?? 0) - (a.loved ?? 0),
      )
      .map((story) => {
        const localized = localizeStory(story);
        return {
          story,
          banner: bannersBySlug.get(story.slug) ?? {
            id: `hero-${story.slug}`,
            storySlug: story.slug,
            headline: localized.title,
            subline: localized.subtitle ?? localized.shortDescription,
            active: true,
          },
        } satisfies { story: typeof story; banner: Banner };
      });
  }, [allStories, banners, localizeStory]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroItems.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [heroItems.length]);

  const heroItem = heroItems[heroIndex] ?? heroItems[0];

  return (
    <main className="relative pb-16">
      {heroItem && (
        <div key={heroItem.story.id} className="relative animate-in fade-in duration-700">
          <HeroBanner banner={heroItem.banner} story={heroItem.story} />
        </div>
      )}

      {continueStories.length > 0 && (
        <StoryRow
          title={t("continueColoring")}
          subtitle={t("whereStopped")}
          stories={continueStories}
        />
      )}

      <StoryRow
        title={t("oldTestament")}
        subtitle={t("faithAdventures")}
        stories={allStories.filter((s) => s.testament === "antigo")}
      />

      <StoryRow
        title={t("newTestament")}
        subtitle={t("jesusTeachings")}
        stories={allStories.filter(
          (s) => s.testament === "novo" && !HIDDEN_FROM_NEW_TESTAMENT.has(s.slug),
        )}
      />

      {parables.length > 0 && (
        <StoryRow title={t("parables")} subtitle={t("parablesSub")} stories={parables} />
      )}

      {favoriteStories.length > 0 && (
        <StoryRow
          title={t("yourFavorites")}
          subtitle={t("favoriteStories")}
          stories={favoriteStories}
        />
      )}
    </main>
  );
}
