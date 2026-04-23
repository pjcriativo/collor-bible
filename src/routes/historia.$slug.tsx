import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, Heart, Play, Sparkles } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { getProgress, getStoryBySlug, isFavorite, toggleFavorite } from "@/lib/store";
import { useI18n, useLanguageSwitching } from "@/lib/i18n";
import { useChildName } from "@/hooks/use-child-name";
import { useAddressStyle } from "@/hooks/use-address-style";
import { storyIntroEyebrow } from "@/lib/personalize";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historia/$slug")({
  loader: ({ params }) => {
    const story = getStoryBySlug(params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.story.title ?? "História"} — Reino das Cores` },
      { name: "description", content: loaderData?.story.description ?? "" },
      { property: "og:title", content: loaderData?.story.title ?? "" },
      { property: "og:description", content: loaderData?.story.description ?? "" },
      { property: "og:image", content: loaderData?.story.cover ?? "" },
    ],
  }),
  component: StoryDetailPage,
  notFoundComponent: StoryNotFound,
});

function StoryNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-lg">{t("storyNotFound")}</p>
      <Link to="/home" className="mt-4 inline-block text-primary underline">
        {t("backHome")}
      </Link>
    </div>
  );
}

function StoryDetailPage() {
  const { t, language } = useI18n();
  const { slug } = Route.useParams();
  const story = useStore(() => getStoryBySlug(slug));
  const fav = useStore(() => isFavorite(slug));
  const progress = useStore(() => getProgress(slug));
  // Bloqueia botões de navegação/ação durante a troca de idioma para
  // evitar inconsistência (texto antigo + tela nova já localizada).
  const langSwitching = useLanguageSwitching();
  // Saudação personalizada: aparece SÓ quando há nome salvo. O hook
  // já reage em tempo real a mudanças no /perfil (CustomEvent + storage),
  // então salvar o nome em outra aba/tela atualiza este header sem reload.
  const { childName } = useChildName();
  const { addressStyle } = useAddressStyle();
  const introEyebrow = storyIntroEyebrow(language, childName, addressStyle);

  if (!story) return null;

  const completed = new Set(progress?.completedPages ?? []);
  const lastPage = progress?.pageIndex ?? 0;
  const pct = story.pages.length > 0 ? Math.round((completed.size / story.pages.length) * 100) : 0;

  return (
    <main className="relative pb-20">
      {/* Hero cinematográfico full-bleed */}
      <section className="relative isolate overflow-hidden">
        {/* Background da capa, blur leve para virar atmosfera */}
        <div className="absolute inset-0 -z-10">
          <img
            src={story.cover}
            srcSet={`${story.coverMedium ?? story.cover} 640w, ${story.cover} 900w`}
            sizes="100vw"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className={cn(
              "h-full w-full scale-110 object-cover opacity-60 blur-2xl",
              story.slug === "a-multiplicacao-dos-paes" && "object-[center_12%]",
            )}
          />
          {/* Vignettes para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent md:via-background/30" />
        </div>

        <div className="px-5 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-8 lg:px-12">
          <Link
            to="/home"
            aria-label={t("backHome")}
            data-testid="story-back-link"
            aria-disabled={langSwitching}
            tabIndex={langSwitching ? -1 : undefined}
            onClick={(e) => {
              if (langSwitching) e.preventDefault();
            }}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full bg-surface/70 px-5 py-3 text-sm font-semibold text-foreground/85 ring-1 ring-inset ring-white/[0.07] backdrop-blur transition hover:bg-surface hover:text-foreground active:scale-95 sm:min-h-0 sm:px-3.5 sm:py-1.5 sm:text-xs",
              langSwitching && "pointer-events-none cursor-not-allowed opacity-60",
            )}
          >
            <ArrowLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
            {t("back")}
          </Link>

          <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[minmax(0,300px)_1fr] md:items-start md:gap-10 lg:grid-cols-[minmax(0,340px)_1fr]">
            {/* Capa em pôster 2:3 */}
            <div className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-white/[0.07] shadow-cinematic md:mx-0 md:max-w-none">
              <img
                src={story.cover}
                srcSet={`${story.coverSmall ?? story.cover} 320w, ${story.coverMedium ?? story.cover} 640w, ${story.cover} 900w`}
                sizes="(min-width: 1024px) 340px, (min-width: 768px) 300px, 260px"
                alt={story.title}
                decoding="async"
                fetchPriority="high"
                width={600}
                height={900}
                className={cn(
                  "aspect-[2/3] w-full object-cover",
                  story.slug === "a-multiplicacao-dos-paes" && "object-[center_12%]",
                )}
              />
              {story.isNew && (
                <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral backdrop-blur">
                  Novo
                </span>
              )}
            </div>

            {/* Coluna de conteúdo */}
            <div className="md:pt-2">
              {introEyebrow && (
                <p
                  data-testid="story-intro-eyebrow"
                  className="mt-4 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-primary sm:text-base"
                >
                  {introEyebrow}
                </p>
              )}
              <h1
                className={cn(
                  "font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl",
                  introEyebrow ? "mt-2" : "mt-4",
                )}
              >
                {story.title}
              </h1>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">{story.subtitle}</p>

              {/* Meta: idade + páginas */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{story.ageRange}</span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-foreground/20" />
                <span>
                  {story.pages.length}{" "}
                  {story.pages.length === 1 ? t("pageSingular") : t("pagePlural")}
                </span>
                {progress && (
                  <>
                    <span aria-hidden className="h-1 w-1 rounded-full bg-foreground/20" />
                    <span className="text-primary">{t("percentCompleted", { pct })}</span>
                  </>
                )}
              </div>

              {/* Descrição respirada */}
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-foreground/85 sm:text-base">
                {story.description}
              </p>

              {/* CTAs premium */}
              <div className="mt-7 grid grid-cols-2 items-center gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
                <Link
                  to="/colorir/$slug"
                  params={{ slug: story.slug }}
                  search={{ page: lastPage }}
                  aria-disabled={langSwitching}
                  tabIndex={langSwitching ? -1 : undefined}
                  onClick={(e) => {
                    if (langSwitching) e.preventDefault();
                  }}
                  className={cn(
                    "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-3 font-display text-xs font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] active:scale-[0.98] sm:gap-2 sm:px-7 sm:py-3.5 sm:text-[15px]",
                    langSwitching && "pointer-events-none cursor-not-allowed opacity-60",
                  )}
                >
                  <Play
                    className="h-3.5 w-3.5 shrink-0 fill-current sm:h-4 sm:w-4"
                    strokeWidth={2}
                  />
                  <span className="truncate">
                    {progress ? t("continueColoring") : t("startColoring")}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(slug)}
                  aria-pressed={fav}
                  disabled={langSwitching}
                  className={cn(
                    "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-surface/80 px-3 py-3 font-display text-xs font-semibold ring-1 ring-inset backdrop-blur transition hover:bg-surface sm:gap-2 sm:px-5 sm:py-3.5 sm:text-[15px] disabled:cursor-not-allowed disabled:opacity-60",
                    fav
                      ? "text-coral ring-coral/40"
                      : "text-foreground/90 ring-white/[0.08] hover:ring-white/15",
                  )}
                >
                  <Heart
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition sm:h-4 sm:w-4",
                      fav && "fill-coral text-coral",
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{fav ? t("favorited") : t("addFavorite")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: páginas para colorir */}
      <section className="mt-12 px-5 sm:mt-14 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("chooseScene")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("chooseSceneHint")}</p>
          </div>
          {progress && (
            <div className="shrink-0 text-right">
              <div className="font-display text-2xl font-extrabold leading-none text-primary sm:text-3xl">
                {completed.size}
                <span className="text-base font-bold text-muted-foreground">
                  /{story.pages.length}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t("colored")}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
          {story.pages.map((p, i) => {
            const isDone = completed.has(i);
            const isCurrent = progress != null && lastPage === i && !isDone;
            return (
              <Link
                key={p.id}
                to="/colorir/$slug"
                params={{ slug: story.slug }}
                search={{ page: i }}
                aria-label={
                  isDone
                    ? t("pageDone", { page: i + 1 })
                    : isCurrent
                      ? t("pageCurrent", { page: i + 1 })
                      : t("pageLabel", { page: i + 1 })
                }
                aria-disabled={langSwitching}
                tabIndex={langSwitching ? -1 : undefined}
                onClick={(e) => {
                  if (langSwitching) e.preventDefault();
                }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-surface ring-1 ring-inset shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated",
                  isDone
                    ? "ring-mint/40"
                    : isCurrent
                      ? "ring-coral/50"
                      : "ring-white/[0.06] hover:ring-white/[0.14]",
                  langSwitching && "pointer-events-none cursor-not-allowed opacity-60",
                )}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-white">
                  <div
                    className="h-full w-full p-3 [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: p.svg }}
                  />
                  {/* Número da página */}
                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur">
                    {i + 1}
                  </span>
                  {isDone && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-mint text-mint-foreground shadow-soft">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-foreground shadow-soft">
                      <Sparkles className="h-3 w-3" /> {t("here")}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "px-3 py-2.5 text-left text-[12px] font-semibold",
                    isDone ? "text-mint" : isCurrent ? "text-coral" : "text-muted-foreground",
                  )}
                >
                  {isDone ? t("done") : isCurrent ? t("continue") : t("pageLabel", { page: i + 1 })}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
