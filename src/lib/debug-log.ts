/**
 * Logger de debug que só imprime em desenvolvimento.
 *
 * Usado para rastrear eventos de tempo real (`CustomEvent` + `storage`)
 * que sincronizam estado entre telas e abas — útil para depurar regressões
 * de UX ("o nome não atualizou na outra aba", "o badge não apareceu").
 *
 * Em produção (`import.meta.env.DEV === false`) as funções viram no-ops,
 * o bundler descarta as chamadas e nenhuma string aparece no console do
 * cliente final.
 */
const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

type Scope = "child-name" | "address-style" | "child-name-flash" | "coloring-validation" | "sync";

type Source =
  | "custom-event"
  | "storage"
  | "init"
  | "save"
  | "validate"
  | "story-progress-error"
  | "page-progress-error"
  | "artwork-error"
  | "favorite-error"
  | "favorite-throw"
  | "activity-error"
  | "child-name-error"
  | "child-name-throw"
  | "runner-error"
  | "backfill-favorite-error"
  | "backfill-story-progress-error"
  | "backfill-page-progress-error"
  | "backfill-artwork-error"
  | "backfill-complete"
  | "backfill-partial"
  | "backfill-throw"
  | "bootstrap-synced"
  | "bootstrap-throw"
  | "bootstrap-initial-error"
  | "bootstrap-install-error"
  | "hydrate-favorites-error"
  | "hydrate-favorites-merged"
  | "hydrate-story-error"
  | "hydrate-page-error"
  | "hydrate-artwork-error"
  | "hydrate-progress-merged"
  | "hydrate-throw"
  | "realtime-subscribed"
  | "realtime-event"
  | "realtime-resync"
  | "realtime-error"
  | "realtime-unsubscribed";

function fmt(scope: Scope, source: Source, payload?: unknown): unknown[] {
  const ts = new Date().toISOString().slice(11, 23);
  const tag = `[ccj:${scope}:${source}]`;
  return payload === undefined ? [`${ts} ${tag}`] : [`${ts} ${tag}`, payload];
}

export function debugLog(scope: Scope, source: Source, payload?: unknown): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console -- intencional: debug local em dev
  console.debug(...fmt(scope, source, payload));
}

/**
 * Variante de aviso (warn) — usada para sanity checks que indicam
 * potencial bug (ex.: regiões pintadas que não constam no SVG atual).
 */
export function debugWarn(scope: Scope, source: Source, payload?: unknown): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console -- intencional: aviso local em dev
  console.warn(...fmt(scope, source, payload));
}

/** Apenas para testes — permite ativar/forçar logs mesmo fora de DEV. */
export const __isDev = isDev;
