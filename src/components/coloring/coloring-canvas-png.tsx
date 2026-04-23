/**
 * Motor de pintura para páginas PNG line art (estilo Pixar gerado por IA).
 *
 * Pipeline:
 *   1. Carrega a PNG e calcula a segmentação (cache em IndexedDB).
 *   2. Renderiza a PNG num <canvas> base + um <canvas> de overlay onde
 *      ficam as cores aplicadas pelo usuário.
 *   3. Em cada toque/clique, descobre o fillId da região via `regionMap`
 *      e pinta TODOS os pixels daquela região com a cor selecionada.
 *   4. Emite `onFill(fillId)` para o `useColoringState` registrar o fill
 *      no `Record<string, string>` global — assim autosave, miniaturas,
 *      progresso, badge "Concluída" etc. continuam funcionando 100%.
 *   5. Ao montar (ou quando `fills` mudar de fora), restaura visualmente
 *      todas as regiões já pintadas.
 *
 * IMPORTANTE: este componente é uma alternativa ao `<ColoringCanvas>`
 * tradicional (que pinta SVGs). Ele recebe os mesmos props essenciais
 * (`fills`, `onFill`, `pageIndex`...) e roda dentro do mesmo `<main>` que
 * o motor SVG, então o restante da tela (header, paleta, miniaturas)
 * continua o mesmo. O roteador em `colorir.$slug.tsx` escolhe entre os
 * dois conforme o `kind` da página.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  buildPhantomSvgFromSegmentation,
  getSegmentationForUrl,
  type PngSegmentation,
} from "@/lib/png-segmentation";

export type ColoringCanvasPngProps = {
  /** URL da PNG line art (importada via Vite ou caminho público) */
  imageUrl: string;
  /** mapa de pintura atual: fillId → cor (mesmo shape do motor SVG) */
  fills: Record<string, string>;
  /** chamado quando o usuário pinta uma região */
  onFill: (fillId: string) => void;
  /** chamado quando o engine descobriu o SVG fantasma com IDs — o
   * consumidor (useColoringState) usa para alimentar `extractFillableRegionIds` */
  onSegmentationReady?: (phantomSvg: string, segmentation: PngSegmentation) => void;
  /** Cor "ERASER" (vinda do hook) — quando recebida, apaga a região clicada */
  eraserToken?: string;
  /** Cor ativa para preencher (apenas usada quando o usuário clica) */
  activeColor: string;
};

export function ColoringCanvasPng({
  imageUrl,
  fills,
  onFill,
  onSegmentationReady,
  eraserToken,
  activeColor,
}: ColoringCanvasPngProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const fillCanvasRef = useRef<HTMLCanvasElement>(null);
  const [segmentation, setSegmentation] = useState<PngSegmentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onSegReadyRef = useRef(onSegmentationReady);

  useEffect(() => {
    onSegReadyRef.current = onSegmentationReady;
  }, [onSegmentationReady]);

  // ─── Carrega PNG + segmentação ─────────────────────────────────────
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    setSegmentation(null);

    (async () => {
      try {
        const seg = await getSegmentationForUrl(imageUrl);
        if (canceled) return;
        setSegmentation(seg);
        const phantom = buildPhantomSvgFromSegmentation(seg);
        onSegReadyRef.current?.(phantom, seg);
      } catch (e) {
        if (canceled) return;
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [imageUrl]);

  // ─── Desenha PNG no canvas base ────────────────────────────────────
  useEffect(() => {
    if (!segmentation) return;
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    canvas.width = segmentation.width;
    canvas.height = segmentation.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [segmentation, imageUrl]);

  // ─── Pinta as regiões a partir do `fills` ──────────────────────────
  // Cada vez que `fills` mudar (ex: usuário clicou OU restauração ao abrir),
  // redesenhamos TODAS as regiões pintadas no canvas de overlay. Isso garante
  // consistência: o canvas é sempre derivado do estado, nunca acumula erros.
  useLayoutEffect(() => {
    if (!segmentation) return;
    const canvas = fillCanvasRef.current;
    if (!canvas) return;
    canvas.width = segmentation.width;
    canvas.height = segmentation.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.createImageData(segmentation.width, segmentation.height);
    const px = imgData.data;
    const rgbCache = new Map<number, [number, number, number]>();

    for (const region of segmentation.regions) {
      const color = fills[region.fillId];
      if (!color) continue;
      const [r, g, b] = parseColor(color, rgbCache);
      // Itera apenas no bounding box da região (muito mais rápido que varrer
      // a imagem inteira pra cada região).
      for (let y = region.minY; y <= region.maxY; y++) {
        for (let x = region.minX; x <= region.maxX; x++) {
          const idx = y * segmentation.width + x;
          if (segmentation.regionMap[idx] !== region.id) continue;
          const p = idx * 4;
          px[p] = r;
          px[p + 1] = g;
          px[p + 2] = b;
          px[p + 3] = 255;
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);
  }, [fills, segmentation]);

  // ─── Captura cliques/toques ────────────────────────────────────────
  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!segmentation) return;
    const canvas = fillCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) return;
    const x = Math.floor(xRatio * segmentation.width);
    const y = Math.floor(yRatio * segmentation.height);
    const regionId = segmentation.regionMap[y * segmentation.width + x];
    if (!regionId) return; // clicou em linha preta
    const region = segmentation.regions.find((r) => r.id === regionId);
    if (!region) return;
    onFill(region.fillId);
  };

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Não foi possível carregar a página: {error}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-white"
      onPointerDown={handlePointer}
      role="img"
      aria-label="Página de pintura"
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Preparando página…</p>
          <p className="text-xs text-muted-foreground">Detectando áreas pintáveis</p>
        </div>
      )}
      <div className="relative aspect-square w-full max-w-full" style={{ touchAction: "none" }}>
        {/* Canvas de pintura (atrás) */}
        <canvas
          ref={fillCanvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "auto" }}
        />
        {/* Canvas com line art (na frente, multiply para deixar tinta visível) */}
        <canvas
          ref={baseCanvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "auto", mixBlendMode: "multiply" }}
        />
      </div>
    </div>
  );
}

const COLOR_KEY_CACHE = new Map<string, number>();

function colorKey(color: string): number {
  const cached = COLOR_KEY_CACHE.get(color);
  if (cached !== undefined) return cached;
  const k = COLOR_KEY_CACHE.size + 1;
  COLOR_KEY_CACHE.set(color, k);
  return k;
}

function parseColor(
  color: string,
  cache: Map<number, [number, number, number]>,
): [number, number, number] {
  const k = colorKey(color);
  const cached = cache.get(k);
  if (cached) return cached;
  const rgb = hexOrCssToRgb(color);
  cache.set(k, rgb);
  return rgb;
}

function hexOrCssToRgb(input: string): [number, number, number] {
  const c = input.trim();
  // #RGB / #RRGGBB
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      return [r, g, b];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  // fallback via canvas: o browser resolve named colors, oklch(), etc.
  if (typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#000";
      ctx.fillStyle = c;
      const computed = ctx.fillStyle as string; // sempre #rrggbb
      if (computed.startsWith("#") && computed.length === 7) {
        return [
          parseInt(computed.slice(1, 3), 16),
          parseInt(computed.slice(3, 5), 16),
          parseInt(computed.slice(5, 7), 16),
        ];
      }
    }
  }
  return [0, 0, 0];
}

// Token "apagador" — mantemos o tipo aqui só pra documentar, mas o componente
// não precisa diferenciar: o consumidor (`useColoringState.applyFill`) já
// remove o fill do mapa quando a cor ativa é o token de borracha. O
// useLayoutEffect acima simplesmente não pinta regiões que não estão em `fills`.
export const PNG_ERASER_TOKEN_HINT = "ERASER";
