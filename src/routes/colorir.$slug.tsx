import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Award, BookOpen, PartyPopper, Sparkles, Trophy, X } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useColoringState } from "@/hooks/use-coloring-state";
import { ColoringHeader } from "@/components/coloring/coloring-header";
import { ColoringCanvas } from "@/components/coloring/coloring-canvas";
import { ColoringPalette } from "@/components/coloring/coloring-palette";
import { downloadColoringPng } from "@/lib/export-coloring";
import { suggestFillsFromSvg } from "@/lib/color-suggestions";
import { isPopMuted, togglePopMuted } from "@/lib/pop-sound";
import {
  getActiveStories,
  getProgress,
  getStoryBySlug,
  getStoryProgress,
  touchProgressPage,
  hasShownPageCompleteToast,
  markPageCompleteToastShown,
  hasShownMilestoneToast,
  markMilestoneToastShown,
  hasShownStoryDoneToast,
  markStoryDoneToastShown,
  hasShownFirstPageToast,
  markFirstPageToastShown,
  hasShownHalfStoryToast,
  markHalfStoryToastShown,
} from "@/lib/store";
import { type AppLanguage, useI18n } from "@/lib/i18n";
import { useChildName } from "@/hooks/use-child-name";
import { useChildNameRecentlyUpdated } from "@/hooks/use-child-name-recently-updated";
import { usePreparedColoringPages } from "@/hooks/use-prepared-coloring-pages";
import { useAddressStyle } from "@/hooks/use-address-style";
import { allowSessionToast } from "@/lib/session-toast-guard";
import {
  pageCompleteBody,
  pageCompleteTitle,
  pageCompleteToast,
  milestoneToast,
  firstPageOfStoryToast,
  halfStoryToast,
  storyDoneToast,
  storyCompleteTitle,
  storyMilestoneTitle,
} from "@/lib/personalize";

const searchSchema = z.object({
  page: z.coerce.number().int().min(0).default(0).optional(),
});

const signatureSchema = z
  .string()
  .trim()
  .min(1, "Digite um nome")
  .max(24, "Use até 24 letras")
  .regex(/^[\p{L}\p{M}\s'-]+$/u, "Use apenas letras");

type AchievementState = { overallPct: number; unlockedMilestone?: string } | null;

const ACHIEVEMENT_COPY: Record<AppLanguage, Record<string, string>> = {
  "pt-BR": {
    badge: "História concluída",
    title: "Parabéns!",
    levelTitle: "Parabéns! Você desbloqueou uma nova fase!",
    body: "Você concluiu esta história e avançou na sua jornada. Continue pintando para chegar à próxima conquista.",
    levelBody:
      "Ao concluir esta história, seu progresso aumentou e uma nova etapa da sua jornada foi liberada.",
    progress: "Progresso no perfil",
    next: "Próxima história",
    home: "Voltar para histórias",
    profile: "Ver meu progresso",
    milestone: "Nova fase",
  },
  "en-US": {
    badge: "Story completed",
    title: "Congratulations!",
    levelTitle: "Congratulations! You unlocked a new stage!",
    body: "You completed this story and moved forward in your journey. Keep coloring to reach the next achievement.",
    levelBody:
      "By completing this story, your progress increased and a new stage of your journey was unlocked.",
    progress: "Profile progress",
    next: "Next story",
    home: "Back to stories",
    profile: "See my progress",
    milestone: "New stage",
  },
  "es-ES": {
    badge: "Historia concluida",
    title: "¡Felicidades!",
    levelTitle: "¡Felicidades! ¡Desbloqueaste una nueva fase!",
    body: "Concluiste esta historia y avanzaste en tu jornada. Sigue coloreando para llegar a la próxima conquista.",
    levelBody:
      "Al concluir esta historia, tu progreso aumentó y una nueva etapa de tu jornada fue liberada.",
    progress: "Progreso del perfil",
    next: "Próxima historia",
    home: "Volver a historias",
    profile: "Ver mi progreso",
    milestone: "Nueva fase",
  },
};

const PAGE_COMPLETE_COPY: Record<
  AppLanguage,
  {
    badge: string;
    title: string;
    body: string;
    nextPage: string;
    nextStory: string;
    close: string;
    pageOf: string;
  }
> = {
  "pt-BR": {
    badge: "Página concluída",
    title: "Parabéns! Página completa! 🎉",
    body: "Você pintou todos os elementos desta página. Continue pintando para concluir a história!",
    nextPage: "Próxima página",
    nextStory: "Próxima história",
    close: "Continuar aqui",
    pageOf: "Página {page} de {total}",
  },
  "en-US": {
    badge: "Page completed",
    title: "Awesome! Page complete! 🎉",
    body: "You colored every element on this page. Keep going to finish the story!",
    nextPage: "Next page",
    nextStory: "Next story",
    close: "Stay here",
    pageOf: "Page {page} of {total}",
  },
  "es-ES": {
    badge: "Página concluida",
    title: "¡Felicidades! ¡Página completa! 🎉",
    body: "Coloreaste todos los elementos de esta página. ¡Sigue pintando para terminar la historia!",
    nextPage: "Próxima página",
    nextStory: "Próxima historia",
    close: "Seguir aquí",
    pageOf: "Página {page} de {total}",
  },
};

/**
 * Microcopy do badge "atualizado agora" exibido nos modais quando o nome
 * da criança é alterado em tempo real (mesma aba ou outra aba), sem reload.
 * Mantido local porque os outros COPY do arquivo seguem o mesmo padrão.
 */
const NAME_UPDATED_BADGE_COPY: Record<AppLanguage, string> = {
  "pt-BR": "Nome atualizado agora",
  "en-US": "Name just updated",
  "es-ES": "Nombre actualizado ahora",
};

export const Route = createFileRoute("/colorir/$slug")({
  validateSearch: searchSchema,
  loader: ({ params }) => {
    const story = getStoryBySlug(params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `Colorir ${loaderData?.story.title ?? ""} — Reino das Cores` }],
  }),
  component: ColoringPage,
  notFoundComponent: ColoringNotFound,
});

function ColoringNotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p>{t("storyNotFound")}</p>
      <Link to="/home" className="text-primary underline">
        {t("back")}
      </Link>
    </div>
  );
}

function ColoringPage() {
  const { language, t } = useI18n();
  const { childName, setChildName } = useChildName();
  const nameJustUpdated = useChildNameRecentlyUpdated();
  const { addressStyle } = useAddressStyle();
  const achievementCopy = ACHIEVEMENT_COPY[language];
  const pageCompleteCopy = PAGE_COMPLETE_COPY[language];
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const story = useStore(() => getStoryBySlug(slug));
  const activeStories = useStore(() => getActiveStories());
  const storyProgress = useStore(() => getProgress(slug));
  const [pageIndex, setPageIndex] = useState<number>(search.page ?? 0);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [achievement, setAchievement] = useState<AchievementState>(null);
  const [pageComplete, setPageComplete] = useState<{ pageIndex: number } | null>(null);
  const [signatureDraft, setSignatureDraft] = useState("");
  const [signatureName, setSignatureName] = useState(() => childName ?? "");
  const [signatureError, setSignatureError] = useState("");
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [popMuted, setPopMuted] = useState<boolean>(() => isPopMuted());
  const svgWrapRef = useRef<HTMLDivElement>(null);

  // Pré-processa páginas PNG line art (Davi e Golias) → SVG paintable.
  // Para histórias 100% SVG, é no-op (devolve as páginas como estão).
  const prepared = usePreparedColoringPages(story ?? null, pageIndex);
  const preparedStory = useMemo(() => {
    if (!story) return null;
    return {
      ...story,
      pages: story.pages.map((p, i) => ({ ...p, svg: prepared.preparedSvgs[i] ?? p.svg })),
    };
  }, [story, prepared.preparedSvgs]);

  const page = useMemo(() => preparedStory?.pages[pageIndex], [preparedStory, pageIndex]);
  const isPagePreparing = prepared.preparingIndices.has(pageIndex);

  const coloring = useColoringState({
    story: preparedStory ?? ({ slug: "", pages: [] } as never),
    pageIndex,
    onStoryComplete: (state) => {
      setAchievement(state);
      // Microtoast: se desbloqueou um milestone, celebra com o nome.
      // Mensagem curta — o modal grande já é o destaque visual.
      // Proteção anti-repetição: cada milestone/história só dispara o
      // microtoast UMA vez por dispositivo. Se o usuário recarregar a tela
      // numa página/história já 100% concluída, o callback pode rodar de
      // novo (refs em memória resetam) — mas o toast não deve reaparecer.
      if (state?.unlockedMilestone) {
        if (
          !hasShownMilestoneToast(state.unlockedMilestone) &&
          allowSessionToast(childName, `milestone:${state.unlockedMilestone}`)
        ) {
          toast.success(
            milestoneToast(language, childName, state.unlockedMilestone, addressStyle),
            {
              duration: 3500,
            },
          );
          markMilestoneToastShown(state.unlockedMilestone);
        }
      } else if (
        !hasShownStoryDoneToast(slug) &&
        allowSessionToast(childName, `story-done:${slug}`)
      ) {
        // História concluída sem milestone novo: ainda assim damos o
        // "muito bem" com nome — incentivo direto pedido pelo PRD.
        toast.success(storyDoneToast(language, childName, addressStyle), { duration: 3000 });
        markStoryDoneToastShown(slug);
      }
    },
    onPageComplete: ({ pageIndex: completedIndex, done, total }) => {
      setPageComplete({ pageIndex: completedIndex });
      // Detecta transições especiais ANTES do toast genérico para
      // dar prioridade às mensagens mais ricas (1ª página, metade).
      // `done/total` vêm do hook calculados EM MEMÓRIA — refletem a
      // página recém-concluída sem esperar o debounce do autosave
      // (`getStoryProgress` lê localStorage e ficaria 500ms atrasado).
      const pctNow = total > 0 ? (done / total) * 100 : 0;
      const pctPrev = total > 0 ? ((done - 1) / total) * 100 : 0;

      // Proteção anti-repetição: se este microtoast já foi mostrado para
      // esta página/história neste dispositivo, NÃO repetir ao recarregar.
      // O modal grande já tem proteção própria via estado de UI; aqui é
      // sobre o "microtoast" leve de incentivo, que não deve reaparecer
      // toda vez que o usuário voltar à página já concluída.
      if (
        done === 1 &&
        !hasShownFirstPageToast(slug) &&
        allowSessionToast(childName, `first-page:${slug}`)
      ) {
        toast.success(firstPageOfStoryToast(language, childName, addressStyle), { duration: 3000 });
        markFirstPageToastShown(slug);
      } else if (
        pctPrev < 50 &&
        pctNow >= 50 &&
        pctNow < 100 &&
        !hasShownHalfStoryToast(slug) &&
        allowSessionToast(childName, `half-story:${slug}`)
      ) {
        toast.success(halfStoryToast(language, childName, addressStyle), { duration: 3000 });
        markHalfStoryToastShown(slug);
      } else if (
        done < total &&
        !hasShownPageCompleteToast(slug, completedIndex) &&
        allowSessionToast(childName, `page-complete:${slug}:${completedIndex}`)
      ) {
        // Toast leve padrão para as demais páginas (mantém ritmo).
        toast.success(pageCompleteToast(language, childName, addressStyle), { duration: 2400 });
        markPageCompleteToastShown(slug, completedIndex);
      }
      // Quando done === total, o `onStoryComplete` cuida do toast — evita duplicar.
    },
  });
  const { applyFill } = coloring;

  // Persiste o `pageIndex` corrente no store sempre que o usuário abrir
  // uma página — mesmo sem pintar nada. Garante que ao tocar a seta de
  // voltar para /home, o "Continue colorindo" do perfil retome
  // exatamente nesta página (e não na última onde houve pintura).
  useEffect(() => {
    if (!story) return;
    touchProgressPage(story.slug, pageIndex);
  }, [story, pageIndex]);

  // Mantém a assinatura sincronizada com o nome salvo no /perfil.
  // Assim, se o pai cadastrar/alterar o nome em outra aba enquanto a
  // página estiver aberta, o PDF baixado já sai com o nome correto sem
  // exigir abrir o modal manualmente.
  useEffect(() => {
    if (childName && childName !== signatureName) {
      setSignatureName(childName);
    }
  }, [childName, signatureName]);

  const handleFill = useCallback(
    (id: string) => {
      applyFill(id);
    },
    [applyFill],
  );

  if (!story || !preparedStory || !page) return null;

  const storyIndex = activeStories.findIndex((item) => item.slug === story.slug);
  const nextStory =
    activeStories.find(
      (item, index) => index > storyIndex && getStoryProgress(item.slug).done === 0,
    ) ??
    activeStories.find(
      (item) => item.slug !== story.slug && getStoryProgress(item.slug).done === 0,
    ) ??
    activeStories.find((item) => item.slug !== story.slug);

  // Combina os fills persistidos por página com os fills atuais (que ainda
  // não foram salvos no debounce) para refletir a pintura em todas as
  // miniaturas em tempo real, sem perder a pintura ao trocar de página.
  const allPagesFills: Record<number, Record<string, string>> = {
    ...(storyProgress?.pagesFills ?? {}),
    [pageIndex]: coloring.fills,
  };

  const handleDownload = () =>
    downloadColoringPng({
      wrap: svgWrapRef.current,
      storySlug: preparedStory.slug,
      pageIndex,
    });

  const goPage = (i: number) => {
    if (i < 0 || i >= preparedStory.pages.length) return;
    setPageIndex(i);
    navigate({
      to: "/colorir/$slug",
      params: { slug: preparedStory.slug },
      search: { page: i },
      replace: true,
    });
  };

  const saveSignature = async () => {
    const parsed = signatureSchema.safeParse(signatureDraft);
    if (!parsed.success) {
      const issueCode = parsed.error.issues[0]?.code;
      setSignatureError(
        issueCode === "too_small"
          ? t("typeName")
          : issueCode === "too_big"
            ? t("useUpToLetters")
            : issueCode === "invalid_string"
              ? t("lettersOnly")
              : t("invalidName"),
      );
      return;
    }
    setSignatureSaving(true);
    const result = await setChildName(parsed.data);
    setSignatureSaving(false);
    if (!result.ok) {
      setSignatureError(result.error ?? t("invalidName"));
      return;
    }
    setSignatureName(result.value);
    setSignatureError("");
    setShowSignature(false);
  };

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-cream">
      <ColoringHeader
        storyTitle={preparedStory.title}
        pageIndex={pageIndex}
        totalPages={preparedStory.pages.length}
        onDownload={handleDownload}
        saved={coloring.saved}
        popMuted={popMuted}
        onTogglePopMuted={() => setPopMuted(togglePopMuted())}
      />

      <div className="relative flex-1 min-h-0">
        <ColoringCanvas
          ref={svgWrapRef}
          svg={page.svg}
          fills={coloring.fills}
          signatureName={signatureName}
          onFill={handleFill}
          showSuggestion={showSuggestion}
          onCloseSuggestion={() => setShowSuggestion(false)}
          pageIndex={pageIndex}
          totalPages={preparedStory.pages.length}
          pageSvgs={preparedStory.pages.map((storyPage) => storyPage.svg)}
          pageFills={allPagesFills}
          onSelectPage={goPage}
          onPrev={() => goPage(pageIndex - 1)}
          onNext={() => goPage(pageIndex + 1)}
          onVerifyComplete={coloring.verifyCurrentPage}
          onForceComplete={coloring.forceCompleteCurrentPage}
        />
        {isPagePreparing && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-bold text-foreground">Preparando página…</p>
            <p className="text-xs text-muted-foreground">Detectando áreas pintáveis</p>
          </div>
        )}
      </div>

      {showSignature && (
        // `overflow-y-auto` no overlay + `max-h-[calc(100%-1rem)]` no
        // form garante que o modal nunca seja cortado pela barra de
        // cores fixa abaixo: o conteúdo rola internamente quando a
        // viewport é curta. `pb-32` reserva espaço para a paleta.
        <div className="absolute inset-0 z-20 flex items-end justify-center overflow-y-auto bg-background/45 p-4 pb-32 sm:items-center sm:pb-4">
          <form
            className="w-full max-w-sm max-h-full overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-hero"
            onSubmit={(event) => {
              event.preventDefault();
              void saveSignature();
            }}
          >
            <label
              className="block font-display text-sm font-bold text-foreground"
              htmlFor="signature-name"
            >
              {t("signature")}
            </label>
            <input
              id="signature-name"
              value={signatureDraft}
              onChange={(event) => {
                setSignatureDraft(event.target.value.slice(0, 24));
                setSignatureError("");
              }}
              maxLength={24}
              disabled={signatureSaving}
              className="mt-3 h-12 w-full rounded-2xl border border-input bg-background px-4 text-base font-bold text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              placeholder={t("childName")}
            />
            {signatureError && (
              <p className="mt-2 text-sm font-semibold text-destructive">{signatureError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSignature(false)}
                disabled={signatureSaving}
                className="h-11 flex-1 rounded-full bg-secondary px-4 text-sm font-bold text-foreground"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={signatureSaving}
                className="h-11 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {signatureSaving ? "..." : t("save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {pageComplete && !achievement && (
        // Mesmo padrão dos outros modais: overlay com scroll vertical e
        // `pb-32` (mobile) para reservar espaço da barra de cores fixa.
        // O `<section>` interno usa `max-h-full` + `overflow-y-auto`
        // para nunca exceder a viewport e oferecer rolagem interna em
        // telas curtas (ex.: tablet em landscape com teclado aberto).
        <div className="absolute inset-0 z-30 flex items-end justify-center overflow-y-auto bg-background/70 p-4 pb-32 backdrop-blur-sm sm:items-center sm:pb-4 animate-in fade-in duration-300">
          <section className="achievement-pop relative w-full max-w-md max-h-full overflow-y-auto rounded-3xl border border-primary/25 bg-card text-card-foreground shadow-hero ring-1 ring-white/[0.08]">
            <button
              type="button"
              onClick={() => setPageComplete(null)}
              aria-label={pageCompleteCopy.close}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/90 backdrop-blur transition hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-gradient-warm px-5 py-6 text-center text-primary-foreground sm:px-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35 animate-bounce">
                <PartyPopper className="h-8 w-8" />
              </div>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/18 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]">
                <Sparkles className="h-3.5 w-3.5" /> {pageCompleteCopy.badge}
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                {pageCompleteTitle(language, childName, addressStyle)}
              </h2>
              {nameJustUpdated && addressStyle === "name" && childName ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="name-updated-badge mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/22 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white ring-1 ring-white/35 backdrop-blur"
                >
                  <Sparkles className="h-3 w-3" /> {NAME_UPDATED_BADGE_COPY[language]}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/85">
                {pageCompleteCopy.pageOf
                  .replace("{page}", String(pageComplete.pageIndex + 1))
                  .replace("{total}", String(story.pages.length))}
              </p>
            </div>
            <div className="px-5 py-5 sm:px-8 sm:py-6">
              <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
                {pageCompleteBody(language, childName, addressStyle)}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {pageComplete.pageIndex < story.pages.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextIndex = pageComplete.pageIndex + 1;
                      setPageComplete(null);
                      goPage(nextIndex);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-display text-sm font-extrabold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] active:scale-95"
                  >
                    {pageCompleteCopy.nextPage} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : nextStory ? (
                  <Link
                    to="/historia/$slug"
                    params={{ slug: nextStory.slug }}
                    onClick={() => setPageComplete(null)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-display text-sm font-extrabold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] active:scale-95"
                  >
                    <BookOpen className="h-4 w-4" /> {pageCompleteCopy.nextStory}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPageComplete(null)}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-secondary px-5 font-display text-sm font-extrabold text-secondary-foreground transition hover:bg-accent"
                >
                  {pageCompleteCopy.close}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {achievement && (
        // Modal de conquista — mesmo tratamento de altura/scroll para
        // não ser ocultado pela paleta na borda inferior.
        <div className="absolute inset-0 z-30 flex items-end justify-center overflow-y-auto bg-background/70 p-4 pb-32 backdrop-blur-sm sm:items-center sm:pb-4">
          <section className="achievement-pop w-full max-w-lg max-h-full overflow-y-auto rounded-3xl border border-primary/25 bg-card text-card-foreground shadow-hero ring-1 ring-white/[0.08]">
            <div className="bg-gradient-warm px-5 py-6 text-center text-primary-foreground sm:px-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35">
                {achievement.unlockedMilestone ? (
                  <Trophy className="h-8 w-8" />
                ) : (
                  <Award className="h-8 w-8" />
                )}
              </div>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/18 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]">
                <Sparkles className="h-3.5 w-3.5" /> {achievementCopy.badge}
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                {achievement.unlockedMilestone
                  ? storyMilestoneTitle(language, childName, addressStyle)
                  : storyCompleteTitle(language, childName, addressStyle)}
              </h2>
              {nameJustUpdated && addressStyle === "name" && childName ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="name-updated-badge mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/22 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white ring-1 ring-white/35 backdrop-blur"
                >
                  <Sparkles className="h-3 w-3" /> {NAME_UPDATED_BADGE_COPY[language]}
                </p>
              ) : null}
            </div>
            <div className="px-5 py-5 sm:px-8 sm:py-6">
              <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
                {achievement.unlockedMilestone ? achievementCopy.levelBody : achievementCopy.body}
              </p>
              {achievement.unlockedMilestone && (
                <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-primary/12 px-4 py-2 text-sm font-extrabold text-primary ring-1 ring-primary/25">
                  <Trophy className="h-4 w-4" /> {achievementCopy.milestone}:{" "}
                  {achievement.unlockedMilestone}
                </div>
              )}
              <div className="mt-5 rounded-2xl bg-background/45 p-4 ring-1 ring-inset ring-white/[0.06]">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>{achievementCopy.progress}</span>
                  <span className="text-primary">{achievement.overallPct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-gold transition-all duration-700"
                    style={{ width: `${achievement.overallPct}%` }}
                  />
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {nextStory && (
                  <Link
                    to="/historia/$slug"
                    params={{ slug: nextStory.slug }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-display text-sm font-extrabold text-primary-foreground shadow-glow-gold transition hover:scale-[1.02] active:scale-95"
                  >
                    {achievementCopy.next} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <Link
                  to={achievement.unlockedMilestone ? "/perfil" : "/home"}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-secondary px-5 font-display text-sm font-extrabold text-secondary-foreground transition hover:bg-accent"
                >
                  {achievement.unlockedMilestone ? achievementCopy.profile : achievementCopy.home}
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}

      <ColoringPalette
        color={coloring.color}
        onColorChange={coloring.setColor}
        pageIndex={pageIndex}
        totalPages={story.pages.length}
        onPrev={() => goPage(pageIndex - 1)}
        onNext={() => goPage(pageIndex + 1)}
        onUndo={coloring.undo}
        canUndo={coloring.history.length > 0}
        onClearAll={coloring.clearAll}
        canClearAll={Object.keys(coloring.fills).length > 0}
        onOpenSignature={() => {
          // Se já existe um nome salvo no /perfil, aplicamos direto sem
          // abrir o modal — evita pedir o nome de novo a cada história.
          // O modal só aparece quando NÃO há nome no perfil, permitindo
          // que o usuário assine apenas aquela história pontualmente.
          if (childName) {
            setSignatureName(childName);
            setSignatureError("");
            return;
          }
          setSignatureDraft(signatureName);
          setSignatureError("");
          setShowSignature(true);
        }}
        showSuggestion={showSuggestion}
        onToggleSuggestion={() => setShowSuggestion((v) => !v)}
        onErase={() => coloring.setColor("ERASER")}
        onMagicPaint={() => {
          const suggestions = suggestFillsFromSvg(page.svg);
          // `suggestions` já é construído a partir da regra global de
          // regiões preenchíveis (`extractFillableRegionIds`), o mesmo
          // conjunto usado pelas miniaturas e por `isPageComplete`.
          // Não passamos um total separado para não abrir margem de
          // divergência entre o que a mágica pinta e o que conta como
          // "100%".
          coloring.magicPaint(suggestions, 80);
        }}
        magicPainting={coloring.magicPainting}
      />
    </main>
  );
}
