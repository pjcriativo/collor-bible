import { createFileRoute } from "@tanstack/react-router";
import { CategoryTile } from "@/components/category-chip";
import { useStore } from "@/hooks/use-store";
import { getCategories, getStoriesByCategory } from "@/lib/store";

export const Route = createFileRoute("/categorias/")({
  head: () => ({
    meta: [
      { title: "Categorias — Reino das Cores" },
      {
        name: "description",
        content: "Explore histórias bíblicas por tema, personagens e épocas.",
      },
      { property: "og:title", content: "Categorias — Reino das Cores" },
      {
        property: "og:description",
        content: "Explore histórias bíblicas por tema, personagens e épocas.",
      },
    ],
  }),
  component: CategoriesIndex,
});

function CategoriesIndex() {
  const categories = useStore(() => getCategories());
  const total = categories.length;

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Categorias
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Encontre histórias por tema, personagens e épocas bíblicas
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {total} {total === 1 ? "categoria" : "categorias"} disponíveis
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
        {categories.map((c) => (
          <CategoryTile key={c.id} category={c} count={getStoriesByCategory(c.slug).length} />
        ))}
      </div>
    </main>
  );
}
