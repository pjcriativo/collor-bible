import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { getCategories, getStories, setStories } from "@/lib/store";
import type { Story } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/historias")({
  component: AdminStoriesPage,
});

const emptyStory = (): Story => ({
  id: `s_${Date.now()}`,
  slug: "",
  title: "",
  subtitle: "",
  shortDescription: "",
  description: "",
  ageRange: "3-10 anos",
  testament: "novo",
  categoryIds: [],
  cover: "",
  pages: [],
  featured: false,
  isNew: true,
  active: true,
  order: 999,
  loved: 0,
});

function AdminStoriesPage() {
  const stories = useStore(() => [...getStories()].sort((a, b) => a.order - b.order));
  const [editing, setEditing] = useState<Story | null>(null);

  const update = (next: Story) => {
    const list = getStories();
    const idx = list.findIndex((s) => s.id === next.id);
    if (idx === -1) {
      setStories([...list, next]);
    } else {
      list[idx] = next;
      setStories([...list]);
    }
  };
  const remove = (id: string) => {
    if (!confirm("Remover esta história?")) return;
    setStories(getStories().filter((s) => s.id !== id));
    toast.success("História removida");
  };
  const move = (id: string, dir: -1 | 1) => {
    const list = [...getStories()].sort((a, b) => a.order - b.order);
    const idx = list.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const a = list[idx];
    const b = list[swap];
    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;
    setStories(list);
  };
  const toggle = (id: string, key: "active" | "featured" | "isNew") => {
    const list = getStories();
    const s = list.find((x) => x.id === id);
    if (!s) return;
    s[key] = !s[key];
    setStories([...list]);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Histórias</h1>
          <p className="text-sm text-muted-foreground">{stories.length} no catálogo</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(emptyStory())}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-soft hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Nova história
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-semibold">Ordem</th>
              <th className="p-3 font-semibold">História</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => move(s.id, -1)}
                      className="rounded-md p-1 hover:bg-accent"
                      aria-label="Subir"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-semibold">{s.order}</span>
                    <button
                      onClick={() => move(s.id, 1)}
                      className="rounded-md p-1 hover:bg-accent"
                      aria-label="Descer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {s.cover && (
                      <img
                        src={s.cover}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge active={s.active} onClick={() => toggle(s.id, "active")}>
                      Ativo
                    </Badge>
                    <Badge active={!!s.featured} onClick={() => toggle(s.id, "featured")}>
                      <Star className="mr-1 inline h-3 w-3" /> Destaque
                    </Badge>
                    <Badge active={!!s.isNew} onClick={() => toggle(s.id, "isNew")}>
                      Novo
                    </Badge>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-lg p-2 hover:bg-accent"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <StoryFormModal
          story={editing}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            update(s);
            setEditing(null);
            toast.success("História salva");
          }}
        />
      )}
    </div>
  );
}

function Badge({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-bold transition",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function StoryFormModal({
  story,
  onClose,
  onSave,
}: {
  story: Story;
  onClose: () => void;
  onSave: (s: Story) => void;
}) {
  const [draft, setDraft] = useState<Story>(story);
  const cats = getCategories();

  const set = <K extends keyof Story>(k: K, v: Story[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const onCoverFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("cover", reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.slug.trim()) {
      toast.error("Preencha título e slug");
      return;
    }
    onSave({
      ...draft,
      shortDescription: draft.shortDescription.trim() || draft.subtitle || draft.description,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-6 shadow-hero"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-extrabold">
          {story.title ? "Editar história" : "Nova história"}
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Título">
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className="input"
              required
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              value={draft.slug}
              onChange={(e) => set("slug", e.target.value)}
              className="input"
              placeholder="ex: noe-e-a-arca"
              required
            />
          </Field>
          <Field label="Subtítulo">
            <input
              value={draft.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Descrição curta">
            <input
              value={draft.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Descrição">
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              className="input min-h-[80px]"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Faixa etária">
              <input
                value={draft.ageRange}
                onChange={(e) => set("ageRange", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Testamento">
              <select
                value={draft.testament}
                onChange={(e) => set("testament", e.target.value as Story["testament"])}
                className="input"
              >
                <option value="antigo">Antigo</option>
                <option value="novo">Novo</option>
              </select>
            </Field>
          </div>
          <Field label="Categorias">
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const checked = draft.categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      set(
                        "categoryIds",
                        checked
                          ? draft.categoryIds.filter((id) => id !== c.id)
                          : [...draft.categoryIds, c.id],
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      checked
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {c.emoji} {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Capa (upload)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onCoverFile(e.target.files?.[0] ?? null)}
              className="input"
            />
            {draft.cover && (
              <img
                src={draft.cover}
                alt="prévia"
                className="mt-2 h-24 w-24 rounded-xl object-cover"
              />
            )}
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-5 py-2 text-sm font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
            >
              Salvar
            </button>
          </div>
        </form>
        <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:0.75rem;padding:0.55rem 0.75rem;font-size:0.95rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
