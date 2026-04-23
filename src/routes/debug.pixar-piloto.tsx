import { createFileRoute } from "@tanstack/react-router";
import capa from "@/assets/piloto-noe-capa-pixar.png";
import paginaConstrucao from "@/assets/piloto-noe-pagina-construcao.png";
import paginaAnimais from "@/assets/piloto-noe-pagina-animais.png";

export const Route = createFileRoute("/debug/pixar-piloto")({
  component: PixarPilotoPage,
});

function PixarPilotoPage() {
  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center gap-8">
      <header className="max-w-3xl text-center space-y-2">
        <h1 className="text-3xl font-bold">Piloto Pixar — Arca de Noé</h1>
        <p className="text-sm text-muted-foreground">
          3 imagens-piloto geradas com IA (Nano Banana Pro). Aprove para eu produzir as 30 páginas +
          replicar nas demais histórias.
        </p>
      </header>

      <section className="w-full max-w-3xl space-y-3">
        <h2 className="text-xl font-semibold">1) Capa Pixar 3D (decorativa)</h2>
        <p className="text-sm text-muted-foreground">
          Estilo da imagem 2 que você enviou — não é pintável, é a "vitrine" da história.
        </p>
        <div className="rounded-2xl overflow-hidden border-2 border-foreground/10 shadow-lg">
          <img
            src={capa}
            alt="Capa Pixar 3D — Arca de Noé"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      <section className="w-full max-w-3xl space-y-3">
        <h2 className="text-xl font-semibold">2) Página de colorir — Construção da arca</h2>
        <p className="text-sm text-muted-foreground">
          Line-art cartoon fofo, áreas grandes pintáveis. Estilo mais próximo da imagem 4.
        </p>
        <div className="rounded-2xl overflow-hidden border-2 border-foreground/10 shadow-lg bg-white">
          <img
            src={paginaConstrucao}
            alt="Página de colorir — Noé construindo a arca"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      <section className="w-full max-w-3xl space-y-3">
        <h2 className="text-xl font-semibold">3) Página de colorir — Animais entrando</h2>
        <p className="text-sm text-muted-foreground">
          Mesmo estilo cartoon kawaii com várias regiões grandes para colorir.
        </p>
        <div className="rounded-2xl overflow-hidden border-2 border-foreground/10 shadow-lg bg-white">
          <img
            src={paginaAnimais}
            alt="Página de colorir — Animais entrando na arca"
            width={1024}
            height={1024}
            className="w-full h-auto"
          />
        </div>
      </section>

      <footer className="max-w-3xl text-sm text-muted-foreground space-y-2 pt-4 border-t border-foreground/10">
        <p>
          <strong>Próximo passo:</strong> se aprovar o estilo, eu gero as 30 páginas restantes da
          Arca de Noé seguindo exatamente esse padrão e integro no app (capa decorativa + páginas
          pintáveis com regiões detectadas automaticamente).
        </p>
        <p>
          <strong>Importante:</strong> imagens IA (raster) não pintam por região como o SVG atual. A
          pintura passa a ser por "balde de tinta" sobre áreas brancas detectadas — mecânica
          equivalente, visual MUITO superior.
        </p>
      </footer>
    </div>
  );
}
