/**
 * Testes de UI do bloco "Perfil da criança".
 *
 * Cenários cobertos (PRD):
 *   1. Salvar com sucesso -> chama setChildName com o valor digitado
 *      e mostra toast de sucesso "Nome salvo!".
 *   2. Salvar string vazia -> mostra toast "Nome removido" (não "salvo").
 *   3. Limpar -> zera o input, chama setChildName("") e mostra toast.
 *   4. Erro de rede -> mostra toast de erro e mantém o rascunho.
 *   5. Estado de loading -> botão de salvar mostra "Salvando..." e fica disabled.
 *   6. Sanitização do input -> remove espaços iniciais e respeita limite de 25 chars.
 *   7. Botão "Limpar" disabled quando não há nada para limpar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ChildProfileBlock, type ChildProfileBlockCopy } from "./child-profile-block";

// Mock do toast (sonner) para inspecionar mensagens sem precisar do <Toaster />.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do hook — controla a Promise de save por teste para simular
// erro de rede e validar estado de loading no clique.
const setChildNameMock = vi.fn();
let currentChildName = "";
vi.mock("@/hooks/use-child-name", () => ({
  useChildName: () => ({
    childName: currentChildName,
    loading: false,
    setChildName: setChildNameMock,
  }),
}));

const COPY: ChildProfileBlockCopy = {
  childProfile: "Perfil da criança",
  childNameLabel: "Nome da criança",
  childNamePlaceholder: "Digite o nome da criança",
  childNameHint: "Esse nome será usado nas mensagens do app.",
  childNameSaved: "Nome salvo!",
  childNameRemoved: "Nome removido",
  childNameError: "Não foi possível salvar o nome",
  childNameSave: "Salvar",
  childNameClear: "Limpar",
  saving: "Salvando...",
  addressStyleLabel: "Como o app chama a criança",
  addressStyleHint: "Você pode mudar a qualquer momento.",
  addressStyleName: "Pelo nome",
  addressStyleYou: 'Por "você"',
  addressStyleNamePreview: "Boa, Davi! Mais uma página pintada!",
  addressStyleYouPreview: "Boa! Mais uma página pintada!",
};

beforeEach(() => {
  setChildNameMock.mockReset();
  currentChildName = "";
  (toast.success as any).mockReset();
  (toast.error as any).mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function getInput() {
  return screen.getByLabelText("Nome da criança") as HTMLInputElement;
}
function getSaveBtn() {
  return screen.getByRole("button", { name: /^salvar$/i }) as HTMLButtonElement;
}
function getClearBtn() {
  return screen.getByRole("button", { name: /^limpar$/i }) as HTMLButtonElement;
}

describe("ChildProfileBlock — UI", () => {
  it("salva o nome digitado e mostra toast 'Nome salvo!'", async () => {
    setChildNameMock.mockResolvedValue({ ok: true, value: "Davi" });
    render(<ChildProfileBlock copy={COPY} />);

    fireEvent.change(getInput(), { target: { value: "Davi" } });
    fireEvent.click(getSaveBtn());

    await waitFor(() => expect(setChildNameMock).toHaveBeenCalledWith("Davi"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nome salvo!"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("salvar string vazia mostra toast 'Nome removido' (não 'salvo')", async () => {
    setChildNameMock.mockResolvedValue({ ok: true, value: "" });
    render(<ChildProfileBlock copy={COPY} />);

    // Input fica vazio, submete o form.
    fireEvent.click(getSaveBtn());

    await waitFor(() => expect(setChildNameMock).toHaveBeenCalledWith(""));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nome removido"));
  });

  it("clicar em 'Limpar' zera o input, chama setChildName('') e mostra toast", async () => {
    currentChildName = "Davi"; // simula nome já salvo no DB
    setChildNameMock.mockResolvedValue({ ok: true, value: "" });
    render(<ChildProfileBlock copy={COPY} />);

    // O efeito sincroniza o draft com o childName -> input começa "Davi".
    await waitFor(() => expect(getInput().value).toBe("Davi"));
    expect(getClearBtn().disabled).toBe(false);

    fireEvent.click(getClearBtn());

    await waitFor(() => expect(setChildNameMock).toHaveBeenCalledWith(""));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nome removido"));
    expect(getInput().value).toBe("");
  });

  it("erro de rede ao salvar mostra toast de erro e mantém o rascunho", async () => {
    setChildNameMock.mockResolvedValue({
      ok: false,
      error: "network down",
      value: "Maria",
    });
    render(<ChildProfileBlock copy={COPY} />);

    fireEvent.change(getInput(), { target: { value: "Maria" } });
    fireEvent.click(getSaveBtn());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar o nome"));
    expect(toast.success).not.toHaveBeenCalled();
    // rascunho preservado para o usuário tentar de novo
    expect(getInput().value).toBe("Maria");
  });

  it("erro de rede ao limpar também mostra toast de erro", async () => {
    currentChildName = "Davi";
    setChildNameMock.mockResolvedValue({ ok: false, error: "network down", value: "" });
    render(<ChildProfileBlock copy={COPY} />);

    await waitFor(() => expect(getInput().value).toBe("Davi"));
    fireEvent.click(getClearBtn());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar o nome"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("durante o save: botão mostra 'Salvando...' e fica disabled", async () => {
    let resolveSave!: (v: any) => void;
    setChildNameMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<ChildProfileBlock copy={COPY} />);

    fireEvent.change(getInput(), { target: { value: "Davi" } });
    fireEvent.click(getSaveBtn());

    // Estado intermediário: botão muda para "Salvando..." e fica disabled
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /salvando/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    await act(async () => {
      resolveSave({ ok: true, value: "Davi" });
    });

    // Volta ao label normal
    await waitFor(() => expect(getSaveBtn().disabled).toBe(false));
  });

  it("input remove espaços iniciais e respeita limite de 25 chars", () => {
    render(<ChildProfileBlock copy={COPY} />);
    const input = getInput();

    fireEvent.change(input, { target: { value: "   Davi" } });
    expect(input.value).toBe("Davi");

    const longText = "M".repeat(40);
    fireEvent.change(input, { target: { value: longText } });
    expect(input.value.length).toBe(25);
  });

  it("botão 'Limpar' fica disabled quando não há nome salvo nem rascunho", () => {
    render(<ChildProfileBlock copy={COPY} />);
    expect(getClearBtn().disabled).toBe(true);
  });
});
