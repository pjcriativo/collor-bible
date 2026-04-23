import { createFileRoute } from "@tanstack/react-router";
import p01 from "@/assets/noe/01-noe-recebe-mensagem.png";
import p02 from "@/assets/noe/02-noe-conta-familia.png";
import p03 from "@/assets/noe/03-cortando-arvores.png";
import p04 from "@/assets/noe/04-medindo-madeira.png";
import p05 from "@/assets/noe/05-construcao-comeca.png";
import p06 from "@/assets/noe/06-construindo-casco.png";
import p07 from "@/assets/noe/07-arca-quase-pronta.png";
import p08 from "@/assets/noe/08-pintando-arca.png";
import p09 from "@/assets/noe/09-povo-zomba.png";
import p10 from "@/assets/noe/10-animais-chegando.png";
import p11 from "@/assets/noe/11-passaros-voando.png";
import p12 from "@/assets/noe/12-elefantes-entrando.png";
import p13 from "@/assets/noe/13-leoes-girafas.png";
import p14 from "@/assets/noe/14-familia-entra.png";
import p15 from "@/assets/noe/15-porta-fecha.png";
import p16 from "@/assets/noe/16-comeca-chover.png";
import p17 from "@/assets/noe/17-arca-flutua.png";
import p18 from "@/assets/noe/18-tempestade-passa.png";
import p19 from "@/assets/noe/19-pomba-ramo.png";
import p20 from "@/assets/noe/20-arco-iris.png";

export const Route = createFileRoute("/debug/noe-20")({
  component: Noe20Page,
});

const PAGES: { src: string; title: string }[] = [
  { src: p01, title: "1. Noé recebe a mensagem de Deus" },
  { src: p02, title: "2. Noé conta para a família" },
  { src: p03, title: "3. Cortando as árvores" },
  { src: p04, title: "4. Medindo a madeira" },
  { src: p05, title: "5. A construção começa" },
  { src: p06, title: "6. Construindo o casco" },
  { src: p07, title: "7. A arca quase pronta" },
  { src: p08, title: "8. Pintando a arca" },
  { src: p09, title: "9. O povo zomba" },
  { src: p10, title: "10. Os animais chegando" },
  { src: p11, title: "11. Os pássaros voando" },
  { src: p12, title: "12. Os elefantes entrando" },
  { src: p13, title: "13. Leões e girafas" },
  { src: p14, title: "14. A família entra" },
  { src: p15, title: "15. A porta se fecha" },
  { src: p16, title: "16. Começa a chover" },
  { src: p17, title: "17. A arca flutua" },
  { src: p18, title: "18. A tempestade passa" },
  { src: p19, title: "19. A pomba e o ramo" },
  { src: p20, title: "20. O arco-íris" },
];

function Noe20Page() {
  return (
    <div className="min-h-screen bg-background p-6">
      <header className="max-w-6xl mx-auto text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Arca de Noé — 20 páginas (estilo aprovado)</h1>
        <p className="text-sm text-muted-foreground">
          Revise as 20 páginas. Se aprovar, me avisa que eu construo o motor de pintura novo (balde
          + pincel) e integro tudo na rota real <code>/colorir/noe-e-a-arca</code>.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PAGES.map((page) => (
          <figure
            key={page.title}
            className="rounded-2xl overflow-hidden border-2 border-foreground/10 bg-white shadow-md"
          >
            <img
              src={page.src}
              alt={page.title}
              width={1024}
              height={1024}
              className="w-full h-auto block"
              loading="lazy"
            />
            <figcaption className="px-4 py-3 text-sm font-medium text-foreground bg-muted/40">
              {page.title}
            </figcaption>
          </figure>
        ))}
      </div>

      <footer className="max-w-3xl mx-auto text-sm text-muted-foreground space-y-2 pt-8 mt-8 border-t border-foreground/10">
        <p>
          <strong>Próximo passo (Fase 1B + 1C):</strong> motor de pintura PNG (balde de tinta
          automático para áreas brancas + pincel livre alternativo) e troca das 30 páginas SVG
          atuais pelas 20 acima.
        </p>
        <p>
          <strong>Fase 2:</strong> depois que você testar a Arca de Noé funcionando 100%, eu replico
          o mesmo padrão nas outras 9 histórias (mais 180 imagens).
        </p>
      </footer>
    </div>
  );
}
