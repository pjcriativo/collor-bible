import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { getCategories, setCategories } from "@/lib/store";
import type { Category } from "@/lib/types";

export const Route = createFileRoute("/admin/categorias")({
  component: AdminCategoriesPage,
});

const COLORS: NonNullable<Category["color"]>[] = ["sky", "gold", "coral", "mint", "deep"];

function AdminCategoriesPage() {
  const cats = useStore(() => getCategories());
  const [draft, setDraft] = useState<Partial<Category>>({
    name: "",
    slug: "",
    emoji: "📖",
    color: "sky",
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name?.trim() || !draft.slug?.trim()) {
      toast.error("Preencha nome e slug");
      return;
    }
    const c: Category = {
      id: `c_${Date.now()}`,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      emoji: draft.emoji ?? "📖",
      color: draft.color ?? "sky",
    };
    setCategories([...cats, c]);
    setDraft({ name: "", slug: "", emoji: "📖", color: "sky" });
    toast.success("Categoria criada");
  };

  const remove = (id: string) => {
    if (!confirm("Remover categoria?")) return;
    setCategories(cats.filter((c) => c.id !== id));
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Categorias</h1>
      <p className="text-sm text-muted-foreground">Organize seu catálogo por temas.</p>

      <form
        onSubmit={add}
        className="mt-6 grid gap-3 rounded-2xl bg-card p-4 shadow-card sm:grid-cols-[1fr_1fr_80px_120px_auto]"
      >
        <input
          placeholder="Nome (ex: Heróis)"
          value={draft.name ?? ""}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          placeholder="slug"
          value={draft.slug ?? ""}
          onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          placeholder="🎨"
          value={draft.emoji ?? ""}
          onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
          className="rounded-xl border border-input bg-background px-3 py-2 text-center text-sm outline-none"
        />
        <select
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value as Category["color"] })}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
        >
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl">
                {c.emoji}
              </span>
              <div>
                <div className="font-display text-base font-bold">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  /{c.slug} · {c.color}
                </div>
              </div>
            </div>
            <button
              onClick={() => remove(c.id)}
              className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
