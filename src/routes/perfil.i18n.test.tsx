import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";

import { useStore } from "@/hooks/use-store";
import { __resetLanguageSwitchingForTests, setLanguage, useI18n } from "@/lib/i18n";
import { getActiveStories } from "@/lib/store";

// O Supabase é importado pelo i18n (para puxar `default_language` do backend),
// mas neste teste simulamos a escolha do usuário no perfil — sem rede.
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

/**
 * Réplica enxuta da derivação usada em `ProfilePage` para a lista
 * "Continue colorindo": pega `getActiveStories()` reativo (já localizado
 * pelo idioma ativo) e renderiza os títulos correspondentes a uma lista
 * fixa de slugs em progresso. Se o pipeline reativo (evento
 * `ccj-language-changed` -> `useStore` -> `getStories` -> `localizeStory`)
 * estiver íntegro, os títulos mudam ao trocar o idioma.
 */
function ProfileStoriesList({ slugs }: { slugs: string[] }) {
  const stories = useStore(() => getActiveStories());
  const bySlug = new Map(stories.map((s) => [s.slug, s] as const));
  const items = slugs
    .map((slug) => bySlug.get(slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  return (
    <ul data-testid="profile-stories">
      {items.map((s) => (
        <li key={s.slug} data-slug={s.slug}>
          {s.title}
        </li>
      ))}
    </ul>
  );
}

const SLUGS = ["noe-e-a-arca", "davi-e-golias", "o-nascimento-de-jesus"];

const TITLES_BY_LANG = {
  "pt-BR": ["Arca de Noé", "Davi e Golias", "O Nascimento de Jesus"],
  "en-US": ["Noah's Ark", "David and Goliath", "The Birth of Jesus"],
  "es-ES": ["El Arca de Noé", "David y Goliat", "El Nacimiento de Jesús"],
} as const;

// Texto do label "Continuar" do FAB do perfil em cada idioma — t("continue").
const CONTINUE_BY_LANG = {
  "pt-BR": "Continuar",
  "en-US": "Continue",
  "es-ES": "Continuar",
} as const;

// Cabeçalho da seção "Continue colorindo" em cada idioma — t("continueColoring").
const CONTINUE_COLORING_BY_LANG = {
  "pt-BR": "Continue colorindo",
  "en-US": "Continue coloring",
  "es-ES": "Seguir coloreando",
} as const;

function readTitles() {
  const list = screen.getByTestId("profile-stories");
  return SLUGS.map(
    (slug) => within(list).getByText((_, el) => el?.getAttribute("data-slug") === slug).textContent,
  );
}

/**
 * Réplica enxuta da seção "Continue colorindo" + FAB do perfil. Usa o mesmo
 * pipeline reativo da página real:
 *   - `useI18n()` para os textos estáticos (t("continueColoring") / t("continue"))
 *   - `useStore(getActiveStories)` para o título da história (localizado)
 *
 * Se qualquer um desses não re-renderizar ao trocar o idioma, este teste falha.
 */
function ProfileSectionWithFab({ slug }: { slug: string }) {
  const { t } = useI18n();
  const stories = useStore(() => getActiveStories());
  const story = stories.find((s) => s.slug === slug);
  if (!story) return null;
  return (
    <div>
      <h2 data-testid="continue-coloring-heading">{t("continueColoring")}</h2>
      <a data-testid="profile-fab" href="#fab">
        <span data-testid="fab-continue-label">{t("continue")}</span>
        <span data-testid="fab-story-title">{story.title}</span>
      </a>
    </div>
  );
}

describe("Perfil — lista de histórias muda com o idioma", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetLanguageSwitchingForTests();
  });

  afterEach(() => {
    window.localStorage.clear();
    __resetLanguageSwitchingForTests();
  });

  it("renderiza títulos em PT-BR, EN-US e ES-ES ao trocar o idioma", () => {
    // Idioma inicial = pt-BR (default)
    render(<ProfileStoriesList slugs={SLUGS} />);
    expect(readTitles()).toEqual([...TITLES_BY_LANG["pt-BR"]]);

    // Troca para inglês — `setLanguage` dispara `ccj-language-changed`
    // que o hook `useStore` escuta para reexecutar o seletor.
    act(() => {
      setLanguage("en-US");
      // Limpa a janela de "switching" para que a próxima chamada de
      // `setLanguage` no teste se aplique imediatamente, sem ser
      // enfileirada pelo coalescing de mudanças rápidas.
      __resetLanguageSwitchingForTests();
    });
    expect(readTitles()).toEqual([...TITLES_BY_LANG["en-US"]]);

    // Troca para espanhol
    act(() => {
      setLanguage("es-ES");
      __resetLanguageSwitchingForTests();
    });
    expect(readTitles()).toEqual([...TITLES_BY_LANG["es-ES"]]);

    // Volta para português — garante que a alternância é bidirecional
    act(() => {
      setLanguage("pt-BR");
      __resetLanguageSwitchingForTests();
    });
    expect(readTitles()).toEqual([...TITLES_BY_LANG["pt-BR"]]);
  });

  it("re-renderiza 'Continue colorindo' e o FAB do perfil ao trocar o idioma", () => {
    // Garante o idioma inicial em pt-BR mesmo quando outro teste mudou antes.
    act(() => {
      setLanguage("pt-BR");
      __resetLanguageSwitchingForTests();
    });

    render(<ProfileSectionWithFab slug="noe-e-a-arca" />);

    const readSnapshot = () => ({
      heading: screen.getByTestId("continue-coloring-heading").textContent,
      fabLabel: screen.getByTestId("fab-continue-label").textContent,
      fabTitle: screen.getByTestId("fab-story-title").textContent,
    });

    expect(readSnapshot()).toEqual({
      heading: CONTINUE_COLORING_BY_LANG["pt-BR"],
      fabLabel: CONTINUE_BY_LANG["pt-BR"],
      fabTitle: TITLES_BY_LANG["pt-BR"][0],
    });

    act(() => {
      setLanguage("en-US");
      __resetLanguageSwitchingForTests();
    });
    expect(readSnapshot()).toEqual({
      heading: CONTINUE_COLORING_BY_LANG["en-US"],
      fabLabel: CONTINUE_BY_LANG["en-US"],
      fabTitle: TITLES_BY_LANG["en-US"][0],
    });

    act(() => {
      setLanguage("es-ES");
      __resetLanguageSwitchingForTests();
    });
    expect(readSnapshot()).toEqual({
      heading: CONTINUE_COLORING_BY_LANG["es-ES"],
      fabLabel: CONTINUE_BY_LANG["es-ES"],
      fabTitle: TITLES_BY_LANG["es-ES"][0],
    });

    // Volta para PT-BR — confirma reatividade bidirecional.
    act(() => {
      setLanguage("pt-BR");
      __resetLanguageSwitchingForTests();
    });
    expect(readSnapshot()).toEqual({
      heading: CONTINUE_COLORING_BY_LANG["pt-BR"],
      fabLabel: CONTINUE_BY_LANG["pt-BR"],
      fabTitle: TITLES_BY_LANG["pt-BR"][0],
    });
  });
});
