import { Link, useLocation } from "@tanstack/react-router";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const dotColorMap: Record<NonNullable<Category["color"]>, string> = {
  sky: "bg-sky",
  gold: "bg-gold",
  coral: "bg-coral",
  mint: "bg-mint",
  deep: "bg-sky",
};

const glowColorMap: Record<NonNullable<Category["color"]>, string> = {
  sky: "shadow-[0_0_12px_-2px_var(--color-sky)]",
  gold: "shadow-[0_0_12px_-2px_var(--color-gold)]",
  coral: "shadow-[0_0_12px_-2px_var(--color-coral)]",
  mint: "shadow-[0_0_12px_-2px_var(--color-mint)]",
  deep: "shadow-[0_0_12px_-2px_var(--color-sky)]",
};

export function CategoryChip({ category }: { category: Category }) {
  const color = category.color ?? "sky";
  const dot = dotColorMap[color];
  const glow = glowColorMap[color];
  const { pathname } = useLocation();
  const active = pathname === `/categorias/${category.slug}`;

  return (
    <Link
      to="/categorias/$slug"
      params={{ slug: category.slug }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 font-display text-sm font-semibold backdrop-blur transition-all duration-300",
        "ring-1 ring-inset",
        active
          ? "bg-surface-2 text-foreground ring-primary/45"
          : "bg-surface/70 text-foreground/85 ring-white/[0.07] hover:bg-surface hover:text-foreground hover:ring-white/15",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-125",
          dot,
          (active || undefined) && glow,
        )}
      />
      <span className="leading-none">{category.name}</span>
    </Link>
  );
}

export function CategoryTile({ category, count }: { category: Category; count?: number }) {
  const color = category.color ?? "sky";
  const dot = dotColorMap[color];
  const glow = glowColorMap[color];
  return (
    <Link
      to="/categorias/$slug"
      params={{ slug: category.slug }}
      className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl bg-surface p-5 ring-1 ring-inset ring-white/[0.07] shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-elevated hover:ring-primary/30"
    >
      {/* Topo: bolinha colorida + emoji discreto */}
      <div className="flex items-start justify-between">
        <span
          aria-hidden="true"
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-all duration-300 group-hover:scale-125",
            dot,
            glow,
          )}
        />
        {category.emoji && (
          <span aria-hidden="true" className="text-2xl opacity-80 sm:text-[28px]">
            {category.emoji}
          </span>
        )}
      </div>

      {/* Base: nome + contagem */}
      <div>
        <h3 className="font-display text-base font-bold leading-tight tracking-tight text-foreground sm:text-[17px]">
          {category.name}
        </h3>
        {typeof count === "number" && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {count} {count === 1 ? "história" : "histórias"}
          </p>
        )}
      </div>
    </Link>
  );
}
