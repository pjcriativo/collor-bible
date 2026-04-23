/**
 * Utilitários globais para calcular o progresso de uma página de colorir.
 *
 * IMPORTANTE — fonte única da verdade:
 * Tanto a UI das miniaturas (porcentagem que aparece em cada thumbnail)
 * quanto o trigger de "página concluída" no `useColoringState` precisam
 * concordar sobre quantas regiões "contam" como preenchíveis. Antes,
 * cada lado contava `id="fill-..."` com regex próprio — incluindo IDs
 * decorativos como o `halo` da figura `person()` (um círculo tracejado
 * branco com `fill="white"` fixo) ou linhas com `fill="none"`. Resultado:
 * páginas visualmente 100% pintadas mostravam 88–89%.
 *
 * `extractFillableRegionIds` filtra esses casos:
 *   - ignora elementos cujo SVG já define `fill="..."` explicitamente
 *     (template decorativo, sem possibilidade de troca pelo usuário);
 *   - mantém apenas IDs únicos que começam com `fill-`.
 */

const FILL_ID_REGEX = /<[a-zA-Z][^>]*\sid\s*=\s*["'](fill-[^"']+)["'][^>]*>/g;
const HAS_EXPLICIT_FILL_ATTR = /\sfill\s*=\s*["'][^"']+["']/;
// Páginas híbridas (PNG line art + paths sobrepostos) declaram explicitamente
// `fill="#ffffff"` no source para ficarem invisíveis sobre a PNG branca antes
// da pintura. Sem o opt-in `data-paintable="true"`, o filtro decorativo abaixo
// descartaria esses paths e a barra de progresso ficaria sempre em 0%.
const HAS_PAINTABLE_OPT_IN = /\sdata-paintable\s*=\s*["']true["']/;
const TAG_NAME_REGEX = /^<([a-zA-Z][^\s/>]*)/;
const NUMERIC_ATTR_REGEX = (name: string) =>
  new RegExp(`\\s${name}\\s*=\\s*["'](-?\\d+(?:\\.\\d+)?)`, "i");
const MIN_CHILD_PAINT_TARGET = 7;
const MAX_COMPLETION_TOLERATED_MISSING = 1;
const MIN_REGIONS_FOR_COMPLETION_TOLERANCE = 10;

function numericAttr(tag: string, name: string): number | null {
  const match = tag.match(NUMERIC_ATTR_REGEX(name));
  return match ? Number(match[1]) : null;
}

function tinyRegionReason(tag: string): string | null {
  const tagName = tag.match(TAG_NAME_REGEX)?.[1]?.toLowerCase();
  if (!tagName) return null;

  if (tagName === "circle") {
    const r = numericAttr(tag, "r");
    return r !== null && r <= MIN_CHILD_PAINT_TARGET
      ? "região muito pequena/técnica — não bloqueia conclusão"
      : null;
  }

  if (tagName === "ellipse") {
    const rx = numericAttr(tag, "rx");
    const ry = numericAttr(tag, "ry");
    return rx !== null && ry !== null && Math.min(rx, ry) <= MIN_CHILD_PAINT_TARGET
      ? "região muito pequena/técnica — não bloqueia conclusão"
      : null;
  }

  if (tagName === "rect") {
    const width = numericAttr(tag, "width");
    const height = numericAttr(tag, "height");
    return width !== null && height !== null && Math.min(width, height) <= MIN_CHILD_PAINT_TARGET
      ? "região muito estreita/técnica — não bloqueia conclusão"
      : null;
  }

  return null;
}

/**
 * Retorna o conjunto de IDs (`fill-*`) que devem ser contados como
 * regiões preenchíveis pelo usuário.
 */
export function extractFillableRegionIds(svg: string): Set<string> {
  const ids = new Set<string>();
  if (!svg) return ids;

  for (const match of svg.matchAll(FILL_ID_REGEX)) {
    const tag = match[0];
    const id = match[1];
    // Elementos com `fill="..."` fixo são decorativos: o usuário não tem
    // como alterá-los a partir da paleta, então não devem inflar o total.
    // EXCEÇÃO: páginas híbridas PNG marcam paths pintáveis com
    // `data-paintable="true"` mesmo declarando `fill="#ffffff"` (necessário
    // para ficarem invisíveis sobre o PNG antes do toque do usuário).
    if (HAS_EXPLICIT_FILL_ATTR.test(tag) && !HAS_PAINTABLE_OPT_IN.test(tag)) continue;
    // Elementos minúsculos (olhos, sementes, hastes finas) continuam
    // clicáveis/pintáveis, mas não devem impedir a criança de concluir a
    // página quando a imagem já está visualmente pronta.
    if (tinyRegionReason(tag)) continue;
    ids.add(id);
  }
  return ids;
}

/**
 * Versão "explicada" usada pela página de debug. Devolve, para cada
 * elemento `id="fill-*"` encontrado no SVG, se ele foi INCLUÍDO ou
 * EXCLUÍDO do total — e, no segundo caso, o valor de `fill=` que
 * causou a exclusão (ex: `fill="white"` para halos, `fill="none"`
 * para linhas técnicas). Isso espelha exatamente a lógica de
 * `extractFillableRegionIds` para que o que aparece na tela de debug
 * seja a MESMA verdade usada nas miniaturas, no badge de 100% e na
 * pintura mágica.
 */
export type FillableInspection = {
  included: string[];
  excluded: Array<{ id: string; reason: string; fill: string | null }>;
};

const EXPLICIT_FILL_VALUE_REGEX = /\sfill\s*=\s*["']([^"']+)["']/;

export function inspectFillableRegions(svg: string): FillableInspection {
  const included: string[] = [];
  const excluded: Array<{ id: string; reason: string; fill: string | null }> = [];
  if (!svg) return { included, excluded };

  const seen = new Set<string>();
  for (const match of svg.matchAll(FILL_ID_REGEX)) {
    const tag = match[0];
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const fillMatch = tag.match(EXPLICIT_FILL_VALUE_REGEX);
    if (fillMatch) {
      const value = fillMatch[1];
      const reason =
        value === "none"
          ? 'fill="none" — linha/contorno técnico, não pintável'
          : `fill="${value}" fixo no template — decorativo (ex.: halo)`;
      excluded.push({ id, reason, fill: value });
    } else {
      const reason = tinyRegionReason(tag);
      if (reason) {
        excluded.push({ id, reason, fill: null });
        continue;
      }
      included.push(id);
    }
  }
  return { included, excluded };
}

/** Total de regiões preenchíveis (denominador da % por página). */
export function countFillableRegions(svg: string): number {
  return extractFillableRegionIds(svg).size;
}

/**
 * Quantas dessas regiões já têm cor aplicada em `fills`. Considera apenas
 * IDs que pertencem à página (evita contar fills "fantasmas" de versões
 * antigas do SVG que possam ter sobrado no localStorage).
 */
export function countFilledRegions(svg: string, fills: Record<string, string>): number {
  const fillable = extractFillableRegionIds(svg);
  let filled = 0;
  for (const id of Object.keys(fills)) {
    if (fillable.has(id) && fills[id]) filled += 1;
  }
  return filled;
}

/** Progresso da página em porcentagem inteira (0–100). */
export function pagePercent(svg: string, fills: Record<string, string>): number {
  return pageCompletionState(svg, fills).percent;
}

/** A página está completamente pintada? */
export function isPageComplete(svg: string, fills: Record<string, string>): boolean {
  return pageCompletionState(svg, fills).isComplete;
}

// ──────────────────────────────────────────────────────────────────────
// FONTE ÚNICA PARA "CONCLUSÃO DE PÁGINA" — usado por canvas, miniaturas
// e hook para evitar divergência cross-screen.
//
// Cenários defensivos (fallbacks) que esta função resolve:
//
//   A. `missingIds` vazio mas a página NÃO parece terminada:
//      • SVG sem regiões preenchíveis (`totalValid === 0`) → percent=0,
//        isComplete=false. Sem isso, `0/0 = NaN%` ou um falso 100%.
//      • Há fills "fantasmas" (`invalidPaintedIds.length > 0`) sem nenhuma
//        região válida pintada → tratamos como NÃO concluído. Evita o
//        canvas declarar "100%" só porque o localStorage tinha cores
//        órfãs de uma versão antiga do SVG.
//
//   B. `missingIds` cheio mas parece terminado para a criança:
//      • Tolerância para até 1 região faltante em páginas grandes
//        (≥10 regiões), tratada por `isPageValidationComplete`. Garante
//        que o badge "100%" da miniatura concorde com o CTA do canvas
//        — antes a miniatura mostrava 90% e o canvas dizia "Concluída".
//      • `percent` é forçado a 100 quando `isComplete=true` para os dois
//        consumidores (badge e barra) baterem por construção.
//
// Quem chama esta função NUNCA deve recombinar `painted/totalValid` por
// conta própria — sempre use o `percent` e `isComplete` retornados.
// ──────────────────────────────────────────────────────────────────────

export type PageCompletionState = {
  percent: number;
  isComplete: boolean;
  /**
   * Diagnóstico do fallback aplicado. Útil para a tela de debug e para
   * justificar comportamento (ex.: por que o badge mostra 100% com
   * `missing.length === 1`). Em runtime de produção é apenas leitura.
   */
  reason:
    | "empty-svg"
    | "no-progress"
    | "in-progress"
    | "complete-strict"
    | "complete-with-tolerance"
    | "ghost-fills-only";
  validation: PageValidationReport;
};

export function pageCompletionState(
  svg: string,
  fills: Record<string, string>,
): PageCompletionState {
  const validation = validatePageProgress(svg, fills);
  const { totalValid, painted, missingIds, invalidPaintedIds } = validation;

  if (totalValid === 0) {
    return { percent: 0, isComplete: false, reason: "empty-svg", validation };
  }

  // Caso A: existe tinta no localStorage, mas NENHUMA região válida foi
  // pintada (todos são fantasmas). A criança vê tela em branco — não
  // pode ser 100%, mesmo que `missingIds.length === totalValid`.
  if (painted === 0 && invalidPaintedIds.length > 0) {
    return { percent: 0, isComplete: false, reason: "ghost-fills-only", validation };
  }

  if (painted === 0) {
    return { percent: 0, isComplete: false, reason: "no-progress", validation };
  }

  if (missingIds.length === 0 && painted >= totalValid) {
    return { percent: 100, isComplete: true, reason: "complete-strict", validation };
  }

  if (isPageValidationComplete(validation)) {
    // Força 100% para barras/miniaturas concordarem com o CTA mesmo
    // sob tolerância — cross-screen consistente.
    return { percent: 100, isComplete: true, reason: "complete-with-tolerance", validation };
  }

  const rawPercent = Math.min(99, Math.round((painted / totalValid) * 100));
  return { percent: rawPercent, isComplete: false, reason: "in-progress", validation };
}

// ──────────────────────────────────────────────────────────────────────
// AGREGAÇÃO POR HISTÓRIA (e por catálogo)
//
// Tudo abaixo é a FONTE ÚNICA para perguntas em nível de história/catálogo:
//   - quais páginas estão concluídas? (mapa pagesFills + svgs)
//   - quanto da história foi feito (%)?
//   - a história inteira está concluída?
//   - quanto do catálogo (todas as histórias) foi feito?
//
// Antes essas fórmulas viviam espalhadas em `store.ts` (saveProgress +
// getStoryProgress), `coloring-progress-recalc.ts`, `story-card.tsx` e
// `use-coloring-state.ts` (cálculo de overallPct e milestones). Cada
// consumidor tinha seu próprio `Math.round((done/total)*100)`, seu próprio
// `done >= total`, seu próprio loop de `isPageComplete`. Bastava um
// `Math.floor` em vez de `Math.round` num lugar para o badge "Concluída"
// divergir do modal — exatamente o tipo de bug que essas funções evitam.
//
// Definições intencionais:
//   - `total === 0` → percent 0 e isComplete false (história sem páginas
//     não é "100% pronta", é "indefinida"). Mantém compat com
//     `pagePercent` que faz a mesma escolha.
//   - Recortamos páginas fora do range (`i < total`) para tolerar
//     `completedPages` antigos no localStorage com índices órfãos depois
//     de uma história ser editada/encurtada.
// ──────────────────────────────────────────────────────────────────────

/**
 * Forma mínima da página de uma história — aceita tanto `Story` do app
 * (`{ pages: { svg }[] }`) quanto qualquer estrutura de teste com a
 * mesma forma. Mantemos solta de propósito para evitar import cíclico
 * com `@/lib/types`.
 */
type StoryShape = { pages: ReadonlyArray<{ svg: string }> };

/**
 * Recalcula `completedPages` para UMA história, aplicando `isPageComplete`
 * página a página. `pagesFills[i]` é o mapa de cores da página i.
 *
 * Esta é a função usada pelo store ao persistir e pelo recalc em batch —
 * ambos chamam aqui em vez de duplicar o loop.
 */
export function computeStoryCompletedPages(
  story: StoryShape,
  pagesFills: Record<number, Record<string, string> | undefined>,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < story.pages.length; i++) {
    const svg = story.pages[i]?.svg ?? "";
    const fills = pagesFills[i] ?? {};
    if (isPageComplete(svg, fills)) out.push(i);
  }
  return out;
}

/** Quantas páginas da história estão concluídas, recortando índices órfãos. */
export function countCompletedPages(completedPages: number[], total: number): number {
  if (total <= 0) return 0;
  return completedPages.filter((i) => i >= 0 && i < total).length;
}

/**
 * Percentual inteiro (0–100) da história. Aceita as duas formas usadas
 * no app:
 *   - `storyPercent(done, total)` — quando o caller já tem a contagem
 *     (ex.: cards no catálogo, que recebem `getStoryProgress`).
 *   - `storyPercent({ done, total })` — açúcar para o mesmo objeto.
 */
export function storyPercent(done: number, total: number): number;
export function storyPercent(input: { done: number; total: number }): number;
export function storyPercent(a: number | { done: number; total: number }, b?: number): number {
  const done = typeof a === "number" ? a : a.done;
  const total = typeof a === "number" ? (b ?? 0) : a.total;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

/** A história inteira está concluída? */
export function isStoryComplete(done: number, total: number): boolean {
  return total > 0 && done >= total;
}

/**
 * Agrega o progresso do CATÁLOGO inteiro (todas as histórias).
 * Recebe a função `getDone(slug)` para evitar acoplamento com o store —
 * tanto `use-coloring-state` quanto telas de overview podem chamar.
 *
 * Retorna `done`, `total` e `percent` (sempre arredondado uma única vez,
 * para evitar drift entre consumidores).
 */
export function catalogPercent(
  stories: ReadonlyArray<StoryShape>,
  getDone: (storyIndex: number) => number,
): { done: number; total: number; percent: number } {
  let done = 0;
  let total = 0;
  for (let i = 0; i < stories.length; i++) {
    total += stories[i]!.pages.length;
    done += getDone(i);
  }
  return { done, total, percent: storyPercent(done, total) };
}

/**
 * Dado o percentual ANTERIOR e o ATUAL de progresso global (0–100) e a
 * tabela de milestones (ordenados crescentemente por `pct`), devolve
 * o milestone que acabou de ser cruzado — ou `undefined` se nenhum.
 *
 * Antes esse cálculo morava inline no `useColoringState`. Movido aqui
 * para que o motor central seja o único responsável por decidir
 * "concluiu/desbloqueou", e os mesmos limites possam ser reutilizados
 * por testes e por uma futura tela de admin.
 */
export function findUnlockedMilestone<T extends { pct: number }>(
  previousPct: number,
  nextPct: number,
  milestones: ReadonlyArray<T>,
): T | undefined {
  return milestones.find((m) => previousPct < m.pct && nextPct >= m.pct);
}

// ──────────────────────────────────────────────────────────────────────
// VALIDAÇÃO POR PÁGINA (modo dev)
//
// Sanity check executado a cada render do canvas em desenvolvimento. O
// objetivo é detectar — antes que vire bug visível — qualquer divergência
// entre o que o usuário pintou e o que `extractFillableRegionIds`
// considera válido como denominador. Cobre dois sintomas conhecidos:
//
//   1. "Inválidos pintados": IDs presentes em `fills` que NÃO estão no
//      conjunto preenchível da página. Acontecia quando o SVG era
//      reduzido/renomeado mas o localStorage antigo (com IDs órfãos)
//      ainda atribuía cor a regiões que sumiram ou a IDs decorativos
//      (ex.: `fill="white"` fixo do halo do `person()`).
//   2. "Ausentes": IDs preenchíveis declarados pelo SVG que ainda não
//      receberam cor. Numericamente é apenas `total - painted`, mas
//      expor a lista ajuda a achar regiões que o usuário "não enxergou"
//      (camadas sobrepostas, áreas pequenas).
//
// `ok` resume: `invalidPaintedIds.length === 0`. Páginas vazias
// (sem regiões preenchíveis) são tratadas como `ok=true` — não há
// nada a validar.
// ──────────────────────────────────────────────────────────────────────

export type PageValidationReport = {
  totalValid: number;
  painted: number;
  invalidPaintedIds: string[];
  missingIds: string[];
  ok: boolean;
};

export function isPageValidationComplete(report: PageValidationReport): boolean {
  if (report.totalValid <= 0) return false;
  if (report.missingIds.length === 0 && report.painted >= report.totalValid) return true;

  // UX infantil: quando só sobra 1 região técnica/imperceptível em uma
  // página com muitas áreas, a pintura já está visualmente completa. Isso
  // evita prender o botão "Verificar pintura" em falsos negativos.
  const missingWithinTolerance = report.missingIds.length <= MAX_COMPLETION_TOLERATED_MISSING;
  const largeEnoughPage = report.totalValid >= MIN_REGIONS_FOR_COMPLETION_TOLERANCE;
  return (
    largeEnoughPage &&
    missingWithinTolerance &&
    report.painted >= report.totalValid - MAX_COMPLETION_TOLERATED_MISSING
  );
}

export function validatePageProgress(
  svg: string,
  fills: Record<string, string>,
): PageValidationReport {
  const valid = extractFillableRegionIds(svg);
  const invalidPaintedIds: string[] = [];
  let painted = 0;

  for (const [id, color] of Object.entries(fills)) {
    if (!color) continue;
    if (valid.has(id)) {
      painted += 1;
    } else {
      invalidPaintedIds.push(id);
    }
  }

  const missingIds: string[] = [];
  for (const id of valid) {
    const color = fills[id];
    if (!color) missingIds.push(id);
  }

  // Ordena para tornar o relatório determinístico (testes + diff visual
  // estável quando logado no console).
  invalidPaintedIds.sort();
  missingIds.sort();

  return {
    totalValid: valid.size,
    painted,
    invalidPaintedIds,
    missingIds,
    ok: invalidPaintedIds.length === 0,
  };
}
