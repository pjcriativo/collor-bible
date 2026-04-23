/**
 * Garante que o `useChildName` propaga mudanças INSTANTANEAMENTE
 * para todos os consumidores na mesma aba — sem reload — e via
 * `storage` event para outras abas. Isso valida o requisito do PRD:
 *   "atualizar em tempo real após salvar; refletir sem necessidade
 *    de logout/login".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useChildName } from "./use-child-name";

// Mocka o supabase para o teste rodar sem rede e SEM sessão (cai no
// caminho local — escreve cache + dispatch do CustomEvent).
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

function NameDisplay({ testId }: { testId: string }) {
  const { childName } = useChildName();
  return <span data-testid={testId}>{childName || "(vazio)"}</span>;
}

function NameSaver() {
  const { setChildName } = useChildName();
  return (
    <button data-testid="save" onClick={() => void setChildName("Davi")}>
      salvar
    </button>
  );
}

describe("useChildName — propagação instantânea entre consumidores", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("ao salvar em um lugar, TODOS os consumidores na mesma aba atualizam sem reload", async () => {
    render(
      <>
        <NameDisplay testId="header" />
        <NameDisplay testId="modal" />
        <NameSaver />
      </>,
    );

    expect(screen.getByTestId("header").textContent).toBe("(vazio)");
    expect(screen.getByTestId("modal").textContent).toBe("(vazio)");

    await act(async () => {
      screen.getByTestId("save").click();
      // resolve a Promise do setChildName (sem sessão, é síncrono na prática)
      await Promise.resolve();
    });

    // Os DOIS consumidores devem refletir o novo valor IMEDIATAMENTE,
    // sem nenhum reload — via CustomEvent do hook.
    expect(screen.getByTestId("header").textContent).toBe("Davi");
    expect(screen.getByTestId("modal").textContent).toBe("Davi");
  });

  it("escuta `storage` event (cross-tab) — outra aba grava no localStorage e este consumidor atualiza", async () => {
    render(<NameDisplay testId="header" />);
    expect(screen.getByTestId("header").textContent).toBe("(vazio)");

    // Simula outra aba: muda diretamente o localStorage e dispara o
    // StorageEvent que o browser propagaria automaticamente.
    await act(async () => {
      window.localStorage.setItem("ccj.child-name.cache.v1", "Maria");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ccj.child-name.cache.v1",
          newValue: "Maria",
        }),
      );
    });

    expect(screen.getByTestId("header").textContent).toBe("Maria");
  });
});
