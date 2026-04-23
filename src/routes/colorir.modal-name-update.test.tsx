/**
 * Garante o contrato em tempo real exigido pelo PRD: qualquer modal que já
 * esteja ABERTO antes do nome ser salvo deve passar a exibir a nova
 * saudação assim que o nome mudar — sem fechar o modal, sem reload e sem
 * depender da rota /colorir inteira ser remountada.
 *
 * Estratégia:
 *   - Não montamos a rota inteira (carrega Supabase, store, canvas etc.).
 *   - Usamos um harness mínimo que reproduz EXATAMENTE o padrão usado
 *     pelos modais reais em `src/routes/colorir.$slug.tsx`:
 *        const { childName } = useChildName();
 *        ...
 *        {pageCompleteTitle(language, childName, addressStyle)}
 *   - Disparamos o mesmo `CustomEvent` que `useChildName.setChildName`
 *     emite ao salvar e checamos que o texto renderizado mudou nos três
 *     idiomas (pt/en/es), com o modal continuando aberto.
 *
 * Se este teste quebrar, significa que algum modal aberto pode ficar
 * mostrando o nome antigo após o pai salvar — bug de UX premium grave.
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChildName } from "@/hooks/use-child-name";
import {
  pageCompleteBody,
  pageCompleteTitle,
  storyCompleteTitle,
  storyMilestoneTitle,
} from "@/lib/personalize";
import type { AppLanguage } from "@/lib/i18n";

const UPDATE_EVENT = "ccj-child-name-updated";

// Não queremos ir ao Supabase — o hook real cai num branch que apenas
// observa o CustomEvent quando não há sessão, exatamente o que precisamos.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

/**
 * Harness que reproduz a estrutura dos modais "Página completa" e
 * "História concluída/Milestone" da rota /colorir/$slug — incluindo o
 * fato de que o modal é renderizado condicionalmente e PERMANECE aberto
 * enquanto o usuário não fecha. Aqui forçamos `open=true` (modal já
 * estava aberto antes do save).
 */
function ModalsHarness({ language }: { language: AppLanguage }) {
  const { childName } = useChildName();
  return (
    <div>
      <div data-testid="page-complete-modal" role="dialog" aria-modal="true">
        <h2 data-testid="page-complete-title">{pageCompleteTitle(language, childName, "name")}</h2>
        <p data-testid="page-complete-body">{pageCompleteBody(language, childName, "name")}</p>
      </div>
      <div data-testid="story-done-modal" role="dialog" aria-modal="true">
        <h2 data-testid="story-done-title">{storyCompleteTitle(language, childName, "name")}</h2>
        <h3 data-testid="story-milestone-title">
          {storyMilestoneTitle(language, childName, "name")}
        </h3>
      </div>
    </div>
  );
}

describe("modais abertos: saudação atualiza em tempo real ao salvar o nome", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  const cases: Array<{
    language: AppLanguage;
    initialPageTitle: string;
    nextPageTitle: string;
    nextStoryTitle: string;
    nextMilestoneTitle: string;
    bodyContains: string;
  }> = [
    {
      language: "pt-BR",
      initialPageTitle: "Parabéns! Página completa! 🎉",
      nextPageTitle: "Parabéns, Davi! Página completa! 🎉",
      nextStoryTitle: "Parabéns, Davi!",
      nextMilestoneTitle: "Parabéns, Davi! Você desbloqueou uma nova fase!",
      bodyContains: "Davi, você pintou",
    },
    {
      language: "en-US",
      initialPageTitle: "Awesome! Page complete! 🎉",
      nextPageTitle: "Awesome, Davi! Page complete! 🎉",
      nextStoryTitle: "Congratulations, Davi!",
      nextMilestoneTitle: "Congratulations, Davi! You unlocked a new stage!",
      bodyContains: "Davi, you colored",
    },
    {
      language: "es-ES",
      initialPageTitle: "¡Felicidades! ¡Página completa! 🎉",
      nextPageTitle: "¡Felicidades, Davi! ¡Página completa! 🎉",
      nextStoryTitle: "¡Felicidades, Davi!",
      nextMilestoneTitle: "¡Felicidades, Davi! ¡Desbloqueaste una nueva fase!",
      bodyContains: "Davi, coloreaste",
    },
  ];

  for (const tc of cases) {
    it(`[${tc.language}] modais abertos passam a usar o novo nome após o save`, async () => {
      render(<ModalsHarness language={tc.language} />);

      // Estado inicial: SEM nome salvo — todos os modais estão na variante genérica.
      expect(screen.getByTestId("page-complete-title").textContent).toBe(tc.initialPageTitle);
      expect(screen.getByTestId("page-complete-body").textContent).not.toContain("Davi");
      expect(screen.getByTestId("story-done-title").textContent?.includes("Davi")).toBe(false);
      expect(screen.getByTestId("story-milestone-title").textContent?.includes("Davi")).toBe(false);

      // Os modais continuam montados (o pai NÃO fechou).
      expect(screen.getByTestId("page-complete-modal")).toBeTruthy();
      expect(screen.getByTestId("story-done-modal")).toBeTruthy();

      // Simula o que `useChildName.setChildName("Davi")` faz internamente
      // após gravar no DB/cache — emite o CustomEvent global na própria aba.
      await act(async () => {
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "Davi" }));
      });

      // Os MESMOS modais (sem fechar/reabrir) agora exibem a saudação
      // personalizada com o nome — é exatamente isso que o PRD pede.
      expect(screen.getByTestId("page-complete-title").textContent).toBe(tc.nextPageTitle);
      expect(screen.getByTestId("page-complete-body").textContent).toContain(tc.bodyContains);
      expect(screen.getByTestId("story-done-title").textContent).toBe(tc.nextStoryTitle);
      expect(screen.getByTestId("story-milestone-title").textContent).toBe(tc.nextMilestoneTitle);
      // Continuam abertos.
      expect(screen.getByTestId("page-complete-modal")).toBeTruthy();
      expect(screen.getByTestId("story-done-modal")).toBeTruthy();
    });
  }

  it("storage event de outra aba também atualiza modais abertos", async () => {
    render(<ModalsHarness language="pt-BR" />);
    expect(screen.getByTestId("page-complete-title").textContent).toBe(
      "Parabéns! Página completa! 🎉",
    );

    // Outra aba grava o cache: aqui chega como `storage` event.
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ccj.child-name.cache.v1",
          newValue: "Maria",
          oldValue: "",
        }),
      );
    });

    expect(screen.getByTestId("page-complete-title").textContent).toBe(
      "Parabéns, Maria! Página completa! 🎉",
    );
  });

  it("trocar o nome de novo enquanto o modal está aberto reflete a 2ª atualização", async () => {
    render(<ModalsHarness language="pt-BR" />);

    await act(async () => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "Davi" }));
    });
    expect(screen.getByTestId("page-complete-title").textContent).toBe(
      "Parabéns, Davi! Página completa! 🎉",
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "Maria Clara" }));
    });
    expect(screen.getByTestId("page-complete-title").textContent).toBe(
      "Parabéns, Maria Clara! Página completa! 🎉",
    );
  });

  it("limpar o nome (CustomEvent com '') volta os modais abertos para o genérico", async () => {
    render(<ModalsHarness language="pt-BR" />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "Davi" }));
    });
    expect(screen.getByTestId("page-complete-title").textContent).toBe(
      "Parabéns, Davi! Página completa! 🎉",
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "" }));
    });
    expect(screen.getByTestId("page-complete-title").textContent).toBe(
      "Parabéns! Página completa! 🎉",
    );
  });
});
