import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Lightbulb,
  PenLine,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ERASER } from "@/hooks/use-coloring-state";
import { useI18n } from "@/lib/i18n";
import { playPop } from "@/lib/pop-sound";
import { getColorName } from "@/lib/color-names";

function handleColorPick(c: string, onColorChange: (c: string) => void) {
  playPop();
  onColorChange(c);
}

function handleEraserPick(onErase: () => void) {
  playPop();
  onErase();
}

export const PALETTE = [
  "#FF9E8A", // coral
  "#F2C96B", // gold
  "#92D6B3", // mint
  "#7CB7FF", // sky
  "#3E6FB6", // deep blue
  "#5C4B3B", // brown
  "#FFFFFF", // white
  "#FFB6D9", // pink
  "#C5A3FF", // purple
  "#A8E6CF", // pale green
  "#FFD56B", // yellow
  "#FF7373", // red
  "#6FCF97", // green
  "#FFC97A", // peach
  "#1F2937", // ink
];

const INK_COLOR = "#1F2937";
const DESKTOP_INK_ANCHOR_COLOR = "#FFD56B";

type Props = {
  color: string;
  onColorChange: (color: string) => void;
  pageIndex: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClearAll: () => void;
  canClearAll: boolean;
  onOpenSignature: () => void;
  showSuggestion: boolean;
  onToggleSuggestion: () => void;
  onErase: () => void;
  onMagicPaint: () => void;
  magicPainting: boolean;
};

export function ColoringPalette({
  color,
  onColorChange,
  pageIndex,
  totalPages,
  onPrev,
  onNext,
  onUndo,
  canUndo,
  onClearAll,
  canClearAll,
  onOpenSignature,
  showSuggestion,
  onToggleSuggestion,
  onErase,
  onMagicPaint,
  magicPainting,
}: Props) {
  const { t, language } = useI18n();
  const orderedPalette = PALETTE;
  const desktopPalette = orderedPalette.reduce<string[]>((palette, paletteColor) => {
    if (paletteColor === INK_COLOR) return palette;

    palette.push(paletteColor);
    if (paletteColor === DESKTOP_INK_ANCHOR_COLOR && orderedPalette.includes(INK_COLOR)) {
      palette.push(INK_COLOR);
    }

    return palette;
  }, []);

  return (
    <div className="border-t border-border bg-card/95 backdrop-blur">
      {/* Page nav + tools */}
      <div className="scrollbar-hide flex items-center justify-between gap-2 overflow-x-auto px-3 pt-2 sm:justify-end lg:hidden">
        <div className="hidden items-center gap-1.5 max-sm:flex">
          <button
            type="button"
            onClick={onPrev}
            disabled={pageIndex === 0}
            aria-label={t("previousPage")}
            title={t("previousPage")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={pageIndex >= totalPages - 1}
            aria-label={t("nextPage")}
            title={t("nextPage")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t("undo")}
            title={t("undo")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={!canClearAll}
            aria-label={t("clearAll")}
            title={t("clearAll")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft transition hover:bg-accent disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenSignature}
            aria-label={t("addSignature")}
            title={t("addSignature")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft transition hover:bg-accent"
          >
            <PenLine className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggleSuggestion}
            aria-label={showSuggestion ? t("hideColorSuggestion") : t("showColorSuggestion")}
            title={showSuggestion ? t("hideColorSuggestion") : t("showColorSuggestion")}
            aria-pressed={showSuggestion}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-soft transition",
              showSuggestion
                ? "bg-gold text-foreground"
                : "bg-secondary text-foreground hover:bg-accent",
            )}
          >
            <Lightbulb className={cn("h-4 w-4", showSuggestion && "fill-current")} />
            <span className="hidden sm:inline">{t("suggestion")}</span>
          </button>
          <button
            type="button"
            onClick={onMagicPaint}
            disabled={magicPainting}
            aria-label={t("magicPaintApply")}
            title={t("magicPaint")}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-soft transition",
              "bg-gradient-to-r from-coral via-gold to-mint text-foreground hover:scale-105 active:scale-95",
              "disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            <Sparkles className={cn("h-4 w-4", magicPainting && "animate-spin")} />
            <span className="hidden sm:inline">{magicPainting ? t("painting") : t("magic")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleEraserPick(onErase)}
            aria-label={t("eraser")}
            title={t("eraser")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full shadow-soft",
              color === ERASER ? "bg-foreground text-background" : "bg-secondary text-foreground",
            )}
          >
            <Eraser className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Palette */}
      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 py-3 sm:justify-center lg:hidden lg:gap-3.5">
        {orderedPalette.map((c) => {
          const colorName = getColorName(c, language);
          const label = t("colorLabel", { color: colorName });
          return (
            <button
              key={c}
              type="button"
              onClick={() => handleColorPick(c, onColorChange)}
              aria-label={label}
              aria-pressed={color === c}
              title={label}
              style={
                {
                  backgroundColor: c,
                  ["--swatch-glow" as never]: `${c}cc`,
                } as React.CSSProperties
              }
              className={cn(
                "h-12 w-12 shrink-0 snap-start rounded-full border-2 border-white shadow-soft transition-[box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:h-11 sm:w-11 lg:h-12 lg:w-12",
                color === c && "color-swatch-selected",
              )}
            />
          );
        })}
        <button
          type="button"
          onClick={() => handleEraserPick(onErase)}
          aria-label={t("eraser")}
          aria-pressed={color === ERASER}
          title={t("eraser")}
          style={{ ["--swatch-glow" as never]: "hsl(0 0% 100% / 0.85)" } as React.CSSProperties}
          className={cn(
            "hidden h-11 w-11 shrink-0 snap-start items-center justify-center rounded-full border-2 border-white shadow-soft transition-[box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card lg:h-12 lg:w-12",
            color === ERASER
              ? "color-swatch-selected bg-foreground text-background"
              : "bg-secondary text-foreground",
          )}
        >
          <Eraser className="h-5 w-5" />
        </button>
      </div>
      <div className="hidden min-h-28 items-center justify-center gap-3 px-4 py-3 lg:flex">
        <div className="scrollbar-hide flex min-w-0 snap-x snap-mandatory items-center justify-center gap-3.5 overflow-x-auto pr-2">
          {desktopPalette.map((c) => {
            const colorName = getColorName(c, language);
            const label = t("colorLabel", { color: colorName });
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleColorPick(c, onColorChange)}
                aria-label={label}
                aria-pressed={color === c}
                title={label}
                style={
                  {
                    backgroundColor: c,
                    ["--swatch-glow" as never]: `${c}cc`,
                  } as React.CSSProperties
                }
                className={cn(
                  "h-12 w-12 shrink-0 snap-start rounded-full border-2 border-white shadow-soft transition-[box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  color === c && "color-swatch-selected",
                )}
              />
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t("undo")}
            title={t("undo")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={!canClearAll}
            aria-label={t("clearAll")}
            title={t("clearAll")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft transition hover:bg-accent disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenSignature}
            aria-label={t("addSignature")}
            title={t("addSignature")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground shadow-soft transition hover:bg-accent"
          >
            <PenLine className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggleSuggestion}
            aria-label={showSuggestion ? t("hideColorSuggestion") : t("showColorSuggestion")}
            title={showSuggestion ? t("hideColorSuggestion") : t("showColorSuggestion")}
            aria-pressed={showSuggestion}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-soft transition",
              showSuggestion
                ? "bg-gold text-foreground"
                : "bg-secondary text-foreground hover:bg-accent",
            )}
          >
            <Lightbulb className={cn("h-4 w-4", showSuggestion && "fill-current")} />
            <span>{t("suggestion")}</span>
          </button>
          <button
            type="button"
            onClick={onMagicPaint}
            disabled={magicPainting}
            aria-label={t("magicPaintApply")}
            title={t("magicPaint")}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold shadow-soft transition",
              "bg-gradient-to-r from-coral via-gold to-mint text-foreground hover:scale-105 active:scale-95",
              "disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            <Sparkles className={cn("h-4 w-4", magicPainting && "animate-spin")} />
            <span>{magicPainting ? t("painting") : t("magic")}</span>
          </button>
          <button
            type="button"
            onClick={() => handleEraserPick(onErase)}
            aria-label={t("eraser")}
            aria-pressed={color === ERASER}
            title={t("eraser")}
            style={{ ["--swatch-glow" as never]: "hsl(0 0% 100% / 0.85)" } as React.CSSProperties}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-soft transition-[box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              color === ERASER
                ? "color-swatch-selected bg-foreground text-background"
                : "bg-secondary text-foreground",
            )}
          >
            <Eraser className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
