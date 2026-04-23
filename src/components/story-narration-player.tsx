import { Pause, Play, Square, Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  text: string;
  className?: string;
}

/**
 * Player de narração via Web Speech API. Mostra play/pause + parar.
 * Some silenciosamente se o navegador não suportar.
 */
export function StoryNarrationPlayer({ title, text, className }: Props) {
  const fullText = `${title}. ${text}`;
  const { status, supported, toggle, stop } = useSpeech(fullText);

  if (!supported) return null;

  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const isActive = isPlaying || isPaused;

  const label = isPlaying ? "Pausar" : isPaused ? "Continuar" : "Ouvir história";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 border-sky/40 bg-gradient-to-r from-sky/15 via-card to-card p-3 shadow-soft transition",
        isActive && "border-sky shadow-card",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-card shadow-hero transition hover:scale-105 active:scale-95",
          isPlaying ? "bg-deep" : "bg-sky text-deep",
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current pl-0.5" />
        )}
      </button>

      <div className="flex-1 leading-tight">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-deep">
          <Volume2 className="h-3 w-3" />
          Narração
        </p>
        <p className="font-display text-sm font-bold text-foreground sm:text-base">{label}</p>
      </div>

      {isActive && (
        <button
          type="button"
          onClick={stop}
          aria-label="Parar narração"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-soft hover:bg-accent"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      )}
    </div>
  );
}
