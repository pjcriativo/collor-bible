import { Link } from "@tanstack/react-router";
import { Heart, Trophy } from "lucide-react";
import { useState } from "react";
import type { Story } from "@/lib/types";
import { getStoryProgress, isFavorite, toggleFavorite } from "@/lib/store";
import { isStoryComplete, storyPercent } from "@/lib/coloring-progress";
import { useStore } from "@/hooks/use-store";
import { useI18n } from "@/lib/i18n";
import { useStoryCoverOverride } from "@/hooks/use-story-cover-override";
import { cn } from "@/lib/utils";

interface Props {
  story: Story;
  /**
   * Variante visual do card.
   * - "fluid" (padrão): ocupa 100% da coluna do container (grid mobile, grid desktop).
   * - "md" / "lg": largura fixa legada para usos pontuais (poster fixo).
   */
  size?: "fluid" | "md" | "lg";
}

export function StoryCard({ story, size = "fluid" }: Props) {
  const { t, localizeStory } = useI18n();
  const localizedStory = localizeStory(story);
  const fav = useStore(() => isFavorite(story.slug));
  const { done, total } = useStore(() => getStoryProgress(story.slug));
  // Fonte única — mesmas funções usadas pelo modal e pelo motor central.
  const pct = storyPercent(done, total);
  const isComplete = isStoryComplete(done, total);
  const [imgLoaded, setImgLoaded] = useState(false);
  const overrideCover = useStoryCoverOverride(story.slug);

  const widthClass = size === "lg" ? "w-72 md:w-80" : size === "md" ? "w-60 md:w-64" : "w-full";

  return (
    <Link
      to="/historia/$slug"
      params={{ slug: localizedStory.slug }}
      className={cn(
        // a11y/toque: `focus-visible:ring` com offset para destaque sem
        // sujar o estado normal; `active:scale` dá feedback tátil de
        // pressão; `touch-manipulation` evita o delay de 300ms em mobile.
        // Mínimo `min-h-[44px]` garante alvo confortável até em cards
        // muito apertados (grade de 5 colunas em laptops pequenos).
        "group relative block min-h-[44px] touch-manipulation overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-white/[0.05] shadow-card outline-none transition-all duration-300 ease-out",
        "active:scale-[0.97] active:shadow-card active:ring-primary/40",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "sm:duration-500 sm:hover:-translate-y-1.5 sm:hover:shadow-elevated sm:hover:ring-white/[0.12]",
        size === "fluid" ? "w-full" : "shrink-0",
        widthClass,
      )}
    >
      {/* Capa em formato pôster 2:3 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-2">
        {/* Skeleton shimmer enquanto a imagem carrega */}
        {!imgLoaded && (
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-2 via-surface to-surface-2"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent [animation:shimmer_1.8s_infinite]" />
          </div>
        )}
        <img
          src={overrideCover ?? story.cover}
          srcSet={
            overrideCover
              ? undefined
              : `${story.coverSmall ?? story.cover} 320w, ${story.coverMedium ?? story.cover} 640w, ${story.cover} 900w`
          }
          sizes={
            size === "fluid"
              ? "(min-width: 1024px) 20vw, (min-width: 640px) 28vw, 44vw"
              : "(min-width: 768px) 320px, 240px"
          }
          alt={localizedStory.title}
          loading="lazy"
          decoding="async"
          width={400}
          height={600}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500 ease-out",
            story.slug === "a-multiplicacao-dos-paes" && "object-[center_12%]",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
        {/* gradients sutis para legibilidade dos badges e da barra de progresso */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />

        {/* Badge superior direita — apenas quando concluído */}
        {isComplete && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow-gold">
            <Trophy className="h-3 w-3 fill-current" />
            {t("completed")}
          </span>
        )}

        {/* Botão de favorito — discreto top-left */}
        <button
          type="button"
          aria-label={fav ? t("removeFavorite") : t("addFavorite")}
          aria-pressed={fav}
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(localizedStory.slug);
          }}
          // 40x40 garante o mínimo de toque para crianças mesmo no card
          // mais estreito; foco visível com ring contrastante e feedback
          // de pressão (scale-90) que crianças reconhecem facilmente.
          className="absolute left-2.5 top-2.5 flex h-10 w-10 touch-manipulation items-center justify-center rounded-full bg-black/45 text-foreground/90 outline-none ring-1 ring-white/10 backdrop-blur-md transition-all duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Heart
            className={cn("h-4 w-4 transition", fav && "fill-coral text-coral")}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <div className="px-3 pb-3.5 pt-3 sm:px-4 sm:pb-4">
        <h3 className="font-display text-[13px] font-bold leading-tight tracking-tight text-foreground line-clamp-2 min-h-[2.4em] sm:text-[15px]">
          {localizedStory.title}
        </h3>

        {/* Barra de progresso abaixo da imagem (não mais sobreposta) */}
        {total > 0 && (
          <div className="mt-2.5">
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={`${done} de ${total} ${t("pagesColored")}`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isComplete ? "bg-primary" : "bg-coral",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
