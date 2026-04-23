import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Monitor,
  MoreVertical,
  Plus,
  Rocket,
  Share,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tutorial premium para ensinar o usuário a "instalar" o app na tela
 * inicial (PWA install / Add to Home Screen). Detecta plataforma quando
 * possível, oferece escolha manual quando não, e mostra um aviso amigável
 * em desktop. Os passos são apresentados como simulações visuais de
 * celular para reforçar a sensação de produto premium.
 */

type Platform = "ios" | "android";
type Stage = "intro" | "choose" | "steps" | "installed";

type Step = {
  title: string;
  text: string;
  visual: React.ReactNode;
};

type DetectedEnv = {
  platform: Platform | null;
  isDesktop: boolean;
  standalone: boolean;
};

function detectEnv(): DetectedEnv {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { platform: null, isDesktop: true, standalone: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari legacy
    (typeof (navigator as { standalone?: boolean }).standalone === "boolean" &&
      (navigator as { standalone?: boolean }).standalone === true);
  return {
    platform: isIOS ? "ios" : isAndroid ? "android" : null,
    isDesktop: !isMobile,
    standalone: Boolean(standalone),
  };
}

/** Track de evento simples — `window.gtag` se existir, sempre console.debug. */
function track(event: string, payload?: Record<string, unknown>) {
  try {
    const w = window as unknown as {
      gtag?: (cmd: string, name: string, params?: Record<string, unknown>) => void;
    };
    if (typeof w.gtag === "function") w.gtag("event", event, payload);
    if (typeof console !== "undefined") {
      console.debug("[install-tutorial]", event, payload ?? {});
    }
  } catch {
    /* no-op */
  }
}

/* ─────────────── Mocks visuais de celular ─────────────── */

function PhoneFrame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div
      role="img"
      aria-label={label ?? "Simulação de celular"}
      className="relative mx-auto h-[280px] w-[160px] rounded-[28px] bg-gradient-to-b from-zinc-900 to-zinc-950 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10 sm:h-[320px] sm:w-[180px]"
    >
      {/* Notch */}
      <div className="absolute left-1/2 top-2 z-10 h-3 w-16 -translate-x-1/2 rounded-b-xl bg-zinc-950" />
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-900">
        {children}
      </div>
    </div>
  );
}

function PulseRing({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute", className)}>
      <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
      <span className="relative block h-full w-full rounded-full bg-primary ring-2 ring-primary-foreground/40" />
    </span>
  );
}

/* ─────────────── Steps por plataforma ─────────────── */

function buildIosSteps(): Step[] {
  return [
    {
      title: "1. Abra no Safari",
      text: "Abra o Reino das Cores no navegador Safari do seu iPhone.",
      visual: (
        <PhoneFrame label="Safari aberto com o Reino das Cores">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 bg-zinc-900/80 px-2 py-1.5 text-[8px] font-medium text-white/70">
              reinodascores.app
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center">
              <div className="text-[10px] font-bold text-primary">Reino das Cores</div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-amber-400 shadow-lg" />
              <div className="text-[7px] text-white/60">Histórias para colorir</div>
            </div>
            <div className="flex items-center justify-around border-t border-white/10 bg-zinc-900/80 py-1.5">
              <div className="h-2 w-2 rounded-full bg-white/30" />
              <Share className="h-3 w-3 text-white/70" />
              <div className="h-2 w-2 rounded-full bg-white/30" />
            </div>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "2. Toque no botão de compartilhar",
      text: "Toque no ícone de compartilhar do Safari (parece uma seta saindo de uma caixa).",
      visual: (
        <PhoneFrame label="Botão de compartilhar destacado no Safari">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 bg-zinc-900/80 px-2 py-1.5 text-[8px] font-medium text-white/70">
              reinodascores.app
            </div>
            <div className="flex-1 bg-gradient-to-br from-indigo-950 to-purple-950" />
            <div className="relative flex items-center justify-around border-t border-white/10 bg-zinc-900/80 py-2">
              <div className="h-2 w-2 rounded-full bg-white/30" />
              <div className="relative">
                <Share className="relative z-10 h-4 w-4 text-primary" />
                <PulseRing className="-inset-1.5 z-0" />
              </div>
              <div className="h-2 w-2 rounded-full bg-white/30" />
            </div>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "3. Toque em \u201cAdicionar à Tela de Início\u201d",
      text: "Role as opções e selecione \u201cAdicionar à Tela de Início\u201d.",
      visual: (
        <PhoneFrame label="Menu do Safari com Adicionar à Tela de Início destacado">
          <div className="flex h-full flex-col bg-zinc-900/95 p-2">
            <div className="mb-2 h-1 w-8 self-center rounded-full bg-white/20" />
            <div className="space-y-1">
              {["Copiar", "Marcar Página", "Adicionar aos Favoritos"].map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between rounded-md bg-white/[0.04] px-1.5 py-1 text-[7px] text-white/60"
                >
                  <span>{t}</span>
                  <ChevronRight className="h-2 w-2" />
                </div>
              ))}
              <div className="relative flex items-center justify-between rounded-md bg-primary/20 px-1.5 py-1.5 text-[7px] font-bold text-primary ring-1 ring-primary/50">
                <span className="flex items-center gap-1">
                  <Plus className="h-2.5 w-2.5" /> Adicionar à Tela de Início
                </span>
                <PulseRing className="-right-1 -top-1 h-2 w-2" />
              </div>
              {["Imprimir", "Salvar em Arquivos"].map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between rounded-md bg-white/[0.04] px-1.5 py-1 text-[7px] text-white/60"
                >
                  <span>{t}</span>
                  <ChevronRight className="h-2 w-2" />
                </div>
              ))}
            </div>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "4. Confirme para criar o app",
      text: "Toque em \u201cAdicionar\u201d para colocar o Reino das Cores na sua tela inicial.",
      visual: (
        <PhoneFrame label="Confirmação para adicionar à tela de início">
          <div className="flex h-full flex-col bg-zinc-900/95 p-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="text-[7px] text-white/50">Cancelar</span>
              <span className="text-[8px] font-bold text-white">Tela de Início</span>
              <span className="text-[7px] font-bold text-primary">Adicionar</span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.05] p-2">
              <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-primary to-amber-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[8px] font-bold text-white">Reino das Cores</div>
                <div className="truncate text-[6px] text-white/50">reinodascores.app</div>
              </div>
            </div>
            <p className="mt-2 text-[6px] leading-tight text-white/40">
              Um ícone será adicionado à sua tela inicial.
            </p>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "5. Pronto!",
      text: "Agora é só abrir pela sua tela inicial, como um app de verdade.",
      visual: (
        <PhoneFrame label="Reino das Cores instalado na tela inicial">
          <div className="flex h-full flex-col p-3">
            <div className="text-center text-[7px] font-medium text-white/60">14:32</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 w-7 rounded-lg bg-white/[0.08]" />
              ))}
              <div className="relative">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-amber-400 shadow-[0_4px_12px_rgba(251,191,36,0.5)]" />
                <PulseRing className="-inset-1.5" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-7 w-7 rounded-lg bg-white/[0.08]" />
              ))}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center">
              <div />
              <div />
              <div className="text-[6px] font-bold text-white">Reino</div>
            </div>
          </div>
        </PhoneFrame>
      ),
    },
  ];
}

function buildAndroidSteps(): Step[] {
  return [
    {
      title: "1. Abra no Chrome",
      text: "Abra o Reino das Cores no navegador Chrome do seu celular.",
      visual: (
        <PhoneFrame label="Chrome aberto com o Reino das Cores">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-2 py-1.5">
              <span className="text-[8px] font-medium text-white/70">reinodascores.app</span>
              <MoreVertical className="h-3 w-3 text-white/70" />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-3 text-center">
              <div className="text-[10px] font-bold text-primary">Reino das Cores</div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-amber-400 shadow-lg" />
              <div className="text-[7px] text-white/60">Histórias para colorir</div>
            </div>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "2. Toque no menu do navegador",
      text: "Toque nos 3 pontinhos no canto superior direito do Chrome.",
      visual: (
        <PhoneFrame label="Botão de menu do Chrome destacado">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-2 py-1.5">
              <span className="text-[8px] font-medium text-white/70">reinodascores.app</span>
              <div className="relative">
                <MoreVertical className="relative z-10 h-3.5 w-3.5 text-primary" />
                <PulseRing className="-inset-1 z-0" />
              </div>
            </div>
            <div className="flex-1 bg-gradient-to-br from-indigo-950 to-purple-950" />
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "3. Toque em \u201cAdicionar à tela inicial\u201d",
      text: "Escolha \u201cAdicionar à tela inicial\u201d ou \u201cInstalar app\u201d (o nome pode variar).",
      visual: (
        <PhoneFrame label="Menu do Chrome com Instalar app destacado">
          <div className="flex h-full flex-col bg-zinc-900/95">
            <div className="ml-auto mt-1 w-[80%] rounded-l-md bg-zinc-800/80 p-1.5 shadow-lg">
              <div className="space-y-0.5">
                {["Nova guia", "Favoritos", "Histórico", "Downloads"].map((t) => (
                  <div key={t} className="rounded px-1.5 py-1 text-[7px] text-white/60">
                    {t}
                  </div>
                ))}
                <div className="relative rounded bg-primary/20 px-1.5 py-1.5 text-[7px] font-bold text-primary ring-1 ring-primary/50">
                  Instalar app
                  <PulseRing className="-right-1 -top-1 h-2 w-2" />
                </div>
                {["Compartilhar", "Configurações"].map((t) => (
                  <div key={t} className="rounded px-1.5 py-1 text-[7px] text-white/60">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "4. Confirme a instalação",
      text: "Toque em \u201cInstalar\u201d para adicionar o app à sua tela inicial.",
      visual: (
        <PhoneFrame label="Caixa de confirmação de instalação">
          <div className="flex h-full flex-col items-center justify-center bg-black/40 p-3">
            <div className="w-full rounded-xl bg-zinc-800 p-2.5 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-primary to-amber-400" />
                <div className="min-w-0">
                  <div className="truncate text-[8px] font-bold text-white">Instalar app</div>
                  <div className="truncate text-[6px] text-white/50">Reino das Cores</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-end gap-1.5 text-[7px] font-bold">
                <span className="text-white/50">Cancelar</span>
                <span className="rounded bg-primary px-2 py-0.5 text-primary-foreground">
                  Instalar
                </span>
              </div>
            </div>
          </div>
        </PhoneFrame>
      ),
    },
    {
      title: "5. Pronto!",
      text: "Agora você pode abrir o Reino das Cores direto da tela inicial, como um app.",
      visual: (
        <PhoneFrame label="Reino das Cores instalado na tela inicial Android">
          <div className="flex h-full flex-col p-3">
            <div className="text-center text-[7px] font-medium text-white/60">14:32</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-7 rounded-full bg-white/[0.08]" />
              ))}
              <div className="relative">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-amber-400 shadow-[0_4px_12px_rgba(251,191,36,0.5)]" />
                <PulseRing className="-inset-1.5" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-7 w-7 rounded-full bg-white/[0.08]" />
              ))}
            </div>
          </div>
        </PhoneFrame>
      ),
    },
  ];
}

/* ─────────────── Componente principal ─────────────── */

/**
 * Faixa de aviso persistente para usuários no desktop. Aparece tanto na
 * tela de escolha de plataforma quanto durante a navegação dos passos,
 * sem impedir o usuário de avançar/voltar. Em modo `compact`, ocupa menos
 * espaço (usado dentro do estágio `steps` onde o conteúdo já é denso).
 */
function DesktopNoticeBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/30 backdrop-blur",
        compact ? "p-3" : "mb-5 p-4",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
        <Monitor className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold text-foreground">Instale pelo celular</p>
        <p
          className={cn(
            "mt-0.5 text-xs leading-relaxed text-muted-foreground",
            compact && "line-clamp-2",
          )}
        >
          Para adicionar à tela inicial, abra o Reino das Cores no navegador do seu celular. Você
          pode ver os passos aqui mesmo.
        </p>
      </div>
    </div>
  );
}

export function InstallAppCard() {
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState<Stage>("intro");
  const [env, setEnv] = useState<DetectedEnv>(() => ({
    platform: null,
    isDesktop: true,
    standalone: false,
  }));

  useEffect(() => {
    setEnv(detectEnv());
  }, []);

  // Já instalado: estado especial.
  if (env.standalone) {
    return (
      <section className="mt-6 rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-mint/30 shadow-card backdrop-blur sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-mint ring-1 ring-inset ring-mint/30">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
              App já instalado
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              O Reino das Cores já está adicionado à sua tela inicial.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartAt("intro");
              setOpen(true);
              track("install_tutorial_opened", { source: "installed_card" });
            }}
            className="shrink-0 text-xs font-bold"
          >
            Ver instruções
          </Button>
        </div>
        <InstallTutorialDialog open={open} onOpenChange={setOpen} env={env} startAt={startAt} />
      </section>
    );
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-surface/90 via-surface/80 to-primary/5 p-5 ring-1 ring-inset ring-primary/20 shadow-card backdrop-blur sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/30 sm:h-14 sm:w-14">
          <Smartphone className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:text-[11px]">
            <Sparkles className="h-3 w-3" /> Premium
          </p>
          <h3 className="mt-1 font-display text-base font-bold text-foreground sm:text-lg">
            Instalar app no celular
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione o Reino das Cores à tela inicial e use como um app.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStartAt("intro");
            setOpen(true);
            track("install_tutorial_opened", {
              source: "profile_card",
              platform: env.platform,
              cta: "ver_tutorial",
            });
          }}
          className="h-11 w-full rounded-xl font-bold sm:w-auto sm:px-6"
        >
          Ver tutorial
        </Button>
        <Button
          type="button"
          onClick={() => {
            // Pula intro e (quando possível) também a escolha de plataforma,
            // levando o usuário direto para o primeiro passo do tutorial.
            // Se a plataforma não foi detectada, abrimos no seletor para
            // não mostrar passos errados.
            setStartAt(env.platform ? "steps" : "choose");
            setOpen(true);
            track("install_tutorial_opened", {
              source: "profile_card",
              platform: env.platform,
              cta: "instalar_agora",
            });
          }}
          className="h-11 w-full rounded-xl font-bold sm:w-auto sm:px-6"
        >
          <Rocket className="h-4 w-4" /> Instalar agora
        </Button>
      </div>
      <InstallTutorialDialog open={open} onOpenChange={setOpen} env={env} startAt={startAt} />
    </section>
  );
}

function InstallTutorialDialog({
  open,
  onOpenChange,
  env,
  startAt = "intro",
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  env: DetectedEnv;
  startAt?: Stage;
}) {
  const [stage, setStage] = useState<Stage>(startAt);
  const [platform, setPlatform] = useState<Platform | null>(env.platform);
  const [stepIdx, setStepIdx] = useState(0);

  // Reset ao abrir/fechar — respeita o estágio inicial pedido pelo CTA
  // (ex.: "Instalar agora" abre direto no primeiro passo).
  useEffect(() => {
    if (open) {
      setPlatform(env.platform);
      setStage(startAt);
      setStepIdx(0);
    }
  }, [open, env.platform, startAt]);

  const steps = useMemo<Step[]>(() => {
    if (platform === "ios") return buildIosSteps();
    if (platform === "android") return buildAndroidSteps();
    return [];
  }, [platform]);

  const handleStart = () => {
    track("install_tutorial_started");
    // No desktop, NÃO bloqueamos o usuário num estágio separado: deixamos
    // ele escolher o sistema e navegar pelos passos normalmente, com um
    // aviso persistente no topo lembrando que a instalação só acontece no
    // celular. Se já houver plataforma detectada (caso raro no desktop),
    // pula direto para os passos — a faixa de aviso continua visível.
    if (env.platform) {
      setPlatform(env.platform);
      setStage("steps");
      return;
    }
    setStage("choose");
  };

  const handleChoosePlatform = (p: Platform) => {
    setPlatform(p);
    setStage("steps");
    track(
      p === "ios"
        ? "install_tutorial_platform_selected_ios"
        : "install_tutorial_platform_selected_android",
    );
  };

  const handleClose = () => {
    track("install_tutorial_closed", { stage, stepIdx });
    onOpenChange(false);
  };

  const handleFinish = () => {
    track("install_tutorial_completed", { platform });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border-white/10 bg-surface p-0 sm:max-w-lg">
        {stage === "intro" && (
          <div className="p-6 text-center sm:p-8">
            <DialogHeader className="space-y-2">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
                <Smartphone className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <DialogTitle className="text-center font-display text-2xl font-extrabold tracking-tight">
                Use como app
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Abra o Reino das Cores direto da sua tela inicial, com muito mais praticidade.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex justify-center">
              <PhoneFrame label="Pré-visualização do app na tela inicial">
                <div className="flex h-full flex-col p-3">
                  <div className="text-center text-[7px] font-medium text-white/60">14:32</div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-8 w-8 rounded-xl bg-white/[0.08]" />
                    ))}
                    <div className="relative">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-amber-400 shadow-[0_4px_16px_rgba(251,191,36,0.6)]" />
                      <PulseRing className="-inset-2" />
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-8 w-8 rounded-xl bg-white/[0.08]" />
                    ))}
                  </div>
                </div>
              </PhoneFrame>
            </div>
            <Button onClick={handleStart} className="mt-6 h-11 w-full rounded-xl font-bold">
              Começar
            </Button>
          </div>
        )}

        {stage === "choose" && (
          <div className="p-6 sm:p-8">
            {/* Aviso persistente para desktop — fica visível enquanto o
                usuário escolhe a plataforma e também durante os passos. */}
            {env.isDesktop && <DesktopNoticeBanner />}
            {/* Aviso quando não conseguimos detectar plataforma/navegador
                (ex.: navegador in-app, user-agent atípico). Não bloqueia,
                apenas explica por que estamos perguntando. */}
            {!env.isDesktop && !env.platform && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground ring-1 ring-inset ring-white/10"
              >
                Não conseguimos identificar seu navegador automaticamente. Escolha abaixo para ver
                os passos certos.
              </div>
            )}
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-center font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                Qual celular você está usando?
              </DialogTitle>
              <DialogDescription className="text-center text-sm">
                Vamos te mostrar o tutorial certo.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChoosePlatform("ios")}
                aria-label="Escolher tutorial para iPhone (Safari)"
                className="group flex flex-col items-center gap-2 rounded-2xl bg-background/40 p-5 ring-1 ring-inset ring-white/10 transition hover:bg-background/60 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/30 transition group-hover:bg-primary/15">
                  <Smartphone className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <span className="font-display text-base font-bold">iPhone</span>
                <span className="text-[10px] text-muted-foreground">Safari</span>
              </button>
              <button
                type="button"
                onClick={() => handleChoosePlatform("android")}
                aria-label="Escolher tutorial para Android (Chrome)"
                className="group flex flex-col items-center gap-2 rounded-2xl bg-background/40 p-5 ring-1 ring-inset ring-white/10 transition hover:bg-background/60 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/30 transition group-hover:bg-primary/15">
                  <Smartphone className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <span className="font-display text-base font-bold">Android</span>
                <span className="text-[10px] text-muted-foreground">Chrome</span>
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Não tem certeza? Toque em{" "}
              <span className="font-semibold text-foreground">iPhone</span> se for um aparelho da
              Apple, ou <span className="font-semibold text-foreground">Android</span> nos demais.
            </p>
          </div>
        )}

        {stage === "steps" && steps.length > 0 && (
          <div className="flex flex-col">
            {/* Aviso persistente para desktop também durante a navegação
                pelos passos: lembra que a instalação real é no celular,
                sem bloquear a leitura/avanço dos passos. */}
            {env.isDesktop && (
              <div className="px-6 pt-4">
                <DesktopNoticeBanner compact />
              </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 pb-3 pt-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                {platform === "ios" ? "iPhone · Safari" : "Android · Chrome"}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                {stepIdx + 1} / {steps.length}
              </span>
            </div>

            {/* Visual */}
            <div className="flex items-center justify-center bg-gradient-to-b from-background/60 to-background/20 px-6 py-6">
              {steps[stepIdx].visual}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-white/20",
                  )}
                />
              ))}
            </div>

            {/* Copy + actions */}
            <div className="border-t border-white/10 p-6">
              <DialogTitle className="font-display text-lg font-extrabold tracking-tight">
                {steps[stepIdx].title}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm">
                {steps[stepIdx].text}
              </DialogDescription>

              <div className="mt-5 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  disabled={stepIdx === 0}
                  className="h-10 rounded-xl px-3 font-bold"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                {stepIdx < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
                    className="h-10 rounded-xl px-5 font-bold"
                  >
                    Próximo <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStepIdx(0)}
                      className="h-10 rounded-xl px-3 text-xs font-bold"
                    >
                      Ver novamente
                    </Button>
                    <Button
                      type="button"
                      onClick={handleFinish}
                      className="h-10 rounded-xl px-5 font-bold"
                    >
                      <Check className="h-4 w-4" /> Entendi
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
