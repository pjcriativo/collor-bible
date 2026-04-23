import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Download, MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, useLanguageSwitching } from "@/lib/i18n";

type Props = {
  storyTitle: string;
  pageIndex: number;
  totalPages: number;
  onDownload: () => void;
  saved: boolean;
  popMuted: boolean;
  onTogglePopMuted: () => void;
};

export function ColoringHeader({
  storyTitle,
  pageIndex,
  totalPages,
  onDownload,
  saved,
  popMuted,
  onTogglePopMuted,
}: Props) {
  const { t } = useI18n();
  // Quando o idioma está sendo trocado, desabilitamos temporariamente
  // os botões/links de navegação e ações para garantir que o texto
  // visível corresponde ao idioma efetivo no momento da interação.
  const langSwitching = useLanguageSwitching();
  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5 border-b border-border bg-card/80 px-2 py-1.5 backdrop-blur sm:grid-cols-[3rem_1fr_minmax(12rem,auto)] sm:gap-2 sm:px-3 sm:py-2">
      <Link
        to="/home"
        aria-label={t("storiesBreadcrumb")}
        title={t("storiesBreadcrumb")}
        aria-disabled={langSwitching}
        tabIndex={langSwitching ? -1 : undefined}
        onClick={(e) => {
          if (langSwitching) e.preventDefault();
        }}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-soft hover:bg-accent active:scale-95 sm:h-10 sm:w-10",
          langSwitching && "pointer-events-none cursor-not-allowed opacity-60",
        )}
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 text-center">
        <nav
          aria-label={t("storiesBreadcrumb")}
          className="flex min-w-0 items-center justify-center gap-1 text-[11px] leading-none text-muted-foreground sm:text-xs"
        >
          <Link
            to="/home"
            aria-disabled={langSwitching}
            tabIndex={langSwitching ? -1 : undefined}
            onClick={(e) => {
              if (langSwitching) e.preventDefault();
            }}
            className={cn(
              "shrink-0 rounded-md px-1.5 py-1 font-semibold text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
              langSwitching && "pointer-events-none cursor-not-allowed opacity-60",
            )}
          >
            {t("stories")}
          </Link>
          <ChevronRight aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground/70" />
          <h1
            aria-current="page"
            className="min-w-0 font-display text-sm font-bold leading-tight text-foreground line-clamp-1 sm:text-base"
          >
            {storyTitle}
          </h1>
        </nav>
        <p className="flex shrink-0 items-center justify-center gap-1 text-[10px] leading-none text-muted-foreground sm:text-[11px]">
          <span>{t("pageOf", { page: pageIndex + 1, total: totalPages })}</span>
        </p>
      </div>
      <details className="group relative flex justify-end sm:hidden">
        <summary
          aria-label={t("openActions")}
          title={t("actions")}
          className={cn(
            "flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-card text-foreground shadow-soft hover:bg-accent [&::-webkit-details-marker]:hidden",
            langSwitching && "pointer-events-none cursor-not-allowed opacity-60",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
        </summary>
        <div className="absolute right-0 top-11 z-20 grid min-w-44 gap-1 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-card">
          <button
            type="button"
            onClick={onTogglePopMuted}
            disabled={langSwitching}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {popMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {popMuted ? t("activateSound") : t("mute")}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={langSwitching}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {t("download")}
          </button>
        </div>
      </details>
      <div className="hidden min-w-0 items-center justify-end gap-1 sm:flex sm:min-w-48 sm:gap-1.5">
        <button
          type="button"
          onClick={onTogglePopMuted}
          aria-label={popMuted ? t("activatePaintingSound") : t("mutePaintingSound")}
          title={popMuted ? t("activatePaintingSound") : t("mutePaintingSound")}
          aria-pressed={popMuted}
          disabled={langSwitching}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full shadow-soft hover:bg-accent sm:h-10 sm:w-10 disabled:cursor-not-allowed disabled:opacity-60",
            popMuted ? "bg-secondary text-muted-foreground" : "bg-card text-foreground",
          )}
        >
          {popMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onDownload}
          aria-label={t("downloadImage")}
          title={t("downloadImage")}
          disabled={langSwitching}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft hover:scale-105 active:scale-95 sm:h-10 sm:w-10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
