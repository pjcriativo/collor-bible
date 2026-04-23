import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lightbulb,
  Maximize2,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { suggestFillsFromSvg } from "@/lib/color-suggestions";
import { MANUAL_PAGE_VIEWBOX } from "@/lib/coloring-framing";
import { pageCompletionState, pagePercent } from "@/lib/coloring-progress";
import { buildMissingChecklist } from "@/lib/region-names";
import { debugLog, debugWarn } from "@/lib/debug-log";
import { useI18n } from "@/lib/i18n";
import { useThumbnailImageCache } from "@/hooks/use-thumbnail-image-cache";

type Props = {
  svg: string;
  fills: Record<string, string>;
  signatureName?: string;
  onFill: (id: string) => void;
  showSuggestion: boolean;
  onCloseSuggestion: () => void;
  pageIndex: number;
  totalPages: number;
  pageSvgs?: string[];
  pageFills?: Record<number, Record<string, string>>;
  onSelectPage?: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  /**
   * Disparado quando o usuário toca no CTA "Verificar pintura" exibido
   * sobre a área de desenho assim que a página atinge 100%. Serve como
   * um gesto explícito da criança ("eu terminei!") que reabre o modal
   * de conclusão mesmo se o autotrigger tiver sido fechado por engano
   * — robusto contra qualquer race no autosave.
   */
  onVerifyComplete?: () => void;
  /**
   * Disparado pelo botão "Já terminei" — atalho para crianças quando
   * restam regiões técnicas minúsculas que não disparam a tolerância
   * automática. O hook é responsável por preencher as regiões faltantes
   * e disparar o trigger de conclusão.
   */
  onForceComplete?: () => void;
};

type Floater = { id: number; x: number; y: number };

const DEFAULT_REGION_FILL = "#FFFFFF";
const INTERACTIVE_REGION_SELECTOR = "[id^='fill-']";

function mergeInlineStyle(attrs: string, injectedStyle: string) {
  if (/\sstyle\s*=\s*["'][^"']*["']/.test(attrs)) {
    return attrs.replace(/\sstyle\s*=\s*["']([^"']*)["']/, (_full, styleValue: string) => {
      const normalized = styleValue.trim();
      const merged = normalized ? `${normalized};${injectedStyle}` : injectedStyle;
      return ` style="${merged}"`;
    });
  }

  return `${attrs} style="${injectedStyle}"`;
}

function escapeSvgText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeSvgFraming(svgEl: SVGSVGElement, pageIndex: number) {
  const manualViewBox = MANUAL_PAGE_VIEWBOX[pageIndex];
  if (manualViewBox) {
    svgEl.setAttribute("viewBox", manualViewBox);
    return;
  }

  const elements = Array.from(
    svgEl.querySelectorAll<SVGGraphicsElement>(
      "path, rect, circle, ellipse, polygon, line, polyline",
    ),
  );
  const boxes = elements
    .map((el) => {
      try {
        const box = el.getBBox();
        const isSceneBand = box.width >= 560 || box.height >= 560;
        return box.width > 0 && box.height > 0 && !isSceneBand ? box : null;
      } catch {
        return null;
      }
    })
    .filter((box): box is DOMRect => Boolean(box));

  if (!boxes.length) return;

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const size = Math.min(600, Math.max(maxX - minX, maxY - minY, 400) + 92);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const x = Math.max(0, Math.min(600 - size, cx - size / 2));
  const y = Math.max(0, Math.min(600 - size, cy - size / 2));

  svgEl.setAttribute("viewBox", `${x} ${y} ${size} ${size}`);
}

export function buildRenderableSvg(svg: string, fills: Record<string, string>, signatureName = "") {
  const coverSvg = svg.replace(
    /<svg\b([^>]*)>/i,
    (_full, attrs: string) => `<svg${attrs} preserveAspectRatio="xMidYMid meet">`,
  );

  const paintedSvg = coverSvg.replace(
    /<([a-zA-Z][^\s/>]*)([^>]*\sid\s*=\s*["'](fill-[^"']+)["'][^>]*?)(\/)?>/g,
    (_full, tagName: string, attrs: string, id: string, selfClosing = "") => {
      const nextFill = fills[id] ?? DEFAULT_REGION_FILL;
      const withFill = /\sfill\s*=\s*["'][^"']*["']/.test(attrs)
        ? attrs.replace(/\sfill\s*=\s*["'][^"']*["']/, ` fill="${nextFill}"`)
        : `${attrs} fill="${nextFill}"`;

      const withStyle = mergeInlineStyle(
        withFill,
        "cursor:pointer;pointer-events:all;transition:fill 100ms ease-out",
      );

      return `<${tagName}${withStyle}${selfClosing}>`;
    },
  );

  const cleanName = signatureName.trim();
  if (!cleanName) return paintedSvg;

  return paintedSvg.replace(
    /<\/svg>\s*$/i,
    `<g pointer-events="none"><path d="M 76% 95% C 82% 97%, 91% 97%, 97% 95%" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round" opacity="0.55"/><text x="96%" y="93%" text-anchor="end" font-family="Brush Script MT, Segoe Script, Comic Sans MS, cursive" font-size="44" font-style="italic" font-weight="600" fill="#1f2937" stroke="#ffffff" stroke-width="5" paint-order="stroke" letter-spacing="1.5">${escapeSvgText(cleanName)}</text></g></svg>`,
  );
}

export const ColoringCanvas = forwardRef<HTMLDivElement, Props>(function ColoringCanvas(
  {
    svg,
    fills,
    signatureName,
    onFill,
    showSuggestion,
    onCloseSuggestion,
    pageIndex,
    totalPages,
    pageSvgs = [],
    pageFills = {},
    onSelectPage,
    onPrev,
    onNext,
    onVerifyComplete,
    onForceComplete,
  },
  ref,
) {
  const { t, language } = useI18n();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const thumbnailButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Refs e estado da lista de páginas (aside).
  //
  // - `pageListRef` aponta para o trilho rolável (eixo X no mobile/tablet
  //   horizontal, eixo Y no desktop com layout em coluna).
  // - `pageListOverflow` indica se cabe mais conteúdo escondido em cada
  //   ponta. Usado para esconder os botões "anterior/próxima" quando não
  //   há nada para revelar — evita controles inúteis no mobile com poucas
  //   páginas e mantém a UI limpa.
  // - `pageListAxis` define se os botões aparecem como ◀▶ (horizontal)
  //   ou ▲▼ (vertical), seguindo o mesmo eixo do overflow detectado.
  const pageListRef = useRef<HTMLDivElement | null>(null);
  const [pageListOverflow, setPageListOverflow] = useState<{
    axis: "x" | "y" | "none";
    canScrollStart: boolean;
    canScrollEnd: boolean;
  }>({ axis: "none", canScrollStart: false, canScrollEnd: false });
  // Painel de páginas em MOBILE/TABLET (<lg): em vez de trilho horizontal
  // que escondia miniaturas atrás do gradiente, mostramos uma GRID
  // paginada de 5 colunas × 2 linhas (10 thumbs por sub-página). Com 30
  // páginas isso dá 3 sub-páginas, navegáveis por dots ou setas. A
  // sub-página visível sincroniza automaticamente com `pageIndex`,
  // garantindo que a thumb da página ativa esteja sempre à vista.
  const MOBILE_THUMBS_PER_GRID_PAGE = 10;
  const mobileGridPagesTotal = Math.max(1, Math.ceil(totalPages / MOBILE_THUMBS_PER_GRID_PAGE));
  const [mobileGridPage, setMobileGridPage] = useState(() =>
    Math.floor(pageIndex / MOBILE_THUMBS_PER_GRID_PAGE),
  );
  // Quando `pageIndex` muda (ex.: usuário usou as setas laterais para
  // pular página), garantimos que a grid mobile pule para a sub-página
  // que contém a miniatura ativa — caso contrário a miniatura sumiria.
  useEffect(() => {
    const targetGridPage = Math.floor(pageIndex / MOBILE_THUMBS_PER_GRID_PAGE);
    setMobileGridPage((prev) => (prev === targetGridPage ? prev : targetGridPage));
  }, [pageIndex]);
  const setRefs = (node: HTMLDivElement | null) => {
    wrapRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const lastClickRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerPaintRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const paintedInDragRef = useRef<Set<string>>(new Set());
  const floaterIdRef = useRef(0);

  // ─── Pinch-to-zoom + pan no canvas (mobile) ───────────────────────
  // Estado é um simples (scale, tx, ty) aplicado via CSS transform no
  // wrapper interno do SVG. O modo "gesto" só ativa quando há 2+ ponteiros
  // simultâneos; com 1 ponteiro o pintor original toma conta. Botões + / −
  // / ajustar atendem ao caso desktop e ao "voltar" pedido pelo PRD.
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  // Constantes de UX da pinça/pan — ajustadas para conforto no mobile.
  // - PINCH_DEADBAND_PX: ignora variações minúsculas de distância entre
  //   os dois dedos. Sem isso, o canvas "tremia" porque qualquer leve
  //   movimento dos dedos virava zoom.
  // - PINCH_SENSITIVITY: <1 deixa a pinça mais "calma" (ratio puxa para 1).
  //   0.7 dá uma sensação parecida com o zoom nativo de fotos do iOS,
  //   sem dar a impressão de "pesado".
  // - GESTURE_COOLDOWN_MS: tempo após o fim de um gesto em que a pintura
  //   por click/pointerdown é ignorada. Era 350ms — pequeno demais; o
  //   click sintético do iOS chega ~300ms depois, e o segundo dedo solto
  //   do gesto também dispara um pointerdown praticamente imediato. 700ms
  //   elimina pinturas acidentais ao terminar o pinça/pan.
  // - PAINT_INTENT_DELAY_MS: pequeno atraso para confirmar que o usuário
  //   QUIS pintar com 1 dedo (e não estava começando uma pinça). Se um
  //   segundo dedo chegar dentro desse tempo, a pintura agendada é
  //   cancelada.
  // - PAN_THRESHOLD_PX: com zoom > 1, 1 dedo passa a controlar PAN. Para
  //   ainda permitir TAP-para-pintar, só convertemos em pan quando o
  //   ponteiro se moveu mais que esse limiar. Abaixo disso o tap pinta.
  const PINCH_DEADBAND_PX = 8;
  const PINCH_SENSITIVITY = 0.7;
  const GESTURE_COOLDOWN_MS = 700;
  const PAINT_INTENT_DELAY_MS = 60;
  const PAN_THRESHOLD_PX = 6;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  // Skeleton de transição: ativado durante a troca de página quando a
  // página anterior tinha zoom > 1. Esconde o canvas por 1-2 frames até
  // o reset de zoom/pan + clamp terminarem, evitando que o usuário veja
  // o conteúdo "saltar" do estado ampliado deslocado para o estado
  // ajustado e centralizado. Em zoom = 1 a transição já é imperceptível,
  // então não vale a pena flashar o skeleton.
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const gesturePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureStartRef = useRef<{
    distance: number;
    midX: number;
    midY: number;
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);
  const isGesturingRef = useRef(false);
  // Pintura "intencional" com 1 dedo: agendada para PAINT_INTENT_DELAY_MS
  // depois do pointerdown. Se um segundo dedo chegar antes, cancelamos
  // essa pintura — é o que evita "pintar enquanto começa a pinça".
  const pendingPaintRef = useRef<{
    timer: number;
    pointerId: number;
    target: EventTarget | null;
    x: number;
    y: number;
  } | null>(null);
  // Para o modo "1 dedo = pan quando zoom>1", guarda a posição inicial
  // do toque e o pan no momento do toque. Se o usuário mover o dedo
  // mais que PAN_THRESHOLD_PX, paramos de tentar pintar e começamos a
  // arrastar a imagem. Tap curto continua pintando.
  const singleTouchStartRef = useRef<{
    x: number;
    y: number;
    pan: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Geração da troca de página: cada mudança de `pageIndex` incrementa
  // este contador. Trocas rápidas (criança apertando ▶ várias vezes
  // seguidas) podem disparar callbacks assíncronos pendentes da página
  // anterior — comparar contra o ref garante que só o reset/clamp da
  // troca MAIS RECENTE sobreviva, evitando que uma rAF antiga reaplique
  // pan herdado quando o canvas novo já está no DOM.
  const pageGenerationRef = useRef(0);

  // Reseta zoom/pan ao trocar de página E re-clampa imediatamente
  // antes do próximo paint. Usa `useLayoutEffect` (não `useEffect`)
  // para que a sequência aconteça de forma síncrona ANTES de o
  // navegador desenhar o novo SVG — sem isso, em trocas rápidas
  // o frame piscava com o pan da página anterior por 1-2 frames.
  //
  // Sequência:
  //  1. Marca esta troca como a "geração atual" (descarta callbacks
  //     pendentes de trocas anteriores).
  //  2. Zera zoom + pan no estado React e nos refs (síncrono).
  //  3. Roda `clampPan` com o tamanho ATUAL do wrapper para garantir
  //     que, mesmo se algum callback pendente (pinça/pan) tiver
  //     mexido em panRef entre a troca e este efeito, o resultado
  //     final esteja dentro dos limites do novo canvas.
  //  4. Agenda uma segunda checagem em rAF para o caso do layout do
  //     wrapper só estabilizar após o React commit (ex.: SVG novo
  //     com viewBox diferente recalcula a altura). Se a geração
  //     mudou nesse intervalo, descarta — outra troca já cuidou.
  useLayoutEffect(() => {
    pageGenerationRef.current += 1;
    const myGeneration = pageGenerationRef.current;

    // Só ativa o skeleton se a página ANTERIOR estava com zoom > 1.
    // Em zoom = 1 a troca já é visualmente limpa (canvas centralizado,
    // sem deslocamento) — flashar skeleton aí seria ruído gratuito.
    const wasZoomed = zoomRef.current > 1.01;
    if (wasZoomed) setIsPageTransitioning(true);

    setZoom(1);
    zoomRef.current = 1;

    const wrap = wrapRef.current;
    const clampedNow = clampPan(1, { x: 0, y: 0 }, wrap);
    setPan(clampedNow);
    panRef.current = clampedNow;

    // Segunda passada após o layout do novo canvas estabilizar.
    // Garante que se o wrapper mudou de tamanho entre o commit e o
    // paint, o pan permaneça válido. Também é onde DESLIGAMOS o
    // skeleton: nesse ponto o reset + clamp já se aplicaram e o novo
    // SVG está posicionado corretamente; remover o skeleton aqui
    // entrega o canvas já centralizado, sem nenhum frame intermediário.
    const rafId = requestAnimationFrame(() => {
      if (myGeneration !== pageGenerationRef.current) return;
      const wrapAfter = wrapRef.current;
      if (wrapAfter) {
        const reclamped = clampPan(zoomRef.current, panRef.current, wrapAfter);
        if (reclamped.x !== panRef.current.x || reclamped.y !== panRef.current.y) {
          panRef.current = reclamped;
          setPan(reclamped);
        }
      }
      if (wasZoomed) setIsPageTransitioning(false);
    });

    return () => {
      cancelAnimationFrame(rafId);
      // Se a troca foi descartada por outra mais recente, o próximo
      // efeito decide se mostra ou não o skeleton — não deixamos o
      // estado "preso" em true.
      if (wasZoomed) setIsPageTransitioning(false);
    };
  }, [pageIndex]);

  // Re-centraliza/clampa o pan quando o viewport muda de tamanho
  // (rotação de tablet, redimensionamento de janela, abertura do
  // teclado virtual). Sem isso, com zoom > 1 a imagem podia ficar
  // "deslocada" para fora do frame após resize, dando a sensação de
  // que o canvas se aproximou do rodapé. O frame em si mantém
  // aspect-square + overflow-hidden, e o container pai centraliza
  // verticalmente — basta clampar o pan dentro dos novos limites.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Re-clampa o pan dentro dos limites atuais do wrapper. Roda em
    // qualquer evento que possa mudar a altura útil do canvas:
    //  - resize / orientationchange da janela
    //  - ResizeObserver no próprio wrapper (cobre mudanças causadas
    //    por scroll do painel de páginas, abertura de teclado virtual,
    //    chegada de fontes assíncronas, mudança de zoom da página, etc.)
    //  - scroll do painel lateral de páginas: rolar a sidebar pode
    //    mexer no layout flex em alguns navegadores/versões; um
    //    re-clamp barato garante que o canvas continue contido.
    // Em zoom = 1 a função `clampPan` retorna `{0,0}` direto, então
    // a maioria das execuções é praticamente gratuita.
    const reclamp = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      setPan((current) => {
        const clamped = clampPan(zoomRef.current, current, wrap);
        if (clamped.x === current.x && clamped.y === current.y) return current;
        panRef.current = clamped;
        return clamped;
      });
    };

    // Throttle via rAF: rajadas de eventos (resize contínuo arrastando
    // a janela, scroll inercial no trackpad) coalescem em 1 chamada
    // por frame — evita re-render por evento sem perder responsividade.
    let pending = false;
    const scheduleReclamp = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        reclamp();
      });
    };

    window.addEventListener("resize", scheduleReclamp);
    window.addEventListener("orientationchange", scheduleReclamp);

    let resizeObserver: ResizeObserver | null = null;
    const wrap = wrapRef.current;
    if (wrap && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleReclamp);
      resizeObserver.observe(wrap);
    }

    const pageList = pageListRef.current;
    pageList?.addEventListener("scroll", scheduleReclamp, { passive: true });

    return () => {
      window.removeEventListener("resize", scheduleReclamp);
      window.removeEventListener("orientationchange", scheduleReclamp);
      resizeObserver?.disconnect();
      pageList?.removeEventListener("scroll", scheduleReclamp);
    };
  }, []);

  const clampPan = (
    nextZoom: number,
    nextPan: { x: number; y: number },
    container: HTMLElement | null,
  ) => {
    if (!container || nextZoom <= 1) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const maxX = (rect.width * (nextZoom - 1)) / 2;
    const maxY = (rect.height * (nextZoom - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
    };
  };

  const adjustZoom = (delta: number) => {
    const wrap = wrapRef.current;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current + delta));
    setZoom(next);
    setPan((p) => clampPan(next, p, wrap));
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const suggestedFills = useMemo(() => suggestFillsFromSvg(svg), [svg]);
  const renderedSvg = useMemo(
    () => buildRenderableSvg(svg, fills, signatureName),
    [svg, fills, signatureName],
  );

  const previewSvg = useMemo(() => buildRenderableSvg(svg, suggestedFills), [svg, suggestedFills]);
  const renderedThumbnailSvgs = useMemo(
    () => pageSvgs.map((pageSvg, index) => buildRenderableSvg(pageSvg, pageFills[index] ?? {})),
    [pageFills, pageSvgs],
  );
  // Cache local (IndexedDB) das PNGs embutidas nas miniaturas: na 1ª visita
  // popula o IDB; nas seguintes, reescreve `<image href>` pra `blob:` URL,
  // evitando re-decodificar os mesmos PNGs a cada navegação.
  const thumbnailSvgs = useThumbnailImageCache(renderedThumbnailSvgs);

  const thumbnailProgress = useMemo(() => {
    return pageSvgs.map((pageSvg, index) => {
      const currentFills = (index === pageIndex ? fills : pageFills[index]) ?? {};
      return pagePercent(pageSvg, currentFills);
    });
  }, [pageSvgs, pageFills, fills, pageIndex]);

  // Fonte única do estado de conclusão da página atual. `pageCompletionState`
  // garante que `percent`, `isComplete` e `validation` concordem entre si
  // — sem isso, o canvas podia mostrar "100%" enquanto a miniatura ainda
  // dizia "90%", ou o badge ficava preso quando havia fills fantasmas.
  const completion = useMemo(() => pageCompletionState(svg, fills), [svg, fills]);
  const currentPagePercent = completion.percent;
  const validation = completion.validation;
  const isCurrentPageComplete = completion.isComplete;

  // ─── Validação automática por página (dev only) ────────────────────
  // Loga o relatório + a razão do fallback aplicado por
  // `pageCompletionState` (ex.: `ghost-fills-only`). Útil para
  // diagnosticar desalinhamentos entre canvas e miniaturas.
  useEffect(() => {
    debugLog("coloring-validation", "validate", {
      pageIndex,
      totalValid: validation.totalValid,
      painted: validation.painted,
      missing: validation.missingIds.length,
      invalidPainted: validation.invalidPaintedIds.length,
      reason: completion.reason,
      percent: completion.percent,
    });
    if (!validation.ok) {
      debugWarn("coloring-validation", "validate", {
        pageIndex,
        message:
          "Regiões pintadas que NÃO constam como preenchíveis nesta página — possível SVG alterado ou localStorage órfão.",
        invalidPaintedIds: validation.invalidPaintedIds,
      });
    }
  }, [pageIndex, validation, completion.reason, completion.percent]);

  /*
   * Pista visual para a criança quando a página está QUASE pronta
   * (>=50% e <100%). O número de regiões faltantes vem da mesma
   * `validatePageProgress` que alimenta a validação dev — então
   * concorda por construção com o `pagePercent` exibido nas miniaturas.
   *
   * Mostramos o CTA "Mostrar o que falta" só a partir de 50% para não
   * poluir a tela no começo (onde "tudo falta" é óbvio). Acima de 50%
   * é justamente onde a criança costuma achar que terminou mas deixou
   * detalhes pequenos sem cor (ex.: sol, flores, rosto).
   */
  const missingCount = validation.missingIds.length;
  const showMissingHint = !isCurrentPageComplete && currentPagePercent >= 50 && missingCount > 0;

  // Estado do checklist "o que falta": fechado por padrão; abre quando a
  // criança toca no CTA. Reseta sozinho quando a página muda ou quando
  // não há mais nada faltando, evitando ficar "preso" aberto.
  const [missingChecklistOpen, setMissingChecklistOpen] = useState(false);
  useEffect(() => {
    if (!showMissingHint && missingChecklistOpen) setMissingChecklistOpen(false);
  }, [showMissingHint, missingChecklistOpen]);
  useEffect(() => {
    setMissingChecklistOpen(false);
  }, [pageIndex]);

  // Checklist agregado por nome amigável ("Sol", "Flor", "Criança"…).
  // Limitado a 5 itens visíveis para não cobrir o canvas — o resto vira
  // um sufixo "+N" ao final.
  const missingChecklist = useMemo(
    () => buildMissingChecklist(validation.missingIds, language),
    [validation.missingIds, language],
  );
  const missingChecklistVisible = missingChecklist.slice(0, 5);
  const missingChecklistOverflow = Math.max(
    0,
    missingChecklist.length - missingChecklistVisible.length,
  );

  /*
   * Ao tocar "Mostrar o que falta", aplicamos a classe `pulse-missing`
   * em cada região não pintada por alguns segundos. Removemos a classe
   * via setTimeout para não interferir com o fluxo normal de pintura
   * (sem isso, a animação ficaria presa no DOM quando a criança
   * finalmente pintasse). É um helper puro de DOM — não precisa ir
   * para o estado React, é animação descartável.
   */
  const highlightMissing = (ids: string[] = validation.missingIds) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const svgEl = wrap.querySelector("svg");
    if (!svgEl) return;
    ids.forEach((id) => {
      const el = svgEl.querySelector<SVGElement>(`[id="${id}"]`);
      if (!el) return;
      el.classList.remove("pulse-missing");
      void (el as unknown as HTMLElement).offsetWidth;
      el.classList.add("pulse-missing");
      window.setTimeout(() => el.classList.remove("pulse-missing"), 3200);
    });
  };

  const spawnFloater = (x: number, y: number) => {
    const id = ++floaterIdRef.current;
    setFloaters((arr) => [...arr, { id, x, y }]);
    window.setTimeout(() => {
      setFloaters((arr) => arr.filter((f) => f.id !== id));
    }, 950);
  };

  const previousFillsRef = useRef<Record<string, string>>({});
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const svgEl = wrap.querySelector("svg");
    if (!svgEl) return;
    const previousFills = previousFillsRef.current;

    Object.entries(fills).forEach(([id, nextFill]) => {
      const prevFill = previousFills[id];
      if (!nextFill || prevFill === nextFill) return;

      const el = svgEl.querySelector<SVGElement>(`[id="${id}"]`);
      if (!el) return;

      el.classList.remove("paint-splash");
      void (el as unknown as HTMLElement).offsetWidth;
      el.classList.add("paint-splash");
      window.setTimeout(() => el.classList.remove("paint-splash"), 360);

      const isNewlyPainted = !prevFill || prevFill === DEFAULT_REGION_FILL;
      if (!isNewlyPainted) return;

      const container = containerRef.current;
      const last = lastClickRef.current;
      if (container && last) {
        const rect = container.getBoundingClientRect();
        spawnFloater(last.x - rect.left, last.y - rect.top);
        lastClickRef.current = null;
        return;
      }

      if (container) {
        const bbox = (el as SVGGraphicsElement).getBoundingClientRect();
        const rect = container.getBoundingClientRect();
        spawnFloater(bbox.left + bbox.width / 2 - rect.left, bbox.top + bbox.height / 2 - rect.top);
      }
    });

    previousFillsRef.current = fills;
  }, [fills, renderedSvg]);

  useEffect(() => {
    previousFillsRef.current = {};
    setFloaters([]);
    lastClickRef.current = null;
  }, [svg]);

  useLayoutEffect(() => {
    const svgEl = wrapRef.current?.querySelector<SVGSVGElement>("svg");
    if (svgEl) normalizeSvgFraming(svgEl, pageIndex);
  }, [renderedSvg, pageIndex]);

  useEffect(() => {
    thumbnailButtonRefs.current[pageIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [pageIndex]);

  /**
   * Navegação por teclado entre miniaturas (roving tabindex).
   *
   * Por que `roving tabindex` em vez de deixar todas as thumbs `tabIndex=0`?
   *  - Em histórias com 20+ páginas, ter cada miniatura no tab order
   *    obrigaria o usuário a apertar Tab dezenas de vezes para sair do
   *    aside. Com roving, só a miniatura "ativa" entra na ordem natural;
   *    setas movem dentro do grupo. É o padrão recomendado pela WAI-ARIA
   *    Authoring Practices para listas/tablists.
   *
   * Teclas suportadas (quando o foco está em uma miniatura):
   *  - ArrowLeft / ArrowUp  → miniatura anterior
   *  - ArrowRight / ArrowDown → próxima miniatura
   *  - Home → primeira  | End → última
   *  - Enter / Space → seleciona a página (`onSelectPage`)
   *
   * Após mover o foco programaticamente, chamamos `scrollIntoView` com
   * `block: "nearest"` + `inline: "nearest"` para garantir que o item
   * focado fique visível tanto no aside vertical (desktop) quanto na
   * faixa horizontal (mobile/tablet) — sem isso o foco poderia "sumir"
   * para fora da viewport do trilho rolável.
   */
  const focusThumbnail = (index: number) => {
    const total = thumbnailSvgs.length;
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(total - 1, index));
    const node = thumbnailButtonRefs.current[clamped];
    if (!node) return;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  };

  const handleThumbnailKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusThumbnail(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusThumbnail(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusThumbnail(0);
        break;
      case "End":
        event.preventDefault();
        focusThumbnail(thumbnailSvgs.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelectPage?.(index);
        break;
      default:
        break;
    }
  };

  // Observa overflow da lista de páginas no aside e atualiza o estado
  // dos botões de scroll. Roda em:
  //  - resize do container (ResizeObserver)
  //  - scroll do trilho (passive)
  //  - mudança da quantidade de páginas (`thumbnailSvgs.length` na dep)
  // Critério de detecção: usamos `scrollWidth/Height > clientWidth/Height`
  // (tolerância de 1px contra arredondamentos) para escolher o eixo, e
  // `scrollLeft/Top` ± `clientWidth/Height` para saber se ainda cabe rolar.
  useEffect(() => {
    const el = pageListRef.current;
    if (!el) return;

    const update = () => {
      const overflowsX = el.scrollWidth - el.clientWidth > 1;
      const overflowsY = el.scrollHeight - el.clientHeight > 1;
      if (!overflowsX && !overflowsY) {
        setPageListOverflow({ axis: "none", canScrollStart: false, canScrollEnd: false });
        return;
      }
      // Quando ambos os eixos rolam (raro), priorizamos o eixo principal
      // do layout — vertical no desktop (coluna), horizontal no mobile.
      const axis: "x" | "y" =
        overflowsY && el.clientHeight > el.clientWidth ? "y" : overflowsX ? "x" : "y";
      const start = axis === "x" ? el.scrollLeft : el.scrollTop;
      const max =
        axis === "x" ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      setPageListOverflow({
        axis,
        canScrollStart: start > 1,
        canScrollEnd: start < max - 1,
      });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [thumbnailSvgs.length]);

  // Rola a lista de páginas em ~80% do viewport visível, sentido a critério.
  // Usado pelos botões "anterior/próxima" do aside. Mantém o gesto previsível
  // (não pula a lista inteira) e garante que a próxima miniatura "atrás"
  // do botão ainda fique parcialmente visível como pista visual.
  const scrollPageList = (direction: "start" | "end") => {
    const el = pageListRef.current;
    if (!el) return;
    const sign = direction === "end" ? 1 : -1;
    if (pageListOverflow.axis === "y") {
      el.scrollBy({ top: sign * el.clientHeight * 0.8, behavior: "smooth" });
    } else {
      el.scrollBy({ left: sign * el.clientWidth * 0.8, behavior: "smooth" });
    }
  };

  // Event delegation for region clicks/touches
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const paintFromPoint = (
      target: EventTarget | null,
      clientX: number,
      clientY: number,
      skipAlreadyPainted = false,
    ) => {
      let node = target instanceof Element ? target : null;
      while (node && node !== wrap && !(node.id && node.id.startsWith("fill-"))) {
        node = node.parentElement;
      }
      if (!node || node === wrap || !node.id?.startsWith("fill-")) {
        const hitRegion = document
          .elementsFromPoint(clientX, clientY)
          .find((el) => wrap.contains(el) && el.matches(INTERACTIVE_REGION_SELECTOR));
        node = hitRegion ?? null;
      }

      if (!node || node === wrap || !node.id?.startsWith("fill-")) return false;
      if (skipAlreadyPainted && paintedInDragRef.current.has(node.id)) return false;
      paintedInDragRef.current.add(node.id);
      lastClickRef.current = { x: clientX, y: clientY };
      onFill(node.id);
      return true;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Ignora qualquer interação que comece dentro dos controles
      // flutuantes (zoom +/−, ajustar). Eles vivem dentro do mesmo
      // wrapper para posicionamento, mas NUNCA devem disparar pintura.
      const targetEl = e.target as Element | null;
      if (targetEl && targetEl.closest("[data-coloring-controls]")) return;
      // Registra o ponteiro no mapa de gesto. Com 2+ dedos entramos em
      // modo pinch/pan e CANCELAMOS qualquer pintura em andamento.
      gesturePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (gesturePointersRef.current.size >= 2) {
        isGesturingRef.current = true;
        activePointerIdRef.current = null;
        paintedInDragRef.current = new Set();
        // Cancela qualquer pintura agendada — o usuário estava começando
        // uma pinça, não um clique.
        if (pendingPaintRef.current) {
          window.clearTimeout(pendingPaintRef.current.timer);
          pendingPaintRef.current = null;
        }
        singleTouchStartRef.current = null;
        const pts = Array.from(gesturePointersRef.current.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        gestureStartRef.current = {
          distance: Math.hypot(dx, dy) || 1,
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
          zoom: zoomRef.current,
          pan: { ...panRef.current },
        };
        e.preventDefault();
        return;
      }
      paintedInDragRef.current = new Set();
      activePointerIdRef.current = e.pointerId;
      wrap.setPointerCapture?.(e.pointerId);
      // Cooldown pós-gesto: ignora pintura imediatamente após terminar
      // uma pinça/pan, mesmo que tenha vindo um pointerdown novo.
      const inCooldown = Date.now() - lastPointerPaintRef.current < GESTURE_COOLDOWN_MS;
      // Quando há zoom, 1 dedo passa a controlar PAN — guarda posição
      // inicial para decidir entre TAP (pinta) e DRAG (pan).
      if (zoomRef.current > 1.05) {
        singleTouchStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          pan: { ...panRef.current },
          moved: false,
        };
        // Não pinta de imediato — aguarda o pointerup curto (tap) para
        // confirmar intenção.
        return;
      }
      if (inCooldown) return;
      // Pintura por TOQUE com atraso curto: se um segundo dedo chegar
      // dentro de PAINT_INTENT_DELAY_MS, cancelamos a pintura — assim a
      // pinça nunca pinta acidentalmente o ponto onde o primeiro dedo
      // tocou. Mouse pinta imediatamente (não há pinça com mouse).
      if (e.pointerType !== "touch") {
        if (paintFromPoint(e.target, e.clientX, e.clientY, true)) {
          lastPointerPaintRef.current = Date.now();
          e.preventDefault();
        }
        return;
      }
      const target = e.target;
      const cx = e.clientX;
      const cy = e.clientY;
      const pointerId = e.pointerId;
      if (pendingPaintRef.current) {
        window.clearTimeout(pendingPaintRef.current.timer);
      }
      pendingPaintRef.current = {
        pointerId,
        target,
        x: cx,
        y: cy,
        timer: window.setTimeout(() => {
          pendingPaintRef.current = null;
          if (gesturePointersRef.current.size >= 2) return;
          if (paintFromPoint(target, cx, cy, true)) {
            lastPointerPaintRef.current = Date.now();
          }
        }, PAINT_INTENT_DELAY_MS),
      };
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      // Atualiza posição no mapa para o cálculo de pinça/pan.
      if (gesturePointersRef.current.has(e.pointerId)) {
        gesturePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (
        isGesturingRef.current &&
        gesturePointersRef.current.size >= 2 &&
        gestureStartRef.current
      ) {
        const pts = Array.from(gesturePointersRef.current.values()).slice(0, 2);
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const distance = Math.hypot(dx, dy) || 1;
        const start = gestureStartRef.current;
        // Deadband: se a variação de distância for menor que o limiar,
        // não muda o zoom — só o pan. Sem isso, o canvas tremia ao tentar
        // só arrastar com 2 dedos.
        const distanceDelta = distance - start.distance;
        const rawRatio = distance / start.distance;
        // Suaviza o ratio em torno de 1 para não ficar "sensível demais".
        const smoothedRatio = 1 + (rawRatio - 1) * PINCH_SENSITIVITY;
        const ratio = Math.abs(distanceDelta) < PINCH_DEADBAND_PX ? 1 : smoothedRatio;
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, start.zoom * ratio));
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const nextPan = clampPan(
          nextZoom,
          { x: start.pan.x + (midX - start.midX), y: start.pan.y + (midY - start.midY) },
          wrap,
        );
        zoomRef.current = nextZoom;
        panRef.current = nextPan;
        setZoom(nextZoom);
        setPan(nextPan);
        e.preventDefault();
        return;
      }
      if (activePointerIdRef.current !== e.pointerId) return;
      // Modo "zoom + 1 dedo = PAN": se moveu mais que o limiar, vira pan
      // e cancela qualquer pintura agendada. Tap curto continua pintando
      // pelo onPointerUp.
      const single = singleTouchStartRef.current;
      if (single) {
        const dxs = e.clientX - single.x;
        const dys = e.clientY - single.y;
        if (!single.moved && Math.hypot(dxs, dys) > PAN_THRESHOLD_PX) {
          single.moved = true;
          if (pendingPaintRef.current) {
            window.clearTimeout(pendingPaintRef.current.timer);
            pendingPaintRef.current = null;
          }
        }
        if (single.moved) {
          const nextPan = clampPan(
            zoomRef.current,
            { x: single.pan.x + dxs, y: single.pan.y + dys },
            wrap,
          );
          panRef.current = nextPan;
          setPan(nextPan);
          e.preventDefault();
        }
        return;
      }
      // Sem zoom: arrastar com 1 dedo segue pintando regiões adjacentes
      // (UX original — bom para colorir áreas grandes rapidamente).
      if (paintFromPoint(e.target, e.clientX, e.clientY, true)) {
        lastPointerPaintRef.current = Date.now();
        e.preventDefault();
      }
    };
    const endDrag = (e: PointerEvent) => {
      gesturePointersRef.current.delete(e.pointerId);
      if (gesturePointersRef.current.size < 2) {
        // Saiu do modo gesto. Engole o próximo "click" sintético para
        // não pintar acidentalmente ao tirar os dedos da tela.
        if (isGesturingRef.current) {
          lastPointerPaintRef.current = Date.now();
        }
        isGesturingRef.current = false;
        gestureStartRef.current = null;
      }
      if (activePointerIdRef.current !== e.pointerId) return;
      activePointerIdRef.current = null;
      // Tap-to-paint no modo zoom: se o ponteiro NÃO virou pan, isto é
      // um toque curto — pintamos agora.
      const single = singleTouchStartRef.current;
      singleTouchStartRef.current = null;
      if (single && !single.moved) {
        const inCooldown = Date.now() - lastPointerPaintRef.current < GESTURE_COOLDOWN_MS;
        if (!inCooldown && gesturePointersRef.current.size === 0) {
          if (paintFromPoint(e.target, e.clientX, e.clientY, true)) {
            lastPointerPaintRef.current = Date.now();
          }
        }
      }
      // Confirma a pintura agendada se o dedo subiu antes do timer e
      // ninguém cancelou (não houve segundo dedo). Reduz o "atraso
      // perceptível" em toques rápidos.
      const pending = pendingPaintRef.current;
      if (pending && pending.pointerId === e.pointerId) {
        window.clearTimeout(pending.timer);
        pendingPaintRef.current = null;
        if (gesturePointersRef.current.size === 0) {
          if (paintFromPoint(pending.target, pending.x, pending.y, true)) {
            lastPointerPaintRef.current = Date.now();
          }
        }
      }
      paintedInDragRef.current = new Set();
      wrap.releasePointerCapture?.(e.pointerId);
    };
    const onClick = (e: MouseEvent) => {
      // Cooldown maior: o click sintético do iOS chega ~300ms depois do
      // pointerup, e se um gesto acabou de terminar não queremos pintar.
      if (Date.now() - lastPointerPaintRef.current < GESTURE_COOLDOWN_MS) return;
      if (isGesturingRef.current) return;
      if (gesturePointersRef.current.size > 0) return;
      // Defesa em profundidade: se o click veio de dentro dos controles
      // (botões de zoom), ignora. O pointerdown já filtra, mas o click
      // sintético em alguns navegadores pode chegar mesmo assim.
      const targetEl = e.target as Element | null;
      if (targetEl && targetEl.closest("[data-coloring-controls]")) return;
      // Em modo zoom o click sintético do mobile já foi tratado no
      // pointerup (tap-to-paint). Evita "pintar duas vezes" o mesmo
      // ponto: ignoramos clicks aqui se há zoom aplicado.
      if (zoomRef.current > 1.05) return;
      paintFromPoint(e.target, e.clientX, e.clientY);
    };
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);
    wrap.addEventListener("click", onClick);
    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", endDrag);
      wrap.removeEventListener("pointercancel", endDrag);
      wrap.removeEventListener("click", onClick);
      // Limpa qualquer pintura agendada pendente — evita disparo
      // tardio após o canvas ser desmontado/troca de página.
      if (pendingPaintRef.current) {
        window.clearTimeout(pendingPaintRef.current.timer);
        pendingPaintRef.current = null;
      }
      gesturePointersRef.current.clear();
      isGesturingRef.current = false;
      gestureStartRef.current = null;
      singleTouchStartRef.current = null;
    };
  }, [onFill]);

  return (
    <div
      ref={containerRef}
      // Espaçamento inferior ampliado em lg+ (`lg:pb-10`, ~40px) para
      // criar respiro real entre o canvas/sidebar e a barra de cores.
      // Antes (lg:pb-8) ainda dava sensação de "encavalado": o canvas
      // ficava colado na toolbar e a última linha de miniaturas do
      // aside ficava cortada pela borda do card. 40px elimina os dois
      // problemas mantendo composição premium.
      className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-cream px-3 py-3 sm:gap-3 sm:p-4 lg:flex-row lg:items-center lg:justify-center lg:gap-5 lg:px-5 lg:pt-6 lg:pb-14"
    >
      {thumbnailSvgs.length > 0 && (
        // Largura do painel lateral dimensionada para acomodar
        // exatamente 5 colunas fixas de miniaturas (pedido do usuário:
        // 5 por linha, 6 linhas visíveis cobrindo as 30 páginas).
        // Largura escalonada para garantir 5 colunas confortáveis em
        // qualquer largura de desktop:
        //  - lg (1024-1279): 22rem (352px) — em telas estreitas evita
        //    consumir muito do canvas; 5 cols × ~58px + gaps cabem.
        //  - xl (1280-1535): 26rem (416px) — espaço extra para o
        //    miolo da imagem.
        //  - 2xl+ (≥1536): 30rem (480px) — desktops largos ganham
        //    miniaturas maiores sem desperdiçar área de canvas.
        // `lg:pb-4` adiciona respiro entre o cartão "Páginas" e a barra
        // de cores fixa no rodapé — antes o cartão cinza ficava colado
        // no chão sem espaço para a sombra/borda inferior respirarem.
        <div className="relative order-2 mt-3 w-full shrink-0 lg:order-none lg:mt-0 lg:flex lg:max-h-[min(640px,calc(100dvh-11rem))] lg:w-[20rem] lg:items-start lg:self-center lg:pb-2 xl:w-[22rem] 2xl:w-[24rem]">
          {/*
            MOBILE / TABLET (<lg): grid paginada de 5×2 (10 thumbs por
            sub-página) substituindo o trilho horizontal scrollável que
            escondia miniaturas atrás do gradiente. Vantagens:
              - Toda thumb da sub-página atual fica visível ao mesmo tempo;
              - Navegação previsível com setas + dots (1/3 · 2/3 · 3/3);
              - Sub-página acompanha automaticamente o `pageIndex`, então
                a thumb da página ativa nunca fica fora da tela.
            O painel desktop (`<aside>`) abaixo segue exatamente igual,
            escondido em mobile via `hidden lg:block`.
          */}
          <div className="rounded-2xl border border-border/80 bg-card/95 p-3 shadow-hero backdrop-blur lg:hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-display text-sm font-extrabold text-foreground">{t("pages")}</p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {mobileGridPage + 1} / {mobileGridPagesTotal}
              </p>
            </div>
            <div role="tablist" aria-label={t("pages")} className="grid grid-cols-5 gap-2">
              {Array.from({ length: MOBILE_THUMBS_PER_GRID_PAGE }).map((_, slot) => {
                const index = mobileGridPage * MOBILE_THUMBS_PER_GRID_PAGE + slot;
                if (index >= thumbnailSvgs.length) {
                  // Slot vazio mantém todas as células do mesmo tamanho
                  // mesmo na última sub-página incompleta. Sem isso o
                  // grid esticaria e thumbs ficariam maiores nas pontas.
                  return <div key={`empty-${slot}`} aria-hidden className="invisible" />;
                }
                const thumbSvg = thumbnailSvgs[index];
                const progress = thumbnailProgress[index] ?? 0;
                const isActive = index === pageIndex;
                return (
                  <button
                    key={`m-${index}-${pageSvgs[index]?.length ?? 0}`}
                    type="button"
                    role="tab"
                    aria-current={isActive ? "page" : undefined}
                    aria-selected={isActive}
                    aria-label={`${t("openPage", { page: index + 1 })} — ${progress}%`}
                    onClick={() => onSelectPage?.(index)}
                    className={`group relative aspect-square min-h-[44px] touch-manipulation overflow-hidden rounded-xl border bg-white p-0 outline-none transition-all duration-200 ease-out active:scale-[0.94] focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                      isActive
                        ? "border-primary shadow-glow-gold ring-2 ring-primary/45"
                        : "border-border/80"
                    }`}
                  >
                    <span className="relative block h-full w-full overflow-hidden rounded-[10px] bg-white">
                      <span
                        className="block h-full w-full [&>svg]:h-[170%] [&>svg]:w-[170%] [&>svg]:-translate-x-[20%] [&>svg]:-translate-y-[20%]"
                        dangerouslySetInnerHTML={{ __html: thumbSvg }}
                      />
                      {progress === 100 && (
                        <span className="absolute right-1 top-1 rounded-full bg-mint px-1.5 py-0.5 text-[8px] font-extrabold text-mint-foreground shadow-soft">
                          ✓
                        </span>
                      )}
                      <span className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-md bg-black/55 px-1 py-0.5 text-[9px] font-extrabold leading-none text-white">
                        <span>{index + 1}</span>
                        <span className={progress === 100 ? "text-mint" : "text-white/85"}>
                          {progress}%
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {mobileGridPagesTotal > 1 && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileGridPage((p) => Math.max(0, p - 1))}
                  disabled={mobileGridPage === 0}
                  aria-label={t("previousPage")}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/80 bg-card text-foreground shadow-soft transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div role="tablist" aria-label={t("pages")} className="flex items-center gap-1.5">
                  {Array.from({ length: mobileGridPagesTotal }).map((_, i) => (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={i === mobileGridPage}
                      aria-label={`${i + 1} / ${mobileGridPagesTotal}`}
                      onClick={() => setMobileGridPage(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === mobileGridPage
                          ? "w-6 bg-primary"
                          : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileGridPage((p) => Math.min(mobileGridPagesTotal - 1, p + 1))
                  }
                  disabled={mobileGridPage === mobileGridPagesTotal - 1}
                  aria-label={t("nextPage")}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/80 bg-card text-foreground shadow-soft transition hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <aside
            ref={pageListRef}
            // Padding aumentado em lg+ (`p-3`) para o ring de foco/seleção
            // (até 4px contando offset) não ser clipado pela borda do aside.
            // `touch-pan-x` (mobile/sm) + `overscroll-x-contain` impedem
            // que o gesto horizontal do dedo "vaze" para o eixo vertical
            // do app — antes, ao arrastar uma miniatura para o lado, o
            // navegador interpretava o componente Y do gesto e rolava o
            // canvas/página para cima, dando a sensação de "subir" a
            // imagem. Agora o carrossel só responde a pan horizontal e
            // o eixo Y fica completamente travado nessa área.
            // Em lg+ trocamos para `touch-pan-y` porque o aside vira
            // uma coluna vertical scrollável (grid à direita).
            // Padding interno aumentado em lg+ (`lg:p-4`) para que as
            // miniaturas tenham respiro real nas bordas e o ring de foco
            // / seleção (até 4px) não fique encostado nas paredes do
            // aside. Antes (`lg:p-3`) o cartão da última coluna parecia
            // cortado na borda direita.
            // Padding interno do aside dimensionado para o ring de foco
            // dos botões (3px + offset 2px = 5px externos ao botão) NUNCA
            // encostar na borda em nenhum breakpoint:
            //   - mobile/sm (`p-3`): 12px de respiro em volta do trilho
            //     horizontal. Antes `p-2` deixava só 8px e o ring de foco
            //     ficava praticamente colado nas paredes do aside.
            //   - lg+ (`lg:p-4`): 16px em desktop, com folga extra para
            //     o ring de seleção (`ring-2 ring-primary/45`) da página
            //     ativa também respirar.
            // Aside é EXCLUSIVO de desktop (`hidden lg:block`); o mobile
            // usa a grid paginada acima.
            // `overflow-hidden` em vez de `overflow-y-auto`: como
            // forçamos 6 linhas iguais (via grid-template-rows abaixo) e
            // dimensionamos as miniaturas para caber em qualquer altura
            // de viewport desktop, NÃO deve haver scroll. Se sobrar
            // conteúdo (ex.: histórias com >30 páginas), a grid limita a
            // 6 linhas naturalmente — evitando o sintoma de "última
            // linha cortada". Para histórias futuras com mais páginas,
            // basta paginar o aside como o mobile.
            // `flex flex-col` permite que a grid filha consuma todo o
            // espaço restante após o header sticky com `flex-1`.
            className="hidden h-full max-h-full w-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-3 shadow-hero backdrop-blur lg:flex xl:p-4"
            // 4 colunas + scroll vertical interno: pedido do usuário para
            // que a 5ª linha de miniaturas não fique colada no rodapé. O
            // grid abaixo abandona `grid-rows-6` fixo e usa altura
            // automática + `overflow-y-auto` no wrapper, com padding-bottom
            // extra para a última linha respirar antes da paleta de cores.
          >
            {/*
              Header sticky do aside ("Páginas / Escolha uma das N").

              Por que `bg-card` opaco (sem `/95`) + margens negativas
              maiores em lg+ (`lg:-mx-3 lg:-mt-3`)?
              - O aside tem `lg:p-3` (12px de padding). Se o header
                sticky usar fundo semi-transparente OU não cobrir o
                padding até a borda, ao rolar para cima as miniaturas
                aparecem "vazando" por trás do header (faixa branca
                visível acima do título). Tornar o fundo 100% opaco e
                estender as margens negativas para alcançar a borda do
                aside elimina o vazamento sem alterar o layout interno.
              - Mantemos `backdrop-blur` apenas como fallback caso
                `--card` venha com alpha em algum tema futuro.
            */}
            {/*
              Margens negativas atualizadas para `-mx-4 -mt-4` em lg+
              porque o aside passou a usar `lg:p-4`. Mantém o header
              sticky cobrindo TODO o padding interno até a borda do
              aside, evitando vazamento de miniaturas por trás dele
              ao rolar para cima.
            */}
            {/*
              Header agora não-sticky (aside passou para `flex flex-col`
              + `overflow-hidden`). Sem scroll, o sticky vira ruído. As
              margens negativas continuam para a faixa cobrir até a
              borda do aside (visual integrado ao card).
            */}
            <div className="-mx-3 -mt-3 mb-2 hidden border-b border-border/80 bg-card px-3 py-2.5 lg:block xl:-mx-4 xl:-mt-4 xl:px-4 xl:py-3">
              <p className="font-display text-sm font-extrabold text-foreground xl:text-base">
                {t("pages")}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground xl:text-xs">
                {t("chooseOneOf", { total: totalPages })}
              </p>
            </div>
            {/*
              Grid 4 colunas desktop com SCROLL vertical interno. Pedido
              do usuário: reduzir de 5 para 4 colunas (miniaturas maiores
              e mais legíveis) e adicionar barra de rolagem para que a
              última linha visível não fique grudada na barra de cores
              do rodapé.
              - `flex-1 min-h-0 overflow-y-auto` no wrapper rolável.
              - `auto-rows-[minmax(0,1fr)]` mantém células com proporção
                consistente; o número de linhas é livre.
              - `pb-3` extra na grid garante respiro abaixo da última
                linha antes do final da área rolável.
            */}
            <div className="premium-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <div
                role="tablist"
                aria-label={t("pages")}
                aria-orientation="horizontal"
                className="grid grid-cols-5 gap-2 p-1 pb-6"
              >
                {thumbnailSvgs.map((thumbSvg, index) => (
                  <button
                    key={`${index}-${pageSvgs[index]?.length ?? 0}`}
                    ref={(node) => {
                      thumbnailButtonRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => onSelectPage?.(index)}
                    onKeyDown={(event) => handleThumbnailKeyDown(event, index)}
                    role="tab"
                    aria-current={index === pageIndex ? "page" : undefined}
                    aria-selected={index === pageIndex}
                    tabIndex={index === pageIndex ? 0 : -1}
                    aria-label={`${t("openPage", { page: index + 1 })} — ${thumbnailProgress[index] ?? 0}%`}
                    // a11y/toque para crianças:
                    //  - `min-h-[44px]` + `min-w-[44px]` garante alvo de toque
                    //    confortável (WCAG 2.5.5) mesmo na grade ≥lg de 5 col.
                    //  - `focus-visible` com ring de 3px e offset de 2px
                    //    aparece só com teclado, sem poluir o estado normal.
                    //  - `active:scale-[0.94]` dá feedback tátil claro de
                    //    pressão (mais forte que cards adultos: crianças
                    //    confirmam o toque visualmente).
                    //  - `touch-manipulation` elimina o delay de 300ms.
                    // Larguras por breakpoint:
                    //  - mobile (`w-[72px]`): mantém 5 thumbs visíveis sem
                    //    apertar; antes (`w-20` = 80px) sobrava só 4 em
                    //    telas estreitas.
                    //  - sm (`sm:w-[88px]`): tablets pequenos (740-1023);
                    //    proporção igual ao desktop para o aside ficar
                    //    visualmente consistente quando o usuário gira.
                    //  - lg+ (`lg:w-auto`): célula do grid manda; o
                    //    `min-w-[44px]` é só o piso de toque.
                    className={`group relative flex aspect-square w-full min-h-[44px] min-w-[44px] flex-col touch-manipulation overflow-hidden rounded-xl border bg-white p-0 outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-soft active:scale-[0.94] active:shadow-soft focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                      index === pageIndex
                        ? "border-primary shadow-glow-gold ring-2 ring-primary/45"
                        : "border-border/80 hover:ring-2 hover:ring-primary/20"
                    }`}
                  >
                    {/*
                  Área da imagem: `flex-1 min-h-0` consome todo o espaço
                  vertical restante após label + barra de progresso. NÃO
                  usa mais `aspect-square` fixo — em telas baixas isso
                  forçava altura > linha disponível e a 6ª linha era
                  cortada. O SVG interno é redimensionado via `h-full
                  w-full` mantendo o framing.
                */}
                    <span className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-[10px] bg-white">
                      <span
                        className="block h-full w-full [&>svg]:h-[170%] [&>svg]:w-[170%] [&>svg]:-translate-x-[20%] [&>svg]:-translate-y-[20%]"
                        dangerouslySetInnerHTML={{ __html: thumbSvg }}
                      />
                      {thumbnailProgress[index] === 100 && (
                        <span className="absolute right-1 top-1 rounded-full bg-mint px-1 py-0.5 text-[7px] font-extrabold text-mint-foreground shadow-soft">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="flex h-3 shrink-0 items-center justify-between gap-1 px-1">
                      <span className="font-display text-[9px] font-extrabold leading-none text-foreground">
                        {index + 1}
                      </span>
                      <span
                        className={`font-display text-[8px] font-extrabold leading-none ${
                          thumbnailProgress[index] === 100 ? "text-mint" : "text-muted-foreground"
                        }`}
                      >
                        {thumbnailProgress[index] ?? 0}%
                      </span>
                    </span>
                    <span className="block h-0.5 w-full shrink-0 overflow-hidden rounded-b-[10px] bg-muted">
                      <span
                        className={`block h-full transition-[width] duration-300 ${
                          thumbnailProgress[index] === 100 ? "bg-mint" : "bg-primary"
                        }`}
                        style={{ width: `${thumbnailProgress[index] ?? 0}%` }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
          {/*
            Botões de scroll do aside (apenas desktop). No mobile a grid
            paginada acima já oferece navegação ◀ • • • ▶, então os
            chevrons horizontais foram removidos para não duplicar UI.
          */}
          {pageListOverflow.axis === "y" && (
            <>
              <button
                type="button"
                onClick={() => scrollPageList("start")}
                aria-label={t("previousPage")}
                aria-disabled={!pageListOverflow.canScrollStart}
                tabIndex={pageListOverflow.canScrollStart ? 0 : -1}
                className={`absolute right-2 top-2 z-20 hidden h-10 w-10 place-items-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-hero backdrop-blur transition-opacity duration-150 hover:bg-primary hover:text-primary-foreground lg:grid ${
                  pageListOverflow.canScrollStart ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <ChevronUp className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollPageList("end")}
                aria-label={t("nextPage")}
                aria-disabled={!pageListOverflow.canScrollEnd}
                tabIndex={pageListOverflow.canScrollEnd ? 0 : -1}
                className={`absolute bottom-2 right-2 z-20 hidden h-10 w-10 place-items-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-hero backdrop-blur transition-opacity duration-150 hover:bg-primary hover:text-primary-foreground lg:grid ${
                  pageListOverflow.canScrollEnd ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onPrev}
        disabled={pageIndex === 0}
        aria-label={t("previousPage")}
        title={t("previousPage")}
        className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:bg-gold hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-35 lg:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <div
        ref={setRefs}
        data-testid="coloring-canvas-wrapper"
        data-validation-total={validation.totalValid}
        data-validation-painted={validation.painted}
        data-validation-missing={validation.missingIds.length}
        data-validation-invalid={validation.invalidPaintedIds.length}
        data-validation-ok={validation.ok ? "true" : "false"}
        className="relative aspect-square w-full max-w-[calc(100vw-1.5rem)] touch-none select-none overflow-hidden rounded-2xl bg-white shadow-soft sm:h-[min(74vh,calc(100vw-7rem))] sm:w-auto sm:max-w-full md:h-[min(78vh,calc(100vw-8rem),calc(100dvh-14rem))] lg:h-[min(78vh,calc(100vw-14rem),calc(100dvh-15rem))] xl:h-[min(78vh,48rem,calc(100dvh-15rem))] md:[&_svg]:[clip-path:inset(2px_0_2px_0)] [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      >
        <div
          className="h-full w-full origin-center"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transition: isGesturingRef.current ? "none" : "transform 120ms ease-out",
            willChange: "transform",
            // Esconde o conteúdo durante a transição de página quando
            // havia zoom — assim qualquer frame intermediário com pan
            // herdado fica oculto atrás do skeleton, e o canvas só
            // reaparece já centralizado e ajustado.
            visibility: isPageTransitioning ? "hidden" : "visible",
          }}
          dangerouslySetInnerHTML={{ __html: renderedSvg }}
          aria-hidden={isPageTransitioning}
        />
        {isPageTransitioning && (
          <div
            data-testid="coloring-canvas-skeleton"
            aria-hidden="true"
            className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-2xl bg-white"
          >
            {/* Brilho varrendo de borda a borda — feedback "carregando"
                discreto, sem bloquear interação real (a troca dura
                ~1-2 frames; o skeleton só evita o salto visual). */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-muted/60 to-transparent" />
            <div className="relative h-2/3 w-2/3 rounded-2xl bg-muted/40" />
          </div>
        )}
        {/*
          Controles de zoom — pílula flutuante no canto superior direito do
          canvas. Tamanhos generosos para alvo de toque (≥40px). Botão
          "ajustar" só aparece quando há zoom aplicado.
        */}
        <div
          data-coloring-controls
          className="pointer-events-none absolute right-2 top-2 z-30 flex flex-col gap-1.5 sm:right-3 sm:top-3"
        >
          <div className="pointer-events-auto flex flex-col items-center overflow-hidden rounded-full border border-border/80 bg-card/95 shadow-elevated backdrop-blur">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                adjustZoom(0.6);
              }}
              disabled={zoom >= MAX_ZOOM - 0.01}
              aria-label="Aumentar zoom"
              title="Aumentar zoom"
              className="grid h-10 w-10 place-items-center text-foreground transition hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
            <span className="h-px w-7 bg-border/80" aria-hidden="true" />
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                adjustZoom(-0.6);
              }}
              disabled={zoom <= MIN_ZOOM + 0.01}
              aria-label="Diminuir zoom"
              title="Diminuir zoom"
              className="grid h-10 w-10 place-items-center text-foreground transition hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />
            </button>
          </div>
          {zoom > 1.01 && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              aria-label={`Ajustar à tela (zoom atual ${Math.round(zoom * 100)}%)`}
              title="Ajustar à tela"
              className="pointer-events-auto flex h-10 min-w-[2.5rem] items-center justify-center gap-1 rounded-full border border-border/80 bg-card/95 px-2 text-[11px] font-semibold text-foreground shadow-elevated backdrop-blur transition hover:bg-primary hover:text-primary-foreground active:scale-95"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              <span aria-hidden="true">{Math.round(zoom * 100)}%</span>
            </button>
          )}
        </div>
      </div>
      {showMissingHint && (
        <div className="absolute bottom-4 left-1/2 z-30 flex w-[min(20rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col items-stretch gap-2 sm:bottom-6">
          {/*
            CTA principal: ao tocar, alterna o checklist E destaca tudo
            que ainda falta no SVG — combinação que tornou explícito
            "exatamente o que falta" sem esconder a animação que crianças
            já reconheciam.
          */}
          <button
            type="button"
            data-testid="show-missing-cta"
            onClick={() => {
              setMissingChecklistOpen((open) => !open);
              highlightMissing();
            }}
            aria-expanded={missingChecklistOpen}
            aria-controls="missing-checklist-panel"
            aria-label={t("missingHighlightHint")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-card/95 px-4 py-2.5 font-display text-xs font-extrabold text-foreground shadow-elevated ring-2 ring-gold/60 backdrop-blur transition-transform duration-200 hover:scale-[1.02] active:scale-95 sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm"
          >
            <Search className="h-4 w-4 text-gold sm:h-4.5 sm:w-4.5" aria-hidden="true" />
            <span>
              {missingCount === 1
                ? t("missingAreasOne")
                : t("missingAreasMany", { n: missingCount })}
            </span>
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-extrabold text-foreground sm:text-xs">
              {t("showMissing")}
            </span>
          </button>

          {/*
            "Já terminei" — atalho de auto-conclusão. Aparece JUNTO do
            CTA "Mostrar o que falta" para a criança escolher: ou ela
            procura o que ainda precisa pintar, ou ela declara que já
            terminou. Pinta as regiões faltantes com a cor ativa e dispara
            o modal de conclusão. Só aparece a partir de 70% para evitar
            que a criança pule a maior parte do desenho.
          */}
          {onForceComplete && currentPagePercent >= 70 && (
            <button
              type="button"
              data-testid="force-complete-cta"
              onClick={onForceComplete}
              aria-label={t("alreadyDoneHint")}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-mint px-4 py-2.5 font-display text-xs font-extrabold text-mint-foreground shadow-elevated ring-2 ring-mint/40 transition-transform duration-200 hover:scale-[1.02] active:scale-95 sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm"
            >
              <Check className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden="true" />
              <span>{t("alreadyDone")}</span>
            </button>
          )}

          {missingChecklistOpen && (
            <ul
              id="missing-checklist-panel"
              data-testid="missing-checklist"
              role="list"
              aria-label={t("missingHighlightHint")}
              className="flex flex-col gap-1.5 rounded-2xl border border-border/80 bg-card/98 p-2.5 shadow-hero backdrop-blur sm:p-3"
            >
              {missingChecklistVisible.map((item) => (
                <li key={item.key}>
                  {/*
                    Cada item é um botão — toca para destacar SOMENTE
                    aquele grupo no canvas (ex.: só as flores). Atalho
                    útil quando vários grupos faltam e a criança quer
                    achar um específico.
                  */}
                  <button
                    type="button"
                    data-testid={`missing-item-${item.key}`}
                    onClick={() => highlightMissing(item.ids)}
                    className="flex w-full items-center gap-2 rounded-xl bg-muted/60 px-2.5 py-1.5 text-left font-display text-xs font-extrabold text-foreground transition-colors duration-150 hover:bg-gold/20 active:scale-[0.98] sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm"
                  >
                    <span aria-hidden="true" className="text-base sm:text-lg">
                      {item.emoji}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.count > 1 && (
                      <span className="rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-extrabold text-foreground sm:text-xs">
                        ×{item.count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {missingChecklistOverflow > 0 && (
                <li className="px-1 pt-0.5 text-center font-display text-[10px] font-bold text-muted-foreground sm:text-xs">
                  +{missingChecklistOverflow}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {isCurrentPageComplete && (
        <>
          {/* Badge passivo (canto superior) — confirma o estado 100% */}
          <div
            // role=status para que leitores de tela anunciem a conclusão.
            // `aria-live=polite` evita interrupção do que já estiver sendo lido.
            role="status"
            aria-live="polite"
            data-testid="page-completed-badge"
            className="page-completed-badge pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 font-display text-sm font-extrabold text-mint-foreground shadow-elevated sm:top-5 sm:gap-2 sm:px-4 sm:py-2 sm:text-base"
          >
            <span aria-hidden="true">✓</span>
            <span>{t("done")}</span>
            <span className="text-xs font-bold opacity-80 sm:text-sm">100%</span>
          </div>
          {/*
            CTA grande "Verificar pintura" — sobreposto ao canvas, visível
            sempre que a página chega a 100%. Por que existir, se há um
            modal automático?
              • Resolve o caso em que a criança fechou o modal sem querer
                ou pintou rápido o suficiente para o autosave/celebração
                não terem disparado o modal ainda;
              • dá controle explícito ("acabei!") — gesto natural para
                crianças, que adoram um botão de "confirmar";
              • acessível a leitores de tela (botão semântico com label).
            Aparece como pílula colorida, com micro animação de pulso para
            chamar atenção sem ser invasivo.
          */}
          {onVerifyComplete && (
            <button
              type="button"
              data-testid="verify-painting-cta"
              onClick={onVerifyComplete}
              aria-label={t("checkPaintingHint")}
              className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-warm px-5 py-3 font-display text-sm font-extrabold text-primary-foreground shadow-hero ring-2 ring-white/40 transition-transform duration-200 hover:scale-105 active:scale-95 sm:bottom-6 sm:gap-2.5 sm:px-6 sm:py-3.5 sm:text-base animate-bounce"
              style={{ animationDuration: "1.6s" }}
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              <span>{t("checkPainting")}</span>
            </button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={pageIndex >= totalPages - 1}
        aria-label={t("nextPage")}
        title={t("nextPage")}
        className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:bg-gold hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-35 lg:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* +1 floaters */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {floaters.map((f) => (
          <span
            key={f.id}
            aria-hidden="true"
            style={{ left: f.x, top: f.y }}
            className="paint-plus-one absolute select-none whitespace-nowrap rounded-full bg-gradient-to-br from-coral to-gold px-2.5 py-0.5 font-display text-sm font-extrabold text-white shadow-soft"
          >
            +1
          </span>
        ))}
      </div>

      {showSuggestion && (
        <aside
          role="dialog"
          aria-label={t("colorSuggestion")}
          className="pointer-events-auto absolute right-3 top-3 z-10 w-36 overflow-hidden rounded-2xl border-2 border-gold bg-card shadow-hero sm:right-6 sm:top-6 sm:w-48 md:w-56"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border bg-gold/20 px-3 py-1.5">
            <span className="flex items-center gap-1.5 font-display text-xs font-bold text-foreground sm:text-sm">
              <Lightbulb className="h-3.5 w-3.5 fill-gold text-gold" />
              {t("suggestion")}
            </span>
            <button
              type="button"
              onClick={onCloseSuggestion}
              aria-label={t("closeSuggestion")}
              title={t("closeSuggestion")}
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-card"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>
          <div
            className="aspect-square w-full bg-white [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: previewSvg }}
          />
          <p className="px-2 pb-2 pt-1 text-center text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
            Use como referência ✨
          </p>
        </aside>
      )}
    </div>
  );
});
