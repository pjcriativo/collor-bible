import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { CatalogColumnsToggle } from "@/components/catalog-columns-toggle";
import { catalogGridClass, useCatalogColumns } from "@/hooks/use-catalog-columns";
import { useStore } from "@/hooks/use-store";
import { getCategoryBySlug, getStoriesByCategory } from "@/lib/store";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const dotColorMap: Record<NonNullable<Category["color"]>, string> = {
  sky: "bg-sky",
  gold: "bg-gold",
  coral: "bg-coral",
  mint: "bg-mint",
  deep: "bg-sky",
};

const glowColorMap: Record<NonNullable<Category["color"]>, string> = {
  sky: "shadow-[0_0_24px_-4px_var(--color-sky)]",
  gold: "shadow-[0_0_24px_-4px_var(--color-gold)]",
  coral: "shadow-[0_0_24px_-4px_var(--color-coral)]",
  mint: "shadow-[0_0_24px_-4px_var(--color-mint)]",
  deep: "shadow-[0_0_24px_-4px_var(--color-sky)]",
};

export const Route = createFileRoute("/categorias/$slug")({
  loader: ({ params }) => {
    const cat = getCategoryBySlug(params.slug);
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.cat.name ?? "Categoria"} — Reino das Cores` },
      {
        name: "description",
        content:
          loaderData?.cat.description ?? `Histórias bíblicas da categoria ${loaderData?.cat.name}.`,
      },
      {
        property: "og:title",
        content: `${loaderData?.cat.name ?? "Categoria"} — Reino das Cores`,
      },
      {
        property: "og:description",
        content:
          loaderData?.cat.description ?? `Histórias bíblicas da categoria ${loaderData?.cat.name}.`,
      },
    ],
  }),
  component: CategoryDetail,
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-foreground">Categoria não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">A categoria que você procura não existe.</p>
      <Link
        to="/categorias"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02]"
      >
        Ver todas as categorias
      </Link>
    </main>
  ),
});

function CategoryDetail() {
  const { slug } = Route.useParams();
  const cat = useStore(() => getCategoryBySlug(slug));
  const stories = useStore(() => getStoriesByCategory(slug));
  // Densidade do catálogo (4 vs 5 colunas em ≥lg) — preferência por dispositivo.
  const { columns } = useCatalogColumns();

  if (!cat) return null;

  const color = cat.color ?? "sky";
  const dot = dotColorMap[color];
  const glow = glowColorMap[color];

  return (
    <main className="pb-16">
      {/* HERO da categoria — cinematográfico, cor temática, sem imagem */}
      <section className="relative overflow-hidden">
        {/* Glow orgânico atrás do título usando a cor da categoria */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl sm:h-[560px] sm:w-[560px]",
            dot,
          )}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"
        />

        <div className="relative px-5 pt-8 sm:px-8 sm:pt-12 lg:px-12 lg:pt-16">
          <Link
            to="/categorias"
            className="inline-flex items-center gap-2 rounded-full bg-surface/70 px-3.5 py-1.5 text-xs font-semibold text-foreground/85 ring-1 ring-inset ring-white/[0.07] backdrop-blur transition hover:bg-surface hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Categorias
          </Link>

          <div className="mt-8 flex flex-col items-start gap-6 sm:mt-10 sm:flex-row sm:items-center sm:gap-8">
            {/* Selo grande com emoji + bolinha colorida */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-surface text-4xl ring-1 ring-inset ring-white/[0.08] shadow-cinematic sm:h-24 sm:w-24 sm:text-5xl">
              {cat.emoji ?? "✨"}
              <span
                aria-hidden
                className={cn(
                  "absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full ring-2 ring-background",
                  dot,
                  glow,
                )}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]",
                  color === "gold" && "text-gold",
                  color === "coral" && "text-coral",
                  color === "mint" && "text-mint",
                  (color === "sky" || color === "deep") && "text-sky",
                )}
              >
                <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                Categoria
              </p>
              <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {cat.name}
              </h1>
              {cat.description && (
                <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                  {cat.description}
                </p>
              )}
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {stories.length}{" "}
                {stories.length === 1 ? "história disponível" : "histórias disponíveis"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de histórias — mesmo padrão premium da home */}
      <section className="px-5 pt-10 sm:px-8 sm:pt-12 lg:px-12">
        {stories.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl bg-surface/70 p-10 text-center ring-1 ring-inset ring-white/[0.07] backdrop-blur">
            <h2 className="font-display text-lg font-bold text-foreground">Em breve</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ainda não temos histórias nesta categoria. Volte logo!
            </p>
            <Link
              to="/categorias"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02]"
            >
              Ver outras categorias
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex justify-end">
              <CatalogColumnsToggle />
            </div>
            <div className={catalogGridClass(columns)}>
              {stories.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
