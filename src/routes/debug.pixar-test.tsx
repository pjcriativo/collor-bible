import { createFileRoute } from "@tanstack/react-router";
import { lionCouplePixarTest } from "@/lib/coloring-pages-pixar-test";

export const Route = createFileRoute("/debug/pixar-test")({
  component: PixarTestPage,
});

function PixarTestPage() {
  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center gap-6">
      <header className="max-w-2xl text-center space-y-2">
        <h1 className="text-2xl font-bold">Teste de estilo: Casal de Leões (Pixar-inspired SVG)</h1>
        <p className="text-sm text-muted-foreground">
          SVG desenhado à mão, compatível com o motor de pintura atual. Se o estilo for aprovado,
          aplico o mesmo padrão nas 12 cenas + capa da Arca de Noé.
        </p>
      </header>

      <div
        className="w-full max-w-xl aspect-square rounded-2xl overflow-hidden border-2 border-foreground/10 shadow-lg bg-[#fdf6e8]"
        dangerouslySetInnerHTML={{ __html: lionCouplePixarTest }}
      />

      <ul className="text-xs text-muted-foreground max-w-xl list-disc pl-5 space-y-1">
        <li>Traço grosso (~5–6px) na cor #2a2018</li>
        <li>Fundo creme #fdf6e8</li>
        <li>Cabeças grandes, olhos arredondados com brilho, boca sorriso</li>
        <li>
          Cada região é um <code>id="fill-*"</code> pronto para o motor de pintura
        </li>
      </ul>
    </div>
  );
}
