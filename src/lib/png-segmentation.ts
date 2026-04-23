/**
 * Pre-segmentação de PNG line art para o motor de pintura canvas.
 *
 * Recebe uma PNG preto-sobre-branco (line art estilo Pixar/livro de colorir),
 * detecta cada região fechada (área branca cercada por preto) e devolve:
 *   - um Uint32Array `regionMap` do mesmo tamanho da imagem, onde cada pixel
 *     guarda o ID numérico da região a que pertence (0 = traço/borda preta);
 *   - uma lista `regions` com bounding box, centroide e tamanho de cada região.
 *
 * O algoritmo é um flood fill scanline em 4 conexões varrendo todos os pixels
 * brancos, agrupando-os em regiões. Pixels considerados "linha preta" são os
 * que têm luminância < THRESHOLD (configurável). O resultado é cacheado em
 * memória e em IndexedDB pelo hash da URL — análise inicial leva ~500-1500ms
 * em uma PNG 1024×1024, depois é instantâneo.
 */

const DEFAULT_THRESHOLD = 128; // pixels mais escuros que isso = linha
const MIN_REGION_PIXELS = 80; // áreas menores que isso são absorvidas pela maior vizinha

export interface PngRegion {
  id: number;
  /** ID textual estável usado no `fills: Record<string, string>` global */
  fillId: string;
  /** bounding box em coordenadas de pixel da imagem original */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** centroide (média geométrica de todos os pixels) — usado para color picker */
  centroidX: number;
  centroidY: number;
  /** quantidade de pixels que pertencem a esta região */
  size: number;
  /** Caminho SVG vetorizado (em coordenadas 600x600) representando o contorno
   *  exato desta região via marching squares. Permite que o `<ColoringCanvas>`
   *  trate cada região como um `<path>` SVG normal e pinte respeitando a
   *  silhueta real do desenho. */
  svgPath: string;
}

export interface PngSegmentation {
  width: number;
  height: number;
  /** length = width * height; valor 0 = traço preto, 1..N = ID da região */
  regionMap: Uint32Array;
  regions: PngRegion[];
  /** mapeia fillId estável → índice na regionMap */
  fillIdToRegion: Map<string, PngRegion>;
}

/**
 * Carrega uma imagem PNG e devolve o ImageData (RGBA) em tamanho original.
 */
async function loadImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Canvas 2D não disponível"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error(`Falha ao carregar PNG: ${url}`));
    img.src = url;
  });
}

/**
 * Marca cada pixel como linha (0) ou candidato a região (1).
 * Considera o canal alfa: pixels transparentes contam como brancos.
 */
function buildBinaryMask(image: ImageData, threshold: number): Uint8Array {
  const { data, width, height } = image;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]!;
    const g = data[i * 4 + 1]!;
    const b = data[i * 4 + 2]!;
    const a = data[i * 4 + 3]!;
    if (a < 64) {
      mask[i] = 1; // transparente conta como pintável
      continue;
    }
    // luminância perceptual
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    mask[i] = lum < threshold ? 0 : 1;
  }
  return mask;
}

/**
 * Flood fill scanline 4-conexão. Marca todos os pixels brancos conectados
 * a partir de (sx, sy) com `regionId` no `regionMap`. Devolve estatísticas
 * para alimentar o `PngRegion`.
 */
function floodFillScanline(
  mask: Uint8Array,
  regionMap: Uint32Array,
  width: number,
  height: number,
  sx: number,
  sy: number,
  regionId: number,
): Omit<PngRegion, "id" | "fillId" | "svgPath"> {
  let minX = sx;
  let minY = sy;
  let maxX = sx;
  let maxY = sy;
  let size = 0;
  let sumX = 0;
  let sumY = 0;

  // Stack de scanlines: cada entrada é (x, y) — fazemos varredura
  // horizontal e empurramos linhas acima/abaixo.
  const stack: number[] = [sx, sy];

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (y < 0 || y >= height) continue;

    // Acha extremidade esquerda da run.
    let lx = x;
    while (lx >= 0 && mask[y * width + lx] === 1 && regionMap[y * width + lx] === 0) {
      lx--;
    }
    lx++;

    let spanAbove = false;
    let spanBelow = false;

    // Pinta da esquerda pra direita até encontrar borda.
    for (let cx = lx; cx < width; cx++) {
      const idx = y * width + cx;
      if (mask[idx] !== 1 || regionMap[idx] !== 0) break;

      regionMap[idx] = regionId;
      size++;
      sumX += cx;
      sumY += y;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // Empilha pixel acima quando muda de "fora→dentro".
      if (y > 0) {
        const upIdx = (y - 1) * width + cx;
        const isPaintable = mask[upIdx] === 1 && regionMap[upIdx] === 0;
        if (!spanAbove && isPaintable) {
          stack.push(cx, y - 1);
          spanAbove = true;
        } else if (spanAbove && !isPaintable) {
          spanAbove = false;
        }
      }
      if (y < height - 1) {
        const dnIdx = (y + 1) * width + cx;
        const isPaintable = mask[dnIdx] === 1 && regionMap[dnIdx] === 0;
        if (!spanBelow && isPaintable) {
          stack.push(cx, y + 1);
          spanBelow = true;
        } else if (spanBelow && !isPaintable) {
          spanBelow = false;
        }
      }
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    size,
    centroidX: size > 0 ? Math.round(sumX / size) : sx,
    centroidY: size > 0 ? Math.round(sumY / size) : sy,
  };
}

/**
 * Vetoriza UMA região do `regionMap` em um path SVG fechado, em coordenadas
 * 600×600. Algoritmo: traça o contorno externo da região seguindo as bordas
 * de pixel (pixel border tracing — Moore neighborhood), depois simplifica
 * removendo pontos colineares. Resultado: um `<path>` que cobre exatamente
 * os mesmos pixels da região no PNG original.
 *
 * Retorna `""` se a região é inválida (sem pixels).
 */
function vectorizeRegion(
  regionMap: Uint32Array,
  width: number,
  height: number,
  regionId: number,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  scaleX: number,
  scaleY: number,
): string {
  // Encontra um pixel de borda do canto superior-esquerdo do bbox.
  // Pra isso varremos linha a linha e paramos no primeiro pixel da região
  // que tem um vizinho fora dela (ou está na borda do canvas).
  let startX = -1;
  let startY = -1;
  outer: for (let y = bbox.minY; y <= bbox.maxY; y++) {
    for (let x = bbox.minX; x <= bbox.maxX; x++) {
      if (regionMap[y * width + x] === regionId) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return "";

  // Pixel border tracing usando 8-direções (Moore neighborhood).
  // Cada "ponto" do contorno é um VÉRTICE de pixel (não centro), então as
  // coordenadas são as bordas do quadrado do pixel: (x, y) é o canto
  // superior-esquerdo do pixel (x, y).
  // Usamos uma variação do algoritmo de Square Tracing que percorre
  // exatamente as arestas externas dos pixels.
  const isInside = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return regionMap[y * width + x] === regionId;
  };

  // Square tracing: começamos a "andar" pelas bordas dos pixels da região.
  // Direções: 0=direita, 1=baixo, 2=esquerda, 3=cima.
  // Estado: estamos numa CÉLULA de pixel olhando pra uma direção; queremos
  // que o pixel à nossa esquerda esteja DENTRO e o pixel à direita FORA.
  const path: Array<[number, number]> = [];
  const px = startX;
  const py = startY;
  // O ponto inicial é o canto superior-esquerdo do pixel (startX, startY).
  // Começamos andando pra direita ao longo da aresta superior do pixel.
  let cx = px;
  let cy = py;
  let dir = 0; // direita
  const maxIter = (bbox.maxX - bbox.minX + 1) * (bbox.maxY - bbox.minY + 1) * 8 + 100;
  let iter = 0;

  // Os deltas de movimento por direção
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];

  // Para cada vértice atual, verificamos os 2 pixels relevantes para
  // decidir a próxima direção:
  // - pixel "à frente-esquerda" e "à frente-direita" relativamente à direção.
  // Se ambos dentro: vira pra esquerda; se só esquerda dentro: continua reto;
  // se nenhum: vira pra direita; se só direita: caso impossível normalmente.
  // Mais simples: testamos quais dos 4 pixels ao redor do vértice (cx, cy)
  // pertencem à região. O contorno faz o "circuito" dessas células.
  const pixelAt = (vx: number, vy: number, q: 0 | 1 | 2 | 3): boolean => {
    // q indica qual dos 4 pixels adjacentes ao vértice (vx, vy) testar:
    // 0 = NW (vx-1, vy-1), 1 = NE (vx, vy-1), 2 = SE (vx, vy), 3 = SW (vx-1, vy)
    if (q === 0) return isInside(vx - 1, vy - 1);
    if (q === 1) return isInside(vx, vy - 1);
    if (q === 2) return isInside(vx, vy);
    return isInside(vx - 1, vy);
  };

  path.push([cx, cy]);

  while (iter++ < maxIter) {
    cx += dx[dir]!;
    cy += dy[dir]!;

    // Determina pra onde o contorno deve seguir baseado nos 4 pixels ao
    // redor do vértice atual (cx, cy).
    // Mapeamento dos 16 casos do "marching squares":
    // bits: NW NE SE SW (1=dentro, 0=fora)
    const nw = pixelAt(cx, cy, 0) ? 1 : 0;
    const ne = pixelAt(cx, cy, 1) ? 1 : 0;
    const se = pixelAt(cx, cy, 2) ? 1 : 0;
    const sw = pixelAt(cx, cy, 3) ? 1 : 0;
    const code = (nw << 3) | (ne << 2) | (se << 1) | sw;

    // Tabela de marching squares — qual direção seguir baseado no code
    // e na direção anterior.
    let nextDir = dir;
    switch (code) {
      case 1:
        nextDir = 2;
        break; // SW
      case 2:
        nextDir = 1;
        break; // SE
      case 3:
        nextDir = 2;
        break; // SW+SE
      case 4:
        nextDir = 0;
        break; // NE
      case 5:
        nextDir = dir === 1 ? 2 : 0;
        break; // NE+SW (saddle)
      case 6:
        nextDir = 1;
        break; // NE+SE
      case 7:
        nextDir = 2;
        break; // NE+SE+SW
      case 8:
        nextDir = 3;
        break; // NW
      case 9:
        nextDir = 3;
        break; // NW+SW
      case 10:
        nextDir = dir === 0 ? 3 : 1;
        break; // NW+SE (saddle)
      case 11:
        nextDir = 3;
        break; // NW+SW+SE
      case 12:
        nextDir = 0;
        break; // NW+NE
      case 13:
        nextDir = 0;
        break; // NW+NE+SW
      case 14:
        nextDir = 1;
        break; // NW+NE+SE
      default:
        nextDir = dir; // 0 e 15 não devem acontecer no contorno
    }

    if (cx === px && cy === py && path.length > 2) {
      break;
    }

    // Só adicionamos ponto quando há mudança de direção (simplificação).
    if (nextDir !== dir) {
      path.push([cx, cy]);
      dir = nextDir;
    } else if (path.length === 1) {
      // Garante que o segundo ponto fique para mantermos a direção.
      path.push([cx, cy]);
    }
  }

  if (path.length < 3) return "";

  // Converte pra coordenadas SVG 600×600.
  const points = path.map(([x, y]) => {
    const sx = (x * scaleX).toFixed(2);
    const sy = (y * scaleY).toFixed(2);
    return `${sx},${sy}`;
  });
  return `M${points.join(" L")} Z`;
}

/**
 * Faz a segmentação completa de uma PNG. Retorna mapa + lista de regiões.
 * Filtra regiões muito pequenas (< MIN_REGION_PIXELS) para evitar ruído de
 * compressão JPEG/PNG (anti-aliasing entre traço e branco).
 */
export function segmentImage(
  image: ImageData,
  options: { threshold?: number; minRegionPixels?: number } = {},
): PngSegmentation {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const minPixels = options.minRegionPixels ?? MIN_REGION_PIXELS;
  const { width, height } = image;

  const mask = buildBinaryMask(image, threshold);
  const regionMap = new Uint32Array(width * height);

  type RawRegion = {
    id: number;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    centroidX: number;
    centroidY: number;
    size: number;
  };
  const rawRegions: RawRegion[] = [];
  let nextId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] !== 1 || regionMap[idx] !== 0) continue;
      const stats = floodFillScanline(mask, regionMap, width, height, x, y, nextId);
      if (stats.size >= minPixels) {
        rawRegions.push({
          id: nextId,
          bbox: { minX: stats.minX, minY: stats.minY, maxX: stats.maxX, maxY: stats.maxY },
          centroidX: stats.centroidX,
          centroidY: stats.centroidY,
          size: stats.size,
        });
        nextId++;
      } else {
        // Apaga regiões minúsculas do mapa.
        for (let yy = stats.minY; yy <= stats.maxY; yy++) {
          for (let xx = stats.minX; xx <= stats.maxX; xx++) {
            const i = yy * width + xx;
            if (regionMap[i] === nextId) regionMap[i] = 0;
          }
        }
      }
    }
  }

  // Vetoriza cada região agora que o regionMap está completo.
  const scaleX = 600 / width;
  const scaleY = 600 / height;
  const regions: PngRegion[] = [];
  for (const raw of rawRegions) {
    const svgPath = vectorizeRegion(regionMap, width, height, raw.id, raw.bbox, scaleX, scaleY);
    if (!svgPath) continue;
    regions.push({
      id: raw.id,
      fillId: `fill-png-${raw.id}`,
      minX: raw.bbox.minX,
      minY: raw.bbox.minY,
      maxX: raw.bbox.maxX,
      maxY: raw.bbox.maxY,
      centroidX: raw.centroidX,
      centroidY: raw.centroidY,
      size: raw.size,
      svgPath,
    });
  }

  const fillIdToRegion = new Map<string, PngRegion>();
  for (const r of regions) fillIdToRegion.set(r.fillId, r);

  return { width, height, regionMap, regions, fillIdToRegion };
}

// ─── Cache em memória + IndexedDB ───────────────────────────────────
const memoryCache = new Map<string, PngSegmentation>();

function dbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const req = indexedDB.open("rk-png-seg", 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("seg")) {
        req.result.createObjectStore("seg");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface SerializedSegmentation {
  width: number;
  height: number;
  regionMap: ArrayBuffer;
  regions: PngRegion[];
}

async function dbGet(key: string): Promise<SerializedSegmentation | null> {
  try {
    const db = await dbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("seg", "readonly");
      const req = tx.objectStore("seg").get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function dbPut(key: string, value: SerializedSegmentation): Promise<void> {
  try {
    const db = await dbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("seg", "readwrite");
      tx.objectStore("seg").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* falha silenciosa — cache é otimização, não correção */
  }
}

function reviveSegmentation(s: SerializedSegmentation): PngSegmentation {
  const regionMap = new Uint32Array(s.regionMap);
  const fillIdToRegion = new Map<string, PngRegion>();
  for (const r of s.regions) fillIdToRegion.set(r.fillId, r);
  return { width: s.width, height: s.height, regionMap, regions: s.regions, fillIdToRegion };
}

/**
 * Wrapper que carrega + segmenta + cacheia. Use isto no app — não chame
 * `segmentImage` direto a menos que já tenha o `ImageData`.
 */
export async function getSegmentationForUrl(url: string): Promise<PngSegmentation> {
  const cached = memoryCache.get(url);
  if (cached) return cached;

  const cacheKey = `v3:${url}`;
  const persisted = await dbGet(cacheKey);
  if (persisted) {
    const seg = reviveSegmentation(persisted);
    memoryCache.set(url, seg);
    return seg;
  }

  const image = await loadImageData(url);
  const seg = segmentImage(image);
  memoryCache.set(url, seg);
  void dbPut(cacheKey, {
    width: seg.width,
    height: seg.height,
    regionMap: seg.regionMap.buffer.slice(0) as ArrayBuffer,
    regions: seg.regions,
  });
  return seg;
}

/**
 * Constrói o SVG FINAL para uma página PNG line art:
 *   - <image> com a PNG original como background visual (linhas pretas);
 *   - um <path> por região detectada com `id="fill-png-N"`,
 *     `data-paintable="true"` e `fill="#FFFFFF"` (transparente sobre o
 *     branco do PNG até o usuário pintar);
 *   - `mix-blend-mode: multiply` no grupo de paths para que as cores
 *     pintadas pareçam por baixo das linhas pretas (visual livro de
 *     colorir profissional).
 *
 * O SVG resultante é totalmente compatível com o `<ColoringCanvas>`
 * existente: ele detecta paths `[id^="fill-"]`, aplica fills e dispara
 * eventos da mesma forma. Zero adaptação necessária no resto do app.
 */
export function buildPaintableSvgFromSegmentation(seg: PngSegmentation, pngUrl: string): string {
  const paths = seg.regions
    .map(
      (r) =>
        `<path id="${r.fillId}" d="${r.svgPath}" fill="#FFFFFF" data-paintable="true" stroke="none" />`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <g style="mix-blend-mode: normal">${paths}</g>
    <image href="${pngUrl}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid meet" pointer-events="none" style="mix-blend-mode: multiply" />
  </svg>`;
}

/**
 * @deprecated Use `buildPaintableSvgFromSegmentation` em vez disso.
 * Mantido por compatibilidade com `coloring-canvas-png.tsx` (não usado
 * em produção atualmente).
 */
export function buildPhantomSvgFromSegmentation(seg: PngSegmentation): string {
  const rects = seg.regions
    .map((r) => {
      const sx = 600 / seg.width;
      const sy = 600 / seg.height;
      const x = Math.round(r.minX * sx);
      const y = Math.round(r.minY * sy);
      const w = Math.max(1, Math.round((r.maxX - r.minX + 1) * sx));
      const h = Math.max(1, Math.round((r.maxY - r.minY + 1) * sy));
      return `<rect id="${r.fillId}" x="${x}" y="${y}" width="${w}" height="${h}" fill="white" data-paintable="true" pointer-events="none" />`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">${rects}</svg>`;
}
