import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, Loader2, Upload, Link2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { refreshBranding, useBranding } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/branding")({
  component: AdminBrandingPage,
});

type Mode = "upload" | "url";

function AdminBrandingPage() {
  const branding = useBranding();
  const [mode, setMode] = useState<Mode>("upload");
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl ?? "");
  const [appName, setAppName] = useState(branding.appName);
  const [logoAlt, setLogoAlt] = useState(branding.logoAlt);
  const [faviconUrl, setFaviconUrl] = useState(branding.faviconUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoUrl(branding.logoUrl ?? "");
    setAppName(branding.appName);
    setLogoAlt(branding.logoAlt);
    setFaviconUrl(branding.faviconUrl ?? "");
  }, [branding.logoUrl, branding.appName, branding.logoAlt, branding.faviconUrl]);

  async function uploadFile(file: File, kind: "logo" | "favicon") {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      if (kind === "logo") setLogoUrl(publicUrl);
      else setFaviconUrl(publicUrl);
      toast.success(`${kind === "logo" ? "Logo" : "Favicon"} enviado!`, {
        description: "Lembre-se de clicar em Salvar para aplicar.",
      });
    } catch (err: any) {
      toast.error("Falha no upload", { description: err?.message ?? "Tente novamente." });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: rows } = await (supabase as any)
        .from("branding_settings")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);
      const id = rows?.[0]?.id;
      const payload = {
        logo_url: logoUrl || null,
        logo_alt: logoAlt || "Logo",
        app_name: appName || "Reino das Cores",
        favicon_url: faviconUrl || null,
      };
      const { error } = id
        ? await (supabase as any).from("branding_settings").update(payload).eq("id", id)
        : await (supabase as any).from("branding_settings").insert(payload);
      if (error) throw error;
      refreshBranding();
      toast.success("Branding atualizado!", {
        description: "A logo já foi aplicada em toda a plataforma.",
      });
    } catch (err: any) {
      toast.error("Não foi possível salvar", { description: err?.message ?? "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function handleClearLogo() {
    setLogoUrl("");
    toast.info("Logo removida do formulário", { description: "Clique em Salvar para confirmar." });
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Branding</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-foreground">
          Logo da plataforma
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A logo aparecerá no header, na splash de abertura, no painel admin, no favicon e nos
          templates de e-mail.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Editor */}
        <section className="space-y-5 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft">
          <div className="flex gap-2 rounded-full border border-border/60 bg-background p-1">
            {(["upload", "url"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-glow-gold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "upload" ? <Upload className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {m === "upload" ? "Upload" : "URL externa"}
              </button>
            ))}
          </div>

          {mode === "upload" ? (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-foreground">Logo principal</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f, "logo");
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background px-4 py-8 text-sm font-bold text-foreground transition hover:border-primary/60 hover:bg-accent/50 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {uploading ? "Enviando..." : "Selecionar imagem (PNG, SVG, JPG ou WEBP)"}
              </button>
              <p className="text-xs text-muted-foreground">
                Recomendamos PNG transparente quadrado (mín. 256×256). Para nitidez retina, prefira
                512×512.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-foreground">URL da logo</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://exemplo.com/minha-logo.png"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-muted-foreground">
                Cole a URL pública da imagem hospedada em qualquer servidor (CDN, R2, S3, Cloudinary
                etc.).
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-foreground">Nome do app</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground">Texto alternativo</label>
              <input
                type="text"
                value={logoAlt}
                onChange={(e) => setLogoAlt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-foreground">Favicon (opcional)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://... ou faça upload"
                className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/x-icon,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f, "favicon");
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:bg-accent/50 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" /> Upload
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.01] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar e aplicar
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleClearLogo}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 font-bold text-muted-foreground transition hover:bg-accent/50 hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            )}
          </div>
        </section>

        {/* Preview */}
        <section className="space-y-4 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Pré-visualização
            </p>
            <h2 className="mt-1 font-display text-lg font-extrabold text-foreground">
              Como vai aparecer
            </h2>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-hero p-6">
            <div className="flex flex-col items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt}
                  className="h-24 w-24 rounded-2xl object-contain drop-shadow-[0_8px_32px_rgba(244,190,99,0.45)]"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <p className="text-center font-display text-lg font-extrabold text-foreground">
                {appName}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={logoAlt} className="h-9 w-9 rounded-lg object-contain" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-muted" />
              )}
              <span className="font-display text-sm font-bold text-foreground">{appName}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Cabeçalho do app</p>
          </div>
        </section>
      </div>
    </div>
  );
}
