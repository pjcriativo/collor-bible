import { toast } from "sonner";
import jsPDF from "jspdf";
import { buildRenderableSvg } from "@/components/coloring/coloring-canvas";
import { MANUAL_PAGE_VIEWBOX } from "@/lib/coloring-framing";

export type ExportColoringResult = { blob: Blob; fileName: string } | null;

export type ExportColoringOptions = {
  /** Container element holding the rendered <svg> to export. */
  wrap: HTMLElement | null;
  /** Story slug, used in the file name. */
  storySlug: string;
  /** Zero-based page index, used in the file name. */
  pageIndex: number;
  /** Pixel scale relative to the SVG viewBox. Defaults to 2 (high-DPI). */
  scale?: number;
};

/**
 * Render the coloring SVG inside `wrap` to a PNG Blob with a white background.
 * Returns the blob and a sane file name, or null if no SVG is available.
 */
export async function exportColoringPng(
  options: ExportColoringOptions,
): Promise<ExportColoringResult> {
  const { wrap, storySlug, pageIndex, scale = 2 } = options;
  const svg = wrap?.querySelector("svg");
  if (!svg) return null;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${clone.clientWidth || 1000} ${clone.clientHeight || 1000}`);
  }
  const vb = clone.getAttribute("viewBox")!.split(/\s+/).map(Number);
  const vbW = vb[2] || 1000;
  const vbH = vb[3] || 1000;
  const w = Math.round(vbW * scale);
  const h = Math.round(vbH * scale);

  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>${xml}`], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("img load"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png", 0.95));
    if (!blob) return null;

    const safeSlug = storySlug.replace(/[^a-z0-9-]/gi, "-");
    return {
      blob,
      fileName: `colorindo-com-jesus-${safeSlug}-pagina-${pageIndex + 1}.png`,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate the rendered coloring page and trigger a real browser download.
 * This path intentionally does not call the Web Share API.
 */
export async function downloadColoringPng(options: ExportColoringOptions): Promise<void> {
  try {
    const result = await exportColoringPng(options);
    if (!result) {
      toast.error("Não foi possível gerar a imagem");
      return;
    }

    triggerDownload(result.blob, result.fileName);
    toast.success("Imagem baixada!");
  } catch {
    toast.error("Erro ao gerar a imagem");
  }
}

export type ShareColoringOptions = ExportColoringOptions & {
  /** Story title used as the share title. */
  storyTitle: string;
};

/**
 * Try to share the rendered coloring page via the Web Share API (with files).
 * Falls back to triggering a download when sharing isn't available or is rejected.
 * Shows toasts for user feedback.
 */
export async function shareColoringPng(options: ShareColoringOptions): Promise<void> {
  try {
    const result = await exportColoringPng(options);
    if (!result) {
      toast.error("Não foi possível gerar a imagem");
      return;
    }
    const { blob, fileName } = result;
    const file = new File([blob], fileName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: options.storyTitle,
          text: `Olha o que eu pintei: ${options.storyTitle} 🎨`,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // fall through to download fallback
      }
    }

    triggerDownload(blob, fileName);
    toast.success("Imagem baixada!");
  } catch {
    toast.error("Erro ao gerar a imagem");
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Multi-page PDF export
// ============================================================================

export type PageToExport = {
  /** Raw SVG markup of the page. */
  svg: string;
  /** Fills to apply to this page (regionId -> color). */
  fills: Record<string, string>;
  /** Page index inside the story (used for viewBox heuristics). */
  pageIndex: number;
};

export type ExportColoringPdfOptions = {
  pages: PageToExport[];
  storySlug: string;
  storyTitle?: string;
  signatureName?: string;
  /** Pixel scale for each page raster. Defaults to 2 (high-DPI). */
  scale?: number;
};

/** Resolve viewBox the same way the canvas does, so the PDF matches the on-screen art. */
function resolveViewBox(
  svgMarkup: string,
  pageIndex: number,
): { x: number; y: number; w: number; h: number } {
  const manual = MANUAL_PAGE_VIEWBOX[pageIndex];
  const parse = (vb: string) => {
    const [x, y, w, h] = vb.split(/\s+/).map(Number);
    return { x: x || 0, y: y || 0, w: w || 1000, h: h || 1000 };
  };
  if (manual) return parse(manual);
  const match = svgMarkup.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (match) return parse(match[1]);
  return { x: 0, y: 0, w: 1000, h: 1000 };
}

/** Render a single SVG string to a PNG data URL with white background. */
async function rasterizeSvg(
  svgMarkup: string,
  pageIndex: number,
  scale: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const vb = resolveViewBox(svgMarkup, pageIndex);
  // Inject viewBox + xmlns explicitly so the off-screen image renders correctly.
  const normalized = svgMarkup.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    let next = attrs;
    if (!/\sxmlns\s*=/.test(next)) next += ' xmlns="http://www.w3.org/2000/svg"';
    if (!/\sviewBox\s*=/.test(next)) next += ` viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"`;
    else
      next = next.replace(
        /\sviewBox\s*=\s*["'][^"']*["']/,
        ` viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}"`,
      );
    if (!/\spreserveAspectRatio\s*=/.test(next)) next += ' preserveAspectRatio="xMidYMid meet"';
    return `<svg${next}>`;
  });

  const w = Math.round(vb.w * scale);
  const h = Math.round(vb.h * scale);
  const svgBlob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>${normalized}`], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("img load"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate a multi-page PDF containing every painted page of the story and
 * trigger a browser download. Pages without any fill are still included so the
 * exported booklet matches the original story order.
 */
export async function downloadColoringPdf(options: ExportColoringPdfOptions): Promise<void> {
  const { pages, storySlug, storyTitle, signatureName = "", scale = 2 } = options;
  if (pages.length === 0) {
    toast.error("Nenhuma página para exportar");
    return;
  }

  try {
    // A4 portrait in points (jsPDF default unit).
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const renderable = buildRenderableSvg(page.svg, page.fills, signatureName);
      const { dataUrl, width, height } = await rasterizeSvg(renderable, page.pageIndex, scale);

      // Fit image into available area while keeping aspect ratio.
      const ratio = width / height;
      let drawW = maxW;
      let drawH = drawW / ratio;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * ratio;
      }
      const offsetX = (pageW - drawW) / 2;
      const offsetY = (pageH - drawH) / 2;

      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, "JPEG", offsetX, offsetY, drawW, drawH, undefined, "FAST");
    }

    if (storyTitle) {
      pdf.setProperties({ title: storyTitle, subject: "Reino das Cores" });
    }

    const safeSlug = storySlug.replace(/[^a-z0-9-]/gi, "-");
    const fileName = `colorindo-com-jesus-${safeSlug}.pdf`;
    const blob = pdf.output("blob");
    triggerDownload(blob, fileName);
    toast.success("PDF baixado!");
  } catch (err) {
    console.error("[downloadColoringPdf]", err);
    toast.error("Erro ao gerar o PDF");
  }
}
