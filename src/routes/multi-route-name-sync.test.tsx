/**
 * Garante o "fan-out" do nome da criança em tempo real:
 *
 *   Quando o pai/responsável salva um novo nome no /perfil, QUALQUER
 *   outra rota já aberta — catálogo, tela de história, modal de
 *   conclusão — atualiza imediatamente o texto exibido, sem reload e
 *   sem precisar navegar de volta.
 *
 * Por que um teste de integração e não só os unit dos hooks:
 *   Os hooks individuais já têm cobertura, mas o REQUISITO de produto é
 *   "mudou no perfil → todo lugar que mostra o nome muda". Esse teste
 *   monta os três consumidores ao mesmo tempo (cada um simulando a sua
 *   tela) com a MESMA instância do hook real e dispara o save real do
 *   ChildProfileBlock — o `CustomEvent` interno deve propagar para todos.
 *
 * Se este teste quebrar, é sinal de que alguém criou um novo consumidor
 * que lê o nome de uma fonte que não escuta `ccj-child-name-updated`
 * (ex.: `localStorage.getItem` direto), quebrando a sincronização.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChildProfileBlock, type ChildProfileBlockCopy } from "@/components/child-profile-block";
import { useChildName } from "@/hooks/use-child-name";
import { pageCompleteTitle, profileGreeting, storyIntroEyebrow } from "@/lib/personalize";

// Stub do Supabase: força o branch "sem sessão" para que `setChildName`
// não vá ao banco — apenas grava no cache e dispara o CustomEvent. É
// exatamente esse caminho que precisa propagar para as outras telas.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

// Sonner: silencia o toast do bloco de perfil para que o teste valide só
// o efeito reativo nas outras telas.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const PROFILE_COPY: ChildProfileBlockCopy = {
  childProfile: "Perfil da criança",
  childNameLabel: "Nome da criança",
  childNamePlaceholder: "Digite o nome da criança",
  childNameHint: "Esse nome será usado nas mensagens.",
  childNameSaved: "Nome salvo!",
  childNameRemoved: "Nome removido",
  childNameError: "Erro ao salvar",
  childNameSave: "Salvar",
  childNameClear: "Limpar",
  saving: "Salvando...",
  addressStyleLabel: "Como o app chama a criança",
  addressStyleHint: "",
  addressStyleName: "Pelo nome",
  addressStyleYou: 'Por "você"',
  addressStyleNamePreview: "Boa, Davi!",
  addressStyleYouPreview: "Boa!",
};

/** Simula um item do catálogo que mostra a saudação no topo. */
function FakeCatalogScreen() {
  const { childName } = useChildName();
  return (
    <section data-testid="catalog">
      <header data-testid="catalog-greeting">{profileGreeting("pt-BR", childName, "name")}</header>
    </section>
  );
}

/** Simula a tela de início de história (eyebrow "Vamos começar, X?"). */
function FakeStoryScreen() {
  const { childName } = useChildName();
  const eyebrow = storyIntroEyebrow("pt-BR", childName, "name");
  return (
    <section data-testid="story">
      {eyebrow ? (
        <p data-testid="story-eyebrow">{eyebrow}</p>
      ) : (
        <p data-testid="story-eyebrow-empty" />
      )}
    </section>
  );
}

/** Simula um modal de conclusão JÁ aberto (não fecha durante o teste). */
function FakeCompletionModal() {
  const { childName } = useChildName();
  return (
    <div data-testid="completion-modal" role="dialog" aria-modal="true">
      <h2 data-testid="completion-title">{pageCompleteTitle("pt-BR", childName, "name")}</h2>
    </div>
  );
}

/** Monta as três rotas em paralelo + o bloco real do perfil. */
function MultiRouteApp() {
  return (
    <>
      <FakeCatalogScreen />
      <FakeStoryScreen />
      <FakeCompletionModal />
      <div data-testid="profile-block-host">
        <ChildProfileBlock copy={PROFILE_COPY} />
      </div>
    </>
  );
}

describe("multi-rota: salvar o nome no perfil atualiza tudo em tempo real", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("catálogo, história e modal já abertos passam a usar o novo nome após o save", async () => {
    render(<MultiRouteApp />);

    // Estado inicial: SEM nome salvo. Cada tela na sua variante "vazia".
    expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá!");
    // Eyebrow é vazio (não renderiza texto) quando não há nome.
    expect(screen.getByTestId("story-eyebrow-empty")).toBeTruthy();
    expect(screen.getByTestId("completion-title").textContent).toBe(
      "Parabéns! Página completa! 🎉",
    );

    // Pai digita um nome no bloco real do perfil e clica em "Salvar".
    const input = within(screen.getByTestId("profile-block-host")).getByPlaceholderText(
      PROFILE_COPY.childNamePlaceholder,
    );
    fireEvent.change(input, { target: { value: "Davi" } });

    const saveButton = within(screen.getByTestId("profile-block-host")).getByRole("button", {
      name: PROFILE_COPY.childNameSave,
    });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    // As três telas SEM remountar refletem o novo nome.
    await waitFor(() => {
      expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá, Davi");
    });
    expect(screen.getByTestId("story-eyebrow").textContent).toBe("Vamos começar, Davi?");
    expect(screen.getByTestId("completion-title").textContent).toBe(
      "Parabéns, Davi! Página completa! 🎉",
    );
    // Modal continua aberto (não foi remontado).
    expect(screen.getByTestId("completion-modal")).toBeTruthy();
  });

  it("trocar o nome novamente propaga a 2ª atualização para todas as rotas abertas", async () => {
    render(<MultiRouteApp />);
    const host = screen.getByTestId("profile-block-host");
    const input = within(host).getByPlaceholderText(PROFILE_COPY.childNamePlaceholder);
    const saveButton = within(host).getByRole("button", { name: PROFILE_COPY.childNameSave });

    // 1º save
    fireEvent.change(input, { target: { value: "Davi" } });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    await waitFor(() => {
      expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá, Davi");
    });

    // 2º save sem fechar nada
    fireEvent.change(input, { target: { value: "Maria Clara" } });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    await waitFor(() => {
      expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá, Maria Clara");
    });
    expect(screen.getByTestId("story-eyebrow").textContent).toBe("Vamos começar, Maria Clara?");
    expect(screen.getByTestId("completion-title").textContent).toBe(
      "Parabéns, Maria Clara! Página completa! 🎉",
    );
  });

  it("limpar o nome volta todas as rotas para o estado genérico", async () => {
    render(<MultiRouteApp />);
    const host = screen.getByTestId("profile-block-host");
    const input = within(host).getByPlaceholderText(PROFILE_COPY.childNamePlaceholder);

    fireEvent.change(input, { target: { value: "Davi" } });
    await act(async () => {
      fireEvent.click(within(host).getByRole("button", { name: PROFILE_COPY.childNameSave }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá, Davi");
    });

    // Botão "Limpar" do bloco real de perfil.
    await act(async () => {
      fireEvent.click(within(host).getByRole("button", { name: PROFILE_COPY.childNameClear }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá!");
    });
    // Eyebrow some (volta a renderizar a placeholder vazia).
    expect(screen.getByTestId("story-eyebrow-empty")).toBeTruthy();
    expect(screen.getByTestId("completion-title").textContent).toBe(
      "Parabéns! Página completa! 🎉",
    );
  });

  it("storage event de outra aba também propaga para todas as rotas abertas", async () => {
    render(<MultiRouteApp />);
    expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá!");

    // Simula outra aba gravando o cache.
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ccj.child-name.cache.v1",
          newValue: "Lia",
          oldValue: "",
        }),
      );
    });

    expect(screen.getByTestId("catalog-greeting").textContent).toBe("Olá, Lia");
    expect(screen.getByTestId("story-eyebrow").textContent).toBe("Vamos começar, Lia?");
    expect(screen.getByTestId("completion-title").textContent).toBe(
      "Parabéns, Lia! Página completa! 🎉",
    );
  });
});
