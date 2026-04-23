import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Story } from "@/lib/types";
import { StoryCard } from "./story-card";

interface Props {
  title: string;
  subtitle?: string;
  stories: Story[];
}

const PAGE_SIZE_DESKTOP = 5;

export function StoryRow({ title, subtitle, stories }: Props) {
  // Mobile: grid 2 colunas (sem scroll horizontal). Desktop: paginação em blocos de 6.
  const desktopRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE_DESKTOP));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  // Reset page se a lista encurtar
  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  if (stories.length === 0) return null;

  return (
    <section className="mt-12 sm:mt-16">
      {/* Header da seção — full-bleed com respiros laterais menores */}
      <div className="px-5 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[28px]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground sm:text-[15px]">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE: grid de 2 colunas, sem scroll horizontal */}
      <div className="mt-5 grid grid-cols-2 gap-4 px-5 sm:hidden">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} />
        ))}
      </div>

      {/* DESKTOP: paginação em blocos de 5, full-bleed ponta-a-ponta */}
      <div className="relative mt-6 hidden px-8 sm:block lg:px-12">
        <div
          ref={desktopRef}
          className="group/row relative overflow-x-hidden overflow-y-visible pt-3"
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: totalPages }).map((_, pageIdx) => (
              <div key={pageIdx} className="grid w-full shrink-0 grid-cols-5 gap-5 pb-4 lg:gap-6">
                {stories
                  .slice(pageIdx * PAGE_SIZE_DESKTOP, (pageIdx + 1) * PAGE_SIZE_DESKTOP)
                  .map((s) => (
                    <div key={s.id} className="min-w-0">
                      <StoryCard story={s} />
                    </div>
                  ))}
              </div>
            ))}
          </div>

          {/* Setas sobrepostas, estilo Netflix (sem fade nas bordas) */}
          {canPrev && (
            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="absolute left-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-foreground opacity-0 ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 hover:bg-black/80 hover:scale-105 group-hover/row:opacity-100"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
          )}
          {canNext && (
            <button
              type="button"
              aria-label="Próxima página"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="absolute right-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-foreground opacity-0 ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 hover:bg-black/80 hover:scale-105 group-hover/row:opacity-100"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
