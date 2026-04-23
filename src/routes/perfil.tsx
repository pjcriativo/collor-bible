import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarClock,
  Camera,
  Check,
  CreditCard,
  Heart,
  Languages,
  Lock,
  Mail,
  Play,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StoryRow } from "@/components/story-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/hooks/use-store";
import { useChildName } from "@/hooks/use-child-name";
import { useAddressStyle } from "@/hooks/use-address-style";
import { supabase } from "@/integrations/supabase/client";
import {
  type AppLanguage,
  cancelLanguageSwitch,
  LANGUAGES,
  setLanguage,
  useI18n,
  useLanguageHistory,
} from "@/lib/i18n";
import { profileGreeting } from "@/lib/personalize";
import { ChildProfileBlock } from "@/components/child-profile-block";
import { getActiveStories, getAllProgress, getFavorites, getStoryProgress } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [{ title: "Meu perfil — Reino das Cores" }],
  }),
  component: ProfilePage,
});

const MILESTONES = [
  { pct: 25, emoji: "🌱", label: "Semente" },
  { pct: 50, emoji: "🎨", label: "Artista" },
  { pct: 75, emoji: "⭐", label: "Estrela" },
  { pct: 100, emoji: "🏆", label: "Mestre" },
];

const PROFILE_IMAGE_KEY = "ccj-profile-image";
const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Preferência local: mostrar toast ao trocar idioma OU apenas o feedback
// inline no próprio <Select>. Persistida em `localStorage` para sobreviver
// a recargas e ser respeitada já no primeiro render seguinte.
const LANGUAGE_TOAST_PREF_KEY = "ccj.profile.language-toast.v1";
const readLanguageToastPref = (): boolean => {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(LANGUAGE_TOAST_PREF_KEY);
  // Default: mostrar toast (comportamento anterior).
  return stored === null ? true : stored === "1";
};

// Assinatura textual estável dos títulos exibidos no perfil. Usada para
// detectar quando os textos REALMENTE mudaram após uma troca de idioma —
// evitando o uso de timer fixo no badge "Atualizando histórias…".
function titlesSignature(
  recent: ReadonlyArray<{ slug: string; title: string }>,
  last: { slug: string; title: string } | undefined,
): string {
  const recentPart = recent.map((s) => `${s.slug}:${s.title}`).join("|");
  const lastPart = last ? `${last.slug}:${last.title}` : "";
  return `${recentPart}#${lastPart}`;
}

type BillingInfo = {
  email: string | null;
  subscription: {
    status: string;
    amount_cents: number;
    currency: string;
    current_period_end: string | null;
    plans?:
      | { name?: string; billing_interval?: string }
      | { name?: string; billing_interval?: string }[]
      | null;
  } | null;
  sales: Array<{
    id: string;
    status: string;
    amount_cents: number;
    currency: string;
    sold_at: string;
    plans?: { name?: string } | { name?: string }[] | null;
  }>;
  paidTotalCents: number;
};

const PROFILE_COPY: Record<AppLanguage, Record<string, string>> = {
  "pt-BR": {
    account: "Conta",
    appLanguage: "Idioma do app",
    emailLocked: "Email bloqueado",
    emailHint: "O email da compra não pode ser alterado.",
    financial: "Financeiro",
    currentPlan: "Seu plano",
    nextBilling: "Próxima cobrança",
    noPlan: "Sem plano ativo",
    paymentHistory: "Histórico de pagamentos",
    totalPaid: "Total pago",
    changeOwnPassword: "Trocar sua senha",
    passwordHint: "Defina uma nova senha para o seu acesso.",
    newPassword: "Nova senha",
    confirmPassword: "Confirmar senha",
    savePassword: "Salvar senha",
    passwordUpdated: "Senha atualizada",
    passwordMin: "Use pelo menos 8 caracteres",
    passwordMismatch: "As senhas não conferem",
    loadingFinance: "Carregando financeiro...",
    noPayments: "Nenhum pagamento encontrado.",
    monthly: "mensal",
    yearly: "anual",
    updatingLanguage: "Atualizando histórias…",
    languageUpdated: "Idioma atualizado — histórias traduzidas",
    showToastLabel: "Notificar com toast ao trocar o idioma",
    showToastHint: "Quando desligado, o aviso aparece apenas dentro do seletor.",
    languageChangedInline: "Atualizado!",
    cancelSwitch: "Cancelar troca",
    cancelSwitchHint: "Desfaz a mudança antes que as histórias terminem de recarregar.",
    switchCanceled: "Troca de idioma cancelada",
    currentLanguage: "Idioma atual",
    lastUpdate: "Última atualização",
    noLanguageHistory: "Nenhuma troca registrada — este é o seu idioma desde sempre.",
    changedFrom: "de {from}",
    justNow: "agora mesmo",
    minutesAgo: "há {n} min",
    hoursAgo: "há {n} h",
    daysAgo: "há {n} d",
    childProfile: "Perfil da criança",
    childNameLabel: "Nome da criança",
    childNamePlaceholder: "Digite o nome da criança",
    childNameHint:
      "Esse nome será usado nas mensagens do app para deixar a experiência mais especial para a criança.",
    childNameSaved: "Nome salvo!",
    childNameRemoved: "Nome removido",
    childNameError: "Não foi possível salvar o nome",
    childNameSave: "Salvar",
    childNameClear: "Limpar",
    addressStyleLabel: "Como chamar a criança nas mensagens",
    addressStyleHint: "Você pode mudar a qualquer momento, vale para todas as telas.",
    addressStyleName: "Pelo nome",
    addressStyleYou: 'Por "você"',
    addressStyleNamePreview: "Boa, Davi! Mais uma página pintada!",
    addressStyleYouPreview: "Boa! Mais uma página pintada!",
  },
  "en-US": {
    account: "Account",
    appLanguage: "App language",
    emailLocked: "Locked email",
    emailHint: "The purchase email cannot be changed.",
    financial: "Financial",
    currentPlan: "Your plan",
    nextBilling: "Next billing",
    noPlan: "No active plan",
    paymentHistory: "Payment history",
    totalPaid: "Total paid",
    changeOwnPassword: "Change your password",
    passwordHint: "Set a new password for your access.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    savePassword: "Save password",
    passwordUpdated: "Password updated",
    passwordMin: "Use at least 8 characters",
    passwordMismatch: "Passwords do not match",
    loadingFinance: "Loading financial details...",
    noPayments: "No payment found.",
    monthly: "monthly",
    yearly: "yearly",
    updatingLanguage: "Updating stories…",
    languageUpdated: "Language updated — stories translated",
    showToastLabel: "Notify with toast when changing language",
    showToastHint: "When off, the confirmation shows only inside the selector.",
    languageChangedInline: "Updated!",
    cancelSwitch: "Cancel switch",
    cancelSwitchHint: "Undo the change before stories finish reloading.",
    switchCanceled: "Language switch canceled",
    currentLanguage: "Current language",
    lastUpdate: "Last update",
    noLanguageHistory: "No change recorded — this has always been your language.",
    changedFrom: "from {from}",
    justNow: "just now",
    minutesAgo: "{n} min ago",
    hoursAgo: "{n} h ago",
    daysAgo: "{n} d ago",
    childProfile: "Child profile",
    childNameLabel: "Child name",
    childNamePlaceholder: "Type the child's name",
    childNameHint:
      "This name is used across the app to make the experience feel special for the child.",
    childNameSaved: "Name saved!",
    childNameRemoved: "Name removed",
    childNameError: "Couldn't save the name",
    childNameSave: "Save",
    childNameClear: "Clear",
    addressStyleLabel: "How the app addresses the child",
    addressStyleHint: "You can change this anytime, it applies across the whole app.",
    addressStyleName: "By name",
    addressStyleYou: 'Use "you"',
    addressStyleNamePreview: "Nice, Davi! Another page colored!",
    addressStyleYouPreview: "Nice! Another page colored!",
  },
  "es-ES": {
    account: "Cuenta",
    appLanguage: "Idioma de la app",
    emailLocked: "Email bloqueado",
    emailHint: "El email de compra no se puede cambiar.",
    financial: "Financiero",
    currentPlan: "Tu plan",
    nextBilling: "Próximo cobro",
    noPlan: "Sin plan activo",
    paymentHistory: "Historial de pagos",
    totalPaid: "Total pagado",
    changeOwnPassword: "Cambiar tu contraseña",
    passwordHint: "Define una nueva contraseña para tu acceso.",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña",
    savePassword: "Guardar contraseña",
    passwordUpdated: "Contraseña actualizada",
    passwordMin: "Usa al menos 8 caracteres",
    passwordMismatch: "Las contraseñas no coinciden",
    loadingFinance: "Cargando financiero...",
    noPayments: "No se encontró ningún pago.",
    monthly: "mensual",
    yearly: "anual",
    updatingLanguage: "Actualizando historias…",
    languageUpdated: "Idioma actualizado — historias traducidas",
    showToastLabel: "Notificar con toast al cambiar el idioma",
    showToastHint: "Cuando está apagado, el aviso aparece solo dentro del selector.",
    languageChangedInline: "¡Actualizado!",
    cancelSwitch: "Cancelar cambio",
    cancelSwitchHint: "Deshace el cambio antes de que las historias terminen de recargar.",
    switchCanceled: "Cambio de idioma cancelado",
    currentLanguage: "Idioma actual",
    lastUpdate: "Última actualización",
    noLanguageHistory: "No hay cambios registrados — este siempre ha sido tu idioma.",
    changedFrom: "de {from}",
    justNow: "ahora mismo",
    minutesAgo: "hace {n} min",
    hoursAgo: "hace {n} h",
    daysAgo: "hace {n} d",
    childProfile: "Perfil del niño",
    childNameLabel: "Nombre del niño",
    childNamePlaceholder: "Escribe el nombre del niño",
    childNameHint:
      "Este nombre se usa en los mensajes de la app para hacer la experiencia más especial.",
    childNameSaved: "¡Nombre guardado!",
    childNameRemoved: "Nombre eliminado",
    childNameError: "No se pudo guardar el nombre",
    childNameSave: "Guardar",
    childNameClear: "Borrar",
    addressStyleLabel: "Cómo se dirige la app al niño",
    addressStyleHint: "Puedes cambiarlo cuando quieras, vale para toda la app.",
    addressStyleName: "Por su nombre",
    addressStyleYou: 'Usar "tú"',
    addressStyleNamePreview: "¡Bien, Davi! ¡Otra página coloreada!",
    addressStyleYouPreview: "¡Bien! ¡Otra página coloreada!",
  },
};

const money = (cents = 0, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
const dateLabel = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";
const planName = (plans: any) => (Array.isArray(plans) ? plans[0]?.name : plans?.name);

/** Rótulo curto e estável de cada idioma (PT-BR / EN-US / ES-ES). */
const LANGUAGE_SHORT_LABEL: Record<AppLanguage, string> = {
  "pt-BR": "PT-BR",
  "en-US": "EN-US",
  "es-ES": "ES-ES",
};

/** Tempo relativo simples e localizado, usando as chaves do PROFILE_COPY. */
function formatRelativeTime(
  timestampMs: number,
  copy: Record<string, string>,
  nowMs: number,
): string {
  const diffMs = Math.max(0, nowMs - timestampMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return copy.justNow;
  if (minutes < 60) return copy.minutesAgo.replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return copy.hoursAgo.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return copy.daysAgo.replace("{n}", String(days));
}

function MiniProfileStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-background/35 p-3 ring-1 ring-inset ring-white/[0.05]">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 truncate font-display text-sm font-extrabold text-foreground">
        {value}
      </div>
    </div>
  );
}

function ProfilePage() {
  const { language, t } = useI18n();
  const profileText = PROFILE_COPY[language];
  const { addressStyle } = useAddressStyle();
  // Nome da criança usado APENAS na saudação ("Olá, {name}"). O bloco
  // de edição vive em <ChildProfileBlock /> com seu próprio rascunho,
  // estado de saving e toasts de erro/sucesso.
  const { childName } = useChildName();
  // Histórico persistido — sobrevive a recargas e atualiza
  // automaticamente após cada `ccj-language-changed`.
  const languageHistory = useLanguageHistory();
  // Tick a cada 30s para atualizar o "há X min" sem depender de
  // novos eventos. Usa um único interval — barato, e só roda no perfil.
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [langSwitching, setLangSwitching] = useState(false);
  // Preferência: mostrar toast ao trocar o idioma OU apenas o feedback
  // inline no próprio <Select>. Lida do `localStorage` no init para já
  // refletir a escolha persistida no primeiro render.
  const [showLanguageToast, setShowLanguageToast] = useState<boolean>(readLanguageToastPref);
  // Mostra um checkmark "Atualizado!" inline no rótulo do select por
  // ~1.4s quando o toast está desligado — garante que o usuário ainda
  // perceba que a troca foi aplicada.
  const [languageInlineConfirm, setLanguageInlineConfirm] = useState(false);
  const inlineConfirmTimeoutRef = useRef<number | null>(null);
  // Bump local incrementado a cada `ccj-language-changed`. Garante um
  // re-render explícito de TODO o ProfilePage (incluindo o FAB e a lista
  // "Continue colorindo") quando o idioma muda — mesmo que `useI18n` ou
  // `useStore` falhem em propagar a mudança por algum motivo (cache de
  // seletor, hot-reload, sync vindo do backend, ou outra aba via `storage`).
  const [, setLanguageBump] = useState(0);
  // Assinatura dos títulos exibidos no momento em que o evento
  // `ccj-language-changed` é recebido. O badge "Atualizando histórias…"
  // permanece visível até que a assinatura atual DIVIRJA dessa — só então
  // sabemos que os textos dos cards (e do FAB) realmente foram trocados.
  const pendingTitlesRef = useRef<string | null>(null);
  const langSwitchTimeoutRef = useRef<number | null>(null);
  const progress = useStore(() => getAllProgress());
  const favs = useStore(() => getFavorites());
  const stories = useStore(() => getActiveStories());
  const total = stories.length;

  const totalPages = stories.reduce((sum, s) => sum + s.pages.length, 0);
  const totalDone = stories.reduce((sum, s) => sum + getStoryProgress(s.slug).done, 0);
  const overallPct = totalPages > 0 ? Math.round((totalDone / totalPages) * 100) : 0;
  const earnedMilestones = MILESTONES.filter((m) => overallPct >= m.pct);
  const nextMilestone = MILESTONES.find((m) => overallPct < m.pct);

  // Selector consolidado para "Continue colorindo" + FAB.
  //
  // Garantias:
  //  1. Localização: usa exclusivamente `stories` (saída de `getActiveStories()`,
  //     já localizado pelo idioma ativo) como fonte dos títulos.
  //  2. Consistência: `recentStories`, `lastEntry` e `lastStory` são derivados
  //     do MESMO snapshot — não há janela em que o FAB aponte para uma história
  //     ausente do trilho ou inativa/removida.
  //  3. Memoização: recalcula só quando muda o `progress`, o conjunto de
  //     histórias ativas, o idioma, ou um bump explícito de `ccj-language-changed`.
  //  4. Ordenação estável: mais recente primeiro por `updatedAt`.
  const { recentStories, lastEntry, lastStory } = useMemo(() => {
    const storyBySlug = new Map(stories.map((s) => [s.slug, s] as const));
    // Mantém apenas progressos que ainda têm uma história ativa correspondente
    // ANTES de ordenar/escolher o "último" — evita FAB órfão apontando para
    // uma história desativada cujo slug ainda existe no progresso local.
    const validProgress = progress
      .filter((entry) => storyBySlug.has(entry.storySlug))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const recent = validProgress.map((entry) => storyBySlug.get(entry.storySlug)!).slice(0, 12);

    const last = validProgress[0];
    return {
      recentStories: recent,
      lastEntry: last,
      lastStory: last ? storyBySlug.get(last.storySlug) : undefined,
    };
    // `language` está nas deps para invalidar a memoização quando o idioma
    // muda — `stories` já é uma nova referência por causa do `useStore`,
    // mas mantemos `language` explícito para deixar a intenção clara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, stories, language]);

  // Snapshots dos últimos valores renderizados — necessários no listener
  // do evento, que precisa ler a assinatura ANTES do re-render disparar.
  // Atualizados via efeito após cada commit (abaixo).
  const recentStoriesRef = useRef(recentStories);
  const lastStoryRef = useRef(lastStory);
  const currentSignature = titlesSignature(recentStories, lastStory);

  // Após cada render: sincroniza os refs e verifica se a assinatura mudou
  // em relação à capturada no momento do evento. Quando mudou, desligamos
  // o badge IMEDIATAMENTE (sem esperar o timer fixo).
  useEffect(() => {
    recentStoriesRef.current = recentStories;
    lastStoryRef.current = lastStory;
    if (pendingTitlesRef.current !== null && pendingTitlesRef.current !== currentSignature) {
      pendingTitlesRef.current = null;
      if (langSwitchTimeoutRef.current) {
        window.clearTimeout(langSwitchTimeoutRef.current);
        langSwitchTimeoutRef.current = null;
      }
      setLangSwitching(false);
    }
  }, [currentSignature, recentStories, lastStory]);

  const stats = [
    { label: t("started"), value: progress.length },
    { label: t("favoriteStat"), value: favs.length },
    { label: t("available"), value: total },
  ];

  useEffect(() => {
    setProfileImage(localStorage.getItem(PROFILE_IMAGE_KEY));
  }, []);

  // Limpa o timer da confirmação inline ao desmontar.
  useEffect(() => {
    return () => {
      if (inlineConfirmTimeoutRef.current) {
        window.clearTimeout(inlineConfirmTimeoutRef.current);
      }
    };
  }, []);

  // Listener dedicado do perfil — força re-render e mostra o feedback
  // visual (badge "Atualizando histórias…" + spinner no FAB) também quando
  // o idioma é trocado por uma origem diferente do <Select> local
  // (ex.: sync do backend em `useI18n`, outra aba via `storage`).
  useEffect(() => {
    const handle = () => {
      // Captura a assinatura ANTES do re-render — assim o efeito abaixo
      // (que roda DEPOIS do commit) pode comparar e detectar a mudança real.
      pendingTitlesRef.current = titlesSignature(recentStoriesRef.current, lastStoryRef.current);
      setLanguageBump((value) => value + 1);
      setLangSwitching(true);
      // Fallback de segurança — caso os títulos NÃO mudem (ex.: idioma sem
      // tradução cai no mesmo texto), não deixa o badge preso para sempre.
      if (langSwitchTimeoutRef.current) window.clearTimeout(langSwitchTimeoutRef.current);
      langSwitchTimeoutRef.current = window.setTimeout(() => {
        pendingTitlesRef.current = null;
        setLangSwitching(false);
      }, 1500);
    };
    window.addEventListener("ccj-language-changed", handle);
    return () => {
      window.removeEventListener("ccj-language-changed", handle);
      if (langSwitchTimeoutRef.current) window.clearTimeout(langSwitchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        if (mounted) setBillingLoading(false);
        return;
      }
      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (mounted) {
        setBilling(response.ok ? payload : null);
        setBillingLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleProfileImageUpload = (file?: File) => {
    if (!file) return;
    if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
      toast.error("Use uma imagem PNG, JPG ou WEBP");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error("Use uma imagem de até 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith("data:image/")) {
        toast.error("Imagem inválida");
        return;
      }
      localStorage.setItem(PROFILE_IMAGE_KEY, dataUrl);
      setProfileImage(dataUrl);
      window.dispatchEvent(new Event("ccj-profile-image-updated"));
      toast.success("Foto do perfil atualizada!");
    };
    reader.onerror = () => toast.error("Não foi possível carregar a imagem");
    reader.readAsDataURL(file);
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error(profileText.passwordMin);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(profileText.passwordMismatch);
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success(profileText.passwordUpdated);
  };

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      {/* Header — avatar sólido + título grande */}
      <header className="flex items-center gap-5">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Enviar foto do perfil"
            className="group flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-2xl font-bold text-foreground/90 ring-1 ring-inset ring-white/[0.08] transition hover:ring-primary/60 sm:h-20 sm:w-20 sm:text-3xl"
          >
            {profileImage ? (
              <img src={profileImage} alt="Foto do perfil" className="h-full w-full object-cover" />
            ) : (
              "A"
            )}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Trocar foto do perfil"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft ring-2 ring-background"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => handleProfileImageUpload(event.target.files?.[0])}
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {/* Truncamento elegante para nomes longos sem perder o valor. */}
            <span className="block truncate">
              {profileGreeting(language, childName, addressStyle)}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t("profileSub")}</p>
        </div>
      </header>

      {/* Stats — três cards sóbrios */}
      <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-surface/80 p-5 text-left ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur sm:p-6"
            aria-busy={langSwitching}
          >
            <div className="font-display text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
              {s.value}
            </div>
            {langSwitching ? (
              <Skeleton className="mt-2 h-3 w-16 sm:w-20" />
            ) : (
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                {s.label}
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur sm:p-6">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:text-[11px]">
            <Languages className="h-3.5 w-3.5" /> {profileText.account}
          </p>
          {/* Status persistente do idioma — confirma para o usuário qual é
              o idioma atual e quando foi a última troca aplicada. Sobrevive
              a recargas (lê de localStorage via useLanguageHistory). */}
          <div
            className="mt-4 rounded-xl bg-background/35 p-3 ring-1 ring-inset ring-white/[0.05]"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {profileText.currentLanguage}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 font-display text-[11px] font-extrabold tracking-[0.06em] text-mint ring-1 ring-inset ring-mint/30 tabular-nums">
                <Check className="h-3 w-3" strokeWidth={3} />
                {LANGUAGE_SHORT_LABEL[language]}
              </span>
            </div>
            {languageHistory && languageHistory.to === language ? (
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                {profileText.lastUpdate}:{" "}
                <span className="font-semibold text-foreground">
                  {formatRelativeTime(languageHistory.at, profileText, nowTick)}
                </span>
                {languageHistory.from && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="tabular-nums">
                      {profileText.changedFrom.replace(
                        "{from}",
                        LANGUAGE_SHORT_LABEL[languageHistory.from],
                      )}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                {profileText.noLanguageHistory}
              </p>
            )}
          </div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span className="flex flex-wrap items-center gap-2">
                {profileText.appLanguage}
                {langSwitching && (
                  <>
                    <span
                      role="status"
                      aria-live="polite"
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary ring-1 ring-inset ring-primary/30 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      {profileText.updatingLanguage}
                    </span>
                    {/* Cancelar troca: única ação NÃO desabilitada durante a
                        janela de switching — reverte a mudança em andamento
                        para o idioma anterior antes da UI consolidar. */}
                    <button
                      type="button"
                      onClick={() => {
                        const reverted = cancelLanguageSwitch();
                        if (reverted) {
                          // Cancela qualquer toast/inline pendente da troca
                          // que está sendo desfeita.
                          if (inlineConfirmTimeoutRef.current) {
                            window.clearTimeout(inlineConfirmTimeoutRef.current);
                          }
                          setLanguageInlineConfirm(false);
                          // Notifica via toast usando o idioma para o qual
                          // acabamos de reverter — chave lida da PROFILE_COPY
                          // do idioma agora ativo (após a reversão).
                          if (showLanguageToast) {
                            const restored =
                              (window.localStorage.getItem(
                                "ccj.app-language.v1",
                              ) as AppLanguage | null) ?? "pt-BR";
                            const text =
                              PROFILE_COPY[restored]?.switchCanceled ?? profileText.switchCanceled;
                            toast.success(text);
                          }
                        }
                      }}
                      title={profileText.cancelSwitchHint}
                      aria-label={profileText.cancelSwitch}
                      className="inline-flex items-center gap-1 rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-coral ring-1 ring-inset ring-coral/30 transition hover:bg-coral/25 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                      {profileText.cancelSwitch}
                    </button>
                  </>
                )}
              </span>
              <Select
                value={language}
                disabled={langSwitching}
                onValueChange={(value) => {
                  // Trava extra: ignora qualquer mudança enquanto a anterior
                  // ainda não terminou (estado `langSwitching` ativo).
                  if (langSwitching || value === language) return;
                  setLanguage(value as AppLanguage);
                  // O badge "Atualizando histórias…" e o pulse do FAB
                  // são ativados pelo listener de `ccj-language-changed`
                  // mais abaixo — assim funciona também para mudanças
                  // vindas de outras origens (sync de backend, outra aba).
                  if (showLanguageToast) {
                    toast.success(PROFILE_COPY[value as AppLanguage].languageUpdated);
                  } else {
                    // Feedback inline ao lado do rótulo, por ~1.4s.
                    setLanguageInlineConfirm(true);
                    if (inlineConfirmTimeoutRef.current) {
                      window.clearTimeout(inlineConfirmTimeoutRef.current);
                    }
                    inlineConfirmTimeoutRef.current = window.setTimeout(() => {
                      setLanguageInlineConfirm(false);
                    }, 1400);
                  }
                }}
              >
                <SelectTrigger
                  className="h-11 rounded-xl bg-background/45 ring-1 ring-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-busy={langSwitching}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Confirmação inline (ativa quando o toast está desligado) */}
              {!showLanguageToast && languageInlineConfirm && (
                <span
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1.5 self-start rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-mint ring-1 ring-inset ring-mint/30 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                  {profileText.languageChangedInline}
                </span>
              )}
            </label>
            {/* Toggle: toast vs feedback inline */}
            <div className="flex items-start justify-between gap-3 rounded-xl bg-background/35 p-3 ring-1 ring-inset ring-white/[0.05]">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{profileText.showToastLabel}</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {profileText.showToastHint}
                </p>
              </div>
              <Switch
                checked={showLanguageToast}
                disabled={langSwitching}
                onCheckedChange={(checked) => {
                  if (langSwitching) return;
                  setShowLanguageToast(checked);
                  window.localStorage.setItem(LANGUAGE_TOAST_PREF_KEY, checked ? "1" : "0");
                }}
                aria-label={profileText.showToastLabel}
              />
            </div>
            <label className="grid gap-2 text-sm font-bold text-foreground">
              {profileText.emailLocked}
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={billing?.email ?? ""}
                  disabled
                  readOnly
                  className="h-11 rounded-xl bg-background/45 pl-10"
                />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {profileText.emailHint}
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur sm:p-6">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:text-[11px]">
            <CreditCard className="h-3.5 w-3.5" /> {profileText.financial}
          </p>
          {billingLoading ? (
            <div className="mt-5 text-sm text-muted-foreground">{profileText.loadingFinance}</div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniProfileStat
                label={profileText.currentPlan}
                value={planName(billing?.subscription?.plans) ?? profileText.noPlan}
              />
              <MiniProfileStat
                label={profileText.totalPaid}
                value={money(
                  billing?.paidTotalCents ?? 0,
                  billing?.subscription?.currency ?? "BRL",
                )}
              />
              <MiniProfileStat
                label={profileText.nextBilling}
                value={dateLabel(billing?.subscription?.current_period_end)}
                icon={<CalendarClock className="h-4 w-4" />}
              />
            </div>
          )}
          <div className="mt-5 space-y-2">
            <h3 className="font-display text-sm font-bold text-foreground">
              {profileText.paymentHistory}
            </h3>
            {(billing?.sales.length ?? 0) === 0 ? (
              <p className="rounded-xl bg-background/35 p-3 text-sm text-muted-foreground">
                {profileText.noPayments}
              </p>
            ) : (
              billing?.sales.slice(0, 3).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background/35 p-3 text-sm"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    {planName(sale.plans) ?? profileText.currentPlan} · {dateLabel(sale.sold_at)}
                  </span>
                  <span className="font-bold text-foreground">
                    {money(sale.amount_cents, sale.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Bloco "Perfil da criança" — opcional, salva no DB via useChildName */}
      <ChildProfileBlock
        copy={{
          childProfile: profileText.childProfile,
          childNameLabel: profileText.childNameLabel,
          childNamePlaceholder: profileText.childNamePlaceholder,
          childNameHint: profileText.childNameHint,
          childNameSaved: profileText.childNameSaved,
          childNameRemoved: profileText.childNameRemoved,
          childNameError: profileText.childNameError,
          childNameSave: profileText.childNameSave,
          childNameClear: profileText.childNameClear,
          saving: t("saving"),
          addressStyleLabel: profileText.addressStyleLabel,
          addressStyleHint: profileText.addressStyleHint,
          addressStyleName: profileText.addressStyleName,
          addressStyleYou: profileText.addressStyleYou,
          addressStyleNamePreview: profileText.addressStyleNamePreview,
          addressStyleYouPreview: profileText.addressStyleYouPreview,
        }}
      />

      <form
        onSubmit={handlePasswordUpdate}
        className="mt-6 rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur sm:p-6"
      >
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:text-[11px]">
          <Lock className="h-3.5 w-3.5" /> {profileText.changeOwnPassword}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{profileText.passwordHint}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={profileText.newPassword}
            autoComplete="new-password"
            className="h-11 rounded-xl bg-background/45"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={profileText.confirmPassword}
            autoComplete="new-password"
            className="h-11 rounded-xl bg-background/45"
          />
          <Button
            type="submit"
            disabled={savingPassword}
            className="h-11 rounded-xl px-5 font-bold"
          >
            {savingPassword ? t("saving") : profileText.savePassword}
          </Button>
        </div>
      </form>

      {/* Progresso geral premium */}
      <section className="mt-6 overflow-hidden rounded-2xl bg-surface/80 p-6 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:text-[11px]">
              <Trophy className="h-3.5 w-3.5" strokeWidth={2} /> {t("progress")}
            </p>
            {langSwitching ? (
              <>
                <Skeleton className="mt-2 h-6 w-3/4 sm:h-7" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-lg font-bold tracking-tight text-foreground sm:text-2xl">
                  {t("totalColored", { done: totalDone, total: totalPages })}
                </h2>
                {nextMilestone ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t("missingMilestone", { pct: nextMilestone.pct - overallPct })}{" "}
                    <span className="font-semibold text-foreground">
                      {nextMilestone.emoji} {nextMilestone.label}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm font-semibold text-primary">{t("master")}</p>
                )}
              </>
            )}
          </div>
          <div className="shrink-0 rounded-2xl bg-background/50 px-4 py-3 text-center ring-1 ring-inset ring-white/[0.07]">
            <div className="font-display text-2xl font-extrabold tabular-nums text-primary sm:text-3xl">
              {overallPct}%
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {t("complete")}
            </div>
          </div>
        </div>

        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
          role="progressbar"
          aria-valuenow={totalDone}
          aria-valuemin={0}
          aria-valuemax={totalPages}
          aria-label={`${totalDone} de ${totalPages} páginas coloridas no total`}
        >
          <div
            className="h-full rounded-full bg-gradient-gold transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {/* Conquistas — fileira de medalhas discretas */}
        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
          {MILESTONES.map((m) => {
            const earned = earnedMilestones.includes(m);
            return (
              <div
                key={m.pct}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition-all",
                  earned
                    ? "bg-background/60 ring-1 ring-inset ring-primary/35"
                    : "bg-background/25 opacity-50",
                )}
                aria-label={`Conquista ${m.label} aos ${m.pct}%${earned ? " — desbloqueada" : " — bloqueada"}`}
              >
                <span className={cn("text-2xl", !earned && "grayscale")}>{m.emoji}</span>
                <span className="font-display text-[11px] font-bold leading-none text-foreground">
                  {m.label}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {m.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Continue colorindo — trilho premium */}
      {recentStories.length === 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t("continueColoring")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("resume")}</p>
          <div className="mt-5 rounded-2xl bg-surface/70 p-8 text-center text-sm text-muted-foreground ring-1 ring-inset ring-white/[0.07] backdrop-blur">
            {t("noStarted")}
          </div>
        </section>
      ) : (
        <div
          className={cn(
            "-mx-5 sm:-mx-8 lg:-mx-12 transition-all duration-300",
            langSwitching && "opacity-70 [filter:saturate(0.9)]",
          )}
          aria-busy={langSwitching}
        >
          {langSwitching && (
            <div
              role="status"
              aria-live="polite"
              className="mx-5 sm:mx-8 lg:mx-12 mb-2 inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary ring-1 ring-inset ring-primary/30 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              {profileText.updatingLanguage}
            </div>
          )}
          {langSwitching ? (
            <div className="px-5 sm:px-8 lg:px-12">
              {/* Cabeçalho: título + subtítulo da seção */}
              <Skeleton className="h-6 w-48 sm:h-7 sm:w-60" />
              <Skeleton className="mt-2 h-4 w-64" />
              {/* Trilho horizontal de cards */}
              <div className="mt-5 flex gap-4 overflow-hidden">
                {Array.from({ length: Math.min(recentStories.length || 4, 6) }).map((_, idx) => (
                  <div key={idx} className="shrink-0 space-y-3">
                    <Skeleton className="h-44 w-36 rounded-2xl sm:h-52 sm:w-44" />
                    <Skeleton className="h-3.5 w-28 sm:w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <StoryRow
              title={t("continueColoring")}
              subtitle={t("resume")}
              stories={recentStories}
            />
          )}
        </div>
      )}

      {/* Atalhos */}
      <section className="mt-12 grid gap-3 sm:grid-cols-2">
        <Link
          to="/favoritos"
          className="group flex items-center gap-3 rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur transition hover:bg-surface-2 hover:ring-white/[0.14]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/12 text-coral ring-1 ring-inset ring-coral/20">
            <Heart className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="font-display text-base font-bold text-foreground">
            {t("viewFavorites")}
          </span>
        </Link>
        <Link
          to="/home"
          className="group flex items-center gap-3 rounded-2xl bg-surface/80 p-5 ring-1 ring-inset ring-white/[0.07] shadow-card backdrop-blur transition hover:bg-surface-2 hover:ring-white/[0.14]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky/12 text-sky ring-1 ring-inset ring-sky/20">
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="font-display text-base font-bold text-foreground">
            {t("exploreAll")}
          </span>
        </Link>
      </section>

      {/* FAB Continuar */}
      {lastEntry && lastStory && (
        <Link
          to="/colorir/$slug"
          params={{ slug: lastStory.slug }}
          search={{ page: lastEntry.pageIndex }}
          aria-label={`Voltar a colorir ${lastStory.title} na página ${lastEntry.pageIndex + 1}`}
          aria-busy={langSwitching}
          className={cn(
            "fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground shadow-glow-gold ring-1 ring-white/15 transition hover:scale-[1.03] active:scale-95 sm:bottom-8 sm:right-8 sm:text-base",
            langSwitching && "ring-2 ring-primary-foreground/60 animate-pulse",
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/15">
            {langSwitching ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">
              {t("continue")}
            </span>
            <span className="line-clamp-1 max-w-[140px] sm:max-w-[200px]">{lastStory.title}</span>
          </span>
        </Link>
      )}
    </main>
  );
}
