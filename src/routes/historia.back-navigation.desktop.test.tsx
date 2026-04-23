import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";

// O Supabase é importado indiretamente pelo i18n; mockamos para evitar rede.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
}));

// Importa as páginas reais — usamos as mesmas implementações que rodam em produção.
import { Route as HistoriaRoute } from "@/routes/historia.$slug";
import { Route as HomeRoute } from "@/routes/home";

/**
 * Monta o mesmo router em memória usado no teste de mobile, com APENAS
 * as rotas necessárias para este E2E:
 *   /home        -> página inicial real
 *   /historia/$  -> página de detalhe de história real
 */
function buildRouter(initialPath: string) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/home",
    component: HomeRoute.options.component!,
    head: HomeRoute.options.head as never,
  });

  const historiaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/historia/$slug",
    loader: HistoriaRoute.options.loader!,
    component: HistoriaRoute.options.component!,
    notFoundComponent: HistoriaRoute.options.notFoundComponent,
    head: HistoriaRoute.options.head as never,
  });

  const routeTree = rootRoute.addChildren([homeRoute, historiaRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    defaultPreload: false,
  });
}

/**
 * Define `window.matchMedia` simulando um viewport NÃO-mobile (>= 768px).
 * `useIsMobile()` deve devolver `false` para esses tamanhos — usamos isso
 * para garantir que o caminho desktop/tablet também funciona.
 */
function setNonMobileViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    writable: true,
    configurable: true,
  });
  window.matchMedia = (query: string) => {
    // Casamento conservador: só retorna true para queries de breakpoint
    // até a largura do viewport simulado. Para tablet (768) e desktop (1280),
    // queries `(max-width: 767px)` (mobile) devem retornar false.
    const maxMatch = query.match(/max-width:\s*(\d+)px/);
    let matches = false;
    if (maxMatch) {
      matches = width <= Number.parseInt(maxMatch[1], 10);
    }
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}

/**
 * Cobre os mesmos passos do teste mobile (`historia.back-navigation.test.tsx`)
 * mas simulando viewports de tablet (768x1024) e desktop (1280x720). O link
 * de voltar é o MESMO componente em todas as larguras — só muda o estilo
 * via prefixos responsivos (`sm:px-3.5` etc.). Validamos que o `href`,
 * o handler de clique e a navegação para `/home` continuam idênticos.
 */
describe("E2E desktop/tablet — voltar da história para /home", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Força idioma pt-BR ANTES de cada render. Sem isso, um teste
    // anterior poderia ter persistido outro idioma no localStorage e
    // tornado as asserções de texto (descrição/subtítulo/meta) frágeis.
    window.localStorage.setItem("ccj.app-language.v1", "pt-BR");
    window.localStorage.setItem("ccj.app-language.user-set.v1", "1");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  const viewports: Array<{ label: string; width: number; height: number }> = [
    { label: "tablet 768x1024", width: 768, height: 1024 },
    { label: "desktop 1280x720", width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    it(`(${viewport.label}) abre /historia/noe-e-a-arca, clica em voltar e retorna para /home`, async () => {
      setNonMobileViewport(viewport.width, viewport.height);
      const router = buildRouter("/historia/noe-e-a-arca");

      await act(async () => {
        render(<RouterProvider router={router} />);
        await router.load();
      });

      // Estamos na página de detalhe.
      expect(router.state.location.pathname).toBe("/historia/noe-e-a-arca");
      expect(screen.getByRole("heading", { level: 1, name: /Arca de Noé/i })).toBeTruthy();
      // Asserções extras de conteúdo — protegem contra um caso em que a
      // página renderiza apenas o link de voltar (ex.: erro silencioso
      // no loader) e o teste passaria mesmo com a tela quebrada.
      expect(screen.getByText(/Animais, chuva e um lindo arco-íris/i)).toBeTruthy();
      expect(screen.getByText(/Noé construiu uma arca enorme/i)).toBeTruthy();
      expect(screen.getByText(/\d+\s+(página|páginas)/i)).toBeTruthy();

      // Localiza o link "Voltar" por `data-testid` estável — independente
      // do idioma ativo. O href DEVE apontar para /home em qualquer
      // viewport: esse é o invariante que estamos protegendo (alguém
      // poderia, sem querer, esconder o link com `sm:hidden`/`md:hidden`).
      const backLink = screen.getByTestId("story-back-link");
      expect(backLink.getAttribute("href")).toBe("/home");

      // O link NÃO pode estar oculto no breakpoint atual: nenhuma classe
      // `hidden`/`md:hidden`/`lg:hidden` deve ter sido aplicada por engano.
      // (Validação textual simples — suficiente para detectar regressão
      //  comum sem trazer um stub completo de CSSOM.)
      const cls = backLink.className;
      expect(/(^|\s)hidden(\s|$)/.test(cls)).toBe(false);
      expect(/(^|\s)(sm|md|lg|xl):hidden(\s|$)/.test(cls)).toBe(false);

      // Clique real, simulando mouse de desktop/tablet.
      await act(async () => {
        backLink.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
        );
        await router.load();
      });

      // Navegação para /home — mesmo destino do fluxo mobile.
      expect(router.state.location.pathname).toBe("/home");
    });
  }
});
