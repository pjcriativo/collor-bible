import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Heart,
  Loader2,
  LogOut,
  Search,
  Smartphone,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-icon.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBranding } from "@/hooks/use-branding";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useStore } from "@/hooks/use-store";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getNewStories } from "@/lib/store";
import { cn } from "@/lib/utils";

const PROFILE_IMAGE_KEY = "ccj-profile-image";
const SEEN_NEWS_KEY = "ccj.seen-news-story-ids.v1";

export function AppHeader() {
  const loc = useLocation();
  const { t, localizeStory } = useI18n();
  const navigate = useNavigate();
  const branding = useBranding();
  const [scrolled, setScrolled] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [seenNewsIds, setSeenNewsIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();
  const newStories = useStore(() =>
    [...getNewStories()].sort((a, b) => b.order - a.order).slice(0, 5),
  );

  const unseenCount = newStories.filter((story) => !seenNewsIds.includes(story.id)).length;

  const markNewsAsSeen = async () => {
    const ids = newStories.map((story) => story.id);
    setSeenNewsIds(ids);
    if (userId) {
      const rows = ids.map((storyId) => ({ user_id: userId, story_id: storyId }));
      if (rows.length > 0) {
        await (supabase as any)
          .from("user_notification_reads")
          .upsert(rows, { onConflict: "user_id,story_id" });
      }
    } else {
      localStorage.setItem(SEEN_NEWS_KEY, JSON.stringify(ids));
    }
  };

  useEffect(() => {
    // Em mobile, o scroll real acontece dentro de `#app-scroll` (app
    // shell). Em desktop, o documento continua rolando normalmente.
    // Escutamos os DOIS para que o estado "scrolled" funcione nos dois
    // modos sem branching condicional.
    const scroller = typeof document !== "undefined" ? document.getElementById("app-scroll") : null;
    const onScroll = () => {
      const y = scroller && scroller.scrollTop > 0 ? scroller.scrollTop : window.scrollY;
      setScrolled(y > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const syncProfileImage = () => setProfileImage(localStorage.getItem(PROFILE_IMAGE_KEY));
    syncProfileImage();
    window.addEventListener("storage", syncProfileImage);
    window.addEventListener("ccj-profile-image-updated", syncProfileImage);
    return () => {
      window.removeEventListener("storage", syncProfileImage);
      window.removeEventListener("ccj-profile-image-updated", syncProfileImage);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_NEWS_KEY);
      setSeenNewsIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setSeenNewsIds([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUserId(data.session?.user.id ?? null);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    syncSession();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    const syncSeenNews = async () => {
      const { data } = await (supabase as any)
        .from("user_notification_reads")
        .select("story_id")
        .eq("user_id", userId);

      if (mounted) {
        setSeenNewsIds((data ?? []).map((row: { story_id: string }) => row.story_id));
      }
    };

    syncSeenNews();
    return () => {
      mounted = false;
    };
  }, [userId, newStories.length]);

  if (
    loc.pathname.startsWith("/colorir") ||
    loc.pathname.startsWith("/admin") ||
    loc.pathname === "/"
  ) {
    return null;
  }

  return (
    <header
      className={cn(
        "app-shell-header sticky top-0 z-30 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.06] glass-dark shadow-soft"
          : "border-b border-transparent bg-background/40 backdrop-blur-md",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-5 sm:h-16 sm:px-8 lg:px-12">
        <Link to="/home" className="flex items-center gap-2.5 transition hover:opacity-90">
          <img
            src={branding.logoUrl ?? logo}
            alt={branding.logoAlt}
            className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            width={40}
            height={40}
          />
          <span className="font-display text-[15px] font-bold leading-none tracking-tight text-foreground sm:text-base">
            {branding.appName}
          </span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link
            to="/buscar"
            aria-label={t("search")}
            // No mobile já existe a aba "Buscar" na tab bar inferior —
            // esconder aqui evita duplicidade e dá respiro ao header.
            className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:bg-white/[0.06] hover:text-foreground md:flex"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
          <Popover onOpenChange={(open) => open && markNewsAsSeen()}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("news")}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {unseenCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-display text-[10px] font-extrabold leading-none text-primary-foreground shadow-glow-gold">
                    {unseenCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="max-h-[min(78dvh,34rem)] w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-[1.75rem] border-border/80 bg-popover/95 p-0 shadow-elevated backdrop-blur-xl sm:w-96"
            >
              <div className="border-b border-border/70 bg-surface-2/60 px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 font-display text-sm font-extrabold text-foreground">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                      <Sparkles className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="truncate">{t("news")}</span>
                  </div>
                  {unseenCount > 0 && (
                    <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 font-display text-[11px] font-extrabold leading-none text-primary-foreground shadow-glow-gold">
                      {unseenCount}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground sm:text-xs">
                  {t("newsHint")}
                </p>
              </div>
              {newStories.length > 0 ? (
                <div className="premium-scrollbar max-h-[calc(min(78dvh,34rem)-7.75rem)] space-y-2 overflow-y-auto p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:p-3">
                  {newStories.map((story) => {
                    const localizedStory = localizeStory(story);
                    return (
                      <Link
                        key={story.id}
                        to="/historia/$slug"
                        params={{ slug: story.slug }}
                        className="group flex gap-2.5 rounded-2xl border border-border/70 bg-card/70 p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/70 hover:shadow-soft sm:gap-3"
                      >
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/[0.08] sm:h-16 sm:w-16">
                          <img
                            src={story.coverSmall ?? story.coverMedium ?? story.cover}
                            alt={localizedStory.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            width={64}
                            height={64}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-1 inline-flex rounded-full bg-primary/12 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase leading-none text-primary">
                            {t("newTheme")}
                          </span>
                          <span className="block truncate font-display text-[13px] font-extrabold text-foreground sm:text-sm">
                            {localizedStory.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-muted-foreground sm:mt-1 sm:text-xs sm:leading-5">
                            {localizedStory.shortDescription || localizedStory.subtitle}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {t("noNews")}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Link
            to="/favoritos"
            aria-label={t("favorites")}
            // Idem busca — favoritos já está na tab bar inferior no mobile.
            className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:bg-white/[0.06] hover:text-foreground md:flex"
          >
            <Heart className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
          <Popover open={profileOpen} onOpenChange={setProfileOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("profile")}
                className="ml-1.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-sm font-bold text-foreground/90 ring-1 ring-white/[0.08] transition hover:bg-surface-2 hover:ring-white/15 sm:ml-2"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Foto do perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "A"
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={10}
              className="w-56 overflow-hidden rounded-2xl border-border/80 bg-popover/95 p-1.5 shadow-elevated backdrop-blur-xl"
            >
              <Link
                to="/perfil"
                onClick={() => setProfileOpen(false)}
                // No mobile a aba "Perfil" do tab bar inferior já cobre essa ação,
                // então escondemos o item aqui pra não duplicar e deixar só "Sair".
                className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent/70 sm:flex"
              >
                <UserCircle2 className="h-[18px] w-[18px] text-primary" strokeWidth={1.9} />
                {t("profile")}
              </Link>
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  if (signingOut) return;
                  setSigningOut(true);
                  const loadingId = toast.loading("Saindo da sua conta...");
                  try {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    toast.success("Você saiu da sua conta.", { id: loadingId });
                    setProfileOpen(false);
                    navigate({ to: "/" });
                  } catch (err) {
                    toast.error("Não foi possível sair. Tente novamente.", { id: loadingId });
                    setSigningOut(false);
                  }
                }}
                className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground transition hover:bg-destructive/15 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-foreground"
              >
                {signingOut ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.9} />
                ) : (
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
                )}
                {signingOut ? "Saindo..." : "Sair"}
              </button>
              {/*
                "Adicionar aplicativo" — só faz sentido quando o app
                ainda NÃO está instalado como PWA. Em browsers que suportam
                o `beforeinstallprompt` (Chrome/Edge/Android), o clique
                dispara o diálogo nativo "Adicionar à tela inicial". No
                iOS Safari (sem API), guiamos o usuário com um toast
                explicando o caminho via botão de compartilhar.
              */}
              {!isStandalone && (
                <button
                  type="button"
                  disabled={installing}
                  onClick={async () => {
                    if (installing) return;
                    setInstalling(true);
                    try {
                      if (canInstall) {
                        const loadingId = toast.loading("Abrindo instalação...");
                        const outcome = await promptInstall();
                        if (outcome === "accepted") {
                          toast.success("App adicionado à tela inicial!", { id: loadingId });
                          setProfileOpen(false);
                        } else if (outcome === "dismissed") {
                          toast.dismiss(loadingId);
                        } else {
                          toast.message("Use o menu do navegador para adicionar.", {
                            id: loadingId,
                            description: 'Toque em compartilhar e em "Adicionar à Tela de Início".',
                          });
                        }
                      } else {
                        // iOS Safari e outros sem API nativa.
                        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
                        const isIOS = /iPhone|iPad|iPod/i.test(ua);
                        if (isIOS) {
                          toast.message("Como instalar no iPhone/iPad", {
                            description:
                              '1. Toque no ícone Compartilhar (quadrado com a seta para cima) na barra do Safari.\n2. Role para baixo e toque em "Adicionar à Tela de Início".\n3. Confirme em "Adicionar" no canto superior direito.',
                            duration: 9000,
                          });
                        } else {
                          toast.message("Adicionar à tela inicial", {
                            description:
                              'Abra o menu do navegador (⋮) e toque em "Adicionar à tela inicial" ou "Instalar app".',
                            duration: 6000,
                          });
                        }
                      }
                    } finally {
                      setInstalling(false);
                    }
                  }}
                  className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {installing ? (
                    <Loader2
                      className="h-[18px] w-[18px] animate-spin text-primary"
                      strokeWidth={1.9}
                    />
                  ) : (
                    <Smartphone className="h-[18px] w-[18px] text-primary" strokeWidth={1.9} />
                  )}
                  {installing ? "Instalando..." : "Adicionar aplicativo"}
                </button>
              )}
              {isStandalone && (
                <div
                  className="mt-0.5 flex w-full items-center gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary"
                  role="status"
                  aria-label="Aplicativo já instalado"
                >
                  <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  <span className="flex-1">App instalado</span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-wide text-primary">
                    PWA
                  </span>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
