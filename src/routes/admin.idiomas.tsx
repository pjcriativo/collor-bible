import { createFileRoute } from "@tanstack/react-router";
import { Globe2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES, setLanguage as setGlobalLanguage, useI18n, type AppLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/admin/idiomas")({ component: AdminLanguagesPage });

function AdminLanguagesPage() {
  const { language, t } = useI18n();

  const changeLanguage = async (nextLanguage: AppLanguage) => {
    setGlobalLanguage(nextLanguage);
    const { error } = await (supabase as any)
      .from("app_settings")
      .update({ default_language: nextLanguage })
      .not("id", "is", null);
    if (error) toast.error("Idioma alterado localmente, mas não salvo no backend");
    else toast.success("Idioma aplicado em toda a plataforma");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-cinematic backdrop-blur-xl sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{t("admin")}</p>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          {t("languages")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Defina o idioma nativo da plataforma. Essa escolha é aplicada para todos os usuários por
          padrão.
        </p>
      </section>

      <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card backdrop-blur-xl">
        <h2 className="font-display text-lg font-extrabold text-foreground">
          {t("nativeAppLanguage")}
        </h2>
        <div className="mt-4 flex items-center gap-3">
          <Globe2 className="h-5 w-5 shrink-0 text-primary" />
          <div className="grid w-full gap-2 sm:grid-cols-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => changeLanguage(lang.code)}
                className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
                  language === lang.code
                    ? "border-primary bg-primary text-primary-foreground shadow-glow-gold"
                    : "border-border bg-background/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
