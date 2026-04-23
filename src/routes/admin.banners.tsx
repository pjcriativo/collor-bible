import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { getBanners, getStories, setBanners } from "@/lib/store";
import type { Banner } from "@/lib/types";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBannersPage,
});

function AdminBannersPage() {
  const banners = useStore(() => getBanners());
  const stories = useStore(() => getStories());
  const [draft, setDraft] = useState<Partial<Banner>>({
    headline: "",
    subline: "",
    storySlug: stories[0]?.slug ?? "",
    active: true,
  });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.headline?.trim() || !draft.storySlug) {
      toast.error("Preencha o título e escolha uma história");
      return;
    }
    const b: Banner = {
      id: `b_${Date.now()}`,
      headline: draft.headline.trim(),
      subline: draft.subline?.trim() ?? "",
      storySlug: draft.storySlug,
      active: draft.active ?? true,
    };
    setBanners([...banners, b]);
    setDraft({ headline: "", subline: "", storySlug: stories[0]?.slug ?? "", active: true });
    toast.success("Banner criado");
  };

  const toggle = (id: string) => {
    setBanners(banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  };
  const remove = (id: string) => {
    if (!confirm("Remover banner?")) return;
    setBanners(banners.filter((b) => b.id !== id));
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Banners da home</h1>
      <p className="text-sm text-muted-foreground">
        Controle o destaque principal exibido no topo da home.
      </p>

      <form onSubmit={add} className="mt-6 space-y-3 rounded-2xl bg-card p-5 shadow-card">
        <input
          placeholder="Título do banner"
          value={draft.headline ?? ""}
          onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          placeholder="Subtítulo (descrição curta)"
          value={draft.subline ?? ""}
          onChange={(e) => setDraft({ ...draft, subline: e.target.value })}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={draft.storySlug}
            onChange={(e) => setDraft({ ...draft, storySlug: e.target.value })}
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
          >
            {stories.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={!!draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Ativo
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-3">
        {banners.map((b) => {
          const story = stories.find((s) => s.slug === b.storySlug);
          return (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft"
            >
              <div className="flex items-center gap-3">
                {story?.cover && (
                  <img
                    src={story.cover}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                )}
                <div>
                  <div className="font-display text-base font-bold">{b.headline}</div>
                  <div className="text-xs text-muted-foreground">{b.subline}</div>
                  <div className="text-[11px] text-muted-foreground">→ {story?.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(b.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    b.active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {b.active ? "Ativo" : "Inativo"}
                </button>
                <button
                  onClick={() => remove(b.id)}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
