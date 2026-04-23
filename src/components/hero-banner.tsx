import { Link } from "@tanstack/react-router";
import { Play, Sparkles } from "lucide-react";
import type { Banner, Story } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useStoryCoverOverride } from "@/hooks/use-story-cover-override";

interface Props {
  banner: Banner;
  story: Story;
}

export function HeroBanner({ banner, story }: Props) {
  const { language, t, localizeStory } = useI18n();
  const localizedStory = localizeStory(story);
  const overrideCover = useStoryCoverOverride(story.slug);
  const headline =
    language === "pt-BR" ? banner.headline || localizedStory.title : localizedStory.title;
  const subline =
    language === "pt-BR" ? banner.subline || localizedStory.subtitle : localizedStory.subtitle;
  return (
    <section className="relative w-full">
      <div className="relative w-full overflow-hidden">
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
          {/* Imagem de fundo full-bleed cinematográfica */}
          <img
            src={overrideCover ?? localizedStory.cover}
            srcSet={
              overrideCover
                ? undefined
                : `${localizedStory.coverMedium ?? localizedStory.cover} 640w, ${localizedStory.cover} 900w`
            }
            sizes="100vw"
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Overlay duplo: vinheta vertical + horizontal para legibilidade */}
          <div className="absolute inset-0 bg-gradient-vignette" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* Conteúdo */}
          <div className="absolute inset-0 flex items-end">
            <div className="w-full px-5 pb-10 sm:px-8 sm:pb-14 lg:px-12 lg:pb-20">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3 w-3" /> {t("featured")}
                </span>
                <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  {headline}
                </h1>
                <p className="mt-4 max-w-xl text-base text-foreground/80 sm:text-lg">{subline}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/historia/$slug"
                    params={{ slug: localizedStory.slug }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-display text-[15px] font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Play className="h-[18px] w-[18px] fill-current" />
                    {t("colorNow")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
