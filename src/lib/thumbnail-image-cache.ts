/**
 * Cache local de imagens (PNGs) usadas dentro das miniaturas (SVG `<image>`).
 *
 * Por que isto existe?
 *  - Cada miniatura é um SVG string com `<image href="/assets/.../page-NN.png">`
 *    embutido. Mesmo bundlando os PNGs via Vite, a cada visita o navegador
 *    decodifica novamente cada `<image>` (não é o blob bytes que custa, é o
 *    decode + raster). Em histórias com 30 páginas isso causa hitch visível.
 *  - Solução: na 1ª visita, baixamos cada PNG via `fetch`, salvamos o `Blob`
 *    em IndexedDB e geramos um `blob:` URL local. Nas visitas seguintes, os
 *    blobs vêm do IndexedDB instantaneamente — sem rede e (em geral) com
 *    decode mais rápido por estarem já normalizados.
 *  - Também guardamos um índice em `localStorage` listando as URLs já
 *    cacheadas, para acelerar o "cache hit?" sync sem precisar abrir o IDB
 *    (útil pra evitar flicker no SSR → hydration).
 *
 * Escopo: cache APENAS de PNGs referenciados em `<image href="...">` dentro
 * dos SVGs de miniatura. Não interfere com o canvas principal nem com a
 * segmentação (que tem seu próprio cache em `png-segmentation.ts`).
 *
 * Limites: o IndexedDB tem cota generosa (>50MB típico). As 30 páginas Pixar
 * compactadas pesam ~10MB total — bem dentro do orçamento.
 */

const DB_NAME = "biblin-thumb-image-cache";
const DB_VERSION = 1;
const STORE = "images";
const INDEX_KEY = "biblin:thumb-cache:index:v1";

type CacheEntry = {
  url: string;
  blob: Blob;
  cachedAt: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryUrlMap = new Map<string, string>(); // pngUrl → blob: URL
const inflight = new Map<string, Promise<string>>();

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) return Promise.reject(new Error("idb unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function readIndex(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeIndex(urls: Set<string>) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify([...urls]));
  } catch {
    /* quota exceeded — ignora, IDB ainda funciona */
  }
}

async function getEntry(url: string): Promise<CacheEntry | null> {
  try {
    const db = await openDb();
    return await new Promise<CacheEntry | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve((req.result as CacheEntry | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function putEntry(entry: CacheEntry): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* ignora — fallback é simplesmente não cachear */
  }
}

/**
 * Garante que `pngUrl` esteja no cache (IDB). Retorna um `blob:` URL local
 * (memoizado por sessão) que pode ser usado em lugar do href original.
 * Em caso de qualquer falha (rede, IDB, etc.) cai pro `pngUrl` original
 * para não quebrar a UI.
 */
export async function ensureCachedImageUrl(pngUrl: string): Promise<string> {
  if (!isBrowser()) return pngUrl;

  const memo = memoryUrlMap.get(pngUrl);
  if (memo) return memo;

  const existing = inflight.get(pngUrl);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const cached = await getEntry(pngUrl);
      if (cached?.blob) {
        const objectUrl = URL.createObjectURL(cached.blob);
        memoryUrlMap.set(pngUrl, objectUrl);
        return objectUrl;
      }

      const res = await fetch(pngUrl);
      if (!res.ok) throw new Error(`fetch ${pngUrl} → ${res.status}`);
      const blob = await res.blob();

      await putEntry({ url: pngUrl, blob, cachedAt: Date.now() });
      const idx = readIndex();
      idx.add(pngUrl);
      writeIndex(idx);

      const objectUrl = URL.createObjectURL(blob);
      memoryUrlMap.set(pngUrl, objectUrl);
      return objectUrl;
    } catch {
      return pngUrl;
    } finally {
      inflight.delete(pngUrl);
    }
  })();

  inflight.set(pngUrl, promise);
  return promise;
}

/** Lê sincronamente o `blob:` URL já preparado (ou `null`). */
export function getCachedImageUrlSync(pngUrl: string): string | null {
  return memoryUrlMap.get(pngUrl) ?? null;
}

/** Verifica (sincronamente, via `localStorage`) se uma URL provavelmente
 *  está no IDB — útil pra decidir se vale tentar pré-resolver. */
export function isLikelyCached(pngUrl: string): boolean {
  return readIndex().has(pngUrl);
}

/**
 * Reescreve todos os `<image href|xlink:href="...">` de um SVG string para
 * usar URLs cacheadas (`blob:` local) quando disponíveis em memória.
 * Só substitui hrefs já resolvidos em memória — para os ainda não
 * cacheados mantém o href original (a UI segue funcionando, e a próxima
 * passagem após o cache concluir trocará pra blob:).
 */
export function rewriteSvgImageHrefs(svg: string): string {
  if (!svg.includes("<image")) return svg;
  return svg.replace(
    /(<image\b[^>]*?\s)(href|xlink:href)\s*=\s*(["'])([^"']+)\3/g,
    (full, prefix: string, attr: string, quote: string, url: string) => {
      const cached = memoryUrlMap.get(url);
      if (!cached) return full;
      return `${prefix}${attr}=${quote}${cached}${quote}`;
    },
  );
}

/** Pré-aquece o cache para uma lista de URLs (em paralelo, sem bloquear). */
export function prewarmThumbnailImages(pngUrls: string[]): void {
  if (!isBrowser()) return;
  const unique = Array.from(new Set(pngUrls.filter(Boolean)));
  for (const url of unique) {
    if (memoryUrlMap.has(url)) continue;
    void ensureCachedImageUrl(url);
  }
}

/** Extrai todas as URLs de `<image href>` de um SVG string. */
export function extractImageHrefs(svg: string): string[] {
  const out: string[] = [];
  const re = /<image\b[^>]*?\s(?:href|xlink:href)\s*=\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    out.push(m[1]);
  }
  return out;
}
