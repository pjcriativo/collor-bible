/**
 * Store local — persiste progresso e estado em localStorage.
 * Dados de catálogo (histórias, categorias) definidos aqui como fonte de verdade do app.
 */
import type {
  Banner,
  Category,
  ColoringPage,
  ColoringProgress,
  Story,
  StoryCompletionRecord,
} from "./types";
import { STORY_PAGES } from "./coloring-pages";
import { getLanguage, localizeCategory, localizeStory } from "./i18n";
import { computeStoryCompletedPages, countCompletedPages } from "./coloring-progress";
import {
  syncFavoriteToggle,
  syncStoryProgress,
  syncPageProgress,
  syncActivity,
  syncArtwork,
} from "./sync/background";

const pagesFor = (slug: string): ColoringPage[] =>
  (STORY_PAGES[slug] ?? []).map((svg, idx) => ({ id: `p${idx + 1}`, svg }));

import noeArca from "@/assets/stories/arca-de-noe-opt.webp";
import noeArcaSmall from "@/assets/stories/arca-de-noe-opt-320.webp";
import noeArcaMedium from "@/assets/stories/arca-de-noe-opt-640.webp";
import daviGolias from "@/assets/stories/davi-golias-opt.webp";
import daviGoliasSmall from "@/assets/stories/davi-golias-opt-320.webp";
import daviGoliasMedium from "@/assets/stories/davi-golias-opt-640.webp";
import jonasBaleia from "@/assets/stories/jonas-baleia-opt.webp";
import jonasBaleiaSmall from "@/assets/stories/jonas-baleia-opt-320.webp";
import jonasBaleiaMedium from "@/assets/stories/jonas-baleia-opt-640.webp";
import moisesMarVermelho from "@/assets/stories/moises-mar-vermelho-opt.webp";
import moisesMarVermelhoSmall from "@/assets/stories/moises-mar-vermelho-opt-320.webp";
import moisesMarVermelhoMedium from "@/assets/stories/moises-mar-vermelho-opt-640.webp";
import danielLeoes from "@/assets/stories/daniel-leoes-opt.webp";
import danielLeoesSmall from "@/assets/stories/daniel-leoes-opt-320.webp";
import danielLeoesMedium from "@/assets/stories/daniel-leoes-opt-640.webp";
import nascimentoJesus from "@/assets/stories/nascimento-jesus-opt.webp";
import nascimentoJesusSmall from "@/assets/stories/nascimento-jesus-opt-320.webp";
import nascimentoJesusMedium from "@/assets/stories/nascimento-jesus-opt-640.webp";
import jesusCriancas from "@/assets/stories/jesus-criancas-opt.webp";
import jesusCriancasSmall from "@/assets/stories/jesus-criancas-opt-320.webp";
import jesusCriancasMedium from "@/assets/stories/jesus-criancas-opt-640.webp";
import jesusAcalmaTempestade from "@/assets/stories/jesus-acalma-tempestade-opt.webp";
import jesusAcalmaTempestadeSmall from "@/assets/stories/jesus-acalma-tempestade-opt-320.webp";
import jesusAcalmaTempestadeMedium from "@/assets/stories/jesus-acalma-tempestade-opt-640.webp";
import multiplicacaoPaes from "@/assets/stories/multiplicacao-paes-opt.webp";
import multiplicacaoPaesSmall from "@/assets/stories/multiplicacao-paes-opt-320.webp";
import multiplicacaoPaesMedium from "@/assets/stories/multiplicacao-paes-opt-640.webp";
import bomSamaritano from "@/assets/stories/bom-samaritano-opt.webp";
import bomSamaritanoSmall from "@/assets/stories/bom-samaritano-opt-320.webp";
import bomSamaritanoMedium from "@/assets/stories/bom-samaritano-opt-640.webp";
import criacaoMundo from "@/assets/stories/criacao-mundo-opt.webp";
import criacaoMundoSmall from "@/assets/stories/criacao-mundo-opt-320.webp";
import criacaoMundoMedium from "@/assets/stories/criacao-mundo-opt-640.webp";
import esterRainhaCorajosa from "@/assets/stories/ester-rainha-corajosa-opt.webp";
import esterRainhaCorajosaSmall from "@/assets/stories/ester-rainha-corajosa-opt-320.webp";
import esterRainhaCorajosaMedium from "@/assets/stories/ester-rainha-corajosa-opt-640.webp";
import filhoProdigo from "@/assets/stories/filho-prodigo-opt.webp";
import filhoProdigoSmall from "@/assets/stories/filho-prodigo-opt-320.webp";
import filhoProdigoMedium from "@/assets/stories/filho-prodigo-opt-640.webp";
import ovelhaPerdida from "@/assets/stories/ovelha-perdida-opt.webp";
import ovelhaPerdidaSmall from "@/assets/stories/ovelha-perdida-opt-320.webp";
import ovelhaPerdidaMedium from "@/assets/stories/ovelha-perdida-opt-640.webp";

export const CATEGORIES: Category[] = [
  { id: "c1", slug: "criacao", name: "Criação", emoji: "🌍", color: "mint" },
  { id: "c2", slug: "herois", name: "Heróis da Bíblia", emoji: "🛡️", color: "gold" },
  { id: "c3", slug: "milagres", name: "Milagres de Jesus", emoji: "✨", color: "sky" },
  { id: "c4", slug: "parabolas", name: "Parábolas", emoji: "📖", color: "coral" },
  { id: "c5", slug: "animais", name: "Animais da Bíblia", emoji: "🦁", color: "mint" },
  { id: "c6", slug: "antigo", name: "Antigo Testamento", emoji: "📜", color: "deep" },
  { id: "c7", slug: "novo", name: "Novo Testamento", emoji: "🕊️", color: "sky" },
  { id: "c8", slug: "amadas", name: "Mais amadas", emoji: "❤️", color: "coral" },
];

export const STORIES: Story[] = [
  {
    id: "s1",
    slug: "noe-e-a-arca",
    title: "Arca de Noé",
    subtitle: "Animais, chuva e um lindo arco-íris",
    shortDescription: "Animais, chuva e um lindo arco-íris",
    description:
      "Descubra como Noé construiu uma arca enorme e levou os animais para um passeio cheio de fé e cores.",
    ageRange: "3-8 anos",
    testament: "antigo",
    categoryIds: ["c2", "c5", "c6", "c8"],
    cover: noeArca,
    coverSmall: noeArcaSmall,
    coverMedium: noeArcaMedium,
    pages: pagesFor("noe-e-a-arca"),
    featured: true,
    isNew: false,
    active: true,
    order: 1,
    loved: 98,
  },
  {
    id: "s2",
    slug: "davi-e-golias",
    title: "Davi e Golias",
    subtitle: "Coragem que vem do coração",
    shortDescription: "Coragem que vem do coração",
    description:
      "Um menino corajoso enfrenta um gigante com fé e uma pedrinha. Uma história de confiança em Deus.",
    ageRange: "4-10 anos",
    testament: "antigo",
    categoryIds: ["c2", "c6"],
    cover: daviGolias,
    coverSmall: daviGoliasSmall,
    coverMedium: daviGoliasMedium,
    pages: pagesFor("davi-e-golias"),
    featured: false,
    isNew: true,
    active: true,
    order: 2,
    loved: 88,
  },
  {
    id: "s3",
    slug: "jonas-e-a-baleia",
    title: "Jonas e a Baleia",
    subtitle: "Uma aventura no fundo do mar",
    shortDescription: "Uma aventura no fundo do mar",
    description:
      "Jonas viveu uma viagem inesperada dentro de uma baleia gigante e aprendeu sobre obediência e amor.",
    ageRange: "3-9 anos",
    testament: "antigo",
    categoryIds: ["c5", "c6", "c8"],
    cover: jonasBaleia,
    coverSmall: jonasBaleiaSmall,
    coverMedium: jonasBaleiaMedium,
    pages: pagesFor("jonas-e-a-baleia"),
    featured: false,
    isNew: true,
    active: true,
    order: 3,
    loved: 95,
  },
  {
    id: "s4",
    slug: "moises-e-o-mar-vermelho",
    title: "Moisés e o Mar Vermelho",
    subtitle: "O caminho que se abriu pela fé",
    shortDescription: "O caminho que se abriu pela fé",
    description:
      "Moisés guiou seu povo por um caminho aberto no meio do mar. Uma história cheia de milagre e esperança.",
    ageRange: "4-10 anos",
    testament: "antigo",
    categoryIds: ["c2", "c6"],
    cover: moisesMarVermelho,
    coverSmall: moisesMarVermelhoSmall,
    coverMedium: moisesMarVermelhoMedium,
    pages: pagesFor("moises-e-o-mar-vermelho"),
    featured: false,
    isNew: false,
    active: true,
    order: 4,
    loved: 80,
  },
  {
    id: "s5",
    slug: "daniel-na-cova-dos-leoes",
    title: "Daniel na Cova dos Leões",
    subtitle: "Fé que protege",
    shortDescription: "Fé que protege",
    description:
      "Daniel orou e Deus cuidou dele entre os leões. Uma história de coragem suave e proteção.",
    ageRange: "4-10 anos",
    testament: "antigo",
    categoryIds: ["c2", "c5", "c6"],
    cover: danielLeoes,
    coverSmall: danielLeoesSmall,
    coverMedium: danielLeoesMedium,
    pages: pagesFor("daniel-na-cova-dos-leoes"),
    featured: false,
    isNew: false,
    active: true,
    order: 5,
    loved: 91,
  },
  {
    id: "s6",
    slug: "o-nascimento-de-jesus",
    title: "O Nascimento de Jesus",
    subtitle: "A noite mais linda de todas",
    shortDescription: "A noite mais linda de todas",
    description:
      "Em uma manjedoura, sob uma estrela brilhante, nasceu Jesus. A história mais amada da Bíblia.",
    ageRange: "3-10 anos",
    testament: "novo",
    categoryIds: ["c7", "c8"],
    cover: nascimentoJesus,
    coverSmall: nascimentoJesusSmall,
    coverMedium: nascimentoJesusMedium,
    pages: pagesFor("o-nascimento-de-jesus"),
    featured: false,
    isNew: false,
    active: true,
    order: 6,
    loved: 99,
  },
  {
    id: "s7",
    slug: "jesus-e-as-criancas",
    title: "Jesus e as Crianças",
    subtitle: "Vinde a mim, pequeninos",
    shortDescription: "Vinde a mim, pequeninos",
    description:
      "Jesus amava muito as crianças. Venha conhecer essa história doce e cheia de carinho.",
    ageRange: "2-8 anos",
    testament: "novo",
    categoryIds: ["c7", "c8"],
    cover: jesusCriancas,
    coverSmall: jesusCriancasSmall,
    coverMedium: jesusCriancasMedium,
    pages: pagesFor("jesus-e-as-criancas"),
    featured: false,
    isNew: true,
    active: true,
    order: 7,
    loved: 96,
  },
  {
    id: "s8",
    slug: "a-multiplicacao-dos-paes",
    title: "A Multiplicação dos Pães",
    subtitle: "Pão e peixes para todos",
    shortDescription: "Pão e peixes para todos",
    description:
      "Jesus alimentou uma multidão com poucos pães e peixes. Um milagre de partilha e amor.",
    ageRange: "4-10 anos",
    testament: "novo",
    categoryIds: ["c3", "c7"],
    cover: multiplicacaoPaes,
    coverSmall: multiplicacaoPaesSmall,
    coverMedium: multiplicacaoPaesMedium,
    pages: pagesFor("a-multiplicacao-dos-paes"),
    featured: false,
    isNew: false,
    active: true,
    order: 8,
    loved: 84,
  },
  {
    id: "s9",
    slug: "o-bom-samaritano",
    title: "O Bom Samaritano",
    subtitle: "Ajudar com o coração",
    shortDescription: "Ajudar com o coração",
    description:
      "Uma história sobre amar o próximo e cuidar de quem precisa, do jeitinho que Jesus ensinou.",
    ageRange: "5-10 anos",
    testament: "novo",
    categoryIds: ["c4", "c7"],
    cover: bomSamaritano,
    coverSmall: bomSamaritanoSmall,
    coverMedium: bomSamaritanoMedium,
    pages: pagesFor("o-bom-samaritano"),
    featured: false,
    isNew: false,
    active: true,
    order: 9,
    loved: 77,
  },
  {
    id: "s10",
    slug: "a-criacao-do-mundo",
    title: "A Criação do Mundo",
    subtitle: "Em sete dias, tudo ficou lindo",
    shortDescription: "Em sete dias, tudo ficou lindo",
    description:
      "Deus criou o céu, a terra, os animais e as crianças. Uma história cheia de cores e maravilhas.",
    ageRange: "3-10 anos",
    testament: "antigo",
    categoryIds: ["c1", "c5", "c6", "c8"],
    cover: criacaoMundo,
    coverSmall: criacaoMundoSmall,
    coverMedium: criacaoMundoMedium,
    pages: pagesFor("a-criacao-do-mundo"),
    featured: false,
    isNew: false,
    active: true,
    order: 10,
    loved: 93,
  },
  {
    id: "s11",
    slug: "jesus-acalma-a-tempestade",
    title: "Jesus Acalma a Tempestade",
    subtitle: "Paz no meio do vento",
    shortDescription: "Paz no meio do vento",
    description:
      "Jesus mostra que a fé traz calma mesmo quando o barco balança e as ondas parecem grandes.",
    ageRange: "4-10 anos",
    testament: "novo",
    categoryIds: ["c3", "c7", "c8"],
    cover: jesusAcalmaTempestade,
    coverSmall: jesusAcalmaTempestadeSmall,
    coverMedium: jesusAcalmaTempestadeMedium,
    pages: pagesFor("jesus-acalma-a-tempestade"),
    featured: false,
    isNew: true,
    active: true,
    order: 11,
    loved: 90,
  },
  {
    id: "s12",
    slug: "ester-rainha-corajosa",
    title: "Ester, Rainha Corajosa",
    subtitle: "Coragem para fazer o bem",
    shortDescription: "Coragem para fazer o bem",
    description:
      "Ester confia em Deus e usa sua coragem para proteger seu povo com sabedoria e amor.",
    ageRange: "5-10 anos",
    testament: "antigo",
    categoryIds: ["c2", "c8"],
    cover: esterRainhaCorajosa,
    coverSmall: esterRainhaCorajosaSmall,
    coverMedium: esterRainhaCorajosaMedium,
    pages: pagesFor("ester-rainha-corajosa"),
    featured: false,
    isNew: true,
    active: true,
    order: 12,
    loved: 89,
  },
  {
    id: "s13",
    slug: "o-filho-prodigo",
    title: "O Filho Pródigo",
    subtitle: "O abraço do perdão",
    shortDescription: "O abraço do perdão",
    description:
      "Uma parábola sobre voltar para casa, receber perdão e descobrir o tamanho do amor do Pai.",
    ageRange: "5-10 anos",
    testament: "novo",
    categoryIds: ["c4", "c7", "c8"],
    cover: filhoProdigo,
    coverSmall: filhoProdigoSmall,
    coverMedium: filhoProdigoMedium,
    pages: pagesFor("o-filho-prodigo"),
    featured: false,
    isNew: true,
    active: true,
    order: 13,
    loved: 87,
  },
  {
    id: "s14",
    slug: "a-ovelha-perdida",
    title: "A Ovelha Perdida",
    subtitle: "O pastor que procura",
    shortDescription: "O pastor que procura",
    description:
      "Jesus ensina que cada pessoa é preciosa, como uma ovelhinha encontrada com alegria.",
    ageRange: "3-8 anos",
    testament: "novo",
    categoryIds: ["c4", "c5", "c7", "c8"],
    cover: ovelhaPerdida,
    coverSmall: ovelhaPerdidaSmall,
    coverMedium: ovelhaPerdidaMedium,
    pages: pagesFor("a-ovelha-perdida"),
    featured: false,
    isNew: true,
    active: true,
    order: 14,
    loved: 92,
  },
];

export const BANNERS: Banner[] = [
  {
    id: "b1",
    storySlug: "noe-e-a-arca",
    headline: "Embarque na maior aventura da Bíblia",
    subline: "Colore a Arca de Noé com todos os seus animais favoritos.",
    active: true,
  },
];

// ============= Storage helpers =============
const KEYS = {
  stories: "ccj.stories.v1",
  categories: "ccj.categories.v1",
  banners: "ccj.banners.v1",
  favorites: "ccj.favorites.v1",
  progress: "ccj.progress.v1",
  completions: "ccj.storyCompletions.v1",
  adminAuth: "ccj.adminAuth.v1",
  shownToasts: "ccj.shownToasts.v1",
  addressStyle: "ccj.addressStyle.v1",
} as const;

const isBrowser = () => typeof window !== "undefined";

function load<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// ============= Public API =============

function normalizeStory(story: Story): Story {
  return {
    ...story,
    shortDescription: story.shortDescription ?? story.subtitle ?? story.description,
  };
}

export function getStories(): Story[] {
  return load<Story[]>(KEYS.stories, STORIES)
    .map(normalizeStory)
    .map((story) => localizeStory(story, getLanguage()));
}
export function setStories(stories: Story[]) {
  save(KEYS.stories, stories);
  emit();
}
export function getCategories(): Category[] {
  return load<Category[]>(KEYS.categories, CATEGORIES).map((category) =>
    localizeCategory(category, getLanguage()),
  );
}
export function setCategories(cats: Category[]) {
  save(KEYS.categories, cats);
  emit();
}
export function getBanners(): Banner[] {
  return load<Banner[]>(KEYS.banners, BANNERS);
}
export function setBanners(banners: Banner[]) {
  save(KEYS.banners, banners);
  emit();
}

export function getFavorites(): string[] {
  return load<string[]>(KEYS.favorites, []);
}
export function toggleFavorite(slug: string): string[] {
  const favs = getFavorites();
  const isFavoriteNow = !favs.includes(slug);
  const next = isFavoriteNow ? [...favs, slug] : favs.filter((s) => s !== slug);
  save(KEYS.favorites, next);
  emit();
  // Espelha em background — não bloqueia, não muda UI.
  syncFavoriteToggle({ storySlug: slug, isFavoriteNow });
  return next;
}
export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}

export function getAllProgress(): ColoringProgress[] {
  return load<ColoringProgress[]>(KEYS.progress, []).map((p) => ({
    ...p,
    completedPages: p.completedPages ?? [],
  }));
}
export function getProgress(slug: string): ColoringProgress | undefined {
  return getAllProgress().find((p) => p.storySlug === slug);
}
export function saveProgress(p: Omit<ColoringProgress, "completedPages">) {
  const existing = getProgress(p.storySlug);
  const all = getAllProgress().filter((x) => x.storySlug !== p.storySlug);
  // Mescla os fills da página atual no mapa de páginas, preservando a pintura
  // de páginas anteriores ao navegar entre páginas da mesma história.
  const previousPagesFills = existing?.pagesFills ?? {};
  const seededPagesFills =
    Object.keys(previousPagesFills).length === 0 && existing && existing.pageIndex !== p.pageIndex
      ? { [existing.pageIndex]: existing.fills }
      : previousPagesFills;
  const pagesFills: Record<number, Record<string, string>> = {
    ...seededPagesFills,
    [p.pageIndex]: p.fills,
  };

  // ─── FONTE ÚNICA DE VERDADE PARA "PÁGINA CONCLUÍDA" ──────────────────
  // Antes, marcávamos a página como concluída assim que ela tinha QUALQUER
  // fill — mesmo 1 região pintada de 14. Isso tornava `completedPages`
  // (consumido por `getStoryProgress`, modais e barra geral) inconsistente
  // com a porcentagem das miniaturas, que sempre usaram `pagePercent` /
  // `isPageComplete` (regra estrita: 100% das regiões válidas).
  //
  // Agora recomputamos `completedPages` aqui aplicando exatamente a mesma
  // regra do motor central (`isPageComplete`) sobre todas as páginas da
  // história. Isso garante que:
  //   - miniatura, badge "Concluída", modal e progresso da história
  //     concordam página a página, em qualquer dispositivo;
  //   - despintar uma página (limpar áreas) volta a desmarcá-la como
  //     concluída — antes ficava "presa" como concluída para sempre;
  //   - pintura mágica e pintura manual produzem o mesmo resultado, pois
  //     ambas terminam aqui via debounce do `useColoringState`.
  // Fonte única: `computeStoryCompletedPages` aplica `isPageComplete`
  // página a página exatamente como o canvas, miniatura e modal usam.
  // Sem catálogo carregado (caso raro), preservamos o estado anterior
  // para não regredir o progresso do usuário.
  const story = getStoryBySlug(p.storySlug);
  const completedPages = story
    ? computeStoryCompletedPages(story, pagesFills)
    : (existing?.completedPages ?? []);

  save(KEYS.progress, [
    ...all,
    {
      ...p,
      completedPages,
      pagesFills,
    },
  ]);
  emit();
  // ── Espelhamento Supabase (Fase 3) ────────────────────────────────────
  // Mesmo "save" que alimenta o localStorage também alimenta o banco em
  // background. Toda a lógica de fonte da verdade continua local; isso
  // aqui é dual-write silencioso, com debounce próprio.
  const totalPages = story?.pages.length ?? 0;
  syncStoryProgress({
    storySlug: p.storySlug,
    pagesCompleted: completedPages.length,
    totalPages,
    currentPageIndex: p.pageIndex,
  });
  // Página atual: marca como completa no banco se o motor central
  // considerou que ela está em `completedPages` agora.
  syncPageProgress({
    storySlug: p.storySlug,
    pageIndex: p.pageIndex,
    isComplete: completedPages.includes(p.pageIndex),
  });
  // Snapshot vetorial do canvas — debounce maior, last-wins.
  syncArtwork({
    storySlug: p.storySlug,
    pageIndex: p.pageIndex,
    fills: p.fills,
    isFinished: completedPages.includes(p.pageIndex),
  });
}
export function clearProgress(slug: string) {
  const all = getAllProgress().filter((x) => x.storySlug !== slug);
  save(KEYS.progress, all);
  emit();
}

/**
 * Atualiza APENAS o `pageIndex` corrente de uma história, sem mexer em
 * `fills`/`completedPages`. Usado quando o usuário navega entre páginas
 * em /colorir sem pintar — assim, ao voltar para /home, o "Continue
 * colorindo" retoma exatamente na página em que ele estava (e não na
 * última onde houve pintura).
 *
 * Se ainda não existe progresso para a história, cria um registro vazio
 * com `pageIndex` definido — o que basta para a história aparecer no
 * trilho "Continue colorindo" e no FAB do perfil.
 */
export function touchProgressPage(slug: string, pageIndex: number) {
  const existing = getProgress(slug);
  // Se já estamos no mesmo pageIndex, não emitimos nada — evita
  // re-renders desnecessários nos consumidores reativos do store.
  if (existing && existing.pageIndex === pageIndex) return;
  const all = getAllProgress().filter((x) => x.storySlug !== slug);
  const next: ColoringProgress = existing
    ? { ...existing, pageIndex, updatedAt: Date.now() }
    : {
        storySlug: slug,
        pageIndex,
        fills: {},
        completedPages: [],
        pagesFills: {},
        updatedAt: Date.now(),
      };
  save(KEYS.progress, [...all, next]);
  emit();
  // Atividade de "abriu página X da história Y" — útil para "continuar
  // de onde parou" no banco. Dedupe por chave dentro do sync evita
  // explosão quando o usuário navega rapidamente.
  syncActivity({
    type: "opened_page",
    metadata: { storySlug: slug, pageIndex },
    dedupeKey: `opened_page:${slug}:${pageIndex}`,
  });
}

export function getStoryProgress(slug: string): { done: number; total: number } {
  const story = getStoryBySlug(slug);
  const total = story?.pages.length ?? 0;
  const prog = getProgress(slug);
  // `countCompletedPages` recorta índices órfãos (>= total) que possam
  // ter sobrado em localStorage de versões anteriores da história.
  const done = countCompletedPages(prog?.completedPages ?? [], total);
  return { done, total };
}

export function getStoryCompletions(): StoryCompletionRecord[] {
  return load<StoryCompletionRecord[]>(KEYS.completions, []);
}
export function hasStoryCompletion(slug: string): boolean {
  return getStoryCompletions().some((completion) => completion.storySlug === slug);
}
export function markStoryCompleted(slug: string): StoryCompletionRecord | null {
  if (hasStoryCompletion(slug)) return null;
  const record = { storySlug: slug, completedAt: Date.now() };
  save(KEYS.completions, [...getStoryCompletions(), record]);
  emit();
  // Marca como conclusão também no banco — usado por relatórios e
  // gamificação. Idempotente do lado do banco (RLS + insert).
  syncActivity({
    type: "completed_story",
    metadata: { storySlug: slug },
    dedupeKey: `completed_story:${slug}`,
  });
  return record;
}

// ============= Microtoasts já exibidos (proteção anti-repetição) =============
// Guarda, por dispositivo, quais microtoasts de conclusão já foram mostrados
// ao longo do tempo — para que recarregar a tela em uma página/milestone que
// já estava 100% NÃO dispare o toast de novo. Os modais grandes têm a sua
// própria proteção (via `hasStoryCompletion` etc.); aqui é especificamente
// sobre os "microtoasts" leves de incentivo.
type ShownToastsRecord = {
  /** chave: storySlug → lista de pageIndex cujo toast "página concluída" já apareceu */
  pages: Record<string, number[]>;
  /** rótulos de milestones cujo toast já apareceu (ex: "Semente", "Artista") */
  milestones: string[];
  /** slugs de histórias cujo toast "história concluída sem milestone" já apareceu */
  storyDone: string[];
  /** slugs de histórias cujo toast "primeira página da história" já apareceu */
  firstPage: string[];
  /** slugs de histórias cujo toast "metade da história" já apareceu */
  halfStory: string[];
};

const EMPTY_SHOWN: ShownToastsRecord = {
  pages: {},
  milestones: [],
  storyDone: [],
  firstPage: [],
  halfStory: [],
};

function getShownToasts(): ShownToastsRecord {
  const raw = load<Partial<ShownToastsRecord>>(KEYS.shownToasts, {});
  return {
    pages: raw.pages ?? {},
    milestones: raw.milestones ?? [],
    storyDone: raw.storyDone ?? [],
    firstPage: raw.firstPage ?? [],
    halfStory: raw.halfStory ?? [],
  };
}

export function hasShownPageCompleteToast(slug: string, pageIndex: number): boolean {
  return (getShownToasts().pages[slug] ?? []).includes(pageIndex);
}
export function markPageCompleteToastShown(slug: string, pageIndex: number) {
  const current = getShownToasts();
  const list = current.pages[slug] ?? [];
  if (list.includes(pageIndex)) return;
  save(KEYS.shownToasts, {
    ...current,
    pages: { ...current.pages, [slug]: [...list, pageIndex] },
  });
}

export function hasShownMilestoneToast(label: string): boolean {
  return getShownToasts().milestones.includes(label);
}
export function markMilestoneToastShown(label: string) {
  const current = getShownToasts();
  if (current.milestones.includes(label)) return;
  save(KEYS.shownToasts, { ...current, milestones: [...current.milestones, label] });
}

export function hasShownStoryDoneToast(slug: string): boolean {
  return getShownToasts().storyDone.includes(slug);
}
export function markStoryDoneToastShown(slug: string) {
  const current = getShownToasts();
  if (current.storyDone.includes(slug)) return;
  save(KEYS.shownToasts, { ...current, storyDone: [...current.storyDone, slug] });
}

export function hasShownFirstPageToast(slug: string): boolean {
  return getShownToasts().firstPage.includes(slug);
}
export function markFirstPageToastShown(slug: string) {
  const current = getShownToasts();
  if (current.firstPage.includes(slug)) return;
  save(KEYS.shownToasts, { ...current, firstPage: [...current.firstPage, slug] });
}

export function hasShownHalfStoryToast(slug: string): boolean {
  return getShownToasts().halfStory.includes(slug);
}
export function markHalfStoryToastShown(slug: string) {
  const current = getShownToasts();
  if (current.halfStory.includes(slug)) return;
  save(KEYS.shownToasts, { ...current, halfStory: [...current.halfStory, slug] });
}

// ============= Address style (Nome vs "você") =============
// Preferência configurada pelo pai/responsável: como o app deve se dirigir
// à criança nas mensagens — usando o NOME ("Boa, Davi! …") ou o pronome
// genérico de 2ª pessoa ("você"/"you"/"tú": "Boa! …"). Persistência apenas
// local (por dispositivo) — é uma decisão de UX da família, não de DB.
//
// Quando NÃO há nome salvo, o estilo "name" é tratado como "you" pelos
// helpers em `personalize.ts` (não dá pra chamar pelo nome se ele não
// existe). Isso mantém o comportamento padrão atual sem regredir copy.
export type AddressStyle = "name" | "you";

const ADDRESS_STYLE_EVENT = "ccj-address-style-updated";

export function getAddressStyle(): AddressStyle {
  const raw = load<string>(KEYS.addressStyle, "name");
  return raw === "you" ? "you" : "name";
}

export function setAddressStyle(value: AddressStyle) {
  save(KEYS.addressStyle, value);
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<AddressStyle>(ADDRESS_STYLE_EVENT, { detail: value }));
  }
}

export const ADDRESS_STYLE_UPDATE_EVENT = ADDRESS_STYLE_EVENT;
export const ADDRESS_STYLE_STORAGE_KEY = KEYS.addressStyle;

export function setAdminAuth(value: boolean) {
  save(KEYS.adminAuth, value);
  emit();
}
export function getAdminAuth(): boolean {
  return load<boolean>(KEYS.adminAuth, false);
}

// ============= Reactivity =============
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn());
}

// ============= Helpers de query =============
export function getStoryBySlug(slug: string): Story | undefined {
  return getStories().find((s) => s.slug === slug);
}
export function getCategoryBySlug(slug: string): Category | undefined {
  return getCategories().find((c) => c.slug === slug);
}
export function getStoriesByCategory(categorySlug: string): Story[] {
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return [];
  return getStories().filter((s) => s.active && s.categoryIds.includes(cat.id));
}
export function getActiveStories(): Story[] {
  return getStories().filter((s) => s.active);
}
export function getFeaturedStory(): Story | undefined {
  return getActiveStories().find((s) => s.featured) ?? getActiveStories()[0];
}
/**
 * Pool de histórias elegíveis para rotacionar no hero da home.
 * Inclui marcadas como `featured` + as mais amadas (top 8), sem duplicar.
 */
export function getFeaturedRotation(): Story[] {
  const active = getActiveStories();
  const featured = active.filter((s) => s.featured);
  const loved = [...active].sort((a, b) => (b.loved ?? 0) - (a.loved ?? 0)).slice(0, 8);
  const seen = new Set<string>();
  const pool: Story[] = [];
  for (const s of [...featured, ...loved]) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      pool.push(s);
    }
  }
  return pool.length > 0 ? pool : active.slice(0, 1);
}
export function getNewStories(): Story[] {
  return getActiveStories().filter((s) => s.isNew);
}
export function getLovedStories(): Story[] {
  return [...getActiveStories()].sort((a, b) => (b.loved ?? 0) - (a.loved ?? 0));
}
export function searchStories(q: string): Story[] {
  const term = q.toLowerCase().trim();
  if (!term) return [];
  return getActiveStories().filter(
    (s) =>
      s.title.toLowerCase().includes(term) ||
      s.subtitle.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term),
  );
}
