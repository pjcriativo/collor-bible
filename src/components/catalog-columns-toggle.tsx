import { LayoutGrid } from "lucide-react";
import { type CatalogColumns, useCatalogColumns } from "@/hooks/use-catalog-columns";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Toggle inline 4 ↔ 5 colunas para o catálogo.
 *
 * - Visível APENAS em telas ≥ lg, porque a preferência só afeta esse
 *   breakpoint (mobile/tablet seguem grid responsivo fixo). Esconder no
 *   mobile evita confusão de "cliquei e nada mudou".
 * - Acessível: cada opção é um <button> com `aria-pressed` para leitores
 *   de tela e `aria-label` traduzido. Alvo de toque ≥ 32x32px (suficiente
 *   no breakpoint de desktop, onde o controle aparece).
 */
const COPY: Record<string, { label: string; cols: (n: number) => string }> = {
  "pt-BR": { label: "Densidade do catálogo", cols: (n) => `${n} colunas` },
  "en-US": { label: "Catalog density", cols: (n) => `${n} columns` },
  "es-ES": { label: "Densidad del catálogo", cols: (n) => `${n} columnas` },
};

export function CatalogColumnsToggle({ className }: { className?: string }) {
  const { columns, setColumns } = useCatalogColumns();
  const { language } = useI18n();
  const copy = COPY[language] ?? COPY["pt-BR"];

  const renderOption = (value: CatalogColumns, dots: number) => {
    const active = columns === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setColumns(value)}
        aria-pressed={active}
        aria-label={copy.cols(value)}
        title={copy.cols(value)}
        className={cn(
          "grid h-8 w-10 place-items-center rounded-lg transition-colors",
          active
            ? "bg-primary text-primary-foreground shadow-soft"
            : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
        )}
      >
        {/* Pequenos quadrados representando colunas — leitura visual rápida.
            Sem texto para manter o toggle compacto ao lado do título. */}
        <span className="flex items-end gap-[2px]">
          {Array.from({ length: dots }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "block h-3 w-[3px] rounded-sm",
                active ? "bg-primary-foreground" : "bg-current",
              )}
            />
          ))}
        </span>
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={copy.label}
      className={cn(
        "hidden items-center gap-1 rounded-xl border border-border/70 bg-card/80 p-1 shadow-soft backdrop-blur lg:inline-flex",
        className,
      )}
    >
      <LayoutGrid className="ml-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {renderOption(4, 4)}
      {renderOption(5, 5)}
    </div>
  );
}
