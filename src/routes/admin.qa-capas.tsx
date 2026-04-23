import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Crosshair,
  Maximize2,
  Sun,
  Coffee,
  Upload,
  Link2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { STORIES } from "@/lib/store";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateStoryCoverOverrides } from "@/hooks/use-story-cover-override";

export const Route = createFileRoute("/admin/qa-capas")({
  component: QaCapasPage,
});

type BgMode = "light" | "cream";
type Filter = "todas" | "parabolas" | "novo" | "antigo";

const PARABOLA_SLUGS = new Set([
  "o-filho-prodigo",
  "a-ovelha-perdida",
  "o-semeador",
  "a-casa-na-rocha",
]);

function QaCapasPage() {
  const [bg, setBg] = useState<BgMode>("light");
  const [showGuides, setShowGuides] = useState(true);
  const [showFrames, setShowFrames] = useState(true);
  const [filter, setFilter] = useState<Filter>("parabolas");

  // Importação
  const [importedUrl, setImportedUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [targetSlug, setTargetSlug] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Carrega overrides existentes para refletir capas já personalizadas.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("story_cover_overrides")
        .select("story_slug, image_url");
      if (cancelled) return;
      if (error) {
        console.error("Falha ao carregar overrides:", error);
        return;
      }
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.story_slug] = row.image_url;
      setOverrides(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importedFileRef = useRef<File | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (PNG, JPG ou WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8 MB).");
      return;
    }
    importedFileRef.current = file;
    const url = URL.createObjectURL(file);
    setImportedUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const handleUrlImport = useCallback(() => {
    const value = urlInput.trim();
    if (!value) {
      toast.error("Cole uma URL de imagem.");
      return;
    }
    try {
      // valida URL
      // eslint-disable-next-line no-new
      new URL(value);
    } catch {
      toast.error("URL inválida.");
      return;
    }
    importedFileRef.current = null;
    setImportedUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return value;
    });
  }, [urlInput]);

  const clearImported = useCallback(() => {
    importedFileRef.current = null;
    setImportedUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setUrlInput("");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const saveAsCover = useCallback(async () => {
    if (!importedUrl) {
      toast.error("Importe uma capa primeiro.");
      return;
    }
    if (!targetSlug) {
      toast.error("Selecione a história alvo.");
      return;
    }
    setIsSaving(true);
    try {
      let publicUrl = importedUrl;
      const file = importedFileRef.current;

      // Se foi upload local, sobe para o storage. Se foi URL externa, baixa e re-hospeda.
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${targetSlug}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("story-covers")
          .upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("story-covers").getPublicUrl(path);
        publicUrl = pub.publicUrl;
      } else if (importedUrl.startsWith("http")) {
        // Re-hospeda a imagem para garantir disponibilidade e CORS.
        try {
          const res = await fetch(importedUrl, { mode: "cors" });
          if (res.ok) {
            const blob = await res.blob();
            const ext = (blob.type.split("/").pop() || "png").replace("jpeg", "jpg");
            const path = `${targetSlug}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("story-covers")
              .upload(path, blob, { contentType: blob.type, upsert: true });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("story-covers").getPublicUrl(path);
              publicUrl = pub.publicUrl;
            }
          }
        } catch {
          // mantém URL externa se download falhar
        }
      }

      const { error } = await supabase
        .from("story_cover_overrides")
        .upsert(
          { story_slug: targetSlug, image_url: publicUrl, source: file ? "upload" : "url" },
          { onConflict: "story_slug" },
        );
      if (error) throw error;

      setOverrides((prev) => ({ ...prev, [targetSlug]: publicUrl }));
      invalidateStoryCoverOverrides();
      toast.success("Capa salva! Aparece no app na próxima atualização.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar a capa.");
    } finally {
      setIsSaving(false);
    }
  }, [importedUrl, targetSlug]);

  const removeOverride = useCallback(async (slug: string) => {
    const { error } = await supabase.from("story_cover_overrides").delete().eq("story_slug", slug);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    invalidateStoryCoverOverrides();
    toast.success("Capa personalizada removida.");
  }, []);

  const items = useMemo(() => {
    const list = STORIES.filter((s) => s.active);
    if (filter === "parabolas") return list.filter((s) => PARABOLA_SLUGS.has(s.slug));
    if (filter === "novo") return list.filter((s) => s.testament === "novo");
    if (filter === "antigo") return list.filter((s) => s.testament === "antigo");
    return list;
  }, [filter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao painel
          </Link>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground">QA de Capas</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Comparativo visual das capas em <strong>320</strong> e <strong>640</strong> px sobre
            fundo claro e creme. Guias verticais ajudam a validar centragem do personagem; molduras
            simulam o card do catálogo.
          </p>
        </div>
      </header>

      {/* Controles */}
      <section
        aria-label="Controles de QA"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-soft backdrop-blur-xl"
      >
        <div className="flex items-center gap-1 rounded-full border border-border bg-background/60 p-1">
          <ToggleBtn active={bg === "light"} onClick={() => setBg("light")} icon={Sun}>
            Claro
          </ToggleBtn>
          <ToggleBtn active={bg === "cream"} onClick={() => setBg("cream")} icon={Coffee}>
            Creme
          </ToggleBtn>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-background/60 p-1">
          {(["parabolas", "novo", "antigo", "todas"] as Filter[]).map((f) => (
            <ToggleBtn key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "parabolas"
                ? "Parábolas"
                : f === "novo"
                  ? "Novo Testamento"
                  : f === "antigo"
                    ? "Antigo Testamento"
                    : "Todas"}
            </ToggleBtn>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ToggleBtn active={showGuides} onClick={() => setShowGuides((v) => !v)} icon={Crosshair}>
            Guias
          </ToggleBtn>
          <ToggleBtn active={showFrames} onClick={() => setShowFrames((v) => !v)} icon={Maximize2}>
            Moldura do card
          </ToggleBtn>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Mostrando <strong>{items.length}</strong> {items.length === 1 ? "história" : "histórias"}.
      </p>

      {/* Painel de importação */}
      <section
        aria-label="Importar capa"
        className="rounded-3xl border border-border bg-card p-4 shadow-soft"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-extrabold text-foreground">
            Importar capa para teste
          </h2>
          <span className="text-xs text-muted-foreground">
            Faça upload ou cole uma URL — visualize aqui antes de salvar como capa oficial.
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Dropzone + URL */}
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5",
              )}
            >
              <Upload className="h-6 w-6 text-primary" />
              <p className="text-sm font-bold text-foreground">
                Arraste a imagem ou clique para escolher
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou WebP · até 8&nbsp;MB · proporção ideal 2:3
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex flex-wrap items-stretch gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background/60 px-3">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  placeholder="https://exemplo.com/capa.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUrlImport();
                  }}
                  className="flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              <button
                type="button"
                onClick={handleUrlImport}
                className="rounded-full bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground transition hover:bg-secondary/80"
              >
                Importar URL
              </button>
            </div>
          </div>

          {/* Preview + ações */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                História alvo
              </label>
              {importedUrl ? (
                <button
                  type="button"
                  onClick={clearImported}
                  className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              ) : null}
            </div>
            <select
              value={targetSlug}
              onChange={(e) => setTargetSlug(e.target.value)}
              className="w-full rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-bold text-foreground outline-none focus:border-primary"
            >
              <option value="">Selecione a história…</option>
              {STORIES.filter((s) => s.active).map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title} {overrides[s.slug] ? "  ★ personalizada" : ""}
                </option>
              ))}
            </select>

            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "relative h-24 w-16 overflow-hidden rounded-lg border border-border",
                  bg === "light" ? "bg-white" : "bg-[oklch(0.96_0.025_85)]",
                )}
              >
                {importedUrl ? (
                  <img
                    src={importedUrl}
                    alt="Pré-visualização"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                    sem imagem
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={saveAsCover}
                  disabled={isSaving || !importedUrl || !targetSlug}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition",
                    isSaving || !importedUrl || !targetSlug
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground shadow-glow-gold hover:opacity-90",
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Salvar como capa desta história
                </button>
                {targetSlug && overrides[targetSlug] ? (
                  <button
                    type="button"
                    onClick={() => removeOverride(targetSlug)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    <AlertCircle className="h-3 w-3" /> Remover capa personalizada atual
                  </button>
                ) : null}
                <p className="text-[11px] leading-snug text-muted-foreground">
                  A capa importada substitui visualmente o card abaixo. Ao salvar, ela passa a ser
                  servida no app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((s) => (
          <article
            key={s.id}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-extrabold text-foreground">
                  {s.title}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {s.subtitle} · <span className="font-mono">{s.slug}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {overrides[s.slug] ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    <CheckCircle2 className="h-3 w-3" /> Custom
                  </span>
                ) : null}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    s.testament === "novo"
                      ? "bg-sky/15 text-sky-foreground"
                      : "bg-mint/15 text-mint-foreground",
                  )}
                >
                  {s.testament === "novo" ? "Novo" : "Antigo"}
                </span>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-3 p-4">
              <CoverCell
                label="320"
                src={
                  targetSlug === s.slug && importedUrl
                    ? importedUrl
                    : (overrides[s.slug] ?? s.coverSmall ?? s.cover)
                }
                alt={`${s.title} (320)`}
                bg={bg}
                showGuides={showGuides}
                showFrame={showFrames}
              />
              <CoverCell
                label="640"
                src={
                  targetSlug === s.slug && importedUrl
                    ? importedUrl
                    : (overrides[s.slug] ?? s.coverMedium ?? s.cover)
                }
                alt={`${s.title} (640)`}
                bg={bg}
                showGuides={showGuides}
                showFrame={showFrames}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
        active
          ? "bg-primary text-primary-foreground shadow-glow-gold"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function CoverCell({
  label,
  src,
  alt,
  bg,
  showGuides,
  showFrame,
}: {
  label: string;
  src: string;
  alt: string;
  bg: BgMode;
  showGuides: boolean;
  showFrame: boolean;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span>{label}px</span>
        <span className="font-mono normal-case text-muted-foreground/70">2:3</span>
      </figcaption>
      <div
        className={cn(
          "relative isolate flex items-center justify-center overflow-hidden rounded-2xl p-3",
          bg === "light" ? "bg-white" : "bg-[oklch(0.96_0.025_85)]",
        )}
      >
        <div className="relative w-full" style={{ aspectRatio: "2 / 3" }}>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover",
              showFrame ? "rounded-2xl shadow-soft ring-1 ring-black/5" : "rounded-md",
            )}
          />
          {showGuides ? (
            <>
              {/* Centro vertical */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fuchsia-500/70 mix-blend-difference"
              />
              {/* Terços horizontais */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-fuchsia-500/40 mix-blend-difference"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-fuchsia-500/40 mix-blend-difference"
              />
              {/* Margem segura */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[6%] rounded-xl border border-dashed border-fuchsia-500/40 mix-blend-difference"
              />
            </>
          ) : null}
        </div>
      </div>
    </figure>
  );
}
