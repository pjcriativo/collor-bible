import { useCallback, useEffect, useState } from "react";

/**
 * Preferência do usuário para densidade do catálogo no breakpoint `lg`+.
 *
 * Por que existe:
 *   As listagens (Buscar, Favoritos, Categoria) usam grid responsivo cujo
 *   passo final é `lg:grid-cols-5`. Algumas crianças/adultos preferem
 *   miniaturas maiores — por isso oferecemos um toggle 4/5 colunas.
 *
 * Persistência:
 *   - Apenas `localStorage` (decisão do produto: por-dispositivo).
 *   - Cross-tab sync via `storage` event → todas as abas refletem a troca
 *     sem reload.
 *   - Same-tab sync via `CustomEvent` → componentes irmãos atualizam ao
 *     trocar pelo toggle inline em qualquer listagem.
 *
 * NOTA: a preferência só afeta o breakpoint ≥ lg. Mobile/tablet seguem
 * o grid responsivo padrão (2 → 3 → 4 colunas) — mexer nisso quebraria
 * o tamanho mínimo confortável de toque.
 */

export type CatalogColumns = 4 | 5;

const STORAGE_KEY = "ccj.catalog-columns.v1";
const UPDATE_EVENT = "ccj-catalog-columns-updated";
const DEFAULT_COLUMNS: CatalogColumns = 5;

function readStored(): CatalogColumns {
  if (typeof window === "undefined") return DEFAULT_COLUMNS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "4") return 4;
    if (raw === "5") return 5;
    return DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

function writeStored(value: CatalogColumns) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignora — preferência é otimização, não bloqueia a UI.
  }
}

export function useCatalogColumns(): {
  columns: CatalogColumns;
  setColumns: (next: CatalogColumns) => void;
} {
  const [columns, setLocal] = useState<CatalogColumns>(() => readStored());

  useEffect(() => {
    const onSameTab = (event: Event) => {
      const detail = (event as CustomEvent<CatalogColumns>).detail;
      if (detail === 4 || detail === 5) setLocal(detail);
    };
    const onCrossTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue === "4") setLocal(4);
      else if (event.newValue === "5") setLocal(5);
    };
    window.addEventListener(UPDATE_EVENT, onSameTab as EventListener);
    window.addEventListener("storage", onCrossTab);
    return () => {
      window.removeEventListener(UPDATE_EVENT, onSameTab as EventListener);
      window.removeEventListener("storage", onCrossTab);
    };
  }, []);

  const setColumns = useCallback((next: CatalogColumns) => {
    writeStored(next);
    setLocal(next);
    window.dispatchEvent(new CustomEvent<CatalogColumns>(UPDATE_EVENT, { detail: next }));
  }, []);

  return { columns, setColumns };
}

/**
 * Devolve a classe Tailwind da grade do catálogo respeitando a preferência.
 * Mobile/tablet: 2 → 3 → 4 colunas (fixo). lg+: 4 ou 5 conforme preferência.
 *
 * Centralizado aqui para garantir que TODAS as listagens usem exatamente
 * a mesma escala — qualquer ajuste futuro (ex: xl 6 colunas) muda em um
 * lugar só.
 */
export function catalogGridClass(columns: CatalogColumns): string {
  const lg = columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return `grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 ${lg}`;
}
