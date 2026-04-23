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
 * Monta um router em memória com APENAS as rotas necessárias para este E2E:
 *   /            -> shell vazio (raiz)
 *   /home        -> página inicial real
 *   /historia/$  -> página de detalhe de história real
 *
 * Isso evita carregar todo o `routeTree.gen.ts` (que puxa rotas /admin, /api etc.)
 * e mantém o teste focado no fluxo de "voltar" do mobile.
 */
function buildRouter(initialPath: string) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/home",
    component: HomeRoute.options.component!,
    // `head` é fortemente tipado às rotas geradas; aqui clonamos só o runtime.
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
 * Define `window.matchMedia` para simular um viewport mobile (largura < 768px).
 * Componentes como `MobileTabBar`/`useIsMobile` consultam isso; aqui forçamos
 * mobile=true para garantir que estamos testando a experiência do celular.
 */
function setMobileViewport() {
  Object.defineProperty(window, "innerWidth", { value: 375, writable: true, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 812, writable: true, configurable: true });
  window.matchMedia = (query: string) =>
    ({
      matches: /max-width:\s*7\d{2}/.test(query), // mobile breakpoints
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

describe("E2E mobile — voltar da história para /home", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Força idioma pt-BR ANTES de qualquer render — garante que o
    // `t("back")`, o título "Arca de Noé" e a descrição usados nas
    // asserções venham sempre do mesmo dicionário i18n, mesmo que
    // outro teste tenha persistido EN-US/ES-ES no localStorage e o
    // jsdom o tenha mantido entre arquivos.
    window.localStorage.setItem("ccj.app-language.v1", "pt-BR");
    window.localStorage.setItem("ccj.app-language.user-set.v1", "1");
    setMobileViewport();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("abre /historia/noe-e-a-arca, clica na seta de voltar e retorna para /home", async () => {
    const router = buildRouter("/historia/noe-e-a-arca");

    await act(async () => {
      render(<RouterProvider router={router} />);
      // Aguarda o loader da rota terminar antes de interagir.
      await router.load();
    });

    // Garante que estamos de fato na página de detalhe da história.
    expect(router.state.location.pathname).toBe("/historia/noe-e-a-arca");
    // O título da história aparece como <h1> na página de detalhe.
    expect(screen.getByRole("heading", { level: 1, name: /Arca de Noé/i })).toBeTruthy();
    // Asserções extras: garante que o conteúdo principal renderizou
    // ANTES de clicar em voltar — assim, se o componente quebrar e
    // mostrar só um esqueleto/erro, o teste falha aqui em vez de
    // passar acidentalmente porque a navegação ainda funciona.
    //  • Subtítulo (vem do mesmo objeto `story`).
    expect(screen.getByText(/Animais, chuva e um lindo arco-íris/i)).toBeTruthy();
    //  • Bloco de texto da descrição (parágrafo principal).
    expect(screen.getByText(/Noé construiu uma arca enorme/i)).toBeTruthy();
    //  • Meta com a contagem de páginas — confirma que `story.pages`
    //    foi carregado pelo loader.
    expect(screen.getByText(/\d+\s+(página|páginas)/i)).toBeTruthy();

    // Localiza a seta de voltar por `data-testid` estável (em vez do
    // texto i18n) — assim o teste não fica frágil quando o idioma do
    // app muda (ex.: outro teste setou EN-US no localStorage antes).
    const backLink = screen.getByTestId("story-back-link");
    expect(backLink.getAttribute("href")).toBe("/home");

    // Simula um TAP MOBILE realista no link de voltar — em vez de um
    // único `MouseEvent("click")`, dispara a sequência que um navegador
    // móvel emite no toque: pointerdown → touchstart → pointerup →
    // touchend → click. Isso valida que o handler do <Link> responde ao
    // evento de clique sintetizado pelo touch (e que nenhum
    // `preventDefault` em camadas anteriores está bloqueando o tap).
    await act(async () => {
      const opts: PointerEventInit & TouchEventInit = {
        bubbles: true,
        cancelable: true,
      };
      // pointerdown / touchstart — início do toque.
      backLink.dispatchEvent(
        new PointerEvent("pointerdown", { ...opts, pointerType: "touch", isPrimary: true }),
      );
      // jsdom não implementa TouchEvent em todos os ambientes; quando
      // ausente, caímos em um Event genérico com o mesmo `type` para
      // ainda exercitar handlers que escutam por `touchstart/touchend`.
      const dispatchTouch = (type: "touchstart" | "touchend") => {
        const Ctor = (
          globalThis as unknown as { TouchEvent?: new (t: string, init?: EventInit) => Event }
        ).TouchEvent;
        const event = typeof Ctor === "function" ? new Ctor(type, opts) : new Event(type, opts);
        backLink.dispatchEvent(event);
      };
      dispatchTouch("touchstart");
      backLink.dispatchEvent(
        new PointerEvent("pointerup", { ...opts, pointerType: "touch", isPrimary: true }),
      );
      dispatchTouch("touchend");
      // O clique sintetizado pelo browser após um tap — é ELE que o
      // <Link> realmente intercepta para fazer a navegação SPA.
      backLink.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
      );
      // Dá tempo para o roteador processar a navegação + loaders.
      await router.load();
    });

    // Verifica que o roteador navegou para /home.
    expect(router.state.location.pathname).toBe("/home");
  });
});
